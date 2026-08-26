const { MongoClient } = require("mongodb");

const uri = process.env.PRODUCTION_MONGODB_URI;

if (!uri) {
  throw new Error(
    "PRODUCTION_MONGODB_URI is not defined in .env"
  );
}

const client = new MongoClient(uri);

let isConnected = false;

async function connectProductionDB() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;

    console.log("Production MongoDB connected.");
  }

  return client.db("rever_uat");
}

/**
 * Search real products from production MongoDB.
 *
 * AI gives us product TYPES such as:
 * - Biscuits
 * - Namkeen
 * - Chocolates
 * - Beverages
 *
 * This function converts those types into MongoDB
 * search keywords and returns real products.
 */
async function searchProductsByTypes(
  productTypes,
  limit = 30
) {
  if (
    !Array.isArray(productTypes) ||
    productTypes.length === 0
  ) {
    return [];
  }

  const db = await connectProductionDB();

  const productsCollection =
    db.collection("products");

  // ==========================================
  // AI PRODUCT TYPE → SEARCH KEYWORDS
  // ==========================================

  const keywordMap = {
    "packaged water": [
      "water",
      "mineral water",
      "drinking water",
    ],

    "tea/coffee sachets": [
      "tea",
      "coffee",
      "chai",
      "instant coffee",
    ],

    tea: [
      "tea",
      "chai",
    ],

    coffee: [
      "coffee",
      "cold coffee",
      "instant coffee",
    ],

    biscuits: [
      "biscuit",
      "biscuits",
      "cookie",
      "cookies",
    ],

    snacks: [
      "snack",
      "snacks",
      "chips",
      "savory",
    ],

    namkeen: [
      "namkeen",
      "mixture",
      "sev",
      "bhujia",
      "chips",
      "savory",
    ],

    "mouth fresheners": [
      "mouth fresh",
      "mint",
      "gum",
      "mouth freshener",
      "mukhwas",
    ],

    "juice sachets": [
      "juice",
      "fruit drink",
      "fruit juice",
      "drink",
    ],

    juice: [
      "juice",
      "fruit drink",
      "fruit juice",
    ],

    beverages: [
      "beverage",
      "beverages",
      "drink",
      "juice",
      "coffee",
      "tea",
    ],

    chocolates: [
      "chocolate",
      "candy",
      "confectionery",
      "munch",
      "kitkat",
      "milkybar",
    ],

    "snack packs (e.g. mixed nuts, raisins)": [
      "nuts",
      "almond",
      "cashew",
      "raisin",
      "peanut",
      "snack",
    ],
  };

  // ==========================================
  // BUILD SEARCH KEYWORDS
  // ==========================================

  const keywords = [];

  for (const type of productTypes) {
    const normalized = String(type)
      .trim()
      .toLowerCase();

    if (keywordMap[normalized]) {
      keywords.push(
        ...keywordMap[normalized]
      );
    } else {
      // If AI gives a new product type
      // that is not in our keyword map,
      // use that type directly.
      keywords.push(normalized);
    }
  }

  // Remove duplicates
  const uniqueKeywords = [
    ...new Set(keywords),
  ];

  console.log("");

  console.log(
    "MongoDB product search keywords:"
  );

  console.log(uniqueKeywords);

  // ==========================================
  // CREATE MONGODB SEARCH CONDITIONS
  // ==========================================

  const regexConditions =
    uniqueKeywords.map((keyword) => {
      const regex = new RegExp(
        escapeRegex(keyword),
        "i"
      );

      return {
        $or: [
          {
            modelName: regex,
          },
          {
            "category.name": regex,
          },
          {
            "subCategory.name": regex,
          },
          {
            "brand.name": regex,
          },
        ],
      };
    });

  // ==========================================
  // QUERY PRODUCTION PRODUCTS
  // ==========================================

  const products =
    await productsCollection
      .find({
        isActive: true,
        isEnabled: true,

        $or: regexConditions,
      })
      .limit(limit)
      .toArray();

  console.log(
    `Products returned from MongoDB: ${products.length}`
  );

  // ==========================================
  // RETURN ONLY USEFUL PRODUCT INFORMATION
  // ==========================================

  return products.map((product) => ({
    productId:
      product._id.toString(),

    productName:
      product.modelName || "",

    sku:
      product.productSku || "",

    brand:
      product.brand?.name || "",

    category:
      product.category?.name || "",

    subCategory:
      product.subCategory?.name || "",

    mrp:
      Number(product.mrp || 0),

    cost:
      Number(
        product.cost ||
        product.netRate ||
        0
      ),

    coldChainProduct:
      Boolean(
        product.coldChainProduct
      ),

    shelfLife:
      Number(
        product.shelfLife || 0
      ),

    isActive:
      Boolean(product.isActive),

    isEnabled:
      Boolean(product.isEnabled),
  }));
}

/**
 * Escape special regex characters.
 *
 * This prevents a keyword from accidentally
 * becoming a regex pattern.
 */
function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

module.exports = {
  searchProductsByTypes,
};