import express from "express";
import Voucher from "../models/voucher.model.js";
import { verifyAdmin, verifyUser } from "../config/jwtConfig.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";

const router = express.Router();

// Validate voucher code
router.post("/vouchers/validate", verifyUser, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã voucher",
      });
    }

    // Find voucher - try multiple formats
    const normalizedCode = code.toUpperCase().trim();
    
    // Try exact match first
    let voucher = await Voucher.findOne({ code: normalizedCode });
    
    // If not found, try case-insensitive search
    if (!voucher) {
      voucher = await Voucher.findOne({ 
        code: { $regex: new RegExp(`^${normalizedCode}$`, 'i') } 
      });
    }
    
    if (!voucher) {
      // Debug: Log available vouchers
      const allVouchers = await Voucher.find({}).select('code isActive').limit(10);
      console.log('Available vouchers:', allVouchers.map(v => v.code));
      console.log('Searching for code:', normalizedCode);
      
      return res.status(404).json({
        success: false,
        message: `Mã voucher "${code}" không tồn tại`,
        debug: {
          searchedCode: normalizedCode,
          availableCodes: allVouchers.map(v => v.code)
        }
      });
    }

    // Get cart total
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.product",
      select: "price originalPrice discount discountAmount isOnSale",
    });

    let cartTotal = 0;
    if (cart && cart.items) {
      cart.items.forEach((item) => {
        if (item.product) {
          let itemPrice = item.product.price;
          
          // Calculate sale price if product is on sale
          if (item.product.isOnSale) {
            const now = new Date();
            const startValid = !item.product.saleStartDate || now >= item.product.saleStartDate;
            const endValid = !item.product.saleEndDate || now <= item.product.saleEndDate;
            
            if (startValid && endValid) {
              if (item.product.discount > 0) {
                const basePrice = item.product.originalPrice || item.product.price;
                itemPrice = basePrice * (1 - item.product.discount / 100);
              } else if (item.product.discountAmount > 0) {
                const basePrice = item.product.originalPrice || item.product.price;
                itemPrice = Math.max(0, basePrice - item.product.discountAmount);
              }
            }
          }
          
          cartTotal += itemPrice * item.quantity;
        }
      });
    }

    // Validate voucher
    const validation = voucher.isValid(userId, cartTotal);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // Calculate discount
    let discount = 0;
    let freeShipping = false;

    if (voucher.type === "percentage") {
      discount = cartTotal * (voucher.discountValue / 100);
      if (voucher.maxDiscountAmount) {
        discount = Math.min(discount, voucher.maxDiscountAmount);
      }
    } else if (voucher.type === "fixed") {
      discount = voucher.discountValue;
    } else if (voucher.type === "free_shipping") {
      freeShipping = true;
    }

    discount = Math.min(discount, cartTotal);

    res.json({
      success: true,
      message: "Voucher hợp lệ",
      voucher: {
        _id: voucher._id,
        code: voucher.code,
        name: voucher.name,
        type: voucher.type,
        discount: Math.round(discount),
        freeShipping: freeShipping,
      },
    });
  } catch (error) {
    console.error("Error validating voucher:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi kiểm tra voucher",
      error: error.message,
    });
  }
});

// Get all active vouchers (public)
router.get("/vouchers/active", async (req, res) => {
  try {
    const now = new Date();
    const vouchers = await Voucher.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .select("code name description type discountValue minPurchaseAmount startDate endDate")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: vouchers,
      count: vouchers.length,
    });
  } catch (error) {
    console.error("Error fetching active vouchers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vouchers",
      error: error.message,
    });
  }
});

// Fix and normalize all voucher codes (Admin only)
router.post("/vouchers/fix-codes", verifyAdmin, async (req, res) => {
  try {
    const vouchers = await Voucher.find({});
    let fixedCount = 0;

    for (const voucher of vouchers) {
      const normalizedCode = voucher.code.toUpperCase().trim().replace(/\s+/g, '');
      if (voucher.code !== normalizedCode) {
        // Check if normalized code already exists
        const existing = await Voucher.findOne({ 
          code: normalizedCode,
          _id: { $ne: voucher._id }
        });
        
        if (existing) {
          console.log(`⚠️  Cannot fix ${voucher.code} -> ${normalizedCode} (already exists)`);
          continue;
        }
        
        voucher.code = normalizedCode;
        await voucher.save();
        fixedCount++;
        console.log(`✅ Fixed: ${voucher.code} -> ${normalizedCode}`);
      }
    }

    res.json({
      success: true,
      message: `Đã sửa ${fixedCount} voucher codes`,
      fixedCount: fixedCount,
    });
  } catch (error) {
    console.error("Error fixing voucher codes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fix voucher codes",
      error: error.message,
    });
  }
});

// Debug: Get all vouchers with details (for troubleshooting)
router.get("/vouchers/debug/all", async (req, res) => {
  try {
    const vouchers = await Voucher.find({})
      .select("code name type isActive startDate endDate usageLimit usedCount")
      .sort({ createdAt: -1 });

    const now = new Date();
    const vouchersWithStatus = vouchers.map(v => {
      const isValid = v.isActive && 
                     now >= v.startDate && 
                     now <= v.endDate &&
                     (!v.usageLimit || v.usedCount < v.usageLimit);
      
      return {
        code: v.code,
        name: v.name,
        type: v.type,
        isActive: v.isActive,
        isValid: isValid,
        startDate: v.startDate,
        endDate: v.endDate,
        usageLimit: v.usageLimit,
        usedCount: v.usedCount,
        codeLength: v.code.length,
        codeChars: v.code.split(''),
      };
    });

    res.json({
      success: true,
      data: vouchersWithStatus,
      count: vouchers.length,
      message: "Debug info - all vouchers in database",
    });
  } catch (error) {
    console.error("Error fetching vouchers for debug:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vouchers",
      error: error.message,
    });
  }
});

// Create voucher (Admin only)
router.post("/vouchers", verifyAdmin, async (req, res) => {
  try {
    const voucher = await Voucher.create(req.body);

    res.status(201).json({
      success: true,
      message: "Voucher created successfully",
      data: voucher,
    });
  } catch (error) {
    console.error("Error creating voucher:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Mã voucher đã tồn tại",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create voucher",
      error: error.message,
    });
  }
});

// Get all vouchers (Admin only)
router.get("/vouchers", verifyAdmin, async (req, res) => {
  try {
    const vouchers = await Voucher.find()
      .sort({ createdAt: -1 })
      .populate("applicableProducts", "name")
      .populate("usedBy.userId", "username");

    res.json({
      success: true,
      data: vouchers,
      count: vouchers.length,
    });
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vouchers",
      error: error.message,
    });
  }
});

// Get single voucher (Admin only)
router.get("/vouchers/:id", verifyAdmin, async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id)
      .populate("applicableProducts", "name")
      .populate("usedBy.userId", "username");

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found",
      });
    }

    res.json({
      success: true,
      data: voucher,
    });
  } catch (error) {
    console.error("Error fetching voucher:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch voucher",
      error: error.message,
    });
  }
});

// Update voucher (Admin only)
router.put("/vouchers/:id", verifyAdmin, async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found",
      });
    }

    res.json({
      success: true,
      message: "Voucher updated successfully",
      data: voucher,
    });
  } catch (error) {
    console.error("Error updating voucher:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update voucher",
      error: error.message,
    });
  }
});

// Delete voucher (Admin only)
router.delete("/vouchers/:id", verifyAdmin, async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found",
      });
    }

    res.json({
      success: true,
      message: "Voucher deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting voucher:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete voucher",
      error: error.message,
    });
  }
});

export default router;

