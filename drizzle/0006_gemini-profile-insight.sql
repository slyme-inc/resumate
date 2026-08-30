ALTER TABLE "users" ADD COLUMN "profile" jsonb;
--> statement-breakpoint
CREATE TABLE "opportunity_insight" (
	"user_id" uuid NOT NULL,
	"job_source" text NOT NULL,
	"job_id" text NOT NULL,
	"profile_fp" text NOT NULL,
	"insight" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_insight_user_id_job_source_job_id_pk" PRIMARY KEY("user_id","job_source","job_id")
);
--> statement-breakpoint
ALTER TABLE "opportunity_insight" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "opportunity_insight" ADD CONSTRAINT "opportunity_insight_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_insight" ADD CONSTRAINT "opportunity_insight_job_fk" FOREIGN KEY ("job_source","job_id") REFERENCES "public"."job"("source","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opportunity_insight_user_idx" ON "opportunity_insight" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "opportunity_insight_self_all" ON "opportunity_insight" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "opportunity_insight" TO authenticated;
