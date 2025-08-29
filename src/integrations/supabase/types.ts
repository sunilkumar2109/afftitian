export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          doc_id: string | null
          doc_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          doc_id?: string | null
          doc_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          doc_id?: string | null
          doc_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      master_data: {
        Row: {
          created_at: string
          currencies: string[] | null
          geo_list: Json | null
          id: string
          network_types: string[] | null
          offer_types: string[] | null
          payment_frequencies: string[] | null
          updated_at: string
          verticals: string[] | null
        }
        Insert: {
          created_at?: string
          currencies?: string[] | null
          geo_list?: Json | null
          id?: string
          network_types?: string[] | null
          offer_types?: string[] | null
          payment_frequencies?: string[] | null
          updated_at?: string
          verticals?: string[] | null
        }
        Update: {
          created_at?: string
          currencies?: string[] | null
          geo_list?: Json | null
          id?: string
          network_types?: string[] | null
          offer_types?: string[] | null
          payment_frequencies?: string[] | null
          updated_at?: string
          verticals?: string[] | null
        }
        Relationships: []
      }
      networks: {
        Row: {
          categories: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          payment_frequency: string | null
          payment_methods: string[] | null
          priority_order: number | null
          tags: string[] | null
          type: string
          updated_at: string
          website_link: string | null
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          payment_frequency?: string | null
          payment_methods?: string[] | null
          priority_order?: number | null
          tags?: string[] | null
          type: string
          updated_at?: string
          website_link?: string | null
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          payment_frequency?: string | null
          payment_methods?: string[] | null
          priority_order?: number | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          website_link?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
          devices: string[] | null
          geo_targets: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          landing_page_url: string | null
          name: string
          network_id: string
          payout_amount: number | null
          payout_currency: string | null
          priority_order: number | null
          tags: string[] | null
          type: string
          updated_at: string
          vertical: string | null
        }
        Insert: {
          created_at?: string
          devices?: string[] | null
          geo_targets?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          landing_page_url?: string | null
          name: string
          network_id: string
          payout_amount?: number | null
          payout_currency?: string | null
          priority_order?: number | null
          tags?: string[] | null
          type: string
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          created_at?: string
          devices?: string[] | null
          geo_targets?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          landing_page_url?: string | null
          name?: string
          network_id?: string
          payout_amount?: number | null
          payout_currency?: string | null
          priority_order?: number | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
