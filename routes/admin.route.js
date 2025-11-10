import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import axios from "axios";
import https from "https";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import { verifyAdmin } from "../config/jwtConfig.js";
import Cart from "../models/cart.model.js";
import { countProduct } from "../controllers/countCart.js";
import Order from "../models/order.model.js";
import Review from "../models/review.model.js";
import multer from "multer";
import path from "path";

const router = express.Router();
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// Protect all /admin routes with verifyAdmin
router.use((req, res, next) => {
  if (req.path && req.path.startsWith("/admin")) return verifyAdmin(req, res, next);
  next();
});

// Multer config for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.get("/admin/Home", (req, res) => {
  res.render("admins/Home", { user: req.user });
});

router.get("/admin/manageUser", async (req, res) => {
  try {
    const users = await User.find({});
    res.render("admins/manageUser", { users });
  } catch (error) {
    console.error("Error /admin/manageUser:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/admin/users/edit/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    res.render("admins/manageUserEdit", { user });
  } catch (error) {
    console.error("Error /admin/users/edit/:userId: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/users/edit/:userId", async (req, res) => {
  try {
    const { username, role } = req.body;
    const userId = req.params.userId;
    const user = await User.findByIdAndUpdate(userId, {
      $set: { username: username, role: role },
    });

    res.redirect("/admin/manageUser");
  } catch (error) {
    console.error("Error /admin/users/edit/:userId: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/users/delete/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    await User.findByIdAndDelete(userId);
    res.redirect("/admin/manageUser");
  } catch (error) {
    console.error("Error //admin/users/delete: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: View and manage all orders
router.get("/admin/orders", async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("userId", "username")
      .populate("items.productId", "name price imageUrl");
    res.render("admins/manageOrders", { orders });
  } catch (error) {
    console.error("Error /admin/orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: Update order status
router.post("/admin/orders/update/:orderId", async (req, res) => {
  try {
    const { status } = req.body;
    await Order.findByIdAndUpdate(req.params.orderId, { status });
    res.redirect("/admin/orders");
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: List all products
router.get("/admin/products", async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.render("admins/manageProducts", { products });
  } catch (error) {
    console.error("Error /admin/products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: Toggle user active
router.post("/admin/users/toggle/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "Not found" });
    user.isActive = user.isActive === false ? true : false;
    await user.save();
    res.redirect("/admin/manageUser");
  } catch (error) {
    console.error("Error /admin/users/toggle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: Show create product form
router.get("/admin/products/create", (req, res) => {
  res.render("admins/createProduct");
});

// Admin: Handle product creation
router.post("/admin/products/create", async (req, res) => {
  try {
    const { name, description, price, imageUrl, category } = req.body;
    await Product.create({ name, description, price, imageUrl, category });
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: Show edit product form
router.get("/admin/products/edit/:productId", async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    res.render("admins/editProduct", { product });
  } catch (error) {
    console.error("Error /admin/products/edit:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: Handle product update
router.post(
  "/admin/products/edit/:productId",
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description, price, category, isFeatured } = req.body;
      let updateData = { name, description, price, category, isFeatured: !!isFeatured };
      if (req.file) {
        updateData.imageUrl = "/uploads/" + req.file.filename;
      } else if (req.body.imageUrl) {
        updateData.imageUrl = req.body.imageUrl;
      }
      await Product.findByIdAndUpdate(req.params.productId, updateData);
      res.redirect("/admin/products");
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Admin: Delete product
router.post("/admin/products/delete/:productId", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.productId);
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: Categories management
router.get("/admin/categories", async (req, res) => {
  try {
    const Category = (await import("../models/category.model.js")).default;
    const categories = await Category.find()
      .sort({ order: 1, name: 1 })
      .populate("parentCategory", "name slug");

    let user = req.user;
    if (req.user && req.user.userId) {
      user = await User.findById(req.user.userId);
    }
    const cartCount = req.user?.userId
      ? await countProduct(req.user.userId)
      : 0;

    res.render("admin/categories", {
      categories,
      user,
      cartCount,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: Vouchers management
router.get("/admin/vouchers", async (req, res) => {
  try {
    const Voucher = (await import("../models/voucher.model.js")).default;
    const vouchers = await Voucher.find()
      .sort({ createdAt: -1 })
      .populate("applicableProducts", "name")
      .populate("usedBy.userId", "username");

    let user = req.user;
    if (req.user && req.user.userId) {
      user = await User.findById(req.user.userId);
    }
    const cartCount = req.user?.userId
      ? await countProduct(req.user.userId)
      : 0;

    res.render("admin/vouchers", {
      vouchers,
      user,
      cartCount,
    });
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
// Admin: Reviews management
router.get("/admin/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate("userId", "username")
      .populate("productId", "name")
      .sort({ createdAt: -1 });
    res.render("admins/manageReviews", { reviews });
  } catch (e) {
    console.error("Error /admin/reviews:", e);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/reviews/delete/:reviewId", async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.reviewId);
    res.redirect("/admin/reviews");
  } catch (e) {
    console.error("Error delete review:", e);
    res.status(500).json({ message: "Internal server error" });
  }
});
