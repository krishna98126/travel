const API_BASE = "/api";

const $ = id => document.getElementById(id);
let lastTripPayload = null;
let selectedTravelItems = JSON.parse(localStorage.getItem("travelSelectedItems") || "[]");

function googleSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function googleMapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function openGoogle(query) {
  window.open(googleSearchUrl(query), "_blank", "noopener,noreferrer");
}

function openGoogleMaps(query) {
  window.open(googleMapsUrl(query), "_blank", "noopener,noreferrer");
}

function addTravelItem(item) {
  const key = item.id || `${item.type}-${item.name}-${item.price || ""}`;
  if (!selectedTravelItems.some(x => x.key === key)) {
    selectedTravelItems.push({ ...item, key });
    localStorage.setItem("travelSelectedItems", JSON.stringify(selectedTravelItems));
    demoToast(`${item.name || "Item"} added to your trip.`);
  } else {
    demoToast(`${item.name || "Item"} is already in your trip.`);
  }
}

function searchSection(type) {
  const search = $("search");
  if (search) search.scrollIntoView({ behavior: "smooth", block: "center" });
  const button = document.querySelector(`.search-tabs button[data-type="${type}"]`);
  if (button) button.click();
}

function openExperienceSearch() {
  goAI("Find the best attractions, restaurants and local experiences in my destination");
}


async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

function demoToast(msg) {
  const t = $("toast");
  if (!t) return;

  t.textContent = msg;
  t.classList.add("show");

  setTimeout(() => t.classList.remove("show"), 2600);
}

function goAI(prompt) {
  sessionStorage.setItem("airaPrompt", prompt);
  location.href = "ai.html";
}


/* =========================================================
   HOMEPAGE SEARCH
========================================================= */

let activeSearchType = "flight";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".search-tabs button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".search-tabs button")
        .forEach(b => b.classList.remove("active"));

      button.classList.add("active");
      activeSearchType = button.dataset.type || "flight";
    });
  });
});


async function runSearch() {
  const from = $("from")?.value?.trim() || "DEL";
  const to = $("to")?.value?.trim() || "BOM";
  const departure = $("depart")?.value;

  if (!departure) {
    demoToast("Please select a departure date.");
    return;
  }

  try {
    demoToast("Searching live travel data...");

    if (activeSearchType === "trip") {
      goAI(`Plan a trip from ${from} to ${to} for my trip dates ${departure}${returnDate ? ` to ${returnDate}` : ""}`);
      return;
    }

    const travellersText = $("travellers")?.value || "1";
    const adults = Number((travellersText.match(/\d+/) || [1])[0]);

    if (activeSearchType === "hotel") {
      const checkOut = $("returnDate")?.value;

      if (!checkOut) {
        demoToast("Please select a return/check-out date.");
        return;
      }

      const data = await api(
        `/travel/hotels?destination=${encodeURIComponent(to)}&checkIn=${departure}&checkOut=${checkOut}&adults=${adults}`
      );

      sessionStorage.setItem("hotelSearchResults", JSON.stringify(data.hotels || []));

      demoToast(`${data.hotels?.length || 0} hotels found.`);
      location.href = "ai.html";

      return;
    }

    const returnDate = $("returnDate")?.value;

    const data = await api(
      `/travel/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&departure=${departure}&returnDate=${returnDate || ""}&adults=${adults}`
    );

    sessionStorage.setItem("flightSearchResults", JSON.stringify(data.flights || []));

    demoToast(`${data.flights?.length || 0} flights found.`);

    location.href = "ai.html";

  } catch (error) {
    console.error(error);
    demoToast(error.message);
  }
}


/* =========================================================
   AUTHENTICATION
========================================================= */

function setAuth(mode) {
  const login = $("loginTab");
  const signup = $("signupTab");

  if (!login) return;

  login.classList.toggle("active", mode === "login");
  signup.classList.toggle("active", mode === "signup");

  $("loginForm").hidden = mode !== "login";
  $("signupForm").hidden = mode !== "signup";
}


async function login() {
  const email = $("loginEmail")?.value?.trim();
  const password = $("loginPassword")?.value || "";

  if (!email || !password) {
    demoToast("Enter your email and password.");
    return;
  }

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    localStorage.setItem("travelToken", data.token);
    localStorage.setItem("travelUser", JSON.stringify(data.user));

    demoToast(`Welcome back, ${data.user.firstName}!`);

    setTimeout(() => {
      location.href = "index.html";
    }, 700);

  } catch (error) {
    demoToast(error.message);
  }
}


async function signup() {
  const password = $("signupPassword")?.value || "";
  const confirm = $("signupConfirmPassword")?.value || "";

  if (password !== confirm) {
    demoToast("Passwords do not match.");
    return;
  }

  const payload = {
    firstName: $("signupFirstName")?.value?.trim(),
    lastName: $("signupLastName")?.value?.trim(),
    email: $("signupEmail")?.value?.trim(),
    phone: $("signupPhone")?.value?.trim(),
    dateOfBirth: $("signupDob")?.value,
    nationality: $("signupNationality")?.value,
    idType: $("signupIdType")?.value,
    idNumber: $("signupIdNumber")?.value?.trim(),
    password
  };

  if (!payload.firstName || !payload.email || !payload.password) {
    demoToast("Please fill the required fields.");
    return;
  }

  try {
    const data = await api("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    localStorage.setItem("travelToken", data.token);
    localStorage.setItem("travelUser", JSON.stringify(data.user));

    demoToast("Account created successfully!");

    setTimeout(() => {
      location.href = "index.html";
    }, 700);

  } catch (error) {
    demoToast(error.message);
  }
}


/* =========================================================
   AI CHAT
========================================================= */

function sendSuggestion(text) {
  const input = $("chatInput");

  if (!input) return;

  input.value = text;
  sendChat();
}


function addMessage(text, user = false) {
  const box = $("messages");

  if (!box) return;

  const wrap = document.createElement("div");

  wrap.className = "message " + (user ? "user" : "bot");

  if (user) {
    wrap.innerHTML = `
      <div>
        <p>${escapeHtml(text)}</p>
        <time>Now</time>
      </div>
    `;
  } else {
    wrap.innerHTML = `
      <span class="avatar">✦</span>
      <div>
        <strong>Aira AI</strong>
        <p>${escapeHtml(text)}</p>
        <time>Now</time>
      </div>
    `;
  }

  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}


function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );
}


/* =========================================================
   AIRA REAL BACKEND REQUEST
========================================================= */

async function sendChat() {
  const input = $("chatInput");

  if (!input || !input.value.trim()) return;

  const text = input.value.trim();

  input.value = "";

  addMessage(text, true);

  try {
    demoToast("Aira is searching live travel data...");

    const data = await api("/ai/plan", {
      method: "POST",
      body: JSON.stringify({
        message: text
      })
    });

    renderTrip(data);

    addMessage(
      data.reply ||
      `I've prepared a ${data.trip.days}-day trip to ${data.trip.destination}.`
    );

  } catch (error) {
    console.error(error);

    addMessage(
      "I couldn't complete the live search. Please check the backend/API keys and try again."
    );

    demoToast(error.message);
  }
}


/* =========================================================
   RENDER REAL TRIP DATA
========================================================= */

function renderTrip(data) {
  lastTripPayload = data;
  window.lastTripPayload = data;
  const trip = data.trip || {};

  if ($("resultTitle")) {
    $("resultTitle").textContent =
      `${trip.days || 3} days in ${trip.destination || "your destination"}`;
  }

  if ($("resultSubtitle")) {
    $("resultSubtitle").textContent =
      `Aira's live plan for ${trip.group || "travel"} · flights, hotels, places and itinerary`;
  }

  if ($("mapDestination")) {
    $("mapDestination").textContent =
      trip.destination || "Destination";
  }

  renderItinerary(data.itinerary || [], data.places || []);
  renderFlights(data.flights || []);
  renderHotels(data.hotels || []);
  renderPackage(data.package || {});

  demoToast("Trip updated with live search results.");
}


function activityLink(activity, places, destination) {
  const text = String(activity || "").trim();
  if (!text) return "";
  const match = (places || []).find(p => text.toLowerCase().includes(String(p.name || "").toLowerCase()));
  const query = match?.name ? `${match.name}, ${destination || ""}` : `${text}, ${destination || ""}`;
  const url = googleMapsUrl(query);
  return `<a class="activity-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a>`;
}

function renderItinerary(days, places = []) {
  const list = $("dayList");
  if (!list) return;

  if (!days.length) {
    list.innerHTML = `<article class="day-card"><h3>Itinerary unavailable</h3><p>Try asking Aira again with a destination and number of days.</p></article>`;
    return;
  }

  const destination = $("mapDestination")?.textContent || "";
  list.innerHTML = days.map(day => {
    const morning = escapeHtml(day.morning || "Local sightseeing");
    const afternoon = escapeHtml(day.afternoon || "Local food and culture");
    const evening = escapeHtml(day.evening || "Relax and explore the local area");
    return `
      <article class="day-card">
        <div class="day">DAY ${escapeHtml(day.day)}</div>
        <h3>${escapeHtml(day.title || "Explore the destination")}</h3>
        <p><b>Morning</b><br>${morning}<br>${activityLink(day.morning, places, destination)}<br><br>
        <b>Afternoon</b><br>${afternoon}<br>${activityLink(day.afternoon, places, destination)}<br><br>
        <b>Evening</b><br>${evening}<br>${activityLink(day.evening, places, destination)}</p>
      </article>`;
  }).join("");
}


/* =========================================================
   FLIGHTS
========================================================= */

function renderFlights(flights) {
  const container = document.querySelector("#flights");
  if (!container) return;
  container.querySelectorAll(".flight-card, .live-empty").forEach(card => card.remove());
  if (!flights.length) {
    container.insertAdjacentHTML("beforeend", `<p class="muted live-empty">No live flight results were returned. Check your SerpApi key/account and route.</p>`);
    return;
  }
  flights.forEach((flight, index) => {
    const query = `${flight.airline || "flight"} ${flight.flightNumber || ""} ${flight.departureAirport || ""} ${flight.arrivalAirport || ""}`.trim();
    container.insertAdjacentHTML("beforeend", `
      <div class="flight-card">
        <span class="air-logo">✈</span>
        <div><strong>${escapeHtml(flight.airline || "Airline")}</strong><small>${escapeHtml(flight.flightNumber || "")} · ${flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</small></div>
        <div class="route"><strong>${escapeHtml(flight.departure || "--")}</strong><small>${escapeHtml(flight.departureAirport || "")}</small></div>
        <b>→</b>
        <div class="route"><strong>${escapeHtml(flight.arrival || "--")}</strong><small>${escapeHtml(flight.arrivalAirport || "")}</small></div>
        <div class="price"><small>from</small><strong>₹${Number(flight.price || 0).toLocaleString("en-IN")}</strong>
          <button onclick='addTravelItem(${JSON.stringify({type:"flight", name: `${flight.airline || "Flight"} ${flight.flightNumber || ""}`.trim(), price: Number(flight.price || 0), id: `flight-${index}`})})'>Add to Trip</button>
          <button onclick='openGoogle(${JSON.stringify(query)})'>View on Google ↗</button>
        </div>
      </div>`);
  });
}


/* =========================================================
   HOTELS
========================================================= */

function renderHotels(hotels) {
  const container = document.querySelector("#hotels");
  if (!container) return;
  container.querySelectorAll(".hotel, .hotel-grid, .live-empty").forEach(x => x.remove());
  const grid = document.createElement("div");
  grid.className = "hotel-grid";
  if (!hotels.length) {
    grid.innerHTML = `<p class="muted live-empty">No live hotel results were returned. Check your SerpApi key/account and dates.</p>`;
    container.appendChild(grid);
    return;
  }
  hotels.forEach((hotel, index) => {
    const image = hotel.thumbnail || "";
    const googlePhotos = googleSearchUrl(`${hotel.name} ${hotel.address || ""} photos`);
    const imageHtml = image
      ? `<img class="hotel-photo" src="${escapeHtml(image)}" alt="${escapeHtml(hotel.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`
      : "";
    grid.insertAdjacentHTML("beforeend", `
      <article class="hotel">
        <div class="hotel-img ${image ? "has-photo" : ""}">${imageHtml}<div class="hotel-fallback">${escapeHtml(hotel.name)}<a href="${googlePhotos}" target="_blank" rel="noopener noreferrer">View photos on Google ↗</a></div></div>
        <div class="hotel-body">
          <span class="rating">${hotel.rating ?? "—"} ★</span>
          <h3>${escapeHtml(hotel.name)}</h3>
          <p>${escapeHtml(hotel.address || "Destination")}</p>
          <div class="hotel-meta">${escapeHtml((hotel.amenities || []).slice(0, 3).join(" · ") || "Live hotel result")}</div>
          <strong>${hotel.price ? `₹${Number(hotel.price).toLocaleString("en-IN")}` : "Price unavailable"}<small> / night</small></strong>
          <button onclick='addTravelItem(${JSON.stringify({type:"hotel", name: hotel.name, price: Number(hotel.price || 0), id: `hotel-${index}`})})'>Add to Trip</button>
          <a class="hotel-link" href="${escapeHtml(hotel.link || googleSearchUrl(hotel.name))}" target="_blank" rel="noopener noreferrer">Open hotel ↗</a>
        </div>
      </article>`);
  });
  container.appendChild(grid);
}


/* =========================================================
   PACKAGE
========================================================= */

function renderPackage(pkg) {
  const flights = Number(pkg.flights || 0);
  const hotels = Number(pkg.hotels || 0);
  const other = Number(pkg.other || 0);

  const total = Number(
    pkg.total || flights + hotels + other
  );

  if ($("packageTotal")) {
    $("packageTotal").textContent =
      `₹${total.toLocaleString("en-IN")}`;
  }

  const packageHead =
    document.querySelector(".package-breakdown");

  if (packageHead) {
    packageHead.innerHTML = `
      <span>
        ✈ Flights
        <b>₹${flights.toLocaleString("en-IN")}</b>
      </span>

      <span>
        ⌂ Hotels
        <b>₹${hotels.toLocaleString("en-IN")}</b>
      </span>

      <span>
        ✦ Other
        <b>₹${other.toLocaleString("en-IN")}</b>
      </span>
    `;
  }

  const selected = document.querySelector(".selected-items");

  if (selected) {
    const oldRows = selected.querySelectorAll(".selected-row");

    oldRows.forEach(row => row.remove());

    const heading = selected.querySelector("h2");

    if (heading) {
      heading.insertAdjacentHTML(
        "afterend",
        `
        <div class="selected-row">
          <span>✈</span>
          <div>
            <strong>Live flight options</strong>
            <small>Fetched through SerpApi</small>
          </div>
          <b>₹${flights.toLocaleString("en-IN")}</b>
        </div>

        <div class="selected-row">
          <span>⌂</span>
          <div>
            <strong>Live hotel options</strong>
            <small>Fetched through SerpApi</small>
          </div>
          <b>₹${hotels.toLocaleString("en-IN")}</b>
        </div>

        <div class="selected-row">
          <span>✦</span>
          <div>
            <strong>Estimated local expenses</strong>
            <small>Not a booking charge</small>
          </div>
          <b>₹${other.toLocaleString("en-IN")}</b>
        </div>
        `
      );
    }

    const button = selected.querySelector(".book-btn");

    if (button) {
      button.textContent = `Save package estimate — ₹${total.toLocaleString("en-IN")}`;
      button.onclick = () => saveCurrentTrip(lastTripPayload || window.lastTripPayload);
    }
  }
}


function filterResultCards(kind, value) {
  const query = String(value || "").toLowerCase().trim();
  const selector = kind === "flight" ? "#flights .flight-card" : "#hotels .hotel";
  document.querySelectorAll(selector).forEach(card => {
    card.style.display = !query || card.textContent.toLowerCase().includes(query) ? "" : "none";
  });
}

function sortFlightCards() {
  const container = $("flights");
  if (!container) return;
  const cards = [...container.querySelectorAll(".flight-card")];
  cards.sort((a,b) => {
    const pa = Number((a.querySelector(".price strong")?.textContent || "").replace(/[^0-9]/g, "")) || Infinity;
    const pb = Number((b.querySelector(".price strong")?.textContent || "").replace(/[^0-9]/g, "")) || Infinity;
    return pa - pb;
  });
  cards.forEach(c => container.appendChild(c));
  demoToast("Flights sorted by price.");
}

function showHotelFilters() {
  const cards = [...document.querySelectorAll("#hotels .hotel")];
  cards.forEach(card => {
    const rating = Number(card.querySelector(".rating")?.textContent || "0");
    card.style.display = rating >= 4 ? "" : "none";
  });
  demoToast("Showing hotels rated 4★ and above.");
}


/* =========================================================
   TABS
========================================================= */

function showTab(id, btn) {
  document
    .querySelectorAll(".result-tab")
    .forEach(x => x.classList.remove("active-tab"));

  document
    .querySelectorAll(".tabs button")
    .forEach(x => x.classList.remove("active"));

  const target = $(id);

  if (target) {
    target.classList.add("active-tab");
  }

  if (btn) {
    btn.classList.add("active");
  }
}


/* =========================================================
   RESET
========================================================= */

function resetTrip() {
  sessionStorage.removeItem("airaPrompt");

  if ($("resultTitle")) {
    $("resultTitle").textContent =
      "Your trip workspace";
  }

  if ($("resultSubtitle")) {
    $("resultSubtitle").textContent =
      "Ask Aira to create a live itinerary.";
  }

  if ($("dayList")) {
    $("dayList").innerHTML = "";
  }
}


/* =========================================================
   SAVE TRIP
========================================================= */

async function saveCurrentTrip(payload) {
  const token = localStorage.getItem("travelToken");

  if (!token) {
    demoToast("Login first to save a trip.");
    return;
  }

  try {
    await api("/trips", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: payload?.trip
          ? `${payload.trip.days} days in ${payload.trip.destination}`
          : "My Travel Plan",

        destination:
          payload?.trip?.destination || "Unknown",

        payload
      })
    });

    demoToast("Trip saved to your account.");

  } catch (error) {
    demoToast(error.message);
  }
}


/* =========================================================
   INITIAL PAGE LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll("#flights .result-toolbar input").forEach(input => {
    input.addEventListener("input", e => filterResultCards("flight", e.target.value));
  });
  document.querySelectorAll("#hotels .result-toolbar input").forEach(input => {
    input.addEventListener("input", e => filterResultCards("hotel", e.target.value));
  });

  const params = new URLSearchParams(location.search);

  if (params.get("mode") === "signup") {
    setAuth("signup");
  }


  if (location.pathname.endsWith("ai.html")) {

    const prompt =
      sessionStorage.getItem("airaPrompt");

    if (prompt) {

      sessionStorage.removeItem("airaPrompt");

      setTimeout(() => {

        if ($("chatInput")) {
          $("chatInput").value = prompt;
          sendChat();
        }

      }, 300);

    }

    const storedFlights =
      sessionStorage.getItem("flightSearchResults");

    if (storedFlights) {

      try {

        const flights =
          JSON.parse(storedFlights);

        renderFlights(flights);

        sessionStorage.removeItem(
          "flightSearchResults"
        );

      } catch {}
    }


    const storedHotels =
      sessionStorage.getItem("hotelSearchResults");

    if (storedHotels) {

      try {

        const hotels =
          JSON.parse(storedHotels);

        renderHotels(hotels);

        sessionStorage.removeItem(
          "hotelSearchResults"
        );

      } catch {}
    }

  }

});
