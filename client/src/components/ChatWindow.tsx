import React, { useEffect, useRef } from 'react';
import { ChatMessage, Language } from '../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  language: Language;
}

// WhatsApp-style background pattern (subtle dots)
const CHAT_BG_STYLE: React.CSSProperties = {
  backgroundImage: `radial-gradient(circle, rgba(15,118,110,0.06) 1px, transparent 1px)`,
  backgroundSize: '22px 22px',
};

export default function ChatWindow({ messages, isLoading, language }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-window" style={CHAT_BG_STYLE} role="log" aria-live="polite" aria-label="Chat messages">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
