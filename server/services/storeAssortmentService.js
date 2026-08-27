/**
 * Build the initial store assortment.
 *
 * MongoDB gives us real products.
 * AI tells us what product TYPES are likely to
 * perform well in the location.
 *
 * Node.js decides which actual products should
 * enter the initial store.
 *
 * No second AI call is required.
 */

/**
 * Convert AI priority into a numeric score.
 */
function getDemandPriorityScore(priority) {
  switch (String(priority || "").toLowerCase()) {
    case "very_high":
      return 40;

    case "high":
      return 30;

    case "medium":
      return 20;

    case "low":
      return 10;

    default:
      return 0;
  }
}

/**
 * Determine the area's price sensitivity.
 *
 * This is intentionally based on the area characteristics
 * already calculated by analyzeService.js.
 *
 * We are NOT claiming to know the actual income of people
 * in the area.
 *
 * This is only a purchasing/price-sensitivity estimate.
 */
function determinePriceSensitivity(areaAnalysis = {}) {
  const hospitals = Number(areaAnalysis.hospitals || 0);
  const clinics = Number(areaAnalysis.clinics || 0);
  const pharmacies = Number(areaAnalysis.pharmacies || 0);

  const schools = Number(areaAnalysis.schools || 0);
  const colleges = Number(areaAnalysis.colleges || 0);
  const universities = Number(
    areaAnalysis.universities || 0
  );

  const offices = Number(areaAnalysis.offices || 0);

  const hotels = Number(areaAnalysis.hotels || 0);
  const restaurants = Number(
    areaAnalysis.restaurants || 0
  );
  const cafes = Number(areaAnalysis.cafes || 0);

  const supermarkets = Number(
    areaAnalysis.supermarkets || 0
  );

  const busStops = Number(areaAnalysis.busStops || 0);

  /**
   * Value-oriented locations:
   *
   * Hospitals, clinics, pharmacies, students and
   * commuters generally support a strong affordable
   * impulse-purchase mix.
   */
  const valueScore =
    hospitals * 2 +
    clinics +
    pharmacies +
    schools * 2 +
    colleges * 2 +
    universities * 2 +
    busStops * 2;

  /**
   * Higher-price-capacity signals:
   *
   * Offices, hotels, restaurants, cafes and supermarkets
   * can support some higher-priced products.
   *
   * These are only signals, not proof of income.
   */
  const premiumScore =
    offices * 2 +
    hotels * 3 +
    restaurants * 2 +
    cafes * 2 +
    supermarkets * 2;

  /**
   * Decide price sensitivity.
   */
  const difference = valueScore - premiumScore;

  if (difference >= 25) {
    return "high";
  }

  if (difference >= 10) {
    return "medium_high";
  }

  if (difference <= -20) {
    return "low";
  }

  if (difference <= -5) {
    return "medium_low";
  }

  return "medium";
}

/**
 * Price score.
 *
 * The same product gets a different score depending
 * on the location's estimated price sensitivity.
 */
function calculatePriceScore(
  product,
  priceSensitivity
) {
  const mrp = Number(product.mrp || 0);

  if (mrp <= 0) {
    return -20;
  }

  switch (priceSensitivity) {
    /**
     * Strong preference for affordable products.
     */
    case "high":
      if (mrp <= 10) return 25;
      if (mrp <= 20) return 22;
      if (mrp <= 30) return 16;
      if (mrp <= 50) return 10;
      if (mrp <= 100) return 2;

      return -10;

    /**
     * Slight preference for affordable products.
     */
    case "medium_high":
      if (mrp <= 10) return 20;
      if (mrp <= 20) return 20;
      if (mrp <= 30) return 18;
      if (mrp <= 50) return 14;
      if (mrp <= 100) return 6;

      return 0;

    /**
     * Balanced price mix.
     */
    case "medium":
      if (mrp <= 10) return 15;
      if (mrp <= 20) return 18;
      if (mrp <= 30) return 18;
      if (mrp <= 50) return 18;
      if (mrp <= 100) return 10;

      return 3;

    /**
     * Slightly more room for expensive products.
     */
    case "medium_low":
      if (mrp <= 10) return 10;
      if (mrp <= 20) return 14;
      if (mrp <= 30) return 18;
      if (mrp <= 50) return 20;
      if (mrp <= 100) return 18;

      return 8;

    /**
     * More premium-oriented mix.
     */
    case "low":
      if (mrp <= 10) return 5;
      if (mrp <= 20) return 8;
      if (mrp <= 30) return 14;
      if (mrp <= 50) return 20;
      if (mrp <= 100) return 25;

      return 20;

    default:
      return 10;
  }
}

/**
 * Calculate margin score.
 */
function calculateMarginScore(product) {
  const mrp = Number(product.mrp || 0);
  const cost = Number(product.cost || 0);

  if (mrp <= 0 || cost <= 0) {
    return 0;
  }

  const margin =
    ((mrp - cost) / mrp) * 100;

  if (margin >= 40) {
    return 35;
  }

  if (margin >= 30) {
    return 30;
  }

  if (margin >= 20) {
    return 20;
  }

  if (margin >= 10) {
    return 10;
  }

  if (margin >= 0) {
    return 3;
  }

  return -40;
}

/**
 * Calculate shelf-life score.
 */
function calculateShelfLifeScore(product) {
  const shelfLife = Number(
    product.shelfLife || 0
  );

  if (shelfLife >= 365) {
    return 20;
  }

  if (shelfLife >= 180) {
    return 15;
  }

  if (shelfLife >= 90) {
    return 10;
  }

  if (shelfLife >= 30) {
    return 5;
  }

  if (shelfLife > 0) {
    return -10;
  }

  return 0;
}

/**
 * Calculate cold-chain score.
 */
function calculateColdChainScore(product) {
  if (product.coldChainProduct) {
    return -30;
  }

  return 10;
}

/**
 * Get the product type/category represented by a product.
 *
 * We use MongoDB's category and subCategory fields
 * because these are actual database fields.
 */
function getProductCategory(product) {
  return (
    product.category ||
    product.subCategory ||
    "Other"
  )
    .toString()
    .trim()
    .toLowerCase();
}

/**
 * Determine how well a real MongoDB product matches
 * one of the product types identified by AI.
 *
 * Example:
 *
 * AI says:
 *   Biscuits
 *
 * MongoDB product:
 *   Parle Hide & Seek
 *
 * category/subCategory:
 *   Biscuits
 *
 * → strong match.
 */
function calculateDemandMatchScore(
  product,
  productDemand
) {
  const productTypes =
    productDemand?.productTypes;

  if (!Array.isArray(productTypes)) {
    return 0;
  }

  const productText = [
    product.productName,
    product.brand,
    product.category,
    product.subCategory,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let bestScore = 0;

  for (const demand of productTypes) {
    const type = String(
      demand?.type || ""
    )
      .trim()
      .toLowerCase();

    if (!type) {
      continue;
    }

    const priorityScore =
      getDemandPriorityScore(
        demand.priority
      );

    /**
     * Direct text match.
     */
    if (productText.includes(type)) {
      bestScore = Math.max(
        bestScore,
        priorityScore
      );

      continue;
    }

    /**
     * Basic aliases.
     */
    const aliases = {
      biscuit: [
        "biscuit",
        "biscuits",
        "cookie",
        "cookies",
      ],

      biscuits: [
        "biscuit",
        "biscuits",
        "cookie",
        "cookies",
      ],

      tea: [
        "tea",
        "chai",
      ],

      coffee: [
        "coffee",
      ],

      namkeen: [
        "namkeen",
        "sev",
        "bhujia",
        "mixture",
        "chips",
      ],

      chocolates: [
        "chocolate",
        "candy",
        "confectionery",
        "munch",
        "kitkat",
        "milkybar",
      ],

      juice: [
        "juice",
        "fruit drink",
        "fruit juice",
      ],

      "packaged water": [
        "water",
        "mineral water",
        "drinking water",
      ],

      "mouth fresheners": [
        "mouth fresh",
        "mouth freshener",
        "mint",
        "mukhwas",
        "gum",
      ],

      "soft drinks": [
        "soft drink",
        "soft drinks",
        "cola",
        "soda",
      ],
    };

    const typeAliases =
      aliases[type] || [];

    const matched =
      typeAliases.some((alias) =>
        productText.includes(alias)
      );

    if (matched) {
      bestScore = Math.max(
        bestScore,
        priorityScore
      );
    }
  }

  return bestScore;
}

/**
 * Calculate total product score.
 */
function calculateProductScore(
  product,
  productDemand,
  priceSensitivity
) {
  const demandScore =
    calculateDemandMatchScore(
      product,
      productDemand
    );

  const priceScore =
    calculatePriceScore(
      product,
      priceSensitivity
    );

  const marginScore =
    calculateMarginScore(product);

  const shelfLifeScore =
    calculateShelfLifeScore(product);

  const coldChainScore =
    calculateColdChainScore(product);

  return (
    demandScore +
    priceScore +
    marginScore +
    shelfLifeScore +
    coldChainScore
  );
}

/**
 * Clean and validate candidates.
 */
function filterProducts(products) {
  return products.filter((product) => {
    if (!product) {
      return false;
    }

    if (!product.productId) {
      return false;
    }

    if (!product.productName) {
      return false;
    }

    if (!product.sku) {
      return false;
    }

    if (!product.isActive) {
      return false;
    }

    if (!product.isEnabled) {
      return false;
    }

    const mrp = Number(
      product.mrp || 0
    );

    const cost = Number(
      product.cost || 0
    );

    if (mrp <= 0) {
      return false;
    }

    /**
     * Don't recommend products where
     * procurement cost is higher than MRP.
     */
    if (cost > mrp) {
      return false;
    }

    /**
     * Avoid refrigerated products for
     * the initial store.
     */
    if (product.coldChainProduct) {
      return false;
    }

    return true;
  });
}

/**
 * Build the final initial store assortment.
 */
function buildInitialStoreAssortment(
  products,
  productDemand,
  targetCount = 100,
  areaAnalysis = {}
) {
  if (!Array.isArray(products)) {
    return [];
  }

  /**
   * STEP 1
   *
   * Determine price sensitivity.
   */
  const priceSensitivity =
    determinePriceSensitivity(
      areaAnalysis
    );

  console.log("");

  console.log(
    "--------------------------------"
  );

  console.log(
    "STORE ASSORTMENT"
  );

  console.log(
    "--------------------------------"
  );

  console.log(
    `Candidates received: ${products.length}`
  );

  console.log(
    `Price sensitivity: ${priceSensitivity}`
  );

  /**
   * STEP 2
   *
   * Filter invalid products.
   */
  const validProducts =
    filterProducts(products);

  console.log(
    `Valid candidates: ${validProducts.length}`
  );

  /**
   * STEP 3
   *
   * Score products.
   */
  const scoredProducts =
    validProducts.map(
      (product) => ({
        ...product,

        score:
          calculateProductScore(
            product,
            productDemand,
            priceSensitivity
          ),
      })
    );

  /**
   * STEP 4
   *
   * Remove products that don't match
   * any AI-requested product type.
   *
   * This prevents unrelated products
   * from entering the store.
   */
  const demandMatchedProducts =
    scoredProducts.filter(
      (product) =>
        calculateDemandMatchScore(
          product,
          productDemand
        ) > 0
    );

  console.log(
    `Demand-matched candidates: ${demandMatchedProducts.length}`
  );

  /**
   * If demand matching is too restrictive,
   * fall back to all valid products.
   *
   * This prevents an empty store when
   * MongoDB categories don't perfectly
   * match our aliases.
   */
  const candidates =
    demandMatchedProducts.length >=
    Math.min(targetCount, 20)
      ? demandMatchedProducts
      : scoredProducts;

  /**
   * STEP 5
   *
   * Highest score first.
   */
  candidates.sort(
    (a, b) => b.score - a.score
  );

  /**
   * STEP 6
   *
   * Group by category.
   */
  const categoryGroups =
    new Map();

  for (const product of candidates) {
    const category =
      getProductCategory(product);

    if (!categoryGroups.has(category)) {
      categoryGroups.set(
        category,
        []
      );
    }

    categoryGroups
      .get(category)
      .push(product);
  }

  /**
   * STEP 7
   *
   * Sort each category by score.
   */
  for (const categoryProducts of categoryGroups.values()) {
    categoryProducts.sort(
      (a, b) => b.score - a.score
    );
  }

  /**
   * STEP 8
   *
   * First pass:
   * one strong product from each category.
   */
  const selected = [];

  const categories = [
    ...categoryGroups.entries(),
  ].sort(
    (a, b) =>
      b[1].length - a[1].length
  );

  for (
    const [, categoryProducts]
    of categories
  ) {
    if (
      selected.length >=
      targetCount
    ) {
      break;
    }

    if (
      categoryProducts.length > 0
    ) {
      selected.push(
        categoryProducts.shift()
      );
    }
  }

  /**
   * STEP 9
   *
   * Fill remaining slots with
   * highest-scoring products.
   */
  const remaining = [];

  for (
    const [, categoryProducts]
    of categories
  ) {
    remaining.push(
      ...categoryProducts
    );
  }

  remaining.sort(
    (a, b) => b.score - a.score
  );

  for (const product of remaining) {
    if (
      selected.length >=
      targetCount
    ) {
      break;
    }

    selected.push(product);
  }

  /**
   * STEP 10
   *
   * Build API response.
   */
  const finalProducts =
    selected.map(
      (product, index) => ({
        productId:
          product.productId,

        productName:
          product.productName,

        sku:
          product.sku,

        brand:
          product.brand,

        category:
          product.category,

        subCategory:
          product.subCategory,

        mrp:
          product.mrp,

        cost:
          product.cost,

        coldChainProduct:
          product.coldChainProduct,

        shelfLife:
          product.shelfLife,

        recommendationRank:
          index + 1,

        suggestedInitialQuantity:
          product.mrp <= 10
            ? 10
            : product.mrp <= 20
            ? 8
            : product.mrp <= 50
            ? 5
            : 3,
      })
    );

  console.log("");

  console.log(
    `Final store products: ${finalProducts.length}`
  );

  console.log(
    `Target store products: ${targetCount}`
  );

  console.log("");

  finalProducts.forEach(
    (product, index) => {
      console.log(
        `${index + 1}. ${product.productName} | ${product.sku} | ${product.category} | ₹${product.mrp}`
      );
    }
  );

  return finalProducts;
}

module.exports = {
  getDemandPriorityScore,
  determinePriceSensitivity,
  calculatePriceScore,
  calculateMarginScore,
  calculateShelfLifeScore,
  calculateColdChainScore,
  calculateDemandMatchScore,
  calculateProductScore,
  filterProducts,
  buildInitialStoreAssortment,
};