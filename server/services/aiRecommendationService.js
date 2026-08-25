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
  /*
  Keep the candidate data small.

  The AI does NOT need the complete MongoDB document.
  */

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

  /*
  IMPORTANT:

  We don't ask the AI to reproduce all product information.

  It only needs to return IDs and recommendation information.
  */

  const prompt = `
AREA ANALYSIS:

${JSON.stringify(locationData.areaAnalysis)}

PRODUCT DEMAND:

${JSON.stringify(productDemand.productTypes)}

AVAILABLE MONGODB PRODUCTS:

${JSON.stringify(compactProducts)}

TASK:

Select the best products for the cart.

IMPORTANT RULES:

1. Select ONLY products from AVAILABLE MONGODB PRODUCTS.

2. NEVER invent a product.

3. NEVER invent a productId.

4. NEVER invent a SKU.

5. A productId in the answer MUST exactly match
   one of the supplied productId values.

6. Prefer affordable products.

7. Prefer products with long shelf life.

8. Prefer products that do not require refrigeration.

9. Prefer products suitable for a small cart.

10. If cost is greater than MRP, normally avoid that product.

11. Consider likely demand from the area.

12. Consider limited starting capital.

13. Consider fast-moving potential.

Return ONLY JSON.

Use exactly this structure:

{
  "recommendations": [
    {
      "productId": "EXACT_PRODUCT_ID_FROM_LIST",
      "priority": "very_high",
      "suggestedInitialQuantity": 5,
      "reason": "short reason"
    }
  ],
  "productsToAvoidOrLimit": [
    {
      "productId": "EXACT_PRODUCT_ID_FROM_LIST",
      "reason": "short reason"
    }
  ],
  "summary": "short summary"
}

Rules:

- recommendations: 8 to 12 products
- productsToAvoidOrLimit: 3 to 5 products
- suggestedInitialQuantity must be a positive integer
- priority must be one of:
  very_high
  high
  medium
  low

Return JSON only.
Do not use markdown.
Do not add text outside JSON.
`;

  /*
  --------------------------------------------------------
  Call Groq
  --------------------------------------------------------
  */

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    messages: [
      {
        role: "system",
        content: `
You are a strict JSON-producing retail inventory advisor.

You MUST follow the requested JSON structure.

You MUST select products only from the supplied list.

Never invent IDs.

Never invent products.

Return JSON only.
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

  /*
  --------------------------------------------------------
  Parse JSON
  --------------------------------------------------------
  */

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

  /*
  --------------------------------------------------------
  Validate AI response structure
  --------------------------------------------------------
  */

  if (
    !result ||
    !Array.isArray(result.recommendations)
  ) {
    throw new Error(
      "AI response does not contain recommendations array"
    );
  }

  if (
    !Array.isArray(result.productsToAvoidOrLimit)
  ) {
    throw new Error(
      "AI response does not contain productsToAvoidOrLimit array"
    );
  }

  /*
  --------------------------------------------------------
  Build lookup table of REAL MongoDB products.
  --------------------------------------------------------
  */

  const productMap = new Map();

  for (const product of products) {
    productMap.set(
      String(product.productId),
      product
    );
  }

  /*
  --------------------------------------------------------
  Validate recommendations.

  This is VERY important.

  The AI cannot create fake products.
  --------------------------------------------------------
  */

  const validRecommendations = [];

  for (const recommendation of result.recommendations) {
    const productId = String(
      recommendation.productId || ""
    );

    const realProduct = productMap.get(productId);

    if (!realProduct) {
      console.warn(
        `Ignoring AI-selected product not found in MongoDB: ${productId}`
      );

      continue;
    }

    validRecommendations.push({
      productId: productId,

      productName: realProduct.productName,

      sku: realProduct.sku,

      brand: realProduct.brand,

      category: realProduct.category,

      subCategory: realProduct.subCategory,

      mrp: Number(realProduct.mrp || 0),

      cost: Number(realProduct.cost || 0),

      coldChainProduct: Boolean(
        realProduct.coldChainProduct
      ),

      shelfLife: Number(
        realProduct.shelfLife || 0
      ),

      priority:
        recommendation.priority || "medium",

      suggestedInitialQuantity:
        Number(
          recommendation.suggestedInitialQuantity || 1
        ),

      reason:
        recommendation.reason ||
        "Potentially suitable for this location.",
    });
  }

  /*
  --------------------------------------------------------
  Validate products to avoid/limit.
  --------------------------------------------------------
  */

  const validProductsToAvoidOrLimit = [];

  for (
    const recommendation of result.productsToAvoidOrLimit
  ) {
    const productId = String(
      recommendation.productId || ""
    );

    const realProduct = productMap.get(productId);

    if (!realProduct) {
      console.warn(
        `Ignoring invalid avoid product: ${productId}`
      );

      continue;
    }

    validProductsToAvoidOrLimit.push({
      productId: productId,

      productName: realProduct.productName,

      sku: realProduct.sku,

      brand: realProduct.brand,

      category: realProduct.category,

      subCategory: realProduct.subCategory,

      mrp: Number(realProduct.mrp || 0),

      cost: Number(realProduct.cost || 0),

      reason:
        recommendation.reason ||
        "Limited priority for this location.",
    });
  }

  /*
  --------------------------------------------------------
  Final result.
  --------------------------------------------------------
  */

  return {
    recommendations: validRecommendations,

    productsToAvoidOrLimit:
      validProductsToAvoidOrLimit,

    summary:
      result.summary ||
      "Products selected based on location and product characteristics.",
  };
}


module.exports = {
  generateProductDemand,
  generateFinalRecommendation,
};