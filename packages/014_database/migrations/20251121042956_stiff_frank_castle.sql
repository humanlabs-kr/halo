CREATE TABLE "receipto"."users" (
	"address" varchar(255) PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"profile_picture_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"verification_level" text DEFAULT 'none' NOT NULL,
	"checksum_address" varchar(255) DEFAULT '' NOT NULL
);
