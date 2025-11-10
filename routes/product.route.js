import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import axios from "axios";
import https from "https";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import { countProduct } from "../controllers/countCart.js";

const router = express.Router();
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

router.get("/Home", (req, res) => {
  res.redirect("/listFeatureClothes");
});

router.post("/api/createClothes", async (req, res) => {
  try {
    const { name, description, price, imageUrl, category, sizes } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      imageUrl,
      category,
      sizes,
    });
    if (!product) {
      res.status(401).json({ message: "Fail to create Product" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching /api/createClothes:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/listFeatureClothes", async (req, res) => {
  try {
    const { search, priceRange, sizes } = req.query;
    
    // Build the filter object
    let filter = {};
    
    // Search by name or category
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by price range
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number);
      filter.price = { $gte: min, $lte: max };
    }

    // Filter by sizes
    if (sizes) {
      const sizeArray = sizes.split(',');
      filter.sizes = { $in: sizeArray };
    }

    const product = await Product.find(filter)
      .sort({ createdAt: -1 })
      .select("name price originalPrice discount discountAmount isOnSale saleStartDate saleEndDate promotionLabel imageUrl category sizes");
    
    // Calculate sale price for each product
    const productsWithSalePrice = product.map((p) => {
      const productObj = p.toObject();
      let salePrice = p.price;
      let isCurrentlyOnSale = false;
      
      // Check if product is currently on sale
      if (p.isOnSale) {
        const now = new Date();
        const startValid = !p.saleStartDate || now >= p.saleStartDate;
        const endValid = !p.saleEndDate || now <= p.saleEndDate;
        isCurrentlyOnSale = startValid && endValid;
        
        if (isCurrentlyOnSale) {
          if (p.discount > 0) {
            const basePrice = p.originalPrice || p.price;
            salePrice = basePrice * (1 - p.discount / 100);
          } else if (p.discountAmount > 0) {
            const basePrice = p.originalPrice || p.price;
            salePrice = Math.max(0, basePrice - p.discountAmount);
          }
        }
      }
      
      productObj.salePrice = Math.round(salePrice);
      productObj.isCurrentlyOnSale = isCurrentlyOnSale;
      productObj.displayPrice = isCurrentlyOnSale ? salePrice : p.price;
      productObj.originalDisplayPrice = isCurrentlyOnSale ? (p.originalPrice || p.price) : null;
      
      return productObj;
    });
    
    // Load categories
    const Category = (await import("../models/category.model.js")).default;
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 });
    
    if (!product || product.length === 0) {
      return res.render("pages/Home", {
        listFeatureFood: [],
        categories: categories || [],
        cartCount: req.user ? await countProduct(req.user.userId) : 0,
        user: req.user,
        search,
        priceRange,
        sizesFilter: sizes
      });
    }

    const cartCount = req.user ? await countProduct(req.user.userId) : 0;
    let user = req.user;
    if (req.user && req.user.userId) {
      const User = (await import("../models/user.model.js")).default;
      user = await User.findById(req.user.userId);
    }
    
    res.render("pages/Home", {
      listFeatureFood: productsWithSalePrice,
      categories: categories || [],
      cartCount: cartCount,
      user,
      search,
      priceRange,
      sizesFilter: sizes
    });
  } catch (error) {
    console.error("Error fetching Feature Clothes:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;



// Product detail page
router.get("/product/:id", async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).render("errors/404");
    let displayPrice = p.price;
    let originalDisplayPrice = null;
    let isCurrentlyOnSale = false;
    if (p.isOnSale) {
      const now = new Date();
      const startValid = !p.saleStartDate || now >= p.saleStartDate;
      const endValid = !p.saleEndDate || now <= p.saleEndDate;
      isCurrentlyOnSale = startValid && endValid;
      if (isCurrentlyOnSale) {
        const base = p.originalPrice || p.price;
        if (p.discount > 0) displayPrice = base * (1 - p.discount / 100);
        else if (p.discountAmount > 0) displayPrice = Math.max(0, base - p.discountAmount);
        originalDisplayPrice = base;
      }
    }
    const cartCount = req.user ? await countProduct(req.user.userId) : 0;
    let user = req.user;
    if (req.user && req.user.userId) {
      const User = (await import("../models/user.model.js")).default;
      user = await User.findById(req.user.userId);
    }
    res.render("pages/ProductDetail", { product: p, displayPrice, originalDisplayPrice, isCurrentlyOnSale, cartCount, user });
  } catch (e) {
    console.error("product detail error:", e);
    res.status(500).render("errors/500");
  }
});
