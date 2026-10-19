import mongoose, { Schema } from 'mongoose';

export type ProviderType = 'clinic' | 'hospital' | 'lab';

export interface IProvider extends mongoose.Document {
  name: string;
  type: ProviderType;
  specialties: string[]; // canonical specialty names, see services/providers.ts
  city: string;
  area: string;
  lat: number;
  lng: number;
  languages: string[]; // 'en' | 'hi' | 'mr'
  fee_inr: number;
  verified: boolean;
  is_demo: boolean;
}

const ProviderSchema = new Schema<IProvider>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['clinic', 'hospital', 'lab'], required: true },
    specialties: { type: [String], required: true, index: true },
    city: { type: String, required: true, index: true },
    area: { type: String, default: '' },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    languages: { type: [String], default: ['en'] },
    fee_inr: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    is_demo: { type: Boolean, default: false },
  },
  { versionKey: false }
);

export default mongoose.model<IProvider>('Provider', ProviderSchema);
