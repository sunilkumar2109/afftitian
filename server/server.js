import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// File setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "custom_clicks.json");

console.log("🔧 Starting server initialization...");

// Helper functions
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
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log("ℹ️ No data file yet, creating empty array");
      const emptyData = [];
      writeData(emptyData);
      return emptyData;
    }
    const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("❌ Failed to read JSON:", err.message);
    const emptyData = [];
    writeData(emptyData);
    return emptyData;
  }
}

function writeData(data) {
  try {
    const dataToWrite = Array.isArray(data) ? data : [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToWrite, null, 2));
    console.log("✅ Saved", dataToWrite.length, "clicks to file");
  } catch (err) {
    console.error("❌ Failed to save JSON:", err.message);
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

// Simple country lookup (removed complex fetch logic to avoid potential issues)
function getCountry() {
  return "Unknown"; // Simplified for now - you can add ipinfo.io later if needed
}

// Session management
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

setInterval(cleanupOldSessions, 10 * 60 * 1000);

// Initialize Express app
const app = express();

// Trust proxy for proper IP detection
app.set("trust proxy", true);

// CORS Configuration - Very permissive for debugging
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "Cache-Control", "Pragma"]
}));

// Additional CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    console.log("✅ CORS preflight handled for", req.path);
    return res.status(200).end();
  }
  
  next();
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} from ${getClientIp(req)}`);
  next();
});

// Routes
app.get("/", (req, res) => {
  res.json({ 
    message: "Affiliate Tracking Server is running ✅",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /api/health",
      "GET /api/custom-clicks", 
      "GET /api/section-ip-stats",
      "POST /api/custom-click"
    ]
  });
});

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
    const browser = parseBrowser(ua);
    const country = getCountry(); // Simplified

    // Time tracking
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

    // Deduplication
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
      console.log("🔄 Updated existing click record");
    } else {
      data.push({
        ...clickData,
        first_clicked_at: clickData.clicked_at,
        click_count: 1
      });
      console.log("✨ Added new click record");
    }

    // Keep only recent records
    if (data.length > 10000) {
      data = data.slice(-10000);
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
    console.error("❌ Error processing banner click:", error.message);
    res.status(500).json({ 
      error: "Failed to track click", 
      details: error.message 
    });
  }
});

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

    console.log("📤 Returning", sorted.length, "custom clicks");
    res.json(sorted);
  } catch (error) {
    console.error("❌ Error fetching custom clicks:", error.message);
    res.status(500).json({ 
      error: "Failed to fetch clicks", 
      details: error.message 
    });
  }
});

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

    console.log("📊 Returning", sortedStats.length, "section-IP stats");
    res.json(sortedStats);
  } catch (error) {
    console.error("❌ Error generating section stats:", error.message);
    res.status(500).json({ 
      error: "Failed to generate stats", 
      details: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("💥 Unhandled error:", error.message);
  res.status(500).json({
    error: "Internal server error",
    details: error.message
  });
});

// Start server
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Affiliate Tracking Server running on port ${PORT}`);
  console.log(`📂 Data file: ${DATA_FILE}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS: Open for all origins`);
  
  const initialData = readData();
  console.log(`📊 Loaded ${initialData.length} existing click records`);
  
  console.log("\n📡 Available endpoints:");
  console.log("  GET  /                       - Server info");
  console.log("  GET  /api/health             - Health check");
  console.log("  POST /api/custom-click       - Track banner clicks");
  console.log("  GET  /api/custom-clicks      - Get all tracked clicks");
  console.log("  GET  /api/section-ip-stats   - Get section-IP statistics");
});