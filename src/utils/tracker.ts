// src/utils/tracker.ts
import { supabase } from "@/integrations/supabase/client"; // use your existing supabase client

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
  extra?: any;
}

export async function trackClick(payload: ClickPayload) {
  try {
    const row = {
      ...payload,
      created_at: new Date().toISOString()
    };
    // insert into Supabase
    const { error } = await supabase.from("link_clicks").insert([row]);
    if (error) console.error("trackClick error:", error);
  } catch (err) {
    console.error("trackClick exception", err);
  }
}
