// server.js
import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json()); // ✅ replaces body-parser

// Gmail transporter (with App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// In-memory OTP storage (better: use Redis/DB in production)
const otpStore = new Map();

// ✅ API route to send OTP (for Signup / Reset Password)
app.post("/send-otp", async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Save OTP in store with 5min expiry
    otpStore.set(email, { otp, expiry: Date.now() + 5 * 60 * 1000, purpose });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Barangay iRescue - ${purpose === "signup" ? "Verification" : "Password Reset"} OTP Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9; border: 1px solid #ddd;">
          <h2 style="text-align: center; color: #333;">Barangay iRescue</h2>
          <p style="font-size: 15px; color: #555;">
            Dear User,
          </p>
          <p style="font-size: 15px; color: #555;">
            You requested ${purpose === "signup" ? "account verification" : "a password reset"}. Please use the one-time password (OTP) code below to proceed:
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
            If you didn’t request this, please ignore this email or contact our support team immediately.
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

    res.json({ success: true, message: "OTP sent successfully" }); // ✅ no OTP in response
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// ✅ API route to verify OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp, purpose } = req.body;

  const record = otpStore.get(email);
  if (!record) {
    return res.status(400).json({ success: false, message: "No OTP found" });
  }

  if (Date.now() > record.expiry) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: "OTP expired" });
  }

  if (String(record.otp) !== String(otp)) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  otpStore.delete(email); // ✅ remove after verification
  return res.json({ success: true, message: "OTP verified successfully", purpose: record.purpose });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
