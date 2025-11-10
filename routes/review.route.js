// routes/review.route.js
import express from "express";
import { verifyUser } from "../config/jwtConfig.js";
import {
  listProductReviews,
  checkEligibility,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";

const router = express.Router();

router.get("/products/:productId/reviews", listProductReviews);                     // public
router.get("/products/:productId/reviews/eligibility", verifyUser, checkEligibility);
router.post("/products/:productId/reviews", verifyUser, createReview);             // must purchased
router.patch("/reviews/:reviewId", verifyUser, updateReview);                      // owner
router.delete("/reviews/:reviewId", verifyUser, deleteReview);                     // owner

export default router;
