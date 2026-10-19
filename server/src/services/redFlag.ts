/**
 * Red-flag gate — pure keyword/regex matching, no LLM call.
 * Checks combined text of the current message + all previous user turns.
 * Must run in < 200ms.
 */

import { Language } from '../models/Session';

// ─── Multilingual keyword sets ────────────────────────────────────────────────

// Each array entry is a RegExp source string (case-insensitive)
const CHEST_PAIN_PATTERNS = [
  'chest.?pain',
  'chest.?tight',
  'chest.?pressure',
  'सीने.?में.?दर्द',
  'सीने.?दर्द',
  'छाती.?में.?दर्द',
  'छातीत.?दुखण',
  'chest.?mein.?dard',
  'chati.?dukh',
];

const SEIZURE_PATTERNS = [
  'seizure',
  'convuls',
  'fit\\b',
  'फिट',
  'दौरा',
  'झटके',
  'झटका',
  'फेफरे',
  'ghabra',
  'daura',
  'jhatke',
  'epilep',
  'मूर्च्छा',
];

const BLUE_LIPS_PATTERNS = [
  'blue.?lip',
  'blue.?skin',
  'cyanosis',
  'सियानोसिस',
  'निळे.?ओठ',
  'नीले.?होंठ',
  'nile.?hoth',
  'nile.?lips',
];

const BLEEDING_PATTERNS = [
  'heavy.?bleed',
  'uncontrolled.?bleed',
  'excessive.?bleed',
  'spurting.?blood',
  'अनियंत्रित.?रक्तस्राव',
  'जोरात.?रक्त',
  'बहुत.?खून',
  'bahut.?khoon',
  'jyadah.?khoon',
  'bleeding.?nahi.?ruk',
  'रक्त.?थांबत.?नाही',
];

const BREATHING_PATTERNS = [
  'difficulty.?(in.?)?breath',
  'trouble.?breath',
  'short(ness)?.?of.?breath',
  'hard.?to.?breath',
  'struggling.?to.?breath',
  'can.?t.?breath',
  'सांस.?फूल',
  'सांस.?लेने.?में.?दिक्कत',
  'दम.?घुट',
  'धाप.?लागत',
  'दम.?लागत',
  'saans.?phool',
  'dam.?ghut',
  'cannot.?breath',
  'gasping',
  'breathless',
  'not.?breathing',
  'सांस.?नहीं',
  'सांस.?लेने.?में.?तकलीफ',
  'श्वास.?घेणे.?कठीण',
  'सास.?नहीं',
  'sans.?nahi',
  'saans.?nahi',
  'breathless',
  'shwaas.?ghet',
];

const UNCONSCIOUS_PATTERNS = [
  'unconscious',
  'unresponsive',
  'fainted',
  'passed.?out',
  'not.?waking',
  'won.?t.?wake',
  'बेहोश',
  'बेहोशी',
  'शुद्ध.?नाही',
  'होश.?नहीं',
  'hosh.?nahi',
  'behosh',
  'shudh.?nahi',
];

// ─── Compile all patterns once at startup ─────────────────────────────────────

function compilePatterns(patterns: string[]): RegExp[] {
  return patterns.map((p) => new RegExp(p, 'i'));
}

const COMPILED = {
  chestPain: compilePatterns(CHEST_PAIN_PATTERNS),
  seizure: compilePatterns(SEIZURE_PATTERNS),
  blueLips: compilePatterns(BLUE_LIPS_PATTERNS),
  bleeding: compilePatterns(BLEEDING_PATTERNS),
  breathing: compilePatterns(BREATHING_PATTERNS),
  unconscious: compilePatterns(UNCONSCIOUS_PATTERNS),
};

// ─── Matching helpers ─────────────────────────────────────────────────────────

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

// ─── Emergency messages (hardcoded, no LLM) ──────────────────────────────────

export const EMERGENCY_MESSAGES: Record<Language, string> = {
  en: 'This may be a medical emergency. Please call 112 or go to the nearest hospital right now.',
  hi: 'यह एक चिकित्सा आपातकाल हो सकता है। कृपया अभी 112 पर कॉल करें या नजदीकी अस्पताल जाएं।',
  mr: 'हे वैद्यकीय आणीबाणी असू शकते. कृपया आत्ताच 112 वर कॉल करा किंवा जवळच्या रुग्णालयात जा.',
};

// ─── Main gate function ───────────────────────────────────────────────────────

/**
 * Check whether the combined conversation text triggers a red-flag condition.
 * @param currentMessage   The latest user message
 * @param previousUserText All text from prior user turns concatenated
 * @returns true if a red flag is detected
 */
export function checkRedFlag(currentMessage: string, previousUserText: string): boolean {
  const combined = `${previousUserText} ${currentMessage}`;

  // Chest pain on its own is a red flag (sweating no longer required)
  if (matchesAny(combined, COMPILED.chestPain)) return true;

  // Other red-flag conditions
  if (matchesAny(combined, COMPILED.seizure)) return true;
  if (matchesAny(combined, COMPILED.blueLips)) return true;
  if (matchesAny(combined, COMPILED.bleeding)) return true;
  if (matchesAny(combined, COMPILED.breathing)) return true;
  if (matchesAny(combined, COMPILED.unconscious)) return true;

  return false;
}
