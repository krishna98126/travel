import "dotenv/config";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const model = () => process.env.GROQ_MODEL || "openai/gpt-oss-120b";

function getApiKey() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing. Add it to .env");
  }
  return process.env.GROQ_API_KEY;
}

function cleanJson(text) {
  const value = String(text || "").trim();
  if (value.startsWith("```")) {
    return value
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return value;
}

async function groqJson({ system, user, temperature = 0.2, maxTokens = 1800 }) {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model: model(),
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Groq API request failed with status ${response.status}`;
    throw new Error(message);
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty AI response.");
  }

  try {
    return JSON.parse(cleanJson(content));
  } catch {
    throw new Error("Groq returned invalid JSON. Please try again.");
  }
}

export async function extractTripRequest(message) {
  return groqJson({
    system: `You are the trip-intake parser for a travel app called Aira.
Return ONLY one valid JSON object. Do not use markdown.

The JSON object MUST contain exactly these keys:
destination, origin, days, group, travelers, budgetINR, outboundDate, returnDate, interests

Rules:
- If the user did not provide an origin, use "New Delhi".
- If the user did not provide a destination, use "Jaipur".
- If days are missing, use 3.
- group must be one of: family, friends, business, solo.
- Infer group from family/friends/business/solo; otherwise family.
- travelers must be an integer. Use family=3, friends=3, business=1, solo=1 unless the user gives a number.
- Dates must be YYYY-MM-DD when present; otherwise null.
- Budget must be an integer INR amount when present; otherwise null.
- interests must be an array of short phrases.
- Do not invent exact dates.
- Do not add extra JSON keys.`,
    user: `User travel request:\n${message}`,
    temperature: 0,
    maxTokens: 700
  });
}

export async function createItinerary({ trip, places, flights, hotels }) {
  const compactPlaces = places.slice(0, 8).map(p => ({
    name: p.name,
    rating: p.rating,
    type: p.type,
    address: p.address,
    placeId: p.placeId,
    link: p.link
  }));

  const compactFlights = flights.slice(0, 4).map(f => ({
    airline: f.airline,
    flightNumber: f.flightNumber,
    departure: f.departure,
    arrival: f.arrival,
    departureAirport: f.departureAirport,
    arrivalAirport: f.arrivalAirport,
    duration: f.duration,
    stops: f.stops,
    price: f.price
  }));

  const compactHotels = hotels.slice(0, 5).map(h => ({
    name: h.name,
    rating: h.rating,
    price: h.price,
    address: h.address,
    amenities: h.amenities,
    link: h.link
  }));

  return groqJson({
    system: `You are Aira, a practical travel planner.
Return ONLY one valid JSON object. Do not use markdown.

The JSON object MUST contain exactly two keys:
reply and itinerary.

itinerary must be an array. Every item must contain exactly:
day, title, morning, afternoon, evening

Rules:
- Create a realistic day-by-day plan.
- Use the live place, hotel and flight data supplied by the server whenever possible.
- Prefer named places from LIVE PLACES instead of inventing businesses.
- Do not claim anything is booked.
- Keep each itinerary activity concise.
- If prices are shown, treat them as estimates/live search results, not guaranteed prices.
- Do not add extra JSON keys.`,
    user: `Trip details:
${JSON.stringify({
      destination: trip.destination,
      days: trip.days,
      group: trip.group,
      travelers: trip.travelers,
      budgetINR: trip.budgetINR,
      interests: trip.interests
    })}

LIVE PLACES:
${JSON.stringify(compactPlaces)}

LIVE FLIGHTS:
${JSON.stringify(compactFlights)}

LIVE HOTELS:
${JSON.stringify(compactHotels)}`,
    temperature: 0.3,
    maxTokens: 2600
  });
}
