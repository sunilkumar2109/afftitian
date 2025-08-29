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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : `${network ? "Update" : "Create"} Network`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NetworkForm;
