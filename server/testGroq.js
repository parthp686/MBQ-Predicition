// require("dotenv").config();

// const Groq = require("groq-sdk");

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// async function test() {
//   try {
//     const response = await groq.chat.completions.create({
//       model: "openai/gpt-oss-20b",

//       messages: [
//         {
//           role: "system",
//           content: "You are a helpful assistant.",
//         },
//         {
//           role: "user",
//           content:
//             "Explain in one sentence what a kirana store is.",
//         },
//       ],

//       include_reasoning: false,
//     });

//     console.log("\n===== GROQ RESPONSE =====\n");

//     console.log(
//       response.choices[0].message.content
//     );

//   } catch (error) {
//     console.error("Groq error:", error);
//   }
// }

// test();
require("dotenv").config();

const {
  generateRecommendation,
} = require("./services/aiRecommendationService");

async function test() {
  const locationData = {
    location: {
      latitude: 21.2514,
      longitude: 81.6296,
      radius: 1000,
    },

    nearbyPlaces: {
      schools: 8,
      colleges: 2,
      hotels: 3,
      restaurants: 14,
      fastFood: 6,
      hospitals: 1,
      supermarkets: 4,
      convenienceStores: 7,
      busStops: 9,
      markets: 2,
      gyms: 3,
      offices: 15,
    },
  };

  try {
    const result =
      await generateRecommendation(locationData);

    console.log("\n===== LOCATION AGENT =====\n");

    console.log(
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.error("AI error:", error);
  }
}

test();