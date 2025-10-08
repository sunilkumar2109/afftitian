import React from "react";
import { readUtm } from "@/utils/utm";
import { trackClick } from "@/utils/tracker";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: React.ReactNode;
};

// small uuid generator for event id
function generateUUID() {
  // RFC4122 version 4 simple implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateVisitorId() {
  try {
    const name = "visitor_id";
    const existing = document.cookie.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="));
    if (existing) return existing.split("=")[1];
    const id = generateUUID();
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 2); // 2 years
    document.cookie = `${name}=${id}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    return id;
  } catch (err) {
    return undefined;
  }
}

export default function TrackedLink({ href = "#", children, ...props }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      const anchor = e.currentTarget;
      const utm = readUtm();

      // read modifier keys and mouse button for analytics
      const isModified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1;

      const payload = {
        event_id: generateUUID(),
        timestamp: new Date().toISOString(),
        href: anchor.href,
        link_text: anchor.textContent || "",
        landing_page: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        language: navigator.language,
        screen_size: `${window.screen.width}x${window.screen.height}`,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_term: utm.utm_term,
        utm_content: utm.utm_content,
        visitor_id: getOrCreateVisitorId(),
        is_modified_click: Boolean(isModified),
      } as const;

      // Non-blocking send: first try navigator.sendBeacon (good for page unload/navigation)
      const trackUrl = (process.env.REACT_APP_TRACK_URL || "/api/track");
      const json = JSON.stringify(payload);

      const didBeacon = (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function")
        ? navigator.sendBeacon(trackUrl, new Blob([json], { type: "application/json" }))
        : false;

      if (!didBeacon) {
        // fallback to trackClick util provided in your project (if available)
        // trackClick should handle a small POST and ideally use keepalive:true
        try {
          // prefer to call provided helper
          const maybePromise = (trackClick as any)(payload);
          if (maybePromise && typeof maybePromise.then === "function") {
            // fire-and-forget
            maybePromise.catch(() => {});
          }
        } catch (_) {
          // last fallback: fetch with keepalive (works for modern browsers)
          try {
            fetch(trackUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: json,
              keepalive: true,
            }).catch(() => {});
          } catch (err) {
            // if fetch isn't available or fails, ignore — do not block navigation
          }
        }
      }

      // Important: do not call e.preventDefault() here. We intentionally keep navigation fast.
      // If you are doing SPA routing and want to intercept navigation, handle that in the parent (router) code.

    } catch (err) {
      console.error("TrackedLink error:", err);
    }

    // forward any user-provided onClick handler
    if (typeof props.onClick === "function") {
      try { props.onClick?.(e as any); } catch (err) { console.error(err); }
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
