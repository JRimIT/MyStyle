import express from "express";
import Order from "../models/order.model.js";

const router = express.Router();

router.get("/admin/stats", async (_req, res) => {
  try {
    const revenueAgg = await Order.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, revenue: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);
    const revenue = revenueAgg[0]?.revenue || 0;
    const paidCount = revenueAgg[0]?.count || 0;
    const byStatus = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", qty: { $sum: "$items.qty" } } },
      { $sort: { qty: -1 } },
      { $limit: 10 },
    ]);
    res.render("admins/stats", { revenue, paidCount, byStatus, topProducts });
  } catch (e) {
    console.error("stats error:", e);
    res.status(500).render("errors/500");
  }
});

export default router;

