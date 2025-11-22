import { z } from "zod";

export const ReceiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable().describe("Quantity of the item"),
  unitPrice: z.number().nullable().describe("Unit price of the item"),
  totalPrice: z.number().nullable().describe("Total price of the item"),
});

export const ReceiptSchema = z.object({
  merchantName: z.string().nullable().describe("Merchant name"),        // 브랜드명
  merchantLegalName: z.string().nullable().describe("Legal name"),   // 법인명
  merchantTaxId: z.string().nullable().describe("Tax ID"),       // 세금번호
  storeId: z.string().nullable().describe("Store ID"),             // 매장 번호
  receiptNumber: z.string(),
  issuedAt: z.coerce.date().describe("Issued at"),
  countryCode: z.string().length(2).describe("ISO country code"),          // ISO 국가코드 (US, AR, KR 등)
  currency: z.string().length(3).describe("ISO currency code"),             // ISO 통화코드 (USD, ARS 등)
  totalAmount: z.number().nullable(),
  taxAmount: z.number().nullable(),
  paymentMethod: z.string().nullable().describe("Payment method"),
  items: z.array(ReceiptItemSchema),
});

export const FullReceiptSchema = ReceiptSchema