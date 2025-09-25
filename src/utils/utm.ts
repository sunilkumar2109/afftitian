// src/utils/utm.ts
export function parseQueryString(qs: string) {
  try {
    if (!qs) return {};
    // remove leading ? or #
    const raw = qs[0] === "?" || qs[0] === "#" ? qs.slice(1) : qs;
    const params = new URLSearchParams(raw);
    const out: Record<string, string> = {};
    for (const [k, v] of params.entries()) {
      out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveUtmFromUrl() {
  if (typeof window === "undefined") return;

  // 1) read normal query string: ?utm_source=...
  const searchParams = parseQueryString(window.location.search);

  // 2) also parse hash in case UTM were appended after '#'
  // Example: https://site.com/#/?utm_source=...
  const hashParams = parseQueryString(window.location.hash.split("?")[1] ? "?" + window.location.hash.split("?")[1] : "");

  // merge (search takes precedence)
  const merged = { ...hashParams, ...searchParams };

  // only keep known utm keys and also capture any utm_* and utm_id
  const keys = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","utm_id"];
  const utm: Record<string,string> = {};
  Object.keys(merged).forEach(k => {
    if (k.startsWith("utm_") || keys.includes(k)) {
      utm[k] = merged[k];
    }
  });

  if (Object.keys(utm).length) {
    // store timestamp too (optional)
    const payload = { utm, ts: new Date().toISOString() };
    try {
      localStorage.setItem("utm", JSON.stringify(payload));
    } catch (e) {
      console.error("saveUtmFromUrl localStorage error", e);
    }
  }
}

export function readUtm(): { utm: Record<string,string>, ts?: string } {
  try {
    return JSON.parse(localStorage.getItem("utm") || '{"utm":{}}');
  } catch {
    return { utm: {} };
  }
}
