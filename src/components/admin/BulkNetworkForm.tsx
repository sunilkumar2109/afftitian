import { useState } from "react";
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
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { MasterData } from "@/types/admin";

interface BulkNetworkFormProps {
  selectedIds: string[];
  masterData: MasterData | null;
  onSuccess: () => void;
}

type TriBool = "unchanged" | "true" | "false";

const BulkNetworkForm = ({
  selectedIds,
  masterData,
  onSuccess,
}: BulkNetworkFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    logo_url: "",
    website_link: "",
    payment_frequency: "",
    payment_methods: "",
    categories: "",
    tags: "",
    priority_order: "",
    number_of_offers: "",
    type_of_commission: "",
    minimum_withdrawal: "",
    referral_commission: "",
    tracking_software: "",
    tracking_link: "",
    payment_constancy: "",
    website_email: "",
    facebook_id: "",
    twitter_id: "",
    linkedin_id: "",
    ceo: "",
    headquarter: "",
    phone_number: "",
    affiliate_manager: "",
    expiration_date: "",
  });

  const [activeState, setActiveState] = useState<TriBool>("unchanged");

  const buildUpdatePayload = () => {
    const updateData: Record<string, any> = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== "") updateData[key] = value;
    });

    if (activeState === "true") updateData.is_active = true;
    if (activeState === "false") updateData.is_active = false;

    // Convert arrays
    if (formData.payment_methods)
      updateData.payment_methods = formData.payment_methods
        .split(",")
        .map((s) => s.trim());
    if (formData.categories)
      updateData.categories = formData.categories
        .split(",")
        .map((s) => s.trim());
    if (formData.tags)
      updateData.tags = formData.tags.split(",").map((s) => s.trim());

    if (formData.expiration_date)
      updateData.expiration_date = new Date(
        formData.expiration_date
      ).toISOString();

    return updateData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = buildUpdatePayload();
      if (Object.keys(payload).length === 0) {
        toast({ title: "No changes", description: "Fill at least one field." });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("networks")
        .update(payload)
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedIds.length} networks successfully`,
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to update selected networks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit {selectedIds.length} Networks</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Leave blank to keep existing"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Leave unchanged" />
                </SelectTrigger>
                <SelectContent>
                  {masterData?.network_types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) =>
                  setFormData({ ...formData, logo_url: e.target.value })
                }
                placeholder="Leave blank"
              />
            </div>
            <div>
              <Label>Website Link</Label>
              <Input
                value={formData.website_link}
                onChange={(e) =>
                  setFormData({ ...formData, website_link: e.target.value })
                }
                placeholder="Leave blank"
              />
            </div>
            <div>
              <Label>Payment Frequency</Label>
              <Select
                value={formData.payment_frequency}
                onValueChange={(val) =>
                  setFormData({ ...formData, payment_frequency: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Leave unchanged" />
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
              <Label>Priority Order</Label>
              <Input
                type="number"
                value={formData.priority_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority_order: e.target.value,
                  })
                }
                placeholder="Leave blank"
              />
            </div>
          </div>

          {/* Text Fields */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Leave blank"
            />
          </div>
          <div>
            <Label>Payment Methods (comma separated)</Label>
            <Input
              value={formData.payment_methods}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  payment_methods: e.target.value,
                })
              }
              placeholder="PayPal, Wire Transfer"
            />
          </div>
          <div>
            <Label>Categories (comma separated)</Label>
            <Input
              value={formData.categories}
              onChange={(e) =>
                setFormData({ ...formData, categories: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
            />
          </div>

          {/* Extra Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Number of Offers</Label>
              <Input
                value={formData.number_of_offers}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    number_of_offers: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Type of Commission</Label>
              <Input
                value={formData.type_of_commission}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type_of_commission: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Minimum Withdrawal</Label>
              <Input
                value={formData.minimum_withdrawal}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minimum_withdrawal: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Referral Commission</Label>
              <Input
                value={formData.referral_commission}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    referral_commission: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Tracking Software</Label>
              <Input
                value={formData.tracking_software}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tracking_software: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Tracking Link</Label>
              <Input
                value={formData.tracking_link}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tracking_link: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Payment Constancy</Label>
              <Select
                value={formData.payment_constancy}
                onValueChange={(val) =>
                  setFormData({ ...formData, payment_constancy: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Leave unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Website Email</Label>
              <Input
                type="email"
                value={formData.website_email}
                onChange={(e) =>
                  setFormData({ ...formData, website_email: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Facebook ID</Label>
              <Input
                value={formData.facebook_id}
                onChange={(e) =>
                  setFormData({ ...formData, facebook_id: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Twitter ID</Label>
              <Input
                value={formData.twitter_id}
                onChange={(e) =>
                  setFormData({ ...formData, twitter_id: e.target.value })
                }
              />
            </div>
            <div>
              <Label>LinkedIn ID</Label>
              <Input
                value={formData.linkedin_id}
                onChange={(e) =>
                  setFormData({ ...formData, linkedin_id: e.target.value })
                }
              />
            </div>
            <div>
              <Label>CEO</Label>
              <Input
                value={formData.ceo}
                onChange={(e) =>
                  setFormData({ ...formData, ceo: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Headquarter</Label>
              <Input
                value={formData.headquarter}
                onChange={(e) =>
                  setFormData({ ...formData, headquarter: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Affiliate Manager</Label>
              <Input
                value={formData.affiliate_manager}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    affiliate_manager: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label>Expiration Date</Label>
            <Input
              type="date"
              value={formData.expiration_date}
              onChange={(e) =>
                setFormData({ ...formData, expiration_date: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Active State</Label>
            <Select
              value={activeState}
              onValueChange={(val: TriBool) => setActiveState(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Leave unchanged" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">Unchanged</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? "Saving..."
              : `Update ${selectedIds.length} Networks`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BulkNetworkForm;
