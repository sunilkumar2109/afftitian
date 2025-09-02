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

const BannerDisplay = ({ banners, section, intervalMs = 5000 }: { banners: Banner[], section: "top" | "footer" | "sidebar" | "fixed-top" | "fixed-bottom", intervalMs?: number }) => {
  const currentBanner = useRotatingBanners(banners, intervalMs);

// ADD this debug line (shows which URL is being rendered)
console.log("Rendering banner:", section, currentBanner?.image_url);


  if (!currentBanner) return null;

  const isSidebar = section === "sidebar";
  const isFixed = section === "fixed-top" || section === "fixed-bottom";

  let containerClass = "";
  let imageClass = "";

  switch (section) {
    case "fixed-top":
    case "header":
      containerClass = "w-full bg-black shadow-md";
      imageClass = "w-full h-16 sm:h-20 object-cover";
      break;
    case "fixed-bottom":
      containerClass = "fixed bottom-0 left-0 right-0 z-50 bg-black shadow-md";
      imageClass = "w-full h-16 sm:h-20 object-cover";
      break;
    case "sidebar":
      containerClass = "mb-4";
      imageClass = "w-full h-auto object-contain"; 
      break;
      
    case "top":
      containerClass = "my-4 flex justify-center sm:justify-end px-3"; 
      imageClass = "w-full max-w-[300px] h-[80px] sm:w-[900px] sm:h-[100px] object-contain";
      break;

    case "footer":
      containerClass = "my-6";
      imageClass = "w-full h-16 sm:h-20 object-cover";
      break;
  }

  return (
    <div className={containerClass}>
      <a
        href={currentBanner.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        <img
  src={(currentBanner.image_url || "").trim()}
  alt={`${section} banner`}
  className={`${imageClass} rounded-md`}
  onError={(e) => {
    // logs the exact URL that failed and hides the broken image
    console.error("Banner image failed to load:", (e.currentTarget as HTMLImageElement).src);
    (e.currentTarget as HTMLImageElement).style.display = "none";
  }}
/>

      </a>
    </div>
  );
};

const SidebarBannerDisplay = ({ banners }: { banners: Banner[] }) => {
  return (
    <div className="space-y-4">
      {banners.map((banner) => (
        <a
          key={banner.id}
          href={banner.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
        >
          <img
            src={banner.image_url}
            alt="Sidebar banner"
            className="w-full h-[200px] sm:h-[400px] object-contain rounded-md"
          />
        </a>
      ))}
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
  const [offerSearchTerm, setOfferSearchTerm] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState(""); // Single search for both networks and offers

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

  const getFilteredNetworks = () => {
    let filtered = allNetworks.filter(n => n.is_active);

    // Apply global search filter (searches both networks and offers)
    const lowerCaseGlobalSearch = globalSearchTerm.toLowerCase();
    if (lowerCaseGlobalSearch) {
      filtered = filtered.filter(network => {
        const networkName = getDisplayValue(network.name, "").toLowerCase();
        const networkDescription = getDisplayValue(network.description, "").toLowerCase();
        const networkType = getDisplayValue(network.type, "").toLowerCase();
        const networkCategories = (network.categories || []).join(' ').toLowerCase();
        const networkTags = (network.tags || []).join(' ').toLowerCase();
        
        return (
          networkName.includes(lowerCaseGlobalSearch) ||
          networkDescription.includes(lowerCaseGlobalSearch) ||
          networkType.includes(lowerCaseGlobalSearch) ||
          networkCategories.includes(lowerCaseGlobalSearch) ||
          networkTags.includes(lowerCaseGlobalSearch)
        );
      });
    }

    // Apply network search filter (for sidebar)
    const lowerCaseNetworkSearch = networkSearchTerm.toLowerCase();
    if (lowerCaseNetworkSearch) {
      filtered = filtered.filter(network =>
        network.name.toLowerCase().includes(lowerCaseNetworkSearch)
      );
    }

    return filtered;
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

    // Apply global search filter (searches both networks and offers)
    const lowerCaseGlobalSearch = globalSearchTerm.toLowerCase();
    if (lowerCaseGlobalSearch) {
      filtered = filtered.filter(offer => {
        const offerName = getDisplayValue(offer.name, "").toLowerCase();
        const offerVerticals = toStringArray(offer.vertical, false).map(v => v.toLowerCase()).join(' ');
        const offerGeos = toStringArray(offer.geo_targets, false).map(g => g.toLowerCase()).join(' ');
        const offerTags = toStringArray(offer.tags, false).map(t => t.toLowerCase()).join(' ');
        const networkName = getDisplayValue(offer.networks?.name, "").toLowerCase();
        const offerType = getDisplayValue(offer.type, "").toLowerCase();
        
        return (
          offerName.includes(lowerCaseGlobalSearch) ||
          offerVerticals.includes(lowerCaseGlobalSearch) ||
          offerGeos.includes(lowerCaseGlobalSearch) ||
          offerTags.includes(lowerCaseGlobalSearch) ||
          networkName.includes(lowerCaseGlobalSearch) ||
          offerType.includes(lowerCaseGlobalSearch)
        );
      });
    }

    // Apply offer search filter (when viewing specific network offers)
    const lowerCaseOfferSearch = offerSearchTerm.toLowerCase();
    if (lowerCaseOfferSearch) {
      filtered = filtered.filter(offer => {
        const offerName = getDisplayValue(offer.name, "").toLowerCase();
        const offerVerticals = toStringArray(offer.vertical, false).map(v => v.toLowerCase()).join(' ');
        const offerGeos = toStringArray(offer.geo_targets, false).map(g => g.toLowerCase()).join(' ');
        return (
          offerName.includes(lowerCaseOfferSearch) ||
          offerVerticals.includes(lowerCaseOfferSearch) ||
          offerGeos.includes(lowerCaseOfferSearch)
        );
      });
    }

    return filtered;
  };

  const offersToDisplay = getFilteredOffers();
  const networksToDisplay = getFilteredNetworks();
  const filteredNetworks = networksToDisplay;
  
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
      <div className="relative group">
        <Button 
          variant="outline" 
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-900 border-gray-700 text-white hover:bg-gray-800 transition-colors text-xs sm:text-sm w-full sm:w-auto"
        >
          <span className="font-medium truncate">{selected || title}</span>
          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-white flex-shrink-0" />
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
      className="min-h-screen bg-black text-white relative"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=2072&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background overlay for better content readability */}
      <div className="absolute inset-0 bg-black bg-opacity-80 z-0"></div>
      
      {/* All content wrapped in relative positioned container */}
      <div className="relative z-10">
        {/* TopBar with Logo */}
        <div className="relative">
          <TopBar />
          {/* Logo positioned responsively */}
          <div className="absolute top-16 sm:top-20 left-4 sm:left-10 z-50">
            <img 
              src="https://pepeleads.com/uploads/1756199032-7299397.png"
              alt="AffiTitans Logo" 
              className="h-8 sm:h-12 w-auto object-contain"
            />
          </div>
        </div>
        
        {/* Fixed Top Banners */}
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
        
        {/* Top Banners - Responsive alignment */}
        <div className="flex justify-center sm:justify-end px-3 sm:px-6 pt-4">
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

        {/* Header with All Filters in Single Line - Mobile responsive */}
        <div className="bg-gray-900 bg-opacity-95 border-b border-gray-700 px-3 sm:px-6 py-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {/* Dropdown Filters */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
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
            </div>

            {/* Search Filter - Single box for both networks and offers */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search networks and offers..."
                  className="pl-10 h-10 text-sm bg-gray-800 bg-opacity-95 border-gray-700 text-white w-full"
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Search Results Info */}
          {globalSearchTerm && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
              <span>Showing results for "{globalSearchTerm}"</span>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-3 sm:p-6">
          {/* Main Content Area */}
          <div className="flex-1 order-2 lg:order-1">
            <div className="mb-6">
            </div>

            <>
              {/* Networks List */}
              {!selectedNetworkFilter && (
                <div className="space-y-4">
                  {loadingNetworks ? (
                    <div className="text-center py-8 text-gray-400">Loading networks...</div>
                  ) : networksToDisplay.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      {globalSearchTerm ? `No networks found for "${globalSearchTerm}"` : "No networks found."}
                    </div>
                  ) : (
                    networksToDisplay.map((network) => (
                      <Card
                        key={network.id}
                        className="p-3 sm:p-4 hover:shadow-lg transition-shadow bg-gray-900 bg-opacity-95 backdrop-blur-sm"
                      >
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          {/* Network Logo */}
                          <div className="flex justify-center sm:justify-start">
                            <img
                              src={
                                network.logo_url ||
                                `https://placehold.co/60x60?text=${network.name[0]}`
                              }
                              alt={network.name}
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-md object-cover"
                            />
                          </div>

                          {/* Network Details */}
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              {/* Network name and Sponsored Ad */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <h3
                                  className="font-semibold text-base sm:text-lg text-white cursor-pointer hover:underline text-center sm:text-left"
                                  onClick={() => navigate(`/network/${network.id}`)}
                                >
                                  {network.name}
                                </h3>
                                <span className="text-xs text-yellow-400 font-semibold text-center sm:text-left">
                                  #Sponsored Ad
                                </span>
                              </div>

                              {/* View button */}
                              <Button
                                variant="outline"
                                className="text-xs bg-white text-blue-900 hover:bg-gray-200 w-full sm:w-auto"
                                onClick={() => setSelectedNetworkFilter(network.name)}
                              >
                                View
                              </Button>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-300 mt-1 line-clamp-2 sm:line-clamp-1 text-center sm:text-left">
                              {network.description}
                            </p>

                            {/* More Button */}
                            {network.description && network.description.length > 60 && (
                              <button
                                className="text-xs text-blue-400 hover:underline mt-1 block mx-auto sm:mx-0"
                                onClick={() => setSelectedNetworkFilter(network.name)}
                              >
                                More...
                              </button>
                            )}

                            {/* Offer Count + Tags */}
                            <div className="mt-2 flex items-center justify-center sm:justify-start flex-wrap gap-2">
                              <span className="text-xs text-gray-200">
                                {offersCountByNetwork[network.id] || 0} Offers
                              </span>
                              {network.tags && network.tags.length > 0 &&
                                network.tags.slice(0, 2).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded"
                                  >
                                    #{tag}
                                  </span>
                                ))
                              }
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Back Button - Mobile responsive */}
              {selectedNetworkFilter && (
                <div className="flex flex-col gap-3 mb-4">
                  <Button
                    variant="outline"
                    className="bg-red-600 hover:bg-red-700 text-white w-full"
                    onClick={() => setSelectedNetworkFilter(null)}
                  >
                    Back to All Networks
                  </Button>
                </div>
              )}

              {/* Offers under Selected Network - Mobile responsive */}
              {selectedNetworkFilter && (
                <div className="space-y-4 mt-6">
                  <h2 className="text-base sm:text-lg font-bold text-white text-center sm:text-left">
                    Offers for {selectedNetworkFilter}
                  </h2>
                  {offersToDisplay.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      {globalSearchTerm || offerSearchTerm ? 
                        `No offers found matching your search criteria.` :
                        "No offers found for this network."
                      }
                    </div>
                  ) : (
                    offersToDisplay.map((offer) => (
                      <Card
                        key={offer.id}
                        className={`p-3 sm:p-4 hover:shadow-md transition-shadow ${
                          offer.is_active ? "bg-gray-900 bg-opacity-95 backdrop-blur-sm" : "bg-gray-800 bg-opacity-95 backdrop-blur-sm"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <img
                              src={
                                offer.networks?.logo_url ||
                                `https://placehold.co/40x40/333333/666666?text=${(
                                  offer.networks?.name || "N"
                                ).charAt(0)}`
                              }
                              alt={offer.networks?.name || "Network Logo"}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                <h3 className="font-medium text-white text-sm sm:text-base truncate">
                                  {getDisplayValue(offer.name, "Unnamed Offer")}
                                </h3>
                                <div className="flex gap-1 flex-wrap">
                                  {!offer.is_active && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs bg-gray-700 text-white"
                                    >
                                      Inactive
                                    </Badge>
                                  )}
                                  {offer.is_featured && (
                                    <Badge
                                      variant="default"
                                      className="text-xs bg-yellow-600 text-white"
                                    >
                                      Featured
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs sm:text-sm text-gray-400 mb-2">
                                {getDisplayValue(offer.networks?.name, "Unknown Network")}
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {/* GEO Badges */}
                                {toStringArray(offer.geo_targets, false)
                                  .slice(0, 2)
                                  .map((geo, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs px-1 sm:px-2 py-0.5 border-gray-700 text-gray-300"
                                    >
                                      {geo}
                                    </Badge>
                                  ))}
                                {/* Vertical Badges */}
                                {toStringArray(offer.vertical, false)
                                  .slice(0, 2)
                                  .map((vertical, idx) => (
                                    <Badge
                                      key={`vertical-${idx}`}
                                      variant="outline"
                                      className="text-xs px-1 sm:px-2 py-0.5 border-green-700 text-green-300"
                                    >
                                      {vertical}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 flex-shrink-0">
                            <div className="text-base sm:text-lg font-bold text-primary">
                              {getDisplayValue(offer.payout_currency, "USD")}{" "}
                              {typeof offer.payout_amount === "number"
                                ? offer.payout_amount.toFixed(2)
                                : getDisplayValue(offer.payout_amount, "0.00")}
                            </div>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm px-3 sm:px-4"
                              onClick={() => navigate(`/offer/${offer.id}`)}
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
            </>
          </div>

          {/* Networks Sidebar - Mobile responsive */}
          <div className="w-full lg:w-80 flex-shrink-0 order-1 lg:order-2">
            <div className="bg-gray-900 bg-opacity-95 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
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
              
              <div className="p-3 sm:p-4 border-b border-gray-700">
                <h2 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                  All Networks
                </h2>
              </div>
              <div className="space-y-0">
                {loadingNetworks ? (
                  <div className="text-center py-4 text-gray-400">Loading networks...</div>
                ) : filteredNetworks.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    {networkSearchTerm || globalSearchTerm ? "No networks found matching your search." : "No networks found."}
                  </div>
                ) : (
                  filteredNetworks.map((network) => (
                    <div key={network.id} className="p-3 sm:p-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-800 hover:bg-opacity-75 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <img 
                          src={network.logo_url || `https://placehold.co/48x48/333333/666666?text=${network.name.charAt(0)}`}
                          alt={network.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1">
                            <h3 
                              className="font-medium text-white text-sm sm:text-base truncate cursor-pointer hover:underline"
                              onClick={() => navigate(`/network/${network.id}`)}
                            >
                              {getDisplayValue(network.name, "Unnamed Network")}
                            </h3>
                            <Button 
                              size="sm" 
                              className="bg-primary hover:bg-primary-hover text-white text-xs px-2 sm:px-3 py-1 w-full sm:w-auto"
                              onClick={() => setSelectedNetworkFilter(network.name)}
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

              {/* Video Section - Mobile responsive */}
              <div className="mt-4">
                <a 
                  href="https://3aadclw3tibrlpz41kywfl0ar9.hop.clickbank.net" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <video 
                    src="/vdo.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full rounded-none border-0 object-cover h-40 sm:h-auto"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fixed Bottom Banners */}
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
        
        {fixedBottomBanners.length > 0 && <div className="h-16 sm:h-20" />}
        <Footer />
      </div>
    </div> 
  );
};

export default Browse;