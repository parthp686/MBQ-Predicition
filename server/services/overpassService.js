const axios = require("axios");

/*
 * Overpass service
 *
 * Returns nearby OSM places useful for:
 * - customers
 * - commuters
 * - students
 * - office workers
 * - industrial workers
 * - warehouse/logistics workers
 * - construction workers
 * - local residents
 */

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * Build Overpass query.
 *
 * We intentionally query several types of places because OSM does not
 * directly provide "number of workers". Industrial, warehouse,
 * construction, office and transport features are used as worker-demand
 * proxies.
 */
function buildQuery(lat, lon, radius) {
  return `
[out:json][timeout:60];

(
  /* =========================
     FOOD & RETAIL
     ========================= */

  nwr["amenity"="restaurant"](around:${radius},${lat},${lon});
  nwr["amenity"="fast_food"](around:${radius},${lat},${lon});
  nwr["amenity"="cafe"](around:${radius},${lat},${lon});
  nwr["shop"="supermarket"](around:${radius},${lat},${lon});
  nwr["shop"="convenience"](around:${radius},${lat},${lon});
  nwr["shop"="bakery"](around:${radius},${lat},${lon});
  nwr["shop"="confectionery"](around:${radius},${lat},${lon});
  nwr["shop"="variety_store"](around:${radius},${lat},${lon});

  /* =========================
     EDUCATION
     ========================= */

  nwr["amenity"="school"](around:${radius},${lat},${lon});
  nwr["amenity"="college"](around:${radius},${lat},${lon});
  nwr["amenity"="university"](around:${radius},${lat},${lon});
  nwr["amenity"="kindergarten"](around:${radius},${lat},${lon});

  /* =========================
     TRANSPORT / COMMUTERS
     ========================= */

  nwr["highway"="bus_stop"](around:${radius},${lat},${lon});
  nwr["public_transport"="platform"](around:${radius},${lat},${lon});
  nwr["amenity"="bus_station"](around:${radius},${lat},${lon});
  nwr["amenity"="taxi"](around:${radius},${lat},${lon});
  nwr["amenity"="fuel"](around:${radius},${lat},${lon});

  /* =========================
     OFFICES / COMMERCIAL
     ========================= */

  nwr["office"](around:${radius},${lat},${lon});
  nwr["building"="office"](around:${radius},${lat},${lon});
  nwr["building"="commercial"](around:${radius},${lat},${lon});
  nwr["landuse"="commercial"](around:${radius},${lat},${lon});

  /* =========================
     INDUSTRIAL / FACTORIES
     ========================= */

  nwr["landuse"="industrial"](around:${radius},${lat},${lon});
  nwr["industrial"](around:${radius},${lat},${lon});
  nwr["man_made"="works"](around:${radius},${lat},${lon});
  nwr["man_made"="works"](around:${radius},${lat},${lon});
  nwr["building"="industrial"](around:${radius},${lat},${lon});

  /* =========================
     FACTORIES / MANUFACTURING
     ========================= */

  nwr["craft"](around:${radius},${lat},${lon});
  nwr["craft"="factory"](around:${radius},${lat},${lon});
  nwr["industrial"="factory"](around:${radius},${lat},${lon});
  nwr["industrial"="manufacturing"](around:${radius},${lat},${lon});

  /* =========================
     WAREHOUSE / STORAGE
     ========================= */

  nwr["building"="warehouse"](around:${radius},${lat},${lon});
  nwr["building"="storage"](around:${radius},${lat},${lon});
  nwr["industrial"="warehouse"](around:${radius},${lat},${lon});
  nwr["industrial"="storage"](around:${radius},${lat},${lon});
  nwr["landuse"="depot"](around:${radius},${lat},${lon});
  nwr["amenity"="loading_dock"](around:${radius},${lat},${lon});

  /* =========================
     LOGISTICS / DISTRIBUTION
     ========================= */

  nwr["industrial"="logistics"](around:${radius},${lat},${lon});
  nwr["industrial"="distribution"](around:${radius},${lat},${lon});
  nwr["office"="logistics"](around:${radius},${lat},${lon});
  nwr["amenity"="parcel_locker"](around:${radius},${lat},${lon});

  /* =========================
     CONSTRUCTION / LABOUR SITES
     ========================= */

  nwr["landuse"="construction"](around:${radius},${lat},${lon});
  nwr["construction"](around:${radius},${lat},${lon});
  nwr["building"="construction"](around:${radius},${lat},${lon});

  /* =========================
     WORKSHOPS / REPAIR
     ========================= */

  nwr["shop"="car_repair"](around:${radius},${lat},${lon});
  nwr["shop"="motorcycle_repair"](around:${radius},${lat},${lon});
  nwr["shop"="bicycle"](around:${radius},${lat},${lon});
  nwr["craft"="carpenter"](around:${radius},${lat},${lon});
  nwr["craft"="metal_construction"](around:${radius},${lat},${lon});
  nwr["craft"="welder"](around:${radius},${lat},${lon});
  nwr["craft"="plumber"](around:${radius},${lat},${lon});
  nwr["craft"="electrician"](around:${radius},${lat},${lon});

  /* =========================
     MARKETS / RESIDENTIAL
     ========================= */

  nwr["amenity"="marketplace"](around:${radius},${lat},${lon});
  nwr["landuse"="residential"](around:${radius},${lat},${lon});

  /* =========================
     HOTELS / TRAVEL
     ========================= */

  nwr["tourism"="hotel"](around:${radius},${lat},${lon});
  nwr["tourism"="hostel"](around:${radius},${lat},${lon});
  nwr["tourism"="guest_house"](around:${radius},${lat},${lon});
);

out center tags;
`;
}

/**
 * Convert an OSM element into a simple application object.
 */
function normalizePlace(element) {
  const tags = element.tags || {};

  let lat = element.lat;
  let lon = element.lon;

  // Ways and relations normally return center coordinates.
  if (lat == null && element.center) {
    lat = element.center.lat;
    lon = element.center.lon;
  }

  return {
    id: element.id,
    type: element.type,
    name:
      tags.name ||
      tags["name:en"] ||
      "Unnamed",

    category: detectCategory(tags),

    lat,
    lon,

    tags,
  };
}

/**
 * Detect the business/use category from OSM tags.
 *
 * More specific categories are checked before generic ones.
 */
function detectCategory(tags) {
  /* Food */
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "fast_food") return "fast_food";
  if (tags.amenity === "cafe") return "cafe";

  /* Education */
  if (tags.amenity === "university") return "university";
  if (tags.amenity === "college") return "college";
  if (tags.amenity === "school") return "school";
  if (tags.amenity === "kindergarten") return "kindergarten";

  /* Transport */
  if (tags.highway === "bus_stop") return "bus_stop";
  if (tags.public_transport === "platform") return "transport_platform";
  if (tags.amenity === "bus_station") return "bus_station";
  if (tags.amenity === "taxi") return "taxi";
  if (tags.amenity === "fuel") return "fuel";

  /* Retail */
  if (tags.shop === "supermarket") return "supermarket";
  if (tags.shop === "convenience") return "convenience_store";
  if (tags.shop === "bakery") return "bakery";
  if (tags.shop === "confectionery") return "confectionery";
  if (tags.shop === "variety_store") return "variety_store";

  /* Construction */
  if (
    tags.landuse === "construction" ||
    tags.construction ||
    tags.building === "construction"
  ) {
    return "construction_site";
  }

  /* Warehouses */
  if (
    tags.building === "warehouse" ||
    tags.building === "storage" ||
    tags.industrial === "warehouse" ||
    tags.industrial === "storage"
  ) {
    return "warehouse";
  }

  /* Logistics */
  if (
    tags.industrial === "logistics" ||
    tags.industrial === "distribution" ||
    tags.office === "logistics"
  ) {
    return "logistics";
  }

  /* Industrial */
  if (
    tags.landuse === "industrial" ||
    tags.industrial ||
    tags.building === "industrial" ||
    tags.man_made === "works"
  ) {
    return "industrial";
  }

  /* Factory */
  if (
    tags.industrial === "factory" ||
    tags.industrial === "manufacturing" ||
    tags.craft === "factory"
  ) {
    return "factory";
  }

  /* Workshops */
  if (
    tags.shop === "car_repair" ||
    tags.shop === "motorcycle_repair" ||
    tags.shop === "bicycle" ||
    tags.craft
  ) {
    return "workshop";
  }

  /* Offices */
  if (
    tags.office ||
    tags.building === "office" ||
    tags.building === "commercial" ||
    tags.landuse === "commercial"
  ) {
    return "office";
  }

  /* Markets */
  if (tags.amenity === "marketplace") {
    return "marketplace";
  }

  /* Residential */
  if (tags.landuse === "residential") {
    return "residential";
  }

  /* Hotels */
  if (tags.tourism === "hotel") return "hotel";
  if (tags.tourism === "hostel") return "hostel";
  if (tags.tourism === "guest_house") return "guest_house";

  return "other";
}

/**
 * Remove duplicate OSM objects.
 */
function deduplicatePlaces(places) {
  const seen = new Set();

  return places.filter((place) => {
    const key = `${place.type}-${place.id}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/**
 * Create a category summary.
 */
function buildCategorySummary(places) {
  const summary = {};

  for (const place of places) {
    summary[place.category] = (summary[place.category] || 0) + 1;
  }

  return summary;
}

/**
 * Build higher-level business signals for the Location Agent.
 */
function buildLocationSignals(places) {
  const count = (category) =>
    places.filter((place) => place.category === category).length;

  return {
    food: {
      restaurants: count("restaurant"),
      fastFood: count("fast_food"),
      cafes: count("cafe"),
    },

    education: {
      schools: count("school"),
      colleges: count("college"),
      universities: count("university"),
      kindergartens: count("kindergarten"),
    },

    transport: {
      busStops: count("bus_stop"),
      busStations: count("bus_station"),
      transportPlatforms: count("transport_platform"),
      fuelStations: count("fuel"),
    },

    commercial: {
      offices: count("office"),
      supermarkets: count("supermarket"),
      convenienceStores: count("convenience_store"),
      marketplaces: count("marketplace"),
    },

    worker: {
      factories: count("factory"),
      industrialSites: count("industrial"),
      warehouses: count("warehouse"),
      logisticsSites: count("logistics"),
      constructionSites: count("construction_site"),
      workshops: count("workshop"),
    },

    travel: {
      hotels: count("hotel"),
      hostels: count("hostel"),
      guestHouses: count("guest_house"),
    },

    residential: {
      residentialAreas: count("residential"),
    },
  };
}

/**
 * Main function.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius Radius in meters
 */
async function getNearbyPlaces(lat, lon, radius = 1000) {
  if (!Number.isFinite(Number(lat))) {
    throw new Error("Invalid latitude");
  }

  if (!Number.isFinite(Number(lon))) {
    throw new Error("Invalid longitude");
  }

  if (!Number.isFinite(Number(radius)) || Number(radius) <= 0) {
    throw new Error("Invalid radius");
  }

  lat = Number(lat);
  lon = Number(lon);
  radius = Number(radius);

  console.log("Querying Overpass...");
  console.log(`Coordinates: ${lat}, ${lon}`);
  console.log(`Radius: ${radius}m`);

  const query = buildQuery(lat, lon, radius);

  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Trying Overpass endpoint: ${endpoint}`);

      const response = await axios.post(
        endpoint,
        query,
        {
          headers: {
            "Content-Type": "text/plain",
            Accept: "application/json",
            "User-Agent": "cart-location-mvp/1.0",
          },

          timeout: 90000,

          // Prevent axios from treating a non-JSON HTML error as success.
          validateStatus: () => true,
        }
      );

      console.log(`Overpass HTTP status: ${response.status}`);

      if (response.status !== 200) {
        const body =
          typeof response.data === "string"
            ? response.data.substring(0, 500)
            : JSON.stringify(response.data).substring(0, 500);

        console.log(`Overpass endpoint failed: ${body}`);

        lastError = new Error(
          `Overpass request failed with status ${response.status}`
        );

        continue;
      }

      const elements = Array.isArray(response.data?.elements)
        ? response.data.elements
        : [];

      console.log("Overpass request completed.");

      let places = elements
        .map(normalizePlace)
        .filter(
          (place) =>
            place.lat != null &&
            place.lon != null
        );

      places = deduplicatePlaces(places);

      const categorySummary = buildCategorySummary(places);
      const signals = buildLocationSignals(places);

      console.log(`Found ${places.length} places`);

      console.log("Category summary:");
      console.log(categorySummary);

      console.log("Worker signals:");
      console.log(signals.worker);

      return {
        success: true,

        center: {
          lat,
          lon,
        },

        radius,

        count: places.length,

        categorySummary,

        signals,

        places,
      };
    } catch (error) {
      console.error(
        `Overpass endpoint error: ${endpoint}`,
        error.message
      );

      lastError = error;
    }
  }

  throw lastError || new Error("All Overpass endpoints failed");
}

module.exports = {
  getNearbyPlaces,
  buildQuery,
  detectCategory,
  buildCategorySummary,
  buildLocationSignals,
};