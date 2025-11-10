import mongoose from "mongoose";
import Product from "../models/product.model.js";

function toArray(val) {
  if (Array.isArray(val)) {
    return val.map((s) => String(s).trim()).filter(Boolean);
  }
  if (val === undefined || val === null) return [];
  // ép mọi thứ về string, tách theo dấu phẩy
  return String(val)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickAny(input, keys) {
  for (const k of keys) {
    if (input[k] !== undefined && input[k] !== null && input[k] !== "") {
      return input[k];
    }
  }
  return undefined;
}

function normalizePayload(input = {}) {
  const out = { ...input };

  // Price -> number
  if (out.price !== undefined && out.price !== null && out.price !== "") {
    const n = Number(out.price);
    if (!Number.isFinite(n)) throw new Error("price must be a number");
    out.price = n;
  } else {
    delete out.price;
  }

  // HỖ TRỢ MỌI BIẾN THỂ TÊN: sizes / sizesCSV / sizesCsv
  const sizesRaw = pickAny(input, ["sizes", "sizesCSV", "sizesCsv"]);
  if (sizesRaw !== undefined) {
    out.sizes = toArray(sizesRaw);
  }

  // images / imagesCSV / imagesCsv
  const imagesRaw = pickAny(input, ["images", "imagesCSV", "imagesCsv"]);
  if (imagesRaw !== undefined) {
    out.images = toArray(imagesRaw);
  }

  // badges / badgesCSV / badgesCsv
  const badgesRaw = pickAny(input, ["badges", "badgesCSV", "badgesCsv"]);
  if (badgesRaw !== undefined) {
    out.badges = toArray(badgesRaw);
  }

  // Dọn rác: không để field rỗng ""
  ["name", "description", "imageUrl", "category"].forEach((k) => {
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
