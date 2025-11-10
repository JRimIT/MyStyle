// routes/vnpay.route.js
import express from "express";
import moment from "moment";
import qs from "qs";
import crypto from "crypto";
import { vnpayIpn } from "../controllers/order.web.controller.js";

const router = express.Router();

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(k => (sorted[k] = obj[k]));
  return sorted;
}

router.post("/create", async (req, res) => {
  try {
    const { orderId, amount, orderInfo, bankCode } = req.body;
    if (!amount) return res.status(400).json({ message: "Missing amount" });

    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip;

    const tmnCode   = process.env.VNP_TMNCODE;
    const secretKey = process.env.VNP_HASHSECRET;
    const vnpUrl    = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const returnUrl = process.env.VNP_RETURNURL || "https://localhost:4000/vnpay/return";

    const txnRef    = `${orderId || "ORD"}_${Date.now()}`;
    const createDate = moment().format("YYYYMMDDHHmmss");
    const expireDate = moment().add(15, "minutes").format("YYYYMMDDHHmmss");

    const vnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Amount: Number(amount) * 100,        // VND x 100
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${txnRef}`,
      vnp_OrderType: "other",
      vnp_Locale: "vn",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    // nếu truyền bankCode (VNPAYQR / VNBANK / VISA / ...), thêm vào để mở đúng tab
    if (bankCode) vnpParams.vnp_BankCode = bankCode;

    const sorted = sortObject(vnpParams);
    const signData = qs.stringify(sorted, { encode: false });
    const secureHash = crypto.createHmac("sha512", secretKey).update(signData).digest("hex");
    const payUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;

    return res.json({ payUrl, txnRef });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Create VNPay URL failed" });
  }
});

export default router;
// IPN endpoint for VNPay server-to-server confirmation
router.get("/ipn", vnpayIpn);
