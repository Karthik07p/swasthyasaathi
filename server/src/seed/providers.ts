/**
 * Seeds DEMO providers. Every name below is fictional and every record is flagged
 * is_demo: true so the UI can label it. Replace with real, verified providers
 * before any real-world use.
 *
 * Run: npm run seed --prefix server
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Provider from '../models/Provider';

type Seed = {
  name: string;
  type: 'clinic' | 'hospital' | 'lab';
  specialties: string[];
  city: string;
  area: string;
  lat: number;
  lng: number;
  languages: string[];
  fee_inr: number;
};

const SEEDS: Seed[] = [
  // ── Nashik ──
  { name: 'Demo Jeevan Clinic', type: 'clinic', specialties: ['General Medicine', 'Pediatrics'], city: 'Nashik', area: 'College Road', lat: 20.0059, lng: 73.7633, languages: ['en', 'hi', 'mr'], fee_inr: 300 },
  { name: 'Demo Tvacha Skin Care', type: 'clinic', specialties: ['Dermatology'], city: 'Nashik', area: 'Gangapur Road', lat: 20.0153, lng: 73.7519, languages: ['en', 'mr'], fee_inr: 500 },
  { name: 'Demo Godavari Hospital', type: 'hospital', specialties: ['General Medicine', 'Cardiology', 'Orthopedics', 'Gastroenterology'], city: 'Nashik', area: 'Panchavati', lat: 20.0063, lng: 73.7917, languages: ['en', 'hi', 'mr'], fee_inr: 600 },
  { name: 'Demo Kaan Naak Gala Clinic', type: 'clinic', specialties: ['ENT'], city: 'Nashik', area: 'Nashik Road', lat: 19.9525, lng: 73.8330, languages: ['hi', 'mr'], fee_inr: 400 },
  { name: 'Demo Mahila Arogya Kendra', type: 'clinic', specialties: ['Gynecology', 'General Medicine'], city: 'Nashik', area: 'Satpur', lat: 20.0026, lng: 73.7370, languages: ['hi', 'mr'], fee_inr: 350 },
  // ── Pune ──
  { name: 'Demo Sahyadri Family Clinic', type: 'clinic', specialties: ['General Medicine', 'Endocrinology'], city: 'Pune', area: 'Kothrud', lat: 18.5074, lng: 73.8077, languages: ['en', 'hi', 'mr'], fee_inr: 500 },
  { name: 'Demo Pune Skin & Hair Centre', type: 'clinic', specialties: ['Dermatology'], city: 'Pune', area: 'Aundh', lat: 18.5580, lng: 73.8075, languages: ['en', 'hi', 'mr'], fee_inr: 800 },
  { name: 'Demo Deccan Multispeciality', type: 'hospital', specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pulmonology', 'Urology'], city: 'Pune', area: 'Deccan', lat: 18.5170, lng: 73.8414, languages: ['en', 'hi', 'mr'], fee_inr: 900 },
  { name: 'Demo Bal Arogya Clinic', type: 'clinic', specialties: ['Pediatrics'], city: 'Pune', area: 'Hadapsar', lat: 18.5089, lng: 73.9259, languages: ['hi', 'mr'], fee_inr: 450 },
  { name: 'Demo Netra Eye Care', type: 'clinic', specialties: ['Ophthalmology'], city: 'Pune', area: 'Shivajinagar', lat: 18.5308, lng: 73.8475, languages: ['en', 'hi', 'mr'], fee_inr: 600 },
  // ── Indore ──
  { name: 'Demo Malwa Health Clinic', type: 'clinic', specialties: ['General Medicine', 'Pediatrics'], city: 'Indore', area: 'Vijay Nagar', lat: 22.7533, lng: 75.8937, languages: ['en', 'hi'], fee_inr: 300 },
  { name: 'Demo Tvacha Rog Kendra', type: 'clinic', specialties: ['Dermatology'], city: 'Indore', area: 'Palasia', lat: 22.7240, lng: 75.8830, languages: ['hi'], fee_inr: 450 },
  { name: 'Demo Indore Heart & Chest Hospital', type: 'hospital', specialties: ['Cardiology', 'Pulmonology', 'General Medicine'], city: 'Indore', area: 'Rajwada', lat: 22.7196, lng: 75.8577, languages: ['en', 'hi'], fee_inr: 700 },
  { name: 'Demo Dant Chikitsa Clinic', type: 'clinic', specialties: ['Dentistry'], city: 'Indore', area: 'Sapna Sangeeta', lat: 22.7210, lng: 75.8700, languages: ['hi'], fee_inr: 250 },
  { name: 'Demo Mansik Swasthya Kendra', type: 'clinic', specialties: ['Psychiatry', 'Neurology'], city: 'Indore', area: 'Bhawarkuan', lat: 22.6980, lng: 75.8700, languages: ['en', 'hi'], fee_inr: 700 },
  // ── Bhopal ──
  { name: 'Demo Upvan Clinic', type: 'clinic', specialties: ['General Medicine', 'Endocrinology'], city: 'Bhopal', area: 'Arera Colony', lat: 23.2156, lng: 77.4330, languages: ['en', 'hi'], fee_inr: 350 },
  { name: 'Demo Bhopal Skin Clinic', type: 'clinic', specialties: ['Dermatology'], city: 'Bhopal', area: 'MP Nagar', lat: 23.2332, lng: 77.4346, languages: ['hi'], fee_inr: 500 },
  { name: 'Demo Bada Talab Hospital', type: 'hospital', specialties: ['Orthopedics', 'Gastroenterology', 'ENT', 'Gynecology', 'General Medicine'], city: 'Bhopal', area: 'Shyamla Hills', lat: 23.2599, lng: 77.3947, languages: ['en', 'hi'], fee_inr: 550 },
  { name: 'Demo Gram Swasthya Kendra', type: 'clinic', specialties: ['General Medicine', 'Pediatrics', 'Gynecology'], city: 'Bhopal', area: 'Kolar Road', lat: 23.1785, lng: 77.4224, languages: ['hi'], fee_inr: 200 },
  { name: 'Demo Mutra Rog Clinic', type: 'clinic', specialties: ['Urology'], city: 'Bhopal', area: 'Hoshangabad Road', lat: 23.1900, lng: 77.4500, languages: ['en', 'hi'], fee_inr: 600 },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in .env');
  await mongoose.connect(uri);

  const removed = await Provider.deleteMany({ is_demo: true });
  const created = await Provider.insertMany(
    SEEDS.map((s) => ({ ...s, verified: true, is_demo: true }))
  );
  console.log(`Removed ${removed.deletedCount} old demo providers, inserted ${created.length}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
