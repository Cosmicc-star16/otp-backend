// server.js
import express from "express"; 
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Gmail transporter (with App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// API route to send OTP (for Reset Password)
app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // ✅ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Barangay iRescue - Password Reset OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9; border: 1px solid #ddd;">
          <h2 style="text-align: center; color: #333;">Barangay iRescue</h2>
          <p style="font-size: 15px; color: #555;">
            Dear User,
          </p>
          <p style="font-size: 15px; color: #555;">
            You requested to reset your password. Please use the one-time password (OTP) code below to proceed:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #1E4D9B; letter-spacing: 6px;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #555;">
            This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.
          </p>
          <p style="font-size: 14px; color: #555;">
            If you didn’t request a password reset, please ignore this email or contact our support team immediately.
          </p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #888; text-align: center;">
            © ${new Date().getFullYear()} Barangay iRescue. All rights reserved.
          </p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ success: true, otp }); // ⚠️ in production, wag i-send OTP pabalik
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
