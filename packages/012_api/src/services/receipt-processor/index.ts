import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { FullReceiptSchema } from './zod';
import { env } from 'cloudflare:workers';
import { normalizeReceiptImage } from './image';
import dedent from 'dedent';

const openai = new OpenAI({
	baseURL: `https://gateway.ai.cloudflare.com/v1/6377196122dd8a0ce3a9b3ef18fdfdd7/receipto/openai`,
	apiKey: env.OPENAI_API_KEY,
	defaultHeaders: {
		'cf-aig-authorization': `Bearer ${env.API_GATEWAY_TOKEN}`,
	},
});

export const ReceiptProcessor = {
	normalizeImage: normalizeReceiptImage,
	process: async (imageBytesArray: Uint8Array<ArrayBufferLike>[], country: string) => {
		const base64Images = imageBytesArray.map((imageBytes) => {
			const buffer = Buffer.from(imageBytes);
			return buffer.toString('base64').replace(/\s/g, '');
		});

		try {
			const completion = await openai.chat.completions.create({
				model: 'gpt-5-nano',
				messages: [
					{
						role: 'system',
						content: dedent`
You must extract structured data from receipt images from any country.
Inferred country code from the request ip is ${country} (ISO 3166-1 Alpha 2 country code).

You must never guess missing information. Only use what is clearly visible.

MANDATORY OUTPUT FIELDS:
- merchantName
- issuedAt (ISO 8601 or null)
- totalAmount (or null)
- countryCode (2-letter ISO 3166-1 Alpha 2 country code or null)
- currency (ISO 4217 currency code or null)
- paymentMethod (or null)
- qualityRate (1–100)
- rawDate (the exact date string from the image)

GENERAL RULES:
- Never hallucinate.
- Never infer information that is not printed.
- Never output empty strings; use null.
- If information cannot be read with high confidence, return null.

----------------------------------------------------------------
MERCHANT NAME RULES:
----------------------------------------------------------------
- merchantName must be the actual business/store issuing the receipt.
- Never use payment processors or brands such as:
  "Mercado Pago", "Payway", "VISA", "Mastercard", "Amex", "Newland", "POS", “NFC”.
- Prefer names printed near the top or bottom and often shown with an address, CUIT, VAT number, or store number.
- If multiple names appear, select the one corresponding to the physical business.

----------------------------------------------------------------
DATE RULES:
----------------------------------------------------------------
- Always extract the printed date string as rawDate exactly as shown.
- Never infer missing components.
- For numeric formats:
  - If a component > 12, that is the day.
  - If the year is 2 digits, convert to 20YY.
- If the order is ambiguous (e.g., 03/04/25), issuedAt must be null.
- If the date cannot be safely parsed, issuedAt must be null.

----------------------------------------------------------------
COUNTRY CODE RULES:
----------------------------------------------------------------
- countryCode must be a 2-letter ISO 3166-1 alpha-2 code in UPPERCASE.
- Only output it if clearly printed.
- Never output patterns like ".", ".*", numbers, or partial fragments.
- If not clearly visible, return null.

----------------------------------------------------------------
CURRENCY RULES:
----------------------------------------------------------------
- Use only the ISO 4217 currency code.
- If symbol is "$" but the receipt contains Argentina markers (CUIT, CABA, IVA, etc.), set currency="ARS".
- Never guess a currency based solely on country.

----------------------------------------------------------------
AMOUNT RULES (VERY IMPORTANT):
----------------------------------------------------------------
- totalAmount MUST come from a line explicitly marked as a final total.
  Valid labels include (case-insensitive):
  "TOTAL", "TOTAL A PAGAR", "TOTAL COMPRA", "TOTAL FINAL",
  "IMPORTE TOTAL", "TOTAL A ABONAR", "TOTAL APAGADO".
- Never use per-item totals such as:
  "3 x 1635 = 4905", "1 x 1234", subtotal lines, or IVA lines.
- If the word "TOTAL" (or equivalent) does NOT appear anywhere,
  totalAmount must be null.
- If multiple amounts exist, choose the one directly paired
  with the total label.

----------------------------------------------------------------
QUALITY RATE RULES:
----------------------------------------------------------------
- The qualityRate must reflect how reliably the three core fields
  (merchantName, issuedAt, totalAmount) can be extracted.
- Scoring scale:
  - 90–100: Perfect clarity, all core fields fully readable.
  - 70–89: Minor blur/creases, core fields readable.
  - 40–69: Moderate distortion, or one core field difficult to read.
  - 0–39: Very poor, core fields unclear or missing.
	- 0: The image is not a receipt.

*** SPECIAL QUALITY PENALTIES ***
- If totalAmount is null because NO total label exists → qualityRate must be ≤ 40.
- If any core field (merchantName, issuedAt, totalAmount) is unreadable/uncertain → qualityRate must be ≤ 40.
- If the image is cropped or missing bottom section where total normally appears → qualityRate must be ≤ 30.

----------------------------------------------------------------
DATE RULES:
----------------------------------------------------------------
- Always extract the printed date string as rawDate exactly as shown.
- Convert numeric formats using:
  - Day = component > 12
  - If year has 2 digits → convert to 20YY.
- If the parsed year is clearly unreasonable (e.g., < 2000 or > currentYear + 2):
    → set issuedAt to null BUT keep rawDate.
- Reasonable years are: currentYear - 5 through currentYear + 2.
- DO NOT set issuedAt to null if the raw date is clear but year parsing had a minor OCR error.
- If day/month are legible and year is ambiguous → issuedAt=null but DO NOT penalize merchantName or totalAmount.

----------------------------------------------------------------
FAIL CONDITIONS (IMPORTANT):
----------------------------------------------------------------
If ANY of the following is true:

1. qualityRate < 30  
2. merchantName is null  
3. issuedAt is null  
4. totalAmount is null  

→ Then this receipt MUST be considered FAIL.
          `,
					},
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: `
                Analyze this receipt image and return the information strictly following the schema.
                If any required field cannot be extracted, return null for that field.
                `,
							},
							...base64Images.map((base64Image) => ({
								type: 'image_url' as const,
								image_url: {
									url: `data:image/jpeg;base64,${base64Image}`,
									detail: 'auto' as const,
								},
							})),
						],
					},
				],
				response_format: zodResponseFormat(FullReceiptSchema, 'analysis'),
				reasoning_effort: 'low',
			});

			if (!completion.choices[0].message.content) {
				throw new Error('No content from AI');
			}

			const response = FullReceiptSchema.parse(JSON.parse(completion.choices[0].message.content));
			return response;
		} catch (error) {
			if (error instanceof OpenAI.APIError) {
				throw new Error(`OpenAI API error: ${error.message} (${error.status})`);
			}
			throw error;
		}
	},
};
