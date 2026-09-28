const symptomTerms =
  /\b(pain|ache|headache|migraine|fatigue|tired|dizzy|dizziness|nausea|vomit|diarrhea|fever|cough|throat|breath|breathing|numb|tingling|weakness|rash|itch|swelling|bleeding|pressure|congestion|runny nose|chills|cramp|abdominal|stomach|back|joint|muscle|palpitation|heartburn|vision|faint|seizure|sleep|insomnia|anxiety)\b/i;
const placeholderSymptoms =
  /^(nothing|none|n\/a|na|nil|no symptoms?|not applicable|no issues?|no problems?|fine|okay|ok|test)[\s.!?]*$/i;
const durationNumber =
  /\b(\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(days?|weeks?|months?|years?)\b/i;
const numberWords: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

export const SYMPTOM_DESCRIPTION_ERROR =
  'Please describe specific physical symptoms or sensations you are experiencing.';
export const DURATION_VALIDATION_ERROR =
  'Enter a realistic duration between 1 and 365 days (maximum 52 weeks).';

export function getSymptomDescriptionError(value: string): string | undefined {
  const text = value.trim();
  if (text.length < 3 || placeholderSymptoms.test(text)) return SYMPTOM_DESCRIPTION_ERROR;

  const words = text.match(/[A-Za-z]{2,}/g) ?? [];
  const repeatedCharacters = /(.)\1{4,}/i.test(text);
  if (!words.length || repeatedCharacters || !symptomTerms.test(text)) {
    return SYMPTOM_DESCRIPTION_ERROR;
  }

  return undefined;
}

export function getDurationValidationError(value: string): string | undefined {
  const text = value.trim();
  if (!text) return DURATION_VALIDATION_ERROR;

  const bareNumber = /^\d+(?:\.\d+)?$/.exec(text);
  const match = durationNumber.exec(text);
  if (bareNumber) {
    const days = Number(bareNumber[0]);
    return days >= 1 && days <= 365 ? undefined : DURATION_VALIDATION_ERROR;
  }

  if (match) {
    const amount = Number(match[1]) || numberWords[match[1].toLowerCase()];
    const unit = match[2].toLowerCase();
    const days =
      unit.startsWith('week') ? amount * 7 :
      unit.startsWith('month') ? amount * (365 / 12) :
      unit.startsWith('year') ? amount * 365 :
      amount;
    const withinUnitLimit =
      unit.startsWith('week') ? amount <= 52 :
      unit.startsWith('year') ? amount <= 1 :
      true;

    return amount >= 1 && withinUnitLimit && days <= 365
      ? undefined
      : DURATION_VALIDATION_ERROR;
  }

  if (/\b\d+(?:\.\d+)?\b/.test(text) || /\b(?:months?|years?)\b/i.test(text)) {
    return DURATION_VALIDATION_ERROR;
  }

  return undefined;
}