import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="typing-row">
      <div className="typing-bubble" aria-label="Assistant is typing">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}
