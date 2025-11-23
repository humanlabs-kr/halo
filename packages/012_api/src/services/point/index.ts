import { useDB } from 'workers/utils/db';
import { pointLogs, eq, desc, PostgresJsQueryResultHKT } from '@hl/database';
import type { ExtractTablesWithRelations, PgTransaction } from '@hl/database';
import KSUID from 'ksuid';
import * as schema from '@hl/database';

export const PointService = {
	async getUserPoint(userAddress: string) {
		const db = useDB();
		const userPoint = await db.query.pointLogs.findFirst({
			where: eq(pointLogs.userAddress, userAddress),
			orderBy: [desc(pointLogs.createdAt)],
		});

		return {
			afterBalance: userPoint?.afterBalance ?? 0,
			accumulatedBalance: userPoint?.accumulatedBalance ?? 0,
		};
	},
	async insertPointLog(
		tx: PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>,
		params: {
			userAddress: string;
			diff: number;
			sourceType: 'airdrop' | 'receipt-upload';
			sourceId?: string;
			metadata?: Record<string, any>;
		},
	) {
		const userPoint = await tx.query.pointLogs.findFirst({
			where: eq(pointLogs.userAddress, params.userAddress),
			orderBy: [desc(pointLogs.createdAt)],
		});

		const afterBalance = userPoint?.afterBalance ?? 0;
		const accumulatedBalance = userPoint?.accumulatedBalance ?? 0;

		// user is spending points
		if (params.diff < 0 && afterBalance + params.diff < 0) {
			// check if user has enough point
			throw new Error('Insufficient point');
		}

		// create new point log
		const createdPointLog = await tx
			.insert(pointLogs)
			.values({
				id: KSUID.randomSync().string,
				userAddress: params.userAddress,
				diff: params.diff,
				afterBalance: afterBalance + params.diff,
				accumulatedBalance: params.diff < 0 ? accumulatedBalance : accumulatedBalance + params.diff,
				sourceType: params.sourceType,
				sourceId: params.sourceId ?? null,
				metadata: params.metadata ?? {},
			})
			.returning()
			.then((result) => result[0]);

		return createdPointLog;
	},
};
