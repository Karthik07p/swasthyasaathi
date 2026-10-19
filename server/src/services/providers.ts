import Provider, { IProvider } from '../models/Provider';

export const CANONICAL_SPECIALTIES = [
  'General Medicine',
  'Dermatology',
  'ENT',
  'Orthopedics',
  'Gastroenterology',
  'Pediatrics',
  'Gynecology',
  'Cardiology',
  'Neurology',
  'Ophthalmology',
  'Dentistry',
  'Pulmonology',
  'Psychiatry',
  'Endocrinology',
  'Urology',
] as const;

// Gemini returns free-text specialties; map keywords to our canonical names.
const ALIASES: Array<[RegExp, string]> = [
  [/derm|skin/i, 'Dermatology'],
  [/\bent\b|otolaryn|\bears?\b|\bnose\b|\bthroat\b/i, 'ENT'],
  [/ortho|bone|joint|musculo/i, 'Orthopedics'],
  [/gastro|digest|stomach|hepat|liver/i, 'Gastroenterology'],
  [/pediat|paediat|child/i, 'Pediatrics'],
  [/gyn|obstet|women/i, 'Gynecology'],
  [/cardio|\bheart\b/i, 'Cardiology'],
  [/neuro|brain/i, 'Neurology'],
  [/ophthal|eye/i, 'Ophthalmology'],
  [/dent|tooth|oral/i, 'Dentistry'],
  [/pulmo|chest|respir|lung/i, 'Pulmonology'],
  [/psych|mental/i, 'Psychiatry'],
  [/endocr|diabet|thyroid/i, 'Endocrinology'],
  [/urolog|kidney|nephro/i, 'Urology'],
];

export function normalizeSpecialty(raw: string): { specialty: string; exact: boolean } {
  const text = raw.trim();
  const direct = CANONICAL_SPECIALTIES.find((s) => s.toLowerCase() === text.toLowerCase());
  if (direct) return { specialty: direct, exact: true };
  for (const [re, canonical] of ALIASES) {
    if (re.test(text)) return { specialty: canonical, exact: true };
  }
  return { specialty: 'General Medicine', exact: false };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export interface MatchQuery {
  specialty: string;
  city?: string;
  lat?: number;
  lng?: number;
  limit?: number;
}

export interface ProviderMatch {
  id: string;
  name: string;
  type: IProvider['type'];
  specialties: string[];
  city: string;
  area: string;
  languages: string[];
  fee_inr: number;
  verified: boolean;
  is_demo: boolean;
  distance_km: number | null;
}

export async function matchProviders(q: MatchQuery): Promise<{
  specialty: string;
  providers: ProviderMatch[];
}> {
  const { specialty } = normalizeSpecialty(q.specialty);
  const limit = Math.min(Math.max(q.limit ?? 5, 1), 20);
  const hasCoords = typeof q.lat === 'number' && typeof q.lng === 'number';

  const filter: Record<string, unknown> = { specialties: specialty, verified: true };
  if (q.city && !hasCoords) filter.city = new RegExp(`^${q.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

  const docs = await Provider.find(filter).lean<IProvider[]>();

  const withDistance: ProviderMatch[] = docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    type: d.type,
    specialties: d.specialties,
    city: d.city,
    area: d.area,
    languages: d.languages,
    fee_inr: d.fee_inr,
    verified: d.verified,
    is_demo: d.is_demo,
    distance_km: hasCoords ? Math.round(haversineKm(q.lat!, q.lng!, d.lat, d.lng) * 10) / 10 : null,
  }));

  withDistance.sort((a, b) =>
    hasCoords ? (a.distance_km! - b.distance_km!) : a.fee_inr - b.fee_inr
  );

  return { specialty, providers: withDistance.slice(0, limit) };
}

export async function listCities(): Promise<string[]> {
  const cities = await Provider.distinct('city', { verified: true });
  return (cities as string[]).sort();
}
