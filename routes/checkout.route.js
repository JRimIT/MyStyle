import { Router } from 'express';
import { proceedCheckout } from '../controllers/checkout.controller.js';

const router = Router();

// POST /checkout
// body: { userId, items: [{productId, qty, price}], amount, method: 'COD' | 'VNPAY' }
router.post('/', proceedCheckout);

export default router;   // 👈 BẮT BUỘC có dòng này (default export)
