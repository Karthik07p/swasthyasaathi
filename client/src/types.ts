export type Language = 'en' | 'hi' | 'mr';
export type SessionStatus = 'active' | 'emergency' | 'done';
export type Urgency = 'routine' | 'soon' | 'urgent';
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
}

export interface TriageResult {
  specialty: string;
  urgency: Urgency;
  confidence: number;
  why_plain: string;
}

export interface Provider {
  id: string;
  name: string;
  type: 'clinic' | 'hospital' | 'lab';
  specialties: string[];
  city: string;
  area: string;
  languages: string[];
  fee_inr: number;
  verified: boolean;
  is_demo: boolean;
  distance_km: number | null;
}

export interface Slot {
  date: string; // YYYY-MM-DD (IST)
  time: string; // HH:mm (IST)
  available: boolean;
}

export interface Booking {
  reference: string;
  provider_id: string;
  provider_name: string;
  provider_area: string;
  provider_city: string;
  specialty: string;
  urgency: string;
  patient_name: string;
  slot_date: string;
  slot_time: string;
  status: 'confirmed' | 'cancelled';
  is_demo: boolean;
}

export interface SessionState {
  sessionId: string | null;
  messages: ChatMessage[];
  status: SessionStatus;
  result: TriageResult | null;
  language: Language;
  isLoading: boolean;
  error: string | null;
}
