import { Language } from '../models/Session';

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
};

export function buildSystemPrompt(
  slots: Record<string, unknown>,
  candidates: Record<string, number>,
  askedCount: number,
  language: Language
): string {
  const langLabel = LANGUAGE_LABELS[language];
  const slotsJson = JSON.stringify(slots, null, 2);
  const candidatesJson = JSON.stringify(candidates, null, 2);

  return `You route patients. You never diagnose.

State:      ${slotsJson}
Candidates: ${candidatesJson}
Asked:      ${askedCount} of 4

Choose ONE action:
 ASK    — only if one question would change which specialty ranks first.
 ANSWER — if top score > 0.75 or 4 questions have been asked.

If ASK: return JSON exactly matching this shape:
{"action":"ASK","question":"...","slots":{},"candidates":{}}
  - question must be ≤ 12 words, in plain ${langLabel}, no medical jargon.
  - Never ask about something State already contains.

If ANSWER: return JSON exactly matching this shape:
{"action":"ANSWER","specialty":"...","urgency":"routine|soon|urgent","confidence":0.0,"why_plain":"...","slots":{},"candidates":{}}
  - urgency must be exactly one of: routine, soon, urgent
  - confidence must be a number between 0 and 1
  - why_plain must be in ${langLabel}, plain non-technical language, ≤ 2 sentences.

Return ONLY valid JSON. No markdown, no explanation, no other text.`;
}

export function buildForceAnswerPrompt(
  slots: Record<string, unknown>,
  candidates: Record<string, number>,
  language: Language
): string {
  const langLabel = LANGUAGE_LABELS[language];
  const slotsJson = JSON.stringify(slots, null, 2);
  const candidatesJson = JSON.stringify(candidates, null, 2);

  return `You route patients. You never diagnose. 4 questions have been asked — you MUST now give a final answer.

State:      ${slotsJson}
Candidates: ${candidatesJson}

Return JSON exactly matching this shape:
{"action":"ANSWER","specialty":"...","urgency":"routine|soon|urgent","confidence":0.0,"why_plain":"...","slots":{},"candidates":{}}
  - urgency must be exactly one of: routine, soon, urgent
  - confidence must be a number between 0 and 1
  - why_plain must be in ${langLabel}, plain non-technical language, ≤ 2 sentences.

Return ONLY valid JSON. No markdown, no explanation, no other text.`;
}
