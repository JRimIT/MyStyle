import express from "express";
import {
  getAllProducts,
  getProductById,
  createProductCtrl,
  updateProductCtrl,
  deleteProductCtrl,
} from '../controllers/productController.js';

const router = express.Router();

// Nếu có auth/role, bạn có thể thêm middleware verifyAdmin vào POST/PUT/DELETE
router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", createProductCtrl);
router.put("/:id", updateProductCtrl);
router.delete("/:id", deleteProductCtrl);

export default router;