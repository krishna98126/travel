import express from "express";
import { extractTripRequest, createItinerary } from "../services/ai.js";
import { searchFlights, searchHotels, searchPlaces } from "../services/serpapi.js";

const router = express.Router();

function isoDatePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function cityToAirport(city) {
  const map = {
    "new delhi": "DEL",
    "delhi": "DEL",
    "mumbai": "BOM",
    "bengaluru": "BLR",
    "bangalore": "BLR",
    "hyderabad": "HYD",
    "kolkata": "CCU",
    "chennai": "MAA",
    "pune": "PNQ",
    "jaipur": "JAI",
    "goa": "GOI",
    "manali": "KUU",
    "ahmedabad": "AMD",
    "lucknow": "LKO",
    "bhopal": "BHO"
  };
  const key = city.trim().toLowerCase();
  if (/^[a-z]{3}$/i.test(city.trim())) return city.trim().toUpperCase();
  return map[key] || city.trim();
}

function fallbackTrip(message) {
  const lower = message.toLowerCase();

  const cities = [
    "Jaipur","Goa","Manali","Mumbai","Delhi","Bengaluru",
    "Bangalore","Kashmir","Udaipur","Agra","Kerala",
    "Rishikesh","Ooty","Dubai","Paris"
  ];

  const destination = cities.find(c => lower.includes(c.toLowerCase())) || "Jaipur";

  const match = lower.match(/(\d+)\s*(?:day|days|night|nights)/);
  const days = match ? Math.min(14, Math.max(1, Number(match[1]))) : 3;

  const group = lower.includes("friend")
    ? "friends"
    : lower.includes("business")
      ? "business"
      : lower.includes("solo")
        ? "solo"
        : "family";

  const budgetMatch = lower.match(/(?:₹|rs\.?|inr)\s*([\d,]+)/i);

  return {
    destination,
    origin: "New Delhi",
    days,
    group,
    travelers: group === "family" ? 3 : group === "friends" ? 3 : 1,
    budgetINR: budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) : null,
    outboundDate: null,
    returnDate: null,
    interests: []
  };
}

router.post("/plan", async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: "message is required." });
  }

  try {
    let trip;

    if (process.env.GROQ_API_KEY) {
      trip = await extractTripRequest(message);
    } else {
      trip = fallbackTrip(message);
    }

    // Use usable demo dates when the user did not provide dates.
    const outboundDate = trip.outboundDate || isoDatePlus(14);
    const returnDate = trip.returnDate || addDays(outboundDate, Math.max(1, trip.days));

    const departureId = cityToAirport(trip.origin);
    const arrivalId = cityToAirport(trip.destination);

    const [flightResult, hotelResult, placeResult] = await Promise.allSettled([
      searchFlights({
        departureId,
        arrivalId,
        outboundDate,
        returnDate,
        adults: trip.travelers
      }),
      searchHotels({
        destination: trip.destination,
        checkIn: outboundDate,
        checkOut: returnDate,
        adults: trip.travelers,
        rooms: Math.max(1, Math.ceil(trip.travelers / 2))
      }),
      searchPlaces({
        destination: trip.destination,
        query: trip.interests.length
          ? trip.interests.join(" ")
          : "top attractions restaurants things to do"
      })
    ]);

    const flights = flightResult.status === "fulfilled" ? flightResult.value.flights : [];
    const hotels = hotelResult.status === "fulfilled" ? hotelResult.value.hotels : [];
    const places = placeResult.status === "fulfilled" ? placeResult.value.places : [];
    const warnings = [];
    if (flightResult.status === "rejected") warnings.push(`Flights: ${flightResult.reason?.message || "live search failed"}`);
    if (hotelResult.status === "rejected") warnings.push(`Hotels: ${hotelResult.reason?.message || "live search failed"}`);
    if (placeResult.status === "rejected") warnings.push(`Places: ${placeResult.reason?.message || "live search failed"}`);

    let itinerary;

    if (process.env.GROQ_API_KEY) {
      itinerary = await createItinerary({
        trip,
        flights,
        hotels,
        places
      });
    } else {
      itinerary = {
        reply: `I created a ${trip.days}-day ${trip.destination} plan for ${trip.group} travel using live SerpApi results.`,
        itinerary: Array.from({ length: trip.days }, (_, i) => ({
          day: i + 1,
          title: i === 0 ? "Arrival & local highlights" : "Explore like a local",
          morning: places[i % Math.max(places.length, 1)]?.name || "Local sightseeing",
          afternoon: places[(i + 1) % Math.max(places.length, 1)]?.name || "Local food and culture",
          evening: "Relax and explore the local area"
        }))
      };
    }

    const flightTotal = flights[0]?.price || 0;
    const hotelTotal = hotels[0]?.price
      ? Number(hotels[0].price) * trip.days
      : 0;

    const packageTotal = flightTotal + hotelTotal;

    res.json({
      trip: {
        ...trip,
        outboundDate,
        returnDate,
        departureAirport: departureId,
        arrivalAirport: arrivalId
      },
      reply: itinerary.reply,
      itinerary: itinerary.itinerary,
      flights,
      hotels,
      places,
      warnings,
      package: {
        flights: flightTotal,
        hotels: hotelTotal,
        other: 0,
        total: packageTotal
      }
    });
  } catch (error) {
    console.error(error);
    res.status(502).json({
      error: error.message || "Aira could not create the plan."
    });
  }
});

export default router;
