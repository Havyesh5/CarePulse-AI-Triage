import { GoogleGenAI } from "@google/genai";

export const MEDICAL_DISCLAIMER =
  "This tool is for informational purposes only and does not substitute professional medical advice, diagnosis, or treatment.";

export type UrgencyLevel =
  | "Self-Care"
  | "Routine Consultation"
  | "Urgent Care"
  | "EMERGENCY_IMMEDIATE_CARE";

export type TriageAnalysis = {
  urgencyLevel: UrgencyLevel;
  disclaimer: string;
  summary: string;
  potentialCauses: Array<{
    name: string;
    likelihood: "Low" | "Moderate" | "High";
    description: string;
  }>;
  recommendedActions: string[];
  questionsForDoctor: string[];
  redFlagWarnings: string[];
};

export type Intake = {
  age: number;
  biologicalSex: string;
  primarySymptoms: string;
  duration: string;
  severity: number;
  chronicConditions?: string;
  currentMedications?: string;
};

const emergencyPatterns = [
  /\bcrushing\s+chest\s+pain\b/i,
  /\bchest\s+pain\b/i,
  /\b(severe\s+)?difficulty\s+breathing\b/i,
  /\bshortness\s+of\s+breath\b/i,
  /\b(can't|cannot|unable\s+to)\s+breathe\b/i,
  /\bsudden\s+(numbness|weakness)\b/i,
  /\bone[-\s]sided\s+(numbness|weakness)\b/i,
  /\b(facial\s+droop|slurred\s+speech|trouble\s+speaking)\b/i,
  /\bseizure\b/i,
  /\bunconscious\b/i,
  /\bfainted\b/i,
  /\buncontrolled\s+bleeding\b/i,
  /\bsevere\s+allergic\s+reaction\b/i,
  /\bthoughts?\s+of\s+(suicide|self[-\s]?harm)\b/i,
];

export function hasEmergencyRedFlag(text: string): boolean {
  return emergencyPatterns.some((pattern) => pattern.test(text));
}

function emergencyAnalysis(): TriageAnalysis {
  return {
    urgencyLevel: "EMERGENCY_IMMEDIATE_CARE",
    disclaimer: MEDICAL_DISCLAIMER,
    summary:
      "The symptoms described may signal a medical emergency. Do not wait for an online assessment to confirm what is happening.",
    potentialCauses: [
      {
        name: "A serious condition requiring immediate evaluation",
        likelihood: "Moderate",
        description:
          "Several emergency warning signs can have different causes that require in-person assessment and urgent treatment.",
      },
    ],
    recommendedActions: [
      "Call your local emergency number now or have someone take you to the nearest emergency department.",
      "Do not drive yourself if you feel faint, confused, weak, or short of breath.",
      "If you are with someone who is unresponsive or not breathing normally, call emergency services and follow the dispatcher's instructions.",
    ],
    questionsForDoctor: [
      "When did these symptoms begin, and did they start suddenly?",
      "What changed before the symptoms started or became worse?",
    ],
    redFlagWarnings: [
      "Worsening symptoms, fainting, confusion, blue or gray lips, or inability to stay awake are emergencies.",
      "Do not delay emergency care while waiting for an online result.",
    ],
  };
}

function fallbackAnalysis(intake: Intake): TriageAnalysis {
  const urgent = intake.severity >= 8;
  return {
    urgencyLevel: urgent ? "Urgent Care" : "Routine Consultation",
    disclaimer: MEDICAL_DISCLAIMER,
    summary: urgent
      ? "The reported symptoms are severe enough to warrant prompt in-person medical evaluation."
      : "The reported symptoms should be reviewed in context, including their duration, severity, and any health conditions or medicines.",
    potentialCauses: [
      {
        name: "Several conditions can cause similar symptoms",
        likelihood: "Moderate",
        description:
          "Symptoms often overlap across different conditions, so an in-person clinician is needed to determine the cause.",
      },
    ],
    recommendedActions: urgent
      ? [
          "Contact an urgent care clinic or clinician today.",
          "Bring a list of current medicines and relevant medical history.",
          "Seek emergency care if any red-flag warning appears or symptoms rapidly worsen.",
        ]
      : [
          "Track when symptoms appear, what makes them better or worse, and any new symptoms.",
          "Arrange a routine appointment if symptoms persist, recur, or interfere with daily activities.",
          "Use only treatments previously recommended for you by a qualified healthcare professional.",
        ],
    questionsForDoctor: [
      "What additional information or examination would help clarify the cause?",
      "Which changes should prompt me to seek urgent or emergency care?",
    ],
    redFlagWarnings: [
      "Seek immediate care for chest pain, trouble breathing, sudden weakness or numbness, confusion, fainting, or uncontrolled bleeding.",
    ],
  };
}

function normalizeModelResult(raw: unknown, intake: Intake): TriageAnalysis {
  if (!raw || typeof raw !== "object") {
    return fallbackAnalysis(intake);
  }

  const value = raw as Record<string, unknown>;
  const urgency = value.urgency_level ?? value.urgencyLevel;
  const allowedUrgencies: UrgencyLevel[] = [
    "Self-Care",
    "Routine Consultation",
    "Urgent Care",
    "EMERGENCY_IMMEDIATE_CARE",
  ];
  const urgencyLevel = allowedUrgencies.includes(urgency as UrgencyLevel)
    ? (urgency as UrgencyLevel)
    : fallbackAnalysis(intake).urgencyLevel;

  const causes = value.potential_causes ?? value.potentialCauses;
  const actions = value.recommended_actions ?? value.recommendedActions;
  const questions = value.questions_for_doctor ?? value.questionsForDoctor;
  const warnings = value.red_flag_warnings ?? value.redFlagWarnings;

  const normalized: TriageAnalysis = {
    urgencyLevel,
    disclaimer: MEDICAL_DISCLAIMER,
    summary: typeof value.summary === "string" ? value.summary : fallbackAnalysis(intake).summary,
    potentialCauses: Array.isArray(causes)
      ? causes
          .filter((cause): cause is Record<string, unknown> => Boolean(cause && typeof cause === "object"))
          .slice(0, 5)
          .map((cause) => ({
            name: typeof cause.name === "string" ? cause.name : "Possible condition to discuss",
            likelihood:
              cause.likelihood === "High" || cause.likelihood === "Moderate"
                ? cause.likelihood
                : "Low",
            description:
              typeof cause.description === "string"
                ? cause.description
                : "A clinician can assess whether this possibility fits your full history.",
          }))
      : [],
    recommendedActions: Array.isArray(actions)
      ? actions.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [],
    questionsForDoctor: Array.isArray(questions)
      ? questions.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [],
    redFlagWarnings: Array.isArray(warnings)
      ? warnings.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [],
  };

  const fallback = fallbackAnalysis(intake);
  if (normalized.potentialCauses.length === 0) normalized.potentialCauses = fallback.potentialCauses;
  if (normalized.recommendedActions.length === 0) normalized.recommendedActions = fallback.recommendedActions;
  if (normalized.questionsForDoctor.length === 0) normalized.questionsForDoctor = fallback.questionsForDoctor;
  if (normalized.redFlagWarnings.length === 0) normalized.redFlagWarnings = fallback.redFlagWarnings;
  if (hasEmergencyRedFlag(intake.primarySymptoms)) {
    return emergencyAnalysis();
  }
  if (intake.severity >= 9 && normalized.urgencyLevel === "Self-Care") {
    normalized.urgencyLevel = "Urgent Care";
  }
  return normalized;
}

export async function analyzeSymptoms(intake: Intake): Promise<TriageAnalysis> {
  if (hasEmergencyRedFlag(intake.primarySymptoms)) {
    return emergencyAnalysis();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackAnalysis(intake);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Analyze the following symptom intake for safe, non-diagnostic triage guidance.

Rules:
- Never make a definitive diagnosis or prescribe medication.
- Use wording such as "possible conditions to discuss with a healthcare professional".
- Return only valid JSON with exactly these snake_case keys: urgency_level, disclaimer, summary, potential_causes, recommended_actions, questions_for_doctor, red_flag_warnings.
- urgency_level must be exactly one of: Self-Care, Routine Consultation, Urgent Care, EMERGENCY_IMMEDIATE_CARE.
- If any life-threatening risk appears, use EMERGENCY_IMMEDIATE_CARE and advise emergency services immediately.
- The disclaimer must be exactly: ${MEDICAL_DISCLAIMER}
- Keep the response concise and practical.

Intake:
Age: ${intake.age}
Biological sex: ${intake.biologicalSex}
Symptoms: ${intake.primarySymptoms}
Duration: ${intake.duration}
Severity (1-10): ${intake.severity}
Chronic conditions: ${intake.chronicConditions || "None reported"}
Current medications: ${intake.currentMedications || "None reported"}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });
    const rawText = response.text?.trim();
    if (!rawText) return fallbackAnalysis(intake);
    return normalizeModelResult(JSON.parse(rawText), intake);
  } catch {
    return fallbackAnalysis(intake);
  }
}