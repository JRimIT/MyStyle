import express from "express";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { verifyUserOrRedirect as verifyUser } from "../config/jwtConfig.js";
import { countProduct } from "../controllers/countCart.js";

const router = express.Router();

// Test route to verify cart routes are working
router.get("/cart/test", (req, res) => {
  console.log("✅ Cart test route hit!");
  res.json({ success: true, message: "Cart routes are working!" });
});

// Simple test POST route
router.post("/cart/test-post", (req, res) => {
  console.log("✅ Cart POST test route hit!");
  console.log("Body:", req.body);
  res.json({ success: true, message: "Cart POST routes are working!", body: req.body });
});

// Log all routes when module loads
console.log("📦 Cart routes loaded:");
console.log("  - GET /view/cart");
console.log("  - POST /cart/add");
console.log("  - PUT /cart/update/:itemId");
console.log("  - DELETE /cart/remove/:itemId");
console.log("  - DELETE /cart/clear");
console.log("  - POST /cart/apply-voucher");
console.log("  - POST /cart/remove-voucher");

// View cart page
router.get("/view/cart", verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user info
    const User = (await import("../models/user.model.js")).default;
    const user = await User.findById(userId);
    
    // Get cart with populated products
    let cart = await Cart.findOne({ userId }).populate({
      path: "items.product",
      select: "name price originalPrice discount discountAmount isOnSale saleStartDate saleEndDate imageUrl category sizes",
    });

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Calculate totals
    let subtotal = 0;
    let totalItems = 0;

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
        
        subtotal += itemPrice * item.quantity;
        totalItems += item.quantity;
      }
    });

    // Calculate shipping
    let shipping = subtotal > 500000 ? 0 : 30000;
    
    // Apply voucher discount if exists
    let voucherDiscount = 0;
    let freeShipping = false;
    let appliedVoucher = null;
    
    if (cart.appliedVoucher && cart.appliedVoucher.voucherId) {
      voucherDiscount = cart.appliedVoucher.discount || 0;
      freeShipping = cart.appliedVoucher.freeShipping || false;
      appliedVoucher = cart.appliedVoucher;
      
      if (freeShipping) {
        shipping = 0;
      }
    }
    
    const discountTotal = voucherDiscount;
    const total = subtotal - discountTotal + shipping;

    const cartCount = await countProduct(userId);

    res.render("pages/Cart", {
      cart: cart,
      user: user,
      cartCount: cartCount,
      subtotal: subtotal,
      shipping: shipping,
      voucherDiscount: voucherDiscount,
      freeShipping: freeShipping,
      appliedVoucher: appliedVoucher,
      total: total,
      totalItems: totalItems,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Add to cart
router.post("/cart/add", verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required",
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += parseInt(quantity);
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity: parseInt(quantity),
      });
    }

    await cart.save();

    const cartCount = await countProduct(userId);

    res.json({
      success: true,
      message: "Product added to cart",
      cartCount: cartCount,
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
      error: error.message,
    });
  }
});

// Update cart item quantity
router.put("/cart/update/:itemId", verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    item.quantity = parseInt(quantity);
    await cart.save();

    // Recalculate totals
    await cart.populate({
      path: "items.product",
      select: "price",
    });

    let subtotal = 0;
    cart.items.forEach((item) => {
      if (item.product) {
        subtotal += item.product.price * item.quantity;
      }
    });

    const shipping = subtotal > 500000 ? 0 : 30000;
    const total = subtotal + shipping;

    res.json({
      success: true,
      message: "Cart updated",
      subtotal: subtotal,
      shipping: shipping,
      total: total,
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update cart",
      error: error.message,
    });
  }
});

// Remove item from cart
router.delete("/cart/remove/:itemId", verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) => item._id.toString() !== itemId
    );
    await cart.save();

    const cartCount = await countProduct(userId);

    res.json({
      success: true,
      message: "Item removed from cart",
      cartCount: cartCount,
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove item",
      error: error.message,
    });
  }
});

// Clear cart
router.delete("/cart/clear", verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = [];
    cart.appliedVoucher = {
      voucherId: null,
      code: null,
      discount: 0,
      freeShipping: false,
    };
    await cart.save();

    res.json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: error.message,
    });
  }
});

// Apply voucher to cart
router.post("/cart/apply-voucher", async (req, res, next) => {
  console.log("🔔 POST /cart/apply-voucher hit!");
  console.log("Request body:", req.body);
  console.log("Request user:", req.user);
  
  // Use verifyUser middleware manually to handle errors better
  if (!req.user || !req.user.userId) {
    const authHeader = req.headers["authorization"] || (req.session?.token ? `Bearer ${req.session.token}` : null);
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để sử dụng voucher",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để sử dụng voucher",
      });
    }

    try {
      const jwt = (await import("jsonwebtoken")).default;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!",
      });
    }
  }

  try {
    const userId = req.user.userId;
    const { code } = req.body;
    
    console.log(`📝 Apply voucher request - User: ${userId}, Code: ${code}`);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã voucher",
      });
    }

    // Find voucher - try multiple formats
    const Voucher = (await import("../models/voucher.model.js")).default;
    const normalizedCode = code.toUpperCase().trim().replace(/\s+/g, '');
    
    console.log(`🔍 Searching for voucher code: "${code}" -> normalized: "${normalizedCode}"`);
    
    // Try exact match first
    let voucher = await Voucher.findOne({ code: normalizedCode });
    
    // If not found, try case-insensitive search
    if (!voucher) {
      voucher = await Voucher.findOne({ 
        code: { $regex: new RegExp(`^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
      });
    }
    
    // If still not found, try removing all spaces and special chars
    if (!voucher) {
      const cleanCode = normalizedCode.replace(/[^A-Z0-9]/g, '');
      if (cleanCode !== normalizedCode) {
        voucher = await Voucher.findOne({ 
          code: { $regex: new RegExp(`^${cleanCode}$`, 'i') } 
        });
      }
    }
    
    // Debug: Log all vouchers to help troubleshoot
    if (!voucher) {
      const allVouchers = await Voucher.find({}).select('code isActive startDate endDate').limit(20);
      console.log('📋 Available vouchers in database:');
      allVouchers.forEach(v => {
        console.log(`  - Code: "${v.code}" (length: ${v.code.length}, active: ${v.isActive})`);
      });
      console.log(`❌ Voucher not found. Searched: "${normalizedCode}"`);
      
      return res.status(404).json({
        success: false,
        message: `Mã voucher "${code}" không tồn tại`,
        debug: {
          searchedCode: normalizedCode,
          originalCode: code,
          availableCodes: allVouchers.map(v => v.code),
          hint: 'Kiểm tra lại mã voucher hoặc sử dụng nút "Fix Codes" trong admin panel'
        }
      });
    }
    
    console.log(`✅ Found voucher: ${voucher.code}`);

    // Get cart with products
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.product",
      select: "price originalPrice discount discountAmount isOnSale saleStartDate saleEndDate",
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống, không thể áp dụng voucher",
      });
    }

    // Calculate cart total
    let cartTotal = 0;
    cart.items.forEach((item) => {
      if (item.product) {
        let itemPrice = item.product.price;
        
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

    // Apply voucher to cart
    cart.appliedVoucher = {
      voucherId: voucher._id,
      code: voucher.code,
      discount: Math.round(discount),
      freeShipping: freeShipping,
    };
    cart.updatedAt = Date.now();
    await cart.save();

    res.json({
      success: true,
      message: "Áp dụng voucher thành công",
      voucher: {
        code: voucher.code,
        name: voucher.name,
        discount: Math.round(discount),
        freeShipping: freeShipping,
      },
    });
  } catch (error) {
    console.error("Error applying voucher:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi áp dụng voucher",
      error: error.message,
    });
  }
});

// Remove voucher from cart
router.post("/cart/remove-voucher", verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.appliedVoucher = {
      voucherId: null,
      code: null,
      discount: 0,
      freeShipping: false,
    };
    cart.updatedAt = Date.now();
    await cart.save();

    res.json({
      success: true,
      message: "Đã gỡ voucher khỏi giỏ hàng",
    });
  } catch (error) {
    console.error("Error removing voucher:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi gỡ voucher",
      error: error.message,
    });
  }
});

export default router;

