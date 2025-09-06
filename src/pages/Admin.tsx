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
  
  const TRACKING_API = (import.meta as any).env?.VITE_TRACKING_API || "http://localhost:5000";

  // Enhanced custom clicks loader with better error handling
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

      // Ensure data is array and sort properly
      const clicksArray = Array.isArray(data) ? data : [];
      
      // Sort by time spent (minutes first, then seconds)
      const sorted = clicksArray.slice().sort((a: any, b: any) => {
        const aMinutes = Number(a?.time_spent_minutes) || 0;
        const bMinutes = Number(b?.time_spent_minutes) || 0;
        
        // First sort by minutes
        if (bMinutes !== aMinutes) {
          return bMinutes - aMinutes;
        }
        
        // If minutes are equal, sort by seconds
        const aSeconds = Number(a?.time_spent_seconds) || 0;
        const bSeconds = Number(b?.time_spent_seconds) || 0;
        return bSeconds - aSeconds;
      });

      setCustomBannerClicks(sorted);
      console.log("✅ Custom clicks loaded and sorted:", sorted.length, "items");
      
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

      // Ensure data is array and sort properly
      const statsArray = Array.isArray(data) ? data : [];
      
      // Sort by max_time in descending order (highest time first)
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
            <Card>
              <CardHeader>
                <CardTitle>Custom Banner Click Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tracking data from custom server (sorted by time spent - highest first)
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
                      <p className="text-sm text-muted-foreground">
                        Total Records: {customBannerClicks.length}
                      </p>
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
                            <th className="p-2 border text-left">Banner ID</th>
                            <th className="p-2 border text-left">Section</th>
                            <th className="p-2 border text-left">Browser</th>
                            <th className="p-2 border text-left">IP</th>
                            <th className="p-2 border text-left">Country</th>
                            <th className="p-2 border text-left">Time Spent</th>
                            <th className="p-2 border text-left">Clicked At</th>
                            <th className="p-2 border text-left">Section IP (Top Time)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customBannerClicks.map((click, index) => (
                            <tr 
                              key={click.id || index}
                              className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                            >
                              <td className="p-2 border font-mono text-xs">
                                {String(click.banner_id).substring(0, 8)}...
                              </td>
                              <td className="p-2 border">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                >
                                  {click.section || "unknown"}
                                </Badge>
                              </td>
                              <td className="p-2 border">{click.browser || "—"}</td>
                              <td className="p-2 border font-mono text-xs">
                                {click.ip || "unknown"}
                              </td>
                              <td className="p-2 border">
                                <Badge 
                                  variant={click.country === "Unknown" ? "secondary" : "default"}
                                  className="text-xs"
                                >
                                  {click.country || "Unknown"}
                                </Badge>
                              </td>
                              <td className="p-2 border">
                                <span className="font-semibold text-blue-600">
                                  {formatTimeSpent(click.time_spent_minutes, click.time_spent_seconds)}
                                </span>
                              </td>
                              <td className="p-2 border text-xs">
                                {click.clicked_at 
                                  ? new Date(click.clicked_at).toLocaleString()
                                  : "—"}
                              </td>
                              <td className="p-2 border text-xs">
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
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
                          <div key={`${stat.section}-${stat.ip}`} className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{stat.section}</Badge>
                              <span className="text-xs text-muted-foreground">#{index + 1}</span>
                            </div>
                            <div className="text-sm">
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