import React, { useState } from 'react';
import { TriageResult, Language, Provider } from '../types';
import ProviderList from './ProviderList';
import BookingPanel from './BookingPanel';

interface ResultCardProps {
  result: TriageResult;
  language: Language;
  sessionId: string | null;
  onNewConsultation: () => void;
}

const URGENCY_LABEL: Record<string, Record<Language, string>> = {
  routine: { en: 'Routine', hi: 'सामान्य', mr: 'सामान्य' },
  soon: { en: 'See Soon', hi: 'जल्दी दिखाएं', mr: 'लवकर दाखवा' },
  urgent: { en: 'Urgent', hi: 'तत्काल', mr: 'तातडीचे' },
};

const SPECIALTY_LABEL: Record<Language, string> = {
  en: 'Recommended Specialist',
  hi: 'अनुशंसित विशेषज्ञ',
  mr: 'शिफारस केलेले तज्ज्ञ',
};

const WHY_LABEL: Record<Language, string> = {
  en: 'Why this recommendation',
  hi: 'यह सिफारिश क्यों',
  mr: 'ही शिफारस का',
};

const CONFIDENCE_LABEL: Record<Language, string> = {
  en: 'Confidence',
  hi: 'विश्वास',
  mr: 'विश्वास',
};

const NEW_CONSULTATION_LABELS: Record<Language, string> = {
  en: 'Start new consultation',
  hi: 'नई परामर्श शुरू करें',
  mr: 'नवीन सल्लामसलत सुरू करा',
};

export default function ResultCard({ result, language, sessionId, onNewConsultation }: ResultCardProps) {
  const { specialty, urgency, confidence, why_plain } = result;
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null);
  const urgencyLabel = URGENCY_LABEL[urgency]?.[language] ?? urgency;
  const confidencePct = Math.round(confidence * 100);

  return (
    <>
      <div className="result-card-wrap">
        {bookingProvider && (
          <div className="result-card" role="region" aria-label="Booking">
            <BookingPanel
              key={bookingProvider.id}
              provider={bookingProvider}
              sessionId={sessionId}
              language={language}
              onBack={() => setBookingProvider(null)}
            />
          </div>
        )}
        {/* Kept mounted (just hidden) so the chosen city/location survives going back */}
        <div className="result-card" role="region" aria-label="Triage result" hidden={bookingProvider !== null}>
          <div className="result-card-header">
            <div>
              <div className="result-specialty-label">{SPECIALTY_LABEL[language]}</div>
              <div className="result-specialty-name">{specialty}</div>
            </div>
            <span className={`urgency-badge urgency-badge--${urgency}`}>{urgencyLabel}</span>
          </div>

          <div className="result-divider" />

          <div className="result-why-label">{WHY_LABEL[language]}</div>
          <div className="result-why-text">{why_plain}</div>

          <div className="result-confidence-bar">
            <div className="result-confidence-label">
              {CONFIDENCE_LABEL[language]}: {confidencePct}%
            </div>
            <div className="confidence-track" role="progressbar" aria-valuenow={confidencePct} aria-valuemin={0} aria-valuemax={100}>
              <div className="confidence-fill" style={{ width: `${confidencePct}%` }} />
            </div>
          </div>

          <div className="result-divider" />
          <ProviderList specialty={specialty} language={language} onBook={setBookingProvider} />
        </div>
      </div>

      <div className="bottom-action-bar">
        <button
          id="new-consultation-done-btn"
          className="new-consultation-btn"
          onClick={onNewConsultation}
        >
          {NEW_CONSULTATION_LABELS[language]}
        </button>
      </div>
    </>
  );
}
