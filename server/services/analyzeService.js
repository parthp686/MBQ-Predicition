function analyzePlaces(elements) {
  const result = {
    schools: 0,
    colleges: 0,
    hotels: 0,
    restaurants: 0,
    fastFood: 0,
    hospitals: 0,
    supermarkets: 0,
    convenienceStores: 0,
    busStops: 0,
    markets: 0,
    gyms: 0,
    offices: 0,
  };

  for (const element of elements) {
    const tags = element.tags || {};

    if (tags.amenity === "school") {
      result.schools++;
    }

    if (tags.amenity === "college") {
      result.colleges++;
    }

    if (tags.tourism === "hotel") {
      result.hotels++;
    }

    if (tags.amenity === "restaurant") {
      result.restaurants++;
    }

    if (tags.amenity === "fast_food") {
      result.fastFood++;
    }

    if (tags.amenity === "hospital") {
      result.hospitals++;
    }

    if (tags.shop === "supermarket") {
      result.supermarkets++;
    }

    if (tags.shop === "convenience") {
      result.convenienceStores++;
    }

    if (tags.highway === "bus_stop") {
      result.busStops++;
    }

    if (tags.amenity === "marketplace") {
      result.markets++;
    }

    if (tags.leisure === "fitness_centre") {
      result.gyms++;
    }

    if (tags.office) {
      result.offices++;
    }
  }

  return result;
}

module.exports = {
  analyzePlaces,
};