import React, { useEffect, useState } from 'react';
import { Language, Provider } from '../types';
import { apiUrl } from '../api';

interface ProviderListProps {
  specialty: string;
  language: Language;
  onBook: (provider: Provider) => void;
}

type Location = { kind: 'city'; city: string } | { kind: 'coords'; lat: number; lng: number };

const LABELS = {
  title: { en: 'Doctors near you', hi: 'आपके पास के डॉक्टर', mr: 'तुमच्या जवळचे डॉक्टर' },
  chooseCity: { en: 'Choose your city', hi: 'अपना शहर चुनें', mr: 'तुमचे शहर निवडा' },
  useLocation: { en: 'Use my location', hi: 'मेरी लोकेशन इस्तेमाल करें', mr: 'माझे स्थान वापरा' },
  locating: { en: 'Finding you…', hi: 'लोकेशन खोज रहे हैं…', mr: 'स्थान शोधत आहे…' },
  locationDenied: {
    en: 'Could not get your location. Please choose a city.',
    hi: 'लोकेशन नहीं मिली। कृपया शहर चुनें।',
    mr: 'स्थान मिळाले नाही. कृपया शहर निवडा.',
  },
  loading: { en: 'Finding doctors…', hi: 'डॉक्टर खोज रहे हैं…', mr: 'डॉक्टर शोधत आहे…' },
  none: {
    en: 'No verified doctors found for this yet.',
    hi: 'अभी इसके लिए कोई सत्यापित डॉक्टर नहीं मिला।',
    mr: 'यासाठी अजून कोणतेही सत्यापित डॉक्टर सापडले नाहीत.',
  },
  error: {
    en: 'Could not load doctors. Please try again.',
    hi: 'डॉक्टर लोड नहीं हो सके। कृपया फिर कोशिश करें।',
    mr: 'डॉक्टर लोड झाले नाहीत. कृपया पुन्हा प्रयत्न करा.',
  },
  demo: { en: 'Demo listing', hi: 'डेमो लिस्टिंग', mr: 'डेमो यादी' },
  verified: { en: 'Verified', hi: 'सत्यापित', mr: 'सत्यापित' },
  fee: { en: 'Fee', hi: 'फीस', mr: 'फी' },
  away: { en: 'away', hi: 'दूर', mr: 'अंतरावर' },
  book: { en: 'Book', hi: 'बुक करें', mr: 'बुक करा' },
} as const;

const TYPE_LABEL: Record<Provider['type'], Record<Language, string>> = {
  clinic: { en: 'Clinic', hi: 'क्लिनिक', mr: 'क्लिनिक' },
  hospital: { en: 'Hospital', hi: 'अस्पताल', mr: 'रुग्णालय' },
  lab: { en: 'Lab', hi: 'लैब', mr: 'प्रयोगशाळा' },
};

const LANG_NAME: Record<string, string> = { en: 'English', hi: 'हिंदी', mr: 'मराठी' };

const CITY_KEY = 'ss_city';

function loadSavedCity(): string {
  try {
    return localStorage.getItem(CITY_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveCity(city: string) {
  try {
    localStorage.setItem(CITY_KEY, city);
  } catch {
    /* storage unavailable — ignore */
  }
}

export default function ProviderList({ specialty, language, onBook }: ProviderListProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'none' | 'denied' | 'failed' | null>(null);
  const [locating, setLocating] = useState(false);

  // Load available cities and restore the last chosen one
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/providers/cities'))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { cities: string[] }) => {
        if (cancelled) return;
        setCities(data.cities);
        const saved = loadSavedCity();
        if (saved && data.cities.includes(saved)) setLocation({ kind: 'city', city: saved });
      })
      .catch(() => {
        if (!cancelled) setError('failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch matches whenever location or specialty changes
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ specialty });
    if (location.kind === 'city') params.set('city', location.city);
    else {
      params.set('lat', String(location.lat));
      params.set('lng', String(location.lng));
    }

    fetch(apiUrl(`/api/providers/match?${params}`))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { providers: Provider[] }) => {
        if (!cancelled) setProviders(data.providers);
      })
      .catch(() => {
        if (!cancelled) setError('failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location, specialty]);

  const handleCity = (city: string) => {
    if (!city) return;
    saveCity(city);
    setLocation({ kind: 'city', city });
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('denied');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLocation({ kind: 'coords', lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setError('denied');
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  };

  const selectedCity = location?.kind === 'city' ? location.city : '';

  return (
    <section className="provider-section" aria-label={LABELS.title[language]}>
      <div className="provider-title">{LABELS.title[language]}</div>

      <div className="provider-controls">
        <select
          id="provider-city-select"
          className="provider-select"
          value={selectedCity}
          onChange={(e) => handleCity(e.target.value)}
          aria-label={LABELS.chooseCity[language]}
        >
          <option value="">{LABELS.chooseCity[language]}</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          id="provider-locate-btn"
          type="button"
          className="provider-locate-btn"
          onClick={handleUseLocation}
          disabled={locating}
        >
          {locating ? LABELS.locating[language] : `📍 ${LABELS.useLocation[language]}`}
        </button>
      </div>

      {error === 'denied' && <div className="provider-note">{LABELS.locationDenied[language]}</div>}
      {error === 'failed' && <div className="provider-note">{LABELS.error[language]}</div>}
      {loading && <div className="provider-note">{LABELS.loading[language]}</div>}
      {!loading && providers && providers.length === 0 && (
        <div className="provider-note">{LABELS.none[language]}</div>
      )}

      {!loading && providers && providers.length > 0 && (
        <ul className="provider-list">
          {providers.map((p) => (
            <li key={p.id} className="provider-item">
              <div className="provider-item-top">
                <span className="provider-name">{p.name}</span>
                {p.distance_km !== null && (
                  <span className="provider-distance">
                    {p.distance_km} km {LABELS.away[language]}
                  </span>
                )}
              </div>
              <div className="provider-meta">
                {TYPE_LABEL[p.type][language]} · {p.area}, {p.city}
              </div>
              <div className="provider-meta">
                {LABELS.fee[language]} ₹{p.fee_inr} · {p.languages.map((l) => LANG_NAME[l] ?? l).join(', ')}
              </div>
              <div className="provider-tags">
                {p.verified && <span className="provider-tag provider-tag--verified">✓ {LABELS.verified[language]}</span>}
                {p.is_demo && <span className="provider-tag provider-tag--demo">{LABELS.demo[language]}</span>}
                <button
                  type="button"
                  className="provider-book-btn"
                  onClick={() => onBook(p)}
                  aria-label={`${LABELS.book[language]}: ${p.name}`}
                >
                  {LABELS.book[language]}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
