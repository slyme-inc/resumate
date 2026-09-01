CREATE TABLE "job_role_card" (
	"source" text NOT NULL,
	"id" text NOT NULL,
	"card" jsonb NOT NULL,
	"extracted_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_role_card_source_id_pk" PRIMARY KEY("source","id")
);
--> statement-breakpoint
CREATE TABLE "match_rerank" (
	"user_id" uuid NOT NULL,
	"profile_fp" text NOT NULL,
	"keys" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_rerank_user_id_profile_fp_pk" PRIMARY KEY("user_id","profile_fp")
);
--> statement-breakpoint
ALTER TABLE "job_role_card" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "match_rerank" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job_role_card" ADD CONSTRAINT "job_role_card_job_fk" FOREIGN KEY ("source","id") REFERENCES "public"."job"("source","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rerank" ADD CONSTRAINT "match_rerank_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "job_role_card_select_authenticated" ON "job_role_card" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "match_rerank_self_all" ON "match_rerank" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
GRANT SELECT ON TABLE "job_role_card" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "match_rerank" TO authenticated;
