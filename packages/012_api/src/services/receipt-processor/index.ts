import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { FullReceiptSchema } from "./zod";
import { env } from "cloudflare:workers";


const openai = new OpenAI({
  baseURL: `https://gateway.ai.cloudflare.com/v1/6377196122dd8a0ce3a9b3ef18fdfdd7/receipto/openai`,
  apiKey: env.OPENAI_API_KEY,
  defaultHeaders: {
    "cf-aig-authorization": `Bearer ${env.API_GATEWAY_TOKEN}`,
  },
});

export const ReceiptProcessor = {
  process: async (imageBase64: string, mimeType: string = "image/jpeg") => {
    // Clean base64 string - remove any whitespace, newlines, or data URL prefix if present
    let cleanBase64 = imageBase64
      .replace(/^data:image\/[a-z+]+;base64,/, "") // Remove data URL prefix if present
      .replace(/\s/g, "") // Remove all whitespace
      .replace(/\n/g, "") // Remove newlines
      .replace(/\r/g, ""); // Remove carriage returns

    // Ensure proper base64 padding (base64 strings should be multiples of 4)
    const padding = cleanBase64.length % 4;
    if (padding > 0) {
      cleanBase64 += "=".repeat(4 - padding);
    }

    // Normalize mime type to ensure it's a valid image format
    let imageMimeType = mimeType || "image/jpeg";
    if (!imageMimeType.startsWith("image/")) {
      imageMimeType = `image/${imageMimeType}`;
    }
    
    // Ensure mime type is one of the supported formats
    const supportedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!supportedTypes.includes(imageMimeType)) {
      // Default to jpeg if unsupported type
      imageMimeType = "image/jpeg";
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting structured information from receipt images. Analyze the receipt image carefully and extract all relevant information in the requested format."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
                Please analyze this receipt image and extract all the information in the structured format.
                If the information is not present in the image, return null for the corresponding field.
                `
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageMimeType};base64,${cleanBase64}`,
                  detail: "auto"
                }
              }
            ]
          }
        ],
        response_format: zodResponseFormat(FullReceiptSchema, 'analysis'),
        reasoning_effort: "medium"
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