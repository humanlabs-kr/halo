import type { ReceiptStatus } from '@halo/contracts';
import { apiFetch, apiUrl, type ApiRequestInit } from './client';

/**
 * Receipt endpoints — `apps/api/src/routes/client/receipt.ts`.
 *
 * `status` is `ReceiptStatus` from `@halo/contracts`, the same enum the server
 * validates with. Re-declaring the five states here would let the two drift,
 * and the screens index status→label maps by it: a missing member is a runtime
 * `undefined.label`, not a type error, unless the union is shared.
 *
 * Date columns are `z.coerce.date()` server-side, which serialises to an ISO
 * string over JSON — so they are `string` here, not `Date`.
 */

/** Module-private: every client route is mounted under `/v1`. */
function call<T>(path: string, init?: ApiRequestInit): Promise<T> {
  return apiFetch<T>(`/v1${path}`, init);
}

export interface UploadReceiptRequest {
  file: File;
  turnstileToken: string;
}

export interface ReceiptUploaded {
  result: 'success';
}

export interface ReceiptListItem {
  id: string;
  merchantName: string | null;
  status: ReceiptStatus;
  currency: string | null;
  totalAmount: string | null;
  assignedPoint: number;
  qualityRate: number | null;
  createdAt: string;
}

export interface ReceiptList {
  totalCount: number;
  list: ReceiptListItem[];
}

/**
 * One stored scan. The `synapse*` fields track the archival upload, which runs
 * after analysis and may never have started — hence all four being nullable.
 */
export interface ReceiptImage {
  id: string;
  numOrder: number;
  synapseUploadStartedAt: string | null;
  synapseUploadCompletedAt: string | null;
  synapsePieceCid: string | null;
  synapseUploadError: string | null;
  createdAt: string;
}

export interface ReceiptDetail {
  id: string;
  merchantName: string | null;
  status: ReceiptStatus;
  currency: string | null;
  totalAmount: string | null;
  issuedAt: string | null;
  countryCode: string | null;
  paymentMethod: string | null;
  qualityRate: number | null;
  assignedPoint: number;
  createdAt: string;
  images: ReceiptImage[];
}

export interface ReceiptStat {
  weeklyScanCount: number;
  dailyScanCount: number;
}

export interface ReceiptTotalCount {
  totalCount: number;
}

export const receiptApi = {
  upload({ file, turnstileToken }: UploadReceiptRequest): Promise<ReceiptUploaded> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('turnstileToken', turnstileToken);

    return call('/receipts', { method: 'POST', formData });
  },

  list(): Promise<ReceiptList> {
    return call('/receipts');
  },

  byId(receiptId: string): Promise<ReceiptDetail> {
    return call(`/receipts/${encodeURIComponent(receiptId)}`);
  },

  /**
   * Scans are served by the API, not from public storage, so this is a URL for
   * an `<img src>` rather than a request — the browser fetches it, not us.
   */
  imageUrl(receiptId: string, receiptImageId: string): string {
    return apiUrl(
      `/v1/receipts/${encodeURIComponent(receiptId)}/image/${encodeURIComponent(receiptImageId)}`,
    );
  },

  stat(): Promise<ReceiptStat> {
    return call('/receipt/stat');
  },

  /** Public counter for the landing card — no session required. */
  totalCount(): Promise<ReceiptTotalCount> {
    return call('/receipt/total-count');
  },
};
