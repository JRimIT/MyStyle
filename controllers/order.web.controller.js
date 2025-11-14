import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import { countProduct } from "./countCart.js";
import moment from "moment";
import qs from "qs";
import crypto from "crypto";

/* ================= Helpers ================= */

function computeItemPrice(p) {
  let price = Number(p.price) || 0;

  if (p.isOnSale) {
    const now = new Date();
    const startValid = !p.saleStartDate || now >= p.saleStartDate;
    const endValid = !p.saleEndDate || now <= p.saleEndDate;

    if (startValid && endValid) {
      const base = Number(p.originalPrice || p.price) || 0;

      if (p.discount > 0) {
        price = base * (1 - p.discount / 100);
      } else if (p.discountAmount > 0) {
        price = Math.max(0, base - p.discountAmount);
      }
    }
  }

  return price;
}

async function loadCartAndTotals(userId) {
  const cart = await Cart.findOne({ userId }).populate({
    path: "items.product",
    select:
      "name price originalPrice discount discountAmount isOnSale saleStartDate saleEndDate imageUrl category sizes",
  });

  if (!cart || !cart.items || cart.items.length === 0) return { cart: null };

  let subtotal = 0;
  let totalItems = 0;

  cart.items.forEach((it) => {
    if (!it.product) return;
    const price = computeItemPrice(it.product);
    subtotal += price * it.quantity;
    totalItems += it.quantity;
  });

  let shipping = subtotal > 500000 ? 0 : 30000;
  let voucherDiscount = 0;
  let freeShipping = false;

  if (cart.appliedVoucher && cart.appliedVoucher.voucherId) {
    voucherDiscount = Number(cart.appliedVoucher.discount || 0);
    freeShipping = !!cart.appliedVoucher.freeShipping;
    if (freeShipping) shipping = 0;
  }

  const total = Math.max(0, subtotal - voucherDiscount + shipping);

  return {
    cart,
    totals: {
      subtotal,
      totalItems,
      shipping,
      voucherDiscount,
      freeShipping,
      total,
    },
  };
}

function sortObject(obj) {
  const out = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => (out[k] = obj[k]));
  return out;
}

/**
 * Build chuỗi hash theo đúng chuẩn VNPay:
 *  - sort key
 *  - urlencode key, value
 *  - space -> '+'
 */
function buildVnpHashData(params) {
  const sorted = sortObject(params);
  return Object.keys(sorted)
    .map((key) => {
      const value = sorted[key];
      const encKey = encodeURIComponent(key);
      const encVal = encodeURIComponent(value).replace(/%20/g, "+");
      return `${encKey}=${encVal}`;
    })
    .join("&");
}

/* ================= Web Checkout ================= */

/* ====== GET /view/checkout ====== */
export async function viewCheckoutPage(req, res) {
  try {
    if (!req.user || !req.user.userId) {
      req.session.flash = {
        type: "error",
        message: "Vui lòng đăng nhập trước khi thanh toán.",
      };
      return res.redirect("/login");
    }

    const userId = req.user.userId;
    const User = (await import("../models/user.model.js")).default;
    const user = await User.findById(userId);

    const data = await loadCartAndTotals(userId);
    if (!data.cart) {
      req.session.flash = { type: "warning", message: "Giỏ hàng trống!" };
      return res.redirect("/view/cart");
    }

    const cartCount = await countProduct(userId);

    return res.render("pages/Checkout", {
      user,
      cart: data.cart,
      cartCount,
      ...data.totals,
    });
  } catch (e) {
    console.error("viewCheckoutPage error:", e);
    return res.status(500).send("Lỗi hiển thị trang thanh toán.");
  }
}

/* ====== POST /checkout (VNPay Direct / CardBank / COD) ====== */
export async function createOrderWeb(req, res) {
  try {
    // 1. Kiểm tra đăng nhập
    if (!req.user || !req.user.userId) {
      req.session.flash = {
        type: "error",
        message: "Vui lòng đăng nhập trước khi thanh toán.",
      };
      return res.redirect("/login");
    }
    const userId = req.user.userId;

    // 2. Lấy dữ liệu form
    const { fullName, phone, address, note, paymentMethod, bankCode } = req.body;

    if (!fullName || !phone || !address) {
      req.session.flash = {
        type: "error",
        message: "Vui lòng điền đầy đủ Họ tên, SĐT và Địa chỉ.",
      };
      return res.redirect("/view/checkout");
    }

    // 3. Lấy giỏ hàng
    const data = await loadCartAndTotals(userId);
    if (!data.cart) {
      req.session.flash = { type: "error", message: "Giỏ hàng trống!" };
      return res.redirect("/view/cart");
    }

    const snapshotItems = data.cart.items
      .filter((it) => it.product)
      .map((it) => ({
        productId: it.product._id,
        quantity: it.quantity,
        price: computeItemPrice(it.product),
      }));

    const total = data.totals.total;

    // 4. Chuẩn hóa kiểu thanh toán
    // UI hiện tại:
    //   - "direct"   → VNPay không chọn sẵn bank
    //   - "cardbank" → VNPay với bankCode
    //   - (sau này) "cod"     → thanh toán khi nhận
    let method = paymentMethod || "cardbank"; // default: cardbank
    let vnpSubType = null;

    if (method === "direct" || method === "cardbank") {
      vnpSubType = method;
      method = "vnpay";
    }

    // 5. Tạo đơn hàng Pending trong DB
    const order = await Order.create({
      userId,
      items: snapshotItems.map((x) => ({
        productId: x.productId,
        price: x.price,
        qty: x.quantity,
      })),
      total,
      status: "unpaid",
      shippingAddress: { fullName, phone, address, note },
      payment: {
        status: "pending",
        amount: total,
        via: method,
      },
    });

    const clearCartState = async () => {
      data.cart.items = [];
      data.cart.appliedVoucher = {
        voucherId: null,
        code: null,
        discount: 0,
        freeShipping: false,
      };
      await data.cart.save();
    };

    /* ===== Trường hợp ví MyStyle ===== */
    if (method === "wallet") {
      const User = (await import("../models/user.model.js")).default;
      const walletUser = await User.findById(userId).select("balance email username");
      if (!walletUser) {
        await order.deleteOne();
        req.session.flash = {
          type: "error",
          message: "Không tìm thấy tài khoản để trừ ví.",
        };
        return res.redirect("/view/checkout");
      }

      const currentBalance = Number(walletUser.balance || 0);
      if (currentBalance < total) {
        await order.deleteOne();
        req.session.flash = {
          type: "error",
          message: "Số dư ví MyStyle của bạn không đủ để thanh toán.",
        };
        return res.redirect("/view/checkout");
      }

      walletUser.balance = currentBalance - total;
      await walletUser.save();

      order.status = "paid";
      order.payment = {
        ...(order.payment || {}),
        status: "success",
        via: "wallet",
        amount: total,
        message: "Paid via MyStyle Wallet",
      };
      await order.save();
      await clearCartState();

      if (req.session.user) {
        req.session.user.balance = walletUser.balance;
      }

      try {
        if (walletUser?.email) {
          const { sendEmail } = await import("../utils/mailer.js");
          await sendEmail(
            walletUser.email,
            "Thanh toán thành công",
            `<p>Đơn hàng ${order._id} đã được thanh toán thành công bằng ví MyStyle.</p>`
          );
        }
      } catch (emailErr) {
        console.warn("send mail wallet failed", emailErr?.message);
      }

      req.session.checkoutSuccess = {
        successMode: "wallet",
        orderCode: order._id,
        amount: total,
        bankCode: "Ví MyStyle",
        walletBalance: walletUser.balance,
      };
      req.session.flash = {
        type: "success",
        message: "Thanh toán bằng ví MyStyle thành công!",
      };
      return res.redirect("/view/checkout-success");
    }

    /* ===== Trường hợp COD (nếu sau này bạn thêm radio COD) ===== */
    if (method === "cod") {
      await clearCartState();

      try {
        const User = (await import("../models/user.model.js")).default;
        const u = await User.findById(userId).select("email username");
        if (u?.email) {
          const { sendEmail } = await import("../utils/mailer.js");
          await sendEmail(
            u.email,
            "Xác nhận đặt hàng",
            `<p>Đơn hàng ${order._id} đã được ghi nhận với hình thức thanh toán khi nhận hàng (COD).</p>`
          );
        }
      } catch (e) {
        console.warn("send mail COD failed", e?.message);
      }

      req.session.checkoutSuccess = {
        successMode: "cod",
        orderCode: order._id,
        amount: total,
      };
      req.session.flash = { type: "success", message: "Đặt hàng thành công!" };
      return res.redirect("/view/checkout-success");
    }

    /* ===== Trường hợp VNPay ===== */

    // 6. Check config VNPay
    for (const key of ["VNP_TMNCODE", "VNP_HASHSECRET", "VNP_URL"]) {
      if (!process.env[key] || /YOUR_/i.test(process.env[key])) {
        const msg = `VNPay config invalid: ${key} = ${process.env[key]}`;
        console.error(msg);
        req.session.flash = { type: "error", message: "VNPay chưa cấu hình đúng." };
        return res.redirect("/view/checkout");
      }
    }

    const tmnCode = (process.env.VNP_TMNCODE || "").trim();
    const secretKey = (process.env.VNP_HASHSECRET || "").trim();
    const vnpUrl =
      (process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html").trim();

    // ✅ DÙNG TRỰC TIẾP GIÁ TRỊ TỪ .env (có localhost cũng dùng)
    const returnUrl =
      (process.env.VNP_RETURNURL || "http://localhost:4001/vnpay/return").trim();
    console.log("[VNPay] Using ReturnUrl:", returnUrl);

    // 7. Chuẩn hoá IP thành IPv4
    const rawIp =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      "";
    const ipv4 = (rawIp.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/) || [])[0] || "127.0.0.1";

    const createDate = moment().format("YYYYMMDDHHmmss");
    const vnp_TxnRef = moment().format("DDHHmmss"); // tham chiếu duy nhất

    const orderInfo = `Thanh toan don hang ${order._id}`;

    const amountVnd = Math.round(Number(total || 0));
    if (!Number.isFinite(amountVnd) || amountVnd <= 0) {
      const msg = `Tổng tiền không hợp lệ: amountVnd = ${amountVnd}`;
      console.error(msg);
      req.session.flash = { type: "error", message: "Tổng tiền không hợp lệ." };
      return res.redirect("/view/checkout");
    }

    // 8. Build params gửi VNPay
    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: vnp_TxnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: "other",
      vnp_Amount: String(amountVnd * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipv4,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: moment().add(15, "minutes").format("YYYYMMDDHHmmss"),
    };

    // Thêm BankCode nếu chọn CardBank
    if (vnpSubType === "cardbank") {
      let bc = String(bankCode || "INTCARD").toUpperCase();
      if (["VISA", "MASTERCARD", "JCB"].includes(bc)) bc = "INTCARD";
      const allowed = new Set(["VNPAYQR", "VNBANK", "INTCARD", "NCB"]);
      if (allowed.has(bc)) vnp_Params.vnp_BankCode = bc;
      else console.warn("[VNPay] Ignore unsupported bankCode:", bankCode);
    }

    // 9. Ký hash theo chuẩn VNPay
    const signData = buildVnpHashData(vnp_Params);
    console.log("[VNPay] signData:", signData);

    const secureHash = crypto
      .createHmac("sha512", secretKey)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");
    console.log("[VNPay] secureHash:", secureHash);

    vnp_Params.vnp_SecureHash = secureHash;
    vnp_Params.vnp_SecureHashType = "SHA512";

    const paymentUrl = `${vnpUrl}?${qs.stringify(vnp_Params, { encode: true })}`;
    console.log("[VNPay] Params: ", vnp_Params);

    // Lưu tham chiếu để sau này tìm đơn theo vnp_TxnRef
    order.payment = {
      ...(order.payment || {}),
      status: "pending",
      amount: total,
      via: "vnpay",
      txnNo: vnp_TxnRef,
    };
    await order.save();

    console.log("Redirect VNPay URL:", paymentUrl);
    return res.redirect(paymentUrl);
  } catch (e) {
    console.error("createOrderWeb error:", e.stack || e);
    req.session.flash = {
      type: "error",
      message: "Không thể đặt hàng. Vui lòng thử lại sau.",
    };
    return res.redirect("/view/checkout");
  }
}

/* ================= VNPay Return & IPN ================= */

/* ====== GET /vnpay/return ====== */
export async function vnpayReturn(req, res) {
  try {
    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const signData = buildVnpHashData(vnp_Params);
    const signed = crypto
      .createHmac("sha512", process.env.VNP_HASHSECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    const ok = secureHash === signed;
    const vnp_TxnRef = vnp_Params["vnp_TxnRef"];
    const order = await Order.findOne({ "payment.txnNo": vnp_TxnRef });

    if (!order) {
      return res.render("pages/CheckoutFail", { reason: "Không tìm thấy đơn hàng" });
    }

    if (ok && vnp_Params["vnp_ResponseCode"] === "00") {
      // cập nhật trạng thái
      order.status = "paid";
      order.vnp_TransactionNo = vnp_Params["vnp_TransactionNo"] || "";
      order.vnp_ResponseCode = vnp_Params["vnp_ResponseCode"] || "";
      order.vnp_BankCode = vnp_Params["vnp_BankCode"] || "";
      order.vnp_PayDate = vnp_Params["vnp_PayDate"] || "";
      order.payment = {
        ...(order.payment || {}),
        status: "success",
        via: "vnpay",
        amount: order.total,
        bankCode: vnp_Params["vnp_BankCode"] || "",
        bankTranNo: vnp_Params["vnp_BankTranNo"] || "",
        txnNo: vnp_TxnRef,
        payDate: vnp_Params["vnp_PayDate"] || "",
        message: "Payment Success",
      };
      await order.save();

      // clear cart
      const cart = await Cart.findOne({ userId: order.userId });
      if (cart) {
        cart.items = [];
        cart.appliedVoucher = {
          voucherId: null,
          code: null,
          discount: 0,
          freeShipping: false,
        };
        await cart.save();
      }

      return res.render("checkoutSuccess", {
        orderCode: order._id,
        amount: order.total,
        bankCode: vnp_Params["vnp_BankCode"] || "",
        transNo: vnp_Params["vnp_TransactionNo"] || "",
        payDate: vnp_Params["vnp_PayDate"] || "",
      });
    }

    order.status = "cancel";
    order.vnp_ResponseCode = vnp_Params["vnp_ResponseCode"] || "xx";
    await order.save();

    return res.render("pages/CheckoutFail", {
      reason: "Thanh toán thất bại hoặc bị hủy.",
    });
  } catch (e) {
    console.error("vnpayReturn error:", e);
    return res.render("pages/CheckoutFail", {
      reason: "Lỗi xử lý kết quả thanh toán.",
    });
  }
}

/* ====== GET /vnpay/ipn ====== */
export async function vnpayIpn(req, res) {
  try {
    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const signData = buildVnpHashData(vnp_Params);
    const signed = crypto
      .createHmac("sha512", process.env.VNP_HASHSECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    if (secureHash !== signed) {
      return res.status(200).json({ RspCode: "97", Message: "Invalid signature" });
    }

    const vnp_TxnRef = vnp_Params["vnp_TxnRef"];
    const order = await Order.findOne({ "payment.txnNo": vnp_TxnRef });
    if (!order) return res.status(200).json({ RspCode: "01", Message: "Order not found" });

    const amountFromVnp = Number(vnp_Params["vnp_Amount"] || 0) / 100;
    if (amountFromVnp !== Number(order.total)) {
      return res.status(200).json({ RspCode: "04", Message: "Invalid amount" });
    }

    if (order.status === "paid") {
      return res.status(200).json({ RspCode: "02", Message: "Order already confirmed" });
    }

    const rspCode = vnp_Params["vnp_ResponseCode"];
    if (rspCode === "00") {
      order.status = "paid";
      order.payment = {
        ...(order.payment || {}),
        status: "success",
        via: "vnpay",
        amount: order.total,
        bankCode: vnp_Params["vnp_BankCode"] || "",
        bankTranNo: vnp_Params["vnp_BankTranNo"] || "",
        txnNo: vnp_TxnRef,
        payDate: vnp_Params["vnp_PayDate"] || "",
        message: "Payment Success",
      };
      await order.save();
      return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
    } else {
      order.status = "cancel";
      order.payment = {
        ...(order.payment || {}),
        status: "failed",
        via: "vnpay",
        amount: order.total,
        bankCode: vnp_Params["vnp_BankCode"] || "",
        bankTranNo: vnp_Params["vnp_BankTranNo"] || "",
        txnNo: vnp_TxnRef,
        payDate: vnp_Params["vnp_PayDate"] || "",
        message: `Failed: ${rspCode}`,
      };
      await order.save();
      return res.status(200).json({ RspCode: "00", Message: "Confirm Failed" });
    }
  } catch (e) {
    console.error("vnpayIpn error:", e);
    return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
}

/* ====== GET /view/checkout-success (COD/Wallet) ====== */
export function viewOrderSuccess(req, res) {
  const successPayload = req.session.checkoutSuccess || {};
  delete req.session.checkoutSuccess;
  return res.render("checkoutSuccess", successPayload);
}

/* ====== GET /orders/:orderId ====== */
export async function viewOrderDetail(req, res) {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "items.productId",
      "name imageUrl price"
    );
    if (!order) return res.status(404).render("errors/404");
    return res.render("pages/OrderDetail", { order });
  } catch (e) {
    console.error("viewOrderDetail error:", e);
    return res.status(500).render("errors/500");
  }
}

/* ====== GET /orders/track/:orderId ====== */
export async function viewOrderTrack(req, res) {
  try {
    const order = await Order.findById(req.params.orderId).lean();
    if (!order) return res.status(404).render("errors/404");
    if (!req.user || String(order.userId) !== String(req.user.userId))
      return res.status(403).render("errors/403");
    return res.render("pages/OrderTrack", { order });
  } catch (e) {
    console.error("viewOrderTrack error:", e);
    return res.status(500).render("errors/500");
  }
}

/* ====== POST /orders/:orderId/cancel ====== */
export async function cancelOrder(req, res) {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!req.user || String(order.userId) !== String(req.user.userId))
      return res.status(403).json({ message: "Forbidden" });

    if (order.status !== "unpaid")
      return res.status(400).json({ message: "Cannot cancel this order" });

    order.status = "cancel";
    await order.save();
    return res.json({ ok: true });
  } catch (e) {
    console.error("cancelOrder error:", e);
    return res.status(500).json({ message: "Cancel failed" });
  }
}

/* ====== GET /orders (current user) ====== */
export async function viewOrdersList(req, res) {
  try {
    if (!req.user || !req.user.userId) return res.redirect("/login");
    const orders = await Order.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select("_id status total createdAt payment.status")
      .lean();
    return res.render("pages/Orders", { orders });
  } catch (e) {
    console.error("viewOrdersList error:", e);
    return res.status(500).render("errors/500");
  }
}

export async function viewInvoice(req, res) {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "items.productId",
      "name imageUrl price"
    );
    if (!order) return res.status(404).render("errors/404");
    if (
      !req.user ||
      (String(order.userId) !== String(req.user.userId) && req.user.role !== "admin")
    )
      return res.status(403).render("errors/403");
    return res.render("pages/Invoice", { order });
  } catch (e) {
    console.error("viewInvoice error:", e);
    return res.status(500).render("errors/500");
  }
}
