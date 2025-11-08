import express from "express";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Cart from "../models/cart.model.js";
import Voucher from "../models/voucher.model.js";
import { verifyUser } from "../config/jwtConfig.js";
import { countProduct } from "../controllers/countCart.js";

const router = express.Router();

// Checkout - Create order
router.post("/checkout", verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentMethod, address } = req.body;

    // Get cart
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.product",
      select: "name price originalPrice discount discountAmount isOnSale saleStartDate saleEndDate",
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    // Get user
    const user = await User.findById(userId);

    // Calculate subtotal with discounts
    let subtotal = 0;
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
        
        subtotal += itemPrice * item.quantity;
      }
    });

    // Calculate shipping
    let shipping = subtotal > 500000 ? 0 : 30000;
    
    // Apply voucher if exists
    let voucherDiscount = 0;
    if (cart.appliedVoucher && cart.appliedVoucher.voucherId) {
      const voucher = await Voucher.findById(cart.appliedVoucher.voucherId);
      if (voucher && voucher.isValid(userId, subtotal).valid) {
        voucherDiscount = cart.appliedVoucher.discount || 0;
        if (cart.appliedVoucher.freeShipping) {
          shipping = 0;
        }
        
        // Update voucher usage
        voucher.usedCount += 1;
        voucher.usedByUsers.push(userId);
        await voucher.save();
      }
    }

    const totalPrice = Math.max(0, subtotal + shipping - voucherDiscount);

    // Check payment
    if (paymentMethod === "wallet") {
      if (user.balance < totalPrice) {
        return res.status(400).json({
          success: false,
          message: "Số dư không đủ. Vui lòng nạp thêm tiền.",
          balance: user.balance,
          required: totalPrice,
        });
      }
      
      // Deduct from wallet
      user.balance -= totalPrice;
      await user.save();
    }

    // Create order
    const order = await Order.create({
      userId,
      items: cart.items.map(item => ({
        productId: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      })),
      totalPrice,
      address: address || user.address || "Chưa có địa chỉ",
      paymentMethod,
    });

    // Clear cart
    cart.items = [];
    cart.appliedVoucher = null;
    await cart.save();

    res.json({
      success: true,
      message: "Đặt hàng thành công!",
      orderId: order._id,
      totalPrice,
    });
  } catch (error) {
    console.error("Error checkout:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi đặt hàng",
      error: error.message,
    });
  }
});

// View user's orders
router.get("/orders", verifyUser, async (req, res) => {
  try {
    const userId = req.user.userId;

    const orders = await Order.find({ userId })
      .populate("items.productId", "name imageUrl")
      .sort({ createdAt: -1 });

    const user = await User.findById(userId);
    const cartCount = await countProduct(userId);

    res.render("pages/Orders", {
      orders,
      user,
      cartCount,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Cancel order
router.post("/orders/:orderId/cancel", verifyUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;

    // Find order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    // Check if user owns this order
    if (order.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy đơn hàng này",
      });
    }

    // Check if order can be cancelled
    if (order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã được hủy trước đó",
      });
    }

    if (order.status === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Không thể hủy đơn hàng đã giao",
      });
    }

    if (order.status === "Shipping") {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đang giao, không thể hủy. Vui lòng liên hệ CSKH",
      });
    }

    // Cancel order
    order.status = "Cancelled";
    order.cancelledAt = new Date();
    order.cancelReason = reason || "Khách hàng hủy đơn";

    // Refund if paid by wallet
    if (order.paymentMethod === "wallet") {
      const user = await User.findById(userId);
      user.balance += order.totalPrice;
      await user.save();
      order.refunded = true;
    }

    await order.save();

    res.json({
      success: true,
      message: order.paymentMethod === "wallet" 
        ? `Đơn hàng đã được hủy và hoàn ${order.totalPrice.toLocaleString('vi-VN')} VND vào ví`
        : "Đơn hàng đã được hủy thành công",
      refunded: order.refunded,
      refundAmount: order.paymentMethod === "wallet" ? order.totalPrice : 0,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi hủy đơn hàng",
      error: error.message,
    });
  }
});

export default router;

