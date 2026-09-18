import { relations } from 'drizzle-orm';
import { boolean, integer, timestamp, varchar } from 'drizzle-orm/pg-core';
import { schema } from './schema';
import { users } from './users';
import type { Platform } from './enums';

export const haloEmailVerifications = schema.table('halo_email_verifications', {
  id: varchar('id', { length: 27 }).primaryKey(), // KSUID
  chain: varchar('chain', { length: 20 }).$type<Platform>().notNull(),
  userAddress: varchar('user_address', { length: 255 })
    .references(() => users.address, { onDelete: 'cascade' })
    .notNull(),
  /** Max email length per RFC 5321. */
  email: varchar('email', { length: 320 }).notNull(),
  /** Cleared once the address is verified. */
  otpCode: varchar('otp_code', { length: 6 }),
  otpExpiresAt: timestamp('otp_expires_at', { withTimezone: true }),
  otpAttempts: integer('otp_attempts').default(0).notNull(),
  /** Used to enforce the resend cooldown. */
  otpSentAt: timestamp('otp_sent_at', { withTimezone: true }),
  isVerified: boolean('is_verified').default(false).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Email uniqueness is enforced per chain in the application, not here:
// one verified email per user per chain.

export const haloEmailVerificationsRelations = relations(haloEmailVerifications, ({ one }) => ({
  user: one(users, {
    fields: [haloEmailVerifications.userAddress],
    references: [users.address],
  }),
}));

export type HaloEmailVerification = typeof haloEmailVerifications.$inferSelect;
export type NewHaloEmailVerification = typeof haloEmailVerifications.$inferInsert;
