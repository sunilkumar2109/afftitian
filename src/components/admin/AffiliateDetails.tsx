import { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

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
}

export const AffiliateDetails = () => {
  const [details, setDetails] = useState<AffiliateDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('affiliate_details')
        .select('*')
        .eq('id', 1) // Using a fixed ID for simplicity
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching affiliate details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load affiliate details.',
          variant: 'destructive',
        });
      } else if (data) {
        setDetails(data);
      } else {
        // Create a default entry if one doesn't exist
        const defaultDetails = {
          id: 1,
          website_name: '',
          website_link: '',
          contact_email: '',
          about_us: '',
          our_mission: '',
          number_of_offers: '',
          type_of_commission: '',
          minimum_withdrawal: '',
          referral_commission: '',
        };
        const { error: upsertError } = await supabase.from('affiliate_details').upsert(defaultDetails);
        if (upsertError) {
          console.error('Error creating default affiliate details:', upsertError);
        }
        setDetails(defaultDetails);
      }
      setIsLoading(false);
    };

    fetchDetails();
  }, [toast]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('affiliate_details')
      .update(details)
      .eq('id', 1);

    if (error) {
      console.error('Error updating affiliate details:', error);
      toast({
        title: 'Error',
        description: 'Failed to update affiliate details.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Affiliate details updated successfully.',
      });
    }
    setIsLoading(false);
  };

  if (isLoading || !details) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Website Details</CardTitle>
        </CardHeader>
        <CardContent>
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Affiliate Website Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <Label htmlFor="website_name">Website Name</Label>
            <Input
              id="website_name"
              value={details.website_name}
              onChange={(e) => setDetails({ ...details, website_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="website_link">Website Link</Label>
            <Input
              id="website_link"
              type="url"
              value={details.website_link}
              onChange={(e) => setDetails({ ...details, website_link: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={details.contact_email}
              onChange={(e) => setDetails({ ...details, contact_email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="number_of_offers">Number of Offers</Label>
            <Input
              id="number_of_offers"
              value={details.number_of_offers}
              onChange={(e) => setDetails({ ...details, number_of_offers: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="type_of_commission">Type of Commission</Label>
            <Input
              id="type_of_commission"
              value={details.type_of_commission}
              onChange={(e) => setDetails({ ...details, type_of_commission: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="minimum_withdrawal">Minimum Withdrawal</Label>
            <Input
              id="minimum_withdrawal"
              value={details.minimum_withdrawal}
              onChange={(e) => setDetails({ ...details, minimum_withdrawal: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="referral_commission">Referral Commission</Label>
            <Input
              id="referral_commission"
              value={details.referral_commission}
              onChange={(e) => setDetails({ ...details, referral_commission: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="about_us">About Us</Label>
            <Textarea
              id="about_us"
              value={details.about_us}
              onChange={(e) => setDetails({ ...details, about_us: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="our_mission">Our Mission</Label>
            <Textarea
              id="our_mission"
              value={details.our_mission}
              onChange={(e) => setDetails({ ...details, our_mission: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Details"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};