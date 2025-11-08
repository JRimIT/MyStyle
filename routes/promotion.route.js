import express from "express";
import Product from "../models/product.model.js";
import Promotion from "../models/promotion.model.js";
import { verifyAdmin } from "../config/jwtConfig.js";

const router = express.Router();

// Get all active promotions
router.get("/promotions", async (req, res) => {
  try {
    const now = new Date();
    const promotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ priority: -1, createdAt: -1 })
      .populate("applicableProducts", "name price imageUrl");

    res.json({
      success: true,
      data: promotions,
      count: promotions.length,
    });
  } catch (error) {
    console.error("Error fetching promotions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promotions",
      error: error.message,
    });
  }
});

// Get products on sale
router.get("/products/on-sale", async (req, res) => {
  try {
    const now = new Date();
    
    const products = await Product.find({
      isOnSale: true,
      $or: [
        { saleStartDate: { $lte: now }, saleEndDate: { $gte: now } },
        { saleStartDate: null, saleEndDate: null },
      ],
    })
      .select("name price originalPrice discount discountAmount isOnSale saleStartDate saleEndDate promotionLabel imageUrl category sizes")
      .sort({ discount: -1, createdAt: -1 })
      .limit(20);

    // Calculate sale price for each product
    const productsWithSalePrice = products.map((product) => {
      const productObj = product.toObject();
      let salePrice = product.price;
      
      if (product.isOnSale) {
        if (product.discount > 0) {
          const basePrice = product.originalPrice || product.price;
          salePrice = basePrice * (1 - product.discount / 100);
        } else if (product.discountAmount > 0) {
          const basePrice = product.originalPrice || product.price;
          salePrice = Math.max(0, basePrice - product.discountAmount);
        }
      }
      
      productObj.salePrice = Math.round(salePrice);
      return productObj;
    });

    res.json({
      success: true,
      data: productsWithSalePrice,
      count: productsWithSalePrice.length,
    });
  } catch (error) {
    console.error("Error fetching products on sale:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products on sale",
      error: error.message,
    });
  }
});

// Apply promotion to product (Admin only)
router.post("/products/:productId/apply-promotion", verifyAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { discount, discountAmount, saleStartDate, saleEndDate, promotionLabel } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Save original price if not already saved
    if (!product.originalPrice) {
      product.originalPrice = product.price;
    }

    // Update promotion fields
    product.isOnSale = true;
    if (discount !== undefined) product.discount = discount;
    if (discountAmount !== undefined) product.discountAmount = discountAmount;
    if (saleStartDate) product.saleStartDate = new Date(saleStartDate);
    if (saleEndDate) product.saleEndDate = new Date(saleEndDate);
    if (promotionLabel) product.promotionLabel = promotionLabel;

    await product.save();

    res.json({
      success: true,
      message: "Promotion applied to product",
      data: product,
    });
  } catch (error) {
    console.error("Error applying promotion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply promotion",
      error: error.message,
    });
  }
});

// Remove promotion from product (Admin only)
router.post("/products/:productId/remove-promotion", verifyAdmin, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Restore original price if exists
    if (product.originalPrice) {
      product.price = product.originalPrice;
    }

    // Clear promotion fields
    product.isOnSale = false;
    product.discount = 0;
    product.discountAmount = 0;
    product.originalPrice = null;
    product.saleStartDate = null;
    product.saleEndDate = null;
    product.promotionLabel = "";

    await product.save();

    res.json({
      success: true,
      message: "Promotion removed from product",
      data: product,
    });
  } catch (error) {
    console.error("Error removing promotion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove promotion",
      error: error.message,
    });
  }
});

// Create promotion (Admin only)
router.post("/promotions", verifyAdmin, async (req, res) => {
  try {
    const promotion = await Promotion.create(req.body);

    res.status(201).json({
      success: true,
      message: "Promotion created successfully",
      data: promotion,
    });
  } catch (error) {
    console.error("Error creating promotion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create promotion",
      error: error.message,
    });
  }
});

// Update promotion (Admin only)
router.put("/promotions/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findByIdAndUpdate(id, req.body, { new: true });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found",
      });
    }

    res.json({
      success: true,
      message: "Promotion updated successfully",
      data: promotion,
    });
  } catch (error) {
    console.error("Error updating promotion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update promotion",
      error: error.message,
    });
  }
});

// Delete promotion (Admin only)
router.delete("/promotions/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findByIdAndDelete(id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found",
      });
    }

    res.json({
      success: true,
      message: "Promotion deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete promotion",
      error: error.message,
    });
  }
});

export default router;


