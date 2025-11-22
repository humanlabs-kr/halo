import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { schema } from "./schema";

export const users = schema.table("users", {
  // lower cased normalized address
  address: varchar("address", { length: 255 })
    .$type<`0x${string}`>()
    .primaryKey(),
  username: text("username").notNull(),
  profilePictureUrl: text("profile_picture_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date()
  ),
  verificationLevel: text("verification_level")
    .$type<"none" | "orb" | "device">()
    .default("none")
    .notNull(),
  checksumAddress: varchar("checksum_address", { length: 255 })
    .default("")
    .$type<`0x${string}`>()
    .notNull(),
});
