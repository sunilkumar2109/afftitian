import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, Search, ChevronUp, Shuffle, ChevronLeft, ChevronRight } from "lucide-react";
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
  networks?: {
    id: string;
    name: string;
    logo_url: string;
  };
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

interface NetworkWithOffers {
  network: Network;
  offers: Offer[];
  currentOfferIndex: number;
}

// handles: dev proxy (/api), or production full URL (https://...)
const RAW_TRACKING = (import.meta as any).env?.VITE_TRACKING_API;
const TRACKING_API =
  RAW_TRACKING && RAW_TRACKING !== "/api" ? RAW_TRACKING.replace(/\/$/, "") : "";

// use like: fetch(`${TRACKING_API}/api/custom-clicks`)
// if TRACKING_API === "" the fetch becomes "/api/custom-clicks" (works with dev proxy)

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
      imageClass = "w-full h-20 object-cover";
      break;
    case "fixed-bottom":
      containerClass = "fixed bottom-0 left-0 right-0 z-50 bg-black shadow-md";
      imageClass = "w-full h-20 object-cover";
      break;
    case "sidebar":
      containerClass = "mb-4";
      imageClass = "w-full h-auto object-contain";
      break;
    case "top":
      containerClass = "my-4 flex justify-end pr-3";
      imageClass = "w-[900px] h-[100px] object-contain";
      break;
    case "footer":
      containerClass = "my-6";
      imageClass = "w-full h-20 object-cover";
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

    // Open the link
    window.open(linkToOpen, "_blank", "noopener,noreferrer");

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

    window.open(linkToOpen, "_blank", "noopener,noreferrer");
    await logBannerClick(banner.id);

    setClickIndexMap((prev) => ({
      ...prev,
      [banner.id]: (currentIndex + 1) % links.length,
    }));
  };

  return (
    <div className="space-y-4">
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
              className="w-full h-[400px] object-contain rounded-md"
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

const Browse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Add missing clickIndexMap state for main component
  const [clickIndexMap, setClickIndexMap] = useState<Record<string, number>>({});
  
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState<string | null>(null);
  const [selectedGeo, setSelectedGeo] = useState<string | null>(null);
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [selectedOfferCategory, setSelectedOfferCategory] = useState<string>("🔥 Top Offers");

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

  // NEW STATE: For controlling how many networks to show in sidebar
  const [showAllNetworks, setShowAllNetworks] = useState(false);
  const NETWORKS_DISPLAY_LIMIT = 8; // Change this to 10 if you prefer

  // NEW STATE: For network-wise offer shuffling
  const [shuffleKey, setShuffleKey] = useState(0);
  const [displayMode, setDisplayMode] = useState<"network-shuffle" | "normal">("network-shuffle");
  const [isShuffling, setIsShuffling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const OFFERS_PER_PAGE = 10;


  // Fisher-Yates shuffle function
  const shuffle = <T,>(array: T[]): T[] => {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

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

      window.open(linkToOpen, "_blank", "noopener,noreferrer");
      
      setClickIndexMap(prev => ({
        ...prev,
        [backgroundBanner.id]: (currentIndex + 1) % links.length,
      }));
    }
  };

  const handleNetworkClick = (networkId: string) => {
    navigate(`/network/${networkId}`);
  };

  useEffect(() => {
    const fetchOffers = async () => {
      setLoadingOffers(true);
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`*, networks (id, name, logo_url)`);

        if (error) throw error;
        
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
  
  const offerCategories = ["🔥 Top Offers", "All", ...Array.from(new Set(
    allOffers.flatMap(o => {
      const verticals = toStringArray(o.vertical, false);
      return verticals.length > 0 ? verticals : [];
    })
  ))];

  // NEW: Group offers by network and create network-wise shuffled display
  const networksWithOffers = useMemo(() => {
    console.log("Recalculating networksWithOffers, shuffleKey:", shuffleKey);
    
    // Create a map of all active networks
    const networkMap = new Map<string, NetworkWithOffers>();
    
    // Initialize networks that have offers
    const activeNetworks = allNetworks.filter(n => n.is_active);
    activeNetworks.forEach(network => {
      const networkOffers = allOffers.filter(offer => 
        offer.network_id === network.id && offer.is_active
      );
      
      if (networkOffers.length > 0) {
        networkMap.set(network.id, {
          network,
          offers: shuffle(networkOffers), // Shuffle offers within each network
          currentOfferIndex: 0
        });
      }
    });

    const result = Array.from(networkMap.values());
    console.log("NetworksWithOffers result:", result.map(nw => ({
      networkName: nw.network.name,
      offerCount: nw.offers.length
    })));
    
    return result;
  }, [allOffers, allNetworks, shuffleKey]);

  const getFilteredOffers = () => {
    let filtered = [...allOffers];

    // Apply network filter
    if (selectedNetworkFilter && selectedNetworkFilter !== "All") {
      filtered = filtered.filter(offer => {
        const networkName = getDisplayValue(offer.networks?.name);
        return networkName === selectedNetworkFilter;
      });
    }

    // Apply geo filter
    if (selectedGeo && selectedGeo !== "Worldwide") {
      filtered = filtered.filter(offer => {
        const geoTargets = toStringArray(offer.geo_targets, false);
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

    // Apply category filter
    if (selectedOfferCategory === "🔥 Top Offers") {
      filtered = filtered.sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        
        const aPriority = typeof a.priority_order === 'number' ? a.priority_order : 0;
        const bPriority = typeof b.priority_order === 'number' ? b.priority_order : 0;
        return bPriority - aPriority;
      });
    } else if (selectedOfferCategory !== "All") {
      filtered = filtered.filter(offer => {
        const verticals = toStringArray(offer.vertical, false);
        return verticals.includes(selectedOfferCategory);
      });
    }

    if (selectedOfferCategory !== "🔥 Top Offers") {
      filtered = filtered.sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        
        const aPriority = typeof a.priority_order === 'number' ? a.priority_order : 0;
        const bPriority = typeof b.priority_order === 'number' ? b.priority_order : 0;
        return bPriority - aPriority;
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
        return (
          offerName.includes(lowerCaseOfferSearchTerm) ||
          offerVerticals.includes(lowerCaseOfferSearchTerm) ||
          offerGeos.includes(lowerCaseOfferSearchTerm)
        );
      });
    }

    if (lowerCaseGlobalSearchTerm) {
      filtered = filtered.filter(offer => {
        const offerName = getDisplayValue(offer.name, "").toLowerCase();
        const offerVerticals = toStringArray(offer.vertical, false).map(v => v.toLowerCase()).join(' ');
        const offerGeos = toStringArray(offer.geo_targets, false).map(g => g.toLowerCase()).join(' ');
        const networkName = getDisplayValue(offer.networks?.name, "").toLowerCase();
        return (
          offerName.includes(lowerCaseGlobalSearchTerm) ||
          offerVerticals.includes(lowerCaseGlobalSearchTerm) ||
          offerGeos.includes(lowerCaseGlobalSearchTerm) ||
          networkName.includes(lowerCaseGlobalSearchTerm)
        );
      });
    }

    // NEW: Apply network-wise shuffling if in network-shuffle mode
    if (displayMode === "network-shuffle" && !selectedNetworkFilter) {
      // Create round-robin display from networks with offers
      const result: (Offer & { networkInfo?: Network })[] = [];
      const maxOffersInAnyNetwork = Math.max(...networksWithOffers.map(nw => nw.offers.length));
      
      // Round-robin through networks
      for (let round = 0; round < maxOffersInAnyNetwork; round++) {
        // Shuffle network order for each round
        const shuffledNetworkOrder = shuffle([...networksWithOffers]);
        
        shuffledNetworkOrder.forEach(networkData => {
          if (networkData.offers[round]) {
            const offerWithNetworkInfo = {
              ...networkData.offers[round],
              networkInfo: networkData.network
            };
            
            // Apply filters to this offer
            const passesFilters = filtered.some(f => f.id === offerWithNetworkInfo.id);
            if (passesFilters) {
              result.push(offerWithNetworkInfo);
            }
          }
        });
      }
      
      return shuffle(result); // Final shuffle
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

  const offersToDisplay = getFilteredOffers();
  const totalPages = Math.ceil(offersToDisplay.length / OFFERS_PER_PAGE);
  const paginatedOffers = offersToDisplay.slice(
    (currentPage - 1) * OFFERS_PER_PAGE,
    currentPage * OFFERS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedNetworkFilter, selectedGeo, selectedVertical, selectedOfferCategory, offerSearchTerm, globalSearchTerm, displayMode]);

  const networksToDisplay = getFilteredNetworks();

  // NEW: Get limited networks for sidebar display
  const sidebarNetworksToDisplay = showAllNetworks 
    ? networksToDisplay 
    : networksToDisplay.slice(0, NETWORKS_DISPLAY_LIMIT);

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
          className="flex items-center gap-1 px-2 py-1 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 transition-colors text-xs sm:text-sm"
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
                className="pl-10 h-8 text-sm bg-gray-800 border-gray-700 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.map((option: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-800 cursor-pointer rounded text-sm text-white"
                  onClick={() => onSelect(option)}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
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

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="flex justify-center items-center mt-6 gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {startPage > 1 && (
          <>
            <Button
              variant={currentPage === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(1)}
              className="h-8 w-8 p-0"
            >
              1
            </Button>
            {startPage > 2 && <span className="px-1">...</span>}
          </>
        )}
        
        {pageNumbers.map(page => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentPage(page)}
            className="h-8 w-8 p-0"
          >
            {page}
          </Button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1">...</span>}
            <Button
              variant={currentPage === totalPages ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              className="h-8 w-8 p-0"
            >
              {totalPages}
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };
  
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
        <div className="absolute top-16 left-4 sm:top-20 sm:left-10 z-50">
          <img 
            src="https://pepeleads.com/uploads/1756199032-7299397.png"
            alt="AffiTitans Logo" 
            className="h-10 sm:h-12 w-auto object-contain"
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
      <div className="flex justify-end px-6 pt-4">
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
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
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
          
          {/* NEW: Display Mode Toggle */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={displayMode === "network-shuffle" ? "default" : "outline"}
              onClick={() => setDisplayMode("network-shuffle")}
              className="text-xs px-2 py-1"
            >
              Network Mix
            </Button>
            <Button
              size="sm"
              variant={displayMode === "normal" ? "default" : "outline"}
              onClick={() => setDisplayMode("normal")}
              className="text-xs px-2 py-1"
            >
              Normal
            </Button>
          </div>

          {/* NEW: Shuffle Button */}
          <Button 
            size="sm" 
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Shuffle button clicked, current key:", shuffleKey);
              
              setIsShuffling(true);
              
              // Add a small delay to make the shuffle visible
              await new Promise(resolve => setTimeout(resolve, 100));
              
              setShuffleKey(k => {
                const newKey = k + 1;
                console.log("Shuffle key updated to:", newKey);
                return newKey;
              });
              
              setTimeout(() => setIsShuffling(false), 300);
            }} 
            disabled={isShuffling}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Shuffle className={`h-3 w-3 ${isShuffling ? 'animate-spin' : ''}`} />
            {isShuffling ? 'Shuffling...' : 'Shuffle'}
          </Button>
          
          {/* Global Search Bar */}
          <div className="relative w-[50%] max-w-[400px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search networks and offers..."
              className="pl-10 bg-gray-800 border-gray-700 text-white h-9"
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-3 sm:p-6">

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Show Network Mix Offers when no specific network is selected and in network-shuffle mode */}
          {!selectedNetworkFilter && displayMode === "network-shuffle" && (
            <div className="space-y-2">
              {/* Network Distribution Info */}
              {networksWithOffers.length > 0 && (
                <div className="mb-4 p-3 bg-gray-900/80 rounded-lg border border-gray-700">
                  <h4 className="font-medium mb-2 text-white">Network Mixed Offers ({offersToDisplay.length} offers from {networksWithOffers.length} networks):</h4>
                  <div className="flex flex-wrap gap-2">
                    {networksWithOffers.slice(0, 8).map(nw => (
                      <Badge key={nw.network.id} variant="outline" className="text-xs border-blue-500 text-blue-300">
                        {nw.network.name}: {nw.offers.length} offer{nw.offers.length !== 1 ? 's' : ''}
                      </Badge>
                    ))}
                    {networksWithOffers.length > 8 && (
                      <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                        +{networksWithOffers.length - 8} more networks
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Display Mixed Network Offers */}
              {loadingOffers ? (
                <div className="text-center py-4 text-gray-400">Loading offers...</div>
              ) : offersToDisplay.length === 0 ? (
                <div className="text-center py-4 text-gray-400">No offers found.</div>
              ) : (
                <>
                  {paginatedOffers.map((offer, index) => {
                    const displayOffer = offer as Offer & { networkInfo?: Network };
                    const networkName = displayOffer.networkInfo?.name || displayOffer.networks?.name || 'Unknown Network';
                    
                    return (
                      <Card
                        key={`mixed-${offer.id}-${shuffleKey}-${index}`}
                        className={`p-3 w-full hover:shadow-md transition-shadow border-gray-800 ${
                          offer.is_active ? "bg-gray-900" : "bg-gray-800"
                        } max-w-full sm:max-w-[95%] mx-auto`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              offer.networks?.logo_url ||
                              `https://placehold.co/32x32/333333/666666?text=${(
                                offer.networks?.name || "N"
                              ).charAt(0)}`
                            }
                            alt={offer.networks?.name || "Network Logo"}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-medium text-white text-sm truncate">
                                {getDisplayValue(offer.name, "Unnamed Offer")}
                              </h3>
                              {!offer.is_active && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-gray-700 text-white px-1 py-0"
                                >
                                  Inactive
                                </Badge>
                              )}
                              {offer.is_featured && (
                                <Badge
                                  variant="default"
                                  className="text-xs bg-yellow-600 text-white px-1 py-0"
                                >
                                  Featured
                                </Badge>
                              )}
                              {/* Network Badge */}
                              <Badge
                                variant="outline"
                                className="text-xs border-blue-500 text-blue-300 px-2 py-1"
                              >
                                {networkName}
                              </Badge>
                              {/* Position indicator */}
                              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded font-medium">
                                #{index + 1 + (currentPage - 1) * OFFERS_PER_PAGE}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span 
                                className="text-xs text-gray-400 cursor-pointer hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNetworkClick(offer.network_id);
                                }}
                              >
                                Network: {networkName}
                              </span>
                              <div className="flex gap-1 flex-wrap">
                                {/* GEO, Vertical, and Tag Badges */}
                                {toStringArray(offer.geo_targets, false)
                                  .slice(0, 2)
                                  .map((geo, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs px-1 py-0 border-gray-700 text-gray-300"
                                    >
                                      {geo}
                                    </Badge>
                                  ))}
                                {toStringArray(offer.vertical, false)
                                  .slice(0, 2)
                                  .map((vertical, idx) => (
                                    <Badge
                                      key={`vertical-${idx}`}
                                      variant="outline"
                                      className="text-xs px-1 py-0 border-green-700 text-green-300"
                                    >
                                      {vertical}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-primary mb-1">
                              {getDisplayValue(offer.payout_currency, "USD")}{" "}
                              {typeof offer.payout_amount === "number"
                                ? offer.payout_amount.toFixed(2)
                                : getDisplayValue(offer.payout_amount, "0.00")}
                            </div>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary-hover text-white text-xs px-3 py-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/offer/${offer.id}`);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  
                  <PaginationControls />
                </>
              )}
            </div>
          )}

          {/* Networks List - Show only when no specific network is selected and in normal mode */}
          {!selectedNetworkFilter && displayMode === "normal" && (
            <div className="space-y-2">
              <div className="mb-4 p-3 bg-gray-900/80 rounded-lg border border-gray-700">
                <h4 className="font-medium mb-2 text-white">All Networks ({networksToDisplay.length} networks):</h4>
                <p className="text-sm text-gray-300">Click on a network to view its offers, or switch to "Network Mix" to see shuffled offers from all networks.</p>
              </div>

              {loadingNetworks ? (
                <div className="text-center py-4 text-gray-400">Loading networks...</div>
              ) : networksToDisplay.length === 0 ? (
                <div className="text-center py-4 text-gray-400">No networks found.</div>
              ) : (
                networksToDisplay.map((network) => (
                  <Card
                    key={network.id}
                    className="p-2 hover:shadow-md transition-shadow bg-gray-900 border-gray-800 w-full sm:max-w-full md:max-w-[50%] mx-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-2 items-center">
                      {/* Network Logo - Smaller */}
                      <img
                        src={
                          network.logo_url ||
                          `https://placehold.co/32x32?text=${network.name[0]}`
                        }
                        alt={network.name}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />

                      {/* Network Details - Compact layout */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <h3
                              className="font-medium text-xs text-white cursor-pointer hover:underline truncate"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNetworkClick(network.id);
                              }}
                            >
                              {network.name}
                            </h3>
                            <span className="text-xs text-yellow-400 font-medium">
                              #Ad
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-blue-900 hover:bg-gray-200 px-2 py-0.5 h-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNetworkFilter(network.name);
                            }}
                          >
                            View
                          </Button>
                        </div>

                        {/* Compact description and tags */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-300">
                            {offersCountByNetwork[network.id] || 0} Offers
                          </span>
                          <div className="flex gap-1">
                            {network.tags && network.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-700 text-white px-1 py-0.5 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Back Button and Offer Search Input */}
          {selectedNetworkFilter && (
            <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-3" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto px-4 py-2 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNetworkFilter(null);
                }}
              >
                Back to All Networks
              </Button>
              <div className="relative w-full sm:w-auto flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={`Search offers for ${selectedNetworkFilter}...`}
                  className="pl-10 h-8 text-sm bg-gray-800 border-gray-700 text-white w-full"
                  value={offerSearchTerm}
                  onChange={(e) => setOfferSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Offers Display - Enhanced with network info */}
          {selectedNetworkFilter && (
            <div className="space-y-2 mt-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Offers for {selectedNetworkFilter}
                {displayMode === "network-shuffle" && (
                  <Badge variant="outline" className="text-xs border-blue-500 text-blue-300">
                    Network Shuffled
                  </Badge>
                )}
              </h2>
              {offersToDisplay.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No offers found for this network.
                </div>
              ) : (
                <>
                  {paginatedOffers.map((offer, index) => {
                    const displayOffer = offer as Offer & { networkInfo?: Network };
                    const networkName = displayOffer.networkInfo?.name || displayOffer.networks?.name || 'Unknown Network';
                    
                    return (
                      <Card
                        key={`${offer.id}-${shuffleKey}-${index}`}
                        className={`p-3 w-full hover:shadow-md transition-shadow border-gray-800 ${
                          offer.is_active ? "bg-gray-900" : "bg-gray-800"
                        } max-w-full sm:max-w-[95%] mx-auto`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              offer.networks?.logo_url ||
                              `https://placehold.co/32x32/333333/666666?text=${(
                                offer.networks?.name || "N"
                              ).charAt(0)}`
                            }
                            alt={offer.networks?.name || "Network Logo"}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-white text-sm truncate">
                                {getDisplayValue(offer.name, "Unnamed Offer")}
                              </h3>
                              {!offer.is_active && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-gray-700 text-white px-1 py-0"
                                >
                                  Inactive
                                </Badge>
                              )}
                              {offer.is_featured && (
                                <Badge
                                  variant="default"
                                  className="text-xs bg-yellow-600 text-white px-1 py-0"
                                >
                                  Featured
                                </Badge>
                              )}
                              {/* NEW: Network Badge */}
                              {displayMode === "network-shuffle" && displayOffer.networkInfo && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-blue-500 text-blue-300 px-1 py-0"
                                >
                                  {networkName}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span 
                                className="text-xs text-gray-400 cursor-pointer hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNetworkClick(offer.network_id);
                                }}
                              >
                                {networkName}
                              </span>
                              {/* NEW: Position indicator for network shuffle */}
                              {displayMode === "network-shuffle" && !selectedNetworkFilter && (
                                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                                  #{index + 1 + (currentPage - 1) * OFFERS_PER_PAGE}
                                </span>
                              )}
                              <div className="flex gap-1 flex-wrap">
                                {/* GEO, Vertical, and Tag Badges */}
                                {toStringArray(offer.geo_targets, false)
                                  .slice(0, 2)
                                  .map((geo, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs px-1 py-0 border-gray-700 text-gray-300"
                                    >
                                      {geo}
                                    </Badge>
                                  ))}
                                {toStringArray(offer.vertical, false)
                                  .slice(0, 2)
                                  .map((vertical, idx) => (
                                    <Badge
                                      key={`vertical-${idx}`}
                                      variant="outline"
                                      className="text-xs px-1 py-0 border-green-700 text-green-300"
                                    >
                                      {vertical}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-primary mb-1">
                              {getDisplayValue(offer.payout_currency, "USD")}{" "}
                              {typeof offer.payout_amount === "number"
                                ? offer.payout_amount.toFixed(2)
                                : getDisplayValue(offer.payout_amount, "0.00")}
                            </div>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary-hover text-white text-xs px-3 py-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/offer/${offer.id}`);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  
                  <PaginationControls />
                </>
              )}
            </div>
          )}

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

        {/* Networks Sidebar - MODIFIED TO SHOW LIMITED NETWORKS */}
        <div className="w-full lg:w-80 flex-shrink-0 order-last lg:order-none">
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
            <div className="p-3 border-b border-gray-700" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search networks..."
                  className="pl-10 bg-gray-800 border-gray-700 text-white h-8 text-sm"
                  value={networkSearchTerm}
                  onChange={(e) => setNetworkSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-medium text-white flex items-center gap-2 text-sm">
                All Networks
                {!showAllNetworks && networksToDisplay.length > NETWORKS_DISPLAY_LIMIT && (
                  <span className="text-xs text-gray-400">
                    ({NETWORKS_DISPLAY_LIMIT} of {networksToDisplay.length})
                  </span>
                )}
              </h2>
              {networksToDisplay.length > NETWORKS_DISPLAY_LIMIT && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-400 hover:text-blue-300 hover:bg-gray-800 p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllNetworks(!showAllNetworks);
                  }}
                >
                  {showAllNetworks ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Show All ({networksToDisplay.length})
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <div className="space-y-0">
              {loadingNetworks ? (
                <div className="text-center py-4 text-gray-400">Loading networks...</div>
              ) : sidebarNetworksToDisplay.length === 0 ? (
                <div className="text-center py-4 text-gray-400">No networks found.</div>
              ) : (
                sidebarNetworksToDisplay.map((network) => (
                  <div 
                    key={network.id} 
                    className="p-3 border-b border-gray-700 last:border-b-0 hover:bg-gray-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <img 
                        src={network.logo_url || `https://placehold.co/32x32/333333/666666?text=${network.name.charAt(0)}`}
                        alt={network.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 
                            className="font-medium text-white truncate cursor-pointer hover:underline text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNetworkClick(network.id);
                            }}
                          >
                            {getDisplayValue(network.name, "Unnamed Network")}
                          </h3>
                          <Button 
                            size="sm" 
                            className="bg-primary hover:bg-primary-hover text-white text-xs px-2 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNetworkClick(network.id);
                            }}
                          >
                            Join
                          </Button>
                        </div>
                        <div className="text-xs text-gray-400 mb-1">
                          {getDisplayValue(network.categories?.[0], "N/A")} • {getDisplayValue(network.type, "Unknown")}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>📊 {offersCountByNetwork[network.id] || 0} offers</span> 
                          <span>💰 {getDisplayValue(network.payment_frequency, "Unknown")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
      
      {fixedBottomBanners.length > 0 && <div className="h-20" />}
      <div>
        <Footer />
      </div>
    </div> 
  );
};

export default Browse;