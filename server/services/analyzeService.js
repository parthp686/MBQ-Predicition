function analyzePlaces(elements) {
  const result = {
    totalPlaces: 0,

    schools: 0,
    colleges: 0,
    universities: 0,

    hospitals: 0,
    clinics: 0,
    pharmacies: 0,

    hotels: 0,

    restaurants: 0,
    fastFood: 0,
    cafes: 0,
    foodCourts: 0,

    supermarkets: 0,
    convenienceStores: 0,
    bakeries: 0,
    departmentStores: 0,

    busStops: 0,
    markets: 0,

    gyms: 0,
    offices: 0,

    other: 0,
  };

  if (!Array.isArray(elements)) {
    return result;
  }

  result.totalPlaces = elements.length;

  for (const element of elements) {
    const tags = element.tags || {};

    /*
     * EDUCATION
     */
    if (tags.amenity === "school") {
      result.schools++;
    }

    if (tags.amenity === "college") {
      result.colleges++;
    }

    if (tags.amenity === "university") {
      result.universities++;
    }

    /*
     * HEALTHCARE
     */
    if (tags.amenity === "hospital") {
      result.hospitals++;
    }

    if (tags.amenity === "clinic") {
      result.clinics++;
    }

    if (tags.amenity === "pharmacy") {
      result.pharmacies++;
    }

    /*
     * HOTELS
     */
    if (tags.tourism === "hotel") {
      result.hotels++;
    }

    /*
     * FOOD
     */
    if (tags.amenity === "restaurant") {
      result.restaurants++;
    }

    if (tags.amenity === "fast_food") {
      result.fastFood++;
    }

    if (tags.amenity === "cafe") {
      result.cafes++;
    }

    if (tags.amenity === "food_court") {
      result.foodCourts++;
    }

    /*
     * SHOPS
     */
    if (tags.shop === "supermarket") {
      result.supermarkets++;
    }

    if (tags.shop === "convenience") {
      result.convenienceStores++;
    }

    if (tags.shop === "bakery") {
      result.bakeries++;
    }

    if (tags.shop === "department_store") {
      result.departmentStores++;
    }

    /*
     * TRANSPORT
     */
    if (tags.highway === "bus_stop") {
      result.busStops++;
    }

    /*
     * MARKET
     */
    if (tags.amenity === "marketplace") {
      result.markets++;
    }

    /*
     * FITNESS
     */
    if (tags.leisure === "fitness_centre") {
      result.gyms++;
    }

    /*
     * OFFICES
     */
    if (tags.office) {
      result.offices++;
    }
  }

  /*
   * Anything that didn't fall into the categories above.
   */
  result.other =
    result.totalPlaces -
    (
      result.schools +
      result.colleges +
      result.universities +
      result.hospitals +
      result.clinics +
      result.pharmacies +
      result.hotels +
      result.restaurants +
      result.fastFood +
      result.cafes +
      result.foodCourts +
      result.supermarkets +
      result.convenienceStores +
      result.bakeries +
      result.departmentStores +
      result.busStops +
      result.markets +
      result.gyms +
      result.offices
    );

  if (result.other < 0) {
    result.other = 0;
  }

  return result;
}

module.exports = {
  analyzePlaces,
};