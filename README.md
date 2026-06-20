# Frantry

A mobile app for managing your food pantry. Scan grocery receipts to automatically add items with AI-inferred expiry dates, then get recipe suggestions based on what's about to expire.

## Tech Stack

- **Frontend**: React Native + Expo, TypeScript, Expo Router, React Native Paper
- **Backend**: Express, TypeScript, MongoDB/Mongoose
- **AI**: OpenRouter (Llama 3.2) for item parsing and recipe generation; Google Cloud Vision for receipt OCR

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance
- API keys for Google Cloud Vision and OpenRouter

### Frontend

```bash
cd Frantry
npm install
npx expo start        # then press A (Android), I (iOS), or W (web)
```

Create `Frantry/.env`:
```
EXPO_PUBLIC_BACKEND_URL=http://localhost:5000
EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY=your_key
EXPO_PUBLIC_OPENROUTER_API_KEY=your_key
```

### Backend

```bash
cd backend
npm install
npm run dev           # ts-node with hot reload
```

Create `backend/.env`:
```
MONGO_URI=your_mongodb_connection_string
PORT=5000
OPENROUTER_API_KEY=your_key
ALLOWED_ORIGINS=http://localhost:8081
```

## How It Works

1. **Scan** — Camera captures a receipt image, sent to Google Cloud Vision for OCR.
2. **Parse** — Raw text is sent to the backend, which uses an LLM to normalize food item names and estimate expiry days.
3. **Track** — Items are stored in MongoDB with expiry levels (`low` / `medium` / `high`) and shown in the Pantry tab.
4. **Cook** — The Recipes tab queries the backend, which prompts the LLM with your highest-priority ingredients to suggest recipes.
