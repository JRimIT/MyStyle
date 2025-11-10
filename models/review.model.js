// models/review.model.js
import mongoose from "mongoose";
import "./user.model.js";
import "./product.model.js";

const reviewSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    rating:    { type: Number, min: 1, max: 5, required: true },
    comment:   { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// 1 user chỉ review 1 lần cho 1 sản phẩm
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default Review;
