CREATE TABLE "resend_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_hash" text NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "resend_requests_email_hash_created_at_idx" ON "resend_requests" USING btree ("email_hash","created_at");--> statement-breakpoint
CREATE INDEX "resend_requests_ip_created_at_idx" ON "resend_requests" USING btree ("ip","created_at");