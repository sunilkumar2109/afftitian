// ==============================
// 📌 Imports
// ==============================
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // npm install node-fetch

// ==============================
// 📌 File setup
// ==============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to JSON file for storing custom clicks
const DATA_FILE = path.join(__dirname, "custom_clicks.json");

// ==============================
// 📌 Helpers
// ==============================
function formatDuration(minutes, seconds) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (minutes > 0) return `${minutes}m`;
  if (seconds > 0) return `${seconds}s`;
  return "0s";
}


function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log("ℹ️ No data file yet, returning []");
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (err) {
    console.error("❌ Failed to read JSON:", err);
    return [];
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("✅ Saved", data.length, "clicks to file at:", DATA_FILE);
  } catch (err) {
    console.error("❌ Failed to save JSON:", err);
  }
}
function normalizeIp(ip) {
  if (!ip) return "unknown";
  if (ip === "::1" || ip === "127.0.0.1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
  return ip;
}

// parse browser name only
function parseBrowser(userAgent = "") {
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
    return "Safari";
  if (userAgent.includes("OPR") || userAgent.includes("Opera")) return "Opera";
  return "Other";
}

// ✅ Normalize and get IP
// ✅ Normalize and get IP
function getClientIp(req) {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.headers["cf-connecting-ip"] ||
    req.socket?.remoteAddress ||
    req.ip;

  if (!ip) return "unknown";

  // Normalize localhost
  if (ip === "::1" || ip === "127.0.0.1" || ip === "0:0:0:0:0:0:0:1") {
    return "127.0.0.1";
  }

  // Normalize IPv6-mapped IPv4 (::ffff:192.168.0.10 → 192.168.0.10)
  if (ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }

  return ip;
}

// lookup country by IP
async function lookupCountry(ip) {
  try {
    // If localhost, fetch public IP
    if (ip === "::1" || ip === "127.0.0.1") {
      const myIpRes = await fetch("https://api.ipify.org?format=json");
      const myIpData = await myIpRes.json();
      ip = myIpData.ip; // your real public IP
    }

    const res = await fetch(`https://ipinfo.io/${ip}/json?token=89f114513906ed`);
    const data = await res.json();

    console.log("🌍 IPInfo Response:", ip, data);

    return data.country || "Unknown";
  } catch (err) {
    console.error("Country lookup failed:", err);
    return "Unknown";
  }
}

// simple memory session store for time spent
const sessions = {};

// ==============================
// 📌 App + Middleware
// ==============================
dotenv.config();
const app = express();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.set("trust proxy", true);

app.use(
  cors({
    origin: [
      "http://localhost:8080", // frontend dev server
      "http://localhost:5173", // Vite dev
      "http://localhost:3000", // CRA dev
      "https://afftitans.com", // production frontend
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ==============================
// 📌 OpenAI Endpoint
// ==============================
app.post("/api/parse-network-text", async (req, res) => {
  try {
    const { text } = req.body;
    console.log("Incoming text:", text);

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const prompt = `
    Extract these fields into a JSON object:
    - network_name
    - network_type
    - website_link
    - website_email
    - skype_id
    - telegram
    - payment_frequency
    - payment_methods
    - categories
    - number_of_offers
    - type_of_commission
    - minimum_withdrawal
    - tracking_software
    - phone_number
    - linkedin_id
    - teams
    - referral_commission
    - logo_url
    - description

    Return ONLY raw JSON. If data is missing, use an empty string.

    Text to parse:
    """${text}"""
    `;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    let content = response.choices[0].message?.content?.trim() || "{}";
    console.log("Raw OpenAI Response:", content);

    // Remove ```json fences if present
    content = content.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("Parse Error:", err);
      return res.status(500).json({
        error: "Invalid JSON from OpenAI",
        raw: content,
      });
    }

    res.json(parsed);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({
      error: "Failed to process request",
      details: error.message,
    });
  }
});

// ==============================
// 📌 Custom Banner Tracking
// ==============================
app.post("/api/custom-click", async (req, res) => {
  const { banner_id, banner_title, section, link_url, page } = req.body || {};
  const ua = req.headers["user-agent"] || "";
  const ip = getClientIp(req);

  // Browser & Country
  const browser = parseBrowser(ua);
  const country = await lookupCountry(ip);

  // Time spent tracking
  const now = Date.now();
  if (!sessions[ip]) {
    sessions[ip] = now; // first click for this IP
  }
  const timeSpentMs = now - sessions[ip];
  const timeSpentMinutes = Math.floor(timeSpentMs / 60000);
  const timeSpentSeconds = Math.floor(timeSpentMs / 1000);

  const click = {
    id: Date.now(),
    banner_id,
    banner_title,
    section,
    link_url,
    page,
    browser,
    country,
    ip,
    time_spent_minutes: timeSpentMinutes,
    time_spent_seconds: timeSpentSeconds,
    clicked_at: new Date().toISOString(),
  };



let data = readData();

// 🔑 unique key = banner_id + section + ip
const key = `${banner_id}|${section}|${ip}`;
const index = data.findIndex(
  (c) => `${c.banner_id}|${c.section}|${c.ip}` === key
);

if (index >= 0) {
  // ✅ Update existing record
  data[index] = {
    ...data[index],
    browser,
    country,
    time_spent_minutes: timeSpentMinutes,
    time_spent_seconds: timeSpentSeconds,
    clicked_at: new Date().toISOString(), // refresh last clicked
  };
} else {
  // ✅ Insert new
  data.push(click);
}

writeData(data);

  res.json({ ok: true });
});

// 🚀 Fetch all custom banner clicks
app.get("/api/custom-clicks", (req, res) => {
  const data = readData();
  console.log("📤 Returning", data.length, "custom clicks");
  res.json(data);
});
;
}

app.get("/api/section-ip-stats", (req, res) => {
  const data = readData();
  const map = new Map();

  for (const c of data) {
    const section = c.section || "unknown";
    const ip = c.ip || "unknown";
    const key = `${section}|${ip}`;

    const current =
      map.get(key) || { section, ip, max_time: 0, max_time_seconds: 0 };

    const tMin = Number.isFinite(c.time_spent_minutes) ? c.time_spent_minutes : 0;
    const tSec = Number.isFinite(c.time_spent_seconds) ? c.time_spent_seconds : 0;

    if (tMin > current.max_time) current.max_time = tMin;
    if (tSec > current.max_time_seconds) current.max_time_seconds = tSec;

    map.set(key, current);
  }

  const list = Array.from(map.values()).map(item => ({
    ...item,
    formatted_time: formatDuration(item.max_time, item.max_time_seconds),
  }));

  res.json(list.sort((a, b) => b.max_time - a.max_time));
});

// ==============================
// 📌 Start Server
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
   console.log("📂 Data file:", DATA_FILE);
});

 

