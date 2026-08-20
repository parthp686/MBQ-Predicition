require("dotenv").config();

const Groq = require("groq-sdk");

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is missing from .env");
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function validateRecommendation(result) {
  if (!result || typeof result !== "object") {
    throw new Error("AI returned an invalid response.");
  }

  if (!result.areaType || typeof result.areaType !== "object") {
    throw new Error("AI response is missing areaType.");
  }

  if (!Array.isArray(result.customerSegments)) {
    throw new Error("AI response is missing customerSegments.");
  }

  if (!Array.isArray(result.recommendations)) {
    throw new Error("AI response is missing recommendations.");
  }

  if (!Array.isArray(result.avoidOrLimit)) {
    throw new Error("AI response is missing avoidOrLimit.");
  }

  if (result.recommendations.length < 8) {
    throw new Error(
      `AI returned only ${result.recommendations.length} recommendations. Minimum is 8.`
    );
  }

  if (result.recommendations.length > 15) {
    result.recommendations = result.recommendations.slice(0, 15);
  }

  if (result.customerSegments.length < 3) {
    throw new Error(
      "AI returned fewer than 3 customer segments."
    );
  }

  if (result.customerSegments.length > 6) {
    result.customerSegments = result.customerSegments.slice(0, 6);
  }

  if (result.avoidOrLimit.length < 3) {
    throw new Error(
      "AI returned fewer than 3 avoid/limit products."
    );
  }

  return result;
}

async function generateRecommendation(locationData) {
  if (!locationData || typeof locationData !== "object") {
    throw new Error("locationData must be an object.");
  }

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    temperature: 0.3,

    messages: [
      {
        role: "system",

        content: `
You are an AI retail location advisor for a small mobile
shopping cart operating in India.

Your job is NOT to simply list nearby places.

Your job is to reason about the LOCAL DEMAND POTENTIAL
and suggest what products the cart should initially stock.

BUSINESS MODEL:

The owner operates a small fixed-location cart.

The cart has:

- Limited physical space
- Limited storage
- Limited starting capital
- No large refrigerator
- Preference for products with good shelf life
- Preference for low-cost products
- Preference for products that can sell quickly
- Preference for products suitable for impulse purchases

Typical products include:

- Biscuits
- Chips
- Namkeen
- Bakery products
- Chocolates
- Small packaged snacks
- Bottled water
- Packaged beverages
- Juice
- Tea
- Coffee
- Small convenience products
- Small daily-use products

IMPORTANT BUSINESS OBJECTIVE:

This is the INITIAL STOCKING decision.

The owner wants to understand:

1. What type of area this is
2. Who is likely to buy from the cart
3. What affordable products should be stocked initially
4. Which products should receive higher priority
5. Why each product may perform well
6. Which products should be avoided or kept limited

The goal is to start with a LOW-RISK assortment.

Do NOT recommend large expensive inventory.

Do NOT recommend:

- Large rice bags
- Large wheat bags
- Large cooking oil bottles
- Large grocery packages
- Highly perishable products
- Products requiring expensive refrigeration
- Products requiring large storage space
- Expensive slow-moving inventory

Prefer:

- Small packaged products
- Low-price products
- Fast-moving products
- Long shelf-life products
- Grab-and-go products
- Impulse-buy products
- Products suitable for students
- Products suitable for office workers
- Products suitable for commuters
- Products suitable for hospital visitors/staff
- Products suitable for local residents

AREA ANALYSIS:

Use the supplied location data to identify the most likely
primary area type.

Possible examples:

- hospital area
- student area
- residential area
- office area
- commercial area
- transport area
- mixed commercial area
- food area
- market area
- mixed-use area

You may choose another appropriate area type if the data
supports it.

CUSTOMER SEGMENTS:

Identify 3 to 6 important customer groups.

Examples:

- students
- office workers
- hospital staff
- hospital visitors
- commuters
- local residents
- shoppers
- tourists

PRODUCT RECOMMENDATIONS:

Return between 8 and 15 products.

Sort them from highest priority to lowest priority.

Priority must be exactly one of:

very_high
high
medium
low

IMPORTANT:

Do NOT assume that nearby places guarantee sales.

Location data only provides signals about possible demand.

Use language such as:

"likely demand"
"potential demand"
"may perform well"
"could be useful"

Do not claim certainty.

AFFORDABILITY:

Prefer products that can be sold at affordable small-ticket
prices.

Think about products that a customer could buy quickly
without making a large spending decision.

INITIAL STOCKING:

Think like a small business owner with limited capital.

The recommendations should be practical for the FIRST STOCK.

The owner can later restock based on actual sales.

RETURN ONLY VALID JSON.

Do not use markdown.

Do not add explanations outside JSON.

Use EXACTLY this structure:

{
  "areaType": {
    "primary": "string",
    "confidence": 0.0,
    "reason": "string"
  },

  "customerSegments": [
    {
      "segment": "string",
      "importance": "low | medium | high",
      "reason": "string"
    }
  ],

  "recommendations": [
    {
      "product": "string",
      "priority": "low | medium | high | very_high",
      "reason": "string"
    }
  ],

  "avoidOrLimit": [
    {
      "product": "string",
      "reason": "string"
    }
  ]
}

Rules:

- customerSegments: minimum 3, maximum 6
- recommendations: minimum 8, maximum 15
- avoidOrLimit: minimum 3
- confidence must be between 0 and 1
- priority must be low, medium, high or very_high
- importance must be low, medium or high
- Return valid JSON only
`,
      },

      {
        role: "user",

        content: `
Analyze the following location information.

The data comes from OpenStreetMap/Overpass and represents
nearby places around the proposed cart location.

Use the counts as signals of the type of area.

LOCATION DATA:

${JSON.stringify(locationData, null, 2)}

Remember:

Nearby places do NOT prove that a product will sell.

Use reasonable demand inference rather than certainty.
`,
      },
    ],

    response_format: {
      type: "json_object",
    },

    include_reasoning: false,
  });

  const content = response?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  try {
    const result = JSON.parse(content);

    return validateRecommendation(result);
  } catch (error) {
    console.error("Invalid JSON returned by Groq:");
    console.error(content);

    if (error.message.startsWith("AI response")) {
      throw error;
    }

    throw new Error(
      `AI returned invalid JSON: ${error.message}`
    );
  }
}

module.exports = {
  generateRecommendation,
};