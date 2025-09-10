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
import { RefreshCw, Users, Clock, MousePointer, TrendingUp, Globe } from 'lucide-react';

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
  
  // handles: dev proxy (/api), or production full URL (https://...)
  const RAW_TRACKING = (import.meta as any).env?.VITE_TRACKING_API;
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

  // Enhanced section stats loader with better error handling  
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
        .select(`*, networks!inner(name)`)
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
      const { data: clicks, error: clickError } = await supabase
        .from("banner_clicks")
        .select("*")
        .order("clicked_at", { ascending: false });
      if (clickError) throw clickError;

      const { data: bannersRes, error: bannerError } = await supabase
        .from("banners")
        .select("id, image_url");
      if (bannerError) throw bannerError;

      const { data: clickStats, error: statsError } = await supabase
        .from("banner_click_counts")
        .select("*")
        .order("click_count", { ascending: false });
      if (statsError) throw statsError;

      const merged = clickStats?.map((stat) => {
        const banner = bannersRes?.find((b) => b.id === stat.banner_id);
        const lastClick = clicks?.find((c) => c.banner_id === stat.banner_id);
        const cleanIp = (ip: string | null | undefined) =>
          ip ? ip.split(",")[0].trim() : "—";
        const firstClick = clicks
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

      setBannerClicks(merged || []);

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
        <Tabs defaultValue="networks" className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 w-full justify-center sm:justify-start">
            <TabsTrigger value="networks">Networks</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="network-requests">Network Requests</TabsTrigger>
            <TabsTrigger value="add-network">Add Network</TabsTrigger>
            <TabsTrigger value="add-offer">Add Offer</TabsTrigger>
            <TabsTrigger value="affiliate-details">Affiliate Details</TabsTrigger>
            <TabsTrigger value="banner-details">Banner Details</TabsTrigger>
            <TabsTrigger value="custom-banner-details">Custom Banner Details</TabsTrigger>
          </TabsList>

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

          {/* Enhanced Custom Banner Click Details */}
          <TabsContent value="custom-banner-details">
            <div className="space-y-6">
              {/* Header with Refresh Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Response Analytics</h2>
                  <p className="text-gray-600">Real-time banner click analytics with enhanced geolocation</p>
                </div>
                <Button
                  onClick={() => {
                    loadCustomData();
                    loadSectionStats();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Generate Insights
                </Button>
              </div>

              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Engagement Rate</p>
                        <p className="text-3xl font-bold text-green-700">
                          {((customBannerClicks.filter(c => (c.time_spent_minutes || 0) > 0 || (c.time_spent_seconds || 0) > 10).length / Math.max(customBannerClicks.length, 1)) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 bg-green-200 rounded-full">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Avg. Time</p>
                        <p className="text-3xl font-bold text-blue-700">
                          {(() => {
                            const totalTime = customBannerClicks.reduce((sum, click) => {
                              return sum + (click.time_spent_minutes || 0) * 60 + (click.time_spent_seconds || 0);
                            }, 0);
                            const avgSeconds = Math.round(totalTime / Math.max(customBannerClicks.length, 1));
                            const mins = Math.floor(avgSeconds / 60);
                            const secs = avgSeconds % 60;
                            return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                          })()}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-200 rounded-full">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Total Clicks</p>
                        <p className="text-3xl font-bold text-purple-700">
                          {customBannerClicks.length}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-200 rounded-full">
                        <MousePointer className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Countries</p>
                        <p className="text-3xl font-bold text-orange-700">
                          {new Set(customBannerClicks.map(c => c.country_name || c.country || 'Unknown')).size}
                        </p>
                      </div>
                      <div className="p-3 bg-orange-200 rounded-full">
                        <Globe className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Section Distribution Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      Response Distribution by Section
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={(() => {
                            const sectionCounts = customBannerClicks.reduce((acc, click) => {
                              const section = click.section || 'unknown';
                              acc[section] = (acc[section] || 0) + 1;
                              return acc;
                            }, {});
                            
                            return Object.entries(sectionCounts).map(([section, count]) => ({
                              name: section,
                              value: count,
                              percentage: ((count / customBannerClicks.length) * 100).toFixed(1)
                            }));
                          })()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={1000}
                        >
                          {(() => {
                            const sectionColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];
                            const sectionCounts = customBannerClicks.reduce((acc, click) => {
                              const section = click.section || 'unknown';
                              acc[section] = (acc[section] || 0) + 1;
                              return acc;
                            }, {});
                            
                            const sectionData = Object.entries(sectionCounts).map(([section, count]) => ({
                              name: section,
                              value: count,
                              percentage: ((count / customBannerClicks.length) * 100).toFixed(1)
                            }));

                            return sectionData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={sectionColors[index % sectionColors.length]}
                              />
                            ));
                          })()}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-semibold capitalize">{data.name}</p>
                                  <p className="text-blue-600">{`Clicks: ${data.value}`}</p>
                                  <p className="text-green-600">{`Percentage: ${data.percentage}%`}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value, entry) => (
                            <span style={{ color: entry.color }} className="capitalize">
                              {value} ({entry.payload.percentage}%)
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Country Distribution Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      Response Distribution by Country
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={(() => {
                            const countryCounts = customBannerClicks.reduce((acc, click) => {
                              const country = click.country_name || click.country || 'Unknown';
                              acc[country] = (acc[country] || 0) + 1;
                              return acc;
                            }, {});
                            
                            return Object.entries(countryCounts).map(([country, count]) => ({
                              name: country,
                              value: count,
                              percentage: ((count / customBannerClicks.length) * 100).toFixed(1)
                            }));
                          })()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={1000}
                        >
                          {(() => {
                            const countryColors = ['#2E8B57', '#FF7F50', '#4169E1', '#DC143C', '#FF8C00', '#9932CC', '#228B22', '#B22222', '#1E90FF', '#FF69B4'];
                            const countryCounts = customBannerClicks.reduce((acc, click) => {
                              const country = click.country_name || click.country || 'Unknown';
                              acc[country] = (acc[country] || 0) + 1;
                              return acc;
                            }, {});
                            
                            const countryData = Object.entries(countryCounts).map(([country, count]) => ({
                              name: country,
                              value: count,
                              percentage: ((count / customBannerClicks.length) * 100).toFixed(1)
                            }));

                            return countryData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={countryColors[index % countryColors.length]}
                              />
                            ));
                          })()}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-semibold">{data.name}</p>
                                  <p className="text-blue-600">{`Clicks: ${data.value}`}</p>
                                  <p className="text-green-600">{`Percentage: ${data.percentage}%`}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value, entry) => (
                            <span style={{ color: entry.color }}>
                              {value} ({entry.payload.percentage}%)
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Country Time Spent Bar Chart */}
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      Average Time by Country
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={(() => {
                          const countryTimeSpent = customBannerClicks.reduce((acc, click) => {
                            const country = click.country_name || click.country || 'Unknown';
                            const timeInSeconds = (click.time_spent_minutes || 0) * 60 + (click.time_spent_seconds || 0);
                            
                            if (!acc[country]) {
                              acc[country] = { totalTime: 0, count: 0 };
                            }
                            acc[country].totalTime += timeInSeconds;
                            acc[country].count += 1;
                            return acc;
                          }, {});

                          return Object.entries(countryTimeSpent)
                            .map(([country, data]) => ({
                              country,
                              avgTime: Math.round(data.totalTime / data.count),
                              totalTime: data.totalTime,
                              count: data.count,
                              avgTimeFormatted: (() => {
                                const avgSecs = Math.round(data.totalTime / data.count);
                                const mins = Math.floor(avgSecs / 60);
                                const secs = avgSecs % 60;
                                return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                              })()
                            }))
                            .sort((a, b) => b.avgTime - a.avgTime)
                            .slice(0, 8);
                        })()} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="country" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis 
                          label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft' }}
                          fontSize={12}
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-semibold">{label}</p>
                                  <p className="text-blue-600">{`Avg Time: ${data.avgTimeFormatted}`}</p>
                                  <p className="text-green-600">{`Total Clicks: ${data.count}`}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="avgTime" 
                          fill="url(#colorGradient)"
                          radius={[4, 4, 0, 0]}
                          animationDuration={1000}
                          animationBegin={200}
                        />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#764ba2" stopOpacity={0.3}/>
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Table with Better Country Display */}
              <Card>
                <CardHeader>
                  <CardTitle>Custom Banner Click Details</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Enhanced tracking with accurate geolocation data (sorted by time spent - highest first)
                  </p>
                </CardHeader>
                <CardContent>
                  {customBannerClicks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No custom clicks found.</p>
                      <p className="text-xs mt-2">
                        Make sure your tracking server is running at: {TRACKING_API}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-muted-foreground">
                            Total Records: {customBannerClicks.length}
                          </p>
                          <p className="text-sm text-blue-600">
                            Unique Countries: {new Set(customBannerClicks.map(c => c.country_name || c.country || 'Unknown')).size}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            loadCustomData();
                            loadSectionStats();
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Refresh Data
                        </Button>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr>
                              <th className="p-3 border text-left bg-gray-50">Banner ID</th>
                              <th className="p-3 border text-left bg-gray-50">Section</th>
                              <th className="p-3 border text-left bg-gray-50">Browser</th>
                              <th className="p-3 border text-left bg-gray-50">IP Address</th>
                              <th className="p-3 border text-left bg-gray-50">Country Info</th>
                              <th className="p-3 border text-left bg-gray-50">Time Spent</th>
                              <th className="p-3 border text-left bg-gray-50">Clicked At</th>
                              <th className="p-3 border text-left bg-gray-50">Section IP (Top Time)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customBannerClicks.map((click, index) => (
                              <tr 
                                key={click.id || index}
                                className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-25"}`}
                              >
                                <td className="p-3 border font-mono text-xs">
                                  {String(click.banner_id).substring(0, 8)}...
                                </td>
                                <td className="p-3 border">
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs capitalize"
                                  >
                                    {click.section || "unknown"}
                                  </Badge>
                                </td>
                                <td className="p-3 border">{click.browser || "—"}</td>
                                <td className="p-3 border font-mono text-xs">
                                  {click.ip || "unknown"}
                                </td>
                                <td className="p-3 border">
                                  <div className="flex flex-col space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">
                                        {getCountryFlag(click.country)}
                                      </span>
                                      <Badge 
                                        variant={!click.country || click.country === "Unknown" ? "secondary" : "default"}
                                        className="text-xs"
                                      >
                                        {click.country || "Unknown"}
                                      </Badge>
                                    </div>
                                    {click.country_name && (
                                      <span className="text-xs text-blue-600 font-medium">
                                        {click.country_name}
                                      </span>
                                    )}
                                    {click.city && (
                                      <span className="text-xs text-gray-600">
                                        {click.city}{click.region && `, ${click.region}`}
                                      </span>
                                    )}
                                    {click.original_country && click.original_country !== click.country && (
                                      <span className="text-xs text-orange-600">
                                        (was: {click.original_country})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 border">
                                  <span className="font-semibold text-blue-600">
                                    {formatTimeSpent(click.time_spent_minutes, click.time_spent_seconds)}
                                  </span>
                                </td>
                                <td className="p-3 border text-xs">
                                  {click.clicked_at 
                                    ? new Date(click.clicked_at).toLocaleString()
                                    : "—"}
                                </td>
                                <td className="p-3 border text-xs">
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                    {getSectionIpInfo(click.section)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Section IP Stats Summary */}
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Section IP Statistics (Top Time Spent)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sectionIpStats.slice(0, 9).map((stat, index) => (
                            <div 
                              key={`${stat.section}-${stat.ip}`} 
                              className="p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="capitalize">{stat.section}</Badge>
                                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <p className="font-mono text-xs text-blue-600">{stat.ip}</p>
                                <p className="font-semibold text-green-600">{stat.formatted_time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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