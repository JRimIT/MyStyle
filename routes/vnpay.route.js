// routes/vnpay.route.js
import express from 'express';
import moment from 'moment';
import crypto from 'crypto';
import { vnpayIpn } from '../controllers/order.web.controller.js';

const router = express.Router();

// Hàm sắp xếp object theo alphabet
function sortObject(obj) {
    const sorted = {};
    Object.keys(obj)
        .sort()
        .forEach((k) => (sorted[k] = obj[k]));
    return sorted;
}

// Hàm tạo secure hash VNPay
function buildVNPaySecureHash(params, secretKey) {
    const sorted = sortObject(params);
    // Build query string raw, chưa encode
    const signData = Object.keys(sorted)
        .map((k) => `${k}=${sorted[k]}`)
        .join('&');
    const secureHash = crypto.createHmac('sha512', secretKey).update(signData, 'utf-8').digest('hex');
    return { secureHash, sorted };
}

// Route tạo URL thanh toán VNPay
router.post('/create', async (req, res) => {
    try {
        const { orderId, amount, orderInfo, bankCode } = req.body;
        if (!amount) return res.status(400).json({ message: 'Missing amount' });

        const ipAddr =
            req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip;

        const tmnCode = process.env.VNP_TMNCODE;
        const secretKey = process.env.VNP_HASHSECRET;
        const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const returnUrl = process.env.VNP_RETURNURL || `http://localhost:4000/vnpay/return`;

        const txnRef = `${orderId || 'ORD'}_${Date.now()}`;
        const createDate = moment().format('YYYYMMDDHHmmss');
        const expireDate = moment().add(15, 'minutes').format('YYYYMMDDHHmmss');

        const vnpParams = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Amount: Number(amount) * 100, // VNPAY yêu cầu x100
            vnp_CurrCode: 'VND',
            vnp_TxnRef: txnRef,
            vnp_OrderInfo: orderInfo || `Thanh toan don hang ${txnRef}`,
            vnp_OrderType: 'other',
            vnp_Locale: 'vn',
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate,
            vnp_ExpireDate: expireDate,
        };

        if (bankCode) vnpParams.vnp_BankCode = bankCode;

        // Tạo chữ ký
        const { secureHash, sorted } = buildVNPaySecureHash(vnpParams, secretKey);

        // Build query string redirect, encode từng value except secure hash
        const query = Object.keys(sorted)
            .map((key) => `${key}=${encodeURIComponent(sorted[key])}`)
            .join('&');

        const payUrl = `${vnpUrl}?${query}&vnp_SecureHash=${secureHash}&vnp_SecureHashType=SHA512`;

        console.log('[VNPay] Using ReturnUrl:', returnUrl);
        console.log('[VNPay] Params: ', { ...sorted, vnp_SecureHash: secureHash, vnp_SecureHashType: 'SHA512' });
        console.log('[VNPay] Redirect VNPay URL:', payUrl);

        return res.json({ payUrl, txnRef });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Create VNPay URL failed' });
    }
});

// IPN endpoint
router.get('/ipn', vnpayIpn);

export default router;
