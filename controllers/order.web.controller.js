// controllers/order.web.controller.js
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

/* ================= Web Checkout ================= */

/* ====== GET /view/checkout ====== */
export async function viewCheckoutPage(req, res) {
  try {
    if (!req.user || !req.user.userId) {
      req.session.flash = {
        type: "error",
        message: "Vui lÃ²ng Ä‘Äƒng nháº­p trÆ°á»›c khi thanh toÃ¡n.",
      };
      return res.redirect("/login");
    }

    const userId = req.user.userId;
    const User = (await import("../models/user.model.js")).default;
    const user = await User.findById(userId);

    const data = await loadCartAndTotals(userId);
    if (!data.cart) {
      req.session.flash = { type: "warning", message: "Giá» hÃ ng trá»‘ng!" };
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
    return res.status(500).send("Lá»—i hiá»ƒn thá»‹ trang thanh toÃ¡n.");
  }
}

/* ====== POST /checkout (VNPay Direct / CardBank / COD) ====== */
export async function createOrderWeb(req, res) {
  try {
    // 1. Kiá»ƒm tra Ä‘Äƒng nháº­p
    if (!req.user || !req.user.userId) {
      req.session.flash = {
        type: "error",
        message: "Vui lÃ²ng Ä‘Äƒng nháº­p trÆ°á»›c khi thanh toÃ¡n.",
      };
      return res.redirect("/login");
    }
    const userId = req.user.userId;

    // 2. Láº¥y dá»¯ liá»‡u form
    const { fullName, phone, address, note, paymentMethod, bankCode } = req.body;

    if (!fullName || !phone || !address) {
      req.session.flash = {
        type: "error",
        message: "Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ Há» tÃªn, SÄT vÃ  Äá»‹a chá»‰.",
      };
      return res.redirect("/view/checkout");
    }

    // 3. Láº¥y giá» hÃ ng
    const data = await loadCartAndTotals(userId);
    if (!data.cart) {
      req.session.flash = { type: "error", message: "Giá» hÃ ng trá»‘ng!" };
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

    // 4. Chuáº©n hÃ³a kiá»ƒu thanh toÃ¡n
    //  UI hiá»‡n táº¡i:
    //   - "direct"   â†’ VNPay khÃ´ng chá»n sáºµn bank
    //   - "cardbank" â†’ VNPay vá»›i bankCode
    //   - (sau nÃ y) "cod" â†’ thanh toÃ¡n khi nháº­n
    let method = paymentMethod || "direct"; // default: direct
    let vnpSubType = null;

    if (method === "direct" || method === "cardbank") {
      vnpSubType = method;
      method = "vnpay";
    }

    // 5. Táº¡o Ä‘Æ¡n hÃ ng Pending trong DB
    const order = await Order.create({
      userId,
      items: snapshotItems.map((x) => ({ productId: x.productId, price: x.price, qty: x.quantity })),
      total,
      status: "unpaid",
      shippingAddress: { fullName, phone, address, note },
      payment: { status: method === "vnpay" ? "pending" : "pending", amount: total, via: method },
    });

    /* ===== TrÆ°á»ng há»£p COD (náº¿u sau nÃ y báº¡n thÃªm radio COD) ===== */
    if (method === "cod") {
      data.cart.items = [];
      data.cart.appliedVoucher = {
        voucherId: null,
        code: null,
        discount: 0,
        freeShipping: false,
      };
      await data.cart.save();

      req.session.flash = { type: "success", message: "Äáº·t hÃ ng thÃ nh cÃ´ng!" };
      return res.redirect("/view/checkout-success");
    }

    /* ===== TrÆ°á»ng há»£p VNPay ===== */

    // 6. Check config VNPay
    for (const key of ["VNP_TMNCODE", "VNP_HASHSECRET", "VNP_URL"]) {
      if (!process.env[key] || /YOUR_/i.test(process.env[key])) {
        const msg = `VNPay config invalid: ${key} = ${process.env[key]}`;
        console.error(msg);
        req.session.flash = { type: "error", message: "VNPay chÆ°a cáº¥u hÃ¬nh Ä‘Ãºng." };
        return res.redirect("/view/checkout");
      }
    }

    const tmnCode = process.env.VNP_TMNCODE;
    const secretKey = process.env.VNP_HASHSECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = (function () {
      const envUrl = (process.env.VNP_RETURNURL || "").trim();
      const isValidEnvUrl = (() => {
        try {
          const u = new URL(envUrl);
          return /^https?:$/i.test(u.protocol) && !!u.host && /\/vnpay\/return$/i.test(u.pathname);
        } catch { return false }
      })();
      if (isValidEnvUrl && !/localhost/i.test(envUrl)) return envUrl;
      const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").toString();
      const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString();
      if (host) return `${proto}://${host}/vnpay/return`;
      const fallbackPort = Number(process.env.PORT || 4000);
      return `http://localhost:${fallbackPort}/vnpay/return`;
    })();
    console.log("[VNPay] Using ReturnUrl:", returnUrl);

    // 7. Chuáº©n hoÃ¡ IP thÃ nh IPv4
    const rawIp =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      "";
    const ipv4 = (rawIp.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/) || [])[0] || "127.0.0.1";

    const createDate = moment().format("YYYYMMDDHHmmss");
    const vnp_TxnRef = moment().format("DDHHmmss"); // tham chiáº¿u duy nháº¥t

    const orderInfo = `Thanh toan don hang ${order._id}`;

    const amountVnd = Math.round(Number(total || 0));
    if (!Number.isFinite(amountVnd) || amountVnd <= 0) {
      const msg = `Tá»•ng tiá»n khÃ´ng há»£p lá»‡: amountVnd = ${amountVnd}`;
      console.error(msg);
      req.session.flash = { type: "error", message: "Tá»•ng tiá»n khÃ´ng há»£p lá»‡." };
      return res.redirect("/view/checkout");
    }

    // 8. Build params gá»­i VNPay
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

    // ThÃªm BankCode náº¿u chá»n CardBank
    if (vnpSubType === "cardbank" && bankCode) {
      let bc = String(bankCode || "").toUpperCase();
      if (["VISA", "MASTERCARD", "JCB"].includes(bc)) bc = "INTCARD";
      const allowed = new Set(["VNPAYQR", "VNBANK", "INTCARD", "NCB"]);
      if (allowed.has(bc)) vnp_Params.vnp_BankCode = bc; else console.warn("[VNPay] Ignore unsupported bankCode:", bankCode);
    }

    // 9. Sort keys & kÃ½ hash
    vnp_Params = Object.keys(vnp_Params)
      .sort()
      .reduce((o, k) => ((o[k] = vnp_Params[k]), o), {});

    const signData = qs.stringify(vnp_Params, { encode: false });

    // 🧠 Debug chi tiết VNPay
    console.log("========== VNPay DEBUG START ==========");
    console.log("[VNPay] TMNCODE:", tmnCode);
    console.log("[VNPay] HASHSECRET (ẩn):", secretKey ? "(đã có)" : "(thiếu!)");
    console.log("[VNPay] SIGN DATA:", signData);
    console.log("[VNPay] PARAMS trước hash:", vnp_Params);

    const secureHash = crypto
      .createHmac("sha512", secretKey)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    console.log("[VNPay] SECURE HASH (local):", secureHash);
    console.log("========== VNPay DEBUG END ==========\n");


    vnp_Params.vnp_SecureHash = secureHash;
    vnp_Params.vnp_SecureHashType = "SHA512";

    const paymentUrl = `${vnpUrl}?${qs.stringify(vnp_Params, { encode: true })}`;
    console.log("[VNPay] Params: ", vnp_Params);

    // LÆ°u tham chiáº¿u Ä‘á»ƒ sau nÃ y tÃ¬m Ä‘Æ¡n theo vnp_TxnRef
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
      message: "KhÃ´ng thá»ƒ Ä‘áº·t hÃ ng. Vui lÃ²ng thá»­ láº¡i sau.",
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

    const sorted = sortObject(vnp_Params);
    const signData = qs.stringify(sorted, { encode: false });
    const signed = crypto
      .createHmac("sha512", process.env.VNP_HASHSECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    const ok = secureHash === signed;
    const vnp_TxnRef = vnp_Params["vnp_TxnRef"];
    const order = await Order.findOne({ "payment.txnNo": vnp_TxnRef });

    if (!order) {
      return res.render("pages/CheckoutFail", { reason: "KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng" });
    }

    if (ok && vnp_Params["vnp_ResponseCode"] === "00") {
      // cáº­p nháº­t tráº¡ng thÃ¡i
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

    return res.render("pages/CheckoutFail", { reason: "Thanh toÃ¡n tháº¥t báº¡i hoáº·c bá»‹ há»§y." });
  } catch (e) {
    console.error("vnpayReturn error:", e);
    return res.render("pages/CheckoutFail", {
      reason: "Lá»—i xá»­ lÃ½ káº¿t quáº£ thanh toÃ¡n.",
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

    const sorted = sortObject(vnp_Params);
    const signData = qs.stringify(sorted, { encode: false });
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

/* ====== GET /view/checkout-success (COD) ====== */
export function viewOrderSuccess(_req, res) {
  return res.render("checkoutSuccess");
}

/* ====== GET /orders/:orderId ====== */
export async function viewOrderDetail(req, res) {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "items.productId",
      "name imageUrl price",
    );
    if (!order) return res.status(404).render("errors/404");
    return res.render("pages/OrderDetail", { order });
  } catch (e) {
    console.error("viewOrderDetail error:", e);
    return res.status(500).render("errors/500");
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
