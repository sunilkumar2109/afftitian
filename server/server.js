import express from "express";
import cors from "cors";

const app = express();

// Simple CORS for all origins
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Test endpoint
app.get("/", (req, res) => {
  res.json({ message: "Server is running!", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "Simple test server working"
  });
});

app.get("/api/custom-clicks", (req, res) => {
  res.json([{ test: "data", message: "CORS working!" }]);
});

app.get("/api/section-ip-stats", (req, res) => {
  res.json([{ test: "stats", message: "CORS working!" }]);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Simple test server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});