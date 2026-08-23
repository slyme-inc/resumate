import { relations, sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  () => [
    pgPolicy("users_self_all", {
      for: "all",
      to: "authenticated",
      using: sql`id = auth.uid()`,
      withCheck: sql`id = auth.uid()`,
    }),
  ],
).enableRLS();

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    pgPolicy("sessions_self_all", {
      for: "all",
      to: "authenticated",
      using: sql`user_id = auth.uid()`,
      withCheck: sql`user_id = auth.uid()`,
    }),
  ],
).enableRLS();

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
