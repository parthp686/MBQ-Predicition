const {
  getNearbyPlaces,
} = require("./services/overpassService");

async function test() {
  console.log("=== TEST OVERPASS STARTED ===");

  console.log(
    "Service loaded:",
    typeof getNearbyPlaces
  );

  try {
    console.log("Starting Overpass test...");
    console.log("Calling getNearbyPlaces()...");

    const result = await getNearbyPlaces(
      22.69275,
      75.867639,
      1000
    );

    console.log("\n=== RESULT ===");

    console.log("Success:", result.success);
    console.log("Total places:", result.count);

    console.log("\n=== CATEGORY SUMMARY ===");
    console.log(
      JSON.stringify(
        result.categorySummary,
        null,
        2
      )
    );

    console.log("\n=== WORKER SIGNALS ===");
    console.log(
      JSON.stringify(
        result.signals.worker,
        null,
        2
      )
    );

    console.log("\n=== ALL SIGNALS ===");
    console.log(
      JSON.stringify(
        result.signals,
        null,
        2
      )
    );

    console.log("\n=== FIRST 20 PLACES ===");

    result.places
      .slice(0, 20)
      .forEach((place, index) => {
        console.log(
          `${index + 1}.`,
          {
            id: place.id,
            name: place.name,
            category: place.category,
            lat: place.lat,
            lon: place.lon,
          }
        );
      });

    console.log("\n=== TEST OVERPASS FINISHED ===");
  } catch (error) {
    console.error(
      "\nOverpass test failed:"
    );

    console.error(error);
  }
}

test();