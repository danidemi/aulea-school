ALTER TABLE "quiz_session_connections" ADD COLUMN "item_order" jsonb;--> statement-breakpoint
ALTER TABLE "quiz_session_connections" ADD COLUMN "choice_order" jsonb;--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD COLUMN "force_shuffle_questions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD COLUMN "force_shuffle_answers" boolean DEFAULT false NOT NULL;