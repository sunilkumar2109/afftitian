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
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
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
              {page === '...' ? (
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

  const getSortIcon = (key: string) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? (
        <ChevronUp className="inline h-4 w-4 ml-1" />
      ) : (
        <ChevronDown className="inline h-4 w-4 ml-1" />
      );
    }
    return <ChevronDown className="inline h-4 w-4 ml-1 text-muted-foreground" />;
  };

  const rotationBanners = sortedBanners.filter((b) => b.is_rotation);
  const singleBanners = sortedBanners.filter((b) => !b.is_rotation);

  // Pagination logic for rotation banners
  const rotationTotalPages = Math.ceil(rotationBanners.length / itemsPerPage);
  const rotationStartIndex = (rotationCurrentPage - 1) * itemsPerPage;
  const rotationEndIndex = rotationStartIndex + itemsPerPage;
  const paginatedRotationBanners = rotationBanners.slice(rotationStartIndex, rotationEndIndex);

  // Pagination logic for single banners
  const singleTotalPages = Math.ceil(singleBanners.length / itemsPerPage);
  const singleStartIndex = (singleCurrentPage - 1) * itemsPerPage;
  const singleEndIndex = singleStartIndex + itemsPerPage;
  const paginatedSingleBanners = singleBanners.slice(singleStartIndex, singleEndIndex);

  // Reset pagination when switching tabs
  const handleTabChange = (tab: "rotation" | "single") => {
    setActiveTab(tab);
    if (tab === "rotation") {
      setRotationCurrentPage(1);
    } else {
      setSingleCurrentPage(1);
    }
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

      {/* Active Tab Content */}
      {activeTab === "rotation" ? (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Image / Name</TableHead>
                <TableHead onClick={() => handleSort("position")} className="cursor-pointer select-none">
                  Position {getSortIcon("position")}
                </TableHead>
                <TableHead onClick={() => handleSort("expiry")} className="cursor-pointer select-none">
                  Expiry {getSortIcon("expiry")}
                </TableHead>
                <TableHead onClick={() => handleSort("created")} className="cursor-pointer select-none">
                  Created {getSortIcon("created")}
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRotationBanners.length > 0 ? (
                paginatedRotationBanners.map((banner) => (
                  <BannerRow key={banner.id} banner={banner} onEdit={onEdit} onDelete={handleDelete} />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No rotation banners found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {rotationBanners.length > 0 && (
            <Pagination
              currentPage={rotationCurrentPage}
              totalPages={rotationTotalPages}
              onPageChange={setRotationCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={rotationBanners.length}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Image / Name</TableHead>
                <TableHead onClick={() => handleSort("position")} className="cursor-pointer select-none">
                  Position {getSortIcon("position")}
                </TableHead>
                <TableHead onClick={() => handleSort("expiry")} className="cursor-pointer select-none">
                  Link / Expiry {getSortIcon("expiry")}
                </TableHead>
                <TableHead onClick={() => handleSort("created")} className="cursor-pointer select-none">
                  Created {getSortIcon("created")}
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSingleBanners.length > 0 ? (
                paginatedSingleBanners.map((banner) => (
                  <BannerRow key={banner.id} banner={banner} onEdit={onEdit} onDelete={handleDelete} />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No single banners found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {singleBanners.length > 0 && (
            <Pagination
              currentPage={singleCurrentPage}
              totalPages={singleTotalPages}
              onPageChange={setSingleCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={singleBanners.length}
            />
          )}
        </div>
      )}
    </div>
  );
};

/* ================================
   BannerRow
   ================================ */
const BannerRow = ({
  banner,
  onEdit,
  onDelete,
}: {
  banner: Banner;
  onEdit: (banner: Banner | null) => void;
  onDelete: (banner: Banner) => void;
}) => {
  const countdown = useCountdown(banner.expires_at);
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
          <img src={banner.image_url} alt="Banner" className="h-12 w-20 object-cover rounded" />
        ) : (
          <div className="h-12 w-20 bg-muted rounded flex items-center justify-center text-xs">
            No Image
          </div>
        )}
      </TableCell>
      <TableCell>
        {banner.section ? (
          <span className="capitalize">
            {Array.isArray(banner.section) ? banner.section.join(", ") : banner.section}
          </span>
        ) : (
          <span className="text-muted-foreground">No Position</span>
        )}
      </TableCell>
      <TableCell>
        {banner.is_rotation ? (
          <span className={isExpired ? "text-red-600 font-medium" : "text-blue-600"}>
            {countdown}
          </span>
        ) : (
          <div className="space-y-1">
            {banner.link_urls && banner.link_urls.length > 0 ? (
              banner.link_urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-xs block"
                >
                  {url}
                </a>
              ))
            ) : banner.link_url ? (
              <a
                href={banner.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate max-w-xs block"
              >
                {banner.link_url}
              </a>
            ) : (
              <span className="text-muted-foreground">No Link</span>
            )}
            {banner.expires_at && (
              <span className={`text-xs block ${isExpired ? "text-red-600 font-medium" : "text-blue-600"}`}>
                {countdown}
              </span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>{banner.created_at ? new Date(banner.created_at).toLocaleDateString() : "—"}</TableCell>
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

      {/* Example Field */}
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