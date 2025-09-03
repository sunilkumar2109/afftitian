import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown, Search } from "lucide-react";
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
  section: string[];
  created_at: string;
  title?: string;
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
const logBannerClick = async (bannerId: string) => {
  console.log("Click detected for banner:", bannerId); // 👈 Add this

  try {
    const res = await fetch("https://booohlpwrvqtgvlngzrf.functions.supabase.co/log_click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banner_id: bannerId }),
    });

    console.log("Response status:", res.status); // 👈 Add this
    const data = await res.json();
    console.log("Response data:", data); // 👈 Add this
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

const SUPABASE_BANNERS_BASE =
  "https://booohlpwrvqtgvlngzrf.supabase.co/storage/v1/object/public/images/banners/";

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

  if (!currentBanner) return null;

  const isSidebar = section === "sidebar";
  const isFixed = section === "fixed-top" || section === "fixed-bottom";

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

  // Build full banner URL
  const bannerSrc = currentBanner.image_url?.startsWith("http")
    ? currentBanner.image_url
    : SUPABASE_BANNERS_BASE + currentBanner.image_url?.trim();

  console.log("Banner src:", bannerSrc);

  return (
    <div className={containerClass}>
<a
  href={currentBanner.link_url || "#"}
  target="_blank"
  rel="noopener noreferrer"
  className="block w-full"
  onClick={async (e) => {
    e.stopPropagation();
    await logBannerClick(currentBanner.id);
  }}
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
      </a>
    </div>
  );
};

// Sidebar version
const SidebarBannerDisplay = ({ banners }: { banners: Banner[] }) => {
  return (
    <div className="space-y-4">
      {banners.map((banner) => {
        const bannerSrc = banner.image_url?.startsWith("http")
          ? banner.image_url
          : SUPABASE_BANNERS_BASE + banner.image_url?.trim();

        return (
        <a
          key={banner.id}
          href={banner.link_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
          onClick={async (e) => {
            e.stopPropagation();
            await logBannerClick(banner.id);
          }}
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
          </a>
        );
      })}
    </div>
  );
};

const Browse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
  const [selectedBannerIds, setSelectedBannerIds] = useState<string[]>([]);
  const [networkSearchTerm, setNetworkSearchTerm] = useState("");
  // New state for offer search
  const [offerSearchTerm, setOfferSearchTerm] = useState("");
  // New state for global search
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");


  // Function to handle background click
  const handleBackgroundClick = () => {
    window.open("https://www.google.com", "_blank", "noopener,noreferrer");
  };

  // Function to handle network click navigation
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

        if (error) error;
        setAllBanners(data || []);
      } catch (error: any) {
        console.error("Error fetching banners:", error.message);
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

const offersToDisplay = getFilteredOffers();
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
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 transition-colors text-sm"
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
  
    return (
    <div 
      className="min-h-screen text-white bg-cover bg-center cursor-pointer" 
      style={{ backgroundImage: "url('https://i.pinimg.com/736x/cf/3a/c8/cf3ac842dcb713c45973de67c44d5e78.jpg')" }}
      onClick={handleBackgroundClick}
    >

      {/* TopBar with Logo */}
  <div
  className="relative"
  onClick={(e) => e.stopPropagation()}
>

        <TopBar />
        {/* Logo positioned in top left corner */}
        <div className="absolute top-20 left-10 z-50">
          <img 
            src="https://pepeleads.com/uploads/1756199032-7299397.png"
            alt="AffiTitans Logo" 
            className="h-12 w-auto object-contain"
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
        <div className="flex items-center gap-3 flex-wrap">
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

      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* Main Content Area */}
        <div className="flex-1">
          {/* Networks List - Reduced size */}
          {!selectedNetworkFilter && (
            <div className="space-y-2">
              {loadingNetworks ? (
                <div className="text-center py-4 text-gray-400">Loading networks...</div>
              ) : networksToDisplay.length === 0 ? (
                <div className="text-center py-4 text-gray-400">No networks found.</div>
              ) : (
                networksToDisplay.map((network) => (
                 <Card
  key={network.id}
  className="p-2 hover:shadow-md transition-shadow bg-gray-900 border-gray-800 max-w-[50%] mx-auto"
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

          {/* Offers under Selected Network */}
          {selectedNetworkFilter && (
            <div className="space-y-2 mt-4">
              <h2 className="text-lg font-bold text-white">
                Offers for {selectedNetworkFilter}
              </h2>
              {offersToDisplay.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No offers found for this network.
                </div>
              ) : (
                offersToDisplay.map((offer) => (
                  <Card
                    key={offer.id}
                    className={`p-3 hover:shadow-md transition-shadow border-gray-800 ${
                      offer.is_active ? "bg-gray-900" : "bg-gray-800"
                    }`}
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
                        </div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span 
                            className="text-xs text-gray-400 cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNetworkClick(offer.network_id);
                            }}
                          >
                            {getDisplayValue(offer.networks?.name, "Unknown Network")}
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
                ))
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

        {/* Networks Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0">
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
              <h2 className="font-medium text-white flex items-center gap-2 text-sm">
                All Networks
              </h2>
            </div>
            <div className="space-y-0">
              {loadingNetworks ? (
                <div className="text-center py-4 text-gray-400">Loading networks...</div>
              ) : networksToDisplay.length === 0 ? (
                <div className="text-center py-4 text-gray-400">No networks found.</div>
              ) : (
                networksToDisplay.map((network) => (
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