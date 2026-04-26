const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const { google } = require("googleapis");

dotenv.config();

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
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const adminSessions = new Map();

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

function ensureSheetsConfigured() {
  return Boolean(GOOGLE_SHEET_ID && GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY);
}

function buildTwilioClient() {
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function buildSheetsAuth() {
  return new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

async function appendToSheet(submission) {
  if (!ensureSheetsConfigured()) {
    throw new Error("Google Sheets is not configured.");
  }

  const auth = buildSheetsAuth();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "Sheet1!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        submission.type,
        submission.name,
        submission.phone,
        submission.email || "",
        submission.address || "",
        submission.course,
        submission.submittedAt
      ]]
    }
  });
}

async function readSubmissionsFromSheet() {
  if (!ensureSheetsConfigured()) {
    throw new Error("Google Sheets is not configured.");
  }

  const auth = buildSheetsAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "Sheet1!A2:G"
  });

  const rows = response.data.values || [];
  return rows.map((row) => ({
    type: row[0] || "",
    name: row[1] || "",
    phone: row[2] || "",
    email: row[3] || "",
    address: row[4] || "",
    course: row[5] || "",
    submittedAt: row[6] || ""
  }));
}

async function clearSheetSubmissions() {
  if (!ensureSheetsConfigured()) {
    throw new Error("Google Sheets is not configured.");
  }

  const auth = buildSheetsAuth();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.clear({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "Sheet1!A2:G"
  });
}

function createAdminSession() {
  const token = crypto.randomBytes(32).toString("hex");
  adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
  return token;
}

function requireAdminSession(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const expiresAt = adminSessions.get(token);

  if (!token || !expiresAt) {
    return res.status(401).json({ message: "Admin authentication required." });
  }

  if (Date.now() > expiresAt) {
    adminSessions.delete(token);
    return res.status(401).json({ message: "Admin session expired. Please verify OTP again." });
  }

  next();
}

function formatTwilioError(error) {
  const message = error?.message || "Unable to send OTP.";
  if (message.includes("not a valid phone number")) {
    return "The admin phone number is not valid for Twilio SMS.";
  }
  if (message.includes("unverified")) {
    return "This phone number may need to be verified in your Twilio trial account first.";
  }
  return message;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    twilioConfigured: ensureTwilioConfigured(),
    sheetsConfigured: ensureSheetsConfigured()
  });
});

app.post("/api/submissions", async (req, res) => {
  const submission = {
    type: String(req.body?.type || "").trim(),
    name: String(req.body?.name || "").trim(),
    phone: String(req.body?.phone || "").trim(),
    email: String(req.body?.email || "").trim(),
    address: String(req.body?.address || "").trim(),
    course: String(req.body?.course || "").trim(),
    submittedAt: req.body?.submittedAt || new Date().toISOString()
  };

  if (!submission.name || !submission.phone || !submission.course) {
    return res.status(400).json({ message: "Name, phone, and course are required." });
  }

  try {
    await appendToSheet(submission);
    return res.status(201).json({ message: "Submission saved successfully." });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Unable to save submission." });
  }
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
    return res.status(500).json({ message: "OTP server is not configured yet." });
  }

  try {
    const client = buildTwilioClient();
    await client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verifications.create({
      to: phone,
      channel: "sms"
    });
    return res.json({ message: "OTP sent successfully." });
  } catch (error) {
    return res.status(500).json({ message: formatTwilioError(error) });
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
    return res.status(500).json({ message: "OTP server is not configured yet." });
  }

  try {
    const client = buildTwilioClient();
    const check = await client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verificationChecks.create({
      to: phone,
      code: otp
    });

    if (check.status !== "approved") {
      return res.status(401).json({ message: "Invalid OTP. Please try again." });
    }

    return res.json({
      message: "OTP verified successfully.",
      token: createAdminSession()
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Unable to verify OTP." });
  }
});

app.get("/api/admin/submissions", requireAdminSession, async (_req, res) => {
  try {
    const submissions = await readSubmissionsFromSheet();
    return res.json({ submissions });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Unable to load submissions." });
  }
});

app.delete("/api/admin/submissions", requireAdminSession, async (_req, res) => {
  try {
    await clearSheetSubmissions();
    return res.json({ message: "All submissions cleared successfully." });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Unable to clear submissions." });
  }
});

app.listen(PORT, () => {
  console.log(`OTP server running on http://localhost:${PORT}`);
});
