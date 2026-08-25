const {
  getNearbyPlaces,
} = require("./overpassService");

const {
  analyzePlaces,
} = require("./analyzeService");

const {
  generateProductDemand,
  generateFinalRecommendation,
} = require("./aiRecommendationService");

const {
  searchProductsByTypes,
} = require("./productionProductService");


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

  // ==========================================
  // STEP 1
  // GET NEARBY PLACES
  // ==========================================

  console.log("");
  console.log("STEP 1: Querying Overpass...");

  const places = await getNearbyPlaces(
    latitude,
    longitude,
    radius
  );

  console.log(
    `Nearby places found: ${places.length}`
  );


  // ==========================================
  // STEP 2
  // ANALYZE AREA
  // ==========================================

  console.log("");
  console.log("STEP 2: Analyzing area...");

  const analysis = analyzePlaces(places);

  console.log("Area analysis:");

  console.log(
    JSON.stringify(analysis, null, 2)
  );


  // ==========================================
  // STEP 3
  // CREATE LOCATION DATA
  // ==========================================

  const locationData = {
    location: {
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radius),
    },

    nearbyPlacesCount: places.length,

    areaAnalysis: analysis,
  };


  // ==========================================
  // STEP 4
  // AI DETERMINES PRODUCT TYPES
  // ==========================================

  console.log("");
  console.log(
    "STEP 3: Asking AI for product demand..."
  );

  const productDemand =
    await generateProductDemand(
      locationData
    );

  console.log("");
  console.log("AI PRODUCT DEMAND:");

  console.log(
    JSON.stringify(
      productDemand,
      null,
      2
    )
  );


  // ==========================================
  // STEP 5
  // QUERY PRODUCTION MONGODB
  // ==========================================

  console.log("");
  console.log(
    "STEP 4: Searching production MongoDB..."
  );

  const productTypes =
    productDemand.productTypes.map(
      (item) => item.type
    );

  console.log(
    "Product types requested by AI:"
  );

  console.log(productTypes);


  const products =
    await searchProductsByTypes(
      productTypes,
      30
    );

  console.log("");

  console.log(
    `Real products found: ${products.length}`
  );


  // ==========================================
  // STEP 6
  // FINAL AI PRODUCT SELECTION
  // ==========================================

  console.log("");
  console.log(
    "STEP 5: AI selecting final products..."
  );

  const finalRecommendation =
    await generateFinalRecommendation(
      locationData,
      productDemand,
      products
    );


  // ==========================================
  // PRINT FINAL RECOMMENDATIONS
  // ==========================================

  console.log("");
  console.log("================================");
  console.log("FINAL CART RECOMMENDATION");
  console.log("================================");

  console.log(
    JSON.stringify(
      finalRecommendation,
      null,
      2
    )
  );

  console.log("================================");
  console.log("LOCATION ANALYSIS FINISHED");
  console.log("================================");


  // ==========================================
  // RETURN API RESULT
  // ==========================================

  return {
    location: {
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radius),
    },

    nearbyPlacesCount: places.length,

    areaAnalysis: analysis,

    productDemand,

    recommendations:
      finalRecommendation,

  };
}


module.exports = {
  analyzeLocation,
};