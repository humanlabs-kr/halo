import {
  decimal,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { schema } from "./schema";
import { users } from "./users";
import { relations, SQL, sql } from "drizzle-orm";
import { receiptImages } from "./receipt-images";
import { pointLogs } from "./point-logs";

export const receipts = schema.table("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),

  userAddress: varchar("user_address", { length: 255 })
    .references(() => users.address, { onDelete: "restrict" })
    .notNull(),

  // - pending 스캔하자마자, AI 평가 queue에 들어간 상태
  // - rejected AI 평가상 30점 이하 or 필수항목 3가지 누락상태 (언제 / 총 얼마 / 어디서)
  // - 결제시각이 일주일 이내여야함
  // - claimable AI 평가 30점 이상 and 필수항목 3가지 포함 확인됨
  // - claimed 사용자가 내역화면에서 수동으로 (verify) 클레임 완료한 상태
  status: varchar("status", { length: 20 })
    .$type<"pending" | "rejected" | "claimable" | "claimed">()
    .default("pending")
    .notNull(),

  assignedPoint: integer("assigned_point").notNull().default(0),

  merchantName: text("merchant_name"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  countryCode: varchar("country_code", { length: 10 }),
  currency: varchar("currency", { length: 10 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  paymentMethod: text("payment_method"),
  qualityRate: integer("quality_rate"),

  analysisStartedAt: timestamp("analysis_started_at", { withTimezone: true }),
  analysisCompletedAt: timestamp("analysis_completed_at", {
    withTimezone: true,
  }),
  analysisError: text("analysis_error"),

  pointLogId: uuid("point_log_id").references(() => pointLogs.id, {
    onDelete: "restrict",
  }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date()
  ),
});

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  user: one(users, {
    fields: [receipts.userAddress],
    references: [users.address],
  }),
  images: many(receiptImages),
}));
