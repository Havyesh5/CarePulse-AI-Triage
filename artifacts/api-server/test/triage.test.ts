import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  analyzeSymptoms,
  hasEmergencyRedFlag,
  normalizeModelResult,
  type Intake,
} from "../src/lib/triage.ts";

const baseIntake: Intake = {
  age: 42,
  biologicalSex: "unspecified",
  primarySymptoms: "mild headache",
  duration: "one day",
  severity: 3,
};

const emergencyExamples = [
  ["chest pain", "I have sudden chest pain"],
  ["breathing difficulty", "I am having severe difficulty breathing"],
  ["stroke signs", "There is sudden one-sided weakness in my arm"],
  ["severe allergy", "This feels like a severe allergic reaction"],
  ["uncontrolled bleeding", "I have uncontrolled bleeding"],
  ["self-harm language", "I am having thoughts of self-harm"],
] as const;

describe("emergency red-flag interception", () => {
  for (const [category, symptoms] of emergencyExamples) {
    test(`detects ${category}`, () => {
      assert.equal(hasEmergencyRedFlag(symptoms), true);
    });
  }

  test("returns immediate emergency care when Gemini is unavailable", async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const analysis = await analyzeSymptoms({
        ...baseIntake,
        primarySymptoms: "I have chest pain and shortness of breath",
      });

      assert.equal(analysis.urgencyLevel, "EMERGENCY_IMMEDIATE_CARE");
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = originalApiKey;
      }
    }
  });

  test("does not allow a lower-urgency model result to downgrade a red flag", () => {
    const analysis = normalizeModelResult(
      {
        urgency_level: "Self-Care",
        summary: "This appears mild.",
        potential_causes: [],
        recommended_actions: [],
        questions_for_doctor: [],
        red_flag_warnings: [],
      },
      {
        ...baseIntake,
        primarySymptoms: "sudden facial droop and trouble speaking",
      },
    );

    assert.equal(analysis.urgencyLevel, "EMERGENCY_IMMEDIATE_CARE");
  });
});