import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, Bell, Settings } from "lucide-react";
import aftitansLogo from "@/assets/aftitans-logo.png";
import { useToast } from "@/hooks/use-toast";
import BannerDisplay from "@/components/BannerDisplay";

const Index = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const handleNotification = () => {
    toast({
      title: "Notification",
      description: "Welcome to AfTitans Affiliate Portal!",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <BannerDisplay />
      
      {/* Header with Logo and Controls */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* AfTitans Logo with Glass Effect */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-sm"></div>
                <div className="relative backdrop-blur-sm bg-white/10 dark:bg-gray-800/10 rounded-lg p-2 border border-white/20">
                  <img 
                    src={aftitansLogo} 
                    alt="AfTitans" 
                    className="h-8 opacity-90"
                  />
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground">AfTitans Portal</h2>
            </div>

            <div className="flex items-center space-x-2">
              {/* Notification Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNotification}
                className="relative hover:bg-primary/10"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  1
                </span>
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:bg-primary/10"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* Settings */}
              <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center animate-fade-in">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Lovable Affiliate Portal
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Connect with top affiliate networks and grow your business. Submit your network to get started with our platform.
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link to="/browse">
              <Button className="bg-gradient-primary hover:bg-primary-hover shadow-button text-primary-foreground font-semibold text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105">
                Browse Networks
              </Button>
            </Link>
            <Link to="/submit-network">
              <Button 
                variant="outline" 
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-lg px-8 py-4 rounded-xl transition-all duration-300"
              >
                Submit Your Network
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
