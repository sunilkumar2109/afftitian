import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Network, MasterData } from "@/types/admin";
import * as XLSX from "xlsx";


interface NetworkFormProps {
  onSuccess: () => void;
  masterData: MasterData | null;
  network?: Network;
}

const NetworkForm = ({ onSuccess, masterData, network }: NetworkFormProps) => {
  const [autoText, setAutoText] = useState("");
const [aiLoading, setAiLoading] = useState(false);

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const handleAIExtract = async () => {
  if (!autoText.trim()) return;
  setAiLoading(true);
  try {
    const res = await fetch("https://afftitans.onrender.com/api/parse-network-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: autoText }),
    });
    const data = await res.json();

    // Map fields into your formData
    setFormData(prev => ({
      ...prev,
      name: data.network_name || prev.name,
      website_link: data.website_link || prev.website_link,
      payment_frequency: data.payment_frequency || prev.payment_frequency,
      phone_number: data.phone_number || prev.phone_number,
      description: data.description || prev.description,
      // Add more fields as needed...
    }));

    alert("Auto-fill done! Review and save.");
  } catch (err) {
    console.error(err);
    alert("Error extracting fields");
  } finally {
    setAiLoading(false);
  }
};

const [formData, setFormData] = useState({
  name: network?.name || "",
  type: network?.type || "",
  description: network?.description || "",
  logo_url: network?.logo_url || "",
  website_link: network?.website_link || "",
  payment_frequency: network?.payment_frequency || "",
  payment_methods: network?.payment_methods?.join(", ") || "",
  categories: network?.categories?.join(", ") || "",
  tags: network?.tags?.join(", ") || "",
  is_active: network?.is_active ?? true,
  priority_order: network?.priority_order || 0,

  // 🆕 New fields
  number_of_offers: network?.number_of_offers || "",
  type_of_commission: network?.type_of_commission || "",
  minimum_withdrawal: network?.minimum_withdrawal || "",
  referral_commission: network?.referral_commission || "",
  tracking_software: network?.tracking_software || "",
  tracking_link: network?.tracking_link || "",
  payment_constancy: network?.payment_constancy || "",
  website_email: network?.website_email || "",
  facebook_id: network?.facebook_id || "",
  twitter_id: network?.twitter_id || "",
  linkedin_id: network?.linkedin_id || "",
  ceo: network?.ceo || "",
  headquarter: network?.headquarter || "",
  phone_number: network?.phone_number || "",
  affiliate_manager: network?.affiliate_manager || "",
  expiration_date: network?.expiration_date || "",
});


  // Handle single form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
const networkData = {
  name: formData.name,
  type: formData.type,
  description: formData.description || null,
  logo_url: formData.logo_url || null,
  website_link: formData.website_link || null,
  payment_frequency: formData.payment_frequency || null,
  payment_methods: formData.payment_methods
    ? formData.payment_methods.split(",").map(s => s.trim())
    : [],
  categories: formData.categories
    ? formData.categories.split(",").map(s => s.trim())
    : [],
  tags: formData.tags
    ? formData.tags.split(",").map(s => s.trim())
    : [],
  is_active: formData.is_active,
  priority_order: formData.priority_order,

  // 🆕 New fields
  number_of_offers: formData.number_of_offers || null,
  type_of_commission: formData.type_of_commission || null,
  minimum_withdrawal: formData.minimum_withdrawal || null,
  referral_commission: formData.referral_commission || null,
  tracking_software: formData.tracking_software || null,
  tracking_link: formData.tracking_link || null,
  payment_constancy: formData.payment_constancy || null,
  website_email: formData.website_email || null,
  facebook_id: formData.facebook_id || null,
  twitter_id: formData.twitter_id || null,
  linkedin_id: formData.linkedin_id || null,
  ceo: formData.ceo || null,
  headquarter: formData.headquarter || null,
  phone_number: formData.phone_number || null,
  affiliate_manager: formData.affiliate_manager || null,
  expiration_date: formData.expiration_date
  ? new Date(formData.expiration_date).toISOString()
  : null,

};

      let result;
      if (network) {
        result = await supabase.from("networks").update(networkData).eq("id", network.id);
      } else {
        result = await supabase.from("networks").insert([networkData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Network ${network ? "updated" : "created"} successfully`,
      });

      if (!network) {
        setFormData({
          name: "",
          type: "",
          description: "",
          logo_url: "",
          website_link: "",
          payment_frequency: "",
          payment_methods: "",
          categories: "",
          tags: "",
          is_active: true,
          priority_order: 0,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: `Failed to ${network ? "update" : "create"} network`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        // Map data from sheet to match your DB fields
        const formattedData = data.map(row => ({
          name: row.name || "",
          type: row.type || "",
          description: row.description || null,
          logo_url: row.logo_url || null,
          website_link: row.website_link || null,
          payment_frequency: row.payment_frequency || null,
          payment_methods: row.payment_methods
            ? String(row.payment_methods).split(",").map((s: string) => s.trim())
            : [],
          categories: row.categories
            ? String(row.categories).split(",").map((s: string) => s.trim())
            : [],
          tags: row.tags
            ? String(row.tags).split(",").map((s: string) => s.trim())
            : [],
          is_active: row.is_active === "true" || row.is_active === true,
          priority_order: Number(row.priority_order) || 0,
        }));

        const { error } = await supabase.from("networks").insert(formattedData);
        if (error) throw error;

        toast({
          title: "Upload Successful",
          description: `${formattedData.length} networks added from file`,
        });

        onSuccess();
      } catch (err) {
        console.error("File upload error:", err);
        toast({
          title: "Error",
          description: "Failed to process the file",
          variant: "destructive",
        });
      } finally {
        setFileLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };
// kkkk
  return (
    <Card>
      <CardHeader>
        <CardTitle>{network ? "Edit Network" : "Add New Network"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
  <label className="block mb-1 font-medium">Enter details in plain text; the system will intelligently pick and place them in the right boxes.</label>
  <textarea
    value={autoText}
    onChange={(e) => setAutoText(e.target.value)}
    placeholder="Paste text here..."
    className="w-full border p-2 rounded"
    rows={4}
  />
  <button
    onClick={handleAIExtract}
    disabled={aiLoading}
    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
  >
    {aiLoading ? "Extracting..." : "Extract"}
  </button>
</div>

        {/* File upload section */}
        {!network && (
          <div className="mb-4">
            <Label htmlFor="file_upload">Bulk Upload (CSV/XLSX)</Label>
            <Input
              id="file_upload"
              type="file"
              accept=".csv, .xlsx"
              onChange={handleFileUpload}
              disabled={fileLoading}
            />
            {fileLoading && <p className="text-sm text-gray-500">Uploading...</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Network Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Network Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {masterData?.network_types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="website_link">Website Link</Label>
              <Input
                id="website_link"
                type="url"
                value={formData.website_link}
                onChange={(e) => setFormData({ ...formData, website_link: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="payment_frequency">Payment Frequency</Label>
              <Select
                value={formData.payment_frequency}
                onValueChange={(value) => setFormData({ ...formData, payment_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {masterData?.payment_frequencies.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="payment_methods">Payment Methods (comma-separated)</Label>
            <Input
              id="payment_methods"
              value={formData.payment_methods}
              onChange={(e) => setFormData({ ...formData, payment_methods: e.target.value })}
              placeholder="PayPal, Wire Transfer, Bitcoin"
            />
          </div>

          <div>
            <Label htmlFor="categories">Categories (comma-separated)</Label>
            <Input
              id="categories"
              value={formData.categories}
              onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
              placeholder="Health, Finance, Technology"
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="high-converting, trusted, global"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>


          </div>
          <div>
  <Label htmlFor="expiration_date">Expiration Date</Label>
  <Input
    id="expiration_date"
    type="date"
    value={formData.expiration_date ? formData.expiration_date.split("T")[0] : ""}
    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
  />
  <p className="text-xs text-gray-500">Default: 30 days from today</p>
</div>

          {/* 🆕 Additional Fields from Screenshot */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <Label htmlFor="number_of_offers">Number of Offers</Label>
    <Input
      id="number_of_offers"
      type="number"
      value={formData.number_of_offers}
      onChange={(e) => setFormData({ ...formData, number_of_offers: e.target.value })}
    />
  </div>

  <div>
    <Label htmlFor="type_of_commission">Type of Commission</Label>
    <Input
      id="type_of_commission"
      value={formData.type_of_commission}
      onChange={(e) => setFormData({ ...formData, type_of_commission: e.target.value })}
      placeholder="RevShare, Hybrid, CPA"
    />
  </div>

  <div>
    <Label htmlFor="minimum_withdrawal">Minimum Withdrawal</Label>
    <Input
      id="minimum_withdrawal"
      type="text"
      value={formData.minimum_withdrawal}
      onChange={(e) => setFormData({ ...formData, minimum_withdrawal: e.target.value })}
      placeholder="$20"
    />
  </div>

  <div>
    <Label htmlFor="referral_commission">Referral Commission</Label>
    <Input
      id="referral_commission"
      type="text"
      value={formData.referral_commission}
      onChange={(e) => setFormData({ ...formData, referral_commission: e.target.value })}
      placeholder="5%"
    />
  </div>

  <div>
    <Label htmlFor="tracking_software">Tracking Software</Label>
    <Input
      id="tracking_software"
      value={formData.tracking_software}
      onChange={(e) => setFormData({ ...formData, tracking_software: e.target.value })}
      placeholder="Self Tracker"
    />
  </div>

  <div>
    <Label htmlFor="tracking_link">Tracking Link</Label>
    <Input
      id="tracking_link"
      value={formData.tracking_link}
      onChange={(e) => setFormData({ ...formData, tracking_link: e.target.value })}
      placeholder="https://..."
    />
  </div>

  <div>
    <Label htmlFor="payment_constancy">Payment Constancy</Label>
    <Select
      value={formData.payment_constancy}
      onValueChange={(value) => setFormData({ ...formData, payment_constancy: value })}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select constancy" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Weekly">Weekly</SelectItem>
        <SelectItem value="Monthly">Monthly</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div>
    <Label htmlFor="website_email">Website Email ID</Label>
    <Input
      id="website_email"
      type="email"
      value={formData.website_email}
      onChange={(e) => setFormData({ ...formData, website_email: e.target.value })}
      placeholder="support@domain.com"
    />
  </div>

  <div>
    <Label htmlFor="facebook_id">Facebook ID</Label>
    <Input
      id="facebook_id"
      value={formData.facebook_id}
      onChange={(e) => setFormData({ ...formData, facebook_id: e.target.value })}
    />
  </div>

  <div>
    <Label htmlFor="twitter_id">Twitter ID</Label>
    <Input
      id="twitter_id"
      value={formData.twitter_id}
      onChange={(e) => setFormData({ ...formData, twitter_id: e.target.value })}
      placeholder="https://twitter.com/..."
    />
  </div>

  <div>
    <Label htmlFor="linkedin_id">LinkedIn ID</Label>
    <Input
      id="linkedin_id"
      value={formData.linkedin_id}
      onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
      placeholder="https://linkedin.com/company/..."
    />
  </div>

  <div>
    <Label htmlFor="ceo">Chief Executive Officer</Label>
    <Input
      id="ceo"
      value={formData.ceo}
      onChange={(e) => setFormData({ ...formData, ceo: e.target.value })}
    />
  </div>

  <div>
    <Label htmlFor="headquarter">Headquarter</Label>
    <Input
      id="headquarter"
      value={formData.headquarter}
      onChange={(e) => setFormData({ ...formData, headquarter: e.target.value })}
    />
  </div>

  <div>
    <Label htmlFor="phone_number">Phone Number</Label>
    <Input
      id="phone_number"
      type="tel"
      value={formData.phone_number}
      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
    />
  </div>

  <div>
    <Label htmlFor="affiliate_manager">Affiliate Manager</Label>
    <Input
      id="affiliate_manager"
      value={formData.affiliate_manager}
      onChange={(e) => setFormData({ ...formData, affiliate_manager: e.target.value })}
      placeholder="Name / Email"
    />
  </div>
</div>


          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : `${network ? "Update" : "Create"} Network`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NetworkForm;
