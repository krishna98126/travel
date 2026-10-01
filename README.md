# Travel / Aira — Backend

This backend is designed around the frontend you supplied.

## What is connected

1. **Aira AI**
   - `POST /api/ai/plan`
   - Groq extracts the trip request and generates the itinerary.
   - SerpApi supplies live flights, hotels and local places.
   - The response is shaped for the existing `ai.html` UI.

2. **Flights**
   - `GET /api/travel/flights`
   - SerpApi Google Flights.

3. **Hotels**
   - `GET /api/travel/hotels`
   - SerpApi Google Hotels.

4. **Local discovery**
   - `GET /api/travel/places`
   - SerpApi Google Local.

5. **Authentication**
   - `POST /api/auth/signup`
   - `POST /api/auth/login`
   - Passwords are hashed with bcrypt.
   - JWT is returned after login/signup.

6. **Saved trips**
   - `GET /api/trips`
   - `POST /api/trips`
   - Requires a Bearer JWT.

## API keys

Create a SerpApi account and copy the API key into `.env`.
The hackathon site says a free SerpApi account provides 250 search credits/month for building/testing. Do not put the key in frontend JavaScript or GitHub.

Create a Groq API key from the Groq Console and put it in `.env` as `GROQ_API_KEY`. The default model is `llama-3.3-70b-versatile`; you can change it with `GROQ_MODEL`.

## Setup

Requirements:
- Node.js 20+
- npm

Commands:

```bash
npm install
copy .env.example .env
npm run dev
```

On macOS/Linux use:

```bash
cp .env.example .env
npm install
npm run dev
```

Open:

http://localhost:3000

## Important

Never commit `.env`.

The `.gitignore` already ignores:
- `.env`
- `node_modules`
- `travel.db`

## API examples

Health:

```bash
curl http://localhost:3000/api/health
```

Aira:

```bash
curl -X POST http://localhost:3000/api/ai/plan \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Plan a 4 day trip to Goa with friends from New Delhi with a budget of ₹40000\"}"
```

Flights:

```text
GET /api/travel/flights?from=DEL&to=JAI&departure=2026-10-15&returnDate=2026-10-18&adults=2
```

Hotels:

```text
GET /api/travel/hotels?destination=Jaipur&checkIn=2026-10-15&checkOut=2026-10-18&adults=2&rooms=1
```

Places:

```text
GET /api/travel/places?destination=Jaipur&query=best%20restaurants
```
