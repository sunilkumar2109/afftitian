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

  const TRACKING_API =
  (import.meta as any).env?.VITE_TRACKING_API || "http://localhost:5000";

  // ✅ Custom Clicks Loader
// ✅ Custom Clicks Loader
const loadCustomData = async () => {
  try {
    const res = await fetch(`${TRACKING_API}/api/custom-clicks`);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

    const data = await res.json(); // <- important

    const sorted = (data || []).slice().sort((a: any, b: any) =>
      (b?.time_spent_minutes ?? 0) - (a?.time_spent_minutes ?? 0)
    );

    setCustomBannerClicks(sorted);

    console.log("Custom clicks from server:", sorted); // debug
  } catch (err) {
    console.error("Failed to load custom clicks", err);
  }
};

const loadSectionStats = async () => {
  try {
    const res = await fetch(`${TRACKING_API}/api/section-ip-stats`);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    const data = await res.json();

    // server already sorts but do a safety sort here too
    const sorted = (data || []).slice().sort((a: any, b: any) => (b.max_time ?? 0) - (a.max_time ?? 0));
    setSectionIpStats(sorted);
  } catch (err) {
    console.error("Failed to load section-ip-stats", err);
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
        loadCustomData(); // ✅ also load custom clicks
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
        loadCustomData(); // ✅ reload when auth changes
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
// 🔽 Add this above the <h3> Custom Banner Click Details
const sectionTopIpMap = Object.fromEntries(
  (sectionIpStats || []).map((r: any) => [
    r.section || "unknown",
    `${r.ip} (${r.max_time}m)`
  ])
);

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
                          <th className="p-2 border">latest Country</th>
                          <th className="p-2 border">latest IP</th>
                          <th className="p-2 border">latest Clicked time</th>
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

          {/* Custom Banner Click Details */}
<TabsContent value="custom-banner-details">
  <Card>
    <CardHeader>
      <CardTitle>Custom Banner Click Details</CardTitle>
    </CardHeader>
    <CardContent>
      {customBannerClicks.length === 0 ? (
        <p>No custom clicks found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="p-2 border">Banner ID</th>
                <th className="p-2 border">Section</th>
                <th className="p-2 border">Browser</th>
                <th className="p-2 border">IP</th>
                <th className="p-2 border">Country</th>
                <th className="p-2 border">Time Spent (min)</th>
                <th className="p-2 border">Clicked At</th>
                <th className="p-2 border">Section IP (top time)</th>

              </tr>
            </thead>
            <tbody>
              {customBannerClicks.map((c) => (
                <tr key={c.id}>
                  <td className="p-2 border">{c.banner_id}</td>
                  <td className="p-2 border">{c.section || "—"}</td>
                  <td className="p-2 border">{c.browser || "—"}</td>
                  <td className="p-2 border">{c.ip}</td>
                  <td className="p-2 border">{c.country || "—"}</td>
                  <td className="p-2 border">
  { (c.time_spent_minutes ?? 0) > 0
    ? `${c.time_spent_minutes}m`
    : (c.time_spent_seconds ? `${c.time_spent_seconds}s` : "0") }
</td>

                  <td className="p-2 border">
                    {c.clicked_at
                      ? new Date(c.clicked_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-2 border">
  {sectionTopIpMap[c.section || "unknown"] || "—"}
</td>

                </tr>
              ))}
            </tbody>
          </table>
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
