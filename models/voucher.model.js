import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    enum: ["percentage", "fixed", "free_shipping"],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true, // Phần trăm hoặc số tiền giảm
  },
  minPurchaseAmount: {
    type: Number,
    default: 0, // Số tiền tối thiểu để áp dụng
  },
  maxDiscountAmount: {
    type: Number,
    default: null, // Giới hạn số tiền giảm tối đa (cho percentage)
  },
  applicableCategories: [{
    type: String,
  }],
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  }],
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  usageLimit: {
    type: Number,
    default: null, // Tổng số lần sử dụng (null = không giới hạn)
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  usageLimitPerUser: {
    type: Number,
    default: 1, // Số lần mỗi user có thể dùng
  },
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster lookup
voucherSchema.index({ code: 1 });
voucherSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Method để kiểm tra voucher có hợp lệ không
voucherSchema.methods.isValid = function (userId = null, cartTotal = 0) {
  // Check active status
  if (!this.isActive) {
    return { valid: false, message: "Voucher không còn hoạt động" };
  }

  // Check date range
  const now = new Date();
  if (now < this.startDate) {
    return { valid: false, message: "Voucher chưa đến thời gian sử dụng" };
  }
  if (now > this.endDate) {
    return { valid: false, message: "Voucher đã hết hạn" };
  }

  // Check usage limit
  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, message: "Voucher đã hết lượt sử dụng" };
  }

  // Check min purchase amount
  if (cartTotal < this.minPurchaseAmount) {
    return {
      valid: false,
      message: `Cần mua tối thiểu ${this.minPurchaseAmount.toLocaleString('vi-VN')} VND để sử dụng voucher này`,
    };
  }

  // Check per user limit
  if (userId) {
    const userUsageCount = this.usedBy.filter(
      (usage) => usage.userId.toString() === userId.toString()
    ).length;
    if (userUsageCount >= this.usageLimitPerUser) {
      return { valid: false, message: "Bạn đã sử dụng hết lượt voucher này" };
    }
  }

  return { valid: true, message: "Voucher hợp lệ" };
};

// Method để tính số tiền giảm
voucherSchema.methods.calculateDiscount = function (cartTotal) {
  if (!this.isValid().valid) return 0;

  let discount = 0;

  if (this.type === "percentage") {
    discount = cartTotal * (this.discountValue / 100);
    if (this.maxDiscountAmount) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else if (this.type === "fixed") {
    discount = this.discountValue;
  } else if (this.type === "free_shipping") {
    // Free shipping sẽ được xử lý riêng
    discount = 0;
  }

  return Math.min(discount, cartTotal); // Không giảm quá tổng tiền
};

voucherSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  // Auto uppercase and trim code
  if (this.isModified("code") || this.isNew) {
    this.code = this.code.toUpperCase().trim().replace(/\s+/g, '');
  }
  next();
});

// Also normalize on findOneAndUpdate
voucherSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  if (this._update.code) {
    this._update.code = this._update.code.toUpperCase().trim().replace(/\s+/g, '');
  }
  this._update.updatedAt = Date.now();
  next();
});

const Voucher =
  mongoose.models.Voucher || mongoose.model("Voucher", voucherSchema);

export default Voucher;

