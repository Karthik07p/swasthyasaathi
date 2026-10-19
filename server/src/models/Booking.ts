import mongoose, { Schema } from 'mongoose';

export interface IBooking extends mongoose.Document {
  reference: string; // short code shown to the patient, e.g. SS-7K3M9Q
  provider_id: mongoose.Types.ObjectId;
  provider_name: string;
  session_id: string | null;
  specialty: string;
  urgency: string;
  patient_name: string;
  patient_phone: string;
  slot_date: string; // YYYY-MM-DD (IST)
  slot_time: string; // HH:mm (IST, 24h)
  status: 'confirmed' | 'cancelled';
  is_demo: boolean;
  created_at: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    reference: { type: String, required: true, unique: true },
    provider_id: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    provider_name: { type: String, required: true },
    session_id: { type: String, default: null },
    specialty: { type: String, default: '' },
    urgency: { type: String, default: '' },
    patient_name: { type: String, required: true },
    patient_phone: { type: String, required: true },
    slot_date: { type: String, required: true },
    slot_time: { type: String, required: true },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    is_demo: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// One confirmed booking per provider per slot — blocks double booking atomically
BookingSchema.index(
  { provider_id: 1, slot_date: 1, slot_time: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

export default mongoose.model<IBooking>('Booking', BookingSchema);
