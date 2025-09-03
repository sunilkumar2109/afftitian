const Footer = () => {
  return (
    <footer
  className="bg-black text-white mt-12"
  onClick={(e) => e.stopPropagation()}
>

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
          <p className="text-sm"><strong>Email:</strong> partner@afftitans.com</p>
          <p className="text-sm"><strong>Telegram:</strong> @AffTitansHQ</p>
          <p className="text-sm"><strong>Skype:</strong> live:afftitans.team</p>

          {/* Social Icons */}
          <div className="flex gap-3 mt-3">
            <a href="#" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/2048px-2021_Facebook_icon.svg.png" 
                alt="Facebook" 
                className="w-6 h-6 rounded-full"
              />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/1200px-WhatsApp.svg.png" 
                alt="WhatsApp" 
                className="w-6 h-6 rounded-full"
              />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/2048px-Telegram_logo.svg.png" 
                alt="Telegram" 
                className="w-6 h-6 rounded-full"
              />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Skype_logo.svg/2560px-Skype_logo.svg.png" 
                alt="Skype" 
                className="w-6 h-6 rounded-full"
              />
            </a>
          </div>
        </div>

        {/* For Advertisers */}
        <div>
          <h3 className="text-lg font-semibold mb-4">For Advertisers</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="https://teams.live.com/l/community/FEA1T0XSFnG-sbfOgI" onClick={(e) => e.stopPropagation()}>Our community</a></li>
            <li><a href="#" onClick={(e) => e.stopPropagation()}>Advertise with us</a></li>
            <li><a href="#" onClick={(e) => e.stopPropagation()}>Become an exclusive partner</a></li>
            <li><a href="https://t.me/+DKZPI3yFF5NlOWJl" onClick={(e) => e.stopPropagation()}>join the Telegram community</a></li>
          </ul>
        </div>

        {/* For Visitors */}
        <div>
          <h3 className="text-lg font-semibold mb-4">For AffTitans</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#" onClick={(e) => e.stopPropagation()}>Explore Networks</a></li>
            <li><a href="#" onClick={(e) => e.stopPropagation()}>Browse Offers</a></li>
            <li><a href="#" onClick={(e) => e.stopPropagation()}>Affiliate Resources</a></li>
            
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
              onClick={(e) => e.stopPropagation()} // Stop propagation for input
            />
            <button
              type="submit"
              className="bg-white text-black px-4 py-2 rounded text-sm font-semibold"
              onClick={(e) => e.stopPropagation()} // Stop propagation for button
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Bottom copyright */}
      <div className="bg-gray-900 text-center text-sm py-3">
        &copy; 2015 - {new Date().getFullYear()} AffTitans. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
