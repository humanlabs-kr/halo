import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { and, desc, eq, inArray, pointClaims, receipts, sql, sum } from '@hl/database';
import { PointService } from 'workers/services/point';
import { useDB } from 'workers/utils/db';
import { hashToField, verifyProof } from 'workers/utils/verify';
import KSUID from 'ksuid';

export class ClaimPoint extends OpenAPIRoute {
	schema = {
		tags: ['Receipt'],
		summary: 'Claim point',
		security: [{ cookie: [] }],
		request: {
			body: {
				...contentJson(
					z.object({
						proof: z.string(),
						verification_level: z.enum(['orb', 'device']),
						merkle_root: z.string(),
						nullifier_hash: z.string(),
						signal: z.string(),
						action: z.string(),
					}),
				),
			},
		},
		responses: {
			'200': {
				description: 'Success',
				...contentJson(
					z.object({
						claimedPoint: z.number(),
					}),
				),
			},
			'400': {
				description: 'Bad Request',
				...contentJson(
					z.object({
						code: z.literal('BAD_REQUEST').or(z.literal('INVALID_PROOF')),
						message: z.string(),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		const userAddress = c.get('address');
		const db = useDB();

		const { proof, verification_level, merkle_root, nullifier_hash, signal, action } = data.body;

		const signal_hash = hashToField(signal).digest;

		const response = await verifyProof({
			nullifier_hash: nullifier_hash,
			merkle_root: merkle_root,
			proof: proof,
			verification_level: verification_level,
			action: action,
			signal_hash: signal_hash,
		});

		if (!response.success) {
			return c.json(
				{
					code: 'INVALID_PROOF',
					message: 'Invalid proof',
				},
				400,
			);
		}

		const claimedPoint = await db.transaction(async (tx) => {
			const claimablePointRecords = await tx
				.select({
					id: receipts.id,
					assignedPoint: receipts.assignedPoint,
				})
				.from(receipts)
				.where(and(eq(receipts.userAddress, userAddress), eq(receipts.status, 'claimable')));

			const totalClaimablePoint = claimablePointRecords.reduce((acc, item) => acc + item.assignedPoint, 0);

			const createdPointLog = await PointService.insertPointLog(tx, {
				userAddress: userAddress,
				diff: totalClaimablePoint,
				sourceType: 'receipt-upload',
			});

			await tx.insert(pointClaims).values({
				id: KSUID.randomSync().string,
				userAddress: userAddress,
				signal: signal,
				action: action,
				merkle_root: merkle_root,
				nullifier_hash: nullifier_hash,
				signal_hash: signal_hash,
				verification_level: verification_level,
				proof: proof,
				totalAmount: totalClaimablePoint,
				receiptIds: claimablePointRecords.map((item) => item.id),
			});

			await tx
				.update(receipts)
				.set({
					status: 'claimed',
					pointLogId: createdPointLog.id,
				})
				.where(
					inArray(
						receipts.id,
						claimablePointRecords.map((item) => item.id),
					),
				);

			return totalClaimablePoint;
		});

		return c.json({
			claimedPoint: claimedPoint,
		});
	}
}
