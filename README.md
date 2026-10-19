# SwasthyaSaathi (स्वास्थ्यसाथी)

A vernacular AI triage companion for India's first mile of care. A patient describes symptoms in **English, Hindi or Marathi**, answers a few short follow-up questions, and is routed to the **right specialty at the right urgency**. The app then shows nearby verified doctors and lets the patient **book an appointment**.

> **Not a medical device.** SwasthyaSaathi routes patients to a specialist. It never diagnoses. All doctors and bookings in this repo are **demo data**; no real appointment is made.

**Live demo:** https://swasthyasaathi-chcc.onrender.com (the backend runs on a free tier, so the first chat after a quiet period can take up to a minute while it wakes up)

Built as a PM portfolio project: the product case study covers the problem, personas, metrics and go-to-market, and this repo is the working prototype.

## What it does

1. **Describe**: the patient types symptoms in their language.
2. **Triage**: Gemini asks up to 4 clarifying questions, then returns a specialty, an urgency (`routine` / `soon` / `urgent`), a confidence score and a plain-language reason.
3. **Route**: verified doctors for that specialty are listed by city or by distance from the phone's location.
4. **Act**: the patient picks a day and time, enters a name and mobile number, and gets a confirmation with a reference code.

### Safety design

- A **deterministic red-flag gate** runs *before* any LLM call. Phrases such as chest pain, trouble breathing, seizure, heavy bleeding or loss of consciousness (in English, Hindi and Marathi) immediately show a hardcoded emergency message: call 112. The LLM can't override it.
- The LLM is prompted to route, never diagnose, and to answer in plain language.
- Triage falls back across several Gemini models if one is overloaded.

## Tech stack

| Layer | Tech |
| --- | --- |
| Web app | React 18, TypeScript, Vite |
| Android app | Capacitor (wraps the web app) |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas (mongoose) |
| AI | Google Gemini (`@google/generative-ai`) |
| Hosting | Render (API), GitHub Actions (APK build) |

## Project structure

```
client/                 React + Vite web app
  src/components/       Chat, result card, provider list, booking panel
  src/hooks/useSession  Session + chat state
  src/api.ts            API base URL (VITE_API_BASE)
  android/              Capacitor Android project
server/
  src/routes/           session, providers, bookings
  src/services/         triage pipeline, red-flag gate, Gemini client, provider matching
  src/models/           Session, Provider, Booking
  src/seed/             Demo provider data
render.yaml             Render blueprint for the API
.github/workflows/      Cloud build of the debug APK
```

## Run locally

**Prerequisites:** Node.js 20+ (22 recommended), a free [MongoDB Atlas](https://cloud.mongodb.com) cluster, and a [Gemini API key](https://aistudio.google.com).

```bash
# 1. Install everything
npm run install:all

# 2. Configure the server
cp server/.env.example server/.env
#    then fill in MONGODB_URI and GEMINI_API_KEY

# 3. Load the demo doctors (run once)
npm run seed --prefix server

# 4. Start server (http://localhost:3001) and client (http://localhost:5173)
npm run dev
```

In Atlas, make sure your IP is in **Network Access**.

### Server environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas connection string, including the `/swasthyasaathi` database name |
| `GEMINI_API_KEY` | yes | Gemini API key |
| `PORT` | no | Defaults to `3001` |
| `GEMINI_MODEL` | no | Primary model, default `gemini-3.5-flash` |
| `GEMINI_FALLBACK_MODELS` | no | Comma-separated fallbacks tried if the primary is overloaded |
| `CORS_ORIGINS` | no | Extra allowed origins, comma-separated |
| `GEMINI_DAILY_CAP` | no | Max Gemini calls per day, default `800` |
| `RATE_API_MAX`, `RATE_SESSION_MAX`, `RATE_MESSAGE_MAX`, `RATE_BOOKING_MAX` | no | Per-IP limits (defaults 300 / 20 / 40 / 10 per window) |

Never commit `server/.env`. It is gitignored.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/session` | Start a consultation, returns a welcome message |
| `POST` | `/api/session/:id/message` | Send a patient message, returns a question, result or emergency |
| `POST` | `/api/session/:id/reset` | Start a new consultation |
| `GET` | `/api/providers/cities` | Cities with providers |
| `GET` | `/api/providers/match?specialty=&city=` or `&lat=&lng=` | Verified providers, sorted by fee or distance |
| `GET` | `/api/bookings/availability?provider_id=` | Slots for the next 3 days |
| `POST` | `/api/bookings` | Create a booking (409 if the slot was just taken) |
| `GET` | `/api/bookings/:reference` | Look up a booking |
| `GET` | `/api/health` | Health check |

## Deploy (Render)

`render.yaml` defines two free services: the **API** and the **web app** (a static site).

1. In Render, choose **New > Blueprint** and select this repo; it reads `render.yaml`.
2. Enter `MONGODB_URI` and `GEMINI_API_KEY` when prompted.
3. In Atlas **Network Access**, allow `0.0.0.0/0` (Render's free tier has no fixed IP).
4. Check `https://<your-api>.onrender.com/api/health`, then open the web app's URL from the Render dashboard.

5. Set `VITE_API_BASE` on the web service (Render dashboard > Environment) to your API's URL, then redeploy it. Use the same URL for the `API_BASE_URL` Actions variable when building the APK. The API's CORS already allows `swasthyasaathi*.onrender.com` web origins.

The API URL is deliberately not stored in this repo. It is configuration, not code.

### Abuse protection

Because the demo API is public, the server limits per-IP usage (sessions, messages and bookings), caps message length, and stops calling Gemini after a daily budget so the free quota can't be drained. When the daily budget is used up, patients see a "very busy today" message; red-flag emergency detection keeps working because it doesn't use the LLM. Tune with `RATE_API_MAX`, `RATE_SESSION_MAX`, `RATE_MESSAGE_MAX`, `RATE_BOOKING_MAX` and `GEMINI_DAILY_CAP`. The daily counter is in memory, so it resets if the server restarts.

The free API tier sleeps when idle, so the first request after a break can take up to a minute. The app shows a "waking up the server" notice while it waits. A free uptime monitor pinging `/api/health` every 5 minutes keeps it awake.

## Build the Android app

The Android app is the same web app wrapped with Capacitor, pointing at the deployed API.

**In the cloud (no Android Studio needed):**

1. In the GitHub repo, set the Actions variable `API_BASE_URL` to your Render URL (no trailing slash).
2. Open **Actions > Build Android debug APK > Run workflow**.
3. Download `swasthyasaathi-debug-apk` from the run's artifacts and install `app-debug.apk` on a phone.

**Locally** (needs JDK 21 and the Android SDK): copy `client/.env.example` to `client/.env.production`, set `VITE_API_BASE`, then run `npm run android:sync` in `client/` and open the project with `npm run android:open`.

The debug APK is for testing. A Play Store release needs a signed release build.

## Roadmap

Ideas from the product case study that are **not built yet**:

- Voice input and a WhatsApp / IVR front end for low-literacy users
- Real provider onboarding and verification (currently seeded demo data)
- User history for chronic-care continuity
- Human-doctor handoff for red-flag cases
- Referral tracking and lab / e-pharmacy routing
- Clinical validation of triage accuracy, with red-flag miss rate as a guardrail metric

## License

No license has been chosen yet. All rights reserved by the author until one is added.
