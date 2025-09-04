import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { banner_id, user_id } = await req.json();

    // ✅ Step 1: Extract IP
    // Supabase adds "x-forwarded-for" header with visitor IP
    const rawIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "";
    const ip = rawIp.split(",")[0].trim() || "unknown";

    console.log("Detected IP:", ip);

    // ✅ Step 2: Lookup Country
    let country = "unknown";
    if (ip && ip !== "unknown" && ip !== "127.0.0.1") {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
        const geoData = await geoRes.json();
        country = geoData.country_name || "unknown";
      } catch {
        country = "lookup_failed";
      }
    }

    console.log(`Country detected: ${country}`);

    // ✅ Step 3: Insert click log
    const { error: insertError } = await supabase.from("banner_clicks").insert({
      banner_id,
      user_id: user_id || null,
      ip_address: ip,
      country,
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      status: 200,
    });
  } catch (e) {
    console.error("Error:", e.message);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        status: 500,
      }
    );
  }
});
