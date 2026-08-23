ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "sessions_self_all" ON "sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "users_self_all" ON "users" AS PERMISSIVE FOR ALL TO "authenticated" USING (id = auth.uid()) WITH CHECK (id = auth.uid());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "users" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "sessions" TO authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE "users" TO anon;