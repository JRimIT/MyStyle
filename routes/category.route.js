import express from "express";
import Category from "../models/category.model.js";
import { verifyAdmin, verifyUser } from "../config/jwtConfig.js";

const router = express.Router();

// Get all categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .populate("parentCategory", "name slug");

    res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
});

// Get single category by ID or slug
router.get("/categories/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Check if identifier is ObjectId or slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    
    const query = isObjectId 
      ? { _id: identifier }
      : { slug: identifier };

    const category = await Category.findOne(query)
      .populate("parentCategory", "name slug");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
});

// Create new category (Admin only)
router.post("/categories", verifyAdmin, async (req, res) => {
  try {
    const { name, description, imageUrl, parentCategory, order, isActive } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const category = await Category.create({
      name,
      description,
      imageUrl,
      parentCategory: parentCategory || null,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
});

// Update category (Admin only)
router.put("/categories/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, parentCategory, order, isActive } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if new name already exists (excluding current category)
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }
    }

    // Update fields
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (imageUrl !== undefined) category.imageUrl = imageUrl;
    if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
});

// Delete category (Admin only)
router.delete("/categories/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if there are child categories
    const childCategories = await Category.find({ parentCategory: id });
    
    if (childCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with subcategories. Please delete or reassign subcategories first.",
      });
    }

    // Soft delete (set isActive to false) instead of hard delete
    category.isActive = false;
    await category.save();

    // Or use hard delete if you prefer
    // await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
});

// Get products by category
router.get("/categories/:identifier/products", async (req, res) => {
  try {
    const { identifier } = req.params;
    const Product = (await import("../models/product.model.js")).default;

    // Check if identifier is ObjectId or slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    
    const query = isObjectId 
      ? { _id: identifier }
      : { slug: identifier };

    const category = await Category.findOne(query);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Find products matching category name
    const products = await Product.find({
      category: { $regex: new RegExp(category.name, 'i') }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      category: category,
      products: products,
      count: products.length,
    });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});

export default router;

