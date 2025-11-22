import {
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { schema } from "./schema";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const pointLogs = schema.table(
  "point_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userAddress: text("address").notNull(),

    // 포인트 변동량 (음수/양수 모두 가능)
    diff: integer("diff").notNull(),

    // 변동 후 잔고 (캐시용)
    afterBalance: integer("after_balance").notNull(),

    // 누적 (더하기만 합산)
    accumulatedBalance: integer("accumulated_balance").notNull(),

    // 포인트 소스 (어느 게임/활동에서 얻었는지/썼는지)
    sourceType: text("source_type")
      .$type<"airdrop" | "receipt-upload">()
      .notNull(),
    sourceId: text("source_id"),

    // 메타데이터
    metadata: jsonb("metadata").default({}).notNull(), // JSON 형태의 추가 정보

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("point_logs_address_idx").on(table.userAddress),
    index("point_logs_source_idx").on(table.sourceType, table.sourceId),
    index("point_logs_created_at_idx").on(table.createdAt),

    // Materialized View 최적화용 복합 인덱스들
    index("point_logs_address_created_at_idx").on(
      table.userAddress,
      table.createdAt.desc()
    ),
  ]
);

export const pointLogsRelations = relations(pointLogs, ({ one, many }) => ({
  user: one(users, {
    fields: [pointLogs.userAddress],
    references: [users.address],
  }),
}));
