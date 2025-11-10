import mongoose from "mongoose";

const WishlistItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Types.ObjectId, ref: "Product", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true, index: true },
    items: [WishlistItemSchema],
  },
  { timestamps: true }
);

// Ensure one wishlist per user
WishlistSchema.index({ userId: 1 }, { unique: true });

const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", WishlistSchema);
export default Wishlist;

