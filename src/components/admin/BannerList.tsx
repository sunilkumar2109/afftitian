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
import {
  Edit,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Banner } from "@/types/admin";
import { useCountdown } from "@/hooks/useCountdown";

/* ================================
   BannerListWrapper 
   ================================ */
interface BannerListWrapperProps {
  banners: Banner[];
  onRefresh: () => void;
}

export const BannerListWrapper = ({ banners, onRefresh }: BannerListWrapperProps) => {
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  return (
    <div>
      {editingBanner !== null ? (
        <div className="space-y-4">
          {/* Back Arrow */}
          <div className="flex items-center space-x-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingBanner(null)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Banner List
            </Button>
          </div>

          {/* Banner Edit Form */}
          <BannerEditForm
            banner={editingBanner}
            onSave={() => {
              setEditingBanner(null);
              onRefresh();
            }}
            onCancel={() => setEditingBanner(null)}
          />
        </div>
      ) : (
        <BannerList
          banners={banners}
          onEdit={setEditingBanner}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};

/* ================================
   Pagination Component
   ================================ */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }: PaginationProps) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center space-x-1">
          {getPageNumbers().map((page, index) => (
            <div key={index}>
              {page === "..." ? (
                <span className="px-3 py-2 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className="w-10 h-8"
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

/* ================================
   BannerList
   ================================ */
interface BannerListProps {
  banners: Banner[];
  onEdit: (banner: Banner | null) => void;
  onRefresh: () => void;
}

export const BannerList = ({ banners, onEdit, onRefresh }: BannerListProps) => {
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "",
    direction: null,
  });

  const [activeTab, setActiveTab] = useState<"rotation" | "single">("rotation");

  // Pagination states
  const [rotationCurrentPage, setRotationCurrentPage] = useState(1);
  const [singleCurrentPage, setSingleCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleDelete = async (banner: Banner) => {
    try {
      const table = banner.is_rotation ? "banner_rotations" : "banners";
      const { error } = await supabase.from(table).delete().eq("id", banner.id);
      if (error) throw error;

      toast({ title: "Success", description: "Banner deleted successfully" });
      onRefresh();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const table = banner.is_rotation ? "banner_rotations" : "banners";
      const { error } = await supabase
        .from(table)
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);

      if (error) throw error;
      toast({
        title: `Banner ${!banner.is_active ? "Activated" : "Deactivated"}`,
      });
      onRefresh();
    } catch (err) {
      console.error("Error updating banner status:", err);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedBanners = [...banners].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    let valA: any = "";
    let valB: any = "";

    switch (sortConfig.key) {
      case "position":
        valA = a.section || "";
        valB = b.section || "";
        break;
      case "expiry":
        valA = a.expires_at || "";
        valB = b.expires_at || "";
        break;
      case "created":
        valA = a.created_at || "";
        valB = b.created_at || "";
        break;
    }

    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const rotationBanners = sortedBanners.filter((b) => b.is_rotation);
  const singleBanners = sortedBanners.filter((b) => !b.is_rotation);

  const rotationTotalPages = Math.ceil(rotationBanners.length / itemsPerPage);
  const rotationStartIndex = (rotationCurrentPage - 1) * itemsPerPage;
  const paginatedRotationBanners = rotationBanners.slice(rotationStartIndex, rotationStartIndex + itemsPerPage);

  const singleTotalPages = Math.ceil(singleBanners.length / itemsPerPage);
  const singleStartIndex = (singleCurrentPage - 1) * itemsPerPage;
  const paginatedSingleBanners = singleBanners.slice(singleStartIndex, singleStartIndex + itemsPerPage);

  const handleTabChange = (tab: "rotation" | "single") => {
    setActiveTab(tab);
    if (tab === "rotation") setRotationCurrentPage(1);
    else setSingleCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Banner List</h3>
        <Button onClick={() => onEdit(null)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Banner
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b pb-2">
        <button
          onClick={() => handleTabChange("rotation")}
          className={`px-4 py-2 font-medium rounded-t ${
            activeTab === "rotation"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-muted-foreground hover:text-blue-600"
          }`}
        >
          Rotation Banners ({rotationBanners.length})
        </button>
        <button
          onClick={() => handleTabChange("single")}
          className={`px-4 py-2 font-medium rounded-t ${
            activeTab === "single"
              ? "text-green-600 border-b-2 border-green-600"
              : "text-muted-foreground hover:text-green-600"
          }`}
        >
          Single Banners ({singleBanners.length})
        </button>
      </div>

      {/* Active Tab */}
      {activeTab === "rotation" ? (
        <BannerTable
          banners={paginatedRotationBanners}
          onEdit={onEdit}
          onDelete={handleDelete}
          onToggle={handleToggleActive}
        />
      ) : (
        <BannerTable
          banners={paginatedSingleBanners}
          onEdit={onEdit}
          onDelete={handleDelete}
          onToggle={handleToggleActive}
        />
      )}
    </div>
  );
};

/* ================================
   BannerTable + BannerRow
   ================================ */
const BannerTable = ({
  banners,
  onEdit,
  onDelete,
  onToggle,
}: {
  banners: Banner[];
  onEdit: (banner: Banner | null) => void;
  onDelete: (banner: Banner) => void;
  onToggle: (banner: Banner) => void;
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Type</TableHead>
        <TableHead>Image / Name</TableHead>
        <TableHead>Preview</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Created</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {banners.length > 0 ? (
        banners.map((banner) => (
          <BannerRow
            key={banner.id}
            banner={banner}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={6} className="text-center text-muted-foreground">
            No banners found.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

const BannerRow = ({
  banner,
  onEdit,
  onDelete,
  onToggle,
}: {
  banner: Banner;
  onEdit: (banner: Banner | null) => void;
  onDelete: (banner: Banner) => void;
  onToggle: (banner: Banner) => void;
}) => {
  return (
    <TableRow>
      <TableCell>{banner.is_rotation ? "Rotation" : "Single"}</TableCell>
      <TableCell>
        {banner.image_url ? (
          <img src={banner.image_url} alt="Banner" className="h-12 w-20 object-cover rounded" />
        ) : (
          "No Image"
        )}
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(banner.image_url || banner.link_url, "_blank")}
        >
          <Eye className="h-4 w-4 mr-1" /> Preview
        </Button>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant={banner.is_active ? "default" : "secondary"}
          onClick={() => onToggle(banner)}
        >
          {banner.is_active ? "Turn Off" : "Turn On"}
        </Button>
      </TableCell>
      <TableCell>{banner.created_at ? new Date(banner.created_at).toLocaleDateString() : "—"}</TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(banner)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(banner)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

/* ================================
   BannerEditForm (sample)
   ================================ */
const BannerEditForm = ({
  banner,
  onSave,
  onCancel,
}: {
  banner: Banner | null;
  onSave: () => void;
  onCancel: () => void;
}) => {
  return (
    <div className="border rounded p-4 space-y-4">
      <h2 className="text-lg font-semibold">
        {banner ? "Edit Banner" : "Add New Banner"}
      </h2>

      <input
        type="text"
        defaultValue={banner?.name || ""}
        placeholder="Banner Name"
        className="w-full border rounded p-2"
      />

      <div className="flex space-x-2">
        <Button onClick={onSave}>Save</Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
