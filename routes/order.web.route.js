import express from "express";
import Order from "../models/order.model.js";

const router = express.Router();

/** Render trang Checkout */
export const viewCheckout = async (req, res) => {
  // Giả định cart lưu trong session; chỉnh theo app của bạn
  const cart = req.session?.cart || { items: [], total: 0 };
  return res.render("pages/checkout", { cart, user: req.user });
};

/** POST /checkout/confirm  (tạo Order & điều hướng tới luồng thanh toán) */
export const postCheckoutConfirm = async (req, res) => {
  try {
    const { fullName, phone, address, note, paymentMethod, bankCode } = req.body;
    const cart = req.session?.cart || { items: [], total: 0 };
    if (!cart.items?.length) return res.status(400).send("Giỏ hàng trống.");

    // Tạo Order
    const order = await Order.create({
      userId: req.user?._id,
      items: cart.items,
      total: cart.total,
      shippingAddress: { fullName, phone, address, note },
      status: "unpaid",
      payment: { status: "pending", amount: cart.total },
    });

    // Điều hướng theo UC
    if (paymentMethod === "direct") {
      // UC-17
      return res.redirect(
        `/vnpay/direct?orderId=${order._id.toString()}&amount=${order.total}`
      );
    } else if (paymentMethod === "cardbank") {
      // UC-18 (kèm bankCode nếu có)
      const b = bankCode ? `&bankCode=${encodeURIComponent(bankCode)}` : "";
      return res.redirect(
        `/vnpay/cardbank?orderId=${order._id.toString()}&amount=${order.total}${b}`
      );
    } else {
      return res.redirect(`/OrderDetail/${order._id.toString()}`);
    }
  } catch (e) {
    console.error(e);
    return res.status(500).send("Checkout error");
  }
};

router.get("/checkout", viewCheckout);
router.post("/checkout/confirm", postCheckoutConfirm);

export default router;
