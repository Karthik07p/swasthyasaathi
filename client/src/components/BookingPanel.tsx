import React, { useEffect, useMemo, useState } from 'react';
import { Booking, Language, Provider, Slot } from '../types';
import { apiUrl } from '../api';

interface BookingPanelProps {
  provider: Provider;
  sessionId: string | null;
  language: Language;
  onBack: () => void;
}

const L = {
  title: { en: 'Book appointment', hi: 'अपॉइंटमेंट बुक करें', mr: 'अपॉइंटमेंट बुक करा' },
  back: { en: '← Back to doctors', hi: '← डॉक्टरों पर वापस', mr: '← डॉक्टरांकडे परत' },
  day: { en: 'Choose a day', hi: 'दिन चुनें', mr: 'दिवस निवडा' },
  time: { en: 'Choose a time', hi: 'समय चुनें', mr: 'वेळ निवडा' },
  name: { en: 'Patient name', hi: 'मरीज़ का नाम', mr: 'रुग्णाचे नाव' },
  phone: { en: 'Mobile number', hi: 'मोबाइल नंबर', mr: 'मोबाइल नंबर' },
  confirm: { en: 'Confirm booking', hi: 'बुकिंग पक्की करें', mr: 'बुकिंग निश्चित करा' },
  booking: { en: 'Booking…', hi: 'बुक हो रहा है…', mr: 'बुक होत आहे…' },
  loadingSlots: { en: 'Loading times…', hi: 'समय लोड हो रहे हैं…', mr: 'वेळा लोड होत आहेत…' },
  noSlots: { en: 'No free times in the next 3 days.', hi: 'अगले 3 दिनों में कोई समय खाली नहीं।', mr: 'पुढील 3 दिवसांत वेळ उपलब्ध नाही.' },
  pickSlot: { en: 'Please choose a day and time.', hi: 'कृपया दिन और समय चुनें।', mr: 'कृपया दिवस आणि वेळ निवडा.' },
  badName: { en: 'Please enter the patient name.', hi: 'कृपया मरीज़ का नाम लिखें।', mr: 'कृपया रुग्णाचे नाव लिहा.' },
  badPhone: { en: 'Enter a valid 10-digit mobile number.', hi: '10 अंकों का सही मोबाइल नंबर लिखें।', mr: '10 अंकी योग्य मोबाइल नंबर लिहा.' },
  failed: { en: 'Could not book. Please try again.', hi: 'बुकिंग नहीं हो सकी। कृपया फिर कोशिश करें।', mr: 'बुकिंग झाले नाही. कृपया पुन्हा प्रयत्न करा.' },
  taken: { en: 'That time was just taken. Please pick another.', hi: 'यह समय अभी भर गया। कृपया दूसरा चुनें।', mr: 'ही वेळ आत्ताच भरली. कृपया दुसरी निवडा.' },
  confirmed: { en: 'Booking confirmed', hi: 'बुकिंग पक्की हुई', mr: 'बुकिंग निश्चित झाले' },
  reference: { en: 'Reference', hi: 'रेफरेंस', mr: 'संदर्भ' },
  when: { en: 'When', hi: 'कब', mr: 'केव्हा' },
  where: { en: 'Where', hi: 'कहाँ', mr: 'कुठे' },
  patient: { en: 'Patient', hi: 'मरीज़', mr: 'रुग्ण' },
  demoNote: {
    en: 'This is a demo booking. No real appointment has been made.',
    hi: 'यह डेमो बुकिंग है। कोई असली अपॉइंटमेंट नहीं बना है।',
    mr: 'हे डेमो बुकिंग आहे. प्रत्यक्ष अपॉइंटमेंट झालेले नाही.',
  },
  bringRef: {
    en: 'Show this reference at the clinic.',
    hi: 'क्लिनिक में यह रेफरेंस दिखाएं।',
    mr: 'क्लिनिकमध्ये हा संदर्भ दाखवा.',
  },
} as const;

const LOCALE: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

function formatDate(date: string, language: Language, long = false): string {
  // Dates are IST calendar days; noon UTC keeps the same calendar day in every zone
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(LOCALE[language], {
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(d);
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function BookingPanel({ provider, sessionId, language, onBack }: BookingPanelProps) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);

  const loadSlots = () => {
    setSlotsError(false);
    fetch(apiUrl(`/api/bookings/availability?provider_id=${provider.id}`))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { slots: Slot[] }) => setSlots(data.slots))
      .catch(() => setSlotsError(true));
  };

  useEffect(loadSlots, [provider.id]);

  const days = useMemo(() => {
    if (!slots) return [];
    const byDate = new Map<string, Slot[]>();
    for (const s of slots) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
    return [...byDate.entries()].map(([d, list]) => ({ date: d, slots: list, free: list.some((s) => s.available) }));
  }, [slots]);

  // Preselect the first day that has a free slot
  useEffect(() => {
    if (!date && days.length) {
      const first = days.find((d) => d.free);
      if (first) setDate(first.date);
    }
  }, [days, date]);

  const timesForDate = days.find((d) => d.date === date)?.slots ?? [];
  const anyFree = days.some((d) => d.free);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!date || !time) return setError(L.pickSlot[language]);
    if (name.trim().length < 2) return setError(L.badName[language]);
    if (!/^[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''))) return setError(L.badPhone[language]);

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: provider.id,
          session_id: sessionId,
          patient_name: name.trim(),
          patient_phone: phone,
          slot_date: date,
          slot_time: time,
        }),
      });
      if (res.status === 409) {
        setError(L.taken[language]);
        setTime('');
        loadSlots();
        return;
      }
      if (!res.ok) throw new Error();
      setBooking((await res.json()) as Booking);
    } catch {
      setError(L.failed[language]);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirmation screen ──
  if (booking) {
    return (
      <div className="booking-confirm" role="status">
        <div className="booking-confirm-icon" aria-hidden="true">✓</div>
        <div className="booking-confirm-title">{L.confirmed[language]}</div>

        <div className="booking-ref-box">
          <div className="booking-ref-label">{L.reference[language]}</div>
          <div className="booking-ref-code" id="booking-reference">{booking.reference}</div>
        </div>

        <dl className="booking-details">
          <dt>{L.when[language]}</dt>
          <dd>
            {formatDate(booking.slot_date, language, true)}, {formatTime(booking.slot_time)}
          </dd>
          <dt>{L.where[language]}</dt>
          <dd>
            {booking.provider_name}
            <br />
            {booking.provider_area}, {booking.provider_city}
          </dd>
          <dt>{L.patient[language]}</dt>
          <dd>{booking.patient_name}</dd>
        </dl>

        <div className="booking-note">{L.bringRef[language]}</div>
        {booking.is_demo && <div className="booking-note booking-note--demo">{L.demoNote[language]}</div>}
      </div>
    );
  }

  // ── Booking form ──
  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      <button type="button" className="booking-back" onClick={onBack}>
        {L.back[language]}
      </button>

      <div className="booking-title">{L.title[language]}</div>
      <div className="booking-provider">
        {provider.name}
        <span className="booking-provider-sub">
          {provider.area}, {provider.city} · ₹{provider.fee_inr}
        </span>
      </div>

      {!slots && !slotsError && <div className="provider-note">{L.loadingSlots[language]}</div>}
      {slotsError && <div className="provider-note">{L.failed[language]}</div>}
      {slots && !anyFree && <div className="provider-note">{L.noSlots[language]}</div>}

      {slots && anyFree && (
        <>
          <div className="booking-label">{L.day[language]}</div>
          <div className="booking-chips" role="radiogroup" aria-label={L.day[language]}>
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                role="radio"
                aria-checked={date === d.date}
                disabled={!d.free}
                className={`booking-chip${date === d.date ? ' booking-chip--active' : ''}`}
                onClick={() => {
                  setDate(d.date);
                  setTime('');
                }}
              >
                {formatDate(d.date, language)}
              </button>
            ))}
          </div>

          <div className="booking-label">{L.time[language]}</div>
          <div className="booking-chips" role="radiogroup" aria-label={L.time[language]}>
            {timesForDate.map((s) => (
              <button
                key={s.time}
                type="button"
                role="radio"
                aria-checked={time === s.time}
                disabled={!s.available}
                className={`booking-chip${time === s.time ? ' booking-chip--active' : ''}`}
                onClick={() => setTime(s.time)}
              >
                {formatTime(s.time)}
              </button>
            ))}
          </div>

          <label className="booking-label" htmlFor="booking-name">{L.name[language]}</label>
          <input
            id="booking-name"
            className="booking-input"
            value={name}
            maxLength={60}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />

          <label className="booking-label" htmlFor="booking-phone">{L.phone[language]}</label>
          <input
            id="booking-phone"
            className="booking-input"
            value={phone}
            inputMode="numeric"
            maxLength={14}
            autoComplete="tel-national"
            placeholder="98XXXXXXXX"
            onChange={(e) => setPhone(e.target.value)}
          />

          {error && <div className="booking-error" role="alert">{error}</div>}

          <button id="booking-confirm-btn" type="submit" className="booking-submit" disabled={submitting}>
            {submitting ? L.booking[language] : L.confirm[language]}
          </button>
        </>
      )}
    </form>
  );
}
