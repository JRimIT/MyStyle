import {
  addToCart,
  updateItemQty,
  removeItem,
  clearCart,
  getCartWithTotals,
} from "../controllers/cartService.js";

function getSessionUserId(req) {
  return req.session?.user?._id || req.session?.user?.userId || null;
}

// GET /api/cart
export async function getMyCart(req, res) {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Not logged in" });

    const data = await getCartWithTotals(userId);
    res.json(data); // { cart, subtotal }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// POST /api/cart/add   body: { productId, quantity }
export async function addItem(req, res) {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Not logged in" });

    const { productId, quantity = 1 } = req.body;
    const cart = await addToCart(userId, productId, Number(quantity));
    res.json(cart);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// PATCH /api/cart/item  body: { productId, quantity }
export async function setItemQty(req, res) {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Not logged in" });

    const { productId, quantity } = req.body;
    const cart = await updateItemQty(userId, productId, Number(quantity));
    res.json(cart);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// DELETE /api/cart/item  body: { productId }
export async function deleteItem(req, res) {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Not logged in" });

    const { productId } = req.body;
    const cart = await removeItem(userId, productId);
    res.json(cart);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// (tuỳ chọn) DELETE /api/cart  -> xóa giỏ chính chủ theo session
export async function deleteCart(req, res) {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Not logged in" });

    const result = await clearCart(userId);
    res.json(result); // { success: true }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}