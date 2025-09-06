// ==============================
// 🔌 Imports
// ==============================
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

// ==============================
// 🔌 File setup
// ==============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to JSON file for storing custom clicks
const DATA_FILE = path.join(__dirname, "custom_clicks.json");

// ==============================
// 🔌 Enhanced Helpers
// ==============================

function formatDuration(minutes, seconds) {
  const mins = Number(minutes) || 0;
  const secs = Number(seconds) || 0;
  
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (mins > 0) return `${mins}m`;
  if (secs > 0) return `${secs}s`;
  return "0s";
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log("ℹ️ No data file yet, creating empty array");
    const emptyData = [];
    writeData(emptyData);
    return emptyData;
  }
  try {
    const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("❌ Failed to read JSON:", err);
    console.log("📝 Creating new empty data file");
    const emptyData = [];
    writeData(emptyData);
    return emptyData;
  }
}

function writeData(data) {
  try {
    const dataToWrite = Array.isArray(data) ? data : [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToWrite, null, 2));
    console.log("✅ Saved", dataToWrite.length, "clicks to file:", DATA_FILE);
  } catch (err) {
    console.error("❌ Failed to save JSON:", err);
  }
}

function normalizeIp(ip) {
  if (!ip || ip === "undefined" || ip === "null") return "unknown";
  if (ip === "::1" || ip === "127.0.0.1" || ip === "0:0:0:0:0:0:0:1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
  return String(ip).trim();
}

// Enhanced browser parsing
function parseBrowser(userAgent = "") {
  if (!userAgent) return "Unknown";
  
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/") || ua.includes("edge/")) return "Edge";
  if (ua.includes("chrome/") && !ua.includes("edg")) return "Chrome";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("opr/") || ua.includes("opera/")) return "Opera";
  return "Other";
}

// Enhanced IP extraction
function getClientIp(req) {
  // Try multiple headers for IP extraction
  const possibleIps = [
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim(),
    req.headers["x-real-ip"],
    req.headers["cf-connecting-ip"],
    req.headers["x-client-ip"],
    req.connection?.remoteAddress,
    req.socket?.remoteAddress,
    req.ip
  ].filter(Boolean);

  let ip = possibleIps[0] || "unknown";
  
  return normalizeIp(ip);
}

// Enhanced country lookup with better error handling
async function lookupCountry(ip) {
  try {
    // If localhost, try to get public IP
    if (ip === "127.0.0.1" || ip === "unknown" || ip === "::1") {
      try {
        const myIpRes = await fetch("https://api.ipify.org?format=json", { timeout: 5000 });
        const myIpData = await myIpRes.json();
        ip = myIpData.ip;
        console.log("🌍 Using public IP for localhost:", ip);
      } catch (err) {
        console.log("⚠️ Could not get public IP, using Unknown country");
        return "Unknown";
      }
    }

    // Use ipinfo.io for geolocation
    const token = process.env.IPINFO_TOKEN;
    const url = token 
      ? `https://ipinfo.io/${ip}/json?token=${token}`
      : `https://ipinfo.io/${ip}/json`;
    
    const res = await fetch(url, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'BannerTracker/1.0'
      }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    console.log("🌍 IPInfo Response for", ip, ":", data);

    return data.country || "Unknown";
  } catch (err) {
    console.error("❌ Country lookup failed for", ip, ":", err.message);
    return "Unknown";
  }
}

// Enhanced session management with better time tracking
const sessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function cleanupOldSessions() {
  const now = Date.now();
  for (const [key, startTime] of sessions.entries()) {
    if (now - startTime > SESSION_TIMEOUT) {
      sessions.delete(key);
    }
  }
}

// Clean up sessions every 10 minutes
setInterval(cleanupOldSessions, 10 * 60 * 1000);

// ==============================
// 🔌 App + Middleware
// ==============================
dotenv.config();
const app = express();

// Initialize OpenAI if API key is provided
let client = null;
if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log("✅ OpenAI client initialized");
} else {
  console.log("⚠️ No OpenAI API key found");
}

app.set("trust proxy", true);

const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://afftitans.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow REST tools or server-to-server requests with no origin
      if (!origin) return callback(null, true);

      // allow if in whitelist OR matches localhost:xxxx
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "User-Agent"],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} from ${getClientIp(req)}`);
  next();
});

// ==============================
// 🔌 OpenAI Endpoint
// ==============================
app.post("/api/parse-network-text", async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ 
        error: "OpenAI service not available",
        details: "No API key configured" 
      });
    }

    const { text } = req.body;
    console.log("📝 Processing network text:", text?.substring(0, 100) + "...");

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const prompt = `
    Extract these fields into a JSON object from the following text:
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

    Return ONLY valid JSON. If data is missing, use an empty string or empty array as appropriate.

    Text to parse:
    """${text}"""
    `;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    let content = response.choices[0].message?.content?.trim() || "{}";
    console.log("🤖 Raw OpenAI Response:", content);

    // Clean up markdown formatting
    content = content.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("❌ Parse Error:", err);
      return res.status(500).json({
        error: "Invalid JSON from OpenAI",
        raw: content,
      });
    }

    res.json(parsed);
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({
      error: "Failed to process request",
      details: error.message,
    });
  }
});

// ==============================
// 🔌 Enhanced Custom Banner Tracking
// ==============================

app.post("/api/custom-click", async (req, res) => {
  try {
    const { 
      banner_id, 
      banner_title, 
      section, 
      link_url, 
      page,
      timestamp,
      user_agent 
    } = req.body || {};

    console.log("🎯 Processing banner click:", {
      banner_id: String(banner_id).substring(0, 8) + "...",
      section,
      page
    });

    if (!banner_id) {
      return res.status(400).json({ error: "banner_id is required" });
    }

    const ua = user_agent || req.headers["user-agent"] || "";
    const ip = getClientIp(req);
    
    // Enhanced browser detection
    const browser = parseBrowser(ua);
    
    // Get country with better error handling
    const country = await lookupCountry(ip);

    // Enhanced time tracking
    const now = Date.now();
    const sessionKey = `${ip}_${section}`;
    
    // Clean up old sessions periodically
    cleanupOldSessions();
    
    if (!sessions.has(sessionKey)) {
      sessions.set(sessionKey, now);
    }
    
    const sessionStartTime = sessions.get(sessionKey);
    const timeSpentMs = now - sessionStartTime;
    const timeSpentMinutes = Math.floor(timeSpentMs / 60000);
    const timeSpentSeconds = Math.floor((timeSpentMs % 60000) / 1000);

    const clickData = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      banner_id: String(banner_id),
      banner_title: banner_title || null,
      section: section || "unknown",
      link_url: link_url || null,
      page: page || null,
      browser,
      country,
      ip,
      time_spent_minutes: Math.max(0, timeSpentMinutes),
      time_spent_seconds: Math.max(0, timeSpentSeconds),
      clicked_at: timestamp || new Date().toISOString(),
      user_agent: ua.substring(0, 500), // Limit UA length
    };

    console.log("📊 Click data prepared:", {
      banner_id: clickData.banner_id.substring(0, 8) + "...",
      section: clickData.section,
      browser: clickData.browser,
      country: clickData.country,
      ip: clickData.ip,
      time_spent: `${clickData.time_spent_minutes}m ${clickData.time_spent_seconds}s`
    });

    let data = readData();

    // Enhanced deduplication logic
    const uniqueKey = `${banner_id}|${section}|${ip}`;
    const existingIndex = data.findIndex(
      (c) => `${c.banner_id}|${c.section}|${c.ip}` === uniqueKey
    );

    if (existingIndex >= 0) {
      // Update existing record with latest data
      data[existingIndex] = {
        ...data[existingIndex],
        ...clickData,
        // Keep the original clicked_at for first visit tracking
        first_clicked_at: data[existingIndex].first_clicked_at || data[existingIndex].clicked_at,
        clicked_at: clickData.clicked_at, // Update to latest click
        click_count: (data[existingIndex].click_count || 1) + 1
      };
      console.log("🔄 Updated existing click record");
    } else {
      // Add new record
      data.push({
        ...clickData,
        first_clicked_at: clickData.clicked_at,
        click_count: 1
      });
      console.log("✨ Added new click record");
    }

    // Keep only the most recent 10,000 records to prevent file from getting too large
    if (data.length > 10000) {
      data = data.slice(-10000);
      console.log("🗂️ Trimmed data to 10,000 most recent records");
    }

    writeData(data);

    res.json({ 
      success: true, 
      message: "Click tracked successfully",
      data: {
        banner_id: clickData.banner_id.substring(0, 8) + "...",
        section: clickData.section,
        time_spent: formatDuration(clickData.time_spent_minutes, clickData.time_spent_seconds),
        country: clickData.country
      }
    });

  } catch (error) {
    console.error("❌ Error processing banner click:", error);
    res.status(500).json({ 
      error: "Failed to track click", 
      details: error.message 
    });
  }
});

// Enhanced endpoint to fetch all custom banner clicks
app.get("/api/custom-clicks", (req, res) => {
  try {
    const data = readData();
    
    // Sort by time spent (minutes first, then seconds) in descending order
    const sorted = data.slice().sort((a, b) => {
      const aMinutes = Number(a.time_spent_minutes) || 0;
      const bMinutes = Number(b.time_spent_minutes) || 0;
      
      // First compare minutes
      if (bMinutes !== aMinutes) {
        return bMinutes - aMinutes;
      }
      
      // If minutes are equal, compare seconds
      const aSeconds = Number(a.time_spent_seconds) || 0;
      const bSeconds = Number(b.time_spent_seconds) || 0;
      return bSeconds - aSeconds;
    });

    console.log("📤 Returning", sorted.length, "custom clicks (sorted by time spent)");
    
    res.json(sorted);
  } catch (error) {
    console.error("❌ Error fetching custom clicks:", error);
    res.status(500).json({ 
      error: "Failed to fetch clicks", 
      details: error.message 
    });
  }
});

// Enhanced aggregated IP stats endpoint
app.get("/api/section-ip-stats", (req, res) => {
  try {
    const data = readData();
    const statsMap = new Map();

    // Process each click record
    for (const click of data) {
      const section = click.section || "unknown";
      const ip = click.ip || "unknown";
      const key = `${section}|${ip}`;

      const minutes = Number(click.time_spent_minutes) || 0;
      const seconds = Number(click.time_spent_seconds) || 0;

      const current = statsMap.get(key) || { 
        section, 
        ip, 
        max_time: 0, 
        max_time_seconds: 0,
        total_clicks: 0,
        first_seen: click.first_clicked_at || click.clicked_at,
        last_seen: click.clicked_at
      };

      // Update maximums
      if (minutes > current.max_time || 
          (minutes === current.max_time && seconds > current.max_time_seconds)) {
        current.max_time = minutes;
        current.max_time_seconds = seconds;
      }

      // Update metadata
      current.total_clicks += (click.click_count || 1);
      
      if (click.first_clicked_at && click.first_clicked_at < current.first_seen) {
        current.first_seen = click.first_clicked_at;
      }
      
      if (click.clicked_at && click.clicked_at > current.last_seen) {
        current.last_seen = click.clicked_at;
      }

      statsMap.set(key, current);
    }

    // Convert to array and sort by max_time (descending)
    const sortedStats = Array.from(statsMap.values())
      .map((item) => ({
        section: item.section,
        ip: item.ip,
        max_time: item.max_time,
        max_time_seconds: item.max_time_seconds,
        formatted_time: formatDuration(item.max_time, item.max_time_seconds),
        total_clicks: item.total_clicks,
        first_seen: item.first_seen,
        last_seen: item.last_seen
      }))
      .sort((a, b) => {
        // Sort by max_time first, then max_time_seconds
        if (b.max_time !== a.max_time) {
          return b.max_time - a.max_time;
        }
        return b.max_time_seconds - a.max_time_seconds;
      });

    console.log("📊 Returning", sortedStats.length, "section-IP stats (sorted by max time)");
    
    res.json(sortedStats);
  } catch (error) {
    console.error("❌ Error generating section stats:", error);
    res.status(500).json({ 
      error: "Failed to generate stats", 
      details: error.message 
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  const data = readData();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    total_clicks: data.length,
    active_sessions: sessions.size,
    data_file: DATA_FILE
  });
});

// Clear data endpoint (for development/testing)
app.post("/api/clear-data", (req, res) => {
  try {
    writeData([]);
    sessions.clear();
    console.log("🗑️ Cleared all tracking data");
    res.json({ success: true, message: "All data cleared" });
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    res.status(500).json({ 
      error: "Failed to clear data", 
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("💥 Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? error.message : "Something went wrong"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ==============================
// 🔌 Start Server
// ==============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Banner Tracking Server running on http://localhost:${PORT}`);
  console.log(`📂 Data file: ${DATA_FILE}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log available endpoints
  console.log("\n📡 Available endpoints:");
  console.log("  POST /api/custom-click       - Track banner clicks");
  console.log("  GET  /api/custom-clicks      - Get all tracked clicks");
  console.log("  GET  /api/section-ip-stats   - Get section-IP statistics");
  console.log("  GET  /api/health             - Health check");
  console.log("  POST /api/clear-data         - Clear all tracking data");
  console.log("  POST /api/parse-network-text - Parse network text with OpenAI");
  
  // Initialize data file if it doesn't exist
  const initialData = readData();
  console.log(`📊 Loaded ${initialData.length} existing click records`);
});