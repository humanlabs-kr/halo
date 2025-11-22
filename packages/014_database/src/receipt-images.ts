import {
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { schema } from "./schema";
import { receipts } from "./receipts";
import { relations } from "drizzle-orm";

// for R2, object key is same as row id

export const receiptImages = schema.table("receipt_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  numOrder: integer("num_order").notNull(),
  receiptId: uuid("receipt_id")
    .references(() => receipts.id, { onDelete: "cascade" })
    .notNull(),

  synapseUploadStartedAt: timestamp("synapse_upload_started_at", {
    withTimezone: true,
  }),
  synapseUploadCompletedAt: timestamp("synapse_upload_completed_at", {
    withTimezone: true,
  }),
  synapsePieceCid: varchar("synapse_piece_cid", { length: 255 }),
  synapseUploadError: text("synapse_upload_error"),

  fluenceOcrStartedAt: timestamp("fluence_ocr_started_at", {
    withTimezone: true,
  }),
  fluenceOcrCompletedAt: timestamp("fluence_ocr_completed_at", {
    withTimezone: true,
  }),
  fluenceOcrResult: jsonb("fluence_ocr_result"),
  fluenceOcrError: text("fluence_ocr_error"),

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
