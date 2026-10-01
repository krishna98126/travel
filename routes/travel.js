import express from "express";
import {
  searchFlights,
  searchHotels,
  searchPlaces,
  searchDestinationExplore
} from "../services/serpapi.js";

const router = express.Router();

router.get("/flights", async (req, res) => {
  try {
    const {
      from,
      to,
      departure,
      returnDate,
      adults = 1,
      sortBy = 1
    } = req.query;

    if (!from || !to || !departure) {
      return res.status(400).json({
        error: "from, to and departure are required."
      });
    }

    const result = await searchFlights({
      departureId: from,
      arrivalId: to,
      outboundDate: departure,
      returnDate: returnDate || undefined,
      adults: Number(adults),
      sortBy: Number(sortBy)
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: error.message });
  }
});

router.get("/hotels", async (req, res) => {
  try {
    const {
      destination,
      checkIn,
      checkOut,
      adults = 1,
      rooms = 1
    } = req.query;

    if (!destination || !checkIn || !checkOut) {
      return res.status(400).json({
        error: "destination, checkIn and checkOut are required."
      });
    }

    const result = await searchHotels({
      destination,
      checkIn,
      checkOut,
      adults: Number(adults),
      rooms: Number(rooms)
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: error.message });
  }
});

router.get("/places", async (req, res) => {
  try {
    const { destination, query = "top attractions" } = req.query;

    if (!destination) {
      return res.status(400).json({ error: "destination is required." });
    }

    const result = await searchPlaces({ destination, query });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: error.message });
  }
});

router.get("/explore", async (req, res) => {
  try {
    const { departureId } = req.query;

    if (!departureId) {
      return res.status(400).json({ error: "departureId is required." });
    }

    const result = await searchDestinationExplore({ departureId });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: error.message });
  }
});

export default router;
