require("dotenv").config();

const {
  searchProducts,
  closeProductionDatabase,
} = require("./services/productionProductService");

async function test() {
  try {
    console.log("================================");
    console.log("PRODUCTION PRODUCT SEARCH TEST");
    console.log("================================");

    const products = await searchProducts(
      [
        "Biscuits",
        "Chocolate",
        "Namkeen",
        "Snacks",
        "Beverages",
      ],
      20
    );

    console.log("");
    console.log("Matching products:");
    console.log("");

    products.forEach((product, index) => {
      console.log(`${index + 1}.`);
      console.log({
        id: product._id,
        name: product.modelName,
        sku: product.productSku,
        brand: product.brand?.name,
        category: product.category?.name,
        subCategory: product.subCategory?.name,
        mrp: product.mrp,
        cost: product.cost,
        coldChainProduct: product.coldChainProduct,
        shelfLife: product.shelfLife,
      });
      console.log("");
    });

    console.log("================================");
    console.log("TEST FINISHED");
    console.log("================================");
  } catch (error) {
    console.error("Production product search failed:");
    console.error(error);
  } finally {
    await closeProductionDatabase();
  }
}

test();