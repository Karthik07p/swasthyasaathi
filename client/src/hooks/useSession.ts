import { useState, useCallback, useRef } from 'react';
import { Language, ChatMessage, SessionStatus, TriageResult } from '../types';
import { v4 as uuidv4 } from './uuid';
import { apiUrl } from '../api';

const API_TIMEOUT_MS = 30_000;

const ERROR_MESSAGES: Record<Language, string> = {
  en: 'Something went wrong, please try again.',
  hi: 'कुछ गलत हो गया, कृपया फिर से कोशिश करें।',
  mr: 'काहीतरी चूक झाली, कृपया पुन्हा प्रयत्न करा.',
};

async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function makeMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return { id: uuidv4(), role, text, timestamp: new Date() };
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<SessionStatus>('active');
  const [result, setResult] = useState<TriageResult | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  // Incremented on every startSession so late responses from superseded calls
  // (e.g. StrictMode's double-mounted effect) are ignored
  const startRequestRef = useRef(0);

  // Keep ref in sync so async callbacks always have the latest session id
  const updateSessionId = (id: string | null) => {
    setSessionId(id);
    sessionIdRef.current = id;
  };

  const addMessage = (role: ChatMessage['role'], text: string) => {
    setMessages((prev) => [...prev, makeMessage(role, text)]);
  };

  const showError = useCallback(
    (lang: Language) => {
      addMessage('assistant', ERROR_MESSAGES[lang]);
    },
    []
  );

  // ── Start a fresh session ─────────────────────────────────────────────────
  const startSession = useCallback(async (lang: Language = 'en') => {
    const requestId = ++startRequestRef.current;
    setIsLoading(true);
    setMessages([]);
    setStatus('active');
    setResult(null);
    setLanguageState(lang);
    updateSessionId(null);

    try {
      const res = await fetchWithTimeout(
        apiUrl('/api/session'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang }),
        },
        API_TIMEOUT_MS
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { session_id: string; message: string };
      if (requestId !== startRequestRef.current) return;
      updateSessionId(data.session_id);
      addMessage('assistant', data.message);
    } catch {
      if (requestId !== startRequestRef.current) return;
      addMessage('assistant', ERROR_MESSAGES[lang]);
    } finally {
      if (requestId === startRequestRef.current) setIsLoading(false);
    }
  }, []);

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId || isLoading || !text.trim()) return;

      addMessage('user', text.trim());
      setIsLoading(true);

      try {
        const res = await fetchWithTimeout(
          apiUrl(`/api/session/${currentSessionId}/message`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.trim(), language }),
          },
          API_TIMEOUT_MS
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as {
          message: string;
          status: SessionStatus;
          result: TriageResult | null;
        };

        if (data.message) {
          addMessage('assistant', data.message);
        }
        setStatus(data.status);
        if (data.result) {
          setResult(data.result);
        }
      } catch {
        showError(language);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, language, showError]
  );

  // ── Switch language (updates future requests) ─────────────────────────────
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  // ── Start new consultation ────────────────────────────────────────────────
  const startNewConsultation = useCallback(
    async (lang?: Language) => {
      const targetLang = lang ?? language;
      await startSession(targetLang);
    },
    [language, startSession]
  );

  return {
    sessionId,
    messages,
    status,
    result,
    language,
    isLoading,
    startSession,
    sendMessage,
    setLanguage,
    startNewConsultation,
  };
}
