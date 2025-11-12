// controllers/review.controller.js
import mongoose from "mongoose";
import Review from "../models/review.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";

// Các trạng thái được coi là đã mua/thành công (điều chỉnh cho khớp hệ thống của bạn)
const PURCHASED_STATUSES = ["paid", "unpaid"];

async function userHasPurchasedProduct(userId, productId) {
  // Dựa đúng schema Order bạn gửi: userId, items[].productId, status
  const exist = await Order.exists({
    userId: new mongoose.Types.ObjectId(userId),
    "items.productId": String(productId),
    status: { $in: PURCHASED_STATUSES },
  });
  return !!exist;
}

// Tính lại điểm TB & số review cho Product
async function recalcProductRating(productId) {
  const pid = new mongoose.Types.ObjectId(productId);
  const agg = await Review.aggregate([
    { $match: { productId: pid } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const { avg = 0, count = 0 } = agg[0] || {};
  await Product.findByIdAndUpdate(pid, {
    averageRating: Number(avg.toFixed(2)),
    numReviews: count,
  });
}

// GET /api/products/:productId/reviews  (public)
export async function listProductReviews(req, res) {
  try {
    const { productId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));

    const [items, total] = await Promise.all([
      Review.find({ productId })
        .populate("userId", "username email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments({ productId }),
    ]);

    res.json({ items, page, total, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ message: "Lỗi tải danh sách đánh giá" });
  }
}

// GET /api/products/:productId/reviews/eligibility (cần đăng nhập)
export async function checkEligibility(req, res) {
  try {
    const { productId } = req.params;
    const purchased = await userHasPurchasedProduct(req.user.userId, productId);
    const reviewed  = await Review.exists({ productId, userId: req.user.userId });
    res.json({ eligible: purchased && !reviewed, purchased, reviewed: !!reviewed });
  } catch {
    res.status(500).json({ message: "Lỗi kiểm tra quyền đánh giá" });
  }
}

// POST /api/products/:productId/reviews (cần đăng nhập & đã mua)
export async function createReview(req, res) {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.isValidObjectId(productId))
      return res.status(400).json({ message: "productId không hợp lệ" });
    if (!(rating >= 1 && rating <= 5))
      return res.status(400).json({ message: "Rating phải 1..5" });

    const product = await Product.findById(productId).select("_id");
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const purchased = await userHasPurchasedProduct(req.user.userId, productId);
    if (!purchased)
      return res.status(403).json({ message: "Bạn cần mua sản phẩm này trước khi đánh giá" });

    const review = await Review.create({
      productId,
      userId: req.user.userId,
      rating,
      comment,
    });

    // (tuỳ chọn) nếu bạn muốn lưu id review vào mảng product.reviews
    // await Product.findByIdAndUpdate(productId, { $push: { reviews: review._id } });

    await recalcProductRating(productId);
    res.status(201).json(review);
  } catch (e) {
    if (e?.code === 11000)
      return res.status(409).json({ message: "Bạn đã đánh giá sản phẩm này rồi" });
    res.status(500).json({ message: "Lỗi khi tạo đánh giá" });
  }
}

// PATCH /api/reviews/:reviewId (chủ review)
export async function updateReview(req, res) {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const rv = await Review.findById(reviewId);
    if (!rv) return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    if (String(rv.userId) !== String(req.user.userId))
      return res.status(403).json({ message: "Không có quyền sửa đánh giá này" });

    if (rating) rv.rating = Math.min(5, Math.max(1, rating));
    if (typeof comment === "string") rv.comment = comment;

    await rv.save();
    await recalcProductRating(rv.productId);
    res.json(rv);
  } catch {
    res.status(500).json({ message: "Lỗi cập nhật đánh giá" });
  }
}

// DELETE /api/reviews/:reviewId (chủ review)
export async function deleteReview(req, res) {
  try {
    const { reviewId } = req.params;
    const rv = await Review.findById(reviewId);
    if (!rv) return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    if (String(rv.userId) !== String(req.user.userId))
      return res.status(403).json({ message: "Không có quyền xóa đánh giá này" });

    await Review.deleteOne({ _id: reviewId });

    // (tuỳ chọn) nếu bạn đã push _id vào product.reviews thì pull ra
    // await Product.findByIdAndUpdate(rv.productId, { $pull: { reviews: rv._id } });

    await recalcProductRating(rv.productId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Lỗi xóa đánh giá" });
  }
}
