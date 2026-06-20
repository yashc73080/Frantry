# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Frantry** is a mobile food pantry management app — users scan grocery receipts, track pantry items with expiry dates, and get AI-generated recipe suggestions. It's a monorepo with a React Native/Expo frontend and an Express/MongoDB backend.

## Repository Structure

```
Frantry/          # Expo (React Native) app
backend/          # Express API server
```

Both packages have their own `package.json`. Run commands from within each directory.

## Commands

### Frontend (`Frantry/`)

```bash
npm start           # Expo dev server
npm run android     # Run on Android emulator/device
npm run ios         # Run on iOS simulator/device
npm run web         # Run in browser
npm test            # Jest tests
npm run lint        # ESLint
```

### Backend (`backend/`)

```bash
npm run dev         # Dev server via Nodemon + ts-node (watches src/)
npm start           # Run compiled output (dist/server.js)
```

## Architecture

### Frontend

- **Expo Router** (file-based routing): all screens live under `Frantry/app/`. The main interface is a 4-tab layout in `app/(tabs)/` — Pantry, Scanner, Recipes, Settings.
- **Theming**: `useColorScheme` + `useThemeColor` hooks power light/dark mode. `ThemedText` and `ThemedView` are wrapper components for consistent theming.
- **API calls**: Axios against the backend using `EXPO_PUBLIC_BACKEND_URL`. The scanner also calls Google Cloud Vision directly from the client.
- **State**: local `useState`/`useEffect`/`useCallback` — no global state library.

### Backend

- **Entry**: `backend/src/server.ts` — Express app with CORS, 10MB JSON/payload limit.
- **Database**: MongoDB via Mongoose. Schema in `src/models/Item.ts`; `expiryLevel` is an enum (`"low" | "medium" | "high"`).
- **Routes**:
  - `src/routes/items.ts` — CRUD for pantry items; uses MongoDB aggregation to sort by expiry priority.
  - `src/routes/apigen.ts` — calls OpenRouter (Llama 3.2 3B) to normalize item names and infer expiry days from receipt text, and to generate recipes from prioritized ingredients.
- **Config**: `src/config/db.ts` handles MongoDB connection.

### Data Flow — Receipt Scanning

1. `Frantry/app/(tabs)/scanner.tsx` captures an image via Expo Camera.
2. Image is sent to **Google Cloud Vision API** (client-side) to extract raw text.
3. Raw text is sent to the backend (`POST /api/items/scannedData`), which calls **OpenRouter** to normalize food names and infer expiry days.
4. Parsed items are stored in MongoDB and displayed in the Pantry tab.

### Recipe Generation

The Pantry tab or Recipes tab calls `GET /api/items/recipes`. The backend fetches all items sorted by expiry priority (`high` → `medium` → `low`) and sends them to OpenRouter, which returns recipe suggestions.

## Environment Variables

### Frontend (`Frantry/.env`)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | Base URL of the Express backend |
| `EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY` | Google Vision API key for OCR |
| `EXPO_PUBLIC_OPENROUTER_API_KEY` | OpenRouter key (used client-side if needed) |

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `PORT` | Server port (default 5000) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `OPENROUTER_API_KEY` | OpenRouter key for LLM calls |
| `SERVER_URL` | Self-referential URL (used in some routes) |
