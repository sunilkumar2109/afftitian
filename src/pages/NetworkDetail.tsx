import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
// The following imports are commented out to make the file self-contained for a local environment.
// In a real project, you would uncomment them and import from your component library.
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, ThumbsDown, X } from "lucide-react";
// import OpenAI from "openai";

// Mock Supabase client for a self-contained, runnable example
const supabase = {
  from: (table) => ({
    select: () => ({
      eq: (column, value) => ({
        single: async () => {
          // Mock data for network details
          if (table === "networks") {
            return {
              data: {
                id: "1",
                name: "Dynumedia",
                type: "Affiliate Network",
                website_link: "https://dynumedia.com/",
                payment_frequency: "Bi-weekly, Monthly",
                payment_methods: ["PayPal", "Payoneer", "Wire Transfer"],
                categories: ["Dating", "Nutra", "iGaming"],
                logo_url: "https://placehold.co/96x96/4C72B9/FFFFFF?text=DM",
              },
            };
          }
          // Mock data for affiliate details
          if (table === "affiliate_details") {
            return {
              data: {
                id: 1,
                website_name: "Dynumedia Website",
                website_link: "https://dynumedia.com",
                contact_email: "contact@dynumedia.com",
                about_us: "We are a performance marketing agency specializing in high-converting offers.",
                our_mission: "To connect top affiliates with exclusive campaigns and maximize their earnings.",
                number_of_offers: "50+",
                type_of_commission: "CPA, CPI, CPL",
                minimum_withdrawal: "$50",
                referral_commission: "3%",
                tracking_software: "Proprietary",
                tracking_link: "N/A",
                payment_constancy: "Bi-weekly, Monthly",
                payment_method: "PayPal, Payoneer, Wire Transfer",
                major_categories: "Dating, Nutra, iGaming",
                website_email_id: "support@dynumedia.com",
                facebook_id: "www.facebook.com/dynumedia",
                twitter_id: "www.twitter.com/dynumedia",
                linkedin_id: "www.linkedin.com/company/dynumedia",
                chief_executive_officer: "Jane Doe",
                headquarter: "N/A",
                phone_number: "N/A",
              },
            };
          }
          return { data: null };
        },
      }),
      insert: async (data) => {
        console.log("Inserting feedback:", data);
        return { data, error: null };
      },
      update: async (data) => {
        console.log("Updating feedback:", data);
        return { data, error: null };
      },
    }),
  }),
};

// Mock components to make the app runnable as a single file
const Card = ({ children, className }) => <div className={`mt-6 rounded-2xl bg-gray-900 p-6 shadow-md text-white ${className}`}>{children}</div>;
const CardHeader = ({ children }) => <div className="mb-4">{children}</div>;
const CardTitle = ({ children }) => <h2 className="text-2xl font-bold">{children}</h2>;
const CardContent = ({ children }) => <div>{children}</div>;
const Label = ({ htmlFor, children }) => <label htmlFor={htmlFor} className="block text-sm font-medium mb-1 text-gray-400">{children}</label>;
const Input = (props) => <input {...props} className={`w-full p-3 rounded-lg text-black bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${props.className}`} />;
const Textarea = (props) => <textarea {...props} className={`w-full p-3 rounded-lg text-black bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-h-[100px] ${props.className}`} />;
const Button = ({ children, onClick, disabled, className }) => <button onClick={onClick} disabled={disabled} className={`w-full px-4 py-3 font-semibold rounded-lg bg-blue-600 text-white transition duration-300 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed ${className}`}>{children}</button>;

interface Feedback {
  id: string;
  user_name: string;
  comment: string;
  rating: {
    websiteOffers: number;
    networkPayout: number;
    trackingSystem: number;
    websiteLayout: number;
    customerSupport: number;
  };
  pros: string;
  cons: string;
  likes: number;
  dislikes: number;
  created_at: string;
}

interface AffiliateDetails {
  id: number;
  website_name: string;
  website_link: string;
  contact_email: string;
  about_us: string;
  our_mission: string;
  number_of_offers: string;
  type_of_commission: string;
  minimum_withdrawal: string;
  referral_commission: string;
  tracking_software: string;
  tracking_link: string;
  payment_constancy: string;
  payment_method: string;
  major_categories: string;
  website_email_id: string;
  facebook_id: string;
  twitter_id: string;
  linkedin_id: string;
  chief_executive_officer: string;
  headquarter: string;
  phone_number: string;
}

export default function NetworkDetail() {
  const { id } = useParams<{ id: string }>();
  const [network, setNetwork] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [affiliateDetails, setAffiliateDetails] = useState<AffiliateDetails | null>(null);
  const [aiDescription, setAIDescription] = useState<string>("Loading...");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [rating, setRating] = useState({
    websiteOffers: 5,
    networkPayout: 5,
    trackingSystem: 5,
    websiteLayout: 5,
    customerSupport: 5,
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000); // Clear message after 3 seconds
  };

  // 🔹 1. Fetch Network Details
  useEffect(() => {
    async function fetchNetwork() {
      const { data } = await supabase.from("networks").select("*").eq("id", id).single();
      setNetwork(data);
    }
    fetchNetwork();
  }, [id]);

  // 🔹 2. Fetch Affiliate Website Details
  useEffect(() => {
    async function fetchAffiliateDetails() {
      const { data, error } = await supabase.from('affiliate_details').select('*').eq('id', 1).single();
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching affiliate details:', error);
      } else if (data) {
        setAffiliateDetails(data);
      }
    }
    fetchAffiliateDetails();
  }, []);

  // 3. Fetch Feedback History
  useEffect(() => {
    async function fetchFeedback() {
      // Mocking feedback data fetch
      const mockFeedbackData = [
        { id: "1", network_id: "1", user_name: "Affiliate A", rating: { websiteOffers: 4, networkPayout: 5, trackingSystem: 5, websiteLayout: 4, customerSupport: 5 }, pros: "Great support, exclusive offers.", cons: "Payouts can sometimes be slow.", likes: 12, dislikes: 1, created_at: "2023-02-15" },
        { id: "2", network_id: "1", user_name: "Affiliate B", rating: { websiteOffers: 5, networkPayout: 4, trackingSystem: 3, websiteLayout: 5, customerSupport: 4 }, pros: "High conversion rates, good commissions.", cons: "Tracking software is a bit basic.", likes: 8, dislikes: 3, created_at: "2023-03-20" },
      ];
      setFeedbacks(mockFeedbackData);
    }
    fetchFeedback();
  }, [id]);

  // 🔹 4. Call OpenAI to Get AI Description (Mocked)
  useEffect(() => {
    if (!network?.name) return;
    // Mocking OpenAI call
    setAIDescription(`A professional profile for ${network.name}. This network excels in dating, nutra, and iGaming verticals. It's known for its high-paying CPA offers and a reliable proprietary tracking system. Affiliates benefit from frequent payments and dedicated affiliate managers.`);
  }, [network]);

  // 🔹 5. Submit Feedback
  async function submitFeedback() {
    if (!name || !email || !pros || !cons) {
      showMessage("error", "Please fill all fields: Name, Email, Pros, and Cons.");
      return;
    }

    const newFeedback = {
      network_id: id,
      user_name: name,
      user_email: email,
      rating,
      pros,
      cons,
      likes: 0,
      dislikes: 0,
    };

    // The supabase insert is a mock, so we simulate the feedback being added to the list.
    const tempId = Math.random().toString(36).substring(7);
    const newFeedbackWithId = { ...newFeedback, id: tempId, created_at: new Date().toISOString() };
    setFeedbacks(prev => [...prev, newFeedbackWithId]);

    setName("");
    setEmail("");
    setPros("");
    setCons("");
    setRating({ websiteOffers: 5, networkPayout: 5, trackingSystem: 5, websiteLayout: 5, customerSupport: 5 });
    showMessage("success", "Feedback submitted successfully!");
  }

  // 🔹 6. Handle Like/Dislike
  const handleVote = async (feedbackId, voteType) => {
    setFeedbacks(prev => prev.map(fb => {
      if (fb.id === feedbackId) {
        if (voteType === 'like') {
          return { ...fb, likes: fb.likes + 1 };
        } else if (voteType === 'dislike') {
          return { ...fb, dislikes: fb.dislikes + 1 };
        }
      }
      return fb;
    }));
    showMessage("success", "Vote submitted!");
  };

  if (!network || !affiliateDetails) return <div className="p-6 text-white bg-black min-h-screen">Loading network...</div>;

  return (
    <div className="p-6 bg-black text-white min-h-screen font-sans">
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl flex items-center gap-3 shadow-xl transition-all duration-300 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <p className="font-semibold">{message.text}</p>
          <button onClick={() => setMessage(null)} className="p-1 rounded-full hover:bg-white/20 transition">
            <X size={16} />
          </button>
        </div>
      )}

      {/* 🔹 Network Header */}
      <Card className="p-6 mb-6 bg-gray-900 shadow-lg rounded-2xl text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <img
            src={network.logo_url}
            alt={network.name}
            className="w-24 h-24 rounded-xl border border-gray-700"
          />
          <div>
            <h1 className="text-3xl font-bold text-white">{network.name}</h1>
            <p className="text-white text-lg">{network.type}</p>
          </div>
        </div>
        <p className="mt-6 text-lg leading-relaxed text-white">{aiDescription}</p>
      </Card>

      {/* 🔹 Network Details */}
      <Card className="p-6 mb-6 bg-gray-900 shadow-md rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">Network Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white">
          <p><strong>Website:</strong> {network.website_link}</p>
          <p><strong>Payment Frequency:</strong> {network.payment_frequency}</p>
          <p><strong>Payment Methods:</strong> {network.payment_methods.join(", ")}</p>
          <p><strong>Categories:</strong> {network.categories.join(", ")}</p>
        </div>
      </Card>

      {/* 🔹 Affiliate Website Details */}
      <Card className="p-6 mb-6 bg-gray-900 shadow-md rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">Affiliate Website Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white">
          <p><strong>Website Name:</strong> {affiliateDetails.website_name}</p>
          <p><strong>Website Link:</strong> <a href={affiliateDetails.website_link} target="_blank" rel="noopener noreferrer">{affiliateDetails.website_link}</a></p>
          <p><strong>Contact Email:</strong> {affiliateDetails.contact_email}</p>
          <p><strong>About Us:</strong> {affiliateDetails.about_us}</p>
          <p><strong>Our Mission:</strong> {affiliateDetails.our_mission}</p>
          <p><strong>Number of Offers:</strong> {affiliateDetails.number_of_offers}</p>
          <p><strong>Type of Commission:</strong> {affiliateDetails.type_of_commission}</p>
          <p><strong>Minimum Withdrawal:</strong> {affiliateDetails.minimum_withdrawal}</p>
          <p><strong>Referral Commission:</strong> {affiliateDetails.referral_commission}</p>
          <p><strong>Tracking Software:</strong> {affiliateDetails.tracking_software}</p>
          <p><strong>Tracking Link:</strong> {affiliateDetails.tracking_link}</p>
          <p><strong>Payment Constancy:</strong> {affiliateDetails.payment_constancy}</p>
          <p><strong>Payment Method:</strong> {affiliateDetails.payment_method}</p>
          <p><strong>Major Categories:</strong> {affiliateDetails.major_categories}</p>
          <p><strong>Website Email:</strong> {affiliateDetails.website_email_id}</p>
          <p><strong>Facebook ID:</strong> {affiliateDetails.facebook_id}</p>
          <p><strong>Twitter ID:</strong> {affiliateDetails.twitter_id}</p>
          <p><strong>LinkedIn ID:</strong> {affiliateDetails.linkedin_id}</p>
          <p><strong>Chief Executive Officer:</strong> {affiliateDetails.chief_executive_officer}</p>
          <p><strong>Headquarter:</strong> {affiliateDetails.headquarter}</p>
          <p><strong>Phone Number:</strong> {affiliateDetails.phone_number}</p>
        </div>
      </Card>

      {/* 🔹 Feedback Form */}
      <Card className="p-6 mb-6 bg-gray-900 shadow-md rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">Leave a Review</h2>
        <Input
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 text-black"
        />
        <Input
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 text-black"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Textarea
            placeholder="Pros"
            value={pros}
            onChange={(e) => setPros(e.target.value)}
            className="text-black"
          />
          <Textarea
            placeholder="Cons"
            value={cons}
            onChange={(e) => setCons(e.target.value)}
            className="text-black"
          />
        </div>
        <div className="space-y-4 mb-4">
          {Object.keys(rating).map((key) => (
            <div key={key} className="flex items-center gap-4">
              <span className="text-gray-400 w-40 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    onClick={() => setRating(prev => ({ ...prev, [key]: i + 1 }))}
                    className={`w-5 h-5 cursor-pointer transition ${
                      i < rating[key] ? "text-yellow-400" : "text-gray-500"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={submitFeedback} className="bg-blue-600 hover:bg-blue-700">
          Submit Review
        </Button>
      </Card>

      {/* 🔹 Feedback History */}
      <Card className="p-6 bg-gray-900 shadow-md rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">User Reviews</h2>
        {feedbacks.length === 0 ? (
          <p className="text-white">No feedback yet.</p>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-white"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold text-lg">{fb.user_name}</p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleVote(fb.id, 'like')} className="flex items-center gap-1 text-gray-400 hover:text-green-500 transition">
                      <ThumbsUp size={16} /> {fb.likes}
                    </button>
                    <button onClick={() => handleVote(fb.id, 'dislike')} className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition">
                      <ThumbsDown size={16} /> {fb.dislikes}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 mb-2">
                  {Object.keys(fb.rating).map(key => (
                    <div key={key} className="flex items-center">
                      <span className="text-sm text-gray-400 capitalize w-32">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <div className="flex items-center">
                        {Array.from({ length: fb.rating[key] }).map((_, i) => (
                          <Star key={i} size={16} fill="yellow" stroke="none" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {fb.pros && <p className="text-green-400">**Pros:** {fb.pros}</p>}
                {fb.cons && <p className="text-red-400">**Cons:** {fb.cons}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
