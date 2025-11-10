import express from "express";
import { verifyUserOrRedirect as verifyUser } from "../config/jwtConfig.js";
import {
  viewCheckoutPage,
  createOrderWeb,
  viewOrderSuccess,
  viewOrderDetail, // optional
  viewOrdersList,
  viewOrderTrack,
  cancelOrder,
  viewInvoice,
} from "../controllers/order.web.controller.js";

const router = express.Router();

router.get("/view/checkout", verifyUser, viewCheckoutPage);
router.post("/checkout", verifyUser, createOrderWeb);
router.get("/view/checkout-success", verifyUser, viewOrderSuccess);
// (tuỳ chọn)
router.get("/orders/:orderId", verifyUser, viewOrderDetail);
router.get("/orders", verifyUser, viewOrdersList);
router.get("/orders/track/:orderId", verifyUser, viewOrderTrack);
router.post("/orders/:orderId/cancel", verifyUser, cancelOrder);
router.get("/orders/:orderId/invoice", verifyUser, viewInvoice);

export default router;
