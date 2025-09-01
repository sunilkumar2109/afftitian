import React, { useState } from 'react';
import { Mail, MessageCircle, User } from 'lucide-react';

const App = () => {
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    comment: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // This is where you would handle the form submission, e.g., send data to an API
    console.log('Form submitted:', formState);
    alert('Form submitted! (Check the console for data)');
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-900 rounded-2xl shadow-lg p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white">Free Help</h1>
          <p className="mt-2 text-gray-400">Our email is <span className="text-blue-400">info@afftitans.com</span></p>
        </div>

        <div className="space-y-4 text-gray-400 text-center">
          <p>Skype for Customer Support: <span className="text-blue-400">live:.cid.9fe48421b91de89f</span></p>
          <p>Skype ID for Sponsorship: <span className="text-blue-400">live.pmaops</span></p>
          <p>Telegram ID for Sponsorship: <span className="text-blue-400">@afftitans</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="relative">
              <label htmlFor="firstName" className="block text-sm font-medium sr-only">First Name</label>
              <div className="flex items-center bg-gray-800 rounded-lg p-2 focus-within:ring-2 focus-within:ring-blue-500">
                <User className="h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  name="firstName"
                  id="firstName"
                  value={formState.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  className="w-full bg-gray-800 text-white placeholder-gray-500 outline-none border-none ml-2"
                  required
                />
              </div>
            </div>
            <div className="relative">
              <label htmlFor="lastName" className="block text-sm font-medium sr-only">Last Name</label>
              <div className="flex items-center bg-gray-800 rounded-lg p-2 focus-within:ring-2 focus-within:ring-blue-500">
                <User className="h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  name="lastName"
                  id="lastName"
                  value={formState.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                  className="w-full bg-gray-800 text-white placeholder-gray-500 outline-none border-none ml-2"
                  required
                />
              </div>
            </div>
          </div>
          <div className="relative">
            <label htmlFor="email" className="block text-sm font-medium sr-only">Email</label>
            <div className="flex items-center bg-gray-800 rounded-lg p-2 focus-within:ring-2 focus-within:ring-blue-500">
              <Mail className="h-5 w-5 text-gray-500" />
              <input
                type="email"
                name="email"
                id="email"
                value={formState.email}
                onChange={handleChange}
                placeholder="Email *"
                className="w-full bg-gray-800 text-white placeholder-gray-500 outline-none border-none ml-2"
                required
              />
            </div>
          </div>
          <div className="relative">
            <label htmlFor="comment" className="block text-sm font-medium sr-only">Comment or Message</label>
            <div className="flex items-start bg-gray-800 rounded-lg p-2 focus-within:ring-2 focus-within:ring-blue-500">
              <MessageCircle className="h-5 w-5 text-gray-500 mt-2" />
              <textarea
                name="comment"
                id="comment"
                value={formState.comment}
                onChange={handleChange}
                placeholder="Comment or Message"
                rows="4"
                className="w-full bg-gray-800 text-white placeholder-gray-500 outline-none border-none ml-2 resize-none"
                required
              ></textarea>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;