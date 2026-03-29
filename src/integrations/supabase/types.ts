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
      ab_tests: {
        Row: {
          broadcast_id: string | null
          completed_at: string | null
          created_at: string
          duration_hours: number
          id: string
          results: Json | null
          started_at: string | null
          status: string
          test_size_percent: number
          updated_at: string
          user_id: string
          variants: Json
          winner_variant: string | null
          winning_metric: string
        }
        Insert: {
          broadcast_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_hours?: number
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string
          test_size_percent?: number
          updated_at?: string
          user_id: string
          variants?: Json
          winner_variant?: string | null
          winning_metric?: string
        }
        Update: {
          broadcast_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_hours?: number
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string
          test_size_percent?: number
          updated_at?: string
          user_id?: string
          variants?: Json
          winner_variant?: string | null
          winning_metric?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_goals: {
        Row: {
          activity_type: string
          created_at: string
          daily_target: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          daily_target?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          daily_target?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_queue: {
        Row: {
          automation_id: string
          created_at: string
          email: string
          first_name: string | null
          id: string
          processed_at: string | null
          send_at: string
          status: string
          step_data: Json
          step_index: number
        }
        Insert: {
          automation_id: string
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          processed_at?: string | null
          send_at: string
          status?: string
          step_data: Json
          step_index: number
        }
        Update: {
          automation_id?: string
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          processed_at?: string | null
          send_at?: string
          status?: string
          step_data?: Json
          step_index?: number
        }
        Relationships: []
      }
      automations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
          workflow: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id: string
          workflow?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
          workflow?: Json
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          brand: string
          content: string
          created_at: string
          from_name: string
          id: string
          preview_text: string | null
          reply_to: string
          scheduled_at: string | null
          segment_id: string | null
          sent_at: string | null
          status: string
          subject: string
          total_failed: number | null
          total_recipients: number | null
          total_sent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string
          content?: string
          created_at?: string
          from_name?: string
          id?: string
          preview_text?: string | null
          reply_to?: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          total_failed?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          content?: string
          created_at?: string
          from_name?: string
          id?: string
          preview_text?: string | null
          reply_to?: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          total_failed?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          notes: string | null
          outcome: string | null
          prospect_id: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          prospect_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          prospect_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          broadcast_id: string | null
          created_at: string
          email: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          broadcast_id?: string | null
          created_at?: string
          email: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          broadcast_id?: string | null
          created_at?: string
          email?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          brand: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_premium: boolean
          name: string
          preview_gradient: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          name: string
          preview_gradient?: string | null
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          name?: string
          preview_gradient?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kb_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          id: string
          metadata_json: Json | null
          search_vector: unknown
          source_id: string
        }
        Insert: {
          chunk_index?: number
          chunk_text: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          search_vector?: unknown
          source_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          search_vector?: unknown
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "kb_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_ingestion_jobs: {
        Row: {
          chunks_created: number | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          source_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          chunks_created?: number | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          source_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          chunks_created?: number | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          source_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_ingestion_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "kb_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_query_log: {
        Row: {
          context: Json | null
          created_at: string
          feedback: string | null
          id: string
          outcome: string | null
          query: string
          response: string | null
          retrieved_sources: Json | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          feedback?: string | null
          id?: string
          outcome?: string | null
          query: string
          response?: string | null
          retrieved_sources?: Json | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          feedback?: string | null
          id?: string
          outcome?: string | null
          query?: string
          response?: string | null
          retrieved_sources?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      kb_sources: {
        Row: {
          collection: string
          created_at: string
          file_size: number | null
          filename: string
          id: string
          mime_type: string | null
          status: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          collection?: string
          created_at?: string
          file_size?: number | null
          filename: string
          id?: string
          mime_type?: string | null
          status?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          collection?: string
          created_at?: string
          file_size?: number | null
          filename?: string
          id?: string
          mime_type?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: []
      }
      plan_meetings: {
        Row: {
          attendees: Json | null
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          notes: string | null
          project_id: string | null
          start_time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees?: Json | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          start_time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees?: Json | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          links_json: Json | null
          note_date: string
          structure_json: Json | null
          structured_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          links_json?: Json | null
          note_date?: string
          structure_json?: Json | null
          structured_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          links_json?: Json | null
          note_date?: string
          structure_json?: Json | null
          structured_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_reminders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_done: boolean
          project_id: string | null
          reminder_time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_done?: boolean
          project_id?: string | null
          reminder_time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_done?: boolean
          project_id?: string | null
          reminder_time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          id: string
          order_index: number
          priority: string
          project_id: string | null
          source: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          order_index?: number
          priority?: string
          project_id?: string | null
          source?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          order_index?: number
          priority?: string
          project_id?: string | null
          source?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          display_name: string | null
          id: string
          timezone: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      prospect_tags: {
        Row: {
          created_at: string
          id: string
          prospect_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prospect_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prospect_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_tags_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          action_taken: string | null
          additional_notes: string | null
          aplgo_id: string | null
          assigned_to: string | null
          associate_status: string | null
          city: string | null
          communication_status: string | null
          country: string | null
          created_at: string
          date_captured: string | null
          email: string
          email_normalized: string | null
          engagement_score: number
          first_name: string | null
          focus_area: string | null
          full_name: string | null
          go_status: string | null
          id: string
          interest_level: string | null
          last_activity_at: string | null
          lead_path: string | null
          lead_temperature: string | null
          lead_type: string | null
          meeting_time: string | null
          next_action: string | null
          phone_normalized: string | null
          phone_number: string | null
          province: string | null
          registration_status: string | null
          source: string | null
          sponsor_name: string | null
          state: string | null
          unsubscribe_token: string | null
          unsubscribed: boolean
        }
        Insert: {
          action_taken?: string | null
          additional_notes?: string | null
          aplgo_id?: string | null
          assigned_to?: string | null
          associate_status?: string | null
          city?: string | null
          communication_status?: string | null
          country?: string | null
          created_at?: string
          date_captured?: string | null
          email: string
          email_normalized?: string | null
          engagement_score?: number
          first_name?: string | null
          focus_area?: string | null
          full_name?: string | null
          go_status?: string | null
          id?: string
          interest_level?: string | null
          last_activity_at?: string | null
          lead_path?: string | null
          lead_temperature?: string | null
          lead_type?: string | null
          meeting_time?: string | null
          next_action?: string | null
          phone_normalized?: string | null
          phone_number?: string | null
          province?: string | null
          registration_status?: string | null
          source?: string | null
          sponsor_name?: string | null
          state?: string | null
          unsubscribe_token?: string | null
          unsubscribed?: boolean
        }
        Update: {
          action_taken?: string | null
          additional_notes?: string | null
          aplgo_id?: string | null
          assigned_to?: string | null
          associate_status?: string | null
          city?: string | null
          communication_status?: string | null
          country?: string | null
          created_at?: string
          date_captured?: string | null
          email?: string
          email_normalized?: string | null
          engagement_score?: number
          first_name?: string | null
          focus_area?: string | null
          full_name?: string | null
          go_status?: string | null
          id?: string
          interest_level?: string | null
          last_activity_at?: string | null
          lead_path?: string | null
          lead_temperature?: string | null
          lead_type?: string | null
          meeting_time?: string | null
          next_action?: string | null
          phone_normalized?: string | null
          phone_number?: string | null
          province?: string | null
          registration_status?: string | null
          source?: string | null
          sponsor_name?: string | null
          state?: string | null
          unsubscribe_token?: string | null
          unsubscribed?: boolean
        }
        Relationships: []
      }
      segments: {
        Row: {
          created_at: string
          description: string | null
          filters: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
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
      zazi_inbound_replies: {
        Row: {
          account_id: string | null
          body_html: string | null
          body_text: string | null
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          in_reply_to: string | null
          intent_tag: string | null
          internal_notes: string | null
          is_read: boolean
          is_starred: boolean
          matched_broadcast_id: string | null
          matched_outbound_id: string | null
          matched_sequence_id: string | null
          matched_sequence_step_index: number | null
          prospect_id: string | null
          provider_message_id: string | null
          received_at: string
          references_header: string | null
          reply_status: string
          sender_email: string
          sender_name: string | null
          snippet: string | null
          snoozed_until: string | null
          subject: string | null
          thread_id: string | null
          user_id: string
          waiting_on: string | null
        }
        Insert: {
          account_id?: string | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          in_reply_to?: string | null
          intent_tag?: string | null
          internal_notes?: string | null
          is_read?: boolean
          is_starred?: boolean
          matched_broadcast_id?: string | null
          matched_outbound_id?: string | null
          matched_sequence_id?: string | null
          matched_sequence_step_index?: number | null
          prospect_id?: string | null
          provider_message_id?: string | null
          received_at?: string
          references_header?: string | null
          reply_status?: string
          sender_email: string
          sender_name?: string | null
          snippet?: string | null
          snoozed_until?: string | null
          subject?: string | null
          thread_id?: string | null
          user_id: string
          waiting_on?: string | null
        }
        Update: {
          account_id?: string | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          in_reply_to?: string | null
          intent_tag?: string | null
          internal_notes?: string | null
          is_read?: boolean
          is_starred?: boolean
          matched_broadcast_id?: string | null
          matched_outbound_id?: string | null
          matched_sequence_id?: string | null
          matched_sequence_step_index?: number | null
          prospect_id?: string | null
          provider_message_id?: string | null
          received_at?: string
          references_header?: string | null
          reply_status?: string
          sender_email?: string
          sender_name?: string | null
          snippet?: string | null
          snoozed_until?: string | null
          subject?: string | null
          thread_id?: string | null
          user_id?: string
          waiting_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zazi_inbound_replies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "zazi_reply_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zazi_inbound_replies_matched_broadcast_id_fkey"
            columns: ["matched_broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zazi_inbound_replies_matched_outbound_id_fkey"
            columns: ["matched_outbound_id"]
            isOneToOne: false
            referencedRelation: "zazi_outbound_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zazi_inbound_replies_matched_sequence_id_fkey"
            columns: ["matched_sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zazi_inbound_replies_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      zazi_outbound_sends: {
        Row: {
          account_id: string | null
          brand: string
          broadcast_id: string | null
          created_at: string
          id: string
          prospect_id: string | null
          provider_message_id: string | null
          provider_thread_id: string | null
          recipient_email: string
          sent_at: string
          sequence_id: string | null
          sequence_step_index: number | null
          subject: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          brand?: string
          broadcast_id?: string | null
          created_at?: string
          id?: string
          prospect_id?: string | null
          provider_message_id?: string | null
          provider_thread_id?: string | null
          recipient_email: string
          sent_at?: string
          sequence_id?: string | null
          sequence_step_index?: number | null
          subject: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          brand?: string
          broadcast_id?: string | null
          created_at?: string
          id?: string
          prospect_id?: string | null
          provider_message_id?: string | null
          provider_thread_id?: string | null
          recipient_email?: string
          sent_at?: string
          sequence_id?: string | null
          sequence_step_index?: number | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zazi_outbound_sends_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "zazi_reply_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zazi_outbound_sends_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zazi_outbound_sends_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zazi_outbound_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      zazi_reply_accounts: {
        Row: {
          account_email: string
          brand: string
          config_json: Json | null
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          provider: string
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email: string
          brand?: string
          config_json?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          provider?: string
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string
          brand?: string
          config_json?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          provider?: string
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zazi_reply_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string
          id: string
          reply_id: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string
          id?: string
          reply_id: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          reply_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zazi_reply_actions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "zazi_inbound_replies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_segment_prospects: {
        Args: { segment_filters: Json }
        Returns: {
          action_taken: string | null
          additional_notes: string | null
          aplgo_id: string | null
          assigned_to: string | null
          associate_status: string | null
          city: string | null
          communication_status: string | null
          country: string | null
          created_at: string
          date_captured: string | null
          email: string
          email_normalized: string | null
          engagement_score: number
          first_name: string | null
          focus_area: string | null
          full_name: string | null
          go_status: string | null
          id: string
          interest_level: string | null
          last_activity_at: string | null
          lead_path: string | null
          lead_temperature: string | null
          lead_type: string | null
          meeting_time: string | null
          next_action: string | null
          phone_normalized: string | null
          phone_number: string | null
          province: string | null
          registration_status: string | null
          source: string | null
          sponsor_name: string | null
          state: string | null
          unsubscribe_token: string | null
          unsubscribed: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "prospects"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_engagement_scores: { Args: never; Returns: undefined }
      search_kb_chunks: {
        Args: {
          collection_filter?: string
          max_results?: number
          search_query: string
        }
        Returns: {
          chunk_id: string
          chunk_text: string
          collection: string
          filename: string
          rank: number
          source_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
