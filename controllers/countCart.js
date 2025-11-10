import Cart from "../models/cart.model.js";

export const countProduct = async (userId) => {
  try {
    const cart = await Cart.findOne({ userId: userId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return 0;
    }

    // Count total quantity of all items
    const totalQuantity = cart.items.reduce((sum, item) => {
      return sum + (item.quantity || 0);
    }, 0);

    return totalQuantity;
  } catch (error) {
    console.error("Error counting cart items:", error);
    return 0;
  }
};
