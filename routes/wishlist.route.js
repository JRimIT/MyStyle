// routes/wishlist.route.js
import express from "express";
import { verifyUserOrRedirect as verifyUser } from "../config/jwtConfig.js";
import { viewWishlist, addToWishlist, removeFromWishlist } from "../controllers/wishlist.controller.js";

const router = express.Router();

router.get("/wishlist", verifyUser, viewWishlist);
router.post("/wishlist/add", verifyUser, addToWishlist);
router.delete("/wishlist/remove/:productId", verifyUser, removeFromWishlist);

export default router;
