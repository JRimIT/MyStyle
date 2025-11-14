import mongoose from "mongoose";

const walletTopupSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    totalCredit: { type: Number, required: true },
    method: { type: String, enum: ["momo", "banking", "card", "other"], default: "other" },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    reference: { type: String },
    vnpTxnRef: { type: String, index: true },
    paymentInfo: {
      txnNo: String,
      bankCode: String,
      bankTranNo: String,
    },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

const WalletTopup = mongoose.models.WalletTopup || mongoose.model("WalletTopup", walletTopupSchema);
export default WalletTopup;
