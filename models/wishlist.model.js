import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productId: { type: String, required: true }
}, { timestamps: true });

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model('wishlists', wishlistSchema);
