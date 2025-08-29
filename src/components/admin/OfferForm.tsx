import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  // Load XLSX from CDN if it's not already loaded
  useEffect(() => {
    if (typeof XLSX === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js';
      script.onload = () => console.log('XLSX loaded from CDN');
      script.onerror = (e) => console.error('Error loading XLSX:', e);
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

  // CHANGE 1: Helper function to clean and process string data
  const cleanAndSplit = (value: string): string[] => {
    if (!value || value.trim() === "" || value === "##") return [];
    return value.split(",")
      .map(s => s.trim())
      .map(s => s.replace(/^["'\[\]]+|["'\[\]]+$/g, '')) // Remove quotes and brackets from start/end
      .map(s => s.replace(/\\"/g, '"')) // Unescape quotes
      .filter(s => s && s !== "##" && s !== '""' && s !== "''");
  };
 // NAME → ID mapping helpers (paste below cleanAndSplit)
const networkNameToId = new Map(
  networks.map(n => [n.name.trim().toLowerCase(), n.id])
);
const networkIds = new Set(networks.map(n => n.id));

/**
 * Accepts either a network id or a network name.
 * - If it's already a known id -> return it.
 * - Else try to map by name (case-insensitive).
 * - If nothing matches -> return null and remember the name for reporting.
 */
const resolveNetworkId = (raw: any): { id: string | null; usedName?: string } => {
  const value = String(raw ?? "").trim();
  if (!value) return { id: null };

  // If it exactly matches a known id, use it.
  if (networkIds.has(value)) return { id: value };

  // Otherwise, try name → id
  const byName = networkNameToId.get(value.toLowerCase());
  return { id: byName ?? null, usedName: value };
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const offerData = {
        name: formData.name,
        network_id: formData.network_id,
        type: formData.type,
        payout_amount: formData.payout_amount || null,
        payout_currency: formData.payout_currency,
        devices: cleanAndSplit(formData.devices),
        vertical: cleanAndSplit(formData.vertical), // CHANGE 2: Use helper function
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
        result = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', offer.id);
      } else {
        result = await supabase
          .from('offers')
          .insert([offerData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Offer ${offer ? 'updated' : 'created'} successfully`,
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
      console.error('Error:', error);
      toast({
        title: "Error",
        description: `Failed to ${offer ? 'update' : 'create'} offer`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSheetImport = async () => {
  setFileLoading(true);
  try {
    if (typeof XLSX === "undefined") {
      console.error("XLSX is not loaded. Please wait or check CDN.");
      toast({
        title: "Error",
        description: "Spreadsheet library not loaded. Please try again.",
        variant: "destructive",
      });
      setFileLoading(false);
      return;
    }

    const CSV_URL =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmdaMr7n9hPynxTIDOlwD4zcb_cH35l88dq_Y21S4thuvTjfhntD_l4P9PNjI02cFJ3g0LEFI0dZsf/pub?gid=0&single=true&output=csv";

    const response = await fetch(CSV_URL);
    const csvText = await response.text();

    const workbook = XLSX.read(csvText, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    const jsonData: any[] = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    );

    const notFound: { row: number; network_name: string }[] = [];

    const formattedData = jsonData
      .map((row, idx) => {
        // Accept network_id, NetworkID, network_name, Network, NetworkName
        const rawNetwork =
          row.network_id ??
          row.NetworkID ??
          row.network_name ??
          row.Network ??
          row.NetworkName ??
          "";

        const { id: resolvedId, usedName } = resolveNetworkId(rawNetwork);
        if (!resolvedId) {
          notFound.push({ row: idx + 2, network_name: usedName || "" }); // +2 to include header row
          return null; // Skip this row
        }

        return {
          name: row.name || row.Name || "",
          network_id: resolvedId, // ✅ Always save ID to Supabase
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
      .filter(Boolean);

    if (formattedData.length === 0) {
      toast({
        title: "No rows imported",
        description:
          notFound.length > 0
            ? "All rows skipped due to unknown network names. Check your 'network_name' column."
            : "Sheet is empty or headers don’t match.",
        variant: "destructive",
      });
      setFileLoading(false);
      return;
    }

    const { error } = await supabase.from("offers").insert(formattedData as any[]);
    if (error) throw error;

    const skipped = notFound.length;
    toast({
      title: "Success",
      description:
        `Imported ${formattedData.length} offer(s).` +
        (skipped ? ` Skipped ${skipped} row(s) with unknown network name.` : ""),
    });
    if (skipped) {
      console.warn(
        "Unknown network names (1-based row numbers incl. header):",
        notFound
      );
    }

    onSuccess();
  } catch (error) {
    console.error("Google Sheet import error:", error);
    toast({
      title: "Error",
      description: "Failed to import offers from Google Sheet",
      variant: "destructive",
    });
  } finally {
    setFileLoading(false);
  }
};


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    try {
      if (typeof XLSX === 'undefined') {
        console.error("XLSX is not loaded. Please wait or check CDN.");
        toast({
          title: "Error",
          description: "Spreadsheet library not loaded. Please try again.",
          variant: "destructive",
        });
        setFileLoading(false);
        return;
      }
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      const formattedData = jsonData.map((row) => ({
        name: row.name || row.Name || "##",
        network_id: row.network_id || row.NetworkID || "##",
        type: row.type || row.Type || "##",
        payout_amount: row.payout_amount ? parseFloat(row.payout_amount) : "##",
        payout_currency: row.payout_currency || "##",
        devices: cleanAndSplit(row.devices || "##"), // CHANGE 5: Use helper function
        vertical: cleanAndSplit(row.vertical || "##"), // Clean vertical data from file upload
        geo_targets: cleanAndSplit(row.geo_targets || "##"),
        tags: cleanAndSplit(row.tags || "##"),
        image_url: row.image_url || "##",
        landing_page_url: row.landing_page_url || "##",
        is_active: row.is_active?.toString().toLowerCase() === "true",
        is_featured: row.is_featured?.toString().toLowerCase() === "true",
        priority_order: row.priority_order ? parseInt(row.priority_order) : "##",
      }));
      
      const { error } = await supabase.from("offers").insert(formattedData);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Offers uploaded successfully from file",
      });

      onSuccess();
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload offers from file",
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
        <CardTitle>{offer ? 'Edit Offer' : 'Add New Offer'}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Bulk Upload Section - Only for creating new offers */}
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
            {fileLoading && (
              <p className="text-sm text-gray-500 mt-1">Processing...</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Offer name */}
            <div>
              <Label htmlFor="name">Offer Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            {/* Network */}
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
            {/* Offer Type */}
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
                  {masterData?.offer_types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Vertical - Input field for comma-separated values */}
            <div>
              <Label htmlFor="vertical">Vertical (comma-separated)</Label>
              <Input
                id="vertical"
                value={formData.vertical}
                onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
                placeholder="Nutra, Dating, Gaming"
              />
            </div>
            {/* Payout Amount */}
            <div>
              <Label htmlFor="payout_amount">Payout Amount</Label>
              <Input
                id="payout_amount"
                type="number"
                step="0.01"
                value={formData.payout_amount}
                onChange={(e) => setFormData({ ...formData, payout_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            {/* Payout Currency */}
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
            {/* Image URL */}
            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
            {/* Landing Page URL */}
            <div>
              <Label htmlFor="landing_page_url">Landing Page URL</Label>
              <Input
                id="landing_page_url"
                type="url"
                value={formData.landing_page_url}
                onChange={(e) => setFormData({ ...formData, landing_page_url: e.target.value })}
              />
            </div>
            {/* Priority Order */}
            <div>
              <Label htmlFor="priority_order">Priority Order</Label>
              <Input
                id="priority_order"
                type="number"
                value={formData.priority_order}
                onChange={(e) => setFormData({ ...formData, priority_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Devices */}
          <div>
            <Label htmlFor="devices">Devices (comma-separated)</Label>
            <Input
              id="devices"
              value={formData.devices}
              onChange={(e) => setFormData({ ...formData, devices: e.target.value })}
              placeholder="Desktop, Mobile, Tablet"
            />
          </div>

          {/* Geo Targets */}
          <div>
            <Label htmlFor="geo_targets">Geo Targets (comma-separated country codes)</Label>
            <Input
              id="geo_targets"
              value={formData.geo_targets}
              onChange={(e) => setFormData({ ...formData, geo_targets: e.target.value })}
              placeholder="US, CA, GB, DE"
            />
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="high-converting, mobile-friendly, premium"
            />
          </div>

          {/* Switches */}
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
            {loading ? "Saving..." : `${offer ? 'Update' : 'Create'} Offer`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default OfferForm;