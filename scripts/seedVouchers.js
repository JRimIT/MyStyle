import mongoose from "mongoose";
import dotenv from "dotenv";
import Voucher from "../models/voucher.model.js";

dotenv.config();

// Sample vouchers data
const vouchersData = [
  {
    code: "SALE10",
    name: "Giảm 10%",
    description: "Giảm 10% cho đơn hàng từ 100k",
    type: "percentage",
    discountValue: 10,
    minPurchaseAmount: 100000,
    maxDiscountAmount: 50000,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2025-12-31"),
    isActive: true,
    usageLimit: 1000,
    usageLimitPerUser: 1,
  },
  {
    code: "SALE20",
    name: "Giảm 20%",
    description: "Giảm 20% cho đơn hàng từ 200k",
    type: "percentage",
    discountValue: 20,
    minPurchaseAmount: 200000,
    maxDiscountAmount: 100000,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2025-12-31"),
    isActive: true,
    usageLimit: 500,
    usageLimitPerUser: 1,
  },
  {
    code: "FREESHIP",
    name: "Miễn phí vận chuyển",
    description: "Miễn phí vận chuyển cho mọi đơn hàng",
    type: "free_shipping",
    discountValue: 0,
    minPurchaseAmount: 0,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2025-12-31"),
    isActive: true,
    usageLimit: null,
    usageLimitPerUser: 1,
  },
  {
    code: "DISCOUNT50K",
    name: "Giảm 50k",
    description: "Giảm 50,000 VND cho đơn hàng từ 300k",
    type: "fixed",
    discountValue: 50000,
    minPurchaseAmount: 300000,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2025-12-31"),
    isActive: true,
    usageLimit: 200,
    usageLimitPerUser: 1,
  },
  {
    code: "WELCOME",
    name: "Voucher chào mừng",
    description: "Giảm 15% cho khách hàng mới",
    type: "percentage",
    discountValue: 15,
    minPurchaseAmount: 50000,
    maxDiscountAmount: 75000,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2025-12-31"),
    isActive: true,
    usageLimit: null,
    usageLimitPerUser: 1,
  },
];

async function seedVouchers() {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/MyStyle");
    console.log("✅ Connected to MongoDB successfully!");

    // Clear existing vouchers (optional - comment out if you want to keep existing)
    // console.log("🗑️  Clearing existing vouchers...");
    // await Voucher.deleteMany({});
    // console.log("✅ Cleared existing vouchers!");

    // Insert new vouchers
    console.log("📝 Inserting vouchers...");
    const insertedVouchers = [];
    
    for (const voucherData of vouchersData) {
      // Check if voucher already exists
      const existing = await Voucher.findOne({ code: voucherData.code });
      if (existing) {
        console.log(`⚠️  Voucher ${voucherData.code} already exists, skipping...`);
        continue;
      }
      
      const voucher = await Voucher.create(voucherData);
      insertedVouchers.push(voucher);
      console.log(`✅ Created voucher: ${voucher.code}`);
    }

    console.log(`\n✨ Successfully created ${insertedVouchers.length} vouchers!`);

    // Display created vouchers
    console.log("\n📋 Created Vouchers:");
    insertedVouchers.forEach((v, index) => {
      console.log(`${index + 1}. ${v.code} - ${v.name} (${v.type})`);
      console.log(`   Min purchase: ${v.minPurchaseAmount.toLocaleString('vi-VN')} VND`);
      console.log(`   Valid until: ${v.endDate.toLocaleDateString('vi-VN')}`);
    });

    // Display all vouchers
    const allVouchers = await Voucher.find({}).select('code name type isActive');
    console.log(`\n📊 Total vouchers in database: ${allVouchers.length}`);
    console.log("All voucher codes:", allVouchers.map(v => v.code).join(", "));

  } catch (error) {
    console.error("❌ Error seeding vouchers:", error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
    process.exit(0);
  }
}

// Run the seed function
seedVouchers();

