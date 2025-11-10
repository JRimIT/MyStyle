// controllers/wishlist.controller.js
import mongoose from "mongoose";
import Wishlist from "../models/wishlist.model.js";
import Product from "../models/product.model.js";
import { countProduct } from "./countCart.js";

export async function viewWishlist(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.redirect("/login");

    let wl = await Wishlist.findOne({ userId }).populate(
      "items.productId",
      "name imageUrl price averageRating numReviews"
    );
    if (!wl) wl = await Wishlist.create({ userId, items: [] });

    const cartCount = await countProduct(userId);
    return res.render("pages/Wishlist", { wishlist: wl, cartCount, user: req.user });
  } catch (e) {
    console.error("viewWishlist error:", e);
    return res.status(500).render("errors/500");
  }
}

export async function addToWishlist(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { productId } = req.body;
    if (!mongoose.isValidObjectId(productId))
      return res.status(400).json({ message: "Invalid productId" });

    const prod = await Product.findById(productId).select("_id");
    if (!prod) return res.status(404).json({ message: "Product not found" });

    let wl = await Wishlist.findOne({ userId });
    if (!wl) wl = await Wishlist.create({ userId, items: [] });

    const exists = (wl.items || []).some((it) => String(it.productId) === String(productId));
    if (!exists) wl.items.push({ productId });
    await wl.save();

    if (req.headers.accept?.includes("application/json"))
      return res.json({ ok: true, count: wl.items.length });
    req.session.flash = { type: "success", message: "Đã thêm vào wishlist" };
    return res.redirect("/wishlist");
  } catch (e) {
    console.error("addToWishlist error:", e);
    return res.status(500).json({ message: "Add to wishlist failed" });
  }
}

export async function removeFromWishlist(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId))
      return res.status(400).json({ message: "Invalid productId" });

    const wl = await Wishlist.findOne({ userId });
    if (!wl) return res.status(404).json({ message: "Wishlist not found" });

    wl.items = (wl.items || []).filter((it) => String(it.productId) !== String(productId));
    await wl.save();

    if (req.headers.accept?.includes("application/json"))
      return res.json({ ok: true, count: wl.items.length });
    req.session.flash = { type: "success", message: "Đã xóa khỏi wishlist" };
    return res.redirect("/wishlist");
  } catch (e) {
    console.error("removeFromWishlist error:", e);
    return res.status(500).json({ message: "Remove wishlist item failed" });
  }
}
