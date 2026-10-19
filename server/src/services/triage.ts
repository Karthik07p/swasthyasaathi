import { ISession, Language } from '../models/Session';
import { checkRedFlag, EMERGENCY_MESSAGES } from './redFlag';
import { callGemini } from './gemini';
import { DailyCapError } from '../middleware/limits';

const BUSY_MESSAGES: Record<Language, string> = {
  en: 'SwasthyaSaathi is very busy today. Please try again tomorrow.',
  hi: 'स्वास्थ्यसाथी आज बहुत व्यस्त है। कृपया कल फिर कोशिश करें।',
  mr: 'स्वास्थ्यसाथी आज खूप व्यस्त आहे. कृपया उद्या पुन्हा प्रयत्न करा.',
};

export type TriageStepResult =
  | { type: 'emergency'; message: string }
  | { type: 'question'; message: string }
  | { type: 'done'; message: string; result: ISession['result'] }
  | { type: 'error'; message: string };

const ERROR_MESSAGES: Record<Language, string> = {
  en: 'Something went wrong, please try again.',
  hi: 'कुछ गलत हो गया, कृपया फिर से कोशिश करें।',
  mr: 'काहीतरी चूक झाली, कृपया पुन्हा प्रयत्न करा.',
};

/**
 * Main triage pipeline:
 * 1. Red-flag gate (pure regex, no LLM)
 * 2. Gemini LLM call (if no red flag)
 * 3. Parse response, update session state
 */
export async function runTriagePipeline(
  session: ISession,
  userMessage: string
): Promise<TriageStepResult> {
  const lang = session.language;

  // ── 1. Red-flag gate ──────────────────────────────────────────────────────
  const previousUserText = session.history
    .filter((h) => h.role === 'user')
    .map((h) => h.text)
    .join(' ');

  if (checkRedFlag(userMessage, previousUserText)) {
    session.status = 'emergency';
    return { type: 'emergency', message: EMERGENCY_MESSAGES[lang] };
  }

  // ── 2. LLM call ───────────────────────────────────────────────────────────
  try {
    let geminiResponse = await callGemini(
      session.history,
      userMessage,
      session.slots,
      session.candidates,
      session.asked_count,
      lang,
      false
    );

    // If model returns ASK when we've already asked 4 questions → force answer
    if (geminiResponse.action === 'ASK' && session.asked_count >= 4) {
      geminiResponse = await callGemini(
        session.history,
        userMessage,
        session.slots,
        session.candidates,
        session.asked_count,
        lang,
        true // forceAnswer
      );
    }

    // ── 3. Update session state from response ────────────────────────────────
    if (geminiResponse.slots && typeof geminiResponse.slots === 'object') {
      session.slots = { ...session.slots, ...geminiResponse.slots };
    }
    if (geminiResponse.candidates && typeof geminiResponse.candidates === 'object') {
      session.candidates = geminiResponse.candidates;
    }

    if (geminiResponse.action === 'ASK') {
      const question = geminiResponse.question ?? 'Could you tell me more?';
      session.asked_count += 1;
      return { type: 'question', message: question };
    }

    // ANSWER
    if (geminiResponse.action === 'ANSWER') {
      const urgencyValues = ['routine', 'soon', 'urgent'];
      const urgency = urgencyValues.includes(geminiResponse.urgency ?? '')
        ? (geminiResponse.urgency as 'routine' | 'soon' | 'urgent')
        : 'routine';

      session.result = {
        specialty: geminiResponse.specialty ?? 'General Medicine',
        urgency,
        confidence: typeof geminiResponse.confidence === 'number' ? geminiResponse.confidence : 0.7,
        why_plain: geminiResponse.why_plain ?? '',
      };
      session.status = 'done';

      return {
        type: 'done',
        message: geminiResponse.why_plain ?? '',
        result: session.result,
      };
    }

    // Unexpected action value
    return { type: 'error', message: ERROR_MESSAGES[lang] };
  } catch (err) {
    if (err instanceof DailyCapError) {
      console.warn('[triage] Daily Gemini cap reached');
      return { type: 'error', message: BUSY_MESSAGES[lang] };
    }
    console.error('[triage] LLM error:', err);
    return { type: 'error', message: ERROR_MESSAGES[lang] };
  }
}
