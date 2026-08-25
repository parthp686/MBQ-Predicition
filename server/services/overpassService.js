const axios = require("axios");

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const DEFAULT_RADIUS = 1000;

function validateCoordinates(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Latitude and longitude must be valid numbers.");
  }

  if (lat < -90 || lat > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }

  if (lon < -180 || lon > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }
}

function getElementCoordinates(element) {
  // Node
  if (
    element.type === "node" &&
    Number.isFinite(element.lat) &&
    Number.isFinite(element.lon)
  ) {
    return {
      lat: element.lat,
      lon: element.lon,
    };
  }

  // Way / Relation with Overpass center
  if (
    element.center &&
    Number.isFinite(element.center.lat) &&
    Number.isFinite(element.center.lon)
  ) {
    return {
      lat: element.center.lat,
      lon: element.center.lon,
    };
  }

  return {
    lat: null,
    lon: null,
  };
}

function getPlaceName(element) {
  const tags = element.tags || {};

  return (
    tags.name ||
    tags["name:en"] ||
    tags.brand ||
    tags.operator ||
    "Unnamed"
  );
}

function getCategory(tags) {
  if (!tags) {
    return "other";
  }

  if (tags.amenity === "hospital") return "hospital";
  if (tags.amenity === "clinic") return "clinic";
  if (tags.amenity === "pharmacy") return "pharmacy";

  if (tags.amenity === "school") return "school";
  if (tags.amenity === "college") return "college";
  if (tags.amenity === "university") return "university";

  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "fast_food") return "fast_food";
  if (tags.amenity === "cafe") return "cafe";
  if (tags.amenity === "food_court") return "food_court";

  if (tags.tourism === "hotel") return "hotel";

  if (tags.shop === "supermarket") return "supermarket";
  if (tags.shop === "convenience") return "convenience_store";
  if (tags.shop === "bakery") return "bakery";
  if (tags.shop === "department_store") return "department_store";
  if (tags.shop) return tags.shop;

  if (tags.highway === "bus_stop") return "bus_stop";

  if (tags.amenity === "marketplace") return "marketplace";

  if (tags.leisure === "fitness_centre") return "gym";

  if (tags.office) return "office";

  return "other";
}

function normalizeElement(element) {
  const tags = element.tags || {};
  const coordinates = getElementCoordinates(element);

  return {
    id: element.id,
    type: element.type,

    name: getPlaceName(element),

    category: getCategory(tags),

    lat: coordinates.lat,
    lon: coordinates.lon,

    // IMPORTANT:
    // Keep original OSM tags.
    // analyzeService.js uses these.
    tags,
  };
}

async function queryOverpass(endpoint, query) {
  const response = await axios.post(endpoint, query, {
    timeout: 30000,

    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      Accept: "application/json",
      "User-Agent": "Cart-Location-MVP/1.0",
    },
  });

  return response.data;
}

async function getNearbyPlaces(latitude, longitude, radius = DEFAULT_RADIUS) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const searchRadius = Number(radius);

  validateCoordinates(lat, lon);

  if (!Number.isFinite(searchRadius) || searchRadius <= 0) {
    throw new Error("Radius must be a positive number.");
  }

  if (searchRadius > 5000) {
    throw new Error("Radius cannot be greater than 5000 meters.");
  }

  console.log("Querying Overpass...");
  console.log(`Coordinates: ${lat}, ${lon}`);
  console.log(`Radius: ${searchRadius}m`);

  /*
   * We use nwr:
   *
   * n = nodes
   * w = ways
   * r = relations
   *
   * This gives us more complete information than only searching nodes.
   *
   * around:radius,latitude,longitude
   */
  const query = `
[out:json][timeout:25];

(
  nwr["amenity"="hospital"](around:${searchRadius},${lat},${lon});
  nwr["amenity"="clinic"](around:${searchRadius},${lat},${lon});
  nwr["amenity"="pharmacy"](around:${searchRadius},${lat},${lon});

  nwr["amenity"="school"](around:${searchRadius},${lat},${lon});
  nwr["amenity"="college"](around:${searchRadius},${lat},${lon});
  nwr["amenity"="university"](around:${searchRadius},${lat},${lon});

  nwr["amenity"="restaurant"](around:${searchRadius},${lat},${lon});
  nwr["amenity"="fast_food"](around:${searchRadius},${lat},${lon});
  nwr["amenity"="cafe"](around:${searchRadius},${lat},${lon});
  nwr["amenity"="food_court"](around:${searchRadius},${lat},${lon});

  nwr["tourism"="hotel"](around:${searchRadius},${lat},${lon});

  nwr["shop"="supermarket"](around:${searchRadius},${lat},${lon});
  nwr["shop"="convenience"](around:${searchRadius},${lat},${lon});
  nwr["shop"="bakery"](around:${searchRadius},${lat},${lon});
  nwr["shop"="department_store"](around:${searchRadius},${lat},${lon});

  nwr["highway"="bus_stop"](around:${searchRadius},${lat},${lon});

  nwr["amenity"="marketplace"](around:${searchRadius},${lat},${lon});

  nwr["leisure"="fitness_centre"](around:${searchRadius},${lat},${lon});

  nwr["office"](around:${searchRadius},${lat},${lon});
);

out center tags;
`;

  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const data = await queryOverpass(endpoint, query);

      if (!data || !Array.isArray(data.elements)) {
        throw new Error("Invalid response received from Overpass API.");
      }

      console.log("Overpass HTTP request successful.");
      console.log(`Found ${data.elements.length} places`);

      const places = data.elements
        .map(normalizeElement)
        .filter((place) => place.lat !== null && place.lon !== null);

      return places;
    } catch (error) {
      lastError = error;

      if (error.response) {
        console.error(
          `Overpass API error from ${endpoint}:`,
          error.response.status
        );
      } else {
        console.error(
          `Overpass request failed for ${endpoint}:`,
          error.message
        );
      }
    }
  }

  throw new Error(
    `Failed to fetch data from all Overpass servers. Last error: ${
      lastError ? lastError.message : "Unknown error"
    }`
  );
}

module.exports = {
  getNearbyPlaces,
};