// supabase/functions/send-reward-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Allowed origins — update with your dev and production domains.
 * Do NOT leave this empty in production. Add your real domain(s).
 */
const allowedOrigins = [
  "http://localhost:8080",
  "https://your-render-domain.onrender.com", // <- update this
];

/** Build CORS headers based on incoming origin (whitelist) */
function getCorsHeaders(origin: string | null) {
  const incoming = origin ?? "";
  const allowOrigin = allowedOrigins.includes(incoming)
    ? incoming
    : allowedOrigins[0]; // fallback to first allowed origin (dev)
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    // If you rely on cookies/auth, keep this true and also send credentials from client.
    // If you don't use credentials, you can remove this header.
    "Access-Control-Allow-Credentials": "true",
  };
}

/** Helper to return consistent JSON responses with CORS + Content-Type */
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

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Preflight: respond quickly with no body
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only accept POST for sending email
  if (req.method !== "POST") {
    return jsonResponse(
      { ok: false, error: "Method not allowed" },
      405,
      corsHeaders
    );
  }

  try {
    // parse body safely
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return jsonResponse(
        { ok: false, error: "Invalid JSON body" },
        400,
        corsHeaders
      );
    }

    const { first_name, last_name, email, prize } = body ?? {};

    // simple validation
    if (!email || typeof email !== "string") {
      return jsonResponse(
        { ok: false, error: "Missing or invalid 'email' field" },
        400,
        corsHeaders
      );
    }

    // prize can be an object: { name, value, description }
    const prizeName = prize?.name ?? prize ?? "a reward";

    // Ensure API key exists
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY env var");
      return jsonResponse(
        { ok: false, error: "Server config error: missing RESEND_API_KEY" },
        500,
        corsHeaders
      );
    }

    // build email HTML (customize as needed)
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.5;">
        <p>Hi ${first_name ?? ""} ${last_name ?? ""},</p>
        <p>🎉 You earned <strong>${prizeName}</strong>.</p>
        ${prize?.value ? `<p>Value: ${prize.value}</p>` : ""}
        ${prize?.description ? `<p>${prize.description}</p>` : ""}
        <p>Thanks — Your Team</p>
      </div>
    `;

    // call Resend (or replace with your mail provider)
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Your Team <no-reply@yourdomain.com>", // <- update domain
        to: [email],
        subject: `You earned: ${prizeName}`,
        html,
      }),
    });

    const resendText = await resendResp.text();

    if (!resendResp.ok) {
      console.error("Resend API returned error:", resendResp.status, resendText);
      return jsonResponse(
        { ok: false, error: "Email provider error", details: resendText },
        502,
        corsHeaders
      );
    }

    // success
    return jsonResponse({ ok: true, data: resendText }, 200, corsHeaders);
  } catch (err) {
    // Log crash details for debugging
    console.error("send-reward-email function crash:", err);
    return jsonResponse(
      { ok: false, error: "Internal server error", details: String(err) },
      500,
      corsHeaders
    );
  }
});
