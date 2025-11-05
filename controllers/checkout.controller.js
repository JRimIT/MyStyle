import Order from '../models/order.model.js';

export const proceedCheckout = async (req, res, next) => {
  try {
    const { userId, items = [], amount, method } = req.body;
    if (!['COD','VNPAY'].includes(method)) {
      return res.status(400).json({ message: 'Unsupported method' });
    }
    const order = await Order.create({
      userId, items, amount, method, status: 'PENDING_PAYMENT'
    });

    if (method === 'COD') {
      return res.json({ message: 'Đặt đơn COD thành công', orderId: order._id, code: order.code });
    }
    // VNPAY: gọi tiếp /payment/vnpay để lấy payUrl
    res.json({ message: 'Đã tạo đơn, tiếp tục thanh toán VNPay', orderId: order._id, code: order.code });
  } catch (e) { next(e); }
};
