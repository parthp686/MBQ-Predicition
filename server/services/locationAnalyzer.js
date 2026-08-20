const { getNearbyPlaces } = require("./overpassService");
const { analyzePlaces } = require("./analyzeService");
const {
  generateRecommendation,
} = require("./aiRecommendationService");

async function analyzeLocation(
  latitude,
  longitude,
  radius = 1000
) {
  console.log("================================");
  console.log("LOCATION ANALYSIS STARTED");
  console.log("================================");

  console.log(`Latitude: ${latitude}`);
  console.log(`Longitude: ${longitude}`);
  console.log(`Radius: ${radius}m`);

  // STEP 1
  // Get nearby places from Overpass
  const places = await getNearbyPlaces(
    latitude,
    longitude,
    radius
  );

  console.log(`Nearby places found: ${places.length}`);

  // STEP 2
  // Convert raw places into useful area statistics
  const analysis = analyzePlaces(places);

  console.log("Area analysis:");
  console.log(JSON.stringify(analysis, null, 2));

  // STEP 3
  // Prepare structured information for the AI
  //
  // nearbyPlaces is used internally by the AI.
  // It will NOT be returned to the API response.
  const locationData = {
    location: {
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radius),
    },

    nearbyPlacesCount: places.length,

    areaAnalysis: analysis,

    nearbyPlaces: places.map((place) => ({
      name: place.name,
      category: place.category,
      latitude: place.lat,
      longitude: place.lon,
    })),
  };

  console.log("Sending location data to AI...");

  // STEP 4
  // Ask Groq for business recommendations
  const recommendation =
    await generateRecommendation(locationData);

  console.log("AI recommendation generated.");

  // Print recommendation in terminal
  console.log("================================");
  console.log("AI CART RECOMMENDATION");
  console.log("================================");

  console.log(
    JSON.stringify(recommendation, null, 2)
  );

  console.log("================================");

  // STEP 5
  // Return ONLY useful information.
  //
  // IMPORTANT:
  // Do NOT return nearbyPlaces here.
  return {
    location: {
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radius),
    },

    nearbyPlacesCount: places.length,

    areaAnalysis: analysis,

    recommendations: recommendation,
  };
}

module.exports = {
  analyzeLocation,
};