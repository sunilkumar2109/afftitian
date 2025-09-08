import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Banner } from "@/types/admin";
import { useCountdown } from "@/hooks/useCountdown";
import { BannerForm } from "./BannerForm"; // import your BannerForm component

interface BannerListProps {
  banners: Banner[];
  onRefresh: () => void;
}

export const BannerList = ({ banners, onRefresh }: BannerListProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"single" | "rotation">("single");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // State to handle popup for add/edit
  const [showForm, setShowForm] = useState(false);
  const [bannerToEdit, setBannerToEdit] = useState<Banner | null>(null);

  const handleDelete = async (banner: Banner) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    setDeletingId(banner.id);

    try {
      if (banner.is_rotation) {
        const { error } = await supabase
          .from("banner_rotations")
          .delete()
          .eq("id", banner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("banners")
          .delete()
          .eq("id", banner.id);
        if (error) throw error;
      }

      toast({
        title: "Deleted",
        description: banner.is_rotation
          ? "Rotation deleted successfully"
          : "Banner deleted successfully",
      });
      onRefresh();
    } catch (err) {
      console.error("Delete error:", err);
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (banner: Banner | null) => {
    setBannerToEdit(banner);
    setShowForm(true);
  };

  const singleBanners = banners.filter((b) => !b.is_rotation);
  const rotationBanners = banners.filter((b) => b.is_rotation);
  const displayedBanners = activeTab === "single" ? singleBanners : rotationBanners;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Banner List</h3>
        <Button onClick={() => handleEdit(null)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Banner
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-muted pb-2">
        <button
          className={`px-4 py-1 font-medium ${
            activeTab === "single"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("single")}
        >
          Single Banners
        </button>
        <button
          className={`px-4 py-1 font-medium ${
            activeTab === "rotation"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("rotation")}
        >
          Rotation Banners
        </button>
      </div>

      {/* Banner Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Image / Name</TableHead>
            <TableHead>Link / Expiry</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedBanners.map((banner) => (
            <BannerRow
              key={banner.id}
              banner={banner}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleting={deletingId === banner.id}
            />
          ))}
        </TableBody>
      </Table>

      {displayedBanners.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No {activeTab === "single" ? "single" : "rotation"} banners found.
        </div>
      )}

      {/* BannerForm Popup */}
      {showForm && (
        <BannerForm
          bannerToEdit={bannerToEdit}
          onSuccess={() => {
            setShowForm(false);
            setBannerToEdit(null);
            onRefresh();
          }}
          onCancel={() => {
            setShowForm(false);
            setBannerToEdit(null);
          }}
        />
      )}
    </div>
  );
};

const BannerRow = ({
  banner,
  onEdit,
  onDelete,
  deleting,
}: {
  banner: Banner;
  onEdit: (banner: Banner | null) => void;
  onDelete: (banner: Banner) => void;
  deleting: boolean;
}) => {
  const countdown = useCountdown(banner.expires_at);
  const isExpired = countdown === "Expired";

  const links: string[] = banner.link_urls || (banner.link_url ? [banner.link_url] : []);

  return (
    <TableRow>
      <TableCell>
        {banner.is_rotation ? (
          <span className="text-blue-600 font-medium">Rotation</span>
        ) : (
          <span className="text-green-600 font-medium">
            Single {banner.is_background ? "(Background)" : ""}
          </span>
        )}
      </TableCell>

      <TableCell>
        {banner.is_rotation ? (
          <span>{banner.name}</span>
        ) : banner.image_url ? (
          <img
            src={banner.image_url}
            alt="Banner"
            className="h-12 w-20 object-cover rounded"
          />
        ) : (
          <div className="h-12 w-20 bg-muted rounded flex items-center justify-center text-xs">
            No Image
          </div>
        )}
      </TableCell>

      <TableCell>
        {banner.is_rotation ? (
          <span className={isExpired ? "text-red-600 font-medium" : "text-blue-600"}>
            {countdown}
          </span>
        ) : (
          <div className="flex flex-col gap-1 max-w-xs">
            {links.length > 0 ? (
              links.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {url}
                </a>
              ))
            ) : (
              <span className="text-muted-foreground">No Link</span>
            )}
            {banner.expires_at && (
              <span
                className={`text-xs mt-1 ${isExpired ? "text-red-600 font-medium" : "text-blue-600"}`}
              >
                {countdown}
              </span>
            )}
          </div>
        )}
      </TableCell>

      <TableCell>{new Date(banner.created_at).toLocaleDateString()}</TableCell>

      <TableCell>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(banner)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(banner)}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
