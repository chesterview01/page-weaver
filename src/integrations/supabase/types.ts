export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_provider_config: {
        Row: {
          created_at: string
          gemini_api_key: string | null
          id: string
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      builds: {
        Row: {
          conversation_id: string
          created_at: string
          css: string
          html: string
          id: string
          js: string
          label: string
          message_id: string | null
          project_id: string | null
          thumbnail_url: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          css?: string
          html?: string
          id?: string
          js?: string
          label: string
          message_id?: string | null
          project_id?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          css?: string
          html?: string
          id?: string
          js?: string
          label?: string
          message_id?: string | null
          project_id?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "builds_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      built_projects: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      credit_logs: {
        Row: {
          action: string
          amount: number
          created_at: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      deployment_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          main_domain: string
          updated_at: string | null
          vercel_team_id: string | null
          vercel_token: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          main_domain?: string
          updated_at?: string | null
          vercel_team_id?: string | null
          vercel_token?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          main_domain?: string
          updated_at?: string | null
          vercel_team_id?: string | null
          vercel_token?: string | null
        }
        Relationships: []
      }
      github_connections: {
        Row: {
          created_at: string
          github_username: string | null
          id: string
          personal_access_token: string | null
          repository_name: string | null
          repository_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          github_username?: string | null
          id?: string
          personal_access_token?: string | null
          repository_name?: string | null
          repository_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          github_username?: string | null
          id?: string
          personal_access_token?: string | null
          repository_name?: string | null
          repository_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          details: Json
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_payment_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          created_at: string
          id: string
          payment_method: string
          payment_reference: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          created_at?: string
          id?: string
          payment_method: string
          payment_reference?: string | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          created_at?: string
          id?: string
          payment_method?: string
          payment_reference?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_payment_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_integrations: {
        Row: {
          connection_status: string
          created_at: string
          id: string
          integration_type: string
          is_connected: boolean
          last_sync_at: string | null
          project_id: string
          supabase_anon_key: string | null
          supabase_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_status?: string
          created_at?: string
          id?: string
          integration_type?: string
          is_connected?: boolean
          last_sync_at?: string | null
          project_id: string
          supabase_anon_key?: string | null
          supabase_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_status?: string
          created_at?: string
          id?: string
          integration_type?: string
          is_connected?: boolean
          last_sync_at?: string | null
          project_id?: string
          supabase_anon_key?: string | null
          supabase_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          custom_domain: string | null
          deployment_id: string | null
          deployment_url: string | null
          description: string | null
          domain_status: string | null
          id: string
          is_published: boolean | null
          name: string
          published_domain: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          deployment_id?: string | null
          deployment_url?: string | null
          description?: string | null
          domain_status?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          published_domain?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          deployment_id?: string | null
          deployment_url?: string | null
          description?: string | null
          domain_status?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          published_domain?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          contact_email: string | null
          contact_facebook: string | null
          contact_instagram: string | null
          contact_linkedin: string | null
          contact_twitter: string | null
          contact_whatsapp: string | null
          created_at: string
          hero_subtitle: string
          hero_title: string
          id: string
          site_name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_facebook?: string | null
          contact_instagram?: string | null
          contact_linkedin?: string | null
          contact_twitter?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          hero_subtitle?: string
          hero_title?: string
          id?: string
          site_name?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_facebook?: string | null
          contact_instagram?: string | null
          contact_linkedin?: string | null
          contact_twitter?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          hero_subtitle?: string
          hero_title?: string
          id?: string
          site_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          credits_per_month: number
          id: string
          is_active: boolean
          max_builds: number
          max_storage_mb: number
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_per_month?: number
          id?: string
          is_active?: boolean
          max_builds: number
          max_storage_mb: number
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_per_month?: number
          id?: string
          is_active?: boolean
          max_builds?: number
          max_storage_mb?: number
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      supabase_connections: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_validated_at: string | null
          project_name: string | null
          supabase_service_key: string
          supabase_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          project_name?: string | null
          supabase_service_key: string
          supabase_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          project_name?: string | null
          supabase_service_key?: string
          supabase_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          auto_save_enabled: boolean
          created_at: string
          custom_api_key: string | null
          custom_api_url: string | null
          id: string
          narrative_style: string
          preview_in_new_tab: boolean
          updated_at: string
          use_custom_ai: boolean
          user_id: string | null
        }
        Insert: {
          auto_save_enabled?: boolean
          created_at?: string
          custom_api_key?: string | null
          custom_api_url?: string | null
          id?: string
          narrative_style?: string
          preview_in_new_tab?: boolean
          updated_at?: string
          use_custom_ai?: boolean
          user_id?: string | null
        }
        Update: {
          auto_save_enabled?: boolean
          created_at?: string
          custom_api_key?: string | null
          custom_api_url?: string | null
          id?: string
          narrative_style?: string
          preview_in_new_tab?: boolean
          updated_at?: string
          use_custom_ai?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          builds_used: number
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan_id: string
          started_at: string
          storage_used_mb: number
          updated_at: string
          user_id: string
        }
        Insert: {
          builds_used?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id: string
          started_at?: string
          storage_used_mb?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          builds_used?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string
          started_at?: string
          storage_used_mb?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          created_at: string
          credits: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_ai_provider: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
