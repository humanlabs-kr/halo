import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { and, desc, eq, gte, lt, receipts, sql, sum } from '@hl/database';
import { PointService } from 'workers/services/point';
import { useDB } from 'workers/utils/db';
import { addDays, startOfDay, startOfWeek } from 'date-fns';

export class ReceiptStat extends OpenAPIRoute {
	schema = {
		tags: ['Receipt'],
		summary: 'Get receipt stat',
		security: [{ cookie: [] }],
		responses: {
			'200': {
				description: 'Success',
				...contentJson(
					z.object({
						weeklyScanCount: z.number(),
						dailyScanCount: z.number(),
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

		// 주간 기준으로 포인트 줌
		// 주는 월요일 00:00 UTC 기준

		const db = useDB();

		const [weeklyScanCount, dailyScanCount] = await Promise.all([
			(async () => {
				const weeklyScanCount = await db
					.select({
						count: sql<number>`count(*)`.as('count'),
					})
					.from(receipts)
					.where(
						and(
							eq(receipts.userAddress, userAddress),
							gte(receipts.createdAt, startOfWeek(new Date())),
							lt(receipts.createdAt, startOfWeek(addDays(new Date(), 7))),
						),
					)
					.then((result) => result[0]?.count ?? 0);

				return weeklyScanCount;
			})(),
			(async () => {
				const dailyScanCount = await db
					.select({
						count: sql<number>`count(*)`.as('count'),
					})
					.from(receipts)
					.where(
						and(
							eq(receipts.userAddress, userAddress),
							gte(receipts.createdAt, startOfDay(new Date())),
							lt(receipts.createdAt, startOfDay(addDays(new Date(), 1))),
						),
					)
					.then((result) => result[0]?.count ?? 0);

				return dailyScanCount;
			})(),
		]);

		return c.json({
			weeklyScanCount,
			dailyScanCount,
		});
	}
}
