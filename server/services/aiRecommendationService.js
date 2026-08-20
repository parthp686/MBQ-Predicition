const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function generateRecommendation(locationData) {
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    messages: [
      {
        role: "system",
        content: `
You are a retail location advisor for a small fixed-location
mobile cart in India.

BUSINESS MODEL:

The owner operates a small cart at one fixed location.

The cart sells:
- Bakery items
- Packaged snacks
- Biscuits
- Namkeen
- Beverages
- Small grocery/convenience products
- Fast-moving daily-use products

The cart has:
- Limited physical space
- Limited storage
- Limited starting capital
- No large refrigerator
- Preference for products with good shelf life
- Preference for products that can sell quickly

Your job is to analyze nearby places and determine what
products this cart should stock.

Analyze:

1. Type of area
2. Likely customer segments
3. Best products to stock
4. Product priority
5. Reason for recommendation
6. Products to avoid or limit

IMPORTANT:

Do NOT recommend products like:
- Large grocery bags
- Large rice/wheat packages
- Large cooking oil bottles
- Products requiring large storage
- Highly perishable products
- Products requiring expensive refrigeration

Prefer:

- Small packaged products
- Bakery products
- Biscuits
- Chips
- Namkeen
- Chocolates
- Packaged drinks
- Bottled water
- Juice
- Tea/coffee
- Small convenience products
- Impulse-buy products
- Fast-moving products

PRODUCT LIMIT:

Return between 8 and 15 recommended products.

Sort recommendations from highest priority
to lowest priority.

Use these priority values:

very_high
high
medium
low

CUSTOMER SEGMENTS:

Identify between 3 and 6 important customer groups.

AREA TYPE:

Give one primary area type and confidence from 0 to 1.

IMPORTANT:

Location data does NOT prove that a product sells.

Use terms such as:
"likely demand"
"potential demand"
"may perform well"

Do not claim certainty.

RETURN ONLY VALID JSON.

Use exactly this structure:

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

The recommendations array MUST contain at least 8 products
and no more than 15 products.

The customerSegments array MUST contain at least 3
and no more than 6 segments.

The avoidOrLimit array MUST contain at least 3 products.

Do not put JSON objects inside strings.

Do not use markdown.

Do not add text before or after the JSON.
`,
      },

      {
        role: "user",
        content: `
Analyze this location:

${JSON.stringify(locationData, null, 2)}
`,
      },
    ],

    response_format: {
      type: "json_object",
    },

    include_reasoning: false,
  });

  const content = response.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Invalid JSON returned by Groq:");
    console.error(content);

    throw new Error("AI returned invalid JSON");
  }
}

module.exports = {
  generateRecommendation,
};  