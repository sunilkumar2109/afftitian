export interface Network {
  id: string;
  name: string;
  type: string;
  description?: string;
  logo_url?: string;
  website_link?: string;
  payment_frequency?: string;
  payment_methods: string[];
  categories: string[];
  tags: string[];
  is_active: boolean;
  priority_order: number;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  name: string;
  network_id: string;
  type: string;
  payout_amount?: number;
  payout_currency: string;
  devices: string[];
  vertical?: string;
  geo_targets: string[];
  tags: string[];
  image_url?: string;
  landing_page_url?: string;
  is_active: boolean;
  is_featured: boolean;
  priority_order: number;
  created_at: string;
  updated_at: string;
  networks?: {
    name: string;
  };
}

export interface MasterData {
  id: string;
  offer_types: string[];
  network_types: string[];
  verticals: string[];
  geo_list: Array<{ code: string; name: string }>;
  currencies: string[];
  payment_frequencies: string[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user_id?: string;
  doc_id?: string;
  doc_type?: string;
  changes?: any;
  created_at: string;
}