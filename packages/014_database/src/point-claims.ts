import {
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { schema } from "./schema";
import { users } from "./users";
import { relations } from "drizzle-orm";

export const pointClaims = schema.table("point_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  userAddress: varchar("user_address", { length: 255 })
    .references(() => users.address, { onDelete: "cascade" })
    .notNull(),

  signal: text("signal").notNull(),
  action: text("action").notNull(),
  merkle_root: text("merkle_root").notNull(),
  nullifier_hash: text("nullifier_hash").notNull(),
  signal_hash: text("signal_hash").notNull(),
  verification_level: text("verification_level")
    .$type<"orb" | "device">()
    .notNull(),
  proof: text("proof").notNull(),

  totalAmount: integer("total_amount").notNull(),
  receiptIds: jsonb("receipt_ids").$type<string[]>().notNull(), // for 기록용
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pointClaimsRelations = relations(pointClaims, ({ one, many }) => ({
  user: one(users, {
    fields: [pointClaims.userAddress],
    references: [users.address],
  }),
}));
