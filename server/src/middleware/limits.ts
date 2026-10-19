import rateLimit from 'express-rate-limit';

// Abuse protection for a public demo API. All limits are per client IP and can be
// tuned with environment variables. The server runs behind Render's proxy, so
// index.ts sets `trust proxy` for the real client IP to be used.

const num = (name: string, fallback: number): number => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

const tooMany = { error: 'Too many requests. Please wait a while and try again.' };

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany,
};

/** Every /api request */
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: num('RATE_API_MAX', 300),
});

/** Starting a new consultation */
export const sessionLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: num('RATE_SESSION_MAX', 20),
});

/** Chat messages (each one can trigger a Gemini call) */
export const messageLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000,
  limit: num('RATE_MESSAGE_MAX', 40),
});

/** Creating bookings */
export const bookingLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: num('RATE_BOOKING_MAX', 10),
});

// ─── Daily cap on Gemini calls (protects the free-tier quota) ────────────────

export class DailyCapError extends Error {
  constructor() {
    super('Daily Gemini call cap reached');
    this.name = 'DailyCapError';
  }
}

let capDay = '';
let capCount = 0;

/** Counts one Gemini call; throws DailyCapError once today's cap is used up.
 *  In-memory, so it resets when the server restarts (best effort). */
export function consumeGeminiCall(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== capDay) {
    capDay = today;
    capCount = 0;
  }
  if (capCount >= num('GEMINI_DAILY_CAP', 800)) throw new DailyCapError();
  capCount += 1;
}
