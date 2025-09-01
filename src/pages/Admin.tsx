import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null | undefined>(undefined);

  const [masterData, setMasterData] = useState<MasterData | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      
      if (user) {
        loadData();
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadData();
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

    // Load offers with network names
    const { data: offersData, error: offersError } = await supabase
      .from("offers")
      .select(`
        *,
        networks!inner(name)
      `)
      .order("priority_order", { ascending: false });

    if (offersError) throw offersError;
    setOffers(offersData || []);

    // ✅ Load banners
    const { data: bannersData, error: bannersError } = await supabase
      .from("banners")
      .select("*")
      .order("created_at", { ascending: false });

    if (bannersError) throw bannersError;

    // ✅ Load rotations
    const { data: rotationsData, error: rotationsError } = await supabase
      .from("banner_rotations")
      .select("*")
      .order("created_at", { ascending: false });

    if (rotationsError) throw rotationsError;

    // ✅ Merge banners + rotations into one list
    const mergedBanners = [
      ...(bannersData || []),
      ...(rotationsData || []).map((r) => ({
        ...r,
        is_rotation: true, // flag so BannerList can render differently if needed
      })),
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
    {/* ✅ Fixed TabsList */}
    <TabsList className="flex flex-wrap gap-2 w-full justify-center sm:justify-start">
      <TabsTrigger value="networks" className="text-xs sm:text-sm px-2 py-1">
        Networks
      </TabsTrigger>
      <TabsTrigger value="offers" className="text-xs sm:text-sm px-2 py-1">
        Offers
      </TabsTrigger>
      <TabsTrigger value="banners" className="text-xs sm:text-sm px-2 py-1">
        Banners
      </TabsTrigger>
      <TabsTrigger value="add-network" className="text-xs sm:text-sm px-2 py-1">
        Add Network
      </TabsTrigger>
      <TabsTrigger value="add-offer" className="text-xs sm:text-sm px-2 py-1">
        Add Offer
      </TabsTrigger>
      <TabsTrigger value="affiliate-details" className="text-xs sm:text-sm px-2 py-1">
        Affiliate Details
      </TabsTrigger>
    </TabsList>

    {/* Keep your TabsContent sections the same */}
    <TabsContent value="networks">
      <NetworkList 
        networks={networks} 
        onUpdate={loadData}
        masterData={masterData}
      />
    </TabsContent>

    <TabsContent value="affiliate-details">
      <AffiliateDetails />
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
        {(editingBanner !== undefined) && (
          <BannerForm 
            onSuccess={() => {
              loadData();
              setEditingBanner(undefined);
            }}
            editingBanner={editingBanner || null}
            onCancelEdit={() => setEditingBanner(undefined)}
          />
        )}
        <BannerList 
          banners={banners}
          onRefresh={loadData}
          onEdit={setEditingBanner}
        />
      </div>
    </TabsContent>

    <TabsContent value="add-network">
      <NetworkForm 
        onSuccess={loadData}
        masterData={masterData}
      />
    </TabsContent>

    <TabsContent value="add-offer">
      <OfferForm 
        onSuccess={loadData}
        networks={networks}
        masterData={masterData}
      />
    </TabsContent>
  </Tabs>
</div>


    </div>
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
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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