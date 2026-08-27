import type { ParsedResume } from "@/lib/resume/types";
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    resume: jsonb("resume").$type<ParsedResume>(),
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

export const job = pgTable(
  "job",
  {
    source: text("source").notNull(),
    id: text("id").notNull(),
    slug: text("slug"),
    epoch: bigint("epoch", { mode: "number" }),
    date: timestamp("date", { withTimezone: true, mode: "date" }),
    company: text("company"),
    companyLogo: text("company_logo"),
    position: text("position"),
    tags: text("tags").array(),
    description: text("description"),
    location: text("location"),
    applyUrl: text("apply_url"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    logo: text("logo"),
    url: text("url"),
  },
  (table) => [
    primaryKey({ columns: [table.source, table.id] }),
    index("job_date_idx").on(table.date),
    index("job_company_idx").on(table.company),
    // Spec §28: search the normalized dataset in Postgres rather than scraping
    // live. Explicit regconfig keeps the expression immutable and indexable.
    index("job_search_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(${table.position}, '') || ' ' || coalesce(${table.company}, '') || ' ' || coalesce(${table.description}, ''))`,
    ),
    pgPolicy("job_select_authenticated", {
      for: "select",
      to: "authenticated",
      using: sql`true`,
    }),
  ],
).enableRLS();

export const savedJob = pgTable(
  "saved_job",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobSource: text("job_source").notNull(),
    jobId: text("job_id").notNull(),
    /** Spec §29: preserve the score as it stood when the user saved it. */
    matchScore: integer("match_score"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.jobSource, table.jobId] }),
    foreignKey({
      columns: [table.jobSource, table.jobId],
      foreignColumns: [job.source, job.id],
      name: "saved_job_job_fk",
    }).onDelete("cascade"),
    index("saved_job_user_idx").on(table.userId),
    pgPolicy("saved_job_self_all", {
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

export const savedJobRelations = relations(savedJob, ({ one }) => ({
  user: one(users, {
    fields: [savedJob.userId],
    references: [users.id],
  }),
  job: one(job, {
    fields: [savedJob.jobSource, savedJob.jobId],
    references: [job.source, job.id],
  }),
}));
