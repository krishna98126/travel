import "dotenv/config";

const BASE = "https://serpapi.com/search.json";

const AIRPORT_CODES = {
  "new delhi": "DEL", "delhi": "DEL", "indira gandhi international airport": "DEL",
  "mumbai": "BOM", "chhatrapati shivaji maharaj international airport": "BOM",
  "bengaluru": "BLR", "bangalore": "BLR",
  "hyderabad": "HYD", "kolkata": "CCU", "chennai": "MAA",
  "pune": "PNQ", "jaipur": "JAI", "goa": "GOI", "dabolim": "GOI",
  "manali": "KUU", "ahmedabad": "AMD", "lucknow": "LKO", "bhopal": "BHO",
  "udaipur": "UDR", "agra": "AGR", "amritsar": "ATQ", "kochi": "COK",
  "cochin": "COK", "thiruvananthapuram": "TRV", "varanasi": "VNS",
  "srinagar": "SXR", "chandigarh": "IXC", "patna": "PAT",
  "ranchi": "IXR", "bhubaneswar": "BBI", "nagpur": "NAG",
  "coimbatore": "CJB", "surat": "STV", "dehradun": "DED",
  "jodhpur": "JDH", "aurangabad": "IXU", "guwahati": "GAU"
};

function normalizeAirportId(value) {
  const raw = String(value || "").trim();
  if (/^[A-Za-z]{3}$/.test(raw)) return raw.toUpperCase();
  const mapped = AIRPORT_CODES[raw.toLowerCase()];
  if (mapped) return mapped;
  throw new Error(`Please use a valid airport/city. I couldn't map "${raw}" to a 3-letter airport code.`);
}

async function serpapi(params) {
  if (!process.env.SERPAPI_KEY) {
    throw new Error("SERPAPI_KEY is missing. Add it to .env");
  }

  const url = new URL(BASE);
  for (const [key, value] of Object.entries({ ...params, api_key: process.env.SERPAPI_KEY })) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || `SerpApi request failed (${response.status})`);
  }

  return data;
}

export async function searchFlights({
  departureId,
  arrivalId,
  outboundDate,
  returnDate,
  adults = 1,
  travelClass = 1,
  currency = "INR",
  sortBy = 1
}) {
  const departureCode = normalizeAirportId(departureId);
  const arrivalCode = normalizeAirportId(arrivalId);

  const data = await serpapi({
    engine: "google_flights",
    departure_id: departureCode,
    arrival_id: arrivalCode,
    outbound_date: outboundDate,
    return_date: returnDate,
    type: returnDate ? 1 : 2,
    adults,
    travel_class: travelClass,
    currency,
    gl: "in",
    hl: "en",
    sort_by: sortBy
  });

  return {
    raw: data,
    flights: normalizeFlights(data)
  };
}

function normalizeFlights(data) {
  const groups = data.best_flights || data.other_flights || [];
  const list = groups.flatMap(group => {
    const first = group.flights?.[0] || {};
    const last = group.flights?.[group.flights.length - 1] || first;
    return [{
      airline: first.airline || group.airline || "Airline",
      flightNumber: first.flight_number || "",
      departure: first.departure_airport?.time || "",
      arrival: last.arrival_airport?.time || "",
      departureAirport: first.departure_airport?.id || first.departure_airport?.name || "",
      arrivalAirport: last.arrival_airport?.id || last.arrival_airport?.name || "",
      duration: group.total_duration ? `${Math.round(group.total_duration / 60)}h ${group.total_duration % 60}m` : "",
      stops: Math.max(0, (group.flights?.length || 1) - 1),
      price: Number(group.price || 0),
      currency: "INR",
      logo: first.airline_logo || "",
      bookingToken: group.booking_token || null
    }];
  });

  return list.slice(0, 8);
}

export async function searchHotels({
  destination,
  checkIn,
  checkOut,
  adults = 1,
  rooms = 1,
  currency = "INR"
}) {
  const data = await serpapi({
    engine: "google_hotels",
    q: `hotels in ${destination}`,
    check_in_date: checkIn,
    check_out_date: checkOut,
    adults,
    rooms,
    currency,
    gl: "in",
    hl: "en"
  });

  return {
    raw: data,
    hotels: normalizeHotels(data)
  };
}

function firstHotelImage(h) {
  const candidates = [
    h.thumbnail, h.image, h.image_url, h.photo, h.photos?.[0],
    h.images?.[0]?.thumbnail, h.images?.[0]?.original_image,
    h.images?.[0]?.original, h.images?.[0]?.image, h.images?.[0]?.url,
    typeof h.images?.[0] === "string" ? h.images[0] : ""
  ];
  return candidates.find(v => typeof v === "string" && /^https?:\/\//i.test(v)) || "";
}

function normalizeHotels(data) {
  const results = data.properties || [];
  return results.slice(0, 9).map(h => ({
    name: h.name || "Hotel",
    rating: h.overall_rating ?? h.rating ?? null,
    reviews: h.reviews ?? null,
    price: h.rate_per_night?.extracted_lowest ?? h.rate_per_night?.extracted_before_taxes ?? h.rate_per_night?.lowest ?? null,
    currency: "INR",
    address: h.address || h.neighborhood || "",
    description: h.description || "",
    amenities: (h.amenities || []).slice(0, 5),
    thumbnail: firstHotelImage(h),
    link: h.link || h.booking_options?.[0]?.link || ""
  }));
}

export async function searchPlaces({ destination, query = "top attractions" }) {
  const data = await serpapi({
    engine: "google_local",
    q: `${query} in ${destination}`,
    location: destination,
    device: "desktop",
    gl: "in",
    hl: "en"
  });

  return {
    raw: data,
    places: (data.local_results || []).slice(0, 12).map(p => ({
      name: p.title || "Place",
      rating: p.rating ?? null,
      reviews: p.reviews ?? null,
      type: p.type || "",
      address: p.address || "",
      description: p.description || "",
      thumbnail: p.thumbnail || "",
      gps: p.gps_coordinates || null,
      placeId: p.place_id || null,
      link: p.links?.website || p.links?.directions || ""
    }))
  };
}

export async function searchDestinationExplore({ departureId }) {
  return serpapi({
    engine: "google_travel_explore",
    departure_id: departureId,
    currency: "INR",
    gl: "in",
    hl: "en"
  });
}
