import { and, createDb, eq, ne, receiptImages, receipts, type Database } from '@halo/database';
import { z } from 'zod';
import { BASE_POINT_PER_RECEIPT } from '../lib/constants';
import { R2 } from '../lib/r2';
import { ReceiptProcessor } from '../lib/receipt-processor';
import type { Receipt } from '../lib/receipt-processor/zod';
import { tryCatch } from '../lib/try-catch';

/**
 * Analyses an uploaded receipt out of band.
 *
 * Off the request path because the vision call takes seconds: the upload
 * endpoint stores the image, enqueues here and returns. The queue is configured
 * with `max_batch_size: 1` — batching buys nothing when one model call
 * dominates the invocation, and one unreadable image would fail its batch.
 */

/** A rejected receipt is still worth a token amount, so scanning is never wasted. */
const REJECTED_RECEIPT_POINT = 5;

/** Below this the extraction is not trustworthy enough to pay for. */
const MIN_QUALITY_RATE = 30;

/** Older than this and the receipt is not a current purchase. */
const MAX_RECEIPT_AGE_DAYS = 7;

/**
 * Widest value `receipts.total_amount` holds — numeric(15, 2).
 *
 * Writing past it raises `numeric field overflow`, and because that happens in
 * the final transaction — after the model has already read the receipt — the
 * write fails, the message retries, and the retries buy nothing because the
 * amount is the same every time. Before receipts were settled on the last
 * attempt this left the row `pending` forever; a production receipt from
 * 2026-09-13 was stuck exactly that way.
 *
 * So the bound is enforced here rather than discovered by the database.
 */
const MAX_TOTAL_AMOUNT = 9_999_999_999_999.99;

const RETRY_DELAY_SECONDS = 10;

/**
 * Total deliveries a message gets: `max_retries` in `wrangler.jsonc` **plus the
 * first delivery**.
 *
 * `message.attempts` is 1-based — the queue computes it as `failedAttempts + 1`
 * and keeps redelivering while `failedAttempts < maxRetries + 1`. So
 * `max_retries: 3` yields attempts 1, 2, 3 and 4. Treating 3 as the last one
 * would throw away a delivery that is still coming: a receipt caught in a
 * 40-second provider outage would be rejected at t=20s while the attempt that
 * would have succeeded, at t=30s, never runs.
 *
 * Cloudflare drops a message once its retries are spent, and nothing else
 * notices: the row keeps `status = 'pending'`, no error is written, and the
 * receipt sits in the user's history saying "analysing" until someone runs a
 * query. That is how 174k rows accumulated, so the final attempt settles the
 * receipt rather than letting the queue swallow it.
 */
const MAX_DELIVERY_ATTEMPTS = 4;

/**
 * Marks a receipt that was uploaded past the weekly point-earning limit. It is
 * still analysed and shown, it just cannot be claimed.
 */
const POINT_INELIGIBLE = -1;

const paramsSchema = z.object({
  receiptId: z.string(),
  /** ISO 3166-1 alpha-2, inferred from the uploader's IP. A hint for the model. */
  country: z.string(),
});

type Params = z.infer<typeof paramsSchema>;

export const ReceiptAnalysisQueue = {
  name: 'receipt-analysis',

  async send(queue: Queue, params: Params): Promise<void> {
    await queue.send(params, { contentType: 'json' });
  },

  async run(batch: MessageBatch, env: Env): Promise<void> {
    const db = createDb(env.HYPERDRIVE.connectionString);

    // `parse` is inside the async callback on purpose. Called in a plain
    // callback it throws synchronously, which makes `.map()` itself throw
    // before `allSettled` ever sees it — the handler rejects, the whole batch
    // is redelivered, and the per-message settling below never runs. An
    // unparseable message has to become a rejected promise like any other
    // failure.
    const results = await Promise.allSettled(
      batch.messages.map(async (message) => analyseReceipt(db, env, paramsSchema.parse(message.body))),
    );

    await Promise.all(
      results.map(async (result, index) => {
        const message = batch.messages[index];

        if (result.status !== 'rejected' || !message) {
          return;
        }

        console.error('Receipt analysis message failed:', result.reason);

        if (message.attempts < MAX_DELIVERY_ATTEMPTS) {
          message.retry({ delaySeconds: RETRY_DELAY_SECONDS });
          return;
        }

        await settleUnanalysable(db, message.body, result.reason);
      }),
    );
  },
};

/**
 * Closes out a receipt whose analysis will not be attempted again.
 *
 * Deliberately scoped to rows still in `pending`: a receipt the user has since
 * claimed, or one a later delivery already settled, must not be rewritten by a
 * message that is only now giving up.
 */
async function settleUnanalysable(db: Database, body: unknown, reason: unknown): Promise<void> {
  const params = paramsSchema.safeParse(body);

  if (!params.success) {
    console.error('Cannot settle an analysis message that does not parse:', body);
    return;
  }

  const message = reason instanceof Error ? reason.message : String(reason);

  const settled = await tryCatch(
    db
      .update(receipts)
      .set({
        status: 'rejected',
        assignedPoint: 0,
        analysisCompletedAt: new Date(),
        analysisError: `Abandoned after ${MAX_DELIVERY_ATTEMPTS} delivery attempts: ${message}`,
      })
      .where(and(eq(receipts.id, params.data.receiptId), eq(receipts.status, 'pending'))),
  );

  if (settled.error) {
    console.error(`Failed to settle abandoned receipt ${params.data.receiptId}:`, settled.error);
  }
}

async function analyseReceipt(db: Database, env: Env, params: Params): Promise<void> {
  const receipt = await db.query.receipts.findFirst({
    where: eq(receipts.id, params.receiptId),
  });

  if (!receipt) {
    throw new Error(`Receipt not found: ${params.receiptId}`);
  }

  // A receipt can be delivered twice — the sweeper re-queues anything still
  // pending, and a message it was not aware of may arrive later. Analysing an
  // already-settled receipt is not a harmless repeat: it re-runs the model and
  // overwrites the verdict, which can knock a `claimable` receipt down to
  // `rejected` (the duplicate check below would match the row's own earlier
  // result) or reopen one the user has already claimed.
  if (receipt.status !== 'pending') {
    return;
  }

  const receiptImageRecords = await db.query.receiptImages.findMany({
    columns: { id: true },
    where: eq(receiptImages.receiptId, params.receiptId),
  });

  if (receiptImageRecords.length === 0) {
    throw new Error(`Receipt has no images: ${params.receiptId}`);
  }

  await db
    .update(receipts)
    .set({ analysisStartedAt: new Date() })
    .where(eq(receipts.id, params.receiptId));

  const images = await Promise.all(
    receiptImageRecords.map((image) => R2.downloadReceiptImage(env.RECEIPT_BUCKET, image.id)),
  );

  const analysis = await tryCatch(ReceiptProcessor.process(env.OPENROUTER_API_KEY, images, params.country));

  // A failed analysis is a rejected receipt, not a lost one: the reason is
  // stored so the user sees why and support can tell a model outage from a bad
  // photo.
  if (analysis.error) {
    console.error('Receipt analysis failed:', analysis.error);

    await db
      .update(receipts)
      .set({
        status: 'rejected',
        assignedPoint: 0,
        analysisCompletedAt: new Date(),
        analysisError: analysis.error.message,
      })
      .where(eq(receipts.id, params.receiptId));

    return;
  }

  const receiptData = analysis.data;
  const status = await gradeReceipt(db, params.receiptId, receipt.userAddress, receiptData);

  const assignedPoint =
    status === 'claimable'
      ? Math.floor((BASE_POINT_PER_RECEIPT * receiptData.qualityRate) / 100)
      : REJECTED_RECEIPT_POINT;

  await db.transaction(async (tx) => {
    const current = await tx.query.receipts.findFirst({
      where: eq(receipts.id, params.receiptId),
    });

    if (!current) {
      throw new Error(`Receipt disappeared mid-analysis: ${params.receiptId}`);
    }

    // Uploaded past the weekly limit: record the analysis, but settle it
    // immediately at zero rather than offering points that cannot be claimed.
    // Re-checked inside the transaction: the guard at the top of this function
    // ran before a model call that takes seconds, which is more than enough
    // time for a claim to land.
    if (current.status !== 'pending') {
      return;
    }

    const pointIneligible = current.assignedPoint === POINT_INELIGIBLE;

    await tx
      .update(receipts)
      .set({
        merchantName: receiptData.merchantName,
        issuedAt: receiptData.issuedAt,
        countryCode: receiptData.countryCode,
        currency: receiptData.currency,
        totalAmount: storableAmount(receiptData.totalAmount),
        paymentMethod: receiptData.paymentMethod,
        qualityRate: Math.max(0, Math.min(100, Math.floor(receiptData.qualityRate))),
        status: pointIneligible ? 'claimed' : status,
        assignedPoint: pointIneligible ? 0 : assignedPoint,
        analysisCompletedAt: new Date(),
        analysisError: null,
      })
      .where(and(eq(receipts.id, params.receiptId), eq(receipts.status, 'pending')));
  });
}

/**
 * Renders an amount for `receipts.total_amount`, or null if it cannot be stored.
 *
 * NaN, infinities and anything wider than the column are all "no amount" rather
 * than an error. The alternative is an exception three seconds into a paid
 * model call, on data that will not change when the message is redelivered.
 *
 * Exported for the test that pins the boundary.
 */
export function storableAmount(amount: number | null): string | null {
  if (amount === null || !Number.isFinite(amount) || Math.abs(amount) > MAX_TOTAL_AMOUNT) {
    return null;
  }

  return amount.toFixed(2);
}

/**
 * Decides whether an analysed receipt can earn points.
 *
 * The three fields that make a receipt a receipt — who, when, how much — must
 * all be present and plausible, and the same purchase must not already be in
 * the wallet's history.
 */
async function gradeReceipt(
  db: Database,
  receiptId: string,
  userAddress: string,
  receiptData: Receipt,
): Promise<'claimable' | 'rejected'> {
  if (receiptData.qualityRate < MIN_QUALITY_RATE) {
    return 'rejected';
  }

  if (!receiptData.merchantName) {
    return 'rejected';
  }

  // Same test as the write path: a receipt whose total cannot be stored has no
  // total as far as the rest of the system is concerned, and a receipt with no
  // total is not claimable.
  if (storableAmount(receiptData.totalAmount) === null) {
    return 'rejected';
  }

  const oldestAllowed = new Date(Date.now() - MAX_RECEIPT_AGE_DAYS * 24 * 60 * 60 * 1000);

  if (receiptData.issuedAt < oldestAllowed) {
    return 'rejected';
  }

  // Same wallet, same purchase timestamp: the same receipt photographed twice.
  // Already-claimed rows are excluded so a legitimate re-scan of a settled
  // receipt does not block a genuinely new one.
  //
  // The row being graded is excluded as well. Without that, a second delivery
  // of the same message finds the verdict its own first delivery wrote and
  // calls the receipt a duplicate of itself.
  const duplicate = await db.query.receipts.findFirst({
    where: and(
      ne(receipts.id, receiptId),
      eq(receipts.userAddress, userAddress),
      eq(receipts.issuedAt, receiptData.issuedAt),
      ne(receipts.status, 'claimed'),
    ),
  });

  return duplicate ? 'rejected' : 'claimable';
}
