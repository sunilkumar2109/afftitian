import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Network, Offer, MasterData } from "@/types/admin";
import { Edit, Trash2, Search, Star, Shuffle } from "lucide-react";
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

interface NetworkWithOffers {
  network: Network;
  offers: Offer[];
  currentOfferIndex: number;
}

const OfferList = ({ offers, networks, onUpdate, masterData }: OfferListProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [displayMode, setDisplayMode] = useState<"all" | "network-shuffle">("network-shuffle");

  // Fisher-Yates shuffle function
  const shuffle = <T,>(array: T[]): T[] => {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Filter offers by search term
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) =>
      (offer.name || "")
        .toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (offer.type || "")
        .toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (offer.vertical || "")
        .toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (offer.networks?.name || "")
        .toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [offers, searchTerm]);

  // Group offers by network and create network-wise shuffled display
  const networksWithOffers = useMemo(() => {
    // Create a map of all networks
    const networkMap = new Map<string, NetworkWithOffers>();
    
    // Initialize all networks
    networks.forEach(network => {
      networkMap.set(network.id, {
        network,
        offers: [],
        currentOfferIndex: 0
      });
    });

    // Group filtered offers by network
    filteredOffers.forEach(offer => {
      const networkId = offer.networks?.id || offer.network_id || 'unknown';
      if (networkMap.has(networkId)) {
        networkMap.get(networkId)!.offers.push(offer);
      } else {
        // Handle offers with networks not in the networks list
        const unknownNetwork: Network = {
          id: networkId,
          name: offer.networks?.name || 'Unknown Network',
          // Add other required Network properties with defaults
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        networkMap.set(networkId, {
          network: unknownNetwork,
          offers: [offer],
          currentOfferIndex: 0
        });
      }
    });

    // Shuffle offers within each network
    networkMap.forEach(networkData => {
      if (networkData.offers.length > 0) {
        networkData.offers = shuffle(networkData.offers);
      }
    });

    // Return only networks that have offers
    return Array.from(networkMap.values()).filter(networkData => networkData.offers.length > 0);
  }, [filteredOffers, networks, shuffleKey]);

  // Create the final shuffled display based on selected mode
  const finalDisplayOffers = useMemo(() => {
    if (displayMode === "all") {
      // Show all filtered offers shuffled
      return shuffle(filteredOffers);
    }

    // Network-wise round-robin shuffled display
    const result: (Offer & { networkInfo: Network })[] = [];
    const maxOffersInAnyNetwork = Math.max(...networksWithOffers.map(nw => nw.offers.length));
    
    // Shuffle the order of networks for each round
    const shuffledNetworkOrder = shuffle([...networksWithOffers]);
    
    // Round-robin through networks
    for (let round = 0; round < maxOffersInAnyNetwork; round++) {
      // Shuffle network order for each round to create more randomness
      const currentRoundNetworks = shuffle([...shuffledNetworkOrder]);
      
      currentRoundNetworks.forEach(networkData => {
        if (networkData.offers[round]) {
          result.push({
            ...networkData.offers[round],
            networkInfo: networkData.network
          });
        }
      });
    }

    return shuffle(result); // Final shuffle of the entire result
  }, [networksWithOffers, filteredOffers, displayMode, shuffleKey]);

  // Debug logging
  useEffect(() => {
    console.log("Networks with offers:", networksWithOffers.map(nw => ({
      network: nw.network.name,
      offerCount: nw.offers.length,
      offers: nw.offers.map(o => ({ id: o.id, name: o.name }))
    })));
    
    console.log("Final display offers:", finalDisplayOffers.map(o => ({
      id: o.id,
      name: o.name,
      network: (o as any).networkInfo?.name || o.networks?.name
    })));
  }, [networksWithOffers, finalDisplayOffers]);

  const toggleActive = async (offer: Offer) => {
    try {
      const { error } = await supabase
        .from("offers")
        .update({ is_active: !offer.is_active })
        .eq("id", offer.id);

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
      const { error } = await supabase
        .from("offers")
        .update({ is_featured: !offer.is_featured })
        .eq("id", offer.id);

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
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offer.id);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <span>Offers ({finalDisplayOffers.length})</span>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search offers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            
            {/* Display Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={displayMode === "network-shuffle" ? "default" : "outline"}
                onClick={() => setDisplayMode("network-shuffle")}
              >
                Network Shuffle
              </Button>
              <Button
                size="sm"
                variant={displayMode === "all" ? "default" : "outline"}
                onClick={() => setDisplayMode("all")}
              >
                Show All
              </Button>
            </div>

            {/* Shuffle button */}
            <Button size="sm" onClick={() => setShuffleKey(k => k + 1)} className="flex items-center gap-1">
              <Shuffle className="h-4 w-4" />
              Shuffle
            </Button>
          </div>

          {/* Network Statistics */}
          <div className="text-sm text-muted-foreground">
            Networks with offers: {networksWithOffers.length}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Network Summary */}
        {displayMode === "network-shuffle" && networksWithOffers.length > 0 && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Network Distribution:</h4>
            <div className="flex flex-wrap gap-2">
              {networksWithOffers.map(nw => (
                <Badge key={nw.network.id} variant="outline" className="text-xs">
                  {nw.network.name}: {nw.offers.length} offer{nw.offers.length !== 1 ? 's' : ''}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {finalDisplayOffers.map((offer, index) => {
            const displayOffer = offer as Offer & { networkInfo?: Network };
            const networkName = displayOffer.networkInfo?.name || displayOffer.networks?.name || 'Unknown Network';
            
            return (
              <div
                key={`${offer.id}-${shuffleKey}-${index}`}
                className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                {/* Left Content */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold">{offer.name}</h3>
                    <Badge variant={offer.is_active ? "default" : "secondary"}>
                      {offer.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {offer.is_featured && (
                      <Badge variant="destructive" className="bg-yellow-500 hover:bg-yellow-600">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    <Badge variant="outline">{offer.type}</Badge>
                    {offer.vertical && (
                      <Badge variant="outline">
                        {(() => {
                          try {
                            const val =
                              typeof offer.vertical === "string"
                                ? JSON.parse(offer.vertical)
                                : offer.vertical;
                            return Array.isArray(val) ? val.join(", ") : val;
                          } catch {
                            return offer.vertical;
                          }
                        })()}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                    {/* Prominent Network Display */}
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-primary">Network:</span>
                      <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                        {networkName}
                      </Badge>
                    </div>
                    
                    {offer.payout_amount && (
                      <span>
                        Payout: {offer.payout_amount} {offer.payout_currency}
                      </span>
                    )}
                    <span>Priority: {offer.priority_order}</span>
                    {displayMode === "network-shuffle" && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Position #{index + 1}
                      </span>
                    )}
                  </div>

                  {offer.geo_targets?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-sm text-muted-foreground">GEO:</span>
                      {offer.geo_targets.slice(0, 5).map((geo) => (
                        <Badge key={geo} variant="outline" className="text-xs">
                          {geo}
                        </Badge>
                      ))}
                      {offer.geo_targets.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{offer.geo_targets.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {offer.devices?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-sm text-muted-foreground">Devices:</span>
                      {offer.devices.map((device) => (
                        <Badge key={device} variant="outline" className="text-xs">
                          {device}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {offer.landing_page_url && (
                    <div className="mt-2">
                      <a
                        href={offer.landing_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        View Landing Page
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={offer.is_featured ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFeatured(offer)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>

                  <Switch checked={offer.is_active} onCheckedChange={() => toggleActive(offer)} />

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingOffer(offer)}
                      >
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
                        <AlertDialogAction onClick={() => deleteOffer(offer)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}

          {finalDisplayOffers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No offers found matching your search." : "No offers found."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OfferList;