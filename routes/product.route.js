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
      .select("name price imageUrl category sizes");
    
    if (!product || product.length === 0) {
      return res.render("pages/Home", {
        listFeatureFood: [],
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
      listFeatureFood: product,
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
