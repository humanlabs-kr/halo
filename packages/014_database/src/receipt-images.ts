import { integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { schema } from "./schema";
import { receipts } from "./receipts";
import { relations } from "drizzle-orm";

export const receiptImages = schema.table("receipt_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  numOrder: integer("num_order").notNull(),
  receiptId: uuid("receipt_id")
    .references(() => receipts.id, { onDelete: "cascade" })
    .notNull(),

  r2Key: varchar("r2_key", { length: 36 }),
  synapsePieceCid: varchar("synapse_piece_cid", { length: 255 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date()
  ),
});

export const receiptImagesRelations = relations(receiptImages, ({ one }) => ({
  receipt: one(receipts, {
    fields: [receiptImages.receiptId],
    references: [receipts.id],
  }),
}));
