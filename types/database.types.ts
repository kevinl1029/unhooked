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
      captured_moments: {
        Row: {
          audio_clip_path: string | null
          audio_duration_ms: number | null
          confidence_score: number | null
          conversation_id: string | null
          created_at: string | null
          emotional_valence: string | null
          id: string
          illusion_key: string | null
          illusion_layer: string | null
          is_user_highlighted: boolean | null
          last_used_at: string | null
          message_id: string | null
          moment_type: string
          session_type: string | null
          times_played_back: number | null
          transcript: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_clip_path?: string | null
          audio_duration_ms?: number | null
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          emotional_valence?: string | null
          id?: string
          illusion_key?: string | null
          illusion_layer?: string | null
          is_user_highlighted?: boolean | null
          last_used_at?: string | null
          message_id?: string | null
          moment_type: string
          session_type?: string | null
          times_played_back?: number | null
          transcript: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_clip_path?: string | null
          audio_duration_ms?: number | null
          confidence_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          emotional_valence?: string | null
          id?: string
          illusion_key?: string | null
          illusion_layer?: string | null
          is_user_highlighted?: boolean | null
          last_used_at?: string | null
          message_id?: string | null
          moment_type?: string
          session_type?: string | null
          times_played_back?: number | null
          transcript?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captured_moments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captured_moments_illusion_key_fkey"
            columns: ["illusion_key"]
            isOneToOne: false
            referencedRelation: "illusions"
            referencedColumns: ["illusion_key"]
          },
          {
            foreignKeyName: "captured_moments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ceremony_artifacts: {
        Row: {
          artifact_type: string
          audio_duration_ms: number | null
          audio_path: string | null
          ceremony_completed_at: string | null
          content_json: Json | null
          content_text: string | null
          created_at: string | null
          id: string
          included_moment_ids: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          artifact_type: string
          audio_duration_ms?: number | null
          audio_path?: string | null
          ceremony_completed_at?: string | null
          content_json?: Json | null
          content_text?: string | null
          created_at?: string | null
          id?: string
          included_moment_ids?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          artifact_type?: string
          audio_duration_ms?: number | null
          audio_path?: string | null
          ceremony_completed_at?: string | null
          content_json?: Json | null
          content_text?: string | null
          created_at?: string | null
          id?: string
          included_moment_ids?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      check_in_schedule: {
        Row: {
          check_in_type: string
          completed_at: string | null
          created_at: string | null
          email_sent_at: string | null
          expired_at: string | null
          id: string
          magic_link_token: string | null
          opened_at: string | null
          personalization_context: Json | null
          prompt_template: string
          response_conversation_id: string | null
          scheduled_for: string
          status: string | null
          timezone: string
          trigger_illusion_key: string | null
          trigger_session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          check_in_type: string
          completed_at?: string | null
          created_at?: string | null
          email_sent_at?: string | null
          expired_at?: string | null
          id?: string
          magic_link_token?: string | null
          opened_at?: string | null
          personalization_context?: Json | null
          prompt_template: string
          response_conversation_id?: string | null
          scheduled_for: string
          status?: string | null
          timezone?: string
          trigger_illusion_key?: string | null
          trigger_session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          check_in_type?: string
          completed_at?: string | null
          created_at?: string | null
          email_sent_at?: string | null
          expired_at?: string | null
          id?: string
          magic_link_token?: string | null
          opened_at?: string | null
          personalization_context?: Json | null
          prompt_template?: string
          response_conversation_id?: string | null
          scheduled_for?: string
          status?: string | null
          timezone?: string
          trigger_illusion_key?: string | null
          trigger_session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_in_schedule_response_conversation_id_fkey"
            columns: ["response_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_schedule_trigger_illusion_key_fkey"
            columns: ["trigger_illusion_key"]
            isOneToOne: false
            referencedRelation: "illusions"
            referencedColumns: ["illusion_key"]
          },
          {
            foreignKeyName: "check_in_schedule_trigger_session_id_fkey"
            columns: ["trigger_session_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          check_in_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          illusion_key: string | null
          illusion_layer: string | null
          illusion_number: number | null
          model: string | null
          session_abandoned_at: string | null
          session_completed: boolean | null
          session_type: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          check_in_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          illusion_key?: string | null
          illusion_layer?: string | null
          illusion_number?: number | null
          model?: string | null
          session_abandoned_at?: string | null
          session_completed?: boolean | null
          session_type?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          check_in_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          illusion_key?: string | null
          illusion_layer?: string | null
          illusion_number?: number | null
          model?: string | null
          session_abandoned_at?: string | null
          session_completed?: boolean | null
          session_type?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_in_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_myth_key_fkey"
            columns: ["illusion_key"]
            isOneToOne: false
            referencedRelation: "illusions"
            referencedColumns: ["illusion_key"]
          },
        ]
      }
      conviction_assessments: {
        Row: {
          conversation_id: string | null
          conviction_score: number
          created_at: string | null
          delta: number
          id: string
          illusion_key: string
          illusion_layer: string | null
          new_stakes: string[] | null
          new_triggers: string[] | null
          reasoning: string | null
          recommended_next_step: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          conviction_score: number
          created_at?: string | null
          delta: number
          id?: string
          illusion_key: string
          illusion_layer?: string | null
          new_stakes?: string[] | null
          new_triggers?: string[] | null
          reasoning?: string | null
          recommended_next_step?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          conviction_score?: number
          created_at?: string | null
          delta?: number
          id?: string
          illusion_key?: string
          illusion_layer?: string | null
          new_stakes?: string[] | null
          new_triggers?: string[] | null
          reasoning?: string | null
          recommended_next_step?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conviction_assessments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conviction_assessments_illusion_key_fkey"
            columns: ["illusion_key"]
            isOneToOne: false
            referencedRelation: "illusions"
            referencedColumns: ["illusion_key"]
          },
        ]
      }
      follow_up_schedule: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          magic_link_token: string | null
          milestone_type: string
          response_conversation_id: string | null
          scheduled_for: string
          status: string | null
          timezone: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          magic_link_token?: string | null
          milestone_type: string
          response_conversation_id?: string | null
          scheduled_for: string
          status?: string | null
          timezone: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          magic_link_token?: string | null
          milestone_type?: string
          response_conversation_id?: string | null
          scheduled_for?: string
          status?: string | null
          timezone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_schedule_response_conversation_id_fkey"
            columns: ["response_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_members: {
        Row: {
          amount_paid: number
          converted_at: string | null
          converted_to_user_id: string | null
          created_at: string | null
          currency: string | null
          email: string
          id: string
          landing_page_variant: string | null
          name: string | null
          paid_at: string
          referrer: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          welcome_email_sent: boolean | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          amount_paid: number
          converted_at?: string | null
          converted_to_user_id?: string | null
          created_at?: string | null
          currency?: string | null
          email: string
          id?: string
          landing_page_variant?: string | null
          name?: string | null
          paid_at: string
          referrer?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          welcome_email_sent?: boolean | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          amount_paid?: number
          converted_at?: string | null
          converted_to_user_id?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string
          id?: string
          landing_page_variant?: string | null
          name?: string | null
          paid_at?: string
          referrer?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          welcome_email_sent?: boolean | null
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      illusions: {
        Row: {
          display_name: string
          illusion_key: string
          illusion_number: number
          short_name: string
        }
        Insert: {
          display_name: string
          illusion_key: string
          illusion_number: number
          short_name: string
        }
        Update: {
          display_name?: string
          illusion_key?: string
          illusion_number?: number
          short_name?: string
        }
        Relationships: []
      }
      mailing_list: {
        Row: {
          bounce_type: string | null
          email: string
          email_status: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          source: string | null
          status_updated_at: string | null
          subscribed_at: string | null
          unsubscribed_at: string | null
          user_agent: string | null
        }
        Insert: {
          bounce_type?: string | null
          email: string
          email_status?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          source?: string | null
          status_updated_at?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          user_agent?: string | null
        }
        Update: {
          bounce_type?: string | null
          email?: string
          email_status?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          source?: string | null
          status_updated_at?: string | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          input_modality: string | null
          message_length: number | null
          metadata: Json | null
          role: string
          time_since_last_message: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          input_modality?: string | null
          message_length?: number | null
          metadata?: Json | null
          role: string
          time_since_last_message?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          input_modality?: string | null
          message_length?: number | null
          metadata?: Json | null
          role?: string
          time_since_last_message?: number | null
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
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_intake: {
        Row: {
          created_at: string | null
          id: string
          longest_quit_duration: string | null
          previous_attempts: number | null
          primary_reason: string
          product_types: string[]
          triggers: string[] | null
          updated_at: string | null
          usage_frequency: string
          user_id: string
          years_using: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          longest_quit_duration?: string | null
          previous_attempts?: number | null
          primary_reason: string
          product_types: string[]
          triggers?: string[] | null
          updated_at?: string | null
          usage_frequency: string
          user_id: string
          years_using?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          longest_quit_duration?: string | null
          previous_attempts?: number | null
          primary_reason?: string
          product_types?: string[]
          triggers?: string[] | null
          updated_at?: string | null
          usage_frequency?: string
          user_id?: string
          years_using?: number | null
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          ceremony_completed_at: string | null
          ceremony_skipped_final_dose: boolean | null
          completed_at: string | null
          created_at: string | null
          current_illusion: number | null
          current_layer: string | null
          id: string
          illusion_order: number[] | null
          illusions_completed: number[] | null
          last_reminded_at: string | null
          last_session_at: string | null
          program_status: string | null
          started_at: string | null
          timezone: string | null
          total_sessions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ceremony_completed_at?: string | null
          ceremony_skipped_final_dose?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_illusion?: number | null
          current_layer?: string | null
          id?: string
          illusion_order?: number[] | null
          illusions_completed?: number[] | null
          last_reminded_at?: string | null
          last_session_at?: string | null
          program_status?: string | null
          started_at?: string | null
          timezone?: string | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ceremony_completed_at?: string | null
          ceremony_skipped_final_dose?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          current_illusion?: number | null
          current_layer?: string | null
          id?: string
          illusion_order?: number[] | null
          illusions_completed?: number[] | null
          last_reminded_at?: string | null
          last_session_at?: string | null
          program_status?: string | null
          started_at?: string | null
          timezone?: string | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_story: {
        Row: {
          created_at: string | null
          focus_conviction: number | null
          focus_key_insight_id: string | null
          focus_resistance_notes: string | null
          id: string
          identity_conviction: number | null
          identity_key_insight_id: string | null
          identity_resistance_notes: string | null
          origin_moment_ids: string[] | null
          origin_summary: string | null
          overall_readiness: number | null
          personal_stakes: string[] | null
          pleasure_conviction: number | null
          pleasure_key_insight_id: string | null
          pleasure_resistance_notes: string | null
          primary_triggers: string[] | null
          stress_relief_conviction: number | null
          stress_relief_key_insight_id: string | null
          stress_relief_resistance_notes: string | null
          updated_at: string | null
          user_id: string
          willpower_conviction: number | null
          willpower_key_insight_id: string | null
          willpower_resistance_notes: string | null
        }
        Insert: {
          created_at?: string | null
          focus_conviction?: number | null
          focus_key_insight_id?: string | null
          focus_resistance_notes?: string | null
          id?: string
          identity_conviction?: number | null
          identity_key_insight_id?: string | null
          identity_resistance_notes?: string | null
          origin_moment_ids?: string[] | null
          origin_summary?: string | null
          overall_readiness?: number | null
          personal_stakes?: string[] | null
          pleasure_conviction?: number | null
          pleasure_key_insight_id?: string | null
          pleasure_resistance_notes?: string | null
          primary_triggers?: string[] | null
          stress_relief_conviction?: number | null
          stress_relief_key_insight_id?: string | null
          stress_relief_resistance_notes?: string | null
          updated_at?: string | null
          user_id: string
          willpower_conviction?: number | null
          willpower_key_insight_id?: string | null
          willpower_resistance_notes?: string | null
        }
        Update: {
          created_at?: string | null
          focus_conviction?: number | null
          focus_key_insight_id?: string | null
          focus_resistance_notes?: string | null
          id?: string
          identity_conviction?: number | null
          identity_key_insight_id?: string | null
          identity_resistance_notes?: string | null
          origin_moment_ids?: string[] | null
          origin_summary?: string | null
          overall_readiness?: number | null
          personal_stakes?: string[] | null
          pleasure_conviction?: number | null
          pleasure_key_insight_id?: string | null
          pleasure_resistance_notes?: string | null
          primary_triggers?: string[] | null
          stress_relief_conviction?: number | null
          stress_relief_key_insight_id?: string | null
          stress_relief_resistance_notes?: string | null
          updated_at?: string | null
          user_id?: string
          willpower_conviction?: number | null
          willpower_key_insight_id?: string | null
          willpower_resistance_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_focus_insight"
            columns: ["focus_key_insight_id"]
            isOneToOne: false
            referencedRelation: "captured_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_identity_insight"
            columns: ["identity_key_insight_id"]
            isOneToOne: false
            referencedRelation: "captured_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pleasure_insight"
            columns: ["pleasure_key_insight_id"]
            isOneToOne: false
            referencedRelation: "captured_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_relief_insight"
            columns: ["stress_relief_key_insight_id"]
            isOneToOne: false
            referencedRelation: "captured_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_willpower_insight"
            columns: ["willpower_key_insight_id"]
            isOneToOne: false
            referencedRelation: "captured_moments"
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
