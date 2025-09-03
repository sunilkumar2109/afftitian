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
  const [requests, setRequests] = useState<any[]>([]); // 🆕 network requests

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) loadData();
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadData();
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

      // 🆕 Load requests
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    } else {
      setUser(data.user);
      loadData();
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
            <Badge variant="outline" className="text-xs sm:text-sm">{user.email}</Badge>
            <Button onClick={signOut} variant="outline" className="text-xs sm:text-sm px-3 py-1">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-8">
        <Tabs defaultValue="networks" className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 w-full justify-center sm:justify-start">
            <TabsTrigger value="networks" className="text-xs sm:text-sm px-2 py-1">Networks</TabsTrigger>
            <TabsTrigger value="offers" className="text-xs sm:text-sm px-2 py-1">Offers</TabsTrigger>
            <TabsTrigger value="banners" className="text-xs sm:text-sm px-2 py-1">Banners</TabsTrigger>
            <TabsTrigger value="network-requests" className="text-xs sm:text-sm px-2 py-1">Network Requests</TabsTrigger>
            <TabsTrigger value="add-network" className="text-xs sm:text-sm px-2 py-1">Add Network</TabsTrigger>
            <TabsTrigger value="add-offer" className="text-xs sm:text-sm px-2 py-1">Add Offer</TabsTrigger>
            <TabsTrigger value="affiliate-details" className="text-xs sm:text-sm px-2 py-1">Affiliate Details</TabsTrigger>
          </TabsList>

          <TabsContent value="networks">
            <NetworkList networks={networks} onUpdate={loadData} masterData={masterData} />
          </TabsContent>

          <TabsContent value="offers">
            <OfferList offers={offers} networks={networks} onUpdate={loadData} masterData={masterData} />
          </TabsContent>

          <TabsContent value="banners">
            <div className="space-y-6">
              {editingBanner !== undefined && (
                <BannerForm 
                  onSuccess={() => { loadData(); setEditingBanner(undefined); }}
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
    // insert into networks
    const { error: insErr } = await supabase.from("networks").insert([{
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
    }]);
    if (insErr) {
      toast({ title: "Error", description: insErr.message, variant: "destructive" });
      return;
    }

    // update request status
    await supabase.from("network_requests")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", req.id);

    toast({ title: "Approved", description: `${req.name} moved to Networks` });
    onApprove();
  };

  const handleReject = async (req: any) => {
    await supabase.from("network_requests")
      .update({ status: "rejected" })
      .eq("id", req.id);

    toast({ title: "Rejected", description: `${req.name} has been rejected` });
    onReject();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests found.</p>}
        {requests.map((req) => (
          <div key={req.id} className="border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">{req.name}</div>
              <Badge variant={req.status === "pending" ? "outline" : "default"}>{req.status}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Requested: {new Date(req.created_at).toLocaleString()}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleApprove(req)} disabled={req.status !== "pending"}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleReject(req)} disabled={req.status !== "pending"}>
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
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
