import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { Language, HistoryEntry } from '../models/Session';
import { buildSystemPrompt, buildForceAnswerPrompt } from '../utils/prompts';
import { consumeGeminiCall } from '../middleware/limits';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

export interface GeminiResponse {
  action: 'ASK' | 'ANSWER';
  question?: string;
  specialty?: string;
  urgency?: 'routine' | 'soon' | 'urgent';
  confidence?: number;
  why_plain?: string;
  slots: Record<string, unknown>;
  candidates: Record<string, number>;
}

/**
 * Convert our internal history format to Gemini's expected format.
 * Gemini uses 'user' and 'model' roles (not 'assistant').
 *
 * Rules enforced here:
 * 1. History passed to startChat must NOT include the very last user message
 *    (that gets sent via chat.sendMessage()).
 * 2. History MUST start with a 'user' turn — strip any leading assistant turns.
 * 3. Turns must strictly alternate user/model — collapse consecutive same-role
 *    turns by merging their text (edge case, but safe).
 */
function toGeminiHistory(history: HistoryEntry[]): Array<{
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}> {
  // Map to Gemini roles first
  const mapped = history.map((entry) => ({
    role: (entry.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
    parts: [{ text: entry.text }],
  }));

  // Drop leading model turns (welcome message has no preceding user turn)
  let start = 0;
  while (start < mapped.length && mapped[start].role !== 'user') {
    start++;
  }
  const trimmed = mapped.slice(start);

  // Merge consecutive same-role turns (safety net)
  const result: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const turn of trimmed) {
    if (result.length > 0 && result[result.length - 1].role === turn.role) {
      result[result.length - 1].parts.push(...turn.parts);
    } else {
      result.push({ role: turn.role, parts: [...turn.parts] });
    }
  }
  return result;
}

/**
 * Call Gemini for a triage turn (model set via GEMINI_MODEL, default gemini-3.5-flash).
 * Returns parsed JSON response or throws on unrecoverable failure.
 */
export async function callGemini(
  history: HistoryEntry[],
  currentUserMessage: string,
  slots: Record<string, unknown>,
  candidates: Record<string, number>,
  askedCount: number,
  language: Language,
  forceAnswer = false
): Promise<GeminiResponse> {
  // Throws DailyCapError once today's call budget is used up (see middleware/limits.ts)
  consumeGeminiCall();

  const systemInstruction = forceAnswer
    ? buildForceAnswerPrompt(slots, candidates, language)
    : buildSystemPrompt(slots, candidates, askedCount, language);

  // The route appends the current user message to session.history before calling us,
  // so `history` already contains it as the last entry. We must exclude it from
  // startChat (it's sent separately via sendMessage) to avoid duplication.
  const historyForChat = toGeminiHistory(history.slice(0, -1));

  // Try the primary model, retry once on a transient error, then fall back
  const primary = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-flash-lite-latest,gemini-3.1-flash-lite')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const attempts = [primary, primary, ...fallbacks];

  let text = '';
  let lastErr: unknown;
  for (let i = 0; i < attempts.length; i++) {
    try {
      const model = genai.getGenerativeModel({
        model: attempts[i],
        systemInstruction,
        generationConfig: {
          responseMimeType: 'application/json',
        },
        safetySettings: SAFETY_SETTINGS,
      });
      const chat = model.startChat({ history: historyForChat });
      const result = await chat.sendMessage(currentUserMessage);
      text = result.response.text();
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      const transient = status === 503 || status === 429 || status === 500 || status === 404;
      if (!transient) throw err;
      console.warn(`[gemini] ${attempts[i]} failed (${status}), attempt ${i + 1}/${attempts.length}`);
      if (i === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (lastErr) throw lastErr;

  let parsed: GeminiResponse;
  try {
    parsed = JSON.parse(text) as GeminiResponse;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
  }

  // Validate required fields
  if (!parsed.action || !['ASK', 'ANSWER'].includes(parsed.action)) {
    throw new Error(`Gemini response missing valid 'action' field: ${text.slice(0, 200)}`);
  }

  return parsed;
}
