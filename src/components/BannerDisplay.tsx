import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { Banner } from '@/types/banner';

const BannerDisplay = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

useEffect(() => {
  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('priority_order', { ascending: false });

      if (error) throw error;

      const bannersWithFullUrl = (data || []).map((banner) => ({
        ...banner,
        image_url: banner.image_url.startsWith('http')
          ? banner.image_url
          : `https://booohlpwrvqtgvlngzrf.supabase.co/storage/v1/object/public/images/banners/${banner.image_url}`,
      }));

      setBanners(bannersWithFullUrl);
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  };

  fetchBanners();
}, []);


  useEffect(() => {
    if (banners.length > 0) {
      // Show banner after 5 seconds
      const timer = setTimeout(() => {
        setShowBanner(true);
        setIsVisible(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [banners]);

  useEffect(() => {
    if (banners.length > 1 && showBanner) {
      // Rotate banners every 10 seconds
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [banners.length, showBanner]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  const handleBannerClick = () => {
    const currentBanner = banners[currentBannerIndex];
    if (currentBanner?.link_url) {
      window.open(currentBanner.link_url, '_blank');
    }
  };

  if (!showBanner || banners.length === 0) return null;

  const currentBanner = banners[currentBannerIndex];
const getBannerUrl = (imageUrl: string) => {
  if (!imageUrl) return "";
  const trimmed = imageUrl.trim(); // remove leading/trailing spaces
  if (trimmed.startsWith("http")) return trimmed; // already full URL
  return `https://booohlpwrvqtgvlngzrf.supabase.co/storage/v1/object/public/images/banners/${trimmed}`;
};

  return (
    <div
      className={`fixed top-20 right-4 z-50 transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="relative bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden max-w-sm">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Banner Image */}
        <div
          className={`${currentBanner?.link_url ? 'cursor-pointer' : ''}`}
          onClick={handleBannerClick}
        >
          <img
            src={getBannerUrl(currentBanner?.image_url || "")}

            alt={currentBanner?.alt_text || 'Banner'}
            className="w-full h-auto object-cover"
            style={{ maxHeight: '300px' }}
          />
        </div>
        

        {/* Banner Indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {banners.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentBannerIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerDisplay;