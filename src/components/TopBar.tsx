// TopBar.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NetworkForm from "@/components/admin/NetworkForm";

const TopBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate(); // Must be inside the component
// d
  return (
    <div
  className="bg-red-600 text-white shadow-md"
  onClick={(e) => e.stopPropagation()}
>
      {/* Main header bar */}
      <div className="container mx-auto px-2 py-1 flex items-center justify-between">
        {/* Left side buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate("/review-from");
            }}
            className="text-xs font-medium hover:underline px-2 py-1"
          >
            Add review
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate("/help");
            }}
            className="text-xs font-medium hover:underline px-2 py-1"
          >
            Free Help
          </button>
          <a
            className="text-xs font-medium hover:underline px-2 py-1"
            href="#"
            onClick={(e) => e.stopPropagation()}
          >
            Free Tutorials
          </a>
        </div>

        {/* Right side button */}
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate("/add-network");
            }}
            className="text-xs font-semibold uppercase tracking-wide hover:bg-red-500 px-3 py-1 rounded border border-white"
          >
            ADD YOUR NETWORK
          </button>
        </div>
      </div>

      {/* Mobile menu (hidden by default) */}
      {isMenuOpen && (
        <div className="md:hidden bg-red-700 px-2 py-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate("/review-from");
            }}
            className="text-xs font-semibold uppercase tracking-wide hover:bg-red-500 px-3 py-1 rounded border border-white"
          >
            Add Review
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate("/help");
            }}
            className="block text-xs font-medium hover:underline px-2 py-1"
          >
            Free Help
          </button>
          <a
            className="block text-xs font-medium hover:underline px-2 py-1"
            href="#"
            onClick={(e) => e.stopPropagation()}
          >
            Free Tutorials
          </a>
        </div>
      )}
    </div>
  );
};

export default TopBar;
