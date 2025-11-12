// controllers/adminController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');

const listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 25, q = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};
    if (q) {
      const re = new RegExp(q, 'i');
      filter.$or = [{ name: re }, { email: re }, { username: re }];
    }
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter)
    ]);
    res.json({ data: users, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    // optionally include orders count / total spent
    const ordersAgg = await Order.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, totalSpent: { $sum: '$total' }, ordersCount: { $sum: 1 } } }
    ]);
    const stats = ordersAgg[0] || { totalSpent: 0, ordersCount: 0 };
    res.json({ data: { ...user, stats } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const banUnbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // flip banned flag (or use `active` depending your model)
    user.banned = !user.banned;
    await user.save();
    res.json({ message: user.banned ? 'User banned' : 'User unbanned', data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// statistics: total sales, orders count, customers count, sales by day (30d), top products
const statistics = async (req, res) => {
  try {
    // total sales & orders
    const baseMatch = { status: { $in: ['paid', 'completed', 'shipped', 'delivered'] } }; // adjust statuses
    const totalsAgg = await Order.aggregate([
      { $match: baseMatch },
      { $group: { _id: null, totalSales: { $sum: '$total' }, ordersCount: { $sum: 1 } } }
    ]);

    const customersAgg = await Order.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$userId' } },
      { $count: 'uniqueCustomers' }
    ]);

    // sales by day (last 30 days)
    const since = new Date();
    since.setDate(since.getDate() - 29); // 30 days inclusive
    const salesByDay = await Order.aggregate([
      { $match: { ...baseMatch, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // top products (by quantity and sales)
    // assume Order.items = [{ productId, qty, price }]
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.productId': { $exists: true } } },
      {
        $group: {
          _id: '$items.productId',
          qtySold: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }
        }
      },
      { $sort: { qtySold: -1 } },
      { $limit: 8 }
    ]);

    const totals = totalsAgg[0] || { totalSales: 0, ordersCount: 0 };
    const customersCount = (customersAgg[0] && customersAgg[0].uniqueCustomers) || 0;

    res.json({
      data: {
        totalSales: totals.totalSales,
        ordersCount: totals.ordersCount,
        customersCount,
        salesByDay,
        topProducts
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  listUsers,
  getUser,
  banUnbanUser,
  statistics
};
