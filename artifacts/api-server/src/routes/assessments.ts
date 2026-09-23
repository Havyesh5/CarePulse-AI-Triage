import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, assessmentsTable } from "@workspace/db";
import {
  CreateAssessmentBody,
  CreateAssessmentResponse,
  GetAssessmentParams,
  GetAssessmentResponse,
  GetDashboardSummaryResponse,
  ListAssessmentsQueryParams,
  ListAssessmentsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { analyzeSymptoms } from "../lib/triage";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/assessments", async (req, res): Promise<void> => {
  const query = ListAssessmentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(assessmentsTable.userId, req.userId!)];
  if (query.data.urgency) {
    conditions.push(eq(assessmentsTable.urgencyLevel, query.data.urgency));
  }
  if (query.data.search) {
    conditions.push(ilike(assessmentsTable.primarySymptoms, `%${query.data.search}%`));
  }

  const assessments = await db
    .select()
    .from(assessmentsTable)
    .where(and(...conditions))
    .orderBy(desc(assessmentsTable.createdAt));
  res.json(ListAssessmentsResponse.parse(assessments.map((item) => ({ ...item, aiAnalysis: item.aiAnalysis }))));
});

router.post("/assessments", async (req, res): Promise<void> => {
  const parsed = CreateAssessmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const analysis = await analyzeSymptoms(parsed.data);
  const [assessment] = await db
    .insert(assessmentsTable)
    .values({
      userId: req.userId!,
      age: parsed.data.age,
      biologicalSex: parsed.data.biologicalSex,
      primarySymptoms: parsed.data.primarySymptoms,
      duration: parsed.data.duration,
      severity: parsed.data.severity,
      chronicConditions: parsed.data.chronicConditions ?? null,
      currentMedications: parsed.data.currentMedications ?? null,
      urgencyLevel: analysis.urgencyLevel,
      aiAnalysis: analysis,
    })
    .returning();

  res.status(201).json(CreateAssessmentResponse.parse(assessment));
});

router.get("/assessments/:id", async (req, res): Promise<void> => {
  const params = GetAssessmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [assessment] = await db
    .select()
    .from(assessmentsTable)
    .where(and(eq(assessmentsTable.id, params.data.id), eq(assessmentsTable.userId, req.userId!)))
    .limit(1);

  if (!assessment) {
    res.status(404).json({ error: "Assessment not found" });
    return;
  }
  res.json(GetAssessmentResponse.parse(assessment));
});

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assessmentsTable)
    .where(eq(assessmentsTable.userId, userId));
  const [monthResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assessmentsTable)
    .where(
      and(
        eq(assessmentsTable.userId, userId),
        sql`${assessmentsTable.createdAt} >= date_trunc('month', now())`,
      ),
    );
  const assessments = await db
    .select()
    .from(assessmentsTable)
    .where(eq(assessmentsTable.userId, userId))
    .orderBy(desc(assessmentsTable.createdAt));

  const urgencyCounts: Record<string, number> = {};
  for (const assessment of assessments) {
    urgencyCounts[assessment.urgencyLevel] = (urgencyCounts[assessment.urgencyLevel] ?? 0) + 1;
  }

  const summary = {
    totalAssessments: Number(countResult?.count ?? 0),
    thisMonth: Number(monthResult?.count ?? 0),
    latestAssessment: assessments[0] ?? null,
    urgencyCounts,
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;