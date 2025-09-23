import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, Search, ChevronLeft, ChevronRight, ExternalLink, Star, Users, Clock, Target, ArrowLeft, MoreHorizontal, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import TopBar from "@/components/TopBar";

interface Network {
  id: string;
  name: string;
  type: string;
  description: string;
  logo_url: string;
  website_link: string;
  payment_frequency: string;
  payment_methods: string[];
  categories: string[];
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  priority_order: number;
  rating?: number;
  total_ratings?: number;
}

interface Offer {
  id: string;
  name: string;
  network_id: string;
  type: string;
  payout_amount: number | string;
  payout_currency: string;
  devices: string[] | string;
  vertical: string | string[] | any;
  geo_targets: string[] | string;
  tags: string[] | string;
  image_url: string;
  landing_page_url: string;
  is_active: boolean;
  is_featured: boolean;
  priority_order: number | string;
  created_at: string;
  networks?: {
    id: string;
    name: string;
    logo_url: string;
    rating?: number;
    total_ratings?: number;
  };
  click_count?: number;
  rating?: number;
  total_ratings?: number;
  conversion_rate?: number;
  epc?: number;
  last_updated?: string;
}

interface Banner {
  id: string;
  image_url: string;
  link_url?: string;
  link_urls?: string[];
  section: string[];
  created_at: string;
  title?: string;
  is_background?: boolean; 
}

interface BannerRotation {
  id: string;
  name?: string;
  banner_ids: string[];
  section: string;
  rotation_duration_ms?: number;
  expires_at?: string | null;
  created_at?: string;
}

// handles: dev proxy (/api), or production full URL (https://...)
const RAW_TRACKING = (import.meta as any).env?.VITE_TRACKING_API;
const TRACKING_API =
  RAW_TRACKING && RAW_TRACKING !== "/api" ? RAW_TRACKING.replace(/\/$/, "") : "";

// Enhanced logging function with better error handling
async function logCustomClick({
  banner,
  linkOpened,
  section,
}: {
  banner: Banner;
  linkOpened: string;
  section: string;
}) {
  try {
    const response = await fetch(`${TRACKING_API}/api/custom-click`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        banner_id: banner.id,
        banner_title: (banner as any).title || banner.id,
        section,
        link_url: linkOpened,
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Custom click logged successfully:", result);
    return result;
  } catch (err) {
    console.error("❌ Custom click log failed:", err);
  }
}

const logBannerClick = async (bannerId: string) => {
  console.log("Click detected for banner:", bannerId);

  try {
    const res = await fetch("https://booohlpwrvqtgvlngzrf.functions.supabase.co/log_click", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ banner_id: bannerId }),
    });

    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Response data:", data);
  } catch (err) {
    console.error("Failed to log banner click:", err);
  }
};

const useRotatingBanners = (banners: Banner[], intervalMs: number = 5000) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [banners.length, intervalMs]);

  return banners.length > 0 ? banners[currentIndex] : null;
};

const SUPABASE_BANNERS_BASE = "https://booohlpwrvqtgvlngzrf.supabase.co/storage/v1/object/public/images/banners/";

const BannerDisplay = ({
  banners,
  section,
  intervalMs = 5000,
}: {
  banners: Banner[];
  section: "top" | "footer" | "sidebar" | "fixed-top" | "fixed-bottom";
  intervalMs?: number;
}) => {
  const currentBanner = useRotatingBanners(banners, intervalMs);
  const [clickIndexMap, setClickIndexMap] = useState<Record<string, number>>({});

  if (!currentBanner) return null;

  let containerClass = "";
  let imageClass = "";

  switch (section) {
    case "fixed-top":
    case "header":
      containerClass = "w-full bg-black shadow-md";
      imageClass = "w-full h-16 object-cover";
      break;
    case "fixed-bottom":
      containerClass = "fixed bottom-0 left-0 right-0 z-50 bg-black shadow-md";
      imageClass = "w-full h-16 object-cover";
      break;
    case "sidebar":
      containerClass = "mb-4";
      imageClass = "w-full h-auto object-contain";
      break;
    case "top":
      containerClass = "my-3 flex justify-end pr-3";
      imageClass = "w-[800px] h-[80px] object-contain";
      break;
    case "footer":
      containerClass = "my-4";
      imageClass = "w-full h-16 object-cover";
      break;
  }

  const bannerSrc = currentBanner.image_url?.startsWith("http")
    ? currentBanner.image_url
    : SUPABASE_BANNERS_BASE + currentBanner.image_url?.trim();

  const handleBannerClick = async (banner: Banner, e: React.MouseEvent) => {
    e.stopPropagation();

    // Handle multiple link URLs properly
    const links = (banner as any).link_urls || 
                 (banner.link_url ? [banner.link_url] : []);
    
    if (!links || links.length === 0) {
      console.warn("No links found for banner:", banner.id);
      return;
    }

    const currentIndex = clickIndexMap[banner.id] || 0;
    const linkToOpen = links[currentIndex % links.length];

    console.log(`Opening link ${currentIndex + 1}/${links.length}: ${linkToOpen}`);

    // Log to custom tracking system
    await logCustomClick({ banner, linkOpened: linkToOpen, section });

    // Open the link in the same tab like AffPlus
    window.location.href = linkToOpen;

    // Log to Supabase (existing system)
    await logBannerClick(banner.id);

    // Update click index for next click
    setClickIndexMap(prev => ({
      ...prev,
      [banner.id]: (currentIndex + 1) % links.length,
    }));
  };

  return (
    <div className={containerClass}>
      <div
        className="block w-full cursor-pointer"
        onClick={(e) => handleBannerClick(currentBanner, e)}
      >
        <img
          src={bannerSrc}
          alt={`${section} banner`}
          className={`${imageClass} rounded-md`}
          onError={(e) => {
            console.error("Banner failed to load:", bannerSrc);
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
    </div>
  );
};

const SidebarBannerDisplay = ({ banners }: { banners: Banner[] }) => {
  const [clickIndexMap, setClickIndexMap] = useState<Record<string, number>>({});

  const handleBannerClick = async (banner: Banner, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const links = (banner as any).link_urls || 
                 (banner.link_url ? [banner.link_url] : []);
    
    if (!links || links.length === 0) return;

    const currentIndex = clickIndexMap[banner.id] || 0;
    const linkToOpen = links[currentIndex % links.length];

    await logCustomClick({ banner, linkOpened: linkToOpen, section: "sidebar" });

    // Open in same tab like AffPlus
    window.location.href = linkToOpen;
    await logBannerClick(banner.id);

    setClickIndexMap((prev) => ({
      ...prev,
      [banner.id]: (currentIndex + 1) % links.length,
    }));
  };

  return (
    <div className="space-y-3">
      {banners.map((banner) => {
        const bannerSrc = banner.image_url?.startsWith("http")
          ? banner.image_url
          : SUPABASE_BANNERS_BASE + banner.image_url?.trim();

        return (
          <div
            key={banner.id}
            className="block w-full cursor-pointer"
            onClick={(e) => handleBannerClick(banner, e)}
          >
            <img
              src={bannerSrc}
              alt="Sidebar banner"
              className="w-full h-[300px] object-contain rounded-md"
              onError={(e) => {
                console.error("Sidebar banner failed to load:", bannerSrc);
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

// Star Rating Component
const StarRating = ({ rating, totalRatings, size = 12 }: { rating: number; totalRatings?: number; size?: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`${i < fullStars ? "fill-yellow-400 text-yellow-400" : hasHalfStar && i === fullStars ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`}
            size={size}
          />
        ))}
      </div>
      <span className="text-xs text-gray-300">{rating.toFixed(1)}</span>
      {totalRatings && (
        <span className="text-xs text-gray-400">({totalRatings})</span>
      )}
    </div>
  );
};

// Join Button Component similar to AffPlus - Opens in same tab
const JoinButton = ({ 
  offer, 
  network, 
  variant = "default" 
}: { 
  offer: Offer; 
  network?: Network; 
  variant?: "default" | "compact" | "icon"; 
}) => {
  const { toast } = useToast();
  
  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if landing_page_url exists and is valid
    if (offer.landing_page_url && 
        offer.landing_page_url.trim() !== "" && 
        offer.landing_page_url !== "null" && 
        offer.landing_page_url !== "undefined" &&
        offer.landing_page_url !== "##" &&
        (offer.landing_page_url.startsWith("http://") || offer.landing_page_url.startsWith("https://"))) {
      
      // Open in same tab like AffPlus
      window.location.href = offer.landing_page_url;
      
      // Log the join action
      console.log(`User joined offer: ${offer.name}`, offer.landing_page_url);
    } else {
      // If no valid landing page, try network website
      if (network?.website_link && 
          network.website_link.trim() !== "" && 
          network.website_link !== "null" && 
          network.website_link !== "undefined" &&
          network.website_link !== "##" &&
          (network.website_link.startsWith("http://") || network.website_link.startsWith("https://"))) {
        
        window.location.href = network.website_link;
        console.log(`User redirected to network website: ${network.name}`, network.website_link);
      } else {
        // If neither is available, show error
        toast({
          title: "No Landing Page Available",
          description: "This offer does not have a valid landing page configured. Please contact the network for more information.",
          variant: "destructive",
        });
        console.warn("No valid landing page or website link found for offer:", offer.name);
      }
    }
  };

  if (variant === "compact") {
    return (
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-0 h-6 font-medium"
        onClick={handleJoinClick}
      >
        Join
      </Button>
    );
  }

  if (variant === "icon") {
    return (
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white p-1 h-7 w-7"
        onClick={handleJoinClick}
        title="Join Offer"
      >
        <ArrowUpRight className="w-3 h-3" />
      </Button>
    );
  }

  return (
    <Button
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 h-8 rounded-md text-sm"
      onClick={handleJoinClick}
    >
      Join Offer
    </Button>
  );
};

// Network Page Component
const NetworkPage = ({ 
  network, 
  offers, 
  onBack 
}: { 
  network: Network; 
  offers: Offer[]; 
  onBack: () => void;
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<string>("relevance-desc");

  const networkOffers = offers.filter(offer => offer.network_id === network.id);

  // Sort offers based on selected option
  const getSortedOffers = () => {
    const offersToSort = [...networkOffers];
    
    switch (sortBy) {
      case "relevance-desc":
        return offersToSort.sort((a, b) => {
          // Relevance: featured first, then active, then by priority
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          if (a.is_active && !b.is_active) return -1;
          if (!a.is_active && b.is_active) return 1;
          
          const aPriority = typeof a.priority_order === 'number' ? a.priority_order : 0;
          const bPriority = typeof b.priority_order === 'number' ? b.priority_order : 0;
          return bPriority - aPriority;
        });
      
      case "time-desc":
        return offersToSort.sort((a, b) => {
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bDate - aDate;
        });
      
      case "price-asc":
        return offersToSort.sort((a, b) => {
          const aAmount = typeof a.payout_amount === 'number' ? a.payout_amount : parseFloat(String(a.payout_amount)) || 0;
          const bAmount = typeof b.payout_amount === 'number' ? b.payout_amount : parseFloat(String(b.payout_amount)) || 0;
          return aAmount - bAmount;
        });
      
      case "price-desc":
        return offersToSort.sort((a, b) => {
          const aAmount = typeof a.payout_amount === 'number' ? a.payout_amount : parseFloat(String(a.payout_amount)) || 0;
          const bAmount = typeof b.payout_amount === 'number' ? b.payout_amount : parseFloat(String(b.payout_amount)) || 0;
          return bAmount - aAmount;
        });
      
      default:
        return offersToSort;
    }
  };

  const sortedOffers = getSortedOffers();

  const handleOfferClick = (offerId: string) => {
    navigate(`/offer/${offerId}`);
  };

  const handleJoinClick = (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if landing_page_url exists and is valid
    if (offer.landing_page_url && 
        offer.landing_page_url.trim() !== "" && 
        offer.landing_page_url !== "null" && 
        offer.landing_page_url !== "undefined" &&
        offer.landing_page_url !== "##" &&
        (offer.landing_page_url.startsWith("http://") || offer.landing_page_url.startsWith("https://"))) {
      
      // Open in same tab like AffPlus
      window.location.href = offer.landing_page_url;
    } else {
      // If no valid landing page, try network website
      if (network.website_link && 
          network.website_link.trim() !== "" && 
          network.website_link !== "null" && 
          network.website_link !== "undefined" &&
          network.website_link !== "##" &&
          (network.website_link.startsWith("http://") || network.website_link.startsWith("https://"))) {
        
        window.location.href = network.website_link;
      } else {
        toast({
          title: "No Landing Page Available",
          description: "This offer does not have a valid landing page configured. Please contact the network for more information.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen text-white bg-cover bg-center">
      {/* Back Button */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex items-center gap-2 bg-gray-800 text-white border-gray-700 hover:bg-gray-700 h-8 text-sm"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to All Networks
        </Button>
      </div>

      {/* Network Header */}
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <img
              src={network.logo_url || `https://placehold.co/80x80/333333/666666?text=${network.name.charAt(0)}`}
              alt={network.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{network.name}</h1>
                {network.rating && (
                  <StarRating rating={network.rating} totalRatings={network.total_ratings} size={16} />
                )}
              </div>
              
              <p className="text-gray-300 mb-3 text-sm">{network.description || "No description available."}</p>
              
              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                {network.payment_frequency && (
                  <div>
                    <span className="font-medium text-white">Payment:</span> {network.payment_frequency}
                  </div>
                )}
                {network.payment_methods && network.payment_methods.length > 0 && (
                  <div>
                    <span className="font-medium text-white">Methods:</span> {network.payment_methods.join(", ")}
                  </div>
                )}
                {network.categories && network.categories.length > 0 && (
                  <div>
                    <span className="font-medium text-white">Categories:</span> {network.categories.join(", ")}
                  </div>
                )}
              </div>
            </div>
            
            {network.website_link && (
              <Button
                onClick={() => window.location.href = network.website_link}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-sm"
              >
                Visit Website
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Network Offers */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Offers from {network.name} ({sortedOffers.length})
          </h2>
          
          {/* Sorting Dropdown */}
          <div className="relative group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="relevance-desc">Relevance desc</option>
              <option value="time-desc">Time desc</option>
              <option value="price-asc">Price asc</option>
              <option value="price-desc">Price desc</option>
            </select>
          </div>
        </div>

        {sortedOffers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No offers available for this network.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedOffers.map((offer) => (
              <Card
                key={offer.id}
                className={`p-3 w-full hover:shadow-md transition-shadow border-gray-800 cursor-pointer ${
                  offer.is_active ? "bg-gray-900 hover:bg-gray-850" : "bg-gray-800"
                }`}

                onClick={() => handleOfferClick(offer.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left Side - Offer Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {offer.image_url && (
                      <img
                        src={offer.image_url}
                        alt={offer.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white text-base truncate">
                          {offer.name}
                        </h3>
                        {!offer.is_active && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-gray-700 text-white px-1 py-0 h-4"
                          >
                            Inactive
                          </Badge>
                        )}
                        {offer.is_featured && (
                          <Badge
                            variant="default"
                            className="text-xs bg-yellow-600 text-white px-1 py-0 h-4"
                          >
                            Featured
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {/* Geo Targets - Show up to 3 */}
                        {offer.geo_targets && Array.isArray(offer.geo_targets) && offer.geo_targets.slice(0, 3).map((geo, idx) => (
                          <Badge
                            key={`geo-${idx}`}
                            variant="outline"
                            className="text-xs px-1 py-0 h-4 border-gray-600 text-gray-300 bg-gray-600/10"
                          >
                            {geo}
                          </Badge>
                        ))}
                        
                        {/* Vertical Tags - Show up to 2 after geo tags */}
                        {offer.vertical && Array.isArray(offer.vertical) && offer.vertical.slice(0, 2).map((vertical, idx) => (
                          <Badge
                            key={`vertical-${idx}`}
                            variant="outline"
                            className="text-xs px-1 py-0 h-4 border-green-600 text-green-300 bg-green-600/10"
                          >
                            {vertical}
                          </Badge>
                        ))}
                        
                        {offer.type && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1 py-0 h-4 border-blue-600 text-blue-300 bg-blue-600/10"
                          >
                            {offer.type}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {offer.conversion_rate && (
                          <div className="flex items-center gap-1">
                            <Target size={10} />
                            <span>{offer.conversion_rate.toFixed(1)}% CR</span>
                          </div>
                        )}

                        {offer.last_updated && (
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>Updated {new Date(offer.last_updated).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Payout and Action Buttons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">
                        {offer.payout_currency || "USD"} {typeof offer.payout_amount === "number"
                          ? offer.payout_amount.toFixed(2)
                          : offer.payout_amount}
                      </div>
                      
                      {offer.epc && (
                        <div className="text-xs text-blue-400 mt-1">
                          EPC: ${offer.epc.toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 p-1 h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOfferClick(offer.id);
                        }}
                        title="Details"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white p-1 h-7 w-7"
                        onClick={(e) => handleJoinClick(offer, e)}
                        title="Join Offer"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Browse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Add missing clickIndexMap state for main component
  const [clickIndexMap, setClickIndexMap] = useState<Record<string, number>>({});
  
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState<string | null>(null);
  const [selectedGeo, setSelectedGeo] = useState<string | null>(null);
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [selectedOfferCategory, setSelectedOfferCategory] = useState<string>("🔥 Top Offers");
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("payout");
  const [viewMode, setViewMode] = useState<"browse" | "network">("browse");
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [allNetworks, setAllNetworks] = useState<Network[]>([]);
  const [offersCountByNetwork, setOffersCountByNetwork] = useState<Record<string, number>>({});
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingNetworks, setLoadingNetworks] = useState(true);
  const [allBanners, setAllBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [allRotations, setAllRotations] = useState<BannerRotation[]>([]);
  const [loadingRotations, setLoadingRotations] = useState(true);
  const [networkSearchTerm, setNetworkSearchTerm] = useState("");
  const [offerSearchTerm, setOfferSearchTerm] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [offersPerPage] = useState(15);

  // Quick filter options (removed "Amount" and "Date Added")
  const quickFilterOptions = [
    "All Offers", "Duplicates", "Crypto", "Dating", "Gambling", "insurance", "Game", "COD", "Sweepstakes", 
    "SOI", "DOI", "CPA", "CPL", "CPI"
  ];

  // Sorting options
  const sortOptions = [
    { value: "payout", label: "Highest Payout" },
    { value: "name", label: "Name (A-Z)" },
    { value: "date", label: "Date Added (Newest)" },
    { value: "clicks", label: "Highest Clicks" },
    { value: "cpa", label: "CPA Offers" },
    { value: "cpl", label: "CPL Offers" },
    { value: "rating", label: "Highest Rating" }
  ];

  // Function to handle background click with proper tracking
  const handleBackgroundClick = async () => {
    if (!backgroundBanner) return;
    
    const links = (backgroundBanner as any).link_urls || 
                 (backgroundBanner.link_url ? [backgroundBanner.link_url] : []);
    
    if (!links || links.length === 0) return;

    const currentIndex = clickIndexMap[backgroundBanner.id] || 0;
    const linkToOpen = links[currentIndex % links.length];
    
    if (linkToOpen && linkToOpen !== "#") {
      await logCustomClick({
        banner: backgroundBanner as Banner,
        linkOpened: linkToOpen,
        section: "background",
      });

      // Open in same tab like AffPlus
      window.location.href = linkToOpen;
      
      setClickIndexMap(prev => ({
        ...prev,
        [backgroundBanner.id]: (currentIndex + 1) % links.length,
      }));
    }
  };

  const handleNetworkClick = (networkId: string, networkName: string) => {
    setSelectedNetworkFilter(networkName);
    setCurrentPage(1);
  };

  // Function to handle network page navigation
  const handleNetworkPageClick = (network: Network) => {
    setSelectedNetwork(network);
    setViewMode("network");
  };

  // Function to go back to browse view
  const handleBackToBrowse = () => {
    setViewMode("browse");
    setSelectedNetwork(null);
  };

  // Function to detect duplicate offers
  const detectDuplicateOffers = (offers: Offer[]) => {
    const duplicateIds = new Set<string>();
    const seenOffers = new Map<string, Offer[]>();

    offers.forEach(offer => {
      // Create a normalized key for comparison
      const normalizedName = getDisplayValue(offer.name, "").toLowerCase().trim();
      const normalizedVertical = toStringArray(offer.vertical, false).map(v => v.toLowerCase()).sort().join(',');
      const normalizedGeo = toStringArray(offer.geo_targets, false).map(g => g.toLowerCase()).sort().join(',');
      const payoutAmount = typeof offer.payout_amount === 'number' ? offer.payout_amount : parseFloat(String(offer.payout_amount)) || 0;
      
      // Create a composite key for duplicate detection
      const compositeKey = `${normalizedName}|${normalizedVertical}|${normalizedGeo}|${payoutAmount}`;
      
      if (!seenOffers.has(compositeKey)) {
        seenOffers.set(compositeKey, []);
      }
      seenOffers.get(compositeKey)!.push(offer);
    });

    // Mark offers as duplicates if there are multiple with same key
    seenOffers.forEach((offersGroup) => {
      if (offersGroup.length > 1) {
        offersGroup.forEach(offer => duplicateIds.add(offer.id));
      }
    });

    return duplicateIds;
  };

  const handleQuickFilterClick = (filter: string) => {
    if (selectedQuickFilter === filter) {
      setSelectedQuickFilter("");
      setSelectedOfferCategory("🔥 Top Offers");
    } else {
      setSelectedQuickFilter(filter);
      // WHEN ALL OFFERS IS SELECTED, SHOW ALL OFFERS
      if (filter === "All Offers") {
        setSelectedOfferCategory("All");
      } else if (filter === "Duplicates") {
        // For sorting/special filters, keep current category or default to showing all
        setSelectedOfferCategory("All");
      } else {
        setSelectedOfferCategory(filter);
      }
      setCurrentPage(1);
    }
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchOffers = async () => {
      setLoadingOffers(true);
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`*, networks (id, name, logo_url)`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Use only your actual data, no demo data
        setAllOffers(data || []);

        const counts: Record<string, number> = {};
        (data || []).forEach(offer => {
          if (offer.network_id) {
            counts[offer.network_id] = (counts[offer.network_id] || 0) + 1;
          }
        });
        setOffersCountByNetwork(counts);

      } catch (error: any) {
        console.error("Error fetching offers:", error.message);
        toast({
          title: "Error",
          description: "Failed to load offers.",
          variant: "destructive",
        });
      } finally {
        setLoadingOffers(false);
      }
    };
    fetchOffers();
  }, [toast]);

  useEffect(() => {
    const fetchNetworks = async () => {
      setLoadingNetworks(true);
      try {
        const { data, error } = await supabase
          .from('networks')
          .select('*')
          .order('priority_order', { ascending: false });

        if (error) throw error;
        
        // Use only your actual data, no demo data
        setAllNetworks(data || []);
      } catch (error: any) {
        console.error("Error fetching networks:", error.message);
        toast({
          title: "Error",
          description: "Failed to load networks.",
          variant: "destructive",
        });
      } finally {
        setLoadingNetworks(false);
      }
    };
    fetchNetworks();
  }, [toast]);

  useEffect(() => {
    const fetchRotations = async () => {
      setLoadingRotations(true);
      try {
        const { data, error } = await supabase
          .from("banner_rotations")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAllRotations(data || []);
      } catch (err: any) {
        console.error("Error fetching rotations:", err.message);
        toast({ title: "Error", description: "Failed to load rotations.", variant: "destructive" });
      } finally {
        setLoadingRotations(false);
      }
    };
    fetchRotations();
  }, [toast]);

  useEffect(() => {
    const fetchBanners = async () => {
      setLoadingBanners(true);
      try {
        const { data, error } = await supabase
          .from("banners")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAllBanners(data || []);
      } catch (err: any) {
        console.error("Error fetching banners:", err.message || err);
        toast({
          title: "Error",
          description: "Failed to load banners.",
          variant: "destructive",
        });
      } finally {
        setLoadingBanners(false);
      }
    };
    fetchBanners();
  }, [toast]);

  const isPlaceholder = (value: any): boolean => {
    return !value || value === "##" || value === "null" || value === "undefined" || value === "";
  };

  const toStringArray = (value: any, includeEmpty: boolean = false): string[] => {
    if (!value) return [];
    
    if (Array.isArray(value)) {
      const filtered = value.map(v => {
        let str = String(v);
        str = str.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
        str = str.replace(/\\"/g, '"');
        str = str.trim();
        return str;
      }).filter(v => {
        if (includeEmpty) return true;
        return v && v !== "##" && v !== "null" && v !== "undefined" && v !== '""' && v !== "''" && v.trim() !== "";
      });
      return filtered;
    }
    
    if (typeof value === 'string') {
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const filtered = parsed.map(v => {
              let str = String(v);
              str = str.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
              str = str.replace(/\\"/g, '"');
              str = str.trim();
              return str;
            }).filter(v => {
              if (includeEmpty) return true;
              return v && v !== "##" && v !== "null" && v !== "undefined" && v !== '""' && v !== "''" && v.trim() !== "";
            });
            return filtered;
          }
        } catch (e) {
          console.log('JSON parse failed for:', value);
          const filtered = value.replace(/^\[|\]$/g, '').split(',').map(v => {
            let str = v.trim();
            str = str.replace(/^["']+|["']+$/g, '');
            str = str.replace(/\\"/g, '"');
            return str.trim();
          }).filter(v => {
            if (includeEmpty) return true;
            return v && v !== "##" && v !== "null" && v !== "undefined" && v !== '""' && v !== "''" && v.trim() !== "";
          });
          return filtered;
        }
      }
      
      if (value.includes(',')) {
        const filtered = value.split(',').map(v => {
          let str = v.trim();
          str = str.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
          str = str.replace(/\\"/g, '"');
          return str.trim();
        }).filter(v => {
          if (includeEmpty) return true;
          return v && v !== "##" && v !== "null" && v !== "undefined" && v !== '""' && v !== "''" && v.trim() !== "";
        });
        return filtered;
      }
      
      let cleanValue = value.trim();
      cleanValue = cleanValue.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
      cleanValue = cleanValue.replace(/\\"/g, '"');
      cleanValue = cleanValue.trim();
      
      if (includeEmpty || (cleanValue !== "##" && cleanValue !== "null" && cleanValue !== "undefined" && cleanValue !== '""' && cleanValue !== "''" && cleanValue !== "")) {
        return [cleanValue];
      }
    }
    
    return [];
  };

  const getDisplayValue = (value: any, fallback: string = "N/A"): string => {
    if (isPlaceholder(value)) {
      return fallback;
    }
    return String(value);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return "N/A";
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch (e) {
      return "N/A";
    }
  };

  const networksOptions = ["All", ...Array.from(new Set(
    allNetworks.map(n => getDisplayValue(n.name)).filter(name => name !== "N/A")
  ))];
  
  const geosOptions = ["Worldwide", ...Array.from(new Set(
    allOffers.flatMap(o => {
      const geos = toStringArray(o.geo_targets, false);
      return geos.length > 0 ? geos : [];
    })
  ))];
  
  const verticalsOptions = ["All", ...Array.from(new Set(
    allOffers.flatMap(o => {
      const verticals = toStringArray(o.vertical, false);
      return verticals.length > 0 ? verticals : [];
    })
  ))];
  
  // Include insurance in the offer categories but removed as default
  const offerCategories = ["🔥 Top Offers", "All", "insurance", ...Array.from(new Set(
    allOffers.flatMap(o => {
      const verticals = toStringArray(o.vertical, false);
      return verticals.length > 0 ? verticals.filter(v => v.toLowerCase() !== "insurance") : [];
    })
  ))];

  // Enhanced filtering function that matches offers comprehensively
  const matchesFilter = (offer: Offer, filterTerm: string): boolean => {
    const normalizedFilter = filterTerm.toLowerCase().trim();
    
    // Get all searchable fields from the offer
    const offerName = getDisplayValue(offer.name, "").toLowerCase();
    const offerType = getDisplayValue(offer.type, "").toLowerCase();
    const offerVerticals = toStringArray(offer.vertical, false).map(v => v.toLowerCase()).join(' ');
    const offerTags = toStringArray(offer.tags, false).map(t => t.toLowerCase()).join(' ');
    const offerGeos = toStringArray(offer.geo_targets, false).map(g => g.toLowerCase()).join(' ');
    const offerDevices = toStringArray(offer.devices, false).map(d => d.toLowerCase()).join(' ');
    const networkName = getDisplayValue(offer.networks?.name, "").toLowerCase();
    
    // Create a combined searchable text
    const searchableText = `${offerName} ${offerType} ${offerVerticals} ${offerTags} ${offerGeos} ${offerDevices} ${networkName}`;
    
    // Special handling for specific filters
    switch (normalizedFilter) {
      case "crypto":
        return searchableText.includes("crypto") || 
               searchableText.includes("bitcoin") || 
               searchableText.includes("btc") || 
               searchableText.includes("ethereum") ||
               searchableText.includes("blockchain");
      
      case "dating":
        return searchableText.includes("dating") || 
               searchableText.includes("romance") || 
               searchableText.includes("relationship") ||
               searchableText.includes("singles") ||
               searchableText.includes("match");
      
      case "gambling":
        return searchableText.includes("gambling") || 
               searchableText.includes("casino") || 
               searchableText.includes("poker") ||
               searchableText.includes("betting") ||
               searchableText.includes("slots") ||
               searchableText.includes("jackpot");
      
      case "insurance":
        return searchableText.includes("insurance") || 
               searchableText.includes("auto insurance") || 
               searchableText.includes("health insurance") ||
               searchableText.includes("life insurance") ||
               searchableText.includes("home insurance");
      
      case "game":
        return searchableText.includes("game") || 
               searchableText.includes("gaming") || 
               searchableText.includes("mobile game") ||
               searchableText.includes("video game") ||
               searchableText.includes("app game") ||
               offerVerticals.includes("game") ||
               offerTags.includes("game");
      
      case "cod":
        return searchableText.includes("cod") || 
               searchableText.includes("call of duty") ||
               searchableText.includes("cash on delivery") ||
               offerVerticals.includes("cod") ||
               offerTags.includes("cod");
      
      case "sweepstakes":
        return searchableText.includes("sweepstakes") || 
               searchableText.includes("sweeps") || 
               searchableText.includes("contest") ||
               searchableText.includes("giveaway") ||
               searchableText.includes("prize") ||
               offerVerticals.includes("sweepstakes") ||
               offerTags.includes("sweepstakes");
      
      case "soi":
      case "single opt-in":
      case "single opt in":
        return offerType.toLowerCase().includes("soi") || 
               searchableText.includes("single opt") ||
               searchableText.includes("single opt-in") ||
               offerVerticals.toLowerCase().includes("soi") ||
               offerTags.toLowerCase().includes("soi");
      
      case "doi":
      case "double opt-in":
      case "double opt in":
        return offerType.toLowerCase().includes("doi") || 
               searchableText.includes("double opt") ||
               searchableText.includes("double opt-in") ||
               offerVerticals.toLowerCase().includes("doi") ||
               offerTags.toLowerCase().includes("doi");
      
      case "cpa":
      case "cost per action":
      case "cost per acquisition":
        return offerType.toLowerCase().includes("cpa") || 
               searchableText.includes("cost per action") ||
               searchableText.includes("cost per acquisition") ||
               offerVerticals.toLowerCase().includes("cpa") ||
               offerTags.toLowerCase().includes("cpa");
      
      case "cpl":
      case "cost per lead":
        return offerType.toLowerCase().includes("cpl") || 
               searchableText.includes("cost per lead") ||
               offerVerticals.toLowerCase().includes("cpl") ||
               offerTags.toLowerCase().includes("cpl");
      
      case "cpi":
      case "cost per install":
        return offerType.toLowerCase().includes("cpi") || 
               searchableText.includes("cost per install") ||
               offerVerticals.toLowerCase().includes("cpi") ||
               offerTags.toLowerCase().includes("cpi");
      
      default:
        // For any other filter, do a general search
        return searchableText.includes(normalizedFilter);
    }
  };

  const getFilteredOffers = () => {
    let filtered = [...allOffers];

    // Apply network filter
    if (selectedNetworkFilter && selectedNetworkFilter !== "All") {
      filtered = filtered.filter(offer => {
        const networkName = getDisplayValue(offer.networks?.name);
        return networkName.toLowerCase() === selectedNetworkFilter.toLowerCase();
      });
    }

    // Apply geo filter
    if (selectedGeo && selectedGeo !== "Worldwide") {
      filtered = filtered.filter(offer => {
        const geoTargets = toStringArray(offer.geo_targets, false);
        const verticals = toStringArray(offer.vertical, false);

        return geoTargets.length === 0 || geoTargets.includes(selectedGeo);
      });
    }

    // Apply vertical filter
    if (selectedVertical && selectedVertical !== "All") {
      filtered = filtered.filter(offer => {
        const verticals = toStringArray(offer.vertical, false);
        return verticals.length === 0 || verticals.includes(selectedVertical);
      });
    }

    // Apply quick filter if selected - FIXED FILTERING LOGIC
    if (selectedQuickFilter && selectedQuickFilter !== "All Offers") {
      if (selectedQuickFilter === "Duplicates") {
        // Filter duplicates
        const duplicateIds = detectDuplicateOffers(filtered);
        filtered = filtered.filter(offer => duplicateIds.has(offer.id));
      } else {
        // Filter by specific criteria
        filtered = filtered.filter(offer => {
          const offerType = getDisplayValue(offer.type, "").toLowerCase();
          const offerVerticals = toStringArray(offer.vertical, false).map(v => v.toLowerCase());
          const offerTags = toStringArray(offer.tags, false).map(t => t.toLowerCase());
          
          switch (selectedQuickFilter.toLowerCase()) {
            case "soi":
              return offerType.includes("soi") || 
                     offerVerticals.some(v => v.includes("soi")) ||
                     offerTags.some(t => t.includes("soi"));
            
            case "doi":
              return offerType.includes("doi") || 
                     offerVerticals.some(v => v.includes("doi")) ||
                     offerTags.some(t => t.includes("doi"));
            
            case "cpa":
              return offerType.includes("cpa") || 
                     offerVerticals.some(v => v.includes("cpa")) ||
                     offerTags.some(t => t.includes("cpa"));
            
            case "cpl":
              return offerType.includes("cpl") || 
                     offerVerticals.some(v => v.includes("cpl")) ||
                     offerTags.some(t => t.includes("cpl"));
            
            case "cpi":
              return offerType.includes("cpi") || 
                     offerVerticals.some(v => v.includes("cpi")) ||
                     offerTags.some(t => t.includes("cpi"));
            
            case "insurance":
              return offerVerticals.some(v => v.includes("insurance")) ||
                     offerTags.some(t => t.includes("insurance")) ||
                     getDisplayValue(offer.name, "").toLowerCase().includes("insurance");
            
            case "crypto":
              return offerVerticals.some(v => v.includes("crypto")) ||
                     offerTags.some(t => t.includes("crypto")) ||
                     getDisplayValue(offer.name, "").toLowerCase().includes("crypto");
            
            case "dating":
              return offerVerticals.some(v => v.includes("dating")) ||
                     offerTags.some(t => t.includes("dating")) ||
                     getDisplayValue(offer.name, "").toLowerCase().includes("dating");
            
            case "gambling":
              return offerVerticals.some(v => v.includes("gambling")) ||
                     offerTags.some(t => t.includes("gambling")) ||
                     getDisplayValue(offer.name, "").toLowerCase().includes("gambling");
            
            case "game":
              return offerVerticals.some(v => v.includes("game")) ||
                     offerTags.some(t => t.includes("game")) ||
                     getDisplayValue(offer.name, "").toLowerCase().includes("game");
            
            case "cod":
              return offerVerticals.some(v => v.includes("cod")) ||
                     offerTags.some(t => t.includes("cod")) ||
                     getDisplayValue(offer.name, "").toLowerCase().includes("cod");
            
            case "sweepstakes":
              return offerVerticals.some(v => v.includes("sweepstakes")) ||
                     offerTags.some(t => t.includes("sweepstakes")) ||
                     getDisplayValue(offer.name, "").toLowerCase().includes("sweepstakes");
            
            default:
              return matchesFilter(offer, selectedQuickFilter);
          }
        });
      }
    }

    // Handle special cases for filtering and sorting
    if (selectedOfferCategory === "🔥 Top Offers") {
      // Sort by highest amount first, then by other criteria
      filtered = filtered.sort((a, b) => {
        const aAmount = typeof a.payout_amount === 'number' ? a.payout_amount : parseFloat(String(a.payout_amount)) || 0;
        const bAmount = typeof b.payout_amount === 'number' ? b.payout_amount : parseFloat(String(b.payout_amount)) || 0;
        
        // Sort by highest amount first
        if (aAmount !== bAmount) return bAmount - aAmount;
        
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        
        const aPriority = typeof a.priority_order === 'number' ? a.priority_order : 0;
        const bPriority = typeof b.priority_order === 'number' ? b.priority_order : 0;
        return bPriority - aPriority;
      });
    } else if (selectedOfferCategory === "insurance") {
      filtered = filtered.filter(offer => matchesFilter(offer, "insurance"));
    } else if (selectedOfferCategory !== "All") {
      filtered = filtered.filter(offer => {
        const verticals = toStringArray(offer.vertical, false);
        return verticals.length === 0 || verticals.includes(selectedOfferCategory);
      });
    }

    // Apply sorting based on the sortBy state
    if (sortBy === "payout") {
      filtered = filtered.sort((a, b) => {
        const aAmount = typeof a.payout_amount === 'number' ? a.payout_amount : parseFloat(String(a.payout_amount)) || 0;
        const bAmount = typeof b.payout_amount === 'number' ? b.payout_amount : parseFloat(String(b.payout_amount)) || 0;
        return bAmount - aAmount;
      });
    } else if (sortBy === "name") {
      filtered = filtered.sort((a, b) => {
        const aName = getDisplayValue(a.name, "").toLowerCase();
        const bName = getDisplayValue(b.name, "").toLowerCase();
        return aName.localeCompare(bName);
      });
    } else if (sortBy === "date") {
      filtered = filtered.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      });
    } else if (sortBy === "clicks") {
      filtered = filtered.sort((a, b) => {
        const aClicks = a.click_count || 0;
        const bClicks = b.click_count || 0;
        return bClicks - aClicks;
      });
    } else if (sortBy === "cpa") {
      filtered = filtered.filter(offer => {
        const type = getDisplayValue(offer.type, "").toLowerCase();
        return type.includes("cpa") || matchesFilter(offer, "cpa");
      }).sort((a, b) => {
        const aAmount = typeof a.payout_amount === 'number' ? a.payout_amount : parseFloat(String(a.payout_amount)) || 0;
        const bAmount = typeof b.payout_amount === 'number' ? b.payout_amount : parseFloat(String(b.payout_amount)) || 0;
        return bAmount - aAmount;
      });
    } else if (sortBy === "cpl") {
      filtered = filtered.filter(offer => {
        const type = getDisplayValue(offer.type, "").toLowerCase();
        return type.includes("cpl") || matchesFilter(offer, "cpl");
      }).sort((a, b) => {
        const aAmount = typeof a.payout_amount === 'number' ? a.payout_amount : parseFloat(String(a.payout_amount)) || 0;
        const bAmount = typeof b.payout_amount === 'number' ? b.payout_amount : parseFloat(String(b.payout_amount)) || 0;
        return bAmount - aAmount;
      });
    } else if (sortBy === "rating") {
      filtered = filtered.sort((a, b) => {
        const aRating = a.rating || 0;
        const bRating = b.rating || 0;
        return bRating - aRating;
      });
    }

    // Apply search filters
    const lowerCaseOfferSearchTerm = offerSearchTerm.toLowerCase();
    const lowerCaseGlobalSearchTerm = globalSearchTerm.toLowerCase();
    
    if (lowerCaseOfferSearchTerm) {
      filtered = filtered.filter(offer => {
        const offerName = getDisplayValue(offer.name, "").toLowerCase();
        const offerVerticals = toStringArray(offer.vertical, false).map(v => v.toLowerCase()).join(' ');
        const offerGeos = toStringArray(offer.geo_targets, false).map(g => g.toLowerCase()).join(' ');
        const offerTags = toStringArray(offer.tags, false).map(t => t.toLowerCase()).join(' ');
        const searchableText = `${offerName} ${offerVerticals} ${offerGeos} ${offerTags}`;
        return searchableText.includes(lowerCaseOfferSearchTerm);
      });
    }

    if (lowerCaseGlobalSearchTerm) {
      filtered = filtered.filter(offer => {
        const offerName = getDisplayValue(offer.name, "").toLowerCase();
        const offerVerticals = toStringArray(offer.vertical, false).map(v => v.toLowerCase()).join(' ');
        const offerGeos = toStringArray(offer.geo_targets, false).map(g => g.toLowerCase()).join(' ');
        const offerTags = toStringArray(offer.tags, false).map(t => t.toLowerCase()).join(' ');
        const networkName = getDisplayValue(offer.networks?.name, "").toLowerCase();
        const searchableText = `${offerName} ${offerVerticals} ${offerGeos} ${offerTags} ${networkName}`;
        return searchableText.includes(lowerCaseGlobalSearchTerm);
      });
    }

    return filtered;
  };

  const getFilteredNetworks = () => {
    let filtered = allNetworks.filter(n => n.is_active);
    
    const lowerCaseNetworkSearchTerm = networkSearchTerm.toLowerCase();
    const lowerCaseGlobalSearchTerm = globalSearchTerm.toLowerCase();
    
    if (lowerCaseNetworkSearchTerm) {
      filtered = filtered.filter((network) =>
        network.name.toLowerCase().includes(lowerCaseNetworkSearchTerm)
      );
    }

    if (lowerCaseGlobalSearchTerm) {
      filtered = filtered.filter((network) => {
        const networkName = network.name.toLowerCase();
        const networkDescription = (network.description || "").toLowerCase();
        const networkCategories = (network.categories || []).join(' ').toLowerCase();
        const networkTags = (network.tags || []).join(' ').toLowerCase();
        return (
          networkName.includes(lowerCaseGlobalSearchTerm) ||
          networkDescription.includes(lowerCaseGlobalSearchTerm) ||
          networkCategories.includes(lowerCaseGlobalSearchTerm) ||
          networkTags.includes(lowerCaseGlobalSearchTerm)
        );
      });
    }

    return filtered;
  };

  // Pagination logic
  const offersToDisplay = getFilteredOffers();
  const indexOfLastOffer = currentPage * offersPerPage;
  const indexOfFirstOffer = indexOfLastOffer - offersPerPage;
  const currentOffers = offersToDisplay.slice(indexOfFirstOffer, indexOfLastOffer);
  const totalPages = Math.ceil(offersToDisplay.length / offersPerPage);

  const paginate = (pageNumber: number) => {
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Background banner logic
  const defaultBg = "https://i.pinimg.com/736x/cf/3a/c8/cf3ac842dcb713c45973de67c44d5e78.jpg";

  const bannerHasSection = (b: Banner, sec: string) => {
    try {
      const sections = toStringArray((b as any).section || b.section, false).map(s => s.toLowerCase());
      return sections.includes(sec.toLowerCase());
    } catch {
      return false;
    }
  };

  const getBannerImageUrl = (b: Banner) => {
    const path = (b as any).image_url || (b as any).image_path || (b as any).image || "";
    if (!path) return "";
    const src = String(path).trim();
    return src.startsWith("http") ? src : SUPABASE_BANNERS_BASE + src;
  };

  const cacheBusted = (src: string, id?: string) => {
    if (!src) return src;
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}v=${encodeURIComponent(String(id || Date.now()))}`;
  };

  const backgroundBanner = allBanners.find(b => bannerHasSection(b, "background"));
  const backgroundUrl = backgroundBanner ? cacheBusted(getBannerImageUrl(backgroundBanner), backgroundBanner.id) : defaultBg;

  const networksToDisplay = getFilteredNetworks();

  const activeRotations = allRotations.filter(r => !r.expires_at || new Date(r.expires_at) > new Date());

  const bannersForRotation = (r: BannerRotation) => {
    return (r.banner_ids || []).map(id => allBanners.find(b => b.id === id)).filter(Boolean) as Banner[];
  };

  const rotationGroupsBySection: Record<string, BannerRotation[]> = {
    "fixed-top": activeRotations.filter(r => r.section === "fixed-top"),
    "top": activeRotations.filter(r => r.section === "top"),
    "sidebar": activeRotations.filter(r => r.section === "sidebar"),
    "footer": activeRotations.filter(r => r.section === "footer"),
    "fixed-bottom": activeRotations.filter(r => r.section === "fixed-bottom"),
  };

  const bannerIdsInActiveRotations = new Set(activeRotations.flatMap(r => r.banner_ids.map(String)));

  const fixedTopBanners = allBanners.filter(b => b.section?.includes("fixed-top") && !bannerIdsInActiveRotations.has(String(b.id)));
  const topBanners = allBanners.filter(b => b.section?.includes("top") && !bannerIdsInActiveRotations.has(String(b.id)));
  const sidebarBanners = allBanners.filter(b => b.section?.includes("sidebar") && !bannerIdsInActiveRotations.has(String(b.id)));
  const footerBanners = allBanners.filter(b => b.section?.includes("footer") && !bannerIdsInActiveRotations.has(String(b.id)));
  const fixedBottomBanners = allBanners.filter(b => b.section?.includes("fixed-bottom") && !bannerIdsInActiveRotations.has(String(b.id)));

  const FilterDropdown = ({ title, options, selected, onSelect }: any) => {
    const [searchTerm, setSearchTerm] = useState("");
    const filteredOptions = options.filter((option: string) =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="relative group" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="outline" 
          className="flex items-center gap-1 px-2 py-1 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 transition-colors text-xs h-8"
        >
          <span className="text-xs font-medium">{selected || title}</span>
          <ChevronDown className="w-3 h-3 text-white" />
        </Button>
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 hidden group-hover:block">
          <div className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder={`Search ${title.toLowerCase()}`}
                className="pl-10 h-7 text-sm bg-gray-800 border-gray-700 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.map((option: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-1 hover:bg-gray-800 cursor-pointer rounded text-sm text-white"
                  onClick={() => onSelect(option)}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-3 h-3"
                      checked={selected === option}
                      readOnly
                    />
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SortDropdown = () => {
    return (
      <div className="relative group" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="outline" 
          className="flex items-center gap-1 px-2 py-1 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 transition-colors text-xs h-8"
        >
          <span className="text-xs font-medium">
            {sortOptions.find(opt => opt.value === sortBy)?.label || "Sort By"}
          </span>
          <ChevronDown className="w-3 h-3 text-white" />
        </Button>
        <div className="absolute top-full left-0 mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 hidden group-hover:block">
          <div className="p-2">
            <div className="max-h-64 overflow-y-auto">
              {sortOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center justify-between px-3 py-1 hover:bg-gray-800 cursor-pointer rounded text-sm text-white"
                  onClick={() => handleSortChange(option.value)}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      className="w-3 h-3"
                      checked={sortBy === option.value}
                      readOnly
                    />
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center mt-4 space-x-2">
        <Button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-gray-800 text-white border-gray-700 h-8 px-2"
        >
          <ChevronLeft className="w-3 h-3" />
          Previous
        </Button>
        
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          
          return (
            <Button
              key={pageNum}
              onClick={() => paginate(pageNum)}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              className={`h-8 px-2 min-w-[2rem] ${currentPage === pageNum ? "bg-blue-600 text-white" : "bg-gray-800 text-white border-gray-700"}`}
            >
              {pageNum}
            </Button>
          );
        })}
        
        {totalPages > 5 && currentPage < totalPages - 2 && (
          <span className="text-gray-400">...</span>
        )}
        
        {totalPages > 5 && currentPage < totalPages - 2 && (
          <Button
            onClick={() => paginate(totalPages)}
            variant="outline"
            size="sm"
            className="bg-gray-800 text-white border-gray-700 h-8 px-2"
          >
            {totalPages}
          </Button>
        )}
        
        <Button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-gray-800 text-white border-gray-700 h-8 px-2"
          >
          Next
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  // If we're in network view mode, show the network page
  if (viewMode === "network" && selectedNetwork) {
    return (
      <NetworkPage 
        network={selectedNetwork} 
        offers={allOffers} 
        onBack={handleBackToBrowse}
      />
    );
  }
  
  return (
    <div
      className="min-h-screen text-white bg-cover bg-center cursor-pointer"
      style={{ backgroundImage: `url('${backgroundUrl}')` }}
      onClick={handleBackgroundClick}
    >
      {/* TopBar with Logo */}
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        <TopBar />
        {/* Logo positioned in top left corner */}
        <div className="absolute top-14 left-4 sm:top-16 sm:left-8 z-50">
          <img 
            src="https://pepeleads.com/uploads/1756199032-7299397.png"
            alt="AffiTitans Logo" 
            className="h-8 sm:h-10 w-auto object-contain"
          />
        </div>
      </div>
      
      {/* Fixed Top Banners */}
      <div>
        {rotationGroupsBySection["fixed-top"].map((rotation) => (
          <BannerDisplay
            key={rotation.id}
            banners={bannersForRotation(rotation)}
            section="fixed-top"
            intervalMs={rotation.rotation_duration_ms || 5000}
          />
        ))}
        {fixedTopBanners.length > 0 && (
          <BannerDisplay banners={fixedTopBanners} section="fixed-top" />
        )}
      </div>
      
      {/* Top Banners - Now aligned to the right with proper spacing */}
      <div className="flex justify-end px-4 pt-3">
        {rotationGroupsBySection["top"].map((rotation) => (
          <BannerDisplay
            key={rotation.id}
            banners={bannersForRotation(rotation)}
            section="top"
            intervalMs={rotation.rotation_duration_ms || 5000}
          />
        ))}
        {topBanners.length > 0 && (
          <BannerDisplay banners={topBanners} section="top" />
        )}
      </div>
      
      {/* Header with Filters and Global Search */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-row flex-wrap items-center gap-2">
          <FilterDropdown 
            title="Networks" 
            options={networksOptions}
            selected={selectedNetworkFilter}
            onSelect={setSelectedNetworkFilter}
          />
          <FilterDropdown 
            title="Geos" 
            options={geosOptions}
            selected={selectedGeo}
            onSelect={setSelectedGeo}
          />
          <FilterDropdown 
            title="Verticals" 
            options={verticalsOptions}
            selected={selectedVertical}
            onSelect={setSelectedVertical}
          />
          
          {/* Sort Dropdown */}
          <SortDropdown />
          
          {/* Global Search Bar */}
          <div className="relative w-[50%] max-w-[350px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search networks and offers..."
              className="pl-10 bg-gray-800 border-gray-700 text-white h-8 text-sm"
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 p-3">
        {/* Main Content Area */}
        <div className="flex-1">
          {/* Premium Quick Filter Buttons - Single Line Layout with Better Spacing */}
          <div className="mb-3 flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide pb-1" onClick={(e) => e.stopPropagation()}>
            {quickFilterOptions.map((filter) => (
              <button
                key={filter}
                className={`text-xs px-2 py-0.5 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105 whitespace-nowrap flex-shrink-0 min-w-max ${
                  selectedQuickFilter === filter 
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                    : "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white shadow-md"
                } font-medium tracking-wide`}
                onClick={() => handleQuickFilterClick(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Offers List with Pagination */}
          <div className="space-y-3">
            {/* Offer Search Input */}
            {selectedNetworkFilter && (
              <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto px-3 py-1 h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNetworkFilter(null);
                  }}
                >
                  Back to All Offers
                </Button>
                <div className="relative w-full sm:w-auto flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                  <Input
                    placeholder={`Search offers for ${selectedNetworkFilter}...`}
                    className="pl-8 h-7 text-xs bg-gray-800 border-gray-700 text-white w-full"
                    value={offerSearchTerm}
                    onChange={(e) => setOfferSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-white">
                {selectedQuickFilter === "All Offers" 
                  ? "All Offers" 
                  : selectedQuickFilter === "insurance"
                    ? "Insurance Offers"
                    : selectedQuickFilter === "Duplicates"
                      ? "Duplicate Offers"
                      : selectedQuickFilter 
                        ? `${selectedQuickFilter} Offers` 
                        : selectedNetworkFilter 
                          ? `Offers for ${selectedNetworkFilter}` 
                          : "🔥 Top Offers"}
              </h2>
            </div>

            {loadingOffers ? (
              <div className="text-center py-6 text-gray-400 text-sm">Loading offers...</div>
            ) : currentOffers.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No offers found. Try adjusting your filters.
              </div>
            ) : (
              <>
                {/* COMPACT OFFER CARDS - Much smaller height with AffPlus-like features */}
                {currentOffers.map((offer) => {
                  // Get payout amount as number for proper display
                  const payoutAmount = typeof offer.payout_amount === 'number' 
                    ? offer.payout_amount 
                    : parseFloat(String(offer.payout_amount)) || 0;
                  
                  // Get verticals and geo tags as arrays
                  const verticals = toStringArray(offer.vertical, false);
                  const geoTargets = toStringArray(offer.geo_targets, false);
                  
                  
                  return (
                    <Card
                      key={offer.id}
                      className={`p-2 w-full hover:shadow-md transition-shadow border-gray-800 cursor-pointer ${
                        offer.is_active ? "bg-gray-900 hover:bg-gray-850" : "bg-gray-800"
                      } max-w-full sm:max-w-[600px] mx-auto`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/offer/${offer.id}`);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Left Side - Network Logo and Offer Info */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <img
                            src={
                              offer.networks?.logo_url ||
                              `https://placehold.co/32x32/333333/666666?text=${(
                                offer.networks?.name || "N"
                              ).charAt(0)}`
                            }
                            alt={offer.networks?.name || "Network Logo"}
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <h3 className="font-semibold text-white text-xs truncate">
                                {getDisplayValue(offer.name, "Unnamed Offer")}
                              </h3>
                              {!offer.is_active && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-gray-700 text-white px-1 py-0 h-3"
                                >
                                  Inactive
                                </Badge>
                              )}
                              {offer.is_featured && (
                                <Badge
                                  variant="default"
                                  className="text-[10px] bg-yellow-600 text-white px-1 py-0 h-3"
                                >
                                  Featured
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 mb-0.5">
                              <span 
                                className="text-[10px] text-blue-400 cursor-pointer hover:underline font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to network page instead of filtering
                                  const network = allNetworks.find(n => n.id === offer.network_id);
                                  if (network) {
                                    handleNetworkPageClick(network);
                                  }
                                }}
                              >
                                {getDisplayValue(offer.networks?.name, "Unknown Network")}
                              </span>
                              
                              {/* Rating Display - Only show if data exists */}
                              {offer.rating && (
                                <StarRating 
                                  rating={offer.rating} 
                                  totalRatings={offer.total_ratings}
                                  size={10}
                                />
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mb-0.5">
                              {/* Geo Targets - Show all available */}
                              {geoTargets.map((geo, idx) => (
                                <Badge
                                  key={`geo-${idx}`}
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 h-3 border-gray-600 text-gray-300 bg-gray-600/10"
                                >
                                  {geo}
                                </Badge>
                              ))}
                              
                              {/* Vertical Tags - Show all available */}
                              {verticals.map((vertical, idx) => (
                                <Badge
                                  key={`vertical-${idx}`}
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 h-3 border-green-600 text-green-300 bg-green-600/10"
                                >
                                  {vertical}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              {/* Additional metrics - Only show if data exists */}
                              {offer.conversion_rate && (
                                <div className="flex items-center gap-1">
                                  <Target size={8} />
                                  <span>{offer.conversion_rate.toFixed(1)}% CR</span>
                                </div>
                              )}

                              {offer.last_updated && (
                                <div className="flex items-center gap-1">
                                  <Clock size={8} />
                                  <span>{formatRelativeTime(offer.last_updated)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Side - Payout and Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-bold text-green-400">
                              {getDisplayValue(offer.payout_currency, "USD")}{" "}
                              {payoutAmount.toFixed(2)}
                            </div>
                            
                            {/* Show click count if sorting by clicks */}
                            {sortBy === "clicks" && (
                              <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 justify-end">
                                <Users size={8} />
                                {offer.click_count || 0} clicks
                              </div>
                            )}
                            
                            {/* EPC if available */}
                            {offer.epc && (
                              <div className="text-[10px] text-blue-400 mt-0.5">
                                EPC: ${offer.epc.toFixed(2)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            {/* View Details Button - Now with three dots icon */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] p-1 h-6 w-6 border-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/offer/${offer.id}`);
                              }}
                              title="Details"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                            
                            {/* Join Button - Now with titled arrow icon */}
                            <JoinButton offer={offer} network={offer.networks} variant="icon" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                
                {/* Pagination Controls */}
                <Pagination />
              </>
            )}
          </div>

          {/* Footer Banners */}
          {rotationGroupsBySection["footer"].map((rotation) => (
            <BannerDisplay
              key={rotation.id}
              banners={bannersForRotation(rotation)}
              section="footer"
              intervalMs={rotation.rotation_duration_ms || 5000}
            />
          ))}
          {footerBanners.length > 0 && (
            <BannerDisplay banners={footerBanners} section="footer" />
          )}
        </div>

        {/* Networks Sidebar - Network names are now clickable to open network page */}
        <div className="w-full lg:w-72 flex-shrink-0 order-last lg:order-none">
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            {/* Sidebar Banners */}
            {rotationGroupsBySection["sidebar"].map((rotation) => (
              <BannerDisplay
                key={rotation.id}
                banners={bannersForRotation(rotation)}
                section="sidebar"
                intervalMs={rotation.rotation_duration_ms || 5000}
              />
            ))}
            {sidebarBanners.length > 0 && (
              <SidebarBannerDisplay banners={sidebarBanners} />
            )}
            
            {/* Network Search Box */}
            <div className="p-2 border-b border-gray-700" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <Input
                  placeholder="Search networks..."
                  className="pl-8 bg-gray-800 border-gray-700 text-white h-7 text-xs"
                  value={networkSearchTerm}
                  onChange={(e) => setNetworkSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="p-2 border-b border-gray-700">
              <h2 className="font-medium text-white text-xs">All Networks</h2>
            </div>
            
            <div className="p-2">
              <div className="grid grid-cols-4 gap-2">
                {loadingNetworks ? (
                  <div className="text-center py-3 text-gray-400 col-span-4 text-xs">Loading networks...</div>
                ) : networksToDisplay.length === 0 ? (
                  <div className="text-center py-3 text-gray-400 col-span-4 text-xs">No networks found.</div>
                ) : (
                  networksToDisplay.map((network) => (
                    <div
                      key={network.id}
                      className="flex flex-col items-center cursor-pointer group"
                      title={network.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNetworkPageClick(network);
                      }}
                    >
                      <img
                        src={network.logo_url || `https://placehold.co/32x32/333333/666666?text=${network.name.charAt(0)}`}
                        alt={network.name}
                        className="w-8 h-8 rounded-lg object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="flex items-center gap-1 group-hover:underline mt-0.5">
                        <span className="text-[10px] text-white truncate w-full text-center">
                          {network.name}
                        </span>
                      </div>
                      
                      {/* Network Rating - Only show if data exists */}
                      {network.rating && (
                        <StarRating 
                          rating={network.rating} 
                          totalRatings={network.total_ratings}
                          size={8}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fixed Bottom Banners */}
      <div>
        {rotationGroupsBySection["fixed-bottom"].map((rotation) => (
          <BannerDisplay
            key={rotation.id}
            banners={bannersForRotation(rotation)}
            section="fixed-bottom"
            intervalMs={rotation.rotation_duration_ms || 5000}
          />
        ))}
        {fixedBottomBanners.length > 0 && (
          <BannerDisplay banners={fixedBottomBanners} section="fixed-bottom" />
        )}
      </div>
      
      {fixedBottomBanners.length > 0 && <div className="h-16" />}
      <div>
        <Footer />
      </div>
    </div> 
  );
};

export default Browse;