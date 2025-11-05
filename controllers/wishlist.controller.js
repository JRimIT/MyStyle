import Wishlist from '../models/wishlist.model.js';

export const addToWishlist = async (req, res, next) => {
  try {
    const { userId, productId } = req.body; // hoặc req.user._id nếu bạn đã verifyUser
    await Wishlist.updateOne({ userId, productId }, { $set: { userId, productId } }, { upsert: true });
    res.json({ message: 'Đã thêm vào wishlist' });
  } catch (e) { next(e); }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    const { userId, productId } = req.body;
    await Wishlist.deleteOne({ userId, productId });
    res.json({ message: 'Đã xóa khỏi wishlist' });
  } catch (e) { next(e); }
};

export const getWishlist = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const items = await Wishlist.find({ userId }).lean();
    res.json(items);
  } catch (e) { next(e); }
};
