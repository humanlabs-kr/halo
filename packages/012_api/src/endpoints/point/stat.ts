import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { and, desc, eq, receipts, sql, sum } from '@hl/database';
import { PointService } from 'workers/services/point';
import { useDB } from 'workers/utils/db';

export class PointStat extends OpenAPIRoute {
	schema = {
		tags: ['Receipt'],
		summary: 'Get point stat',
		security: [{ cookie: [] }],
		responses: {
			'200': {
				description: 'Success',
				...contentJson(
					z.object({
						accumulatedPoint: z.number(),
						currentPoint: z.number(),
						claimablePoint: z.number(),
					}),
				),
			},
			'400': {
				description: 'Bad Request',
				...contentJson(
					z.object({
						code: z.literal('BAD_REQUEST'),
						message: z.string(),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userAddress = c.get('address');
		const db = useDB();

		const [userPoint, claimablePoint] = await Promise.all([
			PointService.getUserPoint(userAddress),
			(async () => {
				const claimablePoint = await db
					.select({
						amount: sql<number>`sum(${receipts.assignedPoint})`,
					})
					.from(receipts)
					.where(and(eq(receipts.userAddress, userAddress), eq(receipts.status, 'claimable')))
					.then((result) => result[0]?.amount ?? 0);

				return claimablePoint;
			})(),
		]);

		return c.json({
			accumulatedPoint: userPoint.accumulatedBalance,
			currentPoint: userPoint.afterBalance,
			claimablePoint: claimablePoint,
		});
	}
}
