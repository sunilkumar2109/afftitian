

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import TopBar from "@/components/TopBar";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  section: string; // header, sidebar, footer
}

const AddNetworkPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      const { data, error } = await supabase.from("banners").select("*");
      if (error) {
        console.error("Error fetching banners:", error);
      } else {
        setBanners(data || []);
      }
    };
    fetchBanners();
  }, []);

  const topBanners = banners.filter((b) => b.section === "header");
  const sidebarBanners = banners.filter((b) => b.section === "sidebar");
  const footerBanners = banners.filter((b) => b.section === "footer");

  return (
    <div className="min-h-screen flex flex-col">
        <TopBar />
      {/* ====== TOP HEADER BANNERS ====== */}
      {topBanners.length > 0 && (
        <div className="w-full flex justify-center bg-gray-100 py-2">
          {topBanners.map((banner) => (
            <img
              key={banner.id}
              src={banner.image_url}
              alt={banner.title}
              className="max-h-20 object-contain"
            />
          ))}
        </div>
      )}

      {/* ====== MAIN CONTENT WITH SIDEBAR ====== */}
      <div className="flex flex-1 container mx-auto px-6 py-8 gap-6">
        {/* MAIN FORM */}
        <div className="flex-1 bg-white shadow rounded p-6">
          <h1 className="text-2xl font-bold mb-6">ADD YOUR NETWORK</h1>

          <form className="space-y-6">
            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input type="time" className="w-full border rounded px-3 py-2" />
              </div>
            </div>

            {/* Name, Email, Phone */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Your Full Name
              </label>
              <input type="text" className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="tel" className="w-full border rounded px-3 py-2" />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Address (Optional)
              </label>
              <input
                type="text"
                placeholder="Address Line 1"
                className="w-full border rounded px-3 py-2 mb-2"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <input
                  type="text"
                  placeholder="City"
                  className="w-full border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="State / Province / Region"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <select className="w-full border rounded px-3 py-2">
                <option>-- Select country --</option>
                <option>India</option>
                <option>USA</option>
                <option>UK</option>
                <option>Canada</option>
              </select>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="url"
                placeholder="https://example.com"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            {/* Ads Section */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Choose Best Ads (We will email you best advertisement Rates) *
              </label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="ads" value="header" /> Top Header
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="ads" value="footer" /> Footer
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="ads" value="sidebar" /> Sidebar
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="ads" value="sponsored_homepage" />{" "}
                  Sponsored Homepage
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="ads" value="sponsored_network" />{" "}
                  Sponsored Network
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="ads" value="sponsored_topoffers" />{" "}
                  Sponsored Top Offers
                </label>
              </div>
            </div>

            {/* Best Days */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Best Days to Meet
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {["Monday","Tuesday","Wednesday","Thursday","Friday"].map((day) => (
                  <label key={day} className="flex items-center gap-2">
                    <input type="checkbox" /> {day}
                  </label>
                ))}
              </div>
            </div>

            {/* Best Times */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Best Times to Meet
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {[
                  "Morning",
                  "Mid-morning",
                  "Afternoon",
                  "Mid-afternoon",
                  "Evening",
                ].map((time) => (
                  <label key={time} className="flex items-center gap-2">
                    <input type="checkbox" /> {time}
                  </label>
                ))}
              </div>
            </div>

            {/* Requirement */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Paste Here your Requirement (Optional)
              </label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={4}
              ></textarea>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700"
            >
              Submit
            </button>
          </form>
        </div>

        {/* ====== SIDEBAR BANNERS ====== */}
        <aside className="w-72 space-y-4">
          {sidebarBanners.map((banner) => (
            <img
              key={banner.id}
              src={banner.image_url}
              alt={banner.title}
              className="w-full object-contain"
            />
          ))}
        </aside>
      </div>

      {/* ====== FOOTER BANNERS ====== */}
      {footerBanners.length > 0 && (
        <div className="w-full flex justify-center bg-gray-100 py-4 mt-8">
          {footerBanners.map((banner) => (
            <img
              key={banner.id}
              src={banner.image_url}
              alt={banner.title}
              className="max-h-20 object-contain"
            />
          ))}
        </div>
      )}
      <Footer />
    </div>
  );
};

export default AddNetworkPage;
