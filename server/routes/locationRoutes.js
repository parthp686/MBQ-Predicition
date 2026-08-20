const express = require("express");

const {
  getNearbyPlaces,
} = require("../services/placesService");

const {
  analyzePlaces,
} = require("../services/analyzeService");

const {
  getRecommendations,
} = require("../services/recommendationService");

const router = express.Router();

router.post("/analyze", async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 1000,
    } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "latitude and longitude are required",
      });
    }

    const nearbyPlaces = await getNearbyPlaces(
      latitude,
      longitude,
      radius
    );

    const placeCounts = analyzePlaces(nearbyPlaces);

    const recommendations =
      getRecommendations(placeCounts);

    res.json({
      location: {
        latitude,
        longitude,
        radius,
      },

      nearbyPlaces: placeCounts,

      totalPlaces: nearbyPlaces.length,

      recommendations,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to analyze location",
      error: error.message,
    });
  }
});

module.exports = router;