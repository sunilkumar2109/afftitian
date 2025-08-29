// src/pages/NetworkDetail.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle } from "lucide-react";
import OpenAI from "openai";

interface Feedback {
  id: string;
  user_name: string;
  comment: string;
  rating: number;
  created_at: string;
}

export default function NetworkDetail() {
  const { id } = useParams<{ id: string }>();
  const [network, setNetwork] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [aiDescription, setAIDescription] = useState<string>("Loading...");
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [savedName, setSavedName] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [savedWebsite, setSavedWebsite] = useState("");

  // 🔹 1. Fetch Network Details
  useEffect(() => {
    async function fetchNetwork() {
      const { data } = await supabase
        .from("networks")
        .select("*")
        .eq("id", id)
        .single();
      setNetwork(data);
    }
    fetchNetwork();
  }, [id]);

  // 🔹 2. Fetch Feedback History
  useEffect(() => {
    async function fetchFeedback() {
      const { data } = await supabase
        .from("feedback")
        .select("*")
        .eq("network_id", id);
      setFeedbacks(data || []);
    }
    fetchFeedback();
  }, [id]);

  // 🔹 3. Call OpenAI to Get AI Description
  useEffect(() => {
    if (!network?.name) return;

    async function fetchAI() {
      try {
        const client = new OpenAI({
          apiKey: import.meta.env.VITE_OPENAI_API_KEY,
          dangerouslyAllowBrowser: true,
        });

        const prompt = `Write a concise, professional affiliate network profile for ${network.name}. 
        Limit to 3-5 sentences and highlight main benefits.`;

        const response = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        });

        setAIDescription(response.choices[0].message.content || "No description available.");
      } catch (error) {
        console.error("AI Error:", error);
        setAIDescription("Failed to generate description.");
      }
    }

    fetchAI();
  }, [network]);

  // 🔹 4. Submit Feedback
  async function submitFeedback() {
    if (!name || !comment) return alert("Please fill all fields");
    await supabase
      .from("feedback")
      .insert([{ network_id: id, user_name: name, comment, rating }]);
    setName("");
    setComment("");
    setRating(5);
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .eq("network_id", id);
    setFeedbacks(data || []);
  }

  if (!network) return <div className="p-6 text-white">Loading network...</div>;

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      
      {/* 🔹 Network Header */}
      <Card className="p-6 mb-6 bg-gray-900 shadow-lg rounded-2xl text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <img
            src={network.logo_url}
            alt={network.name}
            className="w-24 h-24 rounded-xl border border-gray-700"
          />
          <div>
            <h1 className="text-3xl font-bold text-white">{network.name}</h1>
            <p className="text-white text-lg">{network.type}</p>
          </div>
        </div>
        <p className="mt-6 text-lg leading-relaxed text-white">{aiDescription}</p>
      </Card>

      {/* 🔹 Website Offers Section */}
      <Card className="p-6 mb-6 bg-gray-900 shadow-md rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">Website Offers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <span>Network Payout</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <span>Tracking System</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <span>Website Layout</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <span>Customer Support</span>
          </div>
        </div>
      </Card>

      {/* 🔹 Network Details */}
      <Card className="p-6 mb-6 bg-gray-900 shadow-md rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">Network Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white">
          <p><strong>Website:</strong> {network.website_link}</p>
          <p><strong>Payment Frequency:</strong> {network.payment_frequency}</p>
          <p><strong>Payment Methods:</strong> {network.payment_methods.join(", ")}</p>
          <p><strong>Categories:</strong> {network.categories.join(", ")}</p>
        </div>
      </Card>

      {/* 🔹 Total Score Section */}
      <Card className="p-6 mb-6 bg-gray-900 shadow-md rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">YOUR TOTAL SCORE</h2>
        <div className="space-y-4">
          <Input
            placeholder="Your Name"
            value={savedName}
            onChange={(e) => setSavedName(e.target.value)}
            className="text-black"
          />
          <Input
            placeholder="Your Email"
            value={savedEmail}
            onChange={(e) => setSavedEmail(e.target.value)}
            className="text-black"
          />
          <Input
            placeholder="Your Website"
            value={savedWebsite}
            onChange={(e) => setSavedWebsite(e.target.value)}
            className="text-black"
          />
          <p className="text-sm text-gray-400">
            Save my name, email, and website in this browser for the next time I comment.
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 w-full">
            Submit
          </Button>
        </div>
      </Card>

      {/* 🔹 Feedback Form */}
      <Card className="p-6 mb-6 bg-gray-900 shadow-md rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">Leave a Review</h2>
        <Input
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 text-black"
        />
        <Textarea
          placeholder="Your Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mb-3 text-black"
        />
        <div className="flex items-center gap-2 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              onClick={() => setRating(i + 1)}
              className={`w-7 h-7 cursor-pointer transition ${
                i < rating ? "text-yellow-400" : "text-gray-500"
              }`}
            />
          ))}
        </div>
        <Button onClick={submitFeedback} className="bg-blue-600 hover:bg-blue-700">
          Submit
        </Button>
      </Card>

      {/* 🔹 Feedback History */}
      <Card className="p-6 bg-gray-900 shadow-md rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">User Reviews</h2>
        {feedbacks.length === 0 ? (
          <p className="text-white">No feedback yet.</p>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-white"
              >
                <p className="font-semibold text-lg">
                  {fb.user_name} - {Array(fb.rating).fill("⭐").join("")}
                </p>
                <p className="text-white">{fb.comment}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}