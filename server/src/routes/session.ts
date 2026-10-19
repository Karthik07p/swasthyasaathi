import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Session, { Language } from '../models/Session';
import { runTriagePipeline } from '../services/triage';
import { sessionLimiter, messageLimiter } from '../middleware/limits';

const MAX_MESSAGE_CHARS = 1000;

const router = Router();

// ─── Hardcoded welcome messages (no LLM, instant response) ───────────────────

const WELCOME_MESSAGES: Record<Language, string> = {
  en: "Hello! I'm SwasthyaSaathi. Tell me what's troubling you today.",
  hi: 'नमस्ते! मैं स्वास्थ्यसाथी हूँ। बताइए, आज आपको क्या तकलीफ है?',
  mr: 'नमस्कार! मी स्वास्थ्यसाथी आहे. आज तुम्हाला काय त्रास होत आहे?',
};

// ─── POST /api/session ────────────────────────────────────────────────────────

router.post('/', sessionLimiter, async (req: Request, res: Response) => {
  try {
    const language: Language = ['en', 'hi', 'mr'].includes(req.body.language)
      ? (req.body.language as Language)
      : 'en';

    const sessionId = uuidv4();
    const welcomeMessage = WELCOME_MESSAGES[language];

    const session = new Session({
      _id: sessionId,
      language,
      history: [{ role: 'assistant', text: welcomeMessage }],
    });

    await session.save();

    return res.status(201).json({
      session_id: sessionId,
      message: welcomeMessage,
    });
  } catch (err) {
    console.error('[POST /api/session]', err);
    return res.status(500).json({ error: 'Failed to create session.' });
  }
});

// ─── POST /api/session/:id/message ────────────────────────────────────────────

router.post('/:id/message', messageLimiter, async (req: Request, res: Response) => {
  const { id } = req.params;
  const text: string = typeof req.body.text === 'string' ? req.body.text : '';
  const languageOverride: Language | undefined = ['en', 'hi', 'mr'].includes(req.body.language)
    ? (req.body.language as Language)
    : undefined;

  if (!text.trim()) {
    return res.status(400).json({ error: 'Message text is required.' });
  }
  if (text.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_CHARS} characters).` });
  }

  try {
    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Allow language to be updated mid-session
    if (languageOverride && languageOverride !== session.language) {
      session.language = languageOverride;
    }

    // If session is already terminal, return its current state
    if (session.status === 'emergency') {
      return res.json({
        message: '',
        status: session.status,
        result: null,
      });
    }
    if (session.status === 'done') {
      return res.json({
        message: '',
        status: session.status,
        result: session.result,
      });
    }

    // Append user message to history
    session.history.push({ role: 'user', text: text.trim() });

    // Run triage pipeline
    const stepResult = await runTriagePipeline(session, text.trim());

    // Append assistant response to history (unless it's an internal error)
    if (stepResult.type !== 'error') {
      session.history.push({ role: 'assistant', text: stepResult.message });
    }

    await session.save();

    return res.json({
      message: stepResult.message,
      status: session.status,
      result: stepResult.type === 'done' ? stepResult.result : null,
    });
  } catch (err) {
    console.error(`[POST /api/session/${id}/message]`, err);
    return res.status(500).json({ error: 'Something went wrong, please try again.' });
  }
});

// ─── POST /api/session/:id/reset ─────────────────────────────────────────────

router.post('/:id/reset', async (req: Request, res: Response) => {
  try {
    const language: Language = ['en', 'hi', 'mr'].includes(req.body.language)
      ? (req.body.language as Language)
      : 'en';

    const newSessionId = uuidv4();
    const welcomeMessage = WELCOME_MESSAGES[language];

    const session = new Session({
      _id: newSessionId,
      language,
      history: [{ role: 'assistant', text: welcomeMessage }],
    });

    await session.save();

    return res.status(201).json({
      session_id: newSessionId,
      message: welcomeMessage,
    });
  } catch (err) {
    console.error(`[POST /api/session/reset]`, err);
    return res.status(500).json({ error: 'Failed to reset session.' });
  }
});

export default router;
