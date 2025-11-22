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

export const receipt = schema.table("receipt", {
  id: uuid("id").primaryKey(),
  synapsePieceCid: varchar("synapse_piece_cid", { length: 255 }),
  r2Key: varchar("r2_key", { length: 36 }),

  userAddress: varchar("user_address", { length: 255 })
    .references(() => users.address, { onDelete: "restrict" })
    .notNull(),

  merchantName: text("merchant_name"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  countryCode: varchar("country_code", { length: 10 }),
  currency: varchar("currency", { length: 10 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  paymentMethod: text("payment_method"),
  qualityRate: integer("quality_rate").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date()
  ),
});
