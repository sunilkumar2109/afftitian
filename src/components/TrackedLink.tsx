import React from "react";
import { readUtm } from "@/utils/utm";
import { trackClick } from "@/utils/tracker";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: React.ReactNode;
};

export default function TrackedLink({ href = "#", children, ...props }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      const anchor = e.currentTarget;
      const utm = readUtm();

      const payload = {
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
        utm_content: utm.utm_content
      };

      // fire-and-forget: do not block navigation
      trackClick(payload).catch(() => {});
      // alternative: use navigator.sendBeacon or fetch(..., {keepalive:true}) if you want more reliability for navigation
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
