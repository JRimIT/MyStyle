import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

// Passport JWT strategy
passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.userId);
      if (user) return done(null, user);
      return done(null, false);
    } catch (err) {
      return done(err, false);
    }
  })
);

export const generateJWT = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      facebookId: user.facebookId,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "5h" }
  );
};

// Middleware: verify token for API/AJAX; returns JSON on failure
export const verifyUser = (req, res, next) => {
  if (req.user && req.user.userId) return next();

  const authHeader = req.headers["authorization"] || (req.session?.token ? `Bearer ${req.session.token}` : null);
  const token = authHeader ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Token required. Please login." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: "Token expired or invalid." });
    req.user = decoded;
    next();
  });
};

export const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"] || (req.session?.token ? `Bearer ${req.session.token}` : null);
  const token = authHeader ? authHeader.split(" ")[1] : null;
  if (!token) return res.status(403).json({ message: "No token provided!" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token!" });
    if (decoded.role !== "admin") return res.status(403).json({ message: "Admin access required." });
    req.user = decoded;
    next();
  });
};

export const jwtPassport = passport;

// Middleware: for web page requests, redirect to /login if unauthenticated
export const verifyUserOrRedirect = (req, res, next) => {
  const isApi = (req.path || "").startsWith("/api/");
  const isAjax = !!(req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest");
  const accept = (req.headers?.accept || "").toString().toLowerCase();
  const wantsHtmlStrict = /text\/html/.test(accept);
  const isGet = (req.method || "GET").toUpperCase() === "GET";
  const isWebPage = !isApi && !isAjax && isGet && wantsHtmlStrict;

  if (req.user && req.user.userId) return next();

  const authHeader = req.headers["authorization"] || (req.session?.token ? `Bearer ${req.session.token}` : null);
  const token = authHeader ? authHeader.split(" ")[1] : null;

  if (!token) {
    if (isWebPage) {
      if (req.session) req.session.flash = { type: "error", message: "Vui lòng đăng nhập để sử dụng tính năng này!" };
      const nextUrl = encodeURIComponent(req.originalUrl || "/");
      return res.redirect(`/login?next=${nextUrl}`);
    }
    return res.status(401).json({ success: false, loginRequired: true, message: "Token required. Please login." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (isWebPage) {
        if (req.session) req.session.flash = { type: "error", message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!" };
        const nextUrl = encodeURIComponent(req.originalUrl || "/");
        return res.redirect(`/login?next=${nextUrl}`);
      }
      return res.status(401).json({ success: false, loginRequired: true, message: "Token expired. Please login." });
    }
    req.user = decoded;
    next();
  });
};

