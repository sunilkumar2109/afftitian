import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Plus } from "lucide-react";


import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// Define the new BannerFormData interface to support multiple sections and a size field
interface BannerFormData {
  image_url: string;
  link_urls?: string[]; 
  section: string[]; // Now an array of strings
  size: string; // New field for banner size in "width x height" format
   rotation_enabled?: boolean;
  rotation_group?: string | null;        // e.g., "home-top" or "sidebar"
  rotation_weight?: number | null;       // higher = show more often
  rotation_duration_ms?: number | null; 
}
// small preview interface
interface BannerPreview {
  id: string;
  title?: string;
  image_url?: string;
  link_urls?: string[]; 
  section?: string[] | string;
  created_at?: string;
}

interface BannerFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const BannerForm = ({ onSuccess, onCancel }: BannerFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string>("");
  const [uploadMethod, setUploadMethod] = useState<"upload" | "url">("upload");
  const { toast } = useToast();
  const [existingBanners, setExistingBanners] = useState<BannerPreview[]>([]);
  const [selectedBannerIds, setSelectedBannerIds] = useState<string[]>([]);
  const [rotationSectionSelect, setRotationSectionSelect] = useState<string>("top");
  const [expiryOption, setExpiryOption] = useState<"2h"|"1d"|"5d"|"custom">("1d");
  const [customExpiry, setCustomExpiry] = useState<string>(""); // for datetime-local
  const [bannerExpiry, setBannerExpiry] = useState("30d");
  
 useEffect(() => {
  const fetchExisting = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExistingBanners(data || []);
    } catch (err) {
      console.error("Error fetching existing banners:", err);
      toast({
        title: "Error",
        description: "Could not load existing banners.",
        variant: "destructive",
      });
    }
  };
  fetchExisting();
}, []); // run once

const {
  register,
  handleSubmit,
  formState: { errors },
  setValue,
  watch,
  control,   // <-- add this
} = useForm<BannerFormData>({
  defaultValues: {
    section: ["top"],
    size: "",
    rotation_enabled: false,
    rotation_group: "",
    rotation_weight: 1,
    rotation_duration_ms: 5000,
    link_urls: [""],   // <-- start with one empty input
  },
});
const { fields, append, remove } = useFieldArray({
  control,
  name: "link_urls" as const,
});

  const imageUrl = watch("image_url");
  const sections = watch("section");
  const size = watch("size");
    // NEW: rotation watches
  const rotationEnabled = watch("rotation_enabled");
  const rotationGroup = watch("rotation_group");
  const rotationWeight = watch("rotation_weight");
  const rotationDuration = watch("rotation_duration_ms");


  // Helper object to map sections to Tailwind CSS classes
  const sectionClasses = {
    top: "h-32 object-cover",
    footer: "h-20 object-cover",
    sidebar: "h-[400px] w-[400px] object-contain",
    "fixed-top": "h-20 object-cover",
    "fixed-bottom": "h-20 object-cover",
  };

  // ✅ File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `banners/banner-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("images") // bucket name
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath);

      if (!publicUrl) throw new Error("Could not get public URL");

      setUploadedImageUrl(publicUrl);
      setPreviewImage(URL.createObjectURL(file));
      setValue("image_url", publicUrl);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (err) {
      console.error("Error uploading image:", err);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearUploadedImage = () => {
    setUploadedImageUrl("");
    setPreviewImage("");
    setValue("image_url", "");
  };

  // ✅ Submit
 // ✅ Submit (supports both single banner and rotation)
const onSubmit = async (data: BannerFormData) => {
  const { size, ...bannerData } = data;

  // ❗ Validation for single banner (must have image)
  if (!rotationEnabled && !bannerData.image_url && !uploadedImageUrl) {
    toast({
      title: "Error",
      description: "Please provide an image URL or upload an image",
      variant: "destructive",
    });
    return;
  }

  setIsLoading(true);
  try {
    // === ROTATION CREATION ===
    if (rotationEnabled) {
      if (selectedBannerIds.length < 2) {
        toast({
          title: "Error",
          description: "Select at least 2 banners for rotation",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // calculate expiry date
      const now = new Date();
      let expiresAt: string | null = null;
      if (expiryOption === "2h") expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
      else if (expiryOption === "1d") expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      else if (expiryOption === "5d") expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
      else if (expiryOption === "custom" && customExpiry) expiresAt = new Date(customExpiry).toISOString();

      const rotationPayload = {
        name: `rotation-${Date.now()}`,
        banner_ids: selectedBannerIds,
        section: rotationSectionSelect,
        rotation_duration_ms: Number(rotationDuration) || 5000,
        expires_at: expiresAt,
      };

      const { error } = await supabase.from("banner_rotations").insert([rotationPayload]);
      if (error) throw error;

      toast({ title: "Success", description: "Rotation created successfully" });
      onSuccess();
      return; // stop here
    }

    // === SINGLE BANNER CREATION ===
const finalBannerData = {
  image_url: uploadedImageUrl || bannerData.image_url,
  link_urls: bannerData.link_urls?.filter((u) => u && u.trim() !== ""), // <-- array saved
  section: bannerData.section,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};


    const { error } = await supabase.from("banners").insert([finalBannerData]);
    if (error) throw error;

    toast({ title: "Success", description: "Banner created successfully" });
    onSuccess();
  } catch (error) {
    console.error("Error creating banner/rotation:", error);
    toast({
      title: "Error",
      description: "Failed to create banner/rotation",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};



  // Function to handle multi-select checkbox changes
  const handleSectionChange = (sectionName: string, isChecked: boolean) => {
    let updatedSections = [...sections];
    if (isChecked) {
      updatedSections.push(sectionName);
    } else {
      updatedSections = updatedSections.filter((s) => s !== sectionName);
    }
    setValue("section", updatedSections);
    
    // If the sidebar is selected, update the size field accordingly and disable it.
    if (updatedSections.includes("sidebar")) {
        setValue("size", "400x400");
    } else if (updatedSections.includes("fixed-top") || updatedSections.includes("fixed-bottom")) {
        setValue("size", "1200x80");
    } else {
        setValue("size", ""); // Reset size when sidebar is deselected
    }
  };
  
  // Determine which preview style to use based on selected sections and size
  let previewStyles = "";
  let dynamicStyles = {};
  if (sections.includes("sidebar")) {
    previewStyles = sectionClasses.sidebar;
  } else if (sections.includes("fixed-top") || sections.includes("fixed-bottom")) {
    previewStyles = sectionClasses["fixed-top"];
  } else if (sections.includes("top") || sections.includes("footer")) {
    // Parse width and height from the size string
    const [width, height] = (size || "auto").split("x").map(Number);
    
    // Apply Tailwind CSS classes for width and height dynamically
    dynamicStyles = {
        width: isNaN(width) ? '100%' : `${width}px`,
        height: isNaN(height) ? 'auto' : `${height}px`,
    };
    
    // Use `object-cover` to maintain aspect ratio
    previewStyles = `object-cover`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Banner</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section Selection (Updated to multi-select checkboxes) */}
          <div>
            <Label>Banner Section</Label>
            <div className="flex flex-col space-y-2 mt-2">
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="section-fixed-top"
                  checked={sections.includes("fixed-top")}
                  onCheckedChange={(checked) => handleSectionChange("fixed-top", !!checked)}
                />
                <Label htmlFor="section-fixed-top">Header (1200x80)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="section-top"
                  checked={sections.includes("top")}
                  onCheckedChange={(checked) => handleSectionChange("top", !!checked)}
                />
                <Label htmlFor="section-top">Top Section</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="section-footer"
                  checked={sections.includes("footer")}
                  onCheckedChange={(checked) => handleSectionChange("footer", !!checked)}
                />
                <Label htmlFor="section-footer">Footer Section</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="section-sidebar"
                  checked={sections.includes("sidebar")}
                  onCheckedChange={(checked) => handleSectionChange("sidebar", !!checked)}
                />
                <Label htmlFor="section-sidebar">Sidebar (400x400)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="section-fixed-bottom"
                  checked={sections.includes("fixed-bottom")}
                  onCheckedChange={(checked) => handleSectionChange("fixed-bottom", !!checked)}
                />
                <Label htmlFor="section-fixed-bottom">Fixed Bottom (1200x80)</Label>
              </div>
            </div>
            {sections.length === 0 && (
              <p className="text-sm text-destructive mt-1">
                Please select at least one section.
              </p>
            )}
          </div>

          {/* New Size Selection Field (Updated to a text input) */}
          <div>
            <Label>Banner Size (e.g., 400x400)</Label>
            <Input
              id="size"
              {...register("size", {
                required: "Size is required",
                pattern: {
                  value: /^\d+x\d+$/,
                  message: "Format must be 'widthxheight' (e.g., 400x400)",
                },
              })}
              placeholder="e.g., 800x200"
              disabled={sections.includes("sidebar") || sections.includes("fixed-top") || sections.includes("fixed-bottom")}
            />
            {errors.size && (
              <p className="text-sm text-destructive mt-1">
                {errors.size.message}
              </p>
            )}
          </div>

          {/* Upload Method */}
          <div className="space-y-2">
            <Label>Choose Image Method</Label>
            <div className="flex space-x-4">
              <Button
                type="button"
                variant={uploadMethod === "upload" ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadMethod("upload")}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
              <Button
                type="button"
                variant={uploadMethod === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadMethod("url")}
              >
                Enter URL
              </Button>
            </div>
          </div>

          {/* Upload Section */}
          {uploadMethod === "upload" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Upload Banner Image</Label>
                <div className="mt-2">
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-32 border-dashed border-2 hover:border-primary/50"
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                    disabled={isLoading}
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm">Click to upload banner image</p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Preview */}
              {previewImage && (
                <div className="relative">
                  <img
                    src={previewImage}
                    alt="Banner preview"
                    className={`${previewStyles} rounded-md border`}
                    style={dynamicStyles}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={clearUploadedImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* URL Section */}
          {uploadMethod === "url" && (
            <div>
              <Label htmlFor="image_url">Image URL *</Label>
              <Input
                id="image_url"
                {...register("image_url", {
                  required:
                    uploadMethod === "url" ? "Image URL is required" : false,
                })}
                placeholder="https://example.com/banner-image.jpg"
              />
              {errors.image_url && (
                <p className="text-sm text-destructive mt-1">
                  {errors.image_url.message}
                </p>
              )}

              {/* Preview */}
              {imageUrl && (
                <div className="mt-2">
                  <img
                    src={imageUrl}
                    alt="Banner preview"
                    className={`${previewStyles} rounded-md border`}
                    style={dynamicStyles}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Multiple Link URLs */}
<div>
  <Label>Link URLs (Optional)</Label>

  {fields.map((field, index) => (
    <div key={field.id} className="flex items-center gap-2 mt-2">
      <Input
        {...register(`link_urls.${index}` as const)}
        defaultValue={(field as any).value ?? ""} // field.value may not exist for older RHF versions
        placeholder="https://example.com/target-page"
      />
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => remove(index)}
        disabled={fields.length === 1} // keep at least one (optional)
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  ))}

  <Button
    type="button"
    variant="outline"
    size="sm"
    className="mt-2"
    onClick={() => append("")}
  >
    <Plus className="h-4 w-4 mr-1" /> Add Link
  </Button>
</div>

         
          <div>
  <Label>Banner Expiry</Label>
  <select
    value={bannerExpiry}
    onChange={(e) => setBannerExpiry(e.target.value)}
    className="mt-1 p-2 border rounded"
  >
   
    <option value="30d">30 days (default)</option>
    
  </select>
  {bannerExpiry === "custom" && (
    <Input
      type="datetime-local"
      onChange={(e) => setBannerExpiry(e.target.value)}
    />
  )}
</div>
          {/* === Rotation options === */}
<div className="mt-4 border rounded p-3">
  <div className="flex items-center gap-2 mb-3">
    <Checkbox
      id="rotation-enabled"
      checked={!!rotationEnabled}
      onCheckedChange={(v) => setValue("rotation_enabled", !!v)}
    />
    <Label htmlFor="rotation-enabled">Create Rotation (use existing banners)</Label>
  </div>

  {rotationEnabled && (
    <>
      <div className="mb-3">
        <Label>Choose existing banners (pick 2–5)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto p-2 border rounded mt-2">
          {existingBanners.length === 0 ? (
            <div className="text-sm text-muted-foreground">No banners found.</div>
          ) : (
            existingBanners.map(b => (
              <label key={b.id} className="flex items-center gap-2 p-1 cursor-pointer hover:bg-muted/20 rounded">
                <input
                  type="checkbox"
                  checked={selectedBannerIds.includes(b.id)}
                  onChange={() => {
                    setSelectedBannerIds(prev =>
                      prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id]
                    );
                  }}
                />
                <img src={b.image_url} alt={b.title} className="w-20 h-12 object-cover rounded" />
                <div className="text-sm truncate">
                  <div className="font-medium">{b.title || b.id}</div>
                  <div className="text-xs text-muted-foreground">{Array.isArray(b.section) ? b.section.join(",") : b.section}</div>
                </div>
              </label>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">You can also create a rotation using a newly uploaded banner by creating the banner first and then creating a rotation (optional).</p>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div>
          <Label>Rotation Section</Label>
          <select
            value={rotationSectionSelect}
            onChange={(e) => setRotationSectionSelect(e.target.value)}
            className="mt-1 p-2 border rounded"
          >
            <option value="top">Top</option>
            <option value="footer">Footer</option>
            <option value="sidebar">Sidebar</option>
            <option value="fixed-top">Fixed Top</option>
            <option value="fixed-bottom">Fixed Bottom</option>
          </select>
        </div>

        <div>
          <Label>Interval (ms)</Label>
          <Input
            {...register("rotation_duration_ms")}
            placeholder="e.g., 5000"
            className="mt-1"
            defaultValue={rotationDuration || 5000}
          />
          <p className="text-xs text-muted-foreground">Time between rotates (ms)</p>
        </div>
      </div>

      <div>
        <Label>Expiry (when rotation should stop / be deleted)</Label>
        <div className="flex items-center gap-2 mt-2">
          <Button type="button" size="sm" variant={expiryOption === "2h" ? "default" : "outline"} onClick={() => setExpiryOption("2h")}>2 hours</Button>
          <Button type="button" size="sm" variant={expiryOption === "1d" ? "default" : "outline"} onClick={() => setExpiryOption("1d")}>1 day</Button>
          <Button type="button" size="sm" variant={expiryOption === "5d" ? "default" : "outline"} onClick={() => setExpiryOption("5d")}>5 days</Button>
          <Button type="button" size="sm" variant={expiryOption === "custom" ? "default" : "outline"} onClick={() => setExpiryOption("custom")}>Custom</Button>

        </div>

        {expiryOption === "custom" && (
          <div className="mt-2">
            <Input type="datetime-local" value={customExpiry} onChange={(e) => setCustomExpiry(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Pick local date/time for expiry</p>
          </div>
        )}
      </div>
    </>
  )}
</div>
{/* === end rotation UI === */}


          


          {/* === end rotation UI === */}

{rotationEnabled ? (
  <div className="flex space-x-2 mt-4">
    <Button 
      type="submit" 
      disabled={isLoading || selectedBannerIds.length < 2}
      className="bg-primary text-white"
    >
      {isLoading ? "Creating..." : "Create Rotation"}
    </Button>
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
  </div>
) : (
  <div className="flex space-x-2 mt-4">
    <Button type="submit" disabled={isLoading || sections.length === 0}>
      {isLoading ? "Creating..." : "Create Banner"}
    </Button>
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
  </div>
)}

        </form>
      </CardContent>
    </Card>
  );
};