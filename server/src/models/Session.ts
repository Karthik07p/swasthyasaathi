import mongoose, { Schema } from 'mongoose';

export type Language = 'en' | 'hi' | 'mr';
export type SessionStatus = 'active' | 'emergency' | 'done';
export type Urgency = 'routine' | 'soon' | 'urgent';

export interface HistoryEntry {
  role: 'user' | 'assistant';
  text: string;
}

export interface TriageResult {
  specialty: string;
  urgency: Urgency;
  confidence: number;
  why_plain: string;
}

export interface ISessionData {
  _id: string;
  language: Language;
  slots: Record<string, unknown>;
  asked_count: number;
  history: HistoryEntry[];
  candidates: Record<string, number>;
  status: SessionStatus;
  result: TriageResult | null;
  created_at: Date;
}

// Use type intersection so _id is string, bypassing the ObjectId default in Document
export type ISession = ISessionData & mongoose.Document;

const HistoryEntrySchema = new Schema<HistoryEntry>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const TriageResultSchema = new Schema<TriageResult>(
  {
    specialty: { type: String, required: true },
    urgency: { type: String, enum: ['routine', 'soon', 'urgent'], required: true },
    confidence: { type: Number, required: true },
    why_plain: { type: String, required: true },
  },
  { _id: false }
);

const SessionSchema = new Schema<ISession>(
  {
    _id: { type: String, required: true },
    language: { type: String, enum: ['en', 'hi', 'mr'], default: 'en' },
    slots: { type: Schema.Types.Mixed, default: {} },
    asked_count: { type: Number, default: 0 },
    history: { type: [HistoryEntrySchema], default: [] },
    candidates: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['active', 'emergency', 'done'], default: 'active' },
    result: { type: TriageResultSchema, default: null },
    created_at: { type: Date, default: Date.now },
  },
  {
    _id: false, // we manage our own UUID _id
    versionKey: false,
  }
);

export default mongoose.model<ISession>('Session', SessionSchema);
