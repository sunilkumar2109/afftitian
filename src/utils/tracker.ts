import { supabase } from "@/integrations/supabase/client";

export interface ClickPayload {
  href: string;
  link_text?: string;
  landing_page?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  user_agent?: string;
  language?: string;
  screen_size?: string;
  visitor_id?: string;
  event_id?: string;
  timestamp?: string;
  extra?: any;
}

export async function trackClick(payload: ClickPayload) {
  try {
    const endpoint = `${import.meta.env.VITE_SUPABASE_FUNCTION_URL}/track-offer-click`;

    // Add fallback timestamp
    const fullPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    // Try using Beacon API for reliability
    const blob = new Blob([JSON.stringify(fullPayload)], { type: "application/json" });
    const sent = navigator.sendBeacon(endpoint, blob);

    if (!sent) {
      // fallback to fetch if beacon fails
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullPayload),
        keepalive: true,
      });
    }
  } catch (err) {
    console.error("trackClick exception", err);
  }
}