const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

// Some local environments set dead proxy variables like 127.0.0.1:9.
// Twilio requests should go direct unless you intentionally configure a real proxy.
["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"].forEach((key) => {
  if (process.env[key] && process.env[key].includes("127.0.0.1:9")) {
    delete process.env[key];
  }
});

const twilio = require("twilio");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PHONE = normalizePhone(process.env.ADMIN_PHONE || "7666812148");
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

app.use(cors());
app.use(express.json());

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}

function ensureTwilioConfigured() {
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID);
}

function buildClient() {
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    twilioConfigured: ensureTwilioConfigured()
  });
});

app.post("/api/admin/send-otp", async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) {
    return res.status(400).json({ message: "Phone number is required." });
  }

  if (phone !== ADMIN_PHONE) {
    return res.status(403).json({ message: "Only the authorized admin phone number can receive OTP." });
  }

  if (!ensureTwilioConfigured()) {
    return res.status(500).json({
      message: "OTP server is not configured yet. Add Twilio credentials in .env and restart the server."
    });
  }

  try {
    const client = buildClient();
    await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    return res.json({ message: "OTP sent successfully." });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Unable to send OTP."
    });
  }
});

app.post("/api/admin/verify-otp", async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const otp = String(req.body?.otp || "").trim();

  if (!phone || !otp) {
    return res.status(400).json({ message: "Phone number and OTP are required." });
  }

  if (phone !== ADMIN_PHONE) {
    return res.status(403).json({ message: "Only the authorized admin phone number can verify OTP." });
  }

  if (!ensureTwilioConfigured()) {
    return res.status(500).json({
      message: "OTP server is not configured yet. Add Twilio credentials in .env and restart the server."
    });
  }

  try {
    const client = buildClient();
    const check = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code: otp });

    if (check.status !== "approved") {
      return res.status(401).json({ message: "Invalid OTP. Please try again." });
    }

    return res.json({ message: "OTP verified successfully." });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Unable to verify OTP."
    });
  }
});

app.listen(PORT, () => {
  console.log(`OTP server running on http://localhost:${PORT}`);
});
