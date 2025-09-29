import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch"; // or axios

dotenv.config();
const app = express();
app.use(express.json());

const otpStore = new Map();

app.post("/send-otp", async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore.set(email, { otp, expiry: Date.now() + 5 * 60 * 1000, purpose });

    // Call EmailJS REST API
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        template_params: {
        email: email,        // match {{email}}
        passcode: otp,       // match {{passcode}}
        time: new Date().toLocaleTimeString(), // optional, para sa {{time}}
      },
      }),
    });

    if (!response.ok) throw new Error("EmailJS failed");

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ success: false, message: "No OTP found" });
  if (Date.now() > record.expiry) return res.status(400).json({ success: false, message: "OTP expired" });
  if (String(record.otp) !== String(otp)) return res.status(400).json({ success: false, message: "Invalid OTP" });

  otpStore.delete(email);
  res.json({ success: true, message: "OTP verified" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
