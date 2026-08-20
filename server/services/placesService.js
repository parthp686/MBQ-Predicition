const axios = require("axios");

const OVERPASS_URL =
  "https://overpass-api.de/api/interpreter";

async function getNearbyPlaces(latitude, longitude, radius) {
  const query = `
    [out:json][timeout:25];

    (
      nwr["amenity"="school"](around:${radius},${latitude},${longitude});
      nwr["amenity"="college"](around:${radius},${latitude},${longitude});
      nwr["tourism"="hotel"](around:${radius},${latitude},${longitude});
      nwr["amenity"="restaurant"](around:${radius},${latitude},${longitude});
      nwr["amenity"="fast_food"](around:${radius},${latitude},${longitude});
      nwr["amenity"="hospital"](around:${radius},${latitude},${longitude});
      nwr["shop"="supermarket"](around:${radius},${latitude},${longitude});
      nwr["shop"="convenience"](around:${radius},${latitude},${longitude});
      nwr["highway"="bus_stop"](around:${radius},${latitude},${longitude});
      nwr["amenity"="marketplace"](around:${radius},${latitude},${longitude});
      nwr["leisure"="fitness_centre"](around:${radius},${latitude},${longitude});
      nwr["office"](around:${radius},${latitude},${longitude});
    );

    out center tags;
  `;

  const response = await axios.post(
    OVERPASS_URL,
    query,
    {
      headers: {
        "Content-Type": "text/plain",
        "User-Agent": "cart-location-mvp/1.0",
      },
    }
  );

  return response.data.elements || [];
}

module.exports = {
  getNearbyPlaces,
};