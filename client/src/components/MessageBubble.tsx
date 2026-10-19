import React from 'react';
import { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-row message-row--${isUser ? 'user' : 'assistant'}`}>
      <div
        className={`message-bubble message-bubble--${isUser ? 'user' : 'assistant'}${
          message.text.startsWith('Something went wrong') ||
          message.text.startsWith('कुछ गलत हो गया') ||
          message.text.startsWith('काहीतरी चूक झाली')
            ? ' message-bubble--error'
            : ''
        }`}
      >
        <span style={{ display: 'block' }}>{message.text}</span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
}
