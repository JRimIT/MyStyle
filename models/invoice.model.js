import mongoose from "mongoose";
import User from "./user.model.js";
import Product from "./product.model.js";

const invoiceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    items:[{
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number
    }],
    priceTotal: Number,
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
},{timestamps: true});

const Invoice =
  mongoose.models.invoice || mongoose.model("Invoice", invoiceSchema);

export default Invoice;