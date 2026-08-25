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
 */
async function searchProductsByTypes(
  productTypes,
  limit = 50
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

  /*
   * Convert AI product types into searchable keywords.
   */

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


  /*
   * Build keywords from AI response.
   */

  const keywords = [];

  for (const type of productTypes) {
    const normalized =
      String(type)
        .trim()
        .toLowerCase();

    if (keywordMap[normalized]) {
      keywords.push(
        ...keywordMap[normalized]
      );
    } else {
      keywords.push(normalized);
    }
  }


  /*
   * Remove duplicate keywords.
   */

  const uniqueKeywords = [
    ...new Set(keywords),
  ];


  /*
   * Create MongoDB regex conditions.
   */

  const regexConditions =
    uniqueKeywords.map((keyword) => {
      const regex =
        new RegExp(keyword, "i");

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


  console.log("");
  console.log(
    "MongoDB product search keywords:"
  );

  console.log(uniqueKeywords);


  /*
   * Query production products.
   */

  const products =
    await productsCollection
      .find({
        isActive: true,
        isEnabled: true,

        $or: regexConditions,
      })
      .limit(limit)
      .toArray();


  /*
   * Return only fields needed by the AI.
   */

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


module.exports = {
  searchProductsByTypes,
};