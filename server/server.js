import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();
const app = express();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

// --- Helpers ------------------------------------------------
const urlRegex = /(https?:\/\/[^\s,;]+)/ig;
const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/ig;
const phoneRegex = /(\+?\d[\d\-\s\(\)]{6,}\d)/g; // loose but practical
const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
const domainRegex = /([a-z0-9.-]+\.[a-z]{2,6}(?:\/\S*)?)/ig;

const initData = () => ({
  network_name: "",
  network_type: "",
  website_link: "",
  website_email: "",
  skype_id: "",
  telegram: "",
  payment_frequency: "",
  payment_methods: "",
  categories: "",
  number_of_offers: "",
  type_of_commission: "",
  minimum_withdrawal: "",
  tracking_software: "",
  phone_number: "",
  linkedin_id: "",
  teams: "",
  referral_commission: "",
  logo_url: "",
  description: "",
  expiration_date: "",
});

// Map a variety of label strings to canonical fields
function mapKeyToField(key) {
  const k = (key || "").toString().toLowerCase();
  if (/network.*name|affiliate.*network|^name$/.test(k)) return "network_name";
  if (/network.*type|type of network|^type$/.test(k)) return "network_type";
  if (/website|site|url|domain/.test(k)) return "website_link";
  if (/email|e-?mail|contact.*email/.test(k)) return "website_email";
  if (/skype/.test(k)) return "skype_id";
  if (/telegram/.test(k)) return "telegram";
  if (/payment.*frequency|payment.*constancy|payment constancy|payout.*frequency|frequency/.test(k)) return "payment_frequency";
  if (/payment.*methods?|methods|payments?/.test(k)) return "payment_methods";
  if (/categories|category|tags|verticals|tag(s)?/.test(k)) return "categories";
  if (/number.*offers|offers|offers count|offers:/i.test(k)) return "number_of_offers";
  if (/commission.*type|payout model|payout.*type|commission type|type of commission|payout model/.test(k)) return "type_of_commission";
  if (/minimum.*withdrawal|min(?:imum)? payout|min payout|min withdrawal/.test(k)) return "minimum_withdrawal";
  if (/tracking|tracker|tracking software|tracking platform/.test(k)) return "tracking_software";
  if (/phone|mobile|contact|telephone|tel/.test(k)) return "phone_number";
  if (/linkedin/.test(k)) return "linkedin_id";
  if (/team|teams|account manager|affiliate manager|manager/.test(k)) return "teams";
  if (/referral.*commission|referral/.test(k)) return "referral_commission";
  if (/logo.*url|logo url|logo/.test(k)) return "logo_url";
  if (/description|about|note|notes|details/.test(k)) return "description";
  if (/expiration|expire|expires|expiry date|valid until/.test(k)) return "expiration_date";
  return null;
}

// Split list-like strings into normalized comma-separated string
function normalizeListString(raw) {
  if (!raw) return "";
  // Replace slashes, pipes and semicolons with commas, keep commas
  const parts = raw
    .replace(/\s*[\/|;]\s*/g, ",")
    .split(/[,]+/)
    .map(s => s.trim())
    .filter(Boolean);
  // dedupe, preserve order
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      out.push(p);
    }
  }
  return out.join(", ");
}

function setIfEmpty(target, field, value) {
  if (value === undefined || value === null) return;
  if (typeof value === "string") value = value.trim();
  if (!value) return;
  if (!target[field] || target[field] === "") {
    target[field] = value;
  } else {
    // merge lists or frequencies
    if (field === "payment_methods" || field === "categories") {
      const merged = normalizeListString(target[field] + "," + value);
      target[field] = merged;
    } else if (field === "payment_frequency") {
      // combine unique freq words
      const a = (target[field] || "").split(",").map(s => s.trim()).filter(Boolean);
      const b = (value || "").split(",").map(s => s.trim()).filter(Boolean);
      const merged = Array.from(new Set([...a, ...b])).join(", ");
      target[field] = merged;
    } else {
      // keep the existing value (do not overwrite), but if values differ, prefer the non-empty longer one
      if ((value + "").length > (target[field] + "").length) {
        target[field] = value;
      }
    }
  }
}

// Extract key:value pairs from line using colon/dash variants
function splitKeyValue(line) {
  // common separators: :, -, —, –, —, →
  const m = line.match(/^(.+?)[\:\-\–\—\→]\s*(.+)$/);
  if (m) return [m[1].trim(), m[2].trim()];
  // fallback: maybe "Key Value" where Key ends with word and Value begins with capital or url
  const kv = line.match(/^([A-Za-z\s]{3,30})\s+(.+)$/);
  if (kv) {
    return [kv[1].trim(), kv[2].trim()];
  }
  return [null, null];
}

// scan whole text for pattern matches; returns first match group1 (or '' if none)
function findFirstMatchAll(text, regex) {
  const m = text.match(regex);
  return m ? m[1] || m[0] : "";
}

// --- Route ------------------------------------------------
app.post("/api/parse-network-text", async (req, res) => {
  try {
    const bodyText = req.body?.text ?? "";
    const useAiFallback = !!req.body?.useAiFallback; // optional (explicit)
    const debug = !!req.body?.debug; // optional flag to return debug info
    const raw = String(bodyText || "").replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
    if (!raw) return res.status(400).json({ error: "No text provided" });

    const data = initData();
    const debugInfo = { linesParsed: [], matches: {} };

    // 1) Line by line parsing
    const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/^[\u2022\-\*]\s*/, "").trim();
      const [key, value] = splitKeyValue(line);

      if (key && value) {
        const mapped = mapKeyToField(key);
        if (mapped) {
          // handle special normalization per field
          if (mapped === "website_link") {
            const urlMatch = value.match(urlRegex);
            setIfEmpty(data, "website_link", urlMatch ? urlMatch[0] : value);
          } else if (mapped === "website_email") {
            const emailMatch = value.match(emailRegex);
            setIfEmpty(data, "website_email", emailMatch ? emailMatch[0] : value);
          } else if (mapped === "phone_number") {
            const phoneMatch = value.match(phoneRegex);
            setIfEmpty(data, "phone_number", phoneMatch ? phoneMatch[0] : value);
          } else if (mapped === "number_of_offers") {
            const n = value.match(/\d+/);
            setIfEmpty(data, "number_of_offers", n ? n[0] : value);
          } else if (mapped === "expiration_date") {
            const d = value.match(dateRegex);
            setIfEmpty(data, "expiration_date", d ? d[0] : value);
          } else if (mapped === "payment_methods" || mapped === "categories") {
            setIfEmpty(data, mapped, normalizeListString(value));
          } else {
            setIfEmpty(data, mapped, value);
          }
          debugInfo.linesParsed.push({ lineIndex: i, key, value, mapped });
          debugInfo.matches[mapped] = debugInfo.matches[mapped] || [];
          debugInfo.matches[mapped].push(value);
          continue;
        }
      }

      // If no key:value mapping but the line contains url/email/phone, capture
      const urlFound = line.match(urlRegex);
      if (urlFound) setIfEmpty(data, "website_link", urlFound[0]);
      const emailFound = line.match(emailRegex);
      if (emailFound) setIfEmpty(data, "website_email", emailFound[0]);
      const phoneFound = line.match(phoneRegex);
      if (phoneFound) setIfEmpty(data, "phone_number", phoneFound[0]);

      // If line looks like a list of methods or categories without label, heuristics:
      if (/paypal|btc|usdt|bank|wire|skrill/i.test(line)) {
        setIfEmpty(data, "payment_methods", normalizeListString(line));
      }
      if (/insurance|finance|health|gaming|casino|sports|tech|education/i.test(line) && line.split(/\s+/).length <= 5) {
        // small heuristic: short line with category keywords
        setIfEmpty(data, "categories", normalizeListString(line));
      }
    }

    // 2) Whole-text scans for things that might not be on their own line
    // URLs (first as website, second as logo perhaps)
    const allUrls = Array.from(raw.matchAll(urlRegex)).map(m => m[0]);
    if (allUrls.length > 0) setIfEmpty(data, "website_link", allUrls[0]);
    if (!data.logo_url && allUrls.length > 1) setIfEmpty(data, "logo_url", allUrls[1]);

    // Emails
    const allEmails = Array.from(raw.matchAll(emailRegex)).map(m => m[0]);
    if (allEmails.length > 0) setIfEmpty(data, "website_email", allEmails[0]);

    // Phone
    const allPhones = Array.from(raw.matchAll(phoneRegex)).map(m => m[0]);
    if (allPhones.length > 0) setIfEmpty(data, "phone_number", allPhones[0]);

    // Dates: expiration
    const allDates = Array.from(raw.matchAll(dateRegex)).map(m => m[0]);
    if (allDates.length > 0 && !data.expiration_date) setIfEmpty(data, "expiration_date", allDates[0]);

    // Payment frequency: look for common words
    const freqMatch = raw.match(/\b(weekly|monthly|daily|quarterly|annually|yearly|bi-weekly|biweekly)\b/i);
    if (freqMatch) setIfEmpty(data, "payment_frequency", freqMatch[0]);

    // number of offers fallback
    if (!data.number_of_offers) {
      const offersMatch = raw.match(/offers[:\s]*([0-9]{1,6})/i) || raw.match(/(\d{1,6})\s+offers\b/i);
      if (offersMatch) setIfEmpty(data, "number_of_offers", offersMatch[1] || offersMatch[0]);
    }

    // If categories missing but tags present (Tags: ...) - catch 'Tags' pattern anywhere
    const tagsMatch = raw.match(/Tags?[:\-]?\s*([^\n\r]+)/i);
    if (tagsMatch) setIfEmpty(data, "categories", normalizeListString(tagsMatch[1]));

    // If payment constancy present (map to payment_frequency)
    const constMatch = raw.match(/Payment\s*(Constancy|Constancy:)[:\-\s]*([^\n\r]+)/i) || raw.match(/Payment Constancy[:\-\s]*([^\n\r]+)/i);
    if (constMatch) {
      const val = constMatch[2] || constMatch[1];
      setIfEmpty(data, "payment_frequency", val);
    }

    // 3) Build description: if explicit Description: line exists, use it; else, take long leftover lines not mapped
    if (!data.description) {
      // find Description: anywhere
      const descMatch = raw.match(/Description[:\-]?\s*([\s\S]+)/i);
      if (descMatch) {
        // take until end or next labeled field — but here we take the rest
        setIfEmpty(data, "description", descMatch[1].trim());
      } else {
        // fallback: find long line(s) that weren't matched — heuristics
        const longLines = lines.filter(l => l.length > 50 && !/^(website|payment|categories|tags|offers|number|expiry|expiration|email|contact)/i.test(l));
        if (longLines.length > 0) {
          setIfEmpty(data, "description", longLines.join(" "));
        }
      }
    }

    // 4) Final trimming
    Object.keys(data).forEach(k => {
      if (typeof data[k] === "string") data[k] = data[k].trim();
    });

    // 5) Count found fields
    const foundCount = Object.values(data).filter(v => v && v !== "").length;
    debugInfo.foundCount = foundCount;
    debugInfo.foundFields = Object.keys(data).filter(k => data[k]);

    // 6) Optional AI fallback if explicitly requested and still many empty fields
    if (useAiFallback && foundCount < Object.keys(data).length * 0.6 && process.env.OPENAI_API_KEY) {
      try {
        const prompt = `You are a JSON extractor. Given raw text, fill missing fields in this schema strictly as JSON (empty string if not found).
Schema keys: ${Object.keys(data).join(", ")}
Partial: ${JSON.stringify(data, null, 2)}
Raw:
"""${raw}"""
Return ONLY valid JSON.`;
        const response = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        });
        let content = response.choices[0].message?.content?.trim() || "{}";
        content = content.replace(/```json|```/g, "").trim();
        let ai = {};
        try {
          ai = JSON.parse(content);
        } catch (err) {
          console.warn("AI parse failed:", err);
        }
        // merge where empty
        Object.keys(data).forEach(k => {
          if ((!data[k] || data[k] === "") && ai[k]) data[k] = ai[k];
        });
        debugInfo.aiUsed = true;
        debugInfo.aiRaw = content;
      } catch (err) {
        debugInfo.aiError = String(err.message || err);
      }
    }

    // 7) Return result. If debug flag set, return debug info too.
    if (debug) {
      return res.json({ data, debug: debugInfo });
    }
    return res.json(data);

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "server_error", details: String(err.message || err) });
  }
});

app.listen(process.env.PORT || 5000, () => console.log("Server running"));
