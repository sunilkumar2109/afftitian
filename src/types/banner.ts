export interface Banner {
  id: string;
  image_url: string;
  alt_text?: string;
  link_url?: string;
  is_active: boolean;
  priority_order: number;
  created_at: string;
  updated_at: string;
}