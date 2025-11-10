import mongoose from "mongoose";
import Product from "../models/product.model.js";


// ---- Helpers ----
function toArray(val) {
  if (Array.isArray(val)) {
    return val.map(s => String(s).trim()).filter(Boolean);
  }
  if (typeof val === "string") {
    return val
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizePayload(input = {}) {
  const out = { ...input };

  // Price -> number (giữ undefined nếu không gửi)
  if (out.price !== undefined && out.price !== null) {
    const n = Number(out.price);
    if (!Number.isFinite(n)) throw new Error("price must be a number");
    out.price = n;
  } else {
    delete out.price;
  }

  // Hỗ trợ cả sizes (array) và sizesCSV (string)
  if (input.sizes !== undefined || input.sizesCSV !== undefined) {
    out.sizes = toArray(input.sizes ?? input.sizesCSV);
  }

  // Hỗ trợ cả badges (array) và badgesCSV (string)
  if (input.badges !== undefined || input.badgesCSV !== undefined) {
    out.badges = toArray(input.badges ?? input.badgesCSV);
  }

  // Dọn rác: không để field rỗng ""
  ["name", "description", "imageUrl", "category"].forEach(k => {
    if (out[k] !== undefined) {
      const v = typeof out[k] === "string" ? out[k].trim() : out[k];
      if (v === "") delete out[k];
      else out[k] = v;
    }
  });

  return out;
}

// ---- Services ----
export async function listProducts({ search, page, limit, category, active } = {}) {
  const query = {};

  if (search) {
    query.$or = [
      { name:     { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }
  if (category) query.category = category;
  if (typeof active !== "undefined") query.isActive = active === "true" || active === true;

  page  = Math.max(parseInt(page) || 1, 1);
  limit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(query),
  ]);

  return { total, products, page, limit };
}

export async function getProduct(productId) {
  if (!mongoose.isValidObjectId(productId)) throw new Error("invalid product id");
  const product = await Product.findById(productId).populate("reviews").lean();
  if (!product) throw new Error("Product not found");
  return product;
}

export async function createProduct(data) {
  const payload = normalizePayload(data);

  if (!payload.name) throw new Error("name is required");
  if (payload.price == null) throw new Error("price is required");

  // đảm bảo mảng rỗng nếu chưa có
  if (!payload.sizes)  payload.sizes  = [];
  if (!payload.badges) payload.badges = [];

  const created = await Product.create(payload);
  return created;
}

export async function updateProduct(productId, data) {
  if (!mongoose.isValidObjectId(productId)) throw new Error("invalid product id");

  const payload = normalizePayload(data);

  // xoá key undefined để tránh set null ngoài ý muốn
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  const updated = await Product.findByIdAndUpdate(
    productId,
    { $set: payload },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) throw new Error("Product not found");
  return updated;
}

export async function deleteProduct(productId) {
  if (!mongoose.isValidObjectId(productId)) throw new Error("invalid product id");
  const deleted = await Product.findByIdAndDelete(productId).lean();
  if (!deleted) throw new Error("Product not found");
  return deleted;

}
