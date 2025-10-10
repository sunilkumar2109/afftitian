import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateUniqueOfferId } from "@/lib/generateOfferId";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Network, Offer, MasterData } from "@/types/admin";

declare const XLSX: any;

interface OfferFormProps {
  onSuccess: () => void;
  networks: Network[];
  masterData: MasterData | null;
  offer?: Offer;
}

const OfferForm = ({ onSuccess, networks, masterData, offer }: OfferFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  const offerTypeOptions = [
    "UA", "KE", "ES", "DE", "RU", "GR", "IT", "PL", "RO", "GE", "TR", "QA", 
    "SK", "PH", "BE", "EG", "PT"
  ];

  const verticalOptions = [
    "Crypto", "Dating", "Gambling", "Game", "COD", "Sweepstakes", "Insurance",
    "Incent", "Loan", "App", "Streaming", "Subscription", "Shopping", "HealthFree",
    "Trial", "RevShare", "Gaming", "Direct", "Email Optin", "Mobile", "Social", 
    "Supplement", "Nutra", "Health","sweepsone"
  ];

  // Load XLSX if needed
  useEffect(() => {
    if (typeof XLSX === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js';
      document.head.appendChild(script);
    }
  }, []);

  const [formData, setFormData] = useState({
    name: offer?.name || "",
    network_id: offer?.network_id || "",
    type: offer?.type || "",
    payout_amount: offer?.payout_amount || 0,
    payout_currency: offer?.payout_currency || "USD",
    devices: offer?.devices?.join(", ") || "",
    vertical: Array.isArray(offer?.vertical) ? offer?.vertical.join(", ") : (offer?.vertical || ""),
    geo_targets: offer?.geo_targets?.join(", ") || "",
    tags: offer?.tags?.join(", ") || "",
    image_url: offer?.image_url || "",
    landing_page_url: offer?.landing_page_url || "",
    is_active: offer?.is_active ?? true,
    is_featured: offer?.is_featured ?? false,
    priority_order: offer?.priority_order || 0,
  });

  const cleanAndSplit = (value: string): string[] => {
    if (!value || value.trim() === "" || value === "##") return [];
    return value.split(",").map(s => s.trim()).filter(Boolean);
  };

  const networkNameToId = new Map(networks.map(n => [n.name.trim().toLowerCase(), n.id]));
  const networkIds = new Set(networks.map(n => n.id));

  const resolveNetworkId = (raw: any): { id: string | null; usedName?: string } => {
    const value = String(raw ?? "").trim();
    if (!value) return { id: null };
    if (networkIds.has(value)) return { id: value };
    const byName = networkNameToId.get(value.toLowerCase());
    return { id: byName ?? null, usedName: value };
  };

  /** Handle manual form submission */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let newOfferId = offer?.offer_id;

      // ✅ Generate unique offer_id for NEW offers only
      if (!offer) {
        newOfferId = await generateUniqueOfferId();
      }

      const offerData = {
        offer_id: newOfferId,
        name: formData.name,
        network_id: formData.network_id,
        type: formData.type,
        payout_amount: formData.payout_amount || null,
        payout_currency: formData.payout_currency,
        devices: cleanAndSplit(formData.devices),
        vertical: cleanAndSplit(formData.vertical),
        geo_targets: cleanAndSplit(formData.geo_targets),
        tags: cleanAndSplit(formData.tags),
        image_url: formData.image_url || null,
        landing_page_url: formData.landing_page_url || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        priority_order: formData.priority_order,
      };

      let result;
      if (offer) {
        result = await supabase.from("offers").update(offerData).eq("id", offer.id);
      } else {
        result = await supabase.from("offers").insert([offerData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Offer ${offer ? "updated" : "created"} successfully with ID: ${newOfferId}`,
      });

      if (!offer) {
        setFormData({
          name: "",
          network_id: "",
          type: "",
          payout_amount: 0,
          payout_currency: "USD",
          devices: "",
          vertical: "",
          geo_targets: "",
          tags: "",
          image_url: "",
          landing_page_url: "",
          is_active: true,
          is_featured: false,
          priority_order: 0,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving offer:", error);
      toast({
        title: "Error",
        description: "Failed to save offer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /** Handle import from Google Sheet */
  const handleGoogleSheetImport = async () => {
    setFileLoading(true);
    try {
      if (typeof XLSX === "undefined") {
        toast({
          title: "Error",
          description: "Spreadsheet library not loaded. Please try again.",
          variant: "destructive",
        });
        setFileLoading(false);
        return;
      }

      const CSV_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRaZX_27PntpNo5T4TVmslAlRihUxrGJGyUH5LliT0VBn1bZD8CPZ4bYDwFHactzxQei2qMnm640r_R/pub?output=csv";

      const response = await fetch(CSV_URL);
      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const jsonData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const formattedData = await Promise.all(
        jsonData.map(async (row) => {
          const { id: resolvedId } = resolveNetworkId(
            row.network_id ?? row.NetworkID ?? row.network_name ?? row.Network ?? row.NetworkName ?? ""
          );

          // ✅ Generate unique offer_id for each row
          const offer_id = await generateUniqueOfferId();

          return {
            offer_id,
            name: row.name || row.Name || "",
            network_id: resolvedId,
            type: row.type || row.Type || "",
            payout_amount: parseFloat(row.payout_amount) || 0,
            payout_currency: row.payout_currency || "USD",
            devices: cleanAndSplit(row.devices || ""),
            vertical: cleanAndSplit(row.vertical || ""),
            geo_targets: cleanAndSplit(row.geo_targets || ""),
            tags: cleanAndSplit(row.tags || ""),
            image_url: row.image_url || "",
            landing_page_url: row.landing_page_url || "",
            is_active: row.is_active?.toString().toLowerCase() === "true",
            is_featured: row.is_featured?.toString().toLowerCase() === "true",
            priority_order: parseInt(row.priority_order) || 0,
          };
        })
      );

      const { error } = await supabase.from("offers").upsert(formattedData);
      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${formattedData.length} offer(s) successfully.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Google Sheet import error:", error);
      toast({
        title: "Error",
        description: "Failed to import offers.",
        variant: "destructive",
      });
    } finally {
      setFileLoading(false);
    }
  };

  /** Handle manual file upload */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      const formattedData = await Promise.all(
        jsonData.map(async (row) => ({
          // ✅ Generate unique offer_id for each row
          offer_id: await generateUniqueOfferId(),
          name: row.name || row.Name || "",
          network_id: row.network_id || "",
          type: row.type || "",
          payout_amount: parseFloat(row.payout_amount) || 0,
          payout_currency: row.payout_currency || "USD",
          devices: cleanAndSplit(row.devices || ""),
          vertical: cleanAndSplit(row.vertical || ""),
          geo_targets: cleanAndSplit(row.geo_targets || ""),
          tags: cleanAndSplit(row.tags || ""),
          image_url: row.image_url || "",
          landing_page_url: row.landing_page_url || "",
          is_active: row.is_active?.toString().toLowerCase() === "true",
          is_featured: row.is_featured?.toString().toLowerCase() === "true",
          priority_order: parseInt(row.priority_order) || 0,
        }))
      );

      const { error } = await supabase.from("offers").upsert(formattedData);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Offers uploaded successfully.",
      });

      onSuccess();
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload offers.",
        variant: "destructive",
      });
    } finally {
      setFileLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{offer ? "Edit Offer" : "Add New Offer"}</CardTitle>
      </CardHeader>
      <CardContent>
        {!offer && (
          <div className="mb-4 space-y-2">
            <Label>Bulk Upload Options</Label>
            <Input
              id="file_upload"
              type="file"
              accept=".csv, .xlsx"
              onChange={handleFileUpload}
              disabled={fileLoading}
            />
            <Button
              type="button"
              onClick={handleGoogleSheetImport}
              disabled={fileLoading}
              className="w-full"
            >
              {fileLoading ? "Importing..." : "Import from Google Sheet"}
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Offer Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="network_id">Network</Label>
              <Select
                value={formData.network_id}
                onValueChange={(value) => setFormData({ ...formData, network_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map((network) => (
                    <SelectItem key={network.id} value={network.id}>
                      {network.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Offer Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {offerTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vertical">Vertical</Label>
              <Select
                value={formData.vertical}
                onValueChange={(value) => setFormData({ ...formData, vertical: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vertical" />
                </SelectTrigger>
                <SelectContent>
                  {verticalOptions.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payout_amount">Payout Amount</Label>
              <Input
                id="payout_amount"
                type="number"
                step="0.01"
                value={formData.payout_amount}
                onChange={(e) =>
                  setFormData({ ...formData, payout_amount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label htmlFor="payout_currency">Payout Currency</Label>
              <Select
                value={formData.payout_currency}
                onValueChange={(value) => setFormData({ ...formData, payout_currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {masterData?.currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="devices">Devices (comma-separated)</Label>
            <Input
              id="devices"
              value={formData.devices}
              onChange={(e) => setFormData({ ...formData, devices: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="geo_targets">Geo Targets</Label>
            <Input
              id="geo_targets"
              value={formData.geo_targets}
              onChange={(e) => setFormData({ ...formData, geo_targets: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
              <Label htmlFor="is_featured">Featured</Label>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : offer ? "Update Offer" : "Create Offer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default OfferForm;