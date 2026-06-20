import axios, { AxiosError } from "axios";
import { auth } from "./firebase";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  console.error(
    "[api] EXPO_PUBLIC_BACKEND_URL is not set.\n" +
    "  → Local dev: add it to Frantry/.env.local\n" +
    "  → Vercel: add it under Project Settings → Environment Variables\n" +
    "  → Value should be your Railway URL, e.g. https://frantry-production.up.railway.app"
  );
}

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000, // 30s — give the LLM time to respond
});

// Attach Firebase ID token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (tokenErr) {
      console.warn("[api] Could not get Firebase ID token:", tokenErr);
      // Continue without a token — backend will return 401
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enrich network errors with the URL that was attempted, so they're easier to debug
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      // No response = network error (bad URL, server down, CORS preflight blocked, etc.)
      const attempted = BACKEND_URL
        ? `${BACKEND_URL}${error.config?.url ?? ""}`
        : "(EXPO_PUBLIC_BACKEND_URL is not set)";
      const enriched = new Error(
        `Network error — could not reach the server.\n` +
        `URL attempted: ${attempted}\n\n` +
        `Check:\n` +
        `1. EXPO_PUBLIC_BACKEND_URL is set correctly in Vercel env vars\n` +
        `2. The Railway backend is running (check Railway dashboard)\n` +
        `3. ALLOWED_ORIGINS on the backend includes your Vercel URL`
      );
      return Promise.reject(enriched);
    }
    return Promise.reject(error);
  }
);

export default api;
