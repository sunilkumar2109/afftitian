const Footer = () => {
  return (
    <footer className="bg-black text-white mt-12">
      <div className="container mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* About Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">About AffTitans</h3>
          <p className="text-sm mb-2">
            AffTitans is your trusted hub for verified <strong>CPA Affiliate Networks</strong> and high-converting offers.
          </p>
          <p className="text-sm mb-4">
            We help affiliates, advertisers, and marketers discover the best opportunities to grow revenue with
            transparent data, trusted reviews, and real-time performance insights.
          </p>
          <p className="text-sm"><strong>Email:</strong> support@afftitans.com</p>
          <p className="text-sm"><strong>Telegram:</strong> @AffTitansHQ</p>
          <p className="text-sm"><strong>Skype:</strong> live:afftitans.team</p>

          {/* Social Icons */}
          <div className="flex gap-3 mt-3">
            <a href="#" target="_blank" rel="noopener noreferrer">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/2048px-2021_Facebook_icon.svg.png" 
                alt="Facebook" 
                className="w-8 h-8 bg-white rounded p-1 hover:opacity-80"
              />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <img 
                src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" 
                alt="Twitter" 
                className="w-8 h-8 bg-white rounded p-1 hover:opacity-80"
              />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <img 
                src="https://openvisualfx.com/wp-content/uploads/2019/10/linkedin-icon-logo-png-transparent.png" 
                alt="LinkedIn" 
                className="w-8 h-8 bg-white rounded p-1 hover:opacity-80"
              />
            </a>
          </div>
        </div> {/* ✅ closed About section */}

        {/* For Advertiser */}
        <div>
          <h3 className="text-lg font-semibold mb-4">For Advertisers</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#">Promote Your Offers</a></li>
            <li><a href="#">Add Your Network</a></li>
            <li><a href="#">Partner With Us</a></li>
            <li><a href="#">join the Telegram community</a></li>
          </ul>
        </div>

        {/* For Visitors */}
        <div>
          <h3 className="text-lg font-semibold mb-4">For AffTitans</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#">Explore Networks</a></li>
            <li><a href="#">Browse Offers</a></li>
            <li><a href="#">Affiliate Resources</a></li>
            
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Stay in the Loop</h3>
          <p className="text-sm mb-3">
            Subscribe to get weekly updates on the top affiliate networks, trending offers, and earning tips from AffTitans.
          </p>
          <form className="flex flex-col gap-2">
            <input 
              type="email" 
              placeholder="Your Email" 
              className="px-3 py-2 rounded text-black text-sm"
            />
            <button type="submit" className="bg-white text-black px-4 py-2 rounded text-sm font-semibold">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Bottom copyright */}
      <div className="bg-gray-900 text-center text-sm py-3">
        &copy; 2015 - 2025 AffTitans. All rights reserved. Empowering affiliates with networks & offers.
      </div>
    </footer>
  );
};

export default Footer;
