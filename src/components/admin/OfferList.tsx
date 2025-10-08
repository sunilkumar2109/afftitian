import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Network, Offer, MasterData } from "@/types/admin";
import { Edit, Trash2, Search, Star } from "lucide-react";
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

  // 🔹 Filter offers by search term
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) =>
      offer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.vertical?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.networks?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.offer_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [offers, searchTerm]);

  // 🔹 Shuffle helper
  const shuffle = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  // 🔹 Round robin offers by network
  const roundRobinOffers = useMemo(() => {
    const grouped: Record<string, Offer[]> = {};
    filteredOffers.forEach((offer) => {
      const net = offer.networks?.name || "Unknown";
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

  // 🔹 Copy Offer ID
  const copyOfferId = (id: string | number) => {
    navigator.clipboard.writeText(String(id));
    toast({
      title: "Copied!",
      description: `Offer ID ${id} copied to clipboard.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Offers ({offers.length})
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search offers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {roundRobinOffers.map((offer, index) => (
            <div
              key={offer.id}
              className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              {/* Left Content */}
              <div className="flex-1">
                {/* Offer Number + Name + ID */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                 <span className="font-semibold text-gray-400 text-sm w-8">
  #{offer.offer_number ?? index + 1}
</span>


                  <h3 className="font-semibold text-base flex items-center gap-2">
                    {offer.name}
                    {offer.offer_id && (
                      <span
                        onClick={() => copyOfferId(offer.offer_id)}
                        className="text-xs text-gray-500 cursor-pointer hover:underline"
                        title="Click to copy Offer ID"
                      >
                        (ID: {offer.offer_id})
                      </span>
                    )}
                  </h3>

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
                </div>

                {/* Vertical */}
                {offer.vertical && (
                  <Badge variant="outline" className="mb-2">
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

                {/* Network / payout / priority */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                  <span>Network: {offer.networks?.name}</span>
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
                    {offer.geo_targets.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{offer.geo_targets.length - 5} more
                      </Badge>
                    )}
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
          ))}

          {roundRobinOffers.length === 0 && (
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
