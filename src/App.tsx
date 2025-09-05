import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import SubmitNetwork from "./pages/SubmitNetwork";
import Browse from "./pages/Browse";
import OfferDetail from "./pages/OfferDetail";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import AddNetworkPage from "@/pages/AddNetworkPage";
import NetworkDetail from "@/pages/NetworkDetail";
import ReviewFrom from './pages/reviewfrom';
import HelpPage from './pages/HelpPage';
import Custom from './pages/custom';




const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Browse />} />
            <Route path="/submit-network" element={<SubmitNetwork />} />
            <Route path="/network/:id" element={<NetworkDetail />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/offer/:id" element={<OfferDetail />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            <Route path="/add-network" element={<AddNetworkPage />} />
            <Route path="/review-from" element={<ReviewFrom />} /> 
            <Route path="/help" element={<HelpPage />} /> 
             <Route path="/custom" element={<Custom />} /> 
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;