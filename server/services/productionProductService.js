const { MongoClient } = require("mongodb");

const uri = process.env.PRODUCTION_MONGODB_URI;

const client = new MongoClient(uri);

async function connectProductionDB() {
  if (!client.topology || client.topology.isDestroyed()) {
    await client.connect();
  }

  return client.db("rever_uat");
}

/*
==========================================================
GET ACTUAL PRODUCT TAXONOMY
==========================================================

We don't hardcode every category/subcategory.

MongoDB is the source of truth.
*/
async function getProductTaxonomy() {
  const db = await connectProductionDB();

  const productsCollection = db.collection("products");

  const filter = {
    isActive: true,
    isEnabled: true,
  };

  const [categories, subCategories] = await Promise.all([
    productsCollection.distinct("category.name", filter),
    productsCollection.distinct("subCategory.name", filter),
  ]);

  return {
    categories: categories
      .filter(Boolean)
      .map(String),

    subCategories: subCategories
      .filter(Boolean)
      .map(String),
  };
}

/*
==========================================================
NORMALIZE TEXT
==========================================================
*/

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
==========================================================
CREATE SEARCH TERMS
==========================================================

AI gives us broad product types.

Example:

"Biscuits"

We search against the REAL MongoDB taxonomy and product
fields instead of maintaining a huge manual keyword map.
==========================================================
*/

function buildSearchTerms(productTypes, taxonomy) {
  const terms = [];

  const allTaxonomyValues = [
    ...(taxonomy.categories || []),
    ...(taxonomy.subCategories || []),
  ];

  for (const productType of productTypes) {
    const normalizedType = normalizeText(productType);

    if (!normalizedType) {
      continue;
    }

    /*
    Add the AI product type itself.
    */
    terms.push(normalizedType);

    /*
    Find matching categories/subcategories from MongoDB.
    
    Example:
    
    AI:
    "Biscuits"

    MongoDB:
    "Biscuits& Cookies"

    -> match
    */
    for (const taxonomyValue of allTaxonomyValues) {
      const normalizedTaxonomy = normalizeText(
        taxonomyValue
      );

      if (
        normalizedTaxonomy.includes(normalizedType) ||
        normalizedType.includes(normalizedTaxonomy)
      ) {
        terms.push(normalizedTaxonomy);
      }
    }
  }

  /*
  Remove duplicates.
  */
  return [...new Set(terms)];
}

/*
==========================================================
SEARCH PRODUCTION PRODUCTS
==========================================================
*/

async function searchProductsByTypes(
  productTypes,
  limit = 150
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
  Get the real taxonomy from MongoDB.
  */
  const taxonomy = await getProductTaxonomy();

  /*
  Build search terms dynamically.
  */
  const searchTerms = buildSearchTerms(
    productTypes,
    taxonomy
  );

  console.log("");
  console.log("--------------------------------");
  console.log("PRODUCTION PRODUCT SEARCH");
  console.log("--------------------------------");

  console.log("Requested product types:");
  console.log(productTypes);

  console.log("");
  console.log("Actual MongoDB categories:");
  console.log(taxonomy.categories);

  console.log("");
  console.log("Actual MongoDB subcategories:");
  console.log(taxonomy.subCategories);

  console.log("");
  console.log("Dynamic search terms:");
  console.log(searchTerms);

  /*
  ========================================================
  BUILD REGEX CONDITIONS
  ========================================================
  */

  const regexConditions = [];

  for (const term of searchTerms) {
    const regex = new RegExp(term, "i");

    /*
    Search category first.
    Then subcategory.
    Then product name.
    Then brand.
    */

    regexConditions.push({
      "category.name": regex,
    });

    regexConditions.push({
      "subCategory.name": regex,
    });

    regexConditions.push({
      modelName: regex,
    });

    regexConditions.push({
      "brand.name": regex,
    });
  }

  /*
  ========================================================
  QUERY MONGODB
  ========================================================
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

  console.log("");
  console.log(
    `Candidate products found: ${products.length}`
  );

  /*
  ========================================================
  RETURN ONLY REQUIRED FIELDS
  ========================================================
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
  getProductTaxonomy,
};