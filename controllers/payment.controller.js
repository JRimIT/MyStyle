import Order from '../models/order.model.js';
import { VNP_TMNCODE, VNP_HASHSECRET, VNP_PAYURL, VNP_RETURNURL, VNP_VERSION, VNP_COMMAND } from '../config/vnpayConfig.js';
import { hmacSHA512, buildQuery } from '../utils/vnpay.util.js';

export const createVnpayPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const txnRef = Date.now().toString();
    order.txnRef = txnRef;
    await order.save();

    const vnp_Params = {
      vnp_Version: VNP_VERSION,
      vnp_Command: VNP_COMMAND,
      vnp_TmnCode: VNP_TMNCODE,
      vnp_Amount: String(order.amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Pay order ${order._id}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_IpAddr: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      vnp_ReturnUrl: `${VNP_RETURNURL}?orderId=${order._id}`,
      vnp_CreateDate: new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14)
    };

    const query = buildQuery(vnp_Params);
    const secureHash = hmacSHA512(VNP_HASHSECRET, query);
    const payUrl = `${VNP_PAYURL}?${query}&vnp_SecureHash=${secureHash}`;

    res.json({ payUrl });
  } catch (e) { next(e); }
};

export const vnpayReturn = async (req, res, next) => {
  try {
    const { vnp_SecureHash, vnp_ResponseCode, orderId, ...others } = req.query;
    const signData = buildQuery(others);
    const calcHash = hmacSHA512(VNP_HASHSECRET, signData);

    let message = 'Thanh toán thất bại hoặc không hợp lệ';
    if (calcHash.toLowerCase() === String(vnp_SecureHash).toLowerCase() && vnp_ResponseCode === '00') {
      await Order.findByIdAndUpdate(orderId, { status: 'PAID' });
      message = `Thanh toán thành công cho đơn #${orderId}`;
    }
    res.render('checkout', { resultMsg: message });
  } catch (e) { next(e); }
};
