import express from 'express';
import { verifyUserOrRedirect as verifyUser } from '../config/jwtConfig.js';
import {
    viewCheckoutPage,
    createOrderWeb,
    viewOrderSuccess,
    viewOrderDetail, // optional
    viewOrdersList,
} from '../controllers/order.web.controller.js';

const router = express.Router();

router.get('/view/checkout', verifyUser, viewCheckoutPage);
router.post('/checkout', verifyUser, createOrderWeb);
router.get('/view/checkout-success', verifyUser, viewOrderSuccess);
// (tuỳ chọn)
router.get('/orders/:orderId', verifyUser, viewOrderDetail);
router.get('/orders', verifyUser, viewOrdersList);

export default router;
