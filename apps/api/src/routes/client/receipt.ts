import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { dataSchema, errorSchema, receiptStatusSchema } from '@halo/contracts';
import {
  and,
  blacklistedAddresses,
  count,
  desc,
  eq,
  gte,
  lt,
  receiptImages,
  receipts,
  sql,
} from '@halo/database';
import { addDays, endOfDay, startOfDay, startOfWeek } from 'date-fns';
import { cache } from 'hono/cache';
import KSUID from 'ksuid';
import { R2 } from '../../lib/r2';
import { ReceiptProcessor } from '../../lib/receipt-processor';
import { userAuth } from '../../middleware/auth';
import { tryCatch } from '../../lib/try-catch';
import { ReceiptAnalysisQueue } from '../../queues';
import type { AppEnv } from '../../types';

/** Hard cap on uploads per wallet per UTC day. */
const DAILY_UPLOAD_LIMIT = 5;

/** Past this many uploads in a week a receipt still gets stored, but is worth no points. */
const WEEKLY_POINT_ELIGIBLE_LIMIT = 35;

const app = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'BAD_REQUEST' as const,
            message: result.error.issues[0]?.message ?? 'Invalid request',
          },
        },
        400,
      );
    }
  },
});

// ── POST /receipts ──────────────────────────────────────────────────────────

const uploadReceiptRoute = createRoute({
  method: 'post',
  path: '/receipts',
  tags: ['Receipt'],
  summary: 'Upload receipt image',
  middleware: [userAuth] as const,
  request: {
    body: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z
              .custom<File>((v) => v instanceof File, { message: 'file must be a file' })
              .openapi({ type: 'string', format: 'binary' }),
            turnstileToken: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Receipt accepted and queued for analysis',
      content: {
        'application/json': {
          schema: dataSchema(z.object({ result: z.literal('success') })),
        },
      },
    },
    400: {
      description: 'BAD_REQUEST (CAPTCHA) / DAILY_LIMIT_REACHED',
      content: { 'application/json': { schema: errorSchema } },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
    403: {
      description: 'ADDRESS_BLACKLISTED',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

app.openapi(uploadReceiptRoute, async (c) => {
  // `request.cf` is not in the type surface here, but Cloudflare sets the same ISO 3166-1
  // alpha-2 value on this header, and the analysis prompt only needs the country hint.
  const country = c.req.header('CF-IPCountry') ?? '';
  const userAddress = c.get('address')!;
  const db = c.get('db');

  const { file, turnstileToken } = c.req.valid('form');

  const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: c.env.TURNSTILE_SECRET_KEY, response: turnstileToken }),
  });
  const turnstileData = (await turnstileRes.json()) as { success: boolean };

  if (!turnstileData.success) {
    return c.json(
      {
        error: {
          code: 'BAD_REQUEST' as const,
          message: 'CAPTCHA verification failed. Please try again.',
        },
      },
      400,
    );
  }

  const blacklisted = await db.query.blacklistedAddresses.findFirst({
    where: eq(blacklistedAddresses.address, userAddress),
  });

  if (blacklisted) {
    return c.json(
      {
        error: {
          code: 'ADDRESS_BLACKLISTED' as const,
          message: 'This address has been restricted.',
        },
      },
      403,
    );
  }

  const now = new Date();

  // Checked before the transaction so a rejected upload never takes a write lock.
  const dailyScanCount = await db
    .select({ count: sql<number>`count(*)`.as('count') })
    .from(receipts)
    .where(
      and(
        eq(receipts.userAddress, userAddress),
        gte(receipts.createdAt, startOfDay(now)),
        lt(receipts.createdAt, endOfDay(now)),
      ),
    )
    .then((result) => result[0]?.count ?? 0);

  if (dailyScanCount >= DAILY_UPLOAD_LIMIT) {
    return c.json(
      {
        error: {
          code: 'DAILY_LIMIT_REACHED' as const,
          message: `You have reached the daily receipt upload limit (${DAILY_UPLOAD_LIMIT} per day).`,
        },
      },
      400,
    );
  }

  // The image lands in R2 *before* any row exists. The previous order — insert
  // the rows, then upload — left a `pending` receipt behind every time the
  // upload failed: a row whose image the consumer could never read, so it was
  // never analysed and never settled. An orphaned R2 object costs storage; an
  // orphaned row costs the user a receipt that says "analysing" forever.
  const receiptImageId = crypto.randomUUID();
  const arrayBuffer = await file.arrayBuffer();
  const normalizedImage = ReceiptProcessor.normalizeImage(new Uint8Array(arrayBuffer));

  await R2.saveReceiptImage(c.env.RECEIPT_BUCKET, normalizedImage, receiptImageId);

  const receiptId = await db.transaction(async (tx) => {
    const weeklyScanCount = await tx
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(receipts)
      .where(
        and(
          eq(receipts.userAddress, userAddress),
          gte(receipts.createdAt, startOfWeek(now)),
          lt(receipts.createdAt, startOfWeek(addDays(now, 7))),
        ),
      )
      .then((result) => result[0]?.count ?? 0);

    const newReceiptId = KSUID.randomSync().string;

    await tx.insert(receipts).values({
      id: newReceiptId,
      userAddress,
      assignedPoint: weeklyScanCount >= WEEKLY_POINT_ELIGIBLE_LIMIT ? -1 : undefined,
    });

    // TODO create many receipt image rows once a receipt can carry multiple images
    await tx.insert(receiptImages).values([
      { id: receiptImageId, receiptId: newReceiptId, numOrder: 0 },
    ]);

    return newReceiptId;
  });

  // Enqueued with `await` rather than `waitUntil`. A send that fails inside
  // `waitUntil` is invisible: nothing logs it, nothing retries it, and the
  // receipt stays `pending` for good. The upload itself still succeeds — row
  // and image are both durable — and `ReceiptSweeper` re-queues whatever never
  // reached the consumer.
  const enqueued = await tryCatch(
    ReceiptAnalysisQueue.send(c.env.RECEIPT_ANALYSIS_QUEUE, { receiptId, country }),
  );

  if (enqueued.error) {
    console.error(`Failed to enqueue receipt analysis for ${receiptId}:`, enqueued.error);
  }

  return c.json({ data: { result: 'success' as const } }, 200);
});

// ── GET /receipts ───────────────────────────────────────────────────────────

const listReceiptsRoute = createRoute({
  method: 'get',
  path: '/receipts',
  tags: ['Receipt'],
  summary: 'List receipts',
  middleware: [userAuth] as const,
  responses: {
    200: {
      description: 'Success',
      content: {
        'application/json': {
          schema: dataSchema(
            z.object({
              totalCount: z.number(),
              list: z.array(
                z.object({
                  id: z.string(),
                  merchantName: z.string().nullable(),
                  status: receiptStatusSchema,
                  currency: z.string().nullable(),
                  totalAmount: z.string().nullable(),
                  assignedPoint: z.number(),
                  qualityRate: z.number().nullable(),
                  createdAt: z.coerce.date(),
                }),
              ),
            }),
          ),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
  },
});

app.openapi(listReceiptsRoute, async (c) => {
  const userAddress = c.get('address')!;

  const receiptRecords = await c.get('db').query.receipts.findMany({
    columns: {
      id: true,
      merchantName: true,
      status: true,
      assignedPoint: true,
      currency: true,
      totalAmount: true,
      qualityRate: true,
      createdAt: true,
    },
    where: eq(receipts.userAddress, userAddress),
    orderBy: [desc(receipts.createdAt)],
  });

  return c.json(
    {
      data: {
        totalCount: receiptRecords.length,
        list: receiptRecords.map((receipt) => ({
          id: receipt.id,
          merchantName: receipt.merchantName,
          status: receipt.status,
          currency: receipt.currency,
          totalAmount: receipt.totalAmount,
          assignedPoint: receipt.assignedPoint,
          qualityRate: receipt.qualityRate,
          createdAt: receipt.createdAt,
        })),
      },
    },
    200,
  );
});

// ── GET /receipts/{receiptId}/image/{receiptImageId} ────────────────────────

const getReceiptImageRoute = createRoute({
  method: 'get',
  path: '/receipts/{receiptId}/image/{receiptImageId}',
  tags: ['Receipt'],
  summary: 'Get receipt image',
  request: {
    params: z.object({ receiptId: z.string(), receiptImageId: z.string() }),
  },
  responses: {
    200: {
      description: 'The receipt image',
      content: { 'image/jpeg': { schema: z.string().openapi({ format: 'binary' }) } },
    },
    404: {
      description: 'NOT_FOUND',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

app.openapi(getReceiptImageRoute, async (c) => {
  const { receiptImageId } = c.req.valid('param');

  let image: Uint8Array;

  try {
    image = await R2.downloadReceiptImage(c.env.RECEIPT_BUCKET, receiptImageId);
  } catch {
    return c.json({ error: { code: 'NOT_FOUND' as const, message: 'Receipt image not found' } }, 404);
  }

  // The object key is the image id and its bytes never change, so this can be cached forever.
  return new Response(image, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

// ── GET /receipt/stat ───────────────────────────────────────────────────────

const receiptStatRoute = createRoute({
  method: 'get',
  path: '/receipt/stat',
  tags: ['Receipt'],
  summary: 'Get receipt stat',
  middleware: [userAuth] as const,
  responses: {
    200: {
      description: 'Success',
      content: {
        'application/json': {
          schema: dataSchema(
            z.object({ weeklyScanCount: z.number(), dailyScanCount: z.number() }),
          ),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
  },
});

app.openapi(receiptStatRoute, async (c) => {
  const userAddress = c.get('address')!;
  const db = c.get('db');

  // Points are granted on a weekly budget, and the week starts Monday 00:00 UTC.
  const [weeklyScanCount, dailyScanCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(receipts)
      .where(
        and(
          eq(receipts.userAddress, userAddress),
          gte(receipts.createdAt, startOfWeek(new Date())),
          lt(receipts.createdAt, startOfWeek(addDays(new Date(), 7))),
        ),
      )
      .then((result) => result[0]?.count ?? 0),
    db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(receipts)
      .where(
        and(
          eq(receipts.userAddress, userAddress),
          gte(receipts.createdAt, startOfDay(new Date())),
          lt(receipts.createdAt, startOfDay(addDays(new Date(), 1))),
        ),
      )
      .then((result) => result[0]?.count ?? 0),
  ]);

  return c.json({ data: { weeklyScanCount, dailyScanCount } }, 200);
});

// ── GET /receipt/total-count ────────────────────────────────────────────────

// A one-second edge cache is enough to absorb the landing page's polling without letting the
// counter visibly lag. Registered with `app.use` rather than as route middleware: `cache()` is
// typed against a bare `Env`, and mixing it into `createRoute`'s middleware tuple widens the
// handler's context away from `AppEnv`.
app.use('/receipt/total-count', cache({ cacheName: 'receipt-total-count', cacheControl: 'max-age=1' }));

const receiptTotalCountRoute = createRoute({
  method: 'get',
  path: '/receipt/total-count',
  tags: ['Receipt'],
  summary: 'Get total receipt count (public)',
  responses: {
    200: {
      description: 'Success',
      content: {
        'application/json': { schema: dataSchema(z.object({ totalCount: z.number() })) },
      },
    },
  },
});

app.openapi(receiptTotalCountRoute, async (c) => {
  const totalCount = await c
    .get('db')
    .select({ count: count() })
    .from(receipts)
    .then((result) => result[0]?.count ?? 0);

  return c.json({ data: { totalCount } }, 200);
});

// ── GET /receipts/{receiptId} ───────────────────────────────────────────────

const getReceiptByIdRoute = createRoute({
  method: 'get',
  path: '/receipts/{receiptId}',
  tags: ['Receipt'],
  summary: 'Get receipt by id',
  middleware: [userAuth] as const,
  request: { params: z.object({ receiptId: z.string() }) },
  responses: {
    200: {
      description: 'Success',
      content: {
        'application/json': {
          schema: dataSchema(
            z.object({
              id: z.string(),
              merchantName: z.string().nullable(),
              status: receiptStatusSchema,
              currency: z.string().nullable(),
              totalAmount: z.string().nullable(),
              issuedAt: z.coerce.date().nullable(),
              countryCode: z.string().nullable(),
              paymentMethod: z.string().nullable(),
              qualityRate: z.number().nullable(),
              assignedPoint: z.number(),
              createdAt: z.coerce.date(),
              images: z.array(
                z.object({
                  id: z.string(),
                  numOrder: z.number(),
                  createdAt: z.coerce.date(),
                }),
              ),
            }),
          ),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
    404: { description: 'NOT_FOUND', content: { 'application/json': { schema: errorSchema } } },
  },
});

app.openapi(getReceiptByIdRoute, async (c) => {
  const { receiptId } = c.req.valid('param');

  const receipt = await c.get('db').query.receipts.findFirst({
    columns: {
      id: true,
      merchantName: true,
      status: true,
      currency: true,
      totalAmount: true,
      issuedAt: true,
      countryCode: true,
      paymentMethod: true,
      qualityRate: true,
      assignedPoint: true,
      createdAt: true,
    },
    where: eq(receipts.id, receiptId),
    with: { images: true },
  });

  if (!receipt) {
    return c.json({ error: { code: 'NOT_FOUND' as const, message: 'Receipt not found' } }, 404);
  }

  return c.json(
    {
      data: {
        id: receipt.id,
        merchantName: receipt.merchantName,
        status: receipt.status,
        currency: receipt.currency,
        totalAmount: receipt.totalAmount,
        issuedAt: receipt.issuedAt,
        countryCode: receipt.countryCode,
        paymentMethod: receipt.paymentMethod,
        qualityRate: receipt.qualityRate,
        assignedPoint: receipt.assignedPoint,
        createdAt: receipt.createdAt,
        images: receipt.images.map((image) => ({
          id: image.id,
          numOrder: image.numOrder,
          createdAt: image.createdAt,
        })),
      },
    },
    200,
  );
});

export const clientReceiptRoutes = app;
