import { useState, useMemo } from "react";
import PayoutCornerWidget from "../ui/PayoutCornerWidget";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Network, Offer, MasterData } from "@/types/admin";
import { Edit, Trash2, Search, Star, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import OfferForm from "./OfferForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OfferListProps {
  offers: Offer[];
  networks: Network[];
  onUpdate: () => void;
  masterData: MasterData | null;
}

const OfferList = ({ offers, networks, onUpdate, masterData }: OfferListProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [offersPerPage] = useState(10);

  // -----------------------
  // Helpers (robust)
  // -----------------------

  // Safely convert different shapes of "vertical" to a single searchable string
  const verticalToString = (vertical: any) => {
    if (!vertical && vertical !== 0) return "";

    // If it's already a string, try JSON.parse (could be JSON string) else return directly
    if (typeof vertical === "string") {
      try {
        const parsed = JSON.parse(vertical);
        if (Array.isArray(parsed)) return parsed.join(", ");
        if (typeof parsed === "object") return JSON.stringify(parsed);
        return String(parsed);
      } catch {
        return vertical;
      }
    }
    if (Array.isArray(vertical)) return vertical.join(", ");
    if (typeof vertical === "object") {
      // if it's an object with tag array or name
      if (Array.isArray((vertical as any).value)) return (vertical as any).value.join(", ");
      return JSON.stringify(vertical);
    }
    return String(vertical);
  };

  // Robust network name resolver: handles offer.networks as object/array or uses networks prop fallback.
  const getNetworkName = (offer: Offer) => {
    // 1) If offer has a networks relation
    const rel = (offer as any).networks ?? (offer as any).network;
    if (rel) {
      // if relation is array, take first element
      if (Array.isArray(rel) && rel.length > 0) {
        const first = rel[0];
        if (first && (first.name || first.network_name)) return first.name || first.network_name;
      } else if (typeof rel === "object") {
        if (rel.name) return rel.name;
        if (rel.network_name) return rel.network_name;
      } else if (typeof rel === "string") {
        return rel;
      }
    }

    // 2) Some offers may have network_name directly
    if ((offer as any).network_name) return (offer as any).network_name;

    // 3) Use network_id to find from networks prop (coerce IDs to string for safety)
    const offerNetworkId = String((offer as any).network_id ?? (offer as any).networkId ?? "");
    const found = networks.find((n) => String(n.id) === offerNetworkId || String(n._id) === offerNetworkId || String(n.network_id) === offerNetworkId);
    if (found?.name) return found.name;

    // 4) Fallback
    return "Unknown Network";
  };

  // Enhanced toStringArray function to properly handle vertical data
  const toStringArray = (value: any, includeEmpty: boolean = false): string[] => {
    if (!value) return [];

    if (Array.isArray(value)) {
      const filtered = value
        .map((v) => {
          let str = String(v);
          str = str.replace(/^["'\[\]]+|["'\[\]]+$/g, "");
          str = str.replace(/\\"/g, '"');
          str = str.trim();
          return str;
        })
        .filter((v) => {
          if (includeEmpty) return true;
          return v && v !== "##" && v !== "null" && v !== "undefined" && v !== '""' && v !== "''" && v.trim() !== "";
        });
      return filtered;
    }

    if (typeof value === "string") {
      if (value.startsWith("[") && value.endsWith("]")) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const filtered = parsed
              .map((v) => {
                let str = String(v);
                str = str.replace(/^["'\[\]]+|["'\[\]]+$/g, "");
                str = str.replace(/\\"/g, '"');
                str = str.trim();
                return str;
              })
              .filter((v) => {
                if (includeEmpty) return true;
                return v && v !== "##" && v !== "null" && v !== "undefined" && v !== '""' && v !== "''" && v.trim() !== "";
              });
            return filtered;
          }
        } catch (e) {
          console.log("JSON parse failed for:", value);
          const filtered = value
            .replace(/^\[|\]$/g, "")
            .split(",")
            .map((v) => {
              let str = v.trim();
              str = str.replace(/^["']+|["']+$/g, "");
              str = str.replace(/\\"/g, '"');
              return str.trim();
            })
            .filter((v) => {
              if (includeEmpty) return true;
              return v && v !== "##" && v !== "null" && v !== "undefined" && v !== '""' && v !== "''" && v.trim() !== "";
            });
          return filtered;
        }
      }

      if (value.includes(",")) {
        const filtered = value
          .split(",")
          .map((v) => {
            let str = v.trim();
            str = str.replace(/^["'\[\]]+|["'\[\]]+$/g, "");
            str = str.replace(/\\"/g, '"');
            return str.trim();
          })
          .filter((v) => {
            if (includeEmpty) return true;
            return v && v !== "##" && v !== "null" && v !== "undefined" && v !== '""' && v !== "''" && v.trim() !== "";
          });
        return filtered;
      }

      let cleanValue = value.trim();
      cleanValue = cleanValue.replace(/^["'\[\]]+|["'\[\]]+$/g, "");
      cleanValue = cleanValue.replace(/\\"/g, '"');
      cleanValue = cleanValue.trim();

      if (
        includeEmpty ||
        (cleanValue !== "##" &&
          cleanValue !== "null" &&
          cleanValue !== "undefined" &&
          cleanValue !== '""' &&
          cleanValue !== "''" &&
          cleanValue !== "")
      ) {
        return [cleanValue];
      }
    }

    return [];
  };

  // -----------------------
  // Filtered Offers (safe + robust comparisons)
  // -----------------------
  const filteredOffers = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return offers ?? [];

    const searchLower = searchTerm.toLowerCase().trim();

    const norm = (v: any) => (v === null || v === undefined ? "" : String(v).toLowerCase().trim());

    return (offers ?? []).filter((offer) => {
      const nameStr = norm(offer.name);
      const typeStr = norm(offer.type);
      const offerIdStr = norm(offer.offer_id ?? offer.id ?? "");
      const verticalStr = norm(verticalToString(offer.vertical));

      const verticalArray = toStringArray(offer.vertical, false).map((v) => norm(v));
      const verticalMatch = verticalArray.some((v) => v.includes(searchLower));

      // --- NETWORK matching ---
      // try multiple fallbacks in case getNetworkName returns "Unknown Network"
      const resolvedNetwork = getNetworkName(offer);
      const networkName = norm(resolvedNetwork);
      const offerNetId = norm((offer as any).network_id ?? (offer as any).networkId ?? (offer as any).network ?? "");

      // find the matching network object by ID or name
      const foundNetwork =
        networks.find(
          (n) =>
            norm(n.id) === offerNetId ||
            norm(n._id) === offerNetId ||
            norm(n.network_id) === offerNetId ||
            norm(n.name) === networkName
        ) ?? null;

      const foundNetworkName = norm(foundNetwork?.name ?? "");
      const networkMatch =
        networkName.includes(searchLower) ||
        foundNetworkName.includes(searchLower) ||
        offerNetId.includes(searchLower);

      // --- MAIN MATCH CHECK ---
      return (
        nameStr.includes(searchLower) ||
        typeStr.includes(searchLower) ||
        offerIdStr.includes(searchLower) ||
        verticalStr.includes(searchLower) ||
        verticalMatch ||
        networkMatch
      );
    });
  }, [offers, searchTerm, networks]);

  // -----------------------
  // Network counts for search results
  // -----------------------
  const networkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (filteredOffers ?? []).forEach((offer) => {
      const networkName = getNetworkName(offer);
      counts[networkName] = (counts[networkName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOffers]);

  // Shuffle helper
  const shuffle = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  // Round robin offers by network (keeps UI behavior)
  const roundRobinOffers = useMemo(() => {
    const grouped: Record<string, Offer[]> = {};
    (filteredOffers ?? []).forEach((offer) => {
      const net = getNetworkName(offer);
      if (!grouped[net]) grouped[net] = [];
      grouped[net].push(offer);
    });

    Object.keys(grouped).forEach((net) => {
      grouped[net] = shuffle(grouped[net]);
    });

    let result: Offer[] = [];
    let hasOffers = true;
    while (hasOffers) {
      hasOffers = false;
      for (const net of Object.keys(grouped)) {
        if (grouped[net].length > 0) {
          result.push(grouped[net].shift()!);
          hasOffers = true;
        }
      }
    }
    return result;
  }, [filteredOffers]);

  // Pagination logic
  const indexOfLastOffer = currentPage * offersPerPage;
  const indexOfFirstOffer = indexOfLastOffer - offersPerPage;
  const currentOffers = roundRobinOffers.slice(indexOfFirstOffer, indexOfLastOffer);
  const totalPages = Math.ceil(roundRobinOffers.length / offersPerPage);

  const paginate = (pageNumber: number) => {
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (offer: Offer) => {
    try {
      const { error } = await supabase.from("offers").update({ is_active: !offer.is_active }).eq("id", offer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Offer ${offer.is_active ? "deactivated" : "activated"}`,
      });

      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to update offer status",
        variant: "destructive",
      });
    }
  };

  const toggleFeatured = async (offer: Offer) => {
    try {
      const { error } = await supabase.from("offers").update({ is_featured: !offer.is_featured }).eq("id", offer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Offer ${offer.is_featured ? "unfeatured" : "featured"}`,
      });

      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to update offer featured status",
        variant: "destructive",
      });
    }
  };

  const deleteOffer = async (offer: Offer) => {
    try {
      const { error } = await supabase.from("offers").delete().eq("id", offer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Offer deleted successfully",
      });

      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete offer",
        variant: "destructive",
      });
    }
  };

  // Copy Offer ID
  const copyOfferId = (id: string | number) => {
    navigator.clipboard.writeText(String(id));
    toast({
      title: "Copied!",
      description: `Offer ID ${id} copied to clipboard.`,
    });
  };

  // Pagination Component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center mt-6 space-x-2">
        <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} variant="outline" size="sm" className="flex items-center gap-1 h-8 px-3">
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
              className={`h-8 px-3 min-w-[2.5rem] ${currentPage === pageNum ? "bg-primary text-primary-foreground" : ""}`}
            >
              {pageNum}
            </Button>
          );
        })}

        {totalPages > 5 && currentPage < totalPages - 2 && <span className="text-muted-foreground">...</span>}

        {totalPages > 5 && currentPage < totalPages - 2 && (
          <Button onClick={() => paginate(totalPages)} variant="outline" size="sm" className="h-8 px-3">
            {totalPages}
          </Button>
        )}

        <Button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} variant="outline" size="sm" className="flex items-center gap-1 h-8 px-3">
          Next
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            Offers ({offers.length})
            {roundRobinOffers.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Showing {indexOfFirstOffer + 1}-{Math.min(indexOfLastOffer, roundRobinOffers.length)} of {roundRobinOffers.length})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search offers..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Network Counts Section - Only show when searching */}
        {searchTerm && networkCounts.length > 0 && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Networks in Search Results</h3>
              <Badge variant="secondary" className="ml-2">
                {networkCounts.length} network{networkCounts.length > 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {networkCounts.map(({ name, count }) => (
                <Badge key={name} variant="outline" className="flex items-center gap-1 px-3 py-1 bg-background">
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground">({count} offer{count > 1 ? "s" : ""})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search Summary - Show when searching */}
        {searchTerm && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Search results for "{searchTerm}"</span>
              </div>
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                {filteredOffers.length} offer{filteredOffers.length !== 1 ? "s" : ""} found
              </Badge>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {currentOffers.map((offer, index) => (
            <div key={offer.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left Content */}
              <div className="flex-1">
                {/* Offer Number + Name + ID */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-400 text-sm w-8">#{offer.offer_number ?? (indexOfFirstOffer + index + 1)}</span>

                  <h3 className="font-semibold text-base flex items-center gap-2">
                    {offer.name}
                    {offer.offer_id && (
                      <span onClick={() => copyOfferId(offer.offer_id)} className="text-xs text-gray-500 cursor-pointer hover:underline" title="Click to copy Offer ID">
                        (ID: {offer.offer_id})
                      </span>
                    )}
                  </h3>

                  <Badge variant={offer.is_active ? "default" : "secondary"}>{offer.is_active ? "Active" : "Inactive"}</Badge>

                  {offer.is_featured && (
                    <Badge variant="destructive" className="bg-yellow-500 hover:bg-yellow-600">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}

                  <Badge variant="outline">{offer.type}</Badge>
                </div>

                {/* Vertical */}
                {offer.vertical && (
                  <Badge variant="outline" className="mb-2">
                    {(() => {
                      try {
                        const val = typeof offer.vertical === "string" ? JSON.parse(offer.vertical) : offer.vertical;
                        return Array.isArray(val) ? val.join(", ") : val;
                      } catch {
                        return offer.vertical;
                      }
                    })()}
                  </Badge>
                )}

                {/* Network / payout / priority */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                  <span>Network: {getNetworkName(offer)}</span>
                  {offer.payout_amount && (
                    <span>
                      Payout: {offer.payout_amount} {offer.payout_currency}
                    </span>
                  )}
                  <span>Priority: {offer.priority_order}</span>
                </div>

                {/* GEO */}
                {offer.geo_targets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-sm text-muted-foreground">GEO:</span>
                    {offer.geo_targets.slice(0, 5).map((geo) => (
                      <Badge key={geo} variant="outline" className="text-xs">
                        {geo}
                      </Badge>
                    ))}
                    {offer.geo_targets.length > 5 && <Badge variant="outline" className="text-xs">+{offer.geo_targets.length - 5} more</Badge>}
                  </div>
                )}

                {/* Devices */}
                {offer.devices.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-sm text-muted-foreground">Devices:</span>
                    {offer.devices.map((device) => (
                      <Badge key={device} variant="outline" className="text-xs">
                        {device}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Landing Page */}
                {offer.landing_page_url && (
                  <div className="mt-2">
                    <a href={offer.landing_page_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                      View Landing Page
                    </a>
                  </div>
                )}
              </div>

              {/* Right Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant={offer.is_featured ? "default" : "outline"} size="sm" onClick={() => toggleFeatured(offer)}>
                  <Star className="h-4 w-4" />
                </Button>

                <Switch checked={offer.is_active} onCheckedChange={() => toggleActive(offer)} />

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setEditingOffer(offer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Offer</DialogTitle>
                    </DialogHeader>
                    <OfferForm
                      offer={editingOffer}
                      networks={networks}
                      onSuccess={() => {
                        onUpdate();
                        setEditingOffer(null);
                      }}
                      masterData={masterData}
                    />
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Offer</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{offer.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteOffer(offer)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}

          {currentOffers.length === 0 && <div className="text-center py-8 text-muted-foreground">{searchTerm ? "No offers found matching your search." : "No offers found."}</div>}

          {/* Pagination */}
          <Pagination />
          <PayoutCornerWidget offers={filteredOffers} />
        </div>
      </CardContent>
    </Card>
  );
};

export default OfferList;
