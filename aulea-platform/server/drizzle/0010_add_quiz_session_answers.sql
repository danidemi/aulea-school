CREATE TABLE "quiz_session_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"item_identifier" text NOT NULL,
	"item_path" text NOT NULL,
	"responses" jsonb,
	"grading_status" text NOT NULL,
	"max_score" double precision NOT NULL,
	"score" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_session_answers" ADD CONSTRAINT "quiz_session_answers_connection_id_quiz_session_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."quiz_session_connections"("id") ON DELETE no action ON UPDATE no action;