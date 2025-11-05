import Order from '../models/order.model.js';

export const trackOrder = async (req, res, next) => {
  try {
    const { code } = req.query;
    const order = await Order.findOne({ code }).lean();
    res.render('track', {
      code,
      status: order ? order.status : 'NOT_FOUND'
    });
  } catch (e) { next(e); }
};
