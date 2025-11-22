CREATE SCHEMA "receipto";
--> statement-breakpoint
CREATE TABLE "receipto"."users" (
	"address" varchar(255) PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"profile_picture_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"verification_level" text DEFAULT 'none' NOT NULL,
	"checksum_address" varchar(255) DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipto"."receipt" (
	"id" uuid PRIMARY KEY NOT NULL,
	"synapse_piece_cid" varchar(255),
	"r2_key" varchar(36),
	"user_address" varchar(255) NOT NULL,
	"merchant_name" text,
	"issued_at" timestamp with time zone,
	"country_code" varchar(10),
	"currency" varchar(10),
	"total_amount" numeric(10, 2),
	"payment_method" text,
	"quality_rate" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "receipto"."receipt" ADD CONSTRAINT "receipt_user_address_users_address_fk" FOREIGN KEY ("user_address") REFERENCES "receipto"."users"("address") ON DELETE restrict ON UPDATE no action;