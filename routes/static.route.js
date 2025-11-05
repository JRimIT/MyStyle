import express from "express";
import { countProduct } from "../controllers/countCart.js";
import { verifyUser } from "../config/jwtConfig.js";

const router = express.Router();

// About page
router.get("/about", async (req, res) => {
  try {
    let user = req.user;
    if (req.user && req.user.userId) {
      const User = (await import('../models/user.model.js')).default;
      user = await User.findById(req.user.userId);
    }
    const cartCount = req.user?.userId
      ? await countProduct(req.user.userId)
      : 0;
    res.render("pages/About", {
      user,
      cartCount: cartCount,
    });
  } catch (error) {
    console.error("Error rendering About page:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Contact page
router.get("/contact", async (req, res) => {
  try {
    let user = req.user;
    if (req.user && req.user.userId) {
      const User = (await import('../models/user.model.js')).default;
      user = await User.findById(req.user.userId);
    }
    const cartCount = req.user?.userId
      ? await countProduct(req.user.userId)
      : 0;
    res.render("pages/Contact", {
      user,
      cartCount: cartCount,
    });
  } catch (error) {
    console.error("Error rendering Contact page:", error);
    res.status(500).send("Internal Server Error");
  }
});
// Help page
router.get("/help", async (req, res) => {
  try {
    let user = req.user;
    if (req.user && req.user.userId) {
      const User = (await import('../models/user.model.js')).default;
      user = await User.findById(req.user.userId);
    }
    const cartCount = req.user?.userId
      ? await countProduct(req.user.userId)
      : 0;
    res.render("pages/Help", {
      user,
      cartCount: cartCount,
    });
  } catch (error) {
    console.error("Error rendering Help page:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Profile page (requires authentication)
router.get("/profile", verifyUser, async (req, res) => {
  try {
    let user = req.user;
    if (req.user && req.user.userId) {
      const User = (await import('../models/user.model.js')).default;
      user = await User.findById(req.user.userId);
    }
    const cartCount = req.user?.userId
      ? await countProduct(req.user.userId)
      : 0;
    res.render("pages/Profile", {
      user,
      cartCount: cartCount,
    });
  } catch (error) {
    console.error("Error rendering Profile page:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Update profile (requires authentication)
router.post("/profile/update", verifyUser, async (req, res) => {
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
    res.redirect("/profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
