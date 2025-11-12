import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed', 'buy_x_get_y', 'free_shipping'],
        required: true,
    },
    discountValue: {
        type: Number,
        default: 0, // Phần trăm hoặc số tiền giảm
    },
    minPurchaseAmount: {
        type: Number,
        default: 0, // Số tiền tối thiểu để áp dụng
    },
    maxDiscountAmount: {
        type: Number,
        default: null, // Giới hạn số tiền giảm tối đa (cho percentage)
    },
    applicableCategories: [
        {
            type: String,
        },
    ],
    applicableProducts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
    ],
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
        default: null, // Giới hạn số lần sử dụng (null = không giới hạn)
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    priority: {
        type: Number,
        default: 0, // Độ ưu tiên (số càng cao càng ưu tiên)
    },
    bannerImage: {
        type: String,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Method để kiểm tra promotion có đang active không
promotionSchema.methods.isCurrentlyActive = function () {
    if (!this.isActive) return false;

    const now = new Date();
    if (now < this.startDate) return false;
    if (now > this.endDate) return false;

    if (this.usageLimit && this.usedCount >= this.usageLimit) return false;

    return true;
};

// Method để tính giá sau khi áp dụng promotion
promotionSchema.methods.calculateDiscount = function (originalPrice) {
    if (!this.isCurrentlyActive()) return 0;

    if (originalPrice < this.minPurchaseAmount) return 0;

    let discount = 0;

    if (this.type === 'percentage') {
        discount = originalPrice * (this.discountValue / 100);
        if (this.maxDiscountAmount) {
            discount = Math.min(discount, this.maxDiscountAmount);
        }
    } else if (this.type === 'fixed') {
        discount = this.discountValue;
    }

    return Math.min(discount, originalPrice); // Không giảm quá giá gốc
};

promotionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Promotion = mongoose.models.Promotion || mongoose.model('Promotion', promotionSchema);

export default Promotion;
