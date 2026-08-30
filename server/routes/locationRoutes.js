const express = require("express");

const {
  analyzeLocation,
} = require("../services/locationAnalyzer");

const router = express.Router();

router.post("/analyze", async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 1000,
    } = req.body;

    // ==========================================
    // VALIDATE INPUT
    // ==========================================

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: "latitude and longitude are required.",
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    const searchRadius = Number(radius);

    // ==========================================
    // VALIDATE LATITUDE
    // ==========================================

    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90
    ) {
      return res.status(400).json({
        success: false,
        error:
          "latitude must be a valid number between -90 and 90.",
      });
    }

    // ==========================================
    // VALIDATE LONGITUDE
    // ==========================================

    if (
      !Number.isFinite(lon) ||
      lon < -180 ||
      lon > 180
    ) {
      return res.status(400).json({
        success: false,
        error:
          "longitude must be a valid number between -180 and 180.",
      });
    }

    // ==========================================
    // VALIDATE RADIUS
    // ==========================================

    if (
      !Number.isFinite(searchRadius) ||
      searchRadius <= 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "radius must be a valid number greater than 0.",
      });
    }

    console.log("\n================================");
    console.log("LOCATION API REQUEST");
    console.log("================================");

    console.log(`Latitude: ${lat}`);
    console.log(`Longitude: ${lon}`);
    console.log(`Radius: ${searchRadius}m`);

    // ==========================================
    // RUN LOCATION ANALYSIS
    // ==========================================

    const result = await analyzeLocation(
      lat,
      lon,
      searchRadius
    );

    // ==========================================
    // RETURN RESULT
    // ==========================================

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {

    console.error("\nLocation analysis error:");
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Location analysis failed.",
    });
  }
});

module.exports = router;