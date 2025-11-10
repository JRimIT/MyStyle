// routes/vnpay.route.js
import express from "express";
import moment from "moment";
import crypto from "crypto";
import Order from "../models/order.model.js";

const router = express.Router();

// sort object theo key
function sortObject(obj) {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return sorted;
}

// build hash data đúng chuẩn VNPay
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

// build query cho URL redirect (encode full)
function buildQuery(params) {
  const sorted = sortObject(params);
  return Object.keys(sorted)
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(sorted[key])}`
    )
    .join("&");
}

router.post("/create", async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip;

    const tmnCode = process.env.VNP_TMNCODE;
    const secretKey = process.env.VNP_HASHSECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURNURL;

    const createDate = moment().format("YYYYMMDDHHmmss");
    const expireDate = moment().add(15, "minutes").format("YYYYMMDDHHmmss");
    const txnRef = moment().format("HHmmss");

    const vnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don hang ${order._id}`,
      vnp_OrderType: "other",
      vnp_Amount: Number(amount) * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const signData = buildVnpHashData(vnpParams);
    const hmac = crypto.createHmac("sha512", secretKey);
    const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    const vnpParamsWithHash = {
      ...vnpParams,
      vnp_SecureHash: secureHash,
      vnp_SecureHashType: "SHA512",
    };

    const redirectUrl = `${vnpUrl}?${buildQuery(vnpParamsWithHash)}`;

    console.log("[VNPay] signData:", signData);
    console.log("[VNPay] secureHash:", secureHash);
    console.log("[VNPay] redirect:", redirectUrl);

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("VNPay create error:", err);
    return res.status(500).json({ message: "VNPay create error" });
  }
});

export default router;
