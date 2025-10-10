import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Network, Offer, MasterData } from "@/types/admin";
import { Banner } from "@/types/banner";
import NetworkForm from "@/components/admin/NetworkForm";
import OfferForm from "@/components/admin/OfferForm";
import { BannerForm } from "@/components/admin/BannerForm";
import { BannerList } from "@/components/admin/BannerList";
import { AffiliateDetails } from "@/components/admin/AffiliateDetails";
import NetworkList from "@/components/admin/NetworkList";
import OfferList from "@/components/admin/OfferList";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, Users, Clock, MousePointer, TrendingUp, Globe, Eye, Edit, Trash2, Plus } from 'lucide-react';
// -------------------------------
// ✅ Tracking API configuration
// -------------------------------

// Read from your .env file
const RAW_TRACKING = (import.meta as any).env?.VITE_TRACKING_API || "";

/**
 * Build tracking URLs safely.
 * Example:
 * buildTrackingUrl("api", "custom-offer-clicks")
 * -> "http://localhost:3001/api/custom-offer-clicks"
 */
export const buildTrackingUrl = (...parts: string[]) => {
  const base = RAW_TRACKING.replace(/\/$/, "");
  if (!base) return `/${parts.join("/")}`;
  return `${base}/${parts.join("/")}`;
};

// Optional: log for debugging
console.log("TRACKING_API base:", RAW_TRACKING);


const Admin = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null | undefined>(undefined);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [bannerClicks, setBannerClicks] = useState<any[]>([]);
  const [customBannerClicks, setCustomBannerClicks] = useState<any[]>([]);
  const [sectionIpStats, setSectionIpStats] = useState<any[]>([]);
  const [offerClicks, setOfferClicks] = useState<any[]>([]);
  const [customOfferClicks, setCustomOfferClicks] = useState<any[]>([]);
  useEffect(() => {
  console.log("🔔 [STATE] customOfferClicks changed:", customOfferClicks.length);
}, [customOfferClicks]);

  
  // handles: dev proxy (/api), or production full URL (https://...)
  const TRACKING_API =
    RAW_TRACKING && RAW_TRACKING !== "/api" ? RAW_TRACKING.replace(/\/$/, "") : "";

  // Multiple IP geolocation services for better accuracy
  const getCountryFromIP = async (ip: string): Promise<{country: string, country_name: string, city: string, region: string} | null> => {
    if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "localhost" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return null;
    }

    // Array of different IP geolocation services for fallback
    const services = [
      {
        url: `https://ipapi.co/${ip}/json/`,
        parser: (data: any) => ({
          country: data.country_code,
          country_name: data.country_name,
          city: data.city,
          region: data.region
        })
      },
      {
        url: `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city`,
        parser: (data: any) => ({
          country: data.countryCode,
          country_name: data.country,
          city: data.city,
          region: data.regionName
        })
      },
      {
        url: `https://ipwhois.app/json/${ip}`,
        parser: (data: any) => ({
          country: data.country_code,
          country_name: data.country,
          city: data.city,
          region: data.region
        })
      },
      {
        url: `https://ipinfo.io/${ip}/json`,
        parser: (data: any) => ({
          country: data.country,
          country_name: data.country,
          city: data.city,
          region: data.region
        })
      }
    ];

    for (const service of services) {
      try {
        console.log(`🌍 Trying service: ${service.url}`);
        const response = await fetch(service.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`📊 Service response:`, data);
          
          const parsed = service.parser(data);
          
          // Validate the response
          if (parsed.country && 
              parsed.country !== "Undefined" && 
              parsed.country !== "XX" && 
              parsed.country.length === 2 &&
              parsed.country !== "IN" // Skip if it's still showing India
             ) {
            console.log(`✅ Valid country found: ${parsed.country} (${parsed.country_name})`);
            return parsed;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Service ${service.url} failed:`, error);
        continue;
      }
    }

    return null;
  };

  // Enhanced custom clicks loader with better error handling  
  const loadSectionStats = async () => {
    try {
      console.log("📡 Fetching section stats from:", `${TRACKING_API}/api/section-ip-stats`);
      
      const res = await fetch(`${TRACKING_API}/api/section-ip-stats`, {
        method: "GET",
        headers: {
          "Accept": "application/json", 
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("📊 Raw section stats data:", data);

      const statsArray = Array.isArray(data) ? data : [];
      
      const sorted = statsArray.slice().sort((a: any, b: any) => {
        const aTime = Number(a?.max_time) || 0;
        const bTime = Number(b?.max_time) || 0;
        return bTime - aTime;
      });

      setSectionIpStats(sorted);
      console.log("✅ Section stats loaded and sorted:", sorted.length, "items");
      
    } catch (err) {
      console.error("❌ Failed to load section-ip-stats:", err);
      toast({
        title: "Warning", 
        description: "Failed to load section IP stats from tracking server",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadCustomData();
        loadCustomOfferData();
        loadSectionStats();
      }, 60000); // Increased to 1 minute to avoid rate limiting

      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) {
        loadData();
        loadCustomData();
        loadCustomOfferData();
        loadSectionStats();
      }
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadData();
        loadCustomData();
        loadCustomOfferData();
        loadSectionStats();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      // Load networks
      const { data: networksData, error: networksError } = await supabase
        .from("networks")
        .select("*")
        .order("priority_order", { ascending: false });
      if (networksError) throw networksError;
      setNetworks(networksData || []);

      // Load offers
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select("*")
        .order("priority_order", { ascending: false });
      if (offersError) throw offersError;
      setOffers(offersData || []);

      // Load banners
      const { data: bannersData, error: bannersError } = await supabase
        .from("banners")
        .select("*")
        .order("created_at", { ascending: false });
      if (bannersError) throw bannersError;

      const { data: rotationsData, error: rotationsError } = await supabase
        .from("banner_rotations")
        .select("*")
        .order("created_at", { ascending: false });
      if (rotationsError) throw rotationsError;

      const mergedBanners = [
        ...(bannersData || []),
        ...(rotationsData || []).map((r) => ({ ...r, is_rotation: true })),
      ];
      setBanners(mergedBanners);

      // Load master data
      const { data: masterDataRes, error: masterError } = await supabase
        .from("master_data")
        .select("*")
        .limit(1)
        .single();
      if (masterError) throw masterError;
      setMasterData({
        ...masterDataRes,
        geo_list: Array.isArray(masterDataRes.geo_list)
          ? (masterDataRes.geo_list as Array<{ code: string; name: string }>)
          : [],
      });

      // Load banner click logs
      const { data: bannerClicksData, error: bannerClickError } = await supabase
        .from("banner_clicks")
        .select("*")
        .order("clicked_at", { ascending: false });
      if (bannerClickError) throw bannerClickError;

      const { data: bannersRes, error: bannerError } = await supabase
        .from("banners")
        .select("id, image_url");
      if (bannerError) throw bannerError;

      const { data: bannerClickStats, error: bannerStatsError } = await supabase
        .from("banner_click_counts")
        .select("*")
        .order("click_count", { ascending: false });
      if (bannerStatsError) throw bannerStatsError;

      const mergedBannerClicks = bannerClickStats?.map((stat) => {
        const banner = bannersRes?.find((b) => b.id === stat.banner_id);
        const lastClick = bannerClicksData?.find((c) => c.banner_id === stat.banner_id);
        const cleanIp = (ip: string | null | undefined) =>
          ip ? ip.split(",")[0].trim() : "—";
        const firstClick = bannerClicksData
          ?.filter((c) => c.banner_id === stat.banner_id)
          .slice(-1)[0];

        return {
          banner_id: stat.banner_id,
          image_url: banner?.image_url,
          click_count: stat.click_count,
          country: lastClick?.country || "Unknown",
          ip_address: cleanIp(lastClick?.ip_address),
          clicked_at: lastClick?.clicked_at || null,
          first_country: firstClick?.country || "Unknown",
          first_ip: cleanIp(firstClick?.ip_address),
          first_clicked_at: firstClick?.clicked_at || null,
        };
      });

      setBannerClicks(mergedBannerClicks || []);

      // Load offer click logs
      const { data: offerClicksData, error: offerClickError } = await supabase
        .from("offer_clicks")
        .select("*")
        .order("clicked_at", { ascending: false });
      if (offerClickError) throw offerClickError;

      const { data: offerClickStats, error: offerStatsError } = await supabase
        .from("offer_click_counts")
        .select("*")
        .order("click_count", { ascending: false });
      if (offerStatsError) throw offerStatsError;

      const mergedOfferClicks = offerClickStats?.map((stat) => {
        const offer = offersData?.find((o) => o.id === stat.offer_id);
        const network = networksData?.find((n) => n.id === offer?.network_id);
        const lastClick = offerClicksData?.find((c) => c.offer_id === stat.offer_id);
        const cleanIp = (ip: string | null | undefined) =>
          ip ? ip.split(",")[0].trim() : "—";
        const firstClick = offerClicksData
          ?.filter((c) => c.offer_id === stat.offer_id)
          .slice(-1)[0];

        return {
          offer_id: stat.offer_id,
          offer_name: offer?.name,
          network_name: network?.name,
          click_count: stat.click_count,
          country: lastClick?.country || "Unknown",
          ip_address: cleanIp(lastClick?.ip_address),
          clicked_at: lastClick?.clicked_at || null,
          first_country: firstClick?.country || "Unknown",
          first_ip: cleanIp(firstClick?.ip_address),
          first_clicked_at: firstClick?.clicked_at || null,
        };
      });

      setOfferClicks(mergedOfferClicks || []);

      // Load requests
      const { data: rqData, error: rqError } = await supabase
        .from("network_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (rqError) throw rqError;
      setRequests(rqData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUser(data.user);
      loadData();
      loadCustomData();
      loadCustomOfferData();
      loadSectionStats();
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNetworks([]);
    setOffers([]);
    setBanners([]);
    setMasterData(null);
  };

  // Create a mapping of section -> IP with highest time spent
  const sectionTopIpMap = Object.fromEntries(
    (sectionIpStats || []).map((r: any) => [
      r.section || "unknown",
      { 
        ip: r.ip || "unknown", 
        formatted_time: r.formatted_time || "0s",
        max_time: r.max_time || 0
      }
    ])
  );

  // Helper function to format time spent display
  const formatTimeSpent = (minutes: number | null | undefined, seconds: number | null | undefined) => {
    const mins = Number(minutes) || 0;
    const secs = Number(seconds) || 0;
    
    if (mins > 0) {
      return `${mins}m`;
    }
    if (secs > 0) {
      return `${secs}s`;
    }
    return "0s";
  };

  // Helper function to get section IP info
  const getSectionIpInfo = (section: string) => {
    const info = sectionTopIpMap[section || "unknown"];
    if (!info) return "—";
    return `${info.ip} (${info.formatted_time})`;
  };

  // Helper function to get country flag emoji
  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode === "Unknown" || countryCode.length !== 2) return "🌍";
    
    const flags: {[key: string]: string} = {
      'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷', 'DE': '🇩🇪', 'IT': '🇮🇹', 'ES': '🇪🇸',
      'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳',
      'BR': '🇧🇷', 'MX': '🇲🇽', 'RU': '🇷🇺', 'TR': '🇹🇷', 'SA': '🇸🇦', 'AE': '🇦🇪',
      'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭', 'AT': '🇦🇹', 'SE': '🇸🇪', 'NO': '🇳🇴',
      'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'HU': '🇭🇺', 'GR': '🇬🇷',
      'PT': '🇵🇹', 'IE': '🇮🇪', 'IL': '🇮🇱', 'SG': '🇸🇬', 'TH': '🇹🇭', 'MY': '🇲🇾',
      'ID': '🇮🇩', 'PH': '🇵🇭', 'VN': '🇻🇳', 'BD': '🇧🇩', 'PK': '🇵🇰', 'LK': '🇱🇰',
      'ZA': '🇿🇦', 'NG': '🇳🇬', 'EG': '🇪🇬', 'MA': '🇲🇦', 'KE': '🇰🇪', 'GH': '🇬🇭',
      'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪', 'VE': '🇻🇪', 'UY': '🇺🇾'
    };
    
    return flags[countryCode.toUpperCase()] || '🌍';
  };

  // Enhanced custom clicks loader with multiple IP services
  const loadCustomData = async () => {
    try {
      console.log("📡 Fetching custom clicks from:", `${TRACKING_API}/api/custom-clicks`);
      
      const res = await fetch(`${TRACKING_API}/api/custom-clicks`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("📊 Raw custom clicks data:", data);

      const clicksArray = Array.isArray(data) ? data : [];
      
      // Enhanced IP detection with multiple services
      const enhancedClicks = await Promise.all(
        clicksArray.map(async (click) => {
          let enhancedClick = { ...click };
          
          // Always try to get fresh country data for better accuracy
          if (click.ip && click.ip !== "unknown") {
            console.log(`🔍 Processing IP: ${click.ip} (current country: ${click.country})`);
            
            const countryData = await getCountryFromIP(click.ip);
            if (countryData) {
              enhancedClick = {
                ...enhancedClick,
                ...countryData,
                original_country: click.country, // Keep original for comparison
              };
              console.log(`✅ Enhanced IP ${click.ip}: ${countryData.country} (${countryData.country_name})`);
            } else {
              console.log(`❌ Could not enhance IP ${click.ip}`);
            }
          }
          
          return enhancedClick;
        })
      );
      
      // Sort by time spent (minutes first, then seconds)
      const sorted = enhancedClicks.slice().sort((a: any, b: any) => {
        const aMinutes = Number(a?.time_spent_minutes) || 0;
        const bMinutes = Number(b?.time_spent_minutes) || 0;
        
        if (bMinutes !== aMinutes) {
          return bMinutes - aMinutes;
        }
        
        const aSeconds = Number(a?.time_spent_seconds) || 0;
        const bSeconds = Number(b?.time_spent_seconds) || 0;
        return bSeconds - aSeconds;
      });

      setCustomBannerClicks(sorted);
      console.log("✅ Custom clicks loaded and enhanced:", sorted.length, "items");
      
      // Show a summary of countries detected
      const countrySummary = sorted.reduce((acc, click) => {
        const country = click.country_name || click.country || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});
      console.log("🌍 Country distribution:", countrySummary);
      
    } catch (err) {
      console.error("❌ Failed to load custom clicks:", err);
      toast({
        title: "Warning",
        description: "Failed to load custom click data from tracking server",
        variant: "destructive",
      });
    }
  };

  // Load custom offer clicks
  const loadCustomOfferData = async () => {
    try {
      console.log("📡 Fetching custom offer clicks from:", `${TRACKING_API}/api/custom-offer-clicks`);
      
      const res = await fetch(`${TRACKING_API}/api/custom-offer-clicks`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("📊 Raw custom offer clicks data:", data);

      const clicksArray = Array.isArray(data) ? data : [];
      
      // Enhanced IP detection with multiple services
      const enhancedClicks = await Promise.all(
        clicksArray.map(async (click) => {
          let enhancedClick = { ...click };
          
          // Always try to get fresh country data for better accuracy
          if (click.ip && click.ip !== "unknown") {
            console.log(`🔍 Processing IP: ${click.ip} (current country: ${click.country})`);
            
            const countryData = await getCountryFromIP(click.ip);
            if (countryData) {
              enhancedClick = {
                ...enhancedClick,
                ...countryData,
                original_country: click.country, // Keep original for comparison
              };
              console.log(`✅ Enhanced IP ${click.ip}: ${countryData.country} (${countryData.country_name})`);
            } else {
              console.log(`❌ Could not enhance IP ${click.ip}`);
            }
          }
          
          return enhancedClick;
        })
      );

      setCustomOfferClicks(enhancedClicks);
      console.log("✅ Custom offer clicks loaded and enhanced:", enhancedClicks.length, "items");
      console.log("🧩 Sample custom offer clicks:", enhancedClicks.slice(0, 3));

      
    } catch (err) {
      console.error("❌ Failed to load custom offer clicks:", err);
      toast({
        title: "Warning",
        description: "Failed to load custom offer click data from tracking server",
        variant: "destructive",
      });
    }
  };

  // Group banners by section for placement layout
  const getBannerPlacements = () => {
    const placements: { [key: string]: Banner[] } = {};
    
    banners.forEach(banner => {
      const section = banner.section || 'Unknown';
      if (!placements[section]) {
        placements[section] = [];
      }
      placements[section].push(banner);
    });

    return placements;
  };

  // Get placement display name
  const getPlacementDisplayName = (section: string) => {
    const displayNames: { [key: string]: string } = {
      'sidebar-top': 'Sidebar Top',
      'sidebar-trending': 'Below Trending',
      'sidebar-networks': 'Below All Networks',
      'footer': 'Footer Banner',
      'top': 'Top Banner',
      'below-spinny': 'Below Spinny'
    };
    
    return displayNames[section] || section;
  };

  // Get active count for a placement
  const getActiveCount = (banners: Banner[]) => {
    return banners.filter(banner => banner.is_active).length;
  };

  // Get total rotations for a placement
  const getTotalRotations = (banners: Banner[]) => {
    return banners.length;
  };

  // Get first banner image for preview
  const getFirstBannerImage = (banners: Banner[]) => {
    const bannerWithImage = banners.find(banner => banner.image_url);
    return bannerWithImage?.image_url || null;
  };

  // Handle placement actions
  const handleEditPlacement = (section: string) => {
    // Navigate to banners tab with section filter
    const tabsList = document.querySelector('[data-state="active"]');
    const bannersTab = document.querySelector('[value="banners"]');
    if (bannersTab) {
      (bannersTab as HTMLElement).click();
    }
    // You might want to add section filtering logic here
    toast({
      title: "Edit Placement",
      description: `Editing ${getPlacementDisplayName(section)} placement`,
    });
  };

  const handleDeletePlacement = async (section: string) => {
    if (!confirm(`Are you sure you want to delete all banners in ${getPlacementDisplayName(section)}?`)) {
      return;
    }

    try {
      // Delete all banners in this section
      const { error } = await supabase
        .from("banners")
        .delete()
        .eq("section", section);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted all banners in ${getPlacementDisplayName(section)}`,
      });
      
      loadData();
    } catch (error) {
      console.error("Error deleting placement:", error);
      toast({
        title: "Error",
        description: "Failed to delete placement",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onSignIn={signIn} />;
  }

  const bannerPlacements = getBannerPlacements();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground text-center sm:text-left">
            Admin Dashboard
          </h1>
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
            <Badge variant="outline" className="text-xs sm:text-sm">
              {user.email}
            </Badge>
            <Button
              onClick={signOut}
              variant="outline"
              className="text-xs sm:text-sm px-3 py-1"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-8">
        <Tabs defaultValue="custom-offer-details" className="space-y-6">

          <TabsList className="flex flex-wrap gap-2 w-full justify-center sm:justify-start">
            <TabsTrigger value="networks">Networks</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="banner-placement-layout">Banner Placement Layout</TabsTrigger>
            <TabsTrigger value="network-requests">Network Requests</TabsTrigger>
            <TabsTrigger value="add-network">Add Network</TabsTrigger>
            <TabsTrigger value="add-offer">Add Offer</TabsTrigger>
            <TabsTrigger value="affiliate-details">Affiliate Details</TabsTrigger>
            <TabsTrigger value="banner-details">Banner Details</TabsTrigger>
            <TabsTrigger value="custom-banner-details">Custom Banner Details</TabsTrigger>
            <TabsTrigger value="offer-click-details">Offer Click Details</TabsTrigger>
            <TabsTrigger value="custom-offer-details">Custom Offer Details</TabsTrigger>
          </TabsList>

          {/* Banner Placement Layout */}
          <TabsContent value="banner-placement-layout">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Banner Placement Layout</span>
                  <Button onClick={() => setEditingBanner(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Banner
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 border text-left font-semibold">Placement</th>
                        <th className="p-3 border text-center font-semibold">Rotations</th>
                        <th className="p-3 border text-center font-semibold">Active</th>
                        <th className="p-3 border text-center font-semibold">Limit</th>
                        <th className="p-3 border text-center font-semibold">Preview</th>
                        <th className="p-3 border text-center font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(bannerPlacements).map(([section, sectionBanners]) => (
                        <tr key={section} className="border-b hover:bg-gray-50">
                          <td className="p-3 border font-medium">
                            {getPlacementDisplayName(section)}
                          </td>
                          <td className="p-3 border text-center">
                            {getTotalRotations(sectionBanners)}
                          </td>
                          <td className="p-3 border text-center">
                            {getActiveCount(sectionBanners) > 0 ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                ✅ {getActiveCount(sectionBanners)} Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                ⚠️ Inactive
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 border text-center">
                            {/* Assuming limit of 4 per section - you can make this dynamic */}
                            4
                          </td>
                          <td className="p-3 border text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const imageUrl = getFirstBannerImage(sectionBanners);
                                if (imageUrl) {
                                  window.open(imageUrl, "_blank");
                                } else {
                                  toast({
                                    title: "No Preview",
                                    description: "No banner image available for preview",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={!getFirstBannerImage(sectionBanners)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                          <td className="p-3 border text-center">
                            <div className="flex justify-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditPlacement(section)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeletePlacement(section)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {/* Example static rows for demonstration */}
                      {Object.keys(bannerPlacements).length === 0 && (
                        <>
                          <tr className="border-b hover:bg-gray-50">
                            <td className="p-3 border font-medium">Sidebar Top</td>
                            <td className="p-3 border text-center">4</td>
                            <td className="p-3 border text-center">
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                ✅ 4 Active
                              </Badge>
                            </td>
                            <td className="p-3 border text-center">4</td>
                            <td className="p-3 border text-center">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                            <td className="p-3 border text-center">
                              <div className="flex justify-center space-x-2">
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-800">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          <tr className="border-b hover:bg-gray-50">
                            <td className="p-3 border font-medium">Below Trending</td>
                            <td className="p-3 border text-center">3</td>
                            <td className="p-3 border text-center">
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                ⚠️ 2 Active
                              </Badge>
                            </td>
                            <td className="p-3 border text-center">4</td>
                            <td className="p-3 border text-center">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                            <td className="p-3 border text-center">
                              <div className="flex justify-center space-x-2">
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-800">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          <tr className="border-b hover:bg-gray-50">
                            <td className="p-3 border font-medium">Footer Banner</td>
                            <td className="p-3 border text-center">4</td>
                            <td className="p-3 border text-center">
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                ✅ 4 Active
                              </Badge>
                            </td>
                            <td className="p-3 border text-center">4</td>
                            <td className="p-3 border text-center">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                            <td className="p-3 border text-center">
                              <div className="flex justify-center space-x-2">
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-800">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banner Click Details */}
          <TabsContent value="banner-details">
            <Card>
              <CardHeader>
                <CardTitle>Banner Click Details</CardTitle>
              </CardHeader>
              <CardContent>
                {bannerClicks.length === 0 ? (
                  <p>No banner clicks found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border">Banner</th>
                          <th className="p-2 border">Latest Country</th>
                          <th className="p-2 border">Latest IP</th>
                          <th className="p-2 border">Latest Clicked Time</th>
                          <th className="p-2 border">Click Count</th>
                          <th className="p-2 border">First IP</th>
                          <th className="p-2 border">First Clicked At</th>
                          <th className="p-2 border">First Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bannerClicks.map((click) => (
                          <tr key={click.banner_id}>
                            <td className="p-2 border">
                              {click.image_url ? (
                                <img
                                  src={click.image_url}
                                  alt="banner"
                                  className="w-16 h-10 object-cover rounded"
                                />
                              ) : (
                                "No Image"
                              )}
                            </td>
                            <td className="p-2 border">{click.country}</td>
                            <td className="p-2 border">{click.ip_address}</td>
                            <td className="p-2 border">
                              {click.clicked_at
                                ? new Date(click.clicked_at).toLocaleString()
                                : "—"}
                            </td>
                            <td className="p-2 border">{click.click_count}</td>
                            <td className="p-2 border">{click.first_ip}</td>
                            <td className="p-2 border">
                              {click.first_clicked_at
                                ? new Date(click.first_clicked_at).toLocaleString()
                                : "—"}
                            </td>
                            <td className="p-2 border">{click.first_country}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rest of the existing tabs content remains the same */}
          {/* ... (other tabs content) ... */}

          <TabsContent value="networks">
            <NetworkList
              networks={networks}
              onUpdate={loadData}
              masterData={masterData}
            />
          </TabsContent>

          <TabsContent value="offers">
            <OfferList
              offers={offers}
              networks={networks}
              onUpdate={loadData}
              masterData={masterData}
            />
          </TabsContent>

          <TabsContent value="banners">
            <div className="space-y-6">
              {editingBanner !== undefined && (
                <BannerForm
                  onSuccess={() => {
                    loadData();
                    setEditingBanner(undefined);
                  }}
                  editingBanner={editingBanner || null}
                  onCancelEdit={() => setEditingBanner(undefined)}
                />
              )}
              <BannerList banners={banners} onRefresh={loadData} onEdit={setEditingBanner} />
            </div>
          </TabsContent>

          <TabsContent value="network-requests">
            <NetworkRequestList requests={requests} onApprove={loadData} onReject={loadData} />
          </TabsContent>

          <TabsContent value="add-network">
            <NetworkForm onSuccess={loadData} masterData={masterData} mode="create" />
          </TabsContent>

          <TabsContent value="add-offer">
            <OfferForm onSuccess={loadData} networks={networks} masterData={masterData} />
          </TabsContent>

          <TabsContent value="affiliate-details">
            <AffiliateDetails />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ... (rest of the existing code remains the same - NetworkRequestList and LoginForm components)

const NetworkRequestList = ({
  requests,
  onApprove,
  onReject,
}: {
  requests: any[];
  onApprove: () => void;
  onReject: () => void;
}) => {
  const { toast } = useToast();

  const handleApprove = async (req: any) => {
    const { error: insErr } = await supabase.from("networks").insert([
      {
        name: req.name,
        type: req.type,
        description: req.description,
        logo_url: req.logo_url,
        website_link: req.website_link,
        payment_frequency: req.payment_frequency,
        payment_methods: req.payment_methods,
        categories: req.categories,
        tags: req.tags,
        is_active: req.is_active,
        priority_order: req.priority_order,
        number_of_offers: req.number_of_offers,
        type_of_commission: req.type_of_commission,
        minimum_withdrawal: req.minimum_withdrawal,
        referral_commission: req.referral_commission,
        tracking_software: req.tracking_software,
        tracking_link: req.tracking_link,
        payment_constancy: req.payment_constancy,
        website_email: req.website_email,
        facebook_id: req.facebook_id,
        twitter_id: req.twitter_id,
        linkedin_id: req.linkedin_id,
        ceo: req.ceo,
        headquarter: req.headquarter,
        phone_number: req.phone_number,
        affiliate_manager: req.affiliate_manager,
        expiration_date: req.expiration_date,
      },
    ]);
    if (insErr) {
      toast({ title: "Error", description: insErr.message, variant: "destructive" });
      return;
    }

    await supabase
      .from("network_requests")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", req.id);

    toast({ title: "Approved", description: `${req.name} moved to Networks` });
    onApprove();
  };

  const handleReject = async (req: any) => {
    await supabase.from("network_requests").update({ status: "rejected" }).eq("id", req.id);

    toast({ title: "Rejected", description: `${req.name} has been rejected` });
    onReject();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 && <p>No requests found.</p>}
        {requests.map((req) => (
          <div key={req.id} className="border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">{req.name}</div>
              <Badge variant={req.status === "pending" ? "outline" : "default"}>
                {req.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Requested: {new Date(req.created_at).toLocaleString()}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleApprove(req)}
                disabled={req.status !== "pending"}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(req)}
                disabled={req.status !== "pending"}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const LoginForm = ({ onSignIn }: { onSignIn: (email: string, password: string) => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;