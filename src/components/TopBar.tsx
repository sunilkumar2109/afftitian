// TopBar.jsx
import React, { useState } from "react";

const TopBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="bg-red-600 text-white shadow-md">
      {/* Main header bar */}
      <div className="container mx-auto px-2 py-1 flex items-center justify-between">
        {/* Left side buttons */}
        <div className="flex items-center gap-2">
          <a className="text-xs font-medium hover:underline px-2 py-1" href="#">
            Add review
          </a>
          <a className="text-xs font-medium hover:underline px-2 py-1" href="#">
            Free Help
          </a>
          <a className="text-xs font-medium hover:underline px-2 py-1" href="#">
            Free Tutorials
          </a>
        </div>

        {/* Right side button */}
        <div>
          <button className="text-xs font-semibold uppercase tracking-wide hover:bg-red-500 px-3 py-1 rounded border border-white">
            ADD YOUR NETWORK
          </button>
        </div>
      </div>

      {/* Mobile menu (hidden by default) */}
      {isMenuOpen && (
        <div className="md:hidden bg-red-700 px-2 py-2">
          <a className="block text-xs font-medium hover:underline px-2 py-1" href="#">
            Add review
          </a>
          <a className="block text-xs font-medium hover:underline px-2 py-1" href="#">
            Free Help
          </a>
          <a className="block text-xs font-medium hover:underline px-2 py-1" href="#">
            Free Tutorials
          </a>
        </div>
      )}
    </div>
  );
};

export default TopBar;