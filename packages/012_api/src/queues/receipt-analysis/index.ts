import { eq, receiptImages, receipts, sql } from '@hl/database';
import { env } from 'cloudflare:workers';
import { isEmpty } from 'lodash-es';
import { ReceiptProcessor } from 'workers/services/receipt-processor';
import { BASE_POINT_PER_RECEIPT } from 'workers/utils/constant';
import { useDB } from 'workers/utils/db';
import { R2 } from 'workers/utils/r2';

type Params = {
	receiptId: string;
	country: string; // ISO 3166-1 Alpha 2 code
};

export const ReceiptAnalysisQueue = {
	name: 'receipt-analysis',
	send: async (params: Params) => {
		await env.RECEIPT_ANALYSIS_QUEUE.send(params, {
			contentType: 'json',
		});
	},
	run: async (batch: MessageBatch, env: Env, ctx: ExecutionContext) => {
		console.log('Receipt analysis message:', batch.messages);
		const results = await Promise.allSettled(
			batch.messages.map(async (message) => {
				const params = message.body as Params;

				const db = useDB();
				try {
					await db
						.update(receipts)
						.set({
							analysisStartedAt: new Date(),
							analysisError: null,
						})
						.where(eq(receipts.id, params.receiptId));

					const receiptImageRecords = await db.query.receiptImages.findMany({
						columns: {
							id: true,
						},
						where: eq(receiptImages.receiptId, params.receiptId),
					});

					if (receiptImageRecords.some((receiptImage) => !receiptImage.id)) {
						console.error('Receipt image not found in R2');
						throw new Error('Some receipt images not found in R2');
					}

					const receiptImageDataArray = await Promise.all(
						receiptImageRecords.map(async (receiptImage) => {
							const imageBytes = await R2.downloadReceiptImage(receiptImage.id);
							return imageBytes;
						}),
					);

					const receiptData = await ReceiptProcessor.process(receiptImageDataArray, params.country);

					// - pending 스캔하자마자, AI 평가 queue에 들어간 상태
					// - rejected AI 평가상 30점 이하 or 필수항목 3가지 누락상태 (언제 / 총 얼마 / 어디서)
					// - 결제시각이 일주일 이내여야함
					// - claimable AI 평가 30점 이상 and 필수항목 3가지 포함 확인됨
					// - claimed 사용자가 내역화면에서 수동으로 (verify) 클레임 완료한 상태
					const status =
						receiptData.qualityRate >= 30 &&
						!isEmpty(receiptData.merchantName) &&
						new Date(receiptData.issuedAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
						receiptData.totalAmount !== null
							? 'claimable'
							: 'rejected';

					const assignedPoint = status === 'claimable' ? Math.floor((BASE_POINT_PER_RECEIPT * receiptData.qualityRate) / 100) : 0;

					await db.transaction(async (tx) => {
						const receipt = await tx.query.receipts.findFirst({
							where: eq(receipts.id, params.receiptId),
						});

						if (!receipt) {
							throw new Error('Receipt not found');
						}

						const alreadyAssignedZeroPoint = receipt.assignedPoint === -1;

						await tx
							.update(receipts)
							.set({
								merchantName: receiptData.merchantName,
								issuedAt: receiptData.issuedAt,
								countryCode: receiptData.countryCode,
								currency: receiptData.currency,
								totalAmount: receiptData.totalAmount ? receiptData.totalAmount.toFixed(2) : null,
								paymentMethod: receiptData.paymentMethod,
								qualityRate: Math.max(0, Math.min(100, Math.floor(receiptData.qualityRate))),

								status: alreadyAssignedZeroPoint ? 'claimed' : status,
								// 이미지 품질에 따라 포인트 부여 (claimable 상태만)
								assignedPoint: alreadyAssignedZeroPoint ? 0 : assignedPoint,

								analysisCompletedAt: new Date(),
								analysisError: null,
							})
							.where(eq(receipts.id, params.receiptId));
					});

					console.log('Receipt analysis completed for receipt:', params.receiptId);
				} catch (error: any) {
					console.error('Receipt analysis failed for receipt:', error);
					await db
						.update(receipts)
						.set({
							status: 'rejected',
							assignedPoint: 0,
							analysisCompletedAt: new Date(),
							analysisError: error.message,
						})
						.where(eq(receipts.id, params.receiptId));

					// rethrow to trigger retry
					throw error;
				}
			}),
		);

		const failedIndices = results.map((result, index) => (result.status === 'rejected' ? index : false)).filter((i) => i !== false);
		if (failedIndices.length > 0) {
			for (const index of failedIndices) {
				batch.messages[index].retry({ delaySeconds: 10 });
			}
		}
	},
};
