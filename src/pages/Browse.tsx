import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, Search, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
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
  created_at: string;
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
  // REMOVED INSURANCE DEFAULT
  const [selectedOfferCategory, setSelectedOfferCategory] = useState<string>("🔥 Top Offers");
  // REMOVED INSURANCE DEFAULT
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>("");

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
  const [offersPerPage] = useState(15); // Increased from 10 to 15 since cards are smaller

  // Quick filter options - ALL OFFERS FIRST, INSURANCE IN MIDDLE, DUPLICATES ADDED
  const quickFilterOptions = [
    "All Offers", "Amount", "Date Added", "Duplicates", "Crypto", "Dating", "Gambling", "insurance", "Game", "COD", "Sweepstakes", 
    "SOI", "DOI", "CPA", "CPL", "CPI"
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
      } else if (filter === "Amount" || filter === "Date Added" || filter === "Duplicates") {
        // For sorting/special filters, keep current category or default to showing all
        setSelectedOfferCategory("All");
      } else {
        setSelectedOfferCategory(filter);
      }
      setCurrentPage(1);
    }
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
  
  // MODIFIED: Include insurance in the offer categories but removed as default
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
               searchableText.includes("app game");
      
      case "cod":
        return searchableText.includes("cod") || 
               searchableText.includes("call of duty") ||
               searchableText.includes("cash on delivery");
      
      case "sweepstakes":
        return searchableText.includes("sweepstakes") || 
               searchableText.includes("sweeps") || 
               searchableText.includes("contest") ||
               searchableText.includes("giveaway") ||
               searchableText.includes("prize");
      
      case "soi":
        return offerType.includes("soi") || 
               searchableText.includes("single opt") ||
               searchableText.includes("single opt-in");
      
      case "doi":
        return offerType.includes("doi") || 
               searchableText.includes("double opt") ||
               searchableText.includes("double opt-in");
      
      case "cpa":
        return offerType.includes("cpa") || 
               searchableText.includes("cost per action") ||
               searchableText.includes("cost per acquisition");
      
      case "cpl":
        return offerType.includes("cpl") || 
               searchableText.includes("cost per lead");
      
      case "cpi":
        return offerType.includes("cpi") || 
               searchableText.includes("cost per install");
      
      default:
        // For any other filter, do a general search
        return searchableText.includes(normalizedFilter);
    }
  };

  const getFilteredOffers = () => {
    let filtered = [...allOffers];

    if (selectedNetworkFilter && selectedNetworkFilter !== "All") {
      filtered = filtered.filter(offer => {
        const networkName = getDisplayValue(offer.networks?.name);
        return networkName === selectedNetworkFilter;
      });
    }

    if (selectedGeo && selectedGeo !== "Worldwide") {
      filtered = filtered.filter(offer => {
        const geoTargets = toStringArray(offer.geo_targets, false);
        return geoTargets.length === 0 || geoTargets.includes(selectedGeo);
      });
    }

    if (selectedVertical && selectedVertical !== "All") {
      filtered = filtered.filter(offer => {
        const verticals = toStringArray(offer.vertical, false);
        return verticals.length === 0 || verticals.includes(selectedVertical);
      });
    }

    // Apply quick filter if selected
    if (selectedQuickFilter && selectedQuickFilter !== "All Offers" && selectedQuickFilter !== "Amount" && selectedQuickFilter !== "Date Added" && selectedQuickFilter !== "Duplicates") {
      filtered = filtered.filter(offer => matchesFilter(offer, selectedQuickFilter));
    }

    // MODIFIED: Handle special cases for filtering and sorting
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
        return verticals.includes(selectedOfferCategory);
      });
    }

    // SPECIAL SORTING AND FILTERING FOR AMOUNT, DATE ADDED, AND DUPLICATES
    if (selectedQuickFilter === "Amount") {
      filtered = filtered.sort((a, b) => {
        const aAmount = typeof a.payout_amount === 'number' ? a.payout_amount : parseFloat(String(a.payout_amount)) || 0;
        const bAmount = typeof b.payout_amount === 'number' ? b.payout_amount : parseFloat(String(b.payout_amount)) || 0;
        return bAmount - aAmount; // Highest amount first
      });
    } else if (selectedQuickFilter === "Date Added") {
      filtered = filtered.sort((a, b) => {
        // Sort by created_at date (newest first)
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate; // Latest first
      });
    } else if (selectedQuickFilter === "Duplicates") {
      // Filter to show only duplicate offers
      const duplicateIds = detectDuplicateOffers(filtered);
      filtered = filtered.filter(offer => duplicateIds.has(offer.id));
      
      // Sort duplicates by name for easier comparison
      filtered = filtered.sort((a, b) => {
        const aName = getDisplayValue(a.name, "").toLowerCase();
        const bName = getDisplayValue(b.name, "").toLowerCase();
        return aName.localeCompare(bName);
      });
    }

    if (selectedOfferCategory !== "🔥 Top Offers") {
      // Sort by highest amount first, then by other criteria
      filtered = filtered.sort((a, b) => {
        const aAmount = typeof a.payout_amount === 'number' ? a.payout_amount : parseFloat(String(a.payout_amount)) || 0;
        const bAmount = typeof b.payout_amount === 'number' ? b.payout_amount : parseFloat(String(b.payout_amount)) || 0;
        
        // Sort by highest amount first
        if (aAmount !== bAmount) return bAmount - aAmount;
        
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

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center mt-6 space-x-2">
        <Button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-gray-800 text-white border-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
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
              className={currentPage === pageNum ? "bg-blue-600 text-white" : "bg-gray-800 text-white border-gray-700"}
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
            className="bg-gray-800 text-white border-gray-700"
          >
            {totalPages}
          </Button>
        )}
        
        <Button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-gray-800 text-white border-gray-700"
          >
          Next
          <ChevronRight className="w-4 h-4" />
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
          {/* Premium Quick Filter Buttons - Single Line Layout with Better Spacing */}
          <div className="mb-4 flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide pb-2" onClick={(e) => e.stopPropagation()}>
            {quickFilterOptions.map((filter) => (
              <button
                key={filter}
                className={`text-xs px-2 py-1 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105 whitespace-nowrap flex-shrink-0 min-w-max ${
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
          <div className="space-y-4">
            {/* Offer Search Input */}
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
                  Back to All Offers
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
            
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                {selectedQuickFilter === "All Offers" 
                  ? "All Offers" 
                  : selectedQuickFilter === "insurance"
                    ? "Insurance Offers"
                    : selectedQuickFilter === "Amount"
                      ? "Offers by Highest Amount"
                    : selectedQuickFilter === "Date Added"
                      ? "Latest Offers"
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
              <div className="text-center py-8 text-gray-400">Loading offers...</div>
            ) : currentOffers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No offers found. Try adjusting your filters.
              </div>
            ) : (
              <>
                {/* COMPACT OFFER CARDS - Much smaller height */}
                {currentOffers.map((offer) => (
                  <Card
                    key={offer.id}
                    className={`p-2 w-full hover:shadow-md transition-shadow border-gray-800 ${
                      offer.is_active ? "bg-gray-900" : "bg-gray-800"
                    } max-w-full sm:max-w-[600px] mx-auto`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-3">
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
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
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
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span 
                              className="cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNetworkClick(offer.network_id);
                              }}
                            >
                              {getDisplayValue(offer.networks?.name, "Unknown Network")}
                            </span>
                            
                            {/* Quick Tags - Only show first 2 */}
                            {toStringArray(offer.geo_targets, false).slice(0, 1).map((geo, idx) => (
                              <Badge
                                key={`geo-${idx}`}
                                variant="outline"
                                className="text-xs px-1 py-0 border-gray-600 text-gray-300 bg-gray-600/10"
                              >
                                {geo}
                              </Badge>
                            ))}
                            
                            {toStringArray(offer.vertical, false).slice(0, 1).map((vertical, idx) => (
                              <Badge
                                key={`vertical-${idx}`}
                                variant="outline"
                                className="text-xs px-1 py-0 border-green-600 text-green-300 bg-green-600/10"
                              >
                                {vertical}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Side - Payout and Action Button */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-400">
                            {getDisplayValue(offer.payout_currency, "USD")}{" "}
                            {typeof offer.payout_amount === "number"
                              ? offer.payout_amount.toFixed(2)
                              : getDisplayValue(offer.payout_amount, "0.00")}
                          </div>
                          {/* Always show date for every offer */}
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDate(offer.created_at)}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1"
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
                ))}
                
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

        {/* Networks Sidebar - MODIFIED: Show only icons */}
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
            
            <div className="p-3 border-b border-gray-700">
              <h2 className="font-medium text-white text-sm">All Networks</h2>
            </div>
            
            <div className="p-3">
              <div className="grid grid-cols-4 gap-3">
                {loadingNetworks ? (
                  <div className="text-center py-4 text-gray-400 col-span-4">Loading networks...</div>
                ) : networksToDisplay.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 col-span-4">No networks found.</div>
                ) : (
                  networksToDisplay.map((network) => (
                    <div
                      key={network.id}
                      className="flex flex-col items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNetworkFilter(network.name);
                        setCurrentPage(1);
                      }}
                      title={network.name}
                    >
                      <img
                        src={network.logo_url || `https://placehold.co/40x40/333333/666666?text=${network.name.charAt(0)}`}
                        alt={network.name}
                        className="w-10 h-10 rounded-full object-cover cursor-pointer"
                      />
                      <span className="text-xs text-white truncate w-full text-center mt-1">
                        {network.name}
                      </span>
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
      
      {fixedBottomBanners.length > 0 && <div className="h-20" />}
      <div>
        <Footer />
      </div>
    </div> 
  );
};

export default Browse;