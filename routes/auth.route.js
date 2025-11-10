import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import axios from "axios";
import https from "https";
import User from "../models/user.model.js";
import passport from "passport";
import { generateJWT } from "../config/jwtConfig.js";

const router = express.Router();

// Khởi tạo axios với HTTPS (bỏ kiểm tra SSL cho môi trường dev)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// ==== Giao diện ====

router.get("/goToSignUpPage", (req, res) => {
  res.render("auth/signup");
});

router.get("/goToLoginPage", (req, res) => {
  res.render("auth/login");
});

router.get("/login", (req, res) => {
  const error = req.query.error;
  res.render("auth/login", { error });
});

// ==== Logout ====
router.get("/logout", (req, res) => {
  try {
    if (req.session) {
      // clear session fields first
      req.session.token = null;
      req.session.user = null;
      // destroy session store
      req.session.destroy(() => {});
    }
    res.clearCookie("connect.sid");
  } catch {}
  return res.redirect("/login");
});

// ==== Đăng ký tài khoản ====

router.post("/auth/register", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).send("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();

    res.redirect("/goToLoginPage");
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).send("Registration failed");
  }
});

// ==== Đăng nhập và tạo session ====

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", username);

  try {
    const user = await User.findOne({ username });
    if (!user) return res.redirect("/login?error=UserNotFound");
    if (user.isActive === false) return res.redirect("/login?error=Disabled");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.redirect("/login?error=InvalidPassword");

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "3h" }
    );

    req.session.token = token;
    req.session.user = user; // ✅ Cho phép dùng user trong EJS như navbar

    res.redirect("/listFeatureClothes");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Login failed");
  }
});

// auth facebook

router.get("/auth/facebook", passport.authenticate("facebook"));

router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    const token = generateJWT(req.user);
    const user = req.user;
    console.log("User /auth/facebook/callback: ", user);

    req.session.token = token;
    req.session.user = user;
    res.redirect("/listFeatureFood");
    // res.json({ token }); // Gửi JWT về client
  }
);

// ====== Logout JSON (for AJAX) ======
router.post("/logout", (req, res) => {
  try {
    if (req.session) {
      req.session.token = null;
      req.session.user = null;
      req.session.destroy(() => {});
    }
    res.clearCookie("connect.sid");
  } catch {}
  return res.json({ ok: true });
});

// ====== Account verification by token ======
router.get("/auth/verify", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect("/login?error=VerifyTokenMissing");
  try {
    const User = (await import("../models/user.model.js")).default;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.redirect("/login?error=VerifyTokenInvalid");
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    return res.redirect("/login?error=Verified");
  } catch (e) {
    console.error("verify error:", e);
    return res.redirect("/login?error=VerifyFailed");
  }
});

// ====== Forgot password ======
router.get("/forgot", (_req, res) => {
  res.render("auth/forgot", { sent: false, error: null });
});

router.post("/auth/forgot", async (req, res) => {
  try {
    const { email, username } = req.body;
    const User = (await import("../models/user.model.js")).default;
    const query = email ? { email } : { username };
    const user = await User.findOne(query);
    if (!user) return res.render("auth/forgot", { sent: false, error: "Không tìm thấy tài khoản" });

    const crypto = (await import("crypto")).default;
    const token = crypto.randomBytes(24).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    const resetLink = `${req.protocol}://${req.get("host")}/reset?token=${token}`;
    console.log("[RESET LINK]", resetLink);
    return res.render("auth/forgot", { sent: true, error: null, resetLink });
  } catch (e) {
    console.error("forgot error:", e);
    return res.render("auth/forgot", { sent: false, error: "Không thể gửi yêu cầu. Thử lại." });
  }
});

router.get("/reset", (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect("/login?error=ResetTokenMissing");
  res.render("auth/reset", { token, error: null });
});

router.post("/auth/reset", async (req, res) => {
  try {
    const { token, password } = req.body;
    const User = (await import("../models/user.model.js")).default;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) return res.render("auth/reset", { token, error: "Token không hợp lệ hoặc đã hết hạn" });
    const bcrypt = (await import("bcrypt")).default;
    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.redirect("/login?error=ResetSuccess");
  } catch (e) {
    console.error("reset error:", e);
    return res.render("auth/reset", { token: req.body.token, error: "Không thể đặt lại mật khẩu" });
  }
});

export default router;
