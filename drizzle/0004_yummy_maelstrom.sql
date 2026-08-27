CREATE TABLE "saved_job" (
	"user_id" uuid NOT NULL,
	"job_source" text NOT NULL,
	"job_id" text NOT NULL,
	"match_score" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_job_user_id_job_source_job_id_pk" PRIMARY KEY("user_id","job_source","job_id")
);
--> statement-breakpoint
ALTER TABLE "saved_job" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_job" ADD CONSTRAINT "saved_job_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_job" ADD CONSTRAINT "saved_job_job_fk" FOREIGN KEY ("job_source","job_id") REFERENCES "public"."job"("source","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_job_user_idx" ON "saved_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_company_idx" ON "job" USING btree ("company");--> statement-breakpoint
CREATE INDEX "job_search_idx" ON "job" USING gin (to_tsvector('english', coalesce("position", '') || ' ' || coalesce("company", '') || ' ' || coalesce("description", '')));--> statement-breakpoint
CREATE POLICY "saved_job_self_all" ON "saved_job" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());