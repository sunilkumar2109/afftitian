// AdminBanners.tsx — new file
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Banner } from "@/types/admin";
import { BannerList } from "./BannerList";
import { BannerForm } from "./BannerForm";

export const AdminBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setBanners(data ?? []);
    else console.error(error);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  return (
    <div>
      <BannerList
        banners={banners}
        onEdit={(banner) => {
          setEditingBanner(banner);
          setShowForm(true);
        }}
        onRefresh={fetchBanners}
      />

      {showForm && (
        // simple modal — adjust styles to your design system
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-full max-w-4xl p-6">
            <BannerForm
              initialData={editingBanner ?? undefined}
              onSuccess={() => {
                setShowForm(false);
                setEditingBanner(null);
                fetchBanners();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingBanner(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
