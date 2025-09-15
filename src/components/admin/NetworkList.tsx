import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Network, MasterData } from "@/types/admin";
import { Edit, Trash2, Search, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";

import NetworkForm from "./NetworkForm";
import BulkNetworkForm from "./BulkNetworkForm";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NetworkListProps {
  networks: Network[];
  onUpdate: () => void;
  masterData: MasterData | null;
}

const NetworkList = ({ networks, onUpdate, masterData }: NetworkListProps) => {
  const { toast } = useToast();

  // ✅ Local State
  const [searchTerm, setSearchTerm] = useState("");
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // 🔹 Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const networksPerPage = 8;

  // ✅ Filtering
  const filteredNetworks = networks.filter(
    (network) =>
      network.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      network.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔹 Pagination Logic
  const totalPages = Math.ceil(filteredNetworks.length / networksPerPage);
  const startIndex = (currentPage - 1) * networksPerPage;
  const endIndex = startIndex + networksPerPage;
  const currentNetworks = filteredNetworks.slice(startIndex, endIndex);

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const deleteNetwork = async (id: string) => {
    try {
      const { error } = await supabase.from("networks").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Network deleted" });
      onUpdate(); // refresh list
    } catch (error) {
      console.error("Failed to delete network:", error);
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
    }
  };

  // ✅ Selection
  const toggleSelect = (id: string) => {
    setSelectedNetworks((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedNetworks.length === currentNetworks.length) {
      setSelectedNetworks([]);
    } else {
      setSelectedNetworks(currentNetworks.map((n) => n.id));
    }
  };

  // ✅ Toggle Active
  const toggleActive = async (network: Network) => {
    try {
      const { error } = await supabase
        .from("networks")
        .update({ is_active: !network.is_active })
        .eq("id", network.id);

      if (error) throw error;

      toast({ title: "Success", description: "Network updated" });
      onUpdate();
    } catch (error) {
      console.error("Failed to update network:", error);
      toast({
        title: "Error",
        description: "Failed to update",
        variant: "destructive",
      });
    }
  };

  // 🔹 Pagination Controls
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }
    }

    return rangeWithDots;
  };

  return (
    <Card>
      {/* 🔹 Header */}
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Networks ({filteredNetworks.length})
          <div className="flex items-center gap-2">
            {bulkMode && (
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedNetworks.length === currentNetworks.length
                  ? "Unselect All"
                  : "Select All"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkMode(!bulkMode)}
            >
              {bulkMode ? "Cancel" : "Common Changes"}
            </Button>
            {bulkMode && selectedNetworks.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setBulkDialogOpen(true)}
              >
                Edit Selected ({selectedNetworks.length})
              </Button>
            )}
            {/* 🔎 Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search networks..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      {/* 🔹 Content */}
      <CardContent>
        <div className="space-y-4">
          {currentNetworks.map((network) => (
            <div
              key={network.id}
              className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              {/* Left side */}
              <div className="flex-1 flex gap-3 items-center">
                {bulkMode && (
                  <div
                    className="cursor-pointer"
                    onClick={() => toggleSelect(network.id)}
                  >
                    {selectedNetworks.includes(network.id) ? (
                      <CheckSquare className="text-primary" />
                    ) : (
                      <Square className="text-muted-foreground" />
                    )}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold">{network.name}</h3>
                    <Badge variant={network.is_active ? "default" : "secondary"}>
                      {network.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{network.type}</Badge>
                  </div>
                  {network.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {network.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right side (hidden in bulk mode) */}
              {!bulkMode && (
                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    checked={network.is_active}
                    onCheckedChange={() => toggleActive(network)}
                  />
                  {/* Edit Button */}
                  <Dialog
                    open={editingNetwork?.id === network.id}
                    onOpenChange={(open) =>
                      !open && setEditingNetwork(null)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingNetwork(network)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Network</DialogTitle>
                      </DialogHeader>
                      <NetworkForm
                        network={editingNetwork}
                        onSuccess={() => {
                          onUpdate();
                          setEditingNetwork(null);
                        }}
                        masterData={masterData}
                      />
                    </DialogContent>
                  </Dialog>
                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Network</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{network.name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteNetwork(network.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}

          {currentNetworks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No networks found matching your search."
                : "No networks found."}
            </div>
          )}
        </div>

        {/* 🔹 Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredNetworks.length)} of {filteredNetworks.length} networks
            </div>
            
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPaginationRange().map((page, index) => (
                  <div key={index}>
                    {page === "..." ? (
                      <span className="px-3 py-1 text-muted-foreground">...</span>
                    ) : (
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page as number)}
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Next Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* 🔹 Bulk Edit Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Selected Networks</DialogTitle>
          </DialogHeader>
          <BulkNetworkForm
            selectedIds={selectedNetworks}
            onSuccess={() => {
              setBulkDialogOpen(false);
              onUpdate();
              setSelectedNetworks([]);
              setBulkMode(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default NetworkList;