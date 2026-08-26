/**
 * Build the initial store assortment.
 *
 * MongoDB gives us the real products.
 * This service decides which products are
 * practical for the initial store.
 *
 * No AI call is required here.
 */

/**
 * Calculate a product score.
 */
function calculateProductScore(product) {
  let score = 0;

  const mrp = Number(product.mrp || 0);
  const cost = Number(product.cost || 0);
  const shelfLife = Number(product.shelfLife || 0);

  /**
   * Product must have a valid price.
   */
  if (mrp > 0) {
    score += 10;
  }

  /**
   * Margin.
   */
  if (mrp > 0 && cost > 0) {
    const margin = ((mrp - cost) / mrp) * 100;

    if (margin >= 30) {
      score += 30;
    } else if (margin >= 20) {
      score += 20;
    } else if (margin >= 10) {
      score += 10;
    } else if (margin < 0) {
      score -= 40;
    }
  }

  /**
   * Affordable products are useful
   * for impulse purchases.
   */
  if (mrp <= 20) {
    score += 20;
  } else if (mrp <= 50) {
    score += 15;
  } else if (mrp <= 100) {
    score += 8;
  }

  /**
   * Shelf life.
   */
  if (shelfLife >= 180) {
    score += 15;
  } else if (shelfLife >= 90) {
    score += 10;
  } else if (shelfLife >= 30) {
    score += 5;
  } else if (shelfLife > 0 && shelfLife < 30) {
    score -= 10;
  }

  /**
   * Small cart preference:
   * avoid cold-chain products.
   */
  if (product.coldChainProduct) {
    score -= 30;
  } else {
    score += 10;
  }

  return score;
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

    /**
     * Don't recommend products where
     * procurement cost is higher than MRP.
     */
    const mrp = Number(product.mrp || 0);
    const cost = Number(product.cost || 0);

    if (mrp <= 0) {
      return false;
    }

    if (cost > mrp) {
      return false;
    }

    /**
     * Avoid refrigerated products for
     * the initial cart assortment.
     */
    if (product.coldChainProduct) {
      return false;
    }

    return true;
  });
}

/**
 * Build a balanced assortment.
 *
 * Example:
 *
 * Biscuits       → several products
 * Chocolates     → several products
 * Namkeen        → several products
 * Beverages      → several products
 * etc.
 */
function buildInitialStoreAssortment(
  products,
  productDemand,
  targetCount = 50
) {
  if (!Array.isArray(products)) {
    return [];
  }

  /**
   * STEP 1
   * Filter invalid products.
   */
  const validProducts = filterProducts(products);

  console.log("");
  console.log("--------------------------------");
  console.log("STORE ASSORTMENT");
  console.log("--------------------------------");

  console.log(
    `Candidates received: ${products.length}`
  );

  console.log(
    `Valid candidates: ${validProducts.length}`
  );

  /**
   * STEP 2
   * Score every product.
   */
  const scoredProducts = validProducts.map(
    (product) => ({
      ...product,
      score: calculateProductScore(product),
    })
  );

  /**
   * STEP 3
   * Highest score first.
   */
  scoredProducts.sort(
    (a, b) => b.score - a.score
  );

  /**
   * STEP 4
   * Keep category diversity.
   *
   * We don't want the final store to become:
   *
   * 40 chocolates
   * 5 biscuits
   *
   * Instead, distribute products across
   * available categories.
   */
  const categoryGroups = new Map();

  for (const product of scoredProducts) {
    const category =
      product.category ||
      product.subCategory ||
      "Other";

    if (!categoryGroups.has(category)) {
      categoryGroups.set(category, []);
    }

    categoryGroups
      .get(category)
      .push(product);
  }

  /**
   * Sort categories by number of
   * available products.
   */
  const categories = [
    ...categoryGroups.entries(),
  ].sort(
    (a, b) =>
      b[1].length - a[1].length
  );

  const selected = [];

  /**
   * First pass:
   * Take one strong product from
   * every category.
   */
  for (const [category, categoryProducts] of categories) {
    if (selected.length >= targetCount) {
      break;
    }

    if (categoryProducts.length > 0) {
      selected.push(
        categoryProducts.shift()
      );
    }
  }

  /**
   * Second pass:
   * Fill remaining slots using
   * highest-scoring products.
   */
  const remaining = [];

  for (const [, categoryProducts] of categories) {
    remaining.push(
      ...categoryProducts
    );
  }

  remaining.sort(
    (a, b) => b.score - a.score
  );

  for (const product of remaining) {
    if (selected.length >= targetCount) {
      break;
    }

    selected.push(product);
  }

  /**
   * Remove internal score before
   * returning API response.
   */
  const finalProducts = selected.map(
    (product, index) => ({
      productId: product.productId,
      productName: product.productName,
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      subCategory: product.subCategory,
      mrp: product.mrp,
      cost: product.cost,
      coldChainProduct:
        product.coldChainProduct,
      shelfLife: product.shelfLife,

      /**
       * Useful for frontend/business logic.
       */
      recommendationRank: index + 1,

      /**
       * Suggested starting quantity.
       *
       * We keep this simple initially.
       * Later we can make it category/price based.
       */
      suggestedInitialQuantity:
        product.mrp <= 20
          ? 10
          : product.mrp <= 50
          ? 6
          : 3,
    })
  );

  console.log(
    `Final store products: ${finalProducts.length}`
  );

  console.log("");

  finalProducts.forEach(
    (product, index) => {
      console.log(
        `${index + 1}. ${product.productName} | ${product.sku} | ${product.category}`
      );
    }
  );

  return finalProducts;
}

module.exports = {
  calculateProductScore,
  filterProducts,
  buildInitialStoreAssortment,
};