import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const assessmentsTable = pgTable("assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  age: integer("age").notNull(),
  biologicalSex: varchar("biological_sex", { length: 50 }).notNull(),
  primarySymptoms: text("primary_symptoms").notNull(),
  duration: varchar("duration", { length: 100 }).notNull(),
  severity: integer("severity").notNull(),
  chronicConditions: text("chronic_conditions"),
  currentMedications: text("current_medications"),
  urgencyLevel: varchar("urgency_level", { length: 50 }).notNull(),
  aiAnalysis: jsonb("ai_analysis").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssessmentSchema = createInsertSchema(assessmentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessmentsTable.$inferSelect;