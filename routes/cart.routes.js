import { Router } from "express";
import {
  getMyCart,
  addItem,
  setItemQty,
  deleteItem,
  deleteCart,
} from "../controllers/cartController.js";
// import { requireAuth } from "../middlewares/requireAuth.js";

const router =  Router();

// router.use(requireAuth); // tất cả route cart yêu cầu đăng nhập

// router.get('/ping', (req, res) => res.json({ ok: true, where: 'cart.routes.js' }));

router.get("/", getMyCart);                 // Manage cart (xem giỏ + subtotal)
router.post("/add", addItem);               // Add to cart
router.patch("/item", setItemQty);          // Cập nhật số lượng item
router.delete("/item", deleteItem);         // Xoá 1 item khỏi giỏ
router.delete("/", deleteCart);       // Delete cart (xoá toàn bộ)

export default router;
