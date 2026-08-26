const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/*
==========================================================
STEP 1
Analyze the area and determine PRODUCT TYPES.
==========================================================
*/

async function generateProductDemand(locationData) {
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    messages: [
      {
        role: "system",
        content: `
You are a retail location advisor for a small mobile cart in India.

Your job is to determine which PRODUCT TYPES are likely
to have demand in the given location.

Analyze:

- nearby places
- hospitals
- clinics
- pharmacies
- schools
- colleges
- offices
- restaurants
- fast food
- cafes
- bus stops
- supermarkets
- markets
- hotels

The cart has:

- limited space
- limited storage
- limited starting capital
- no large refrigerator
- preference for affordable products
- preference for long shelf life
- preference for fast-moving products

Prefer:

- Biscuits
- Snacks
- Namkeen
- Chocolates
- Beverages
- Packaged water
- Juice
- Tea
- Coffee
- Mouth fresheners
- Small convenience products

Avoid:

- large grocery packages
- large rice bags
- large wheat bags
- large oil bottles
- highly perishable products
- expensive refrigerated products

IMPORTANT:

Location data does NOT prove that a product will sell.

Use terms such as:

"likely demand"
"potential demand"
"may perform well"

Return ONLY JSON.

Use exactly this structure:

{
  "areaType": "string",
  "customerSegments": ["string"],
  "productTypes": [
    {
      "type": "string",
      "priority": "very_high",
      "reason": "string"
    }
  ]
}

Rules:

- productTypes: 5 to 12 items
- customerSegments: 3 to 6 items
- priority must be:
  very_high
  high
  medium
  low

Do not use markdown.
Do not add text outside JSON.
`,
      },

      {
        role: "user",
        content: `
Analyze this location:

${JSON.stringify(locationData)}
`,
      },
    ],

    response_format: {
      type: "json_object",
    },

    include_reasoning: false,
  });

  const content = response.choices[0].message.content;

  console.log("");
  console.log("AI PRODUCT DEMAND:");
  console.log(content);

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Invalid JSON returned by Groq:");
    console.error(content);

    throw new Error(
      "AI returned invalid product demand JSON"
    );
  }
}


/*
==========================================================
STEP 2
Select the BEST REAL PRODUCTS from MongoDB.

IMPORTANT:
AI is NOT allowed to invent products.

AI only returns productId values.

Node.js will attach the real product information later.
==========================================================
*/

async function generateFinalRecommendation(
  locationData,
  productDemand,
  products
) {
  const compactProducts = products.map((product) => ({
    productId: String(product.productId),
    productName: product.productName,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    subCategory: product.subCategory,
    mrp: Number(product.mrp || 0),
    cost: Number(product.cost || 0),
    coldChainProduct: Boolean(product.coldChainProduct),
    shelfLife: Number(product.shelfLife || 0),
  }));

  console.log("");
  console.log("STEP 5: AI selecting final products...");
  console.log(
    `Sending ${compactProducts.length} products to final AI`
  );

  const prompt = `
You are a retail product selection advisor for a small mobile cart in India.

The location has the following area characteristics:

${JSON.stringify(locationData.areaAnalysis)}

The AI identified these likely product types:

${JSON.stringify(productDemand.productTypes)}

Below is a list of REAL products from MongoDB.

AVAILABLE PRODUCTS:
${JSON.stringify(compactProducts)}

Your task:

Select the best 8 to 12 products from the supplied list.

IMPORTANT RULES:

1. Select ONLY products from the supplied list.
2. NEVER invent a product.
3. NEVER invent a productId.
4. productId MUST exactly match one supplied productId.
5. Prefer affordable products.
6. Prefer products with long shelf life.
7. Prefer products that do not require refrigeration.
8. Prefer products suitable for a small cart.
9. Prefer products with good margin potential.
10. If cost is greater than MRP, normally avoid the product.
11. Consider the location and customer segments.
12. Consider fast-moving potential.
13. Consider limited starting capital.

Return ONLY JSON.

Use exactly this structure:

{
  "selectedProductIds": [
    "productId"
  ]
}

Rules:

- Select between 8 and 12 products.
- Every ID must exist in AVAILABLE PRODUCTS.
- Do not return product names.
- Do not return SKU.
- Do not return prices.
- Do not return reasons.
- Do not return quantities.
- Do not return markdown.
- Do not return explanations.
`;

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    messages: [
      {
        role: "system",
        content: `
You are a strict JSON product selector.

Return ONLY valid JSON.

You may select ONLY product IDs that appear
in the supplied MongoDB product list.

Never invent IDs.
Never invent products.
`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],

    response_format: {
      type: "json_object",
    },

    include_reasoning: false,
  });

  const content = response.choices[0].message.content;

  console.log("");
  console.log("FINAL AI RAW RESPONSE:");
  console.log(content);

  let result;

  try {
    result = JSON.parse(content);
  } catch (error) {
    console.error("");
    console.error("================================");
    console.error("INVALID FINAL AI JSON");
    console.error("================================");
    console.error(content);
    console.error("================================");

    throw new Error(
      "AI returned invalid final recommendation JSON"
    );
  }

  if (
    !result ||
    !Array.isArray(result.selectedProductIds)
  ) {
    throw new Error(
      "AI response does not contain selectedProductIds"
    );
  }

  const productMap = new Map();

  for (const product of products) {
    productMap.set(
      String(product.productId),
      product
    );
  }

  const validRecommendations = [];

  for (const productId of result.selectedProductIds) {
    const id = String(productId);

    const realProduct = productMap.get(id);

    if (!realProduct) {
      console.warn(
        `Ignoring invalid AI product ID: ${id}`
      );

      continue;
    }

    validRecommendations.push({
      productId: id,

      productName:
        realProduct.productName,

      sku:
        realProduct.sku,

      brand:
        realProduct.brand,

      category:
        realProduct.category,

      subCategory:
        realProduct.subCategory,

      mrp:
        Number(realProduct.mrp || 0),

      cost:
        Number(realProduct.cost || 0),

      coldChainProduct:
        Boolean(
          realProduct.coldChainProduct
        ),

      shelfLife:
        Number(
          realProduct.shelfLife || 0
        ),
    });
  }

  console.log("");
  console.log("================================");
  console.log("FINAL SELECTED PRODUCTS");
  console.log("================================");

  console.log(
    JSON.stringify(
      validRecommendations,
      null,
      2
    )
  );

  return {
    recommendations:
      validRecommendations,

    selectedCount:
      validRecommendations.length,

    summary:
      "Products selected from the production MongoDB based on location demand and cart suitability.",
  };
}


module.exports = {
  generateProductDemand,
  generateFinalRecommendation,
};