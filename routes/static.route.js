import express from 'express';
import { countProduct } from '../controllers/countCart.js';
import { verifyAdmin, verifyUser } from '../config/jwtConfig.js';

const router = express.Router();

// About page
router.get('/about', async (req, res) => {
    try {
        let user = req.user;
        if (req.user && req.user.userId) {
            const User = (await import('../models/user.model.js')).default;
            user = await User.findById(req.user.userId);
        }
        const cartCount = req.user?.userId ? await countProduct(req.user.userId) : 0;
        res.render('pages/About', {
            user,
            cartCount: cartCount,
        });
    } catch (error) {
        console.error('Error rendering About page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Contact page
router.get('/contact', async (req, res) => {
    try {
        let user = req.user;
        if (req.user && req.user.userId) {
            const User = (await import('../models/user.model.js')).default;
            user = await User.findById(req.user.userId);
        }
        const cartCount = req.user?.userId ? await countProduct(req.user.userId) : 0;
        res.render('pages/Contact', {
            user,
            cartCount: cartCount,
        });
    } catch (error) {
        console.error('Error rendering Contact page:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Help page
router.get('/help', async (req, res) => {
    try {
        let user = req.user;
        if (req.user && req.user.userId) {
            const User = (await import('../models/user.model.js')).default;
            user = await User.findById(req.user.userId);
        }
        const cartCount = req.user?.userId ? await countProduct(req.user.userId) : 0;
        res.render('pages/Help', {
            user,
            cartCount: cartCount,
        });
    } catch (error) {
        console.error('Error rendering Help page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Profile page (requires authentication)
router.get('/profile', verifyUser, async (req, res) => {
    try {
        let user = req.user;
        if (req.user && req.user.userId) {
            const User = (await import('../models/user.model.js')).default;
            user = await User.findById(req.user.userId);
        }
        const cartCount = req.user?.userId ? await countProduct(req.user.userId) : 0;
        res.render('pages/Profile', {
            user,
            cartCount: cartCount,
        });
    } catch (error) {
        console.error('Error rendering Profile page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Update profile (requires authentication)
router.post('/profile/update', verifyUser, verifyAdmin, async (req, res) => {
    try {
        const { fullName, email, phone, address, postCode, dateOfBirth, avatarUrl } = req.body;
        const userId = req.user.userId;

        const User = (await import('../models/user.model.js')).default;

        // Update user data
        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;
        if (postCode) updateData.postCode = postCode;
        if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
        if (avatarUrl) updateData.avatarUrl = avatarUrl;

        await User.findByIdAndUpdate(userId, updateData);

        // Redirect back to profile page
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Wallet page (requires authentication)
router.get('/wallet', verifyUser, async (req, res) => {
    try {
        let user = req.user;
        if (req.user && req.user.userId) {
            const User = (await import('../models/user.model.js')).default;
            user = await User.findById(req.user.userId);
        }
        const cartCount = req.user?.userId ? await countProduct(req.user.userId) : 0;
        res.render('pages/Wallet', {
            user,
            cartCount: cartCount,
        });
    } catch (error) {
        console.error('Error rendering Wallet page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Recharge wallet (requires authentication)
router.post('/wallet/recharge', verifyUser, async (req, res) => {
    try {
        const { amount, method } = req.body;
        const userId = req.user.userId;

        // Validate amount
        if (!amount || amount < 10000) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền nạp tối thiểu là 10,000 VND',
            });
        }

        // Validate payment method
        const validMethods = ['momo', 'banking', 'card'];
        if (!method || !validMethods.includes(method)) {
            return res.status(400).json({
                success: false,
                message: 'Phương thức thanh toán không hợp lệ',
            });
        }

        const User = (await import('../models/user.model.js')).default;

        // Calculate bonus
        let bonus = 0;
        if (amount >= 2000000) {
            bonus = 300000;
        } else if (amount >= 1000000) {
            bonus = 120000;
        } else if (amount >= 500000) {
            bonus = 50000;
        } else if (amount >= 200000) {
            bonus = 15000;
        } else if (amount >= 100000) {
            bonus = 5000;
        }

        const totalAmount = amount + bonus;

        // Update user balance
        await User.findByIdAndUpdate(userId, {
            $inc: { balance: totalAmount },
        });

        res.json({
            success: true,
            message: 'Nạp tiền thành công',
            amount: amount,
            bonus: bonus,
            total: totalAmount,
        });
    } catch (error) {
        console.error('Error recharging wallet:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra. Vui lòng thử lại.',
        });
    }
});

export default router;
