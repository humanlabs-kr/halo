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

const RETRY_DELAY_SECONDS = 10;

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

    const results = await Promise.allSettled(
      batch.messages.map((message) => analyseReceipt(db, env, paramsSchema.parse(message.body))),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error('Receipt analysis message failed:', result.reason);
        batch.messages[index]?.retry({ delaySeconds: RETRY_DELAY_SECONDS });
      }
    });
  },
};

async function analyseReceipt(db: Database, env: Env, params: Params): Promise<void> {
  const receipt = await db.query.receipts.findFirst({
    where: eq(receipts.id, params.receiptId),
  });

  if (!receipt) {
    throw new Error(`Receipt not found: ${params.receiptId}`);
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

  const analysis = await tryCatch(ReceiptProcessor.process(env.OPENAI_API_KEY, images, params.country));

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
  const status = await gradeReceipt(db, receipt.userAddress, receiptData);

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
    const pointIneligible = current.assignedPoint === POINT_INELIGIBLE;

    await tx
      .update(receipts)
      .set({
        merchantName: receiptData.merchantName,
        issuedAt: receiptData.issuedAt,
        countryCode: receiptData.countryCode,
        currency: receiptData.currency,
        totalAmount: receiptData.totalAmount?.toFixed(2) ?? null,
        paymentMethod: receiptData.paymentMethod,
        qualityRate: Math.max(0, Math.min(100, Math.floor(receiptData.qualityRate))),
        status: pointIneligible ? 'claimed' : status,
        assignedPoint: pointIneligible ? 0 : assignedPoint,
        analysisCompletedAt: new Date(),
        analysisError: null,
      })
      .where(eq(receipts.id, params.receiptId));
  });
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
  userAddress: string,
  receiptData: Receipt,
): Promise<'claimable' | 'rejected'> {
  if (receiptData.qualityRate < MIN_QUALITY_RATE) {
    return 'rejected';
  }

  if (!receiptData.merchantName) {
    return 'rejected';
  }

  if (receiptData.totalAmount === null || Number.isNaN(receiptData.totalAmount)) {
    return 'rejected';
  }

  const oldestAllowed = new Date(Date.now() - MAX_RECEIPT_AGE_DAYS * 24 * 60 * 60 * 1000);

  if (receiptData.issuedAt < oldestAllowed) {
    return 'rejected';
  }

  // Same wallet, same purchase timestamp: the same receipt photographed twice.
  // Already-claimed rows are excluded so a legitimate re-scan of a settled
  // receipt does not block a genuinely new one.
  const duplicate = await db.query.receipts.findFirst({
    where: and(
      eq(receipts.userAddress, userAddress),
      eq(receipts.issuedAt, receiptData.issuedAt),
      ne(receipts.status, 'claimed'),
    ),
  });

  return duplicate ? 'rejected' : 'claimable';
}
