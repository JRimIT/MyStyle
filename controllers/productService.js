import mongoose from "mongoose";
import Product from "../models/product.model.js";

// Chỉ lấy danh sách sp, sắp xếp mới nhất
export async function listProducts() {
  const products = await Product.find().sort({ createdAt: -1 }).lean();
  const total = await Product.estimatedDocumentCount();
  return { total, products };
}

export async function getProduct(productId) {
    if(!mongoose.isValidObjectId(productId)) throw new Error('invalid product id');
    const product = await Product.findById(productId).populate('reviews').lean();
    if(!product) throw new Error('not found!');
    return product;
}
export async function createProduct(product) {
    if(!product?.name || product.price == null) 
        throw new Error('name & price are required');
    const createdProduct = await Product.create(product);
    return createdProduct;
}

export async function updateProduct(productId, product) {
    if(!mongoose.isValidObjectId(productId)) throw new Error('invalid product id');
    const updateProduct = await Product.findByIdAndUpdate(productId, product, {
        new: true,
        runValidators: true,
    }).lean();
    if(!updateProduct) throw new Error('product not found!');
    return updateProduct;
}

export async function deleteProduct(productId) {
    if(!mongoose.isValidObjectId(productId)) throw new Error('invalid product id');
    const deleteProduct = await Product.findByIdAndDelete(productId).lean();
    if(!deleteProduct) throw new Error('product not found!');
    return deleteProduct;
}
