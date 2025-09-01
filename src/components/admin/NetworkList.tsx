import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Network, MasterData } from "@/types/admin";
import { Edit, Trash2, Search } from "lucide-react";
import NetworkForm from "./NetworkForm";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);

  const filteredNetworks = networks.filter(network =>
    network.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    network.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleActive = async (network: Network) => {
    try {
      const { error } = await supabase
        .from('networks')
        .update({ is_active: !network.is_active })
        .eq('id', network.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Network ${network.is_active ? 'deactivated' : 'activated'}`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to update network status",
        variant: "destructive",
      });
    }
  };

  const deleteNetwork = async (network: Network) => {
    try {
      const { error } = await supabase
        .from('networks')
        .delete()
        .eq('id', network.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Network deleted successfully",
      });

      onUpdate();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to delete network",
        variant: "destructive",
      });
    }
  };
const getRemainingDays = (expirationDate: string | null) => {
  if (!expirationDate) return null;
  const now = new Date();
  const exp = new Date(expirationDate);
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Networks ({networks.length})
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search networks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredNetworks.map((network) => (
            <div key={network.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{network.name}</h3>
                  <Badge variant={network.is_active ? "default" : "secondary"}>
                    {network.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">{network.type}</Badge>
                </div>
                
                {network.description && (
                  <p className="text-sm text-muted-foreground mb-2">{network.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
  {network.payment_frequency && (
    <span>Payment: {network.payment_frequency}</span>
  )}
  <span>Priority: {network.priority_order}</span>
  {network.expiration_date && (
    <span className={getRemainingDays(network.expiration_date) <= 5 ? "text-red-400 font-semibold" : "text-green-400"}>
      {getRemainingDays(network.expiration_date)} days left
    </span>
  )}
  {network.website_link && (
    <a 
      href={network.website_link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      Visit Website
    </a>
  )}
</div>

                

                {network.categories.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {network.categories.slice(0, 3).map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                    {network.categories.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{network.categories.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={network.is_active}
                  onCheckedChange={() => toggleActive(network)}
                />
                
                <Dialog>
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
                        Are you sure you want to delete "{network.name}"? This action cannot be undone.
                        All offers associated with this network will also be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteNetwork(network)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}

          {filteredNetworks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No networks found matching your search." : "No networks found."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkList;