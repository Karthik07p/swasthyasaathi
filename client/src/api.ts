// Base URL of the backend. Empty in dev (Vite proxies /api to localhost:3001).
// Set VITE_API_BASE (e.g. https://swasthyasaathi-api.onrender.com) for the Android/production build.
const base = ((import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_API_BASE ?? '').replace(/\/+$/, '');

export const apiUrl = (path: string): string => `${base}${path}`;
