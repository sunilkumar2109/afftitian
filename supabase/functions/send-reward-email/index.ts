// supabase/functions/track-offer-click/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getClientIP } from "https://deno.land/x/get_client_ip@v2.0.0/mod.ts";
import geoip from "https://esm.sh/geoip-lite";

/**
 * Allowed origins — update these with your actual domains.
 */
const allowedOrigins = [
  "http://localhost:8080",
  "https://your-render-domain.onrender.com", // ← update this
];

/** Build CORS headers based on origin */
function getCorsHeaders(origin: string | null) {
  const incoming = origin ?? "";
  const allowOrigin = allowedOrigins.includes(incoming)
    ? incoming
    : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, apikey, x-client-info",
    "Access-Control-Allow-Credentials": "true",
  };
}

/** Unified JSON response helper */
function jsonResponse(
  body: unknown,
  status = 200,
  corsHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    // Parse JSON body safely
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400, corsHeaders);
    }

    // Collect visitor details
    const ip = getClientIP(req) || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";
    const geo = geoip.lookup(ip);
    const country = geo?.country || "unknown";

    // Insert into Supabase
    const { error } = await supabase.from("offer_clicks").insert([
      {
        ...body,
        ip,
        user_agent: ua,
        country,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("DB insert error:", error);
      return jsonResponse({ ok: false, error: error.message }, 500, corsHeaders);
    }

    return jsonResponse({ ok: true, message: "Click tracked successfully" }, 200, corsHeaders);
  } catch (err) {
    console.error("track-offer-click crash:", err);
    return jsonResponse(
      { ok: false, error: "Internal server error", details: String(err) },
      500,
      corsHeaders
    );
  }
});
