/**
 * Fluence OCR Service Client
 */

export interface OcrRequest {
  imageUrl: string;
}

export interface ReceiptFields {
  total_amount?: string;
  date?: string;
  merchant_name?: string;
  [key: string]: string | undefined;
}

export interface OcrResponse {
  text: string;
  fields: ReceiptFields;
  success: true;
}

export interface OcrError {
  error: string;
  success: false;
}

export type OcrResult = OcrResponse | OcrError;

export interface BatchOcrRequest {
  imageUrls: string[];
}

export interface BatchOcrResult {
  imageUrl: string;
  text?: string;
  fields?: ReceiptFields;
  error?: string;
  success: boolean;
}

export interface BatchOcrResponse {
  results: BatchOcrResult[];
  success: true;
}

export interface BatchOcrError {
  error: string;
  success: false;
}

export type BatchOcrRequestResult = BatchOcrResponse | BatchOcrError;

/**
 * Fluence OCR Client
 * Handles communication with the Fluence OCR microservice
 */
export class FluenceOcrClient {
  private baseUrl: string;
  private timeout: number;

  /**
   * Initialize the Fluence OCR Client
   */
  constructor(baseUrl: string, timeout: number = 60000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  /**
   * Process a single receipt image
   * @param imageUrl - Image input: IPFS URL, HTTP(S) URL, or base64 data
   */
  async processReceipt(imageUrl: string): Promise<OcrResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: (data as OcrError).error || `HTTP ${response.status}`,
          success: false,
        };
      }

      return data as OcrResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        error: `Failed to call OCR service: ${errorMessage}`,
        success: false,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Process multiple receipt images in batch
   */
  async processReceiptsBatch(imageUrls: string[]): Promise<BatchOcrRequestResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2); // Double timeout for batch

    try {
      const response = await fetch(`${this.baseUrl}/ocr/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrls }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: (data as BatchOcrError).error || `HTTP ${response.status}`,
          success: false,
        };
      }

      return data as BatchOcrRequestResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        error: `Failed to call batch OCR service: ${errorMessage}`,
        success: false,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Export a singleton instance
 */
export function createOcrClient(baseUrl: string): FluenceOcrClient {
  return new FluenceOcrClient(baseUrl);
}
