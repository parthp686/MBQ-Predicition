const express = require("express");

const {
  analyzeLocation,
} = require("../services/locationAnalyzer");

const router = express.Router();

router.get("/analyze", async (req, res) => {
  try {
    const { lat, lon, radius } = req.query;

    // Validate latitude and longitude
    if (lat === undefined || lon === undefined) {
      return res.status(400).json({
        success: false,
        error: "lat and lon are required.",
        example: "/api/location/analyze?lat=22.69275&lon=75.867639",
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);

    const searchRadius =
      radius === undefined ? 1000 : Number(radius);

    // Validate latitude
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: "lat must be a valid latitude between -90 and 90.",
      });
    }

    // Validate longitude
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: "lon must be a valid longitude between -180 and 180.",
      });
    }

    // Validate radius
    if (
      !Number.isFinite(searchRadius) ||
      searchRadius <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "radius must be a valid number greater than 0.",
      });
    }

    console.log("\n================================");
    console.log("LOCATION API REQUEST");
    console.log("================================");

    console.log(`Latitude: ${latitude}`);
    console.log(`Longitude: ${longitude}`);
    console.log(`Radius: ${searchRadius}m`);

    // Run location analysis
    const result = await analyzeLocation(
      latitude,
      longitude,
      searchRadius
    );

    // Print complete AI recommendation in terminal
    console.log("\n================================");
    console.log("AI CART RECOMMENDATION");
    console.log("================================");

    if (result.recommendations) {
      console.log(
        JSON.stringify(result.recommendations, null, 2)
      );
    } else {
      console.log("No AI recommendation returned.");
    }

    console.log("================================\n");

    // Return result to browser
    // nearbyPlaces should NOT be included here.
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("\nLocation analysis error:");
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message || "Location analysis failed.",
    });
  }
});

module.exports = router;