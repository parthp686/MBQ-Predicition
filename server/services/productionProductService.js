const { MongoClient } = require("mongodb");

const uri = process.env.PRODUCTION_MONGODB_URI;

const client = new MongoClient(uri);

async function connectProductionDB() {
  if (!client.topology || client.topology.isDestroyed()) {
    await client.connect();
  }

  return client.db("rever_uat");
}

/**
 * Search real products from production MongoDB.
 *
 * IMPORTANT:
 * This function returns CANDIDATES.
 * It does NOT decide the final store assortment.
 */
async function searchProductsByTypes(productTypes, limit = 150) {
  if (!Array.isArray(productTypes) || productTypes.length === 0) {
    return [];
  }

  const db = await connectProductionDB();

  const productsCollection = db.collection("products");

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

    biscuits: [
      "biscuit",
      "biscuits",
      "cookie",
      "cookies",
    ],

    namkeen: [
      "namkeen",
      "mixture",
      "sev",
      "bhujia",
      "chips",
      "savory",
    ],

    snacks: [
      "snack",
      "chips",
      "namkeen",
      "mixture",
      "sev",
      "bhujia",
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
      "drink",
      "juice",
      "water",
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

  const keywords = [];

  for (const type of productTypes) {
    const normalized = String(type)
      .trim()
      .toLowerCase();

    if (keywordMap[normalized]) {
      keywords.push(...keywordMap[normalized]);
    } else {
      keywords.push(normalized);
    }
  }

  const uniqueKeywords = [...new Set(keywords)];

  console.log("");
  console.log("--------------------------------");
  console.log("PRODUCTION PRODUCT SEARCH");
  console.log("--------------------------------");
  console.log("Requested product types:");
  console.log(productTypes);

  console.log("");
  console.log("Search keywords:");
  console.log(uniqueKeywords);

  /**
   * Build MongoDB search conditions.
   */
  const regexConditions = uniqueKeywords.map((keyword) => {
    const escapedKeyword = keyword.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(escapedKeyword, "i");

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

  /**
   * Only active/enabled production products.
   */
  const products = await productsCollection
    .find({
      isActive: true,
      isEnabled: true,
      $or: regexConditions,
    })
    .limit(limit)
    .toArray();

  console.log("");
  console.log(`Candidate products found: ${products.length}`);

  /**
   * Return only the fields required by the
   * assortment/ranking layer.
   */
  return products.map((product) => ({
    productId: product._id.toString(),

    productName: product.modelName || "",

    sku: product.productSku || "",

    brand: product.brand?.name || "",

    category: product.category?.name || "",

    subCategory: product.subCategory?.name || "",

    mrp: Number(product.mrp || 0),

    cost: Number(
      product.cost ||
      product.netRate ||
      0
    ),

    coldChainProduct: Boolean(
      product.coldChainProduct
    ),

    shelfLife: Number(
      product.shelfLife || 0
    ),

    isActive: Boolean(product.isActive),

    isEnabled: Boolean(product.isEnabled),
  }));
}

module.exports = {
  searchProductsByTypes,
};