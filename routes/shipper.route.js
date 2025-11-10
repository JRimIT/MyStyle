import express from "express";
import Order from "../models/order.model.js";
import { verifyUser } from "../config/jwtConfig.js";

const router = express.Router();

// Require shipper role
function requireShipper(req, res, next) {
  if (!req.user || req.user.role !== 'shipper') return res.status(403).render('errors/403');
  next();
}

router.get("/shipper/dashboard", verifyUser, requireShipper, async (req, res) => {
  try {
    const uid = req.user.userId;
    const assigned = await Order.find({ shipperId: uid }).sort({ createdAt: -1 }).lean();
    const available = await Order.find({ shipperId: null, status: { $in: ['paid','unpaid'] }, shippingStatus: 'unassigned' }).sort({ createdAt: -1 }).lean();
    return res.render("pages/ShipperDashboard", { assigned, available });
  } catch (e) {
    console.error("shipper dashboard error:", e);
    return res.status(500).render("errors/500");
  }
});

router.post("/shipper/accept/:orderId", verifyUser, requireShipper, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || order.shippingStatus !== 'unassigned') return res.status(400).json({ message: 'Unavailable' });
    order.shipperId = req.user.userId;
    order.shippingStatus = 'assigned';
    await order.save();
    return res.json({ ok: true });
  } catch (e) { return res.status(500).json({ message: 'Accept failed' }); }
});

router.post("/shipper/update/:orderId", verifyUser, requireShipper, async (req, res) => {
  try {
    const { status, note } = req.body;
    const allowed = ["picked_up","in_transit","delivered","problem"];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const order = await Order.findById(req.params.orderId);
    if (!order || String(order.shipperId) !== String(req.user.userId)) return res.status(403).json({ message: 'Forbidden' });
    order.shippingStatus = status;
    if (note) order.shippingNote = note;
    await order.save();
    return res.json({ ok: true });
  } catch (e) { return res.status(500).json({ message: 'Update failed' }); }
});

export default router;

