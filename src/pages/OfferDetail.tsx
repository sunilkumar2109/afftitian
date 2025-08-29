const handleNetworkClick = () => {
    if (offer?.networks?.id) {
      // Navigate to network details or show modal
      setShowNetworkDetails(true);
    }
  };import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bell, Settings, Sun, Moon, ExternalLink } from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import aftitansLogo from "@/assets/aftitans-logo.png";

// Define types for Offer and Network based on your schema
interface Offer {
  id: string;
  name: string;
  network_id: string;
  type: string;
  payout_amount: number;
  payout_currency: string;
  devices: string[] | null;
  vertical: string[] | string | null;
  geo_targets: string[] | null;
  tags: string[] | null;
  image_url: string;
  landing_page_url: string;
  is_active: boolean;
  is_featured: boolean;
  priority_order: number;
  networks?: {
    id: string;
    name: string;
    logo_url: string;
    type: string;
    description: string;
    website_link: string;
    payment_frequency: string;
    payment_methods: string[] | null;
    categories: string[] | null;
  };
}

const OfferDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNetworkDetails, setShowNetworkDetails] = useState(false);
  const [otherOffers, setOtherOffers] = useState<Offer[]>([]);
  const [loadingOtherOffers, setLoadingOtherOffers] = useState(false);
// Helper to clean strings like ["\"Health & Beauty\""]
const cleanText = (text: string): string => {
  if (!text) return "";
  return text.replace(/\\/g, "").replace(/"/g, "").replace(/[\[\]]/g, "").trim();
};

  // Banner offers data (keeping this for now)
  const bannerOffers = [
    {
      id: 1,
      title: "Summer Break",
      subtitle: "Reach level 50",
      payout: "$5.62",
      category: "GAME",
      gradient: "from-blue-500 to-purple-600",
      image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=80&h=80&fit=crop&crop=center"
    },
    {
      id: 2,
      title: "Ever Legion",
      subtitle: "Complete Act 3",
      payout: "$3.30",
      category: "GAME", 
      gradient: "from-red-500 to-orange-600",
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=80&h=80&fit=crop&crop=center"
    },
    {
      id: 3,
      title: "Colorwood Sort",
      subtitle: "Defeat Calamity",
      payout: "$6.02",
      category: "GAME",
      gradient: "from-green-500 to-teal-600",
      image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=80&h=80&fit=crop&crop=center"
    },
    {
      id: 4,
      title: "Smash Party",
      subtitle: "Unlock Inazuma",
      payout: "$11.59",
      category: "GAME",
      gradient: "from-purple-500 to-pink-600",
      image: "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=80&h=80&fit=crop&crop=center"
    },
    {
      id: 5,
      title: "Sea Block 1010",
      subtitle: "Clear Forgotten Hall",
      payout: "$3.02",
      category: "GAME",
      gradient: "from-cyan-500 to-blue-600",
      image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=80&h=80&fit=crop&crop=center"
    },
    {
      id: 6,
      title: "Multi Dice",
      subtitle: "Win 5 matches",
      payout: "$26.00",
      category: "GAME",
      gradient: "from-yellow-500 to-red-600",
      image: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=80&h=80&fit=crop&crop=center"
    },
    {
      id: 7,
      title: "Vegas Keno",
      subtitle: "Get 10 kills",
      payout: "$48.11",
      category: "GAME",
      gradient: "from-indigo-500 to-purple-600",
      image: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=80&h=80&fit=crop&crop=center"
    }
  ];

  // User profiles data for top banner
  const userProfiles = [
    { name: "abc", score: "0.48", status: "HOLLY" },
    { name: "ABC", score: "71", status: "AWET" },
    { name: "ABC", score: "473", status: "ABGATE" },
    { name: "ABC", score: "225", status: "ABGATE" },
    { name: "ABC", score: "262", status: "ABGATE" },
    { name: "ABC", score: "150", status: "ABGATE" }
  ];

  // Fetch offer details from Supabase
  useEffect(() => {
    const fetchOffer = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            networks (
              id,
              name,
              logo_url,
              type,
              description,
              website_link,
              payment_frequency,
              payment_methods,
              categories
            )
          `)
          .eq('id', id)
          .eq('is_active', true)
          .single();

        if (error) throw error;
        setOffer(data);

        // Fetch other offers from the same network
        if (data?.network_id) {
          fetchOtherOffers(data.network_id, id);
        }

      } catch (error: any) {
        console.error("Error fetching offer:", error.message);
        toast({
          title: "Error",
          description: "Failed to load offer details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [id, toast]);

  // Fetch other offers from the same network
  const fetchOtherOffers = async (networkId: string, currentOfferId: string) => {
    setLoadingOtherOffers(true);
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          networks (
            id,
            name,
            logo_url
          )
        `)
        .eq('network_id', networkId)
        .eq('is_active', true)
        .neq('id', currentOfferId)
        .order('priority_order', { ascending: false })
        .limit(10);

      if (error) throw error;
      setOtherOffers(data || []);

    } catch (error: any) {
      console.error("Error fetching other offers:", error.message);
    } finally {
      setLoadingOtherOffers(false);
    }
  };

  const handleNotification = () => {
    toast({
      title: "Notification",
      description: "You have 3 new offer updates!",
    });
  };
const handleGetTrackingLink = () => {
  if (offer?.landing_page_url) {
    // Build tracking URL
    const trackingUrl = `${offer.landing_page_url}?affiliate_id=USER_ID&offer_id=${offer.id}`;
    
    // Open in a new tab instead of copying
    window.open(trackingUrl, "_blank");
  }
};


  const handleNavigateToNetwork = () => {
    if (offer?.networks?.website_link) {
      window.open(offer.networks.website_link, '_blank');
    } else {
      toast({
        title: "Network Website",
        description: "Network website not available.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading offer details...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Offer not found.</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
<div className="min-h-screen bg-black text-white">
      {/* Header with Logo and Controls */}
      <div className="sticky top-0 z-50 bg-red-600 border-b border-red-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              {/* AfTitans Logo with Glass Effect */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-sm"></div>
                <div className="relative backdrop-blur-sm bg-white/10 dark:bg-gray-800/10 rounded-lg p-2 border border-white/20">
                  <img 
                    src={aftitansLogo} 
                    alt="AfTitans" 
                    className="h-8 opacity-90"
                  />
                </div>
              </div>

              {/* Network Button */}
              {offer.networks && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNetworkClick}
                  className="flex items-center space-x-2 hover:bg-primary/10"
                >
                  <img 
                    src={offer.networks.logo_url || `https://placehold.co/24x24/E0E0E0/ADADAD?text=${offer.networks.name.charAt(0)}`}
                    alt={offer.networks.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span>{offer.networks.name}</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Notification Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNotification}
                className="relative hover:bg-primary/10"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  3
                </span>
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:bg-primary/10"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* Settings */}
              <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>


      {/* Main Banner Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-200/50 dark:border-purple-700/50">
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-purple-700 dark:text-purple-300">Premium Offers</h3>
              <p className="text-sm text-purple-600 dark:text-purple-400">Exclusive high-paying campaigns</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-200/50 dark:border-blue-700/50">
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300">Gaming Hub</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">Latest gaming offers & rewards</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-200/50 dark:border-green-700/50">
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-green-700 dark:text-green-300">Top Earnings</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Maximize your revenue potential</p>
            </CardContent>
          </Card>
        </div>

        {/* Offer Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
           <Card className="bg-gray-900 border-gray-700 text-white">


              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Offer Image - Clickable */}
                    <img 
                      src="/favicon.ico"
                      alt={offer.name}
                      className="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={handleNavigateToNetwork}
                    />

                    <div>
                      {/* Offer Title - Clickable */}
                      <CardTitle 
                        className="text-2xl mb-2 cursor-pointer hover:text-primary transition-colors"
                        onClick={handleNavigateToNetwork}
                      >
                        {offer.name}
                      </CardTitle>
                      <p className="text-muted-foreground">{offer.networks?.name || "Unknown Network"}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="secondary">{offer.type}</Badge>
                        {offer.is_featured && <Badge variant="default">Featured</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {/* Payout Amount - Clickable */}
                    <div 
                      className="text-3xl font-bold text-primary cursor-pointer hover:text-primary/80 transition-colors"
                      onClick={handleNavigateToNetwork}
                    >
                      {offer.payout_currency} {offer.payout_amount?.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardHeader>
             <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-white">Offer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">Vertical:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
              {Array.isArray(offer.vertical)
                ? offer.vertical.map((v, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs text-white">
                      {cleanText(v)}
                    </Badge>
                  ))
                : offer.vertical ? (
                    <Badge variant="outline" className="text-xs text-white">
                      {cleanText(offer.vertical)}
                    </Badge>
                  ) : (
                    <span className="text-sm text-white">No vertical specified</span>
                  )}
            </div>
                
      </div>
      <div>
        <p className="text-sm font-medium text-white">Devices:</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {Array.isArray(offer.devices) && offer.devices.length > 0
            ? offer.devices.map((device, idx) => (
                <Badge key={idx} variant="outline" className="text-xs text-white">
                  {device}
                </Badge>
              ))
            : (
                <span className="text-sm text-white">No devices specified</span>
              )}
        </div>
      </div>
    </div>
  </div>

  <div>
    <h3 className="font-semibold mb-2 text-white">Available Countries</h3>
    <div className="flex flex-wrap gap-2">
      {Array.isArray(offer.geo_targets) && offer.geo_targets.length > 0
        ? offer.geo_targets.map((country, idx) => (
            <Badge key={idx} variant="outline" className="text-xs text-white">
              {country}
            </Badge>
          ))
        : (
            <span className="text-sm text-white">Worldwide</span>
          )}
    </div>
  </div>

  <div>
    <h3 className="font-semibold mb-2 text-white">Tags</h3>
    <div className="flex flex-wrap gap-2">
      {Array.isArray(offer.tags) && offer.tags.length > 0
        ? offer.tags.map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs text-white">
              #{tag}
            </Badge>
          ))
        : (
            <span className="text-sm text-white">No tags</span>
          )}
    </div>
  </div>

  {offer.landing_page_url && (
    <div>
      <h3 className="font-semibold mb-2 text-white">Landing Page</h3>
      <a 
        href={offer.landing_page_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-500 underline"
      >
        Visit Landing Page
      </a>
    </div>
  )}
</CardContent>
</Card>

            {/* Other Offers Section */}
            <Card className="bg-gray-900 border-gray-700 text-white">


              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Other Offers from {offer.networks?.name}</span>
                  <Badge variant="secondary">{otherOffers.length} offers</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOtherOffers ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading other offers...</p>
                  </div>
                ) : otherOffers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No other offers available from this network.</p>
                ) : (
                  <div className="space-y-3">
                    {otherOffers.map((otherOffer) => (
                      <div 
                        key={otherOffer.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/offer/${otherOffer.id}`)}
                      >
                        <div className="flex items-center space-x-3">
                          <img 
                            src="/favicon.ico"
                            alt={offer.name}
                            className="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={handleNavigateToNetwork}
                          />

                          <div>
                            <h4 className="font-medium text-sm">{otherOffer.name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">{otherOffer.type}</Badge>
                              {otherOffer.is_featured && <Badge variant="default" className="text-xs">Featured</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">
                            {otherOffer.payout_currency} {otherOffer.payout_amount?.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Array.isArray(otherOffer.geo_targets) && otherOffer.geo_targets.length > 0 
                              ? otherOffer.geo_targets.slice(0, 2).join(', ') 
                              : 'Worldwide'
                            }
                            
                            {Array.isArray(otherOffer.geo_targets) && otherOffer.geo_targets.length > 2 && ' +more'}
                            
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-700 text-white">


              <CardHeader>
                <CardTitle>Payout Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Payout:</span>
                  <span className="font-semibold">{offer.payout_currency} {offer.payout_amount?.toFixed(2)}</span>
                </div>
                {/* <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-semibold">{offer.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Priority:</span>
                  <span className="font-semibold">{offer.priority_order || 0}</span>
                </div> */}
              </CardContent>
            </Card>

            {offer.networks && (
              <Card className="bg-gray-900 border-gray-700 text-white">


                <CardHeader>
                  <CardTitle>Network Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={offer.networks.logo_url || `https://placehold.co/40x40/E0E0E0/ADADAD?text=${offer.networks.name.charAt(0)}`}
                      alt={offer.networks.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{offer.networks.name}</p>
                      <p className="text-sm text-muted-foreground">{offer.networks.type}</p>
                    </div>
                  </div>
                  {offer.networks.description && (
                    <p className="text-sm text-muted-foreground">{offer.networks.description}</p>
                  )}
                  <div className="text-sm">
                    <p><span className="font-medium">Payment:</span> {offer.networks.payment_frequency}</p>
                    {offer.networks.categories && Array.isArray(offer.networks.categories) && offer.networks.categories.length > 0 && (
                      <p><span className="font-medium">Categories:</span> {offer.networks.categories.join(', ')}</p>
                    )}
                  </div>
                  {offer.networks.website_link && (
                    <a 
                      href={offer.networks.website_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Visit Network Website
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleGetTrackingLink}
            >
              Get Tracking Link
            </Button>
          </div>
        </div>
      </div>

      {/* Network Details Modal */}
      {showNetworkDetails && offer.networks && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Network Details</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowNetworkDetails(false)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <img 
                  src={offer.networks.logo_url || `https://placehold.co/60x60/E0E0E0/ADADAD?text=${offer.networks.name.charAt(0)}`}
                  alt={offer.networks.name}
                  className="w-15 h-15 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-lg">{offer.networks.name}</h3>
                  <p className="text-sm text-muted-foreground">{offer.networks.type}</p>
                </div>
              </div>
              
              {offer.networks.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{offer.networks.description}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Payment Info</h4>
                <p className="text-sm">Frequency: {offer.networks.payment_frequency}</p>
                {offer.networks.payment_methods && Array.isArray(offer.networks.payment_methods) && offer.networks.payment_methods.length > 0 && (
                  <p className="text-sm">Methods: {offer.networks.payment_methods.join(', ')}</p>
                )}
              </div>

              {offer.networks.categories && Array.isArray(offer.networks.categories) && offer.networks.categories.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-1">
                    {offer.networks.categories.map((category, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {offer.networks.website_link && (
                <Button 
                  className="w-full" 
                  onClick={() => window.open(offer.networks?.website_link, '_blank')}
                >
                  Visit Network Website
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* User Profiles Banner */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {userProfiles.map((user, index) => (
            <Card key={index} className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 border-gray-700/50 text-white">
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xs font-bold">{user.name.charAt(0)}</span>
                </div>
                <h4 className="text-xs font-semibold mb-1">{user.name}</h4>
                <p className="text-lg font-bold text-green-400">{user.score}</p>
                <p className="text-xs text-gray-400">{user.status}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OfferDetail;