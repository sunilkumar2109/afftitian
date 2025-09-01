import React, { useState } from 'react';

const App = () => {
  // NOTE: This example uses placeholders for Supabase configuration.
  // In a real application, these values would be provided at runtime.
  const supabaseUrl = 'https://booohlpwrvqtgvlngzrf.supabase.co'; // your project URL
  const supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvb29obHB3cnZxdGd2bG5nenJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNjYyODgsImV4cCI6MjA3MDY0MjI4OH0.5O9hsbSxPoPK-GHKT-IqwubPCP_QmTvwZWVvHAkJ2JE';

  const [formData, setFormData] = useState({
    userEmail: '',
    yourName: '',
    network: [],
    paymentProof: '',
    affiliateNetwork: '',
    review: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => {
        const newNetwork = checked
          ? [...prev.network, value]
          : prev.network.filter((item) => item !== value);
        return { ...prev, network: newNetwork };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage(null);

    // This is a placeholder for the actual Supabase client.
    // In the real environment, a valid client would be available.
    const supabase = {
      from: () => ({
        insert: async (data) => {
          console.log("Submitting data:", data);
          return { data: [data], error: null };
        }
      })
    };

    try {
      const { data, error } = await supabase.from('reviews').insert([
        {
          ...formData,
          submitted_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw error;
      }

      setMessage('✅ Form submitted successfully!');
      console.log('Saved to Supabase:', data);

      // reset form
      setFormData({
        userEmail: '',
        yourName: '',
        network: [],
        paymentProof: '',
        affiliateNetwork: '',
        review: '',
      });
    } catch (error) {
      console.error('Error saving to Supabase:', error.message);
      setMessage('❌ Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
            AFFTITANS
          </div>
        </div>

        {/* Banner */}
        <div className="mb-8 rounded-xl shadow-lg">
          <a
            href="https://8f47epp6-w8pxomtva76jg-d8t.hop.clickbank.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://i.postimg.cc/xdK3zzcP/Grow-Your-Business.gif"
              alt="Grow your business"
              className="w-full rounded-xl"
            />
          </a>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-1">
              User Email Please*
            </label>
            <input
              type="email"
              name="userEmail"
              value={formData.userEmail}
              onChange={handleChange}
              required
              className="w-full p-3 bg-gray-700 rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Your Name Please?
            </label>
            <input
              type="text"
              name="yourName"
              value={formData.yourName}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Could you tell a little more about Network?
            </label>
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                'Network Offers',
                'Payment Proof',
                'Tracking System',
                'Rip-off Your Money',
                'More About',
              ].map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    name="network"
                    value={option}
                    checked={formData.network.includes(option)}
                    onChange={handleChange}
                    className="mr-2 text-blue-500 rounded-full focus:ring-blue-500"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Send your payment Screenshot Proof
            </label>
            <input
              type="text"
              name="paymentProof"
              value={formData.paymentProof}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
              placeholder="Email: xx@affwebsite.com Or addreview.affwebsite.com@gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Affiliate Network*
            </label>
            <input
              type="text"
              name="affiliateNetwork"
              value={formData.affiliateNetwork}
              onChange={handleChange}
              required
              className="w-full p-3 bg-gray-700 rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Add A Review Here*
            </label>
            <textarea
              name="review"
              value={formData.review}
              onChange={handleChange}
              required
              rows={4}
              className="w-full p-3 bg-gray-700 rounded-xl border border-gray-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          {message && (
            <div className="text-center mt-4 text-green-500 font-bold">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default App;