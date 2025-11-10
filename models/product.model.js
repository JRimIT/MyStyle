import mongoose from "mongoose";
import "./review.model.js";

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
   averageRating: { type: Number, default: 0 }, // điểm TB từ 1..5
  numReviews:    { type: Number, default: 0 },
  originalPrice: { type: Number, default: null }, // Giá gốc khi có giảm giá
  discount: { type: Number, default: 0 }, // Phần trăm giảm giá (0-100)
  discountAmount: { type: Number, default: 0 }, // Số tiền giảm (nếu dùng số tiền cố định)
  isOnSale: { type: Boolean, default: false }, // Đang khuyến mãi
  saleStartDate: { type: Date, default: null }, // Ngày bắt đầu khuyến mãi
  saleEndDate: { type: Date, default: null }, // Ngày kết thúc khuyến mãi
  promotionLabel: { type: String, default: "" }, // Nhãn khuyến mãi (VD: "Giảm 50%", "Flash Sale")
  imageUrl: String,
  isFeatured: { type: Boolean, default: false },
  category: String,
  sizes: [String],
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  createdAt: { type: Date, default: Date.now },
});

// Virtual để tính giá sau giảm
productSchema.virtual("salePrice").get(function () {
  if (this.isOnSale && this.discount > 0) {
    if (this.originalPrice) {
      return this.originalPrice * (1 - this.discount / 100);
    }
    return this.price * (1 - this.discount / 100);
  }
  if (this.isOnSale && this.discountAmount > 0) {
    const basePrice = this.originalPrice || this.price;
    return Math.max(0, basePrice - this.discountAmount);
  }
  return this.price;
});

// Method để kiểm tra xem sản phẩm có đang trong thời gian khuyến mãi không
productSchema.methods.isCurrentlyOnSale = function () {
  if (!this.isOnSale) return false;
  
  const now = new Date();
  if (this.saleStartDate && now < this.saleStartDate) return false;
  if (this.saleEndDate && now > this.saleEndDate) return false;
  
  return true;
};

// Enable virtuals
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product =
  mongoose.models.product || mongoose.model("Product", productSchema);

export default Product;




