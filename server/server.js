import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();
const app = express();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

app.post("/api/parse-network-text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const prompt = `
    Extract these fields into JSON: network_name, network_type, website_link, website_email, skype_id, telegram,
    payment_frequency, payment_methods, categories, number_of_offers, type_of_commission, minimum_withdrawal,
    tracking_software, phone_number, linkedin_id, teams, referral_commission, logo_url, description.
    Return ONLY JSON. Omit fields not found.
    Text: """${text}"""
    `;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const content = response.choices[0].message?.content?.trim() || "{}";
    const json = JSON.parse(content);
    res.json(json);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to parse text" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
