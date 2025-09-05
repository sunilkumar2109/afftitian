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
      "https://afftitans.com", // your production frontend
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
app.post("/api/custom-click", (req, res) => {
  const { banner_id, banner_title, section, link_url, page } = req.body || {};

  const ua = req.headers["user-agent"] || "";
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;

  const click = {
    id: Date.now(),
    banner_id,
    banner_title,
    section,
    link_url,
    page,
    user_agent: ua,
    ip,
    clicked_at: new Date().toISOString(),
  };

  const data = readData();
  data.push(click);
  writeData(data);

  res.json({ ok: true });
});

app.get("/api/custom-clicks", (req, res) => {
  const data = readData();
  console.log("📤 Returning", data.length, "custom clicks");
  res.json(data);
});

// ==============================
// 📌 Start Server
// ==============================
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
  console.log("📂 Data file:", DATA_FILE);
});
