import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "custom_clicks.json");

const app = express();

// EMERGENCY CORS FIX - MAXIMUM PERMISSIVE
app.use((req, res, next) => {
  // Allow ALL origins
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Max-Age", "86400");
  
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.headers.origin || 'unknown'}`);
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    console.log("Preflight handled");
    return res.status(200).end();
  }
  
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper functions
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const empty = [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("JSON read error:", err);
    return [];
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`Saved ${data.length} records`);
  } catch (err) {
    console.error("JSON write error:", err);
  }
}

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
         req.headers["x-real-ip"] ||
         req.connection?.remoteAddress ||
         req.ip ||
         "unknown";
}

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Emergency CORS Fixed Server Running",
    status: "healthy",
    timestamp: new Date().toISOString(),
    cors: "MAXIMUM PERMISSIVE - ALL ORIGINS ALLOWED"
  });
});

app.get("/api/health", (req, res) => {
  const data = readData();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    total_clicks: data.length,
    cors_policy: "Allow ALL (*)",
    server: "Emergency CORS Fix Version"
  });
});

app.get("/api/custom-clicks", (req, res) => {
  try {
    const data = readData();
    console.log(`Returning ${data.length} custom clicks`);
    res.json(data);
  } catch (error) {
    console.error("Error fetching custom clicks:", error);
    res.status(500).json({ 
      error: "Failed to fetch clicks", 
      details: error.message 
    });
  }
});

app.get("/api/section-ip-stats", (req, res) => {
  try {
    const data = readData();
    
    // Simple stats generation
    const stats = data.map(click => ({
      section: click.section || "unknown",
      ip: click.ip || "unknown",
      max_time: click.time_spent_minutes || 0,
      max_time_seconds: click.time_spent_seconds || 0,
      formatted_time: `${click.time_spent_minutes || 0}m`,
      total_clicks: 1,
      first_seen: click.clicked_at,
      last_seen: click.clicked_at
    }));
    
    console.log(`Returning ${stats.length} section stats`);
    res.json(stats);
  } catch (error) {
    console.error("Error generating stats:", error);
    res.status(500).json({ 
      error: "Failed to generate stats", 
      details: error.message 
    });
  }
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

    if (!banner_id) {
      return res.status(400).json({ error: "banner_id is required" });
    }

    const clickData = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      banner_id: String(banner_id),
      banner_title: banner_title || null,
      section: section || "unknown",
      link_url: link_url || null,
      page: page || null,
      ip: getClientIp(req),
      time_spent_minutes: 0,
      time_spent_seconds: 0,
      clicked_at: timestamp || new Date().toISOString(),
      user_agent: user_agent || req.headers["user-agent"] || "",
      country: "Unknown",
      browser: "Unknown"
    };

    const data = readData();
    data.push(clickData);
    
    // Keep only last 1000 records
    if (data.length > 1000) {
      data.splice(0, data.length - 1000);
    }
    
    writeData(data);

    res.json({
      success: true,
      message: "Click tracked successfully",
      data: {
        banner_id: clickData.banner_id.substring(0, 8) + "...",
        section: clickData.section
      }
    });

  } catch (error) {
    console.error("Error processing click:", error);
    res.status(500).json({
      error: "Failed to track click",
      details: error.message
    });
  }
});

// Basic OpenAI endpoint (simplified)
app.post("/api/parse-network-text", async (req, res) => {
  res.status(503).json({
    error: "OpenAI service temporarily disabled",
    message: "Focus on CORS fix first"
  });
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
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    details: error.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EMERGENCY CORS FIXED SERVER running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`CORS: COMPLETELY OPEN - ALL ORIGINS, ALL METHODS, ALL HEADERS`);
  console.log(`Data file: ${DATA_FILE}`);
  
  console.log("\nEndpoints:");
  console.log("  GET  /                     - Server status");
  console.log("  GET  /api/health           - Health check");
  console.log("  GET  /api/custom-clicks    - Get clicks");
  console.log("  GET  /api/section-ip-stats - Get stats");
  console.log("  POST /api/custom-click     - Track click");
  
  const initialData = readData();
  console.log(`Loaded ${initialData.length} existing records`);
});
