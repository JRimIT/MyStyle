import mongoose from "mongoose";
import "./product.model.js";
import "./user.model.js";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      price: Number,
    },
  ],
  totalPrice: Number,
  status: { 
    type: String, 
    enum: ["Pending", "Processing", "Shipping", "Delivered", "Cancelled"],
    default: "Pending" 
  },
  address: String,
  paymentMethod: { type: String, default: "cod" }, // 'wallet' hoặc 'cod'
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: null },
  refunded: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.models.order || mongoose.model("Order", orderSchema);

export default Order;
