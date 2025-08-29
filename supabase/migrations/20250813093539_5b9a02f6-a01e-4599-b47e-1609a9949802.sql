-- Create networks table
CREATE TABLE public.networks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_link TEXT,
  payment_frequency TEXT,
  payment_methods TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create offers table
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  network_id UUID NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payout_amount DECIMAL(10,2),
  payout_currency TEXT DEFAULT 'USD',
  devices TEXT[] DEFAULT '{}',
  vertical TEXT,
  geo_targets TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  landing_page_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  priority_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create master_data table for dropdown options
CREATE TABLE public.master_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_types TEXT[] DEFAULT '{"SOI","DOI","CPL","CPA","CPI","RevShare"}',
  network_types TEXT[] DEFAULT '{"Affiliate Network","Direct Advertiser"}',
  verticals TEXT[] DEFAULT '{"Nutra","Dating","Finance","Gaming","E-commerce"}',
  geo_list JSONB DEFAULT '[]',
  currencies TEXT[] DEFAULT '{"USD","EUR","GBP","CAD"}',
  payment_frequencies TEXT[] DEFAULT '{"Weekly","Bi-weekly","Monthly","Net 30"}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  user_id UUID,
  doc_id TEXT,
  doc_type TEXT,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read access, admin write access
CREATE POLICY "Allow public read access to networks" 
ON public.networks FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to offers" 
ON public.offers FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to master_data" 
ON public.master_data FOR SELECT 
USING (true);

-- Admin policies (will need authentication setup)
CREATE POLICY "Allow authenticated admin insert networks" 
ON public.networks FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated admin update networks" 
ON public.networks FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated admin delete networks" 
ON public.networks FOR DELETE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated admin insert offers" 
ON public.offers FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated admin update offers" 
ON public.offers FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated admin delete offers" 
ON public.offers FOR DELETE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated admin master_data" 
ON public.master_data FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated admin audit_logs" 
ON public.audit_logs FOR ALL 
USING (auth.role() = 'authenticated');

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_networks_updated_at
  BEFORE UPDATE ON public.networks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_data_updated_at
  BEFORE UPDATE ON public.master_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial master data
INSERT INTO public.master_data (
  offer_types,
  network_types,
  verticals,
  geo_list,
  currencies,
  payment_frequencies
) VALUES (
  '{"SOI","DOI","CPL","CPA","CPI","RevShare"}',
  '{"Affiliate Network","Direct Advertiser"}',
  '{"Nutra","Dating","Finance","Gaming","E-commerce","Health","Travel","Technology"}',
  '[{"code":"US","name":"United States"},{"code":"CA","name":"Canada"},{"code":"GB","name":"United Kingdom"},{"code":"DE","name":"Germany"},{"code":"FR","name":"France"}]',
  '{"USD","EUR","GBP","CAD","AUD"}',
  '{"Weekly","Bi-weekly","Monthly","Net 30","Net 45"}'
);

-- Create indexes for performance
CREATE INDEX idx_offers_network_id ON public.offers(network_id);
CREATE INDEX idx_offers_is_active ON public.offers(is_active);
CREATE INDEX idx_offers_is_featured ON public.offers(is_featured);
CREATE INDEX idx_networks_is_active ON public.networks(is_active);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);