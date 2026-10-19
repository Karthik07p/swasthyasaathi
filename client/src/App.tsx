import React, { useEffect } from 'react';
import { useSession } from './hooks/useSession';
import LanguageToggle from './components/LanguageToggle';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import ResultCard from './components/ResultCard';
import EmergencyBanner from './components/EmergencyBanner';
import { Language } from './types';

export default function App() {
  const {
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
  } = useSession();

  // Start a session automatically on first mount
  useEffect(() => {
    startSession('en');
  }, []);

  const handleLanguageChange = (lang: Language) => {
    if (lang === language) return;
    // Before the first user message, restart so the welcome message matches the language
    if (!messages.some((m) => m.role === 'user')) {
      startSession(lang);
    } else {
      setLanguage(lang);
    }
  };

  const handleNewConsultation = () => {
    startNewConsultation(language);
  };

  const isTerminal = status === 'done' || status === 'emergency';

  return (
    <div className="app-shell">
      <div className="app-container">
        {/* ── Header ── */}
        <header className="app-header">
          <div className="app-header-brand">
            <div className="app-header-logo" aria-hidden="true">🩺</div>
            <div className="app-header-title">
              <span className="app-header-name">SwasthyaSaathi</span>
              <span className="app-header-tagline">
                {language === 'hi'
                  ? 'आपका स्वास्थ्य सहायक'
                  : language === 'mr'
                  ? 'तुमचा आरोग्य साथीदार'
                  : 'Your Health Companion'}
              </span>
            </div>
          </div>
          <LanguageToggle
            current={language}
            onChange={handleLanguageChange}
            disabled={isLoading}
          />
        </header>

        {/* ── Chat Area ── */}
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          language={language}
        />

        {/* ── Emergency inline message appears in chat flow (from message history);
             the banner below replaces the input ── */}

        {/* ── Bottom bar: conditional on session status ── */}
        {status === 'done' && result ? (
          <ResultCard
            result={result}
            language={language}
            sessionId={sessionId}
            onNewConsultation={handleNewConsultation}
          />
        ) : status === 'emergency' ? (
          <EmergencyBanner
            language={language}
            onNewConsultation={handleNewConsultation}
          />
        ) : (
          <InputBar
            onSend={sendMessage}
            disabled={isLoading || isTerminal}
            language={language}
          />
        )}
      </div>
    </div>
  );
}
