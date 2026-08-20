function getRecommendations(places) {
  const recommendations = [];

  // Schools / colleges
  if (places.schools + places.colleges >= 3) {
    recommendations.push({
      product: "Biscuits",
      priority: "HIGH",
      reason: "Many students nearby",
    });

    recommendations.push({
      product: "Chips",
      priority: "HIGH",
      reason: "Many students nearby",
    });

    recommendations.push({
      product: "Juice",
      priority: "HIGH",
      reason: "Many students nearby",
    });

    recommendations.push({
      product: "Chocolate",
      priority: "MEDIUM",
      reason: "Many students nearby",
    });
  }

  // Restaurants / hotels
  if (places.hotels + places.restaurants >= 5) {
    recommendations.push({
      product: "Packaged Water",
      priority: "HIGH",
      reason: "High food/hospitality activity",
    });

    recommendations.push({
      product: "Cold Drinks",
      priority: "HIGH",
      reason: "High food/hospitality activity",
    });
  }

  // Bus stops
  if (places.busStops >= 5) {
    recommendations.push({
      product: "Water",
      priority: "HIGH",
      reason: "High pedestrian/transit activity",
    });

    recommendations.push({
      product: "Biscuits",
      priority: "HIGH",
      reason: "High pedestrian/transit activity",
    });
  }

  // Offices
  if (places.offices >= 5) {
    recommendations.push({
      product: "Tea/Coffee",
      priority: "MEDIUM",
      reason: "Many offices nearby",
    });

    recommendations.push({
      product: "Biscuits",
      priority: "MEDIUM",
      reason: "Many offices nearby",
    });
  }

  // Always useful for a small cart
  recommendations.push({
    product: "Packaged Water",
    priority: "HIGH",
    reason: "Basic fast-moving product",
  });

  return recommendations;
}

module.exports = {
  getRecommendations,
};