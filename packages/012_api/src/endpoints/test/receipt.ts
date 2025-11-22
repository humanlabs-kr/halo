import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "workers/types";
import { ReceiptProcessor } from "../../services/receipt-processor";
import { PhotonImage, resize, SamplingFilter } from "@cf-wasm/photon/workerd";

const MAX_LONG_EDGE = 1280;
const JPEG_QUALITY = 0.75;

// Import schema from receipt-processor (we'll need to export it)
const ReceiptItemSchema = z.object({
  name: z.string(),
  quantity: z.number().optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  totalPrice: z.number(),
});

const ReceiptDataSchema = z.object({
  merchantName: z.string(),
  merchantAddress: z.string().optional().nullable(),
  transactionDate: z.string().optional().nullable(),
  transactionTime: z.string().optional().nullable(),
  totalAmount: z.number(),
  currency: z.string(),
  taxAmount: z.number().optional().nullable(),
  subtotal: z.number().optional().nullable(),
  items: z.array(ReceiptItemSchema),
  paymentMethod: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export class TestReceiptImage extends OpenAPIRoute {
  schema = {
    tags: ["Test"],
    summary: "Test receipt image analysis",
    security: [{ cookie: [] }],
    request: {
      body: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: z.object({
              file: z
                .custom<File>((v) => v instanceof File)
                .openapi({
                  type: "string",
                  format: "binary",
                }),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: ReceiptDataSchema,
          },
        },
      },
      "400": {
        description: "Bad Request",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
      "401": {
        description: "Unauthorized - Authentication required",
        content: {
          "application/json": {
            schema: z.object({
              code: z.literal("UNAUTHORIZED"),
              error: z.string(),
            }),
          },
        },
      },
      "500": {
        description: "Internal Server Error",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const fd = await c.req.formData();
    const rawFile = fd.get("file");
    
    if (!rawFile || !(rawFile instanceof File)) {
      return c.json({ error: "file must be a file" }, 400);
    }

    try {
      // Get image bytes
      const arrayBuffer = await rawFile.arrayBuffer();
      const inputBytes = new Uint8Array(arrayBuffer);

      // Create PhotonImage from bytes
      const inputImage = PhotonImage.new_from_byteslice(inputBytes);
      
      // Get original dimensions
      const width = inputImage.get_width();
      const height = inputImage.get_height();
      const maxDimension = Math.max(width, height);

      let outputImage: PhotonImage;

      // Resize if needed
      if (maxDimension > MAX_LONG_EDGE) {
        const scale = MAX_LONG_EDGE / maxDimension;
        const newWidth = Math.round(width * scale);
        const newHeight = Math.round(height * scale);
        
        outputImage = resize(
          inputImage,
          newWidth,
          newHeight,
          SamplingFilter.Lanczos3
        );
        
        // Free original image if we resized
        inputImage.free();
      } else {
        outputImage = inputImage;
      }

      // Convert to JPEG with specified quality
      const jpegBytes = outputImage.get_bytes_jpeg(JPEG_QUALITY);
      
      // Free the output image
      outputImage.free();

      // Convert to base64
      const buffer = Buffer.from(jpegBytes);
      const base64Image = buffer.toString("base64").replace(/\s/g, "");

      // Process receipt using AI (always JPEG after processing)
      const receiptData = await ReceiptProcessor.process(Buffer.from(inputBytes).toString("base64"), "image/jpeg");

      return receiptData;
    } catch (error) {
      console.error("Error processing receipt:", error);
      return c.json(
        { error: error instanceof Error ? error.message : "Failed to process receipt" },
        500
      );
    }
  }
}
