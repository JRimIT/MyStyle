import express from 'express';
import { verifyUser } from '../config/jwtConfig.js';
import { countProduct } from '../controllers/countCart.js';
import User from '../models/user.model.js';
import sendMail from '../utils/mailer.js';

const router = express.Router();

router.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;

    try {
        const htmlContent = `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 600px; margin: auto;">
    <div style="text-align: center; margin-bottom: 20px;">
    <img src="https://i.pinimg.com/736x/cc/dc/4c/ccdc4cf54118acc780132ee06b668fa8.jpg"
    alt="MyStyle Logo"
    style="width: 450px; max-width: 100%; border-radius: 12px;" />

      <h2 style="color: #e17156;">👗 MyStyle - Customer Contact Message</h2>
    </div>

    <div style="background-color: #fff8f4; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
      <h3 style="color: #333;">New Message from <span style="color: #e17156;">${name}</span></h3>
      <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #007bff;">${email}</a></p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left: 4px solid #e17156; margin: 10px 0; padding-left: 15px; color: #555;">
        ${message}
      </blockquote>
    </div>

    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">
      © ${new Date().getFullYear()} MyStyle. Elevate Your Style Everyday.
    </div>
  </div>
`;

        await sendMail(process.env.GMAIL_USER, `Contact from ${name}`, htmlContent);

        res.send(
            `<script>alert("Your message has been sent successfully!"); window.location.href = "/contact";</script>`,
        );
    } catch (err) {
        console.error('❌ Failed to send contact email:', err);
        res.status(500).send('Failed to send message.');
    }
});

export default router;
