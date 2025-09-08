// ==============================
// RENDER.COM SPECIFIC CORS FIX
// ==============================
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

// Load environment variables FIRST
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "custom_clicks.json");

// ==============================
// HELPER FUNCTIONS
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
    console.log("Creating empty data file");
    const emptyData = [];
    writeData(emptyData);
    return emptyData;
  }
  try {
    const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to read JSON:", err);
    const emptyData = [];
    writeData(emptyData);
    return emptyData;
  }
}

function writeData(data) {
  try {
    const dataToWrite = Array.isArray(data) ? data : [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToWrite, null, 2));
    console.log("Saved", dataToWrite.length, "clicks to file");
  } catch (err) {
    console.error("Failed to save JSON:", err);
  }
}

function normalizeIp(ip) {
  if (!ip || ip === "undefined" || ip === "null") return "unknown";
  if (ip === "::1" || ip === "127.0.0.1" || ip === "0:0:0:0:0:0:0:1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
  return String(ip).trim();
}

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

function getClientIp(req) {
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

async function lookupCountry(ip) {
  try {
    if (ip === "127.0.0.1" || ip === "unknown" || ip === "::1") {
      try {
        const myIpRes = await fetch("https://api.ipify.org?format=json", { timeout: 5000 });
        const myIpData = await myIpRes.json();
        ip = myIpData.ip;
        console.log("Using public IP for localhost:", ip);
      } catch (err) {
        console.log("Could not get public IP, using Unknown country");
        return "Unknown";
      }
    }

    const token = process.env.IPINFO_TOKEN;
    const url = token 
      ? `https://ipinfo.io/${ip}/json?token=${token}`
      : `https://ipinfo.io/${ip}/json`;
    
    const res = await fetch(url, { 
      timeout: 5000,
      headers: { 'User-Agent': 'BannerTracker/1.0' }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    return data.country || "Unknown";
  } catch (err) {
    console.error("Country lookup failed for", ip, ":", err.message);
    return "Unknown";
  }
}

const sessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000;

function cleanupOldSessions() {
  const now = Date.now();
  for (const [key, startTime] of sessions.entries()) {
    if (now - startTime > SESSION_TIMEOUT) {
      sessions.delete(key);
    }
  }
}

setInterval(cleanupOldSessions, 10 * 60 * 1000);

// ==============================
// EXPRESS APP SETUP
// ==============================
const app = express();

// CRITICAL: Trust proxy for Render.com
app.set("trust proxy", 1);

// ==============================
// RENDER.COM SPECIFIC CORS FIX
// ==============================
console.log("Setting up RENDER.COM compatible CORS...");

// Method 1: Manual CORS headers (MOST IMPORTANT FOR RENDER)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  console.log(`Incoming request: ${req.method} ${req.path} from origin: ${origin}`);
  
  // Set CORS headers for ALL requests
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "false"); // Changed to false for wildcard origin
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma");
  res.header("Access-Control-Expose-Headers", "Content-Length,Content-Range");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours
  
  // Handle preflight requests IMMEDIATELY
  if (req.method === "OPTIONS") {
    console.log("Preflight request handled");
    return res.status(200).end();
  }
  
  next();
});

// Method 2: Express CORS middleware (backup)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // For now, allow ALL origins to fix the issue
    console.log("Allowing origin:", origin);
    return callback(null, true);
  },
  credentials: false, // Must be false when origin is *
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${getClientIp(req)}`);
  next();
});

// ==============================
// OPENAI CLIENT SETUP
// ==============================
let client = null;
if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log("OpenAI client initialized");
} else {
  console.log("No OpenAI API key found");
}

// ==============================
// API ROUTES
// ==============================

// Health check endpoint (MUST BE FIRST)
app.get("/", (req, res) => {
  res.json({
    message: "Affiliate Tracking Server is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
    cors: "Enabled for all origins",
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get("/api/health", (req, res) => {
  const data = readData();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    total_clicks: data.length,
    active_sessions: sessions.size,
    data_file: DATA_FILE,
    cors_policy: "Allow all origins (*) - Render.com compatible"
  });
});

// Custom click tracking endpoint
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

    console.log("Processing banner click:", {
      banner_id: String(banner_id).substring(0, 8) + "...",
      section,
      page
    });

    if (!banner_id) {
      return res.status(400).json({ error: "banner_id is required" });
    }

    const ua = user_agent || req.headers["user-agent"] || "";
    const ip = getClientIp(req);
    const browser = parseBrowser(ua);
    const country = await lookupCountry(ip);

    const now = Date.now();
    const sessionKey = `${ip}_${section}`;
    
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
      user_agent: ua.substring(0, 500),
    };

    let data = readData();

    const uniqueKey = `${banner_id}|${section}|${ip}`;
    const existingIndex = data.findIndex(
      (c) => `${c.banner_id}|${c.section}|${c.ip}` === uniqueKey
    );

    if (existingIndex >= 0) {
      data[existingIndex] = {
        ...data[existingIndex],
        ...clickData,
        first_clicked_at: data[existingIndex].first_clicked_at || data[existingIndex].clicked_at,
        clicked_at: clickData.clicked_at,
        click_count: (data[existingIndex].click_count || 1) + 1
      };
      console.log("Updated existing click record");
    } else {
      data.push({
        ...clickData,
        first_clicked_at: clickData.clicked_at,
        click_count: 1
      });
      console.log("Added new click record");
    }

    if (data.length > 10000) {
      data = data.slice(-10000);
      console.log("Trimmed data to 10,000 most recent records");
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
    console.error("Error processing banner click:", error);
    res.status(500).json({ 
      error: "Failed to track click", 
      details: error.message 
    });
  }
});

// Get all custom clicks
app.get("/api/custom-clicks", (req, res) => {
  try {
    const data = readData();
    
    const sorted = data.slice().sort((a, b) => {
      const aMinutes = Number(a.time_spent_minutes) || 0;
      const bMinutes = Number(b.time_spent_minutes) || 0;
      
      if (bMinutes !== aMinutes) {
        return bMinutes - aMinutes;
      }
      
      const aSeconds = Number(a.time_spent_seconds) || 0;
      const bSeconds = Number(b.time_spent_seconds) || 0;
      return bSeconds - aSeconds;
    });

    console.log("Returning", sorted.length, "custom clicks (sorted by time spent)");
    res.json(sorted);
  } catch (error) {
    console.error("Error fetching custom clicks:", error);
    res.status(500).json({ 
      error: "Failed to fetch clicks", 
      details: error.message 
    });
  }
});

// Get section IP stats
app.get("/api/section-ip-stats", (req, res) => {
  try {
    const data = readData();
    const statsMap = new Map();

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

      if (minutes > current.max_time || 
          (minutes === current.max_time && seconds > current.max_time_seconds)) {
        current.max_time = minutes;
        current.max_time_seconds = seconds;
      }

      current.total_clicks += (click.click_count || 1);
      
      if (click.first_clicked_at && click.first_clicked_at < current.first_seen) {
        current.first_seen = click.first_clicked_at;
      }
      
      if (click.clicked_at && click.clicked_at > current.last_seen) {
        current.last_seen = click.clicked_at;
      }

      statsMap.set(key, current);
    }

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
        if (b.max_time !== a.max_time) {
          return b.max_time - a.max_time;
        }
        return b.max_time_seconds - a.max_time_seconds;
      });

    console.log("Returning", sortedStats.length, "section-IP stats");
    res.json(sortedStats);
  } catch (error) {
    console.error("Error generating section stats:", error);
    res.status(500).json({ 
      error: "Failed to generate stats", 
      details: error.message 
    });
  }
});

// OpenAI text parsing endpoint
app.post("/api/parse-network-text", async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ 
        error: "OpenAI service not available",
        details: "No API key configured" 
      });
    }

    const { text } = req.body;
    console.log("Processing network text:", text?.substring(0, 100) + "...");

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
    console.log("Raw OpenAI Response:", content);

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

// Clear data endpoint
app.post("/api/clear-data", (req, res) => {
  try {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({ error: "Not allowed in production" });
    }
    writeData([]);
    sessions.clear();
    console.log("Cleared all tracking data");
    res.json({ success: true, message: "All data cleared" });
  } catch (error) {
    console.error("Error clearing data:", error);
    res.status(500).json({ 
      error: "Failed to clear data", 
      details: error.message 
    });
  }
});

// Favicon handler
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? error.message : "Something went wrong"
  });
});

// 404 handler (must be last)
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ==============================
// START SERVER
// ==============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`CORS: Allow ALL origins (*) - Render.com compatible`);
  console.log(`Trust proxy: enabled`);
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`IPInfo Token: ${process.env.IPINFO_TOKEN ? 'Set' : 'Not set'}`);
  
  console.log("\nAvailable endpoints:");
  console.log("  GET  /                       - Server status");
  console.log("  GET  /api/health             - Health check");
  console.log("  POST /api/custom-click       - Track banner clicks");
  console.log("  GET  /api/custom-clicks      - Get all tracked clicks");
  console.log("  GET  /api/section-ip-stats   - Get section-IP statistics");
  console.log("  POST /api/parse-network-text - Parse network text with OpenAI");
  console.log("  POST /api/clear-data         - Clear all tracking data");
  
  const initialData = readData();
  console.log(`Loaded ${initialData.length} existing click records`);
});
