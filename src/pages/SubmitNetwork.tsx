import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Firebase imports
import { db } from "@/lib/firebase"; // <-- make sure this points to your firebase.ts file
import { collection, addDoc, Timestamp } from "firebase/firestore";

const SubmitNetwork = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const networkData = {
      name: formData.get("name"),
      email: formData.get("email"),
      contact: formData.get("contact"),
      networkName: formData.get("networkName"),
      networkUrl: formData.get("networkUrl"),
      networkDescription: formData.get("networkDescription"),
      offers: formData.get("offers"),
      paymentThreshold: formData.get("paymentThreshold"),
      paymentFrequency: formData.get("paymentFrequency"),
      trackingSoftware: formData.get("trackingSoftware"),
      submittedAt: Timestamp.now(),
    };

    try {
      await addDoc(collection(db, "affiliateNetworks"), networkData);
      setIsSubmitted(true);
      toast({
        title: "🎉 Thank you!",
        description: "Your network has been submitted successfully.",
      });
      e.currentTarget.reset();
    } catch (error) {
      console.error("Error submitting to Firestore:", error);
      toast({
        title: "❌ Error",
        description: "Failed to submit. Please try again.",
      });
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center animate-fade-in">
          <div className="bg-white rounded-2xl p-8 shadow-form">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Thank you for submitting your network!
            </h2>
            <p className="text-muted-foreground mb-6">
              We'll be in touch shortly to review your submission and get you started.
            </p>
            <Button
              onClick={() => setIsSubmitted(false)}
              className="bg-gradient-primary hover:bg-primary-hover shadow-button text-primary-foreground font-medium px-8 py-2 rounded-xl transition-all duration-300 hover:scale-105"
            >
              Submit Another Network
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="text-center pt-12 pb-8 px-4 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Submit Your Affiliate Network
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Please fill in the details below. All fields are required.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-12">
        <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
          <div className="bg-white rounded-2xl p-8 shadow-form space-y-6">
            {/* Name */}
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required placeholder="Your full name" />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required placeholder="your@email.com" />
            </div>

            {/* Contact */}
            <div>
              <Label htmlFor="contact">Skype / Telegram / Phone *</Label>
              <Input id="contact" name="contact" required placeholder="Skype, Telegram, Phone" />
            </div>

            {/* Network Name */}
            <div>
              <Label htmlFor="networkName">Affiliate Network Name *</Label>
              <Input id="networkName" name="networkName" required placeholder="Your Network Name" />
            </div>

            {/* Network URL */}
            <div>
              <Label htmlFor="networkUrl">Network URL *</Label>
              <Input id="networkUrl" name="networkUrl" type="url" required placeholder="https://yournetwork.com" />
            </div>

            {/* Network Description */}
            <div>
              <Label htmlFor="networkDescription">Network Description *</Label>
              <Textarea
                id="networkDescription"
                name="networkDescription"
                rows={4}
                required
                placeholder="Tell us about your network..."
              />
            </div>

            {/* Offer Count */}
            <div>
              <Label htmlFor="offers">How many offers in your network? *</Label>
              <Input id="offers" name="offers" required placeholder="50+, 100+, etc" />
            </div>

            {/* Payment Threshold */}
            <div>
              <Label htmlFor="paymentThreshold">Minimum Payment Threshold *</Label>
              <Input id="paymentThreshold" name="paymentThreshold" required placeholder="$50, $100, etc" />
            </div>

            {/* Payment Frequency */}
            <div>
              <Label htmlFor="paymentFrequency">Payment Frequency *</Label>
              <Input
                id="paymentFrequency"
                name="paymentFrequency"
                required
                placeholder="Net-30, Net-15, Weekly, etc"
              />
            </div>

            {/* Tracking Software */}
            <div>
              <Label htmlFor="trackingSoftware">Affiliate Tracking Software *</Label>
              <Input
                id="trackingSoftware"
                name="trackingSoftware"
                required
                placeholder="HasOffers, Affise, CAKE, etc"
              />
            </div>

            {/* CAPTCHA */}
            <div>
              <Label>Captcha *</Label>
              <div
                className="g-recaptcha bg-muted rounded-xl p-6 border-2 border-dashed border-input-border"
                data-sitekey="6LcFNJ0rAAAAADAfB0z86s8ktK4Yn30YzCsQNhMl"
              >
                <p className="text-sm text-center text-muted-foreground">reCAPTCHA will appear here</p>
              </div>
            </div>

            {/* Submit */}
            <div className="text-center pt-4">
              <Button
                type="submit"
                className="bg-gradient-primary hover:bg-primary-hover shadow-button text-primary-foreground font-semibold text-lg px-12 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                Submit Network
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitNetwork;
