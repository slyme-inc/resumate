CREATE TABLE "job" (
	"source" text NOT NULL,
	"id" text NOT NULL,
	"slug" text,
	"epoch" bigint,
	"date" timestamp with time zone,
	"company" text,
	"company_logo" text,
	"position" text,
	"tags" text[],
	"description" text,
	"location" text,
	"apply_url" text,
	"salary_min" integer,
	"salary_max" integer,
	"logo" text,
	"url" text,
	CONSTRAINT "job_source_id_pk" PRIMARY KEY("source","id")
);
--> statement-breakpoint
ALTER TABLE "job" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "job_date_idx" ON "job" USING btree ("date");--> statement-breakpoint
CREATE POLICY "job_select_authenticated" ON "job" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
GRANT SELECT ON TABLE "job" TO authenticated;