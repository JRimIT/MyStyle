import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    facebookId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String },
    fullName: { type: String, default: "" },
    email: { type: String, unique: true, sparse: true, trim: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    postCode: { type: String, default: "" },
    dateOfBirth: { type: Date },
    avatarUrl: {
      type: String,
      default:
        "https://i.pinimg.com/1200x/dc/6c/b0/dc6cb0521d182f959da46aaee82e742f.jpg",
    },
    role: { type: String, enum: ["admin", "customer", "shipper"], default: "customer" },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    balance: { type: Number, default: 0 },
    // Account verification and password reset
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, index: true },
    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: false }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
