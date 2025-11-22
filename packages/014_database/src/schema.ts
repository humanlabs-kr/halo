import { pgSchema } from "drizzle-orm/pg-core";

export const schema = pgSchema(process.env.DATABASE_SCHEMA!);