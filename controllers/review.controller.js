import Review from '../models/review.model.js';

export const createReview = async (req, res, next) => {
  try {
    const { userId, productId, rating, content } = req.body;
    await Review.create({ userId, productId, rating, content, status: 'PUBLISHED' });
    res.status(201).json({ message: 'Đã gửi đánh giá' });
  } catch (e) { next(e); }
};
