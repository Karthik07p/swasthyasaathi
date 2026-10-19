import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import sessionRouter from './routes/session';
import providersRouter from './routes/providers';
import bookingsRouter from './routes/bookings';

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is not set in .env');
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY is not set in .env');
  process.exit(1);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// Dev web app, plus the Capacitor Android WebView (https://localhost) and iOS (capacitor://localhost).
// Add more via CORS_ORIGINS (comma-separated), e.g. a hosted web build.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  ...(process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
];

app.use(
  cors({
    // Also allow the hosted web app on Render (swasthyasaathi.onrender.com, or a suffixed variant)
    origin: [...ALLOWED_ORIGINS, /^https:\/\/swasthyasaathi(-web)?(-[a-z0-9]+)?\.onrender\.com$/],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/session', sessionRouter);
app.use('/api/providers', providersRouter);
app.use('/api/bookings', bookingsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Connect to MongoDB and start server ──────────────────────────────────────

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`✅ SwasthyaSaathi server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('FATAL: MongoDB connection failed:', err);
    process.exit(1);
  });
