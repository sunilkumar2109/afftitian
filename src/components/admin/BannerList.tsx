import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Banner } from "@/types/admin";
import { useCountdown } from "@/hooks/useCountdown";

interface BannerListProps {
  banners: Banner[];
  onEdit: (banner: Banner | null) => void;
  onRefresh: () => void;
}

export const BannerList = ({ banners, onEdit, onRefresh }: BannerListProps) => {
  const { toast } = useToast();

  const handleDelete = async (banner: Banner) => {
    try {
      if (banner.is_rotation) {
        const { error } = await supabase.from("banner_rotations").delete().eq("id", banner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").delete().eq("id", banner.id);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: banner.is_rotation ? "Rotation deleted successfully" : "Banner deleted successfully",
      });
      onRefresh();
    } catch (error) {
      console.error("Error deleting banner/rotation:", error);
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Banner List</h3>
        <Button onClick={() => onEdit(null)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Banner
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Image / Name</TableHead>
            <TableHead>{`Link / Expiry`}</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banners.map((banner) => (
            <BannerRow
              key={banner.id}
              banner={banner}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          ))}
        </TableBody>
      </Table>

      {banners.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No banners found. Add your first banner to get started.
        </div>
      )}
    </div>
  );
};
const BannerRow = ({
  banner,
  onEdit,
  onDelete,
}: {
  banner: Banner;
  onEdit: (banner: Banner | null) => void;
  onDelete: (banner: Banner) => void;
}) => {
  const countdown = useCountdown(banner.expires_at); // ✅ apply for both
  const isExpired = countdown === "Expired";

  return (
    <TableRow>
      <TableCell>
        {banner.is_rotation ? (
          <span className="text-blue-600 font-medium">Rotation</span>
        ) : (
          <span className="text-green-600 font-medium">Single</span>
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
          <div className="flex flex-col">
            {banner.link_urls && banner.link_urls.length > 0 ? (
  <div className="flex flex-col gap-1 max-w-xs">
    {banner.link_urls.map((url, idx) => (
      <a
        key={idx}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline truncate"
      >
        {url}
      </a>
    ))}
  </div>
) : banner.link_url ? (
  <a
    href={banner.link_url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline truncate max-w-xs"
  >
    {banner.link_url}
  </a>
) : (
  <span className="text-muted-foreground">No Link</span>
)}

            {banner.expires_at && (
              <span
                className={`text-xs mt-1 ${
                  isExpired ? "text-red-600 font-medium" : "text-blue-600"
                }`}
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
          {!banner.is_rotation && (
            <Button variant="outline" size="sm" onClick={() => onEdit(banner)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onDelete(banner)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
