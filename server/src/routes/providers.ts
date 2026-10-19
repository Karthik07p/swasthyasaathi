import { Router, Request, Response } from 'express';
import { matchProviders, listCities } from '../services/providers';

const router = Router();

// GET /api/providers/cities
router.get('/cities', async (_req: Request, res: Response) => {
  try {
    return res.json({ cities: await listCities() });
  } catch (err) {
    console.error('[GET /api/providers/cities]', err);
    return res.status(500).json({ error: 'Failed to load cities.' });
  }
});

// GET /api/providers/match?specialty=Dermatology&city=Nashik
// GET /api/providers/match?specialty=Dermatology&lat=19.99&lng=73.78
router.get('/match', async (req: Request, res: Response) => {
  const specialty = String(req.query.specialty ?? '').trim();
  if (!specialty) return res.status(400).json({ error: 'specialty is required.' });

  const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;
  if ((lat !== undefined && !Number.isFinite(lat)) || (lng !== undefined && !Number.isFinite(lng))) {
    return res.status(400).json({ error: 'lat and lng must be numbers.' });
  }
  if ((lat === undefined) !== (lng === undefined)) {
    return res.status(400).json({ error: 'lat and lng must be provided together.' });
  }

  try {
    const result = await matchProviders({
      specialty,
      city: req.query.city ? String(req.query.city) : undefined,
      lat,
      lng,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    return res.json(result);
  } catch (err) {
    console.error('[GET /api/providers/match]', err);
    return res.status(500).json({ error: 'Failed to match providers.' });
  }
});

export default router;
