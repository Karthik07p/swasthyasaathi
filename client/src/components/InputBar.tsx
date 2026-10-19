import React, { useState, useRef, KeyboardEvent } from 'react';
import { Language } from '../types';

interface InputBarProps {
  onSend: (text: string) => void;
  disabled: boolean;
  language: Language;
}

const PLACEHOLDERS: Record<Language, string> = {
  en: 'Describe your symptoms…',
  hi: 'अपने लक्षण बताएं…',
  mr: 'तुमचे आजार सांगा…',
};

export default function InputBar({ onSend, disabled, language }: InputBarProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="input-bar">
      <div className="input-field-wrap">
        <textarea
          ref={textareaRef}
          id="chat-input"
          className="input-textarea"
          placeholder={PLACEHOLDERS[language]}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          rows={1}
          aria-label="Type your message"
          aria-disabled={disabled}
        />
      </div>
      <button
        id="send-btn"
        className="send-btn"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
      >
        {/* Paper-plane send icon */}
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
