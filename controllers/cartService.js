import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";

export async function getCart(userId) {
    const cart = await Cart.findOne({userId})
    .populate({
        path: 'items.product',
        select: 'name price imageUrl category',
    })
    .lean();
    return cart || {userId, items: [], createdAt: new Date()};
}

//Thêm sản phẩm vào giỏ 
export async function addToCart(userId, productId, quantity =1){
    if(!mongoose.isValidObjectId(productId)){
        throw new Error('productId khong hop le');
    }
    if(quantity < 0){
        throw new Error('quantity phai > 0');
    }

    const product = await Product.findById(productId).lean();
    if(!product) throw new Error('san pham khong ton tai!');

    let cart = await Cart.findOne({userId});
    if(!cart){
        cart = await Cart.create({
            userId,
            items:[{product: productId, quantity}],
        });
        return cart;
    }

    const idx = cart.items.findIndex(
        (i) => i.product.toString() === productId.toString()
    );
    if(idx >= 0){
        cart.items[idx].quantity += quantity;    
    } else{
        cart.items.push({ product: productId, quantity});
    }
    await cart.save();
    return cart;
}

// Cập nhật số lượng 1 sản phẩm trong giỏ
export async function updateItemQty(userId, productId, quantity) {
    if(quantity <=0){
        return removeItem(userId, productId);
    }

    const cart = await Cart.findOneAndUpdate(
        {userId, 'items.product': productId},
        {$set: { 'items.$.quantity': quantity}},
        {new: true}
    );

    if(!cart){
        return addToCart(userId, productId, quantity);
    }
    return cart;
}

//Xoá 1 sản phẩm khỏi giỏ
export async function  removeItem(userId, productId) {
    const cart = await Cart.findOneAndUpdate(
        { userId },
        {$pull:{items:{product: productId}}},
        {new: true}
    );
    return cart || {userId, items:[]};
}

// Xoá toàn bộ giỏ (delete cart)
export async function clearCart(userId){
    await Cart.deleteOne({userId});
    return { success: true};
}

// Tính tổng tiền tạm tính (dựa theo giá hiện tại của Product)
export async function getCartWithTotals(userId) {
    const cart = await getCart(userId);
    if(!cart.items.length) return {cart, subtotal: 0};

    const subtotal = cart.items.reduce((sum, it) => {
        const price = (it.product?.price ?? 0);
        return sum + price * it.quantity;
    }, 0);
    return {cart, subtotal};
}



