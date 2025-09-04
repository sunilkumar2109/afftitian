import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Load environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders(),
    });
  }

  try {
    const { banner_id, user_id } = await req.json();

    // ✅ Extract IP
    const rawIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "";
    const ip = rawIp.split(",")[0].trim() || "unknown";

    console.log("Detected IP:", ip);

    // ✅ Fetch country (fallback if IP is local/unknown)
    let country = "unknown";
    if (ip && ip !== "unknown" && ip !== "127.0.0.1") {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
        const geoData = await geoRes.json();
        country = geoData.country_name || "unknown";
      } catch (err) {
        console.error("Geo lookup failed:", err);
        country = "lookup_failed";
      }
    }

    console.log(`Country detected: ${country}`);

    // ✅ Insert click data into Supabase
    const { error: insertError } = await supabase.from("banner_clicks").insert({
      banner_id,
      user_id: user_id || null,
      ip_address: ip,
      country,
      clicked_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders(),
      status: 200,
    });
  } catch (e) {
    console.error("Error:", e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      headers: corsHeaders(),
      status: 500,
    });
  }
});

// ✅ Helper for CORS headers
function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
