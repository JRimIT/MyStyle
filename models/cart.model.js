import mongoose from "mongoose";
import "./product.model.js";
import "./user.model.js";

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
    },
  ],
  appliedVoucher: {
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
    code: { type: String, default: null },
    discount: { type: Number, default: 0 },
    freeShipping: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Cart = mongoose.models.cart || mongoose.model("Cart", cartSchema);

export default Cart;
