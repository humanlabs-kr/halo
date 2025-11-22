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
import { relations } from "drizzle-orm";
import { receiptImages } from "./receipt-images";
import { pointLogs } from "./point-logs";

export const receipts = schema.table("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),

  userAddress: varchar("user_address", { length: 255 })
    .references(() => users.address, { onDelete: "restrict" })
    .notNull(),

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
