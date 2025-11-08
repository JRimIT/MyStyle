// controllers/productController.js
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productService.js';

// --- helper chuẩn hoá ---
function csvToArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean).map(s => String(s).trim());
  if (val == null || val === '') return [];
  return String(val)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizePayload(body) {
  const payload = {};

  if ('name' in body) payload.name = body.name?.trim();
  if ('description' in body) payload.description = body.description ?? '';
  if ('price' in body) payload.price = Number(body.price);

  if ('category' in body) payload.category = body.category?.trim() || '';

  // Ảnh đơn
  if ('imageUrl' in body) payload.imageUrl = body.imageUrl?.trim() || '';

  // Mảng: chấp nhận cả ...Csv từ form hoặc mảng gởi trực tiếp
  payload.images = csvToArray(body.images ?? body.imagesCsv);
  payload.sizes  = csvToArray(body.sizes  ?? body.sizesCsv);
  payload.badges = csvToArray(body.badges ?? body.badgesCsv);

  return payload;
}

// -------- API --------
export async function getAllProducts(req, res){
  try{
    const {search, page, limit, category, active} = req.query;
    const result = await listProducts({search, page, limit, category, active});
    res.set('x-total-count', result.total.toString());
    return res.json(result);
  }catch(err){
    console.error("getAllProducts error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

export async function getProductById(req, res){
  try{
    const product = await getProduct(req.params.id);
    return res.json(product);
  }catch(err){
    return res.status(400).json({ message: err.message});
  }
}

export async function createProductCtrl(req, res){
  try{
    const payload = normalizePayload(req.body);
    const product = await createProduct(payload);

    const redirectTo = req.query.redirect;
    if (redirectTo && req.accepts('html')) return res.redirect(redirectTo);
    return res.status(201).json(product);
  }catch(err){
    return res.status(400).json({ message: err.message});
  }
}

export async function updateProductCtrl(req, res){
  try{
    const productId = req.params.id;
    const payload = normalizePayload(req.body);
    const product = await updateProduct(productId, payload);

    const redirectTo = req.query.redirect;
    if (redirectTo && req.accepts('html')) return res.redirect(redirectTo);
    return res.status(200).json(product);
  }catch(err){
    const code = err.message === "Product not found" ? 404 : 400;
    return res.status(code).json({ message: err.message });
  }
}

export async function deleteProductCtrl(req, res){
  try{
    const productId = req.params.id;
    await deleteProduct(productId);

    const redirectTo = req.query.redirect;
    if (redirectTo && req.accepts('html')) return res.redirect(redirectTo);
    return res.json({ ok:true, message: "Product deleted successfully" });
  }catch(err){
    const code = err.message === "Product not found" ? 404 : 400;
    return res.status(code).json({ message: err.message });
  }
}
