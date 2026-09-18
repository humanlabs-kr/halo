import { z } from 'zod';

/**
 * What we accept back from the vision model.
 *
 * Stricter than the JSON schema the model is given: structured outputs
 * guarantees the field set and their types, this guarantees the values are
 * usable. A receipt that fails here is rejected rather than half-stored.
 */
export const ReceiptSchema = z.object({
  merchantName: z.string().nullable().describe('Merchant name'),
  issuedAt: z.coerce.date().describe('Transaction timestamp'),
  countryCode: z.string().length(2).describe('ISO 3166-1 alpha-2 country code'),
  currency: z.string().length(3).describe('ISO 4217 currency code'),
  totalAmount: z.number().nullable().describe('Final amount paid'),
  paymentMethod: z.string().nullable().describe('Payment method as printed'),
  qualityRate: z.number().min(0).max(100).describe('How readable the receipt was, 0-100'),
});

export type Receipt = z.infer<typeof ReceiptSchema>;
