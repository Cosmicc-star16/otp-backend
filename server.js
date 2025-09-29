import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch"; // if Node 18+, native fetch is built-in

dotenv.config();
const app = express();
app.use(express.json());

const otpStore = new Map(); // temporary in-memory storage

// ✅ Send OTP route
app.post("/send-otp", async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore.set(email, { otp, expiry: Date.now() + 5 * 60 * 1000, purpose });

    // select subject & message based on purpose
    let subject = "Your OTP Code";
    let text = `Your OTP is ${otp}. It will expire in 5 minutes.`;

    if (purpose === "verification" || purpose === "signup" || purpose === "google-signup") {
      subject = "Verify Your Email";
      text = `Use this OTP to verify your email: ${otp}. This code will expire in 5 minutes.`;
    } else if (purpose === "reset-password") {
      subject = "Reset Your Password";
      text = `Here is your OTP to reset your password: ${otp}. It will expire in 5 minutes.`;
    } else if (purpose === "change-email") {
      subject = "Change Email Request";
      text = `Use this OTP to confirm your email change: ${otp}. This code will expire in 5 minutes.`;
    }

    // ✅ Send email via Brevo API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Barangay iRescue OTP", email: process.env.SENDER_EMAIL },
        to: [{ email }],
        subject,
        textContent: text, // fallback plain text
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7;">
            <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #2a7ae2; text-align:center;">${subject}</h2>
              <p style="font-size: 16px; color: #333; text-align:center;">
                ${text}
              </p>
              <div style="margin: 20px 0; text-align:center;">
                <span style="font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #2a7ae2;">
                  ${otp}
                </span>
              </div>
              <p style="font-size: 14px; color: #777; text-align:center;">
                If you didn’t request this, you can ignore this email.
              </p>
              <p style="font-size: 12px; color: #aaa; text-align:center; margin-top: 20px;">
                © ${new Date().getFullYear()} Barangay iRescue
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Brevo API Error:", errorText);
      return res.status(500).json({
        success: false,
        message: "Brevo failed: " + errorText,
      });
    }

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// ✅ Verify OTP route
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record) {
    return res.status(400).json({ success: false, message: "No OTP found" });
  }
  if (Date.now() > record.expiry) {
    return res.status(400).json({ success: false, message: "OTP expired" });
  }
  if (String(record.otp) !== String(otp)) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  otpStore.delete(email);
  res.json({ success: true, message: "OTP verified" });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
