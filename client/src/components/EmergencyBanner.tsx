import React from 'react';
import { Language } from '../types';

interface EmergencyBannerProps {
  language: Language;
  onNewConsultation: () => void;
}

const NEW_CONSULTATION_LABELS: Record<Language, string> = {
  en: 'Start new consultation',
  hi: 'नई परामर्श शुरू करें',
  mr: 'नवीन सल्लामसलत सुरू करा',
};

export default function EmergencyBanner({ language, onNewConsultation }: EmergencyBannerProps) {
  return (
    <div className="bottom-action-bar">
      <button
        id="new-consultation-emergency-btn"
        className="new-consultation-btn"
        onClick={onNewConsultation}
        style={{ background: '#DC2626' }}
      >
        {NEW_CONSULTATION_LABELS[language]}
      </button>
    </div>
  );
}
