const {
  getNearbyPlaces,
} = require("./overpassService");

const {
  analyzePlaces,
} = require("./analyzeService");

const {
  generateProductDemand,
} = require("./aiRecommendationService");

const {
  searchProductsByTypes,
} = require("./productionProductService");

const {
  buildInitialStoreAssortment,
} = require("./storeAssortmentService");


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
    JSON.stringify(
      analysis,
      null,
      2
    )
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
  // STEP 3
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
  // STEP 4
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


  // IMPORTANT:
  // We get a large candidate pool here.
  //
  // These are NOT the final recommendations.
  //
  // They are candidates that our backend
  // will filter and rank.

  const products =
    await searchProductsByTypes(
      productTypes,
      150
    );


  console.log("");

  console.log(
    `Candidate products found: ${products.length}`
  );


// ==========================================
// STEP 5
// BUILD INITIAL STORE ASSORTMENT
// ==========================================

console.log("");
console.log("STEP 5: Building initial store assortment...");

const finalProducts = buildInitialStoreAssortment(
  products,
  productDemand,
  50
);

console.log("");
console.log("================================");
console.log("FINAL CART RECOMMENDATION");
console.log("================================");

console.log(
  JSON.stringify(finalProducts, null, 2)
);
console.log(
  `Recommended store products: ${finalProducts.length}`
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

  candidateProductCount: products.length,

  recommendedProductCount: finalProducts.length,

  recommendedProducts: finalProducts,
};
}

module.exports = {
  analyzeLocation,
};