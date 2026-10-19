import React from 'react';
import { Language } from '../types';

interface LanguageToggleProps {
  current: Language;
  onChange: (lang: Language) => void;
  disabled?: boolean;
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिं' },
  { code: 'mr', label: 'मरा' },
];

export default function LanguageToggle({ current, onChange, disabled }: LanguageToggleProps) {
  return (
    <div className="lang-toggle" role="group" aria-label="Select language">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          id={`lang-btn-${code}`}
          className={`lang-btn${current === code ? ' active' : ''}`}
          onClick={() => !disabled && onChange(code)}
          aria-pressed={current === code}
          disabled={disabled}
          aria-label={`Switch to ${code === 'en' ? 'English' : code === 'hi' ? 'Hindi' : 'Marathi'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
