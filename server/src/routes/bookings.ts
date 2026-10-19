import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
import Provider from '../models/Provider';
import Session from '../models/Session';
import { bookingLimiter } from '../middleware/limits';

const router = Router();

// ─── Slot rules ──────────────────────────────────────────────────────────────
const SLOT_TIMES = ['10:00', '11:30', '16:00', '17:30'];
const DAYS_AHEAD = 3; // today + next 2 days
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istNow(): Date {
  // Shift so that getUTC* methods return IST wall-clock values
  return new Date(Date.now() + IST_OFFSET_MS);
}

function istDates(): string[] {
  const base = istNow();
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
}

function slotInFuture(date: string, time: string): boolean {
  const now = istNow();
  const today = now.toISOString().slice(0, 10);
  if (date > today) return true;
  if (date < today) return false;
  const hhmm = now.toISOString().slice(11, 16);
  return time > hhmm;
}

function makeReference(): string {
  // Unambiguous alphabet (no 0/O/1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  return 'SS-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function validId(id: unknown): id is string {
  return typeof id === 'string' && mongoose.isValidObjectId(id);
}

// ─── GET /api/bookings/availability?provider_id= ─────────────────────────────
router.get('/availability', async (req: Request, res: Response) => {
  const providerId = req.query.provider_id;
  if (!validId(providerId)) return res.status(400).json({ error: 'Valid provider_id is required.' });

  try {
    const provider = await Provider.findById(providerId).lean();
    if (!provider) return res.status(404).json({ error: 'Provider not found.' });

    const dates = istDates();
    const booked = await Booking.find({
      provider_id: providerId,
      status: 'confirmed',
      slot_date: { $in: dates },
    }).lean();
    const taken = new Set(booked.map((b) => `${b.slot_date} ${b.slot_time}`));

    const slots = dates.flatMap((date) =>
      SLOT_TIMES.map((time) => ({
        date,
        time,
        available: slotInFuture(date, time) && !taken.has(`${date} ${time}`),
      }))
    );
    return res.json({ provider_id: providerId, slots });
  } catch (err) {
    console.error('[GET /api/bookings/availability]', err);
    return res.status(500).json({ error: 'Failed to load availability.' });
  }
});

// ─── POST /api/bookings ──────────────────────────────────────────────────────
router.post('/', bookingLimiter, async (req: Request, res: Response) => {
  const { provider_id, session_id, patient_name, patient_phone, slot_date, slot_time } = req.body ?? {};

  if (!validId(provider_id)) return res.status(400).json({ error: 'Valid provider_id is required.' });

  const name = typeof patient_name === 'string' ? patient_name.trim() : '';
  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: 'Name must be 2–60 characters.' });
  }

  const phone = typeof patient_phone === 'string' ? patient_phone.replace(/[\s-]/g, '') : '';
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
  }

  if (typeof slot_date !== 'string' || !istDates().includes(slot_date) || !SLOT_TIMES.includes(slot_time)) {
    return res.status(400).json({ error: 'Choose one of the available slots.' });
  }
  if (!slotInFuture(slot_date, slot_time)) {
    return res.status(400).json({ error: 'That slot has already passed.' });
  }

  try {
    const provider = await Provider.findById(provider_id).lean();
    if (!provider || !provider.verified) return res.status(404).json({ error: 'Provider not found.' });

    // Copy triage context from the session if we can find it
    let specialty = provider.specialties[0] ?? '';
    let urgency = '';
    if (typeof session_id === 'string') {
      const session = await Session.findById(session_id).lean();
      if (session?.result) {
        specialty = session.result.specialty;
        urgency = session.result.urgency;
      }
    }

    const booking = await Booking.create({
      reference: makeReference(),
      provider_id: provider._id,
      provider_name: provider.name,
      session_id: typeof session_id === 'string' ? session_id : null,
      specialty,
      urgency,
      patient_name: name,
      patient_phone: phone,
      slot_date,
      slot_time,
      is_demo: provider.is_demo,
    });

    return res.status(201).json(toPublic(booking, provider.city, provider.area));
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return res.status(409).json({ error: 'That slot was just taken. Please pick another.' });
    }
    console.error('[POST /api/bookings]', err);
    return res.status(500).json({ error: 'Failed to create booking.' });
  }
});

// ─── GET /api/bookings/:reference ────────────────────────────────────────────
router.get('/:reference', async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findOne({ reference: req.params.reference.toUpperCase() });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    const provider = await Provider.findById(booking.provider_id).lean();
    return res.json(toPublic(booking, provider?.city ?? '', provider?.area ?? ''));
  } catch (err) {
    console.error('[GET /api/bookings/:reference]', err);
    return res.status(500).json({ error: 'Failed to load booking.' });
  }
});

function toPublic(b: InstanceType<typeof Booking>, city: string, area: string) {
  return {
    reference: b.reference,
    provider_id: String(b.provider_id),
    provider_name: b.provider_name,
    provider_area: area,
    provider_city: city,
    specialty: b.specialty,
    urgency: b.urgency,
    patient_name: b.patient_name,
    slot_date: b.slot_date,
    slot_time: b.slot_time,
    status: b.status,
    is_demo: b.is_demo,
  };
}

export default router;
