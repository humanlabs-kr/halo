import { z } from 'zod';

/**
 * Receipt lifecycle.
 *
 * - `pending`          uploaded, sitting in the analysis queue
 * - `rejected`         below the quality threshold, or missing one of the three
 *                      required fields (timestamp, total, merchant)
 * - `claimable`        passed analysis; the user can claim points
 * - `claimed`          the user completed the onchain claim
 * - `rejected-claimed` consolation reward claimed for a rejected receipt
 */
export const RECEIPT_STATUSES = ['pending', 'rejected', 'claimable', 'claimed', 'rejected-claimed'] as const;

export const receiptStatusSchema = z.enum(RECEIPT_STATUSES);
export type ReceiptStatus = z.infer<typeof receiptStatusSchema>;

/** Analysis scores below this are rejected. */
export const RECEIPT_QUALITY_THRESHOLD = 30;

/** Receipts issued longer ago than this are not accepted. */
export const RECEIPT_MAX_AGE_DAYS = 7;

export const receiptSchema = z.object({
  id: z.string(),
  status: receiptStatusSchema,
  assignedPoint: z.number().int(),
  merchantName: z.string().nullable(),
  issuedAt: z.string().nullable(),
  countryCode: z.string().nullable(),
  currency: z.string().nullable(),
  totalAmount: z.string().nullable(),
  qualityRate: z.number().int().nullable(),
  createdAt: z.string(),
});

export type Receipt = z.infer<typeof receiptSchema>;
