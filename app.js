import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import ejs from "ejs";
import path from "path";
import createError from 'http-errors';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { jwtPassport, verifyAdmin, verifyUser } from "./config/jwtConfig.js";
import session from "express-session";
import sessionConfig from "./config/sessionConfig.js";

import authRoute from "./routes/auth.route.js";
import productRoute from "./routes/product.route.js";
import staticRoute from "./routes/static.route.js";
import categoryRoute from "./routes/category.route.js";
import cartRoute from "./routes/cart.route.js";
import promotionRoute from "./routes/promotion.route.js";
import voucherRoute from "./routes/voucher.route.js";
import adminRoute from "./routes/admin.route.js";
import orderRoute from "./routes/order.route.js";
import { connectToMongoDB } from "./db/connectToMongoDB.js";

dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(methodOverride("_method"));

app.use(session(sessionConfig));

app.use(jwtPassport.initialize());

// Middleware to extract user from session token (optional)
app.use((req, res, next) => {
  if (req.session && req.session.token) {
    try {
      const decoded = jwt.verify(req.session.token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Token invalid or expired, continue without user
      req.user = null;
    }
  }
  next();
});

app.engine("ejs", ejs.renderFile);
app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  res.render("partials/index");
});

// Log route registration
console.log("🔧 Registering routes...");

app.use("/", authRoute);
app.use("/", productRoute);
app.use("/", staticRoute);
app.use("/", adminRoute);
console.log("✅ Admin routes registered at /");
app.use("/", cartRoute);
console.log("✅ Cart routes registered at /");
app.use("/", orderRoute);
console.log("✅ Order routes registered at /");
app.use("/api", categoryRoute);
app.use("/api", promotionRoute);
app.use("/api", voucherRoute);

// catch 404
app.use((req, res, next) => {
  // If it's an API route, return JSON instead of rendering error page
  if (req.path.startsWith('/api/') || req.path.startsWith('/cart/')) {
    return res.status(404).json({
      success: false,
      message: "Route not found",
      path: req.path
    });
  }
  next(createError(404));
});
// error handler
app.use((err, req, res, next) => {
  // If it's an API route, return JSON error
  if (req.path.startsWith('/api/') || req.path.startsWith('/cart/')) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
      error: req.app.get("env") === "development" ? err.stack : {}
    });
  }
  
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

export default app;


