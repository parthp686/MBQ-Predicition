function analyzePlaces(places) {
  const counts = {};

  places.forEach((place) => {
    const type = place.primaryType;

    if (!type) return;

    counts[type] = (counts[type] || 0) + 1;
  });

  return counts;
}

module.exports = {
  analyzePlaces,
};