// utils/mailOrder.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

/**
 * Gửi mail xác nhận đơn hàng cho khách
 * @param {string} to - email người nhận
 * @param {object} order - order object
 */
export const sendOrderConfirmation = async (to, order) => {
    if (!to || !order) throw new Error('Recipient email and order info required');
    console.log('📧 Preparing to send mail to:', to);
    const itemsHtml = order.items
        .map((i) => `<li>${i.qty} x ${i.productId.name} - ${Number(i.price).toLocaleString('vi-VN')} VND</li>`)
        .join('');

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #e17156;">🛒 MyStyle - Order Confirmation</h2>
            <p>Thank you for your order, ${order.shippingAddress.fullName}!</p>
        </div>

        <div style="background-color: #fff8f4; padding: 20px; border-radius: 8px;">
            <h3>Order Details:</h3>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Total:</strong> ${Number(order.total).toLocaleString('vi-VN')} VND</p>
            <p><strong>Shipping Address:</strong></p>
            <p>${order.shippingAddress.fullName} - ${order.shippingAddress.phone}<br/>
            ${order.shippingAddress.address}<br/>
            ${order.shippingAddress.note || ''}</p>

            <h4>Items:</h4>
            <ul>${itemsHtml}</ul>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">
            © ${new Date().getFullYear()} MyStyle. Elevate Your Style Everyday.
        </div>
    </div>
    `;

    return transporter.sendMail({
        from: `"MyStyle" <${process.env.GMAIL_USER}>`,
        to,
        subject: `✅ Your Order ${order._id} Confirmation`,
        html: htmlContent,
    });
};
