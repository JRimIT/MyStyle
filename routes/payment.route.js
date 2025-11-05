import { Router } from 'express';
import { createVnpayPayment, vnpayReturn } from '../controllers/payment.controller.js';

const router = Router();

// Tạo URL thanh toán VNPay (nhận { orderId } trong body)
router.post('/vnpay', createVnpayPayment);

// VNPay redirect về (hiển thị kết quả)
router.get('/vnpay/return', vnpayReturn);

export default router; // 👈 BẮT BUỘC có default export
