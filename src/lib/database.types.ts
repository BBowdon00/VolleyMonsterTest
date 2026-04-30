// Generated from SCHEMA.sql — replace with:
//   npx supabase gen types typescript --project-id zjqoyxxjadqkfzymktgd > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TournamentStatus = 'draft' | 'published' | 'closed' | 'completed' | 'cancelled'
export type DivisionGender = 'mens' | 'womens' | 'coed' | 'boys' | 'girls'
export type TeamFormat = 'doubles' | 'triples' | 'quads' | 'sixes'
export type TeamStatus = 'pending_payment' | 'confirmed' | 'waitlisted' | 'cancelled'
export type RegistrationStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export type Database = {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string
          slug: string
          name: string
          description_md: string | null
          hero_image_url: string | null
          location_name: string | null
          location_city: string | null
          location_state: string | null
          location_address: string | null
          start_date: string // date → 'YYYY-MM-DD'
          end_date: string | null
          registration_opens_at: string | null
          registration_closes_at: string | null
          schedule_md: string | null
          faq_md: string | null
          status: TournamentStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['tournaments']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['tournaments']['Insert']>
      }
      tournament_days: {
        Row: {
          id: string
          tournament_id: string
          day_date: string // date → 'YYYY-MM-DD'
          label: string | null
          description_md: string | null
          check_in_time: string | null // time → 'HH:MM:SS'
          start_time: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['tournament_days']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['tournament_days']['Insert']>
      }
      divisions: {
        Row: {
          id: string
          tournament_day_id: string
          skill_level: string
          gender: DivisionGender
          display_name: string // generated column: e.g., "Men's Open"
          fee_cents: number
          max_teams: number | null // null = uncapped
          format: TeamFormat
          team_size: number // generated: doubles=2, triples=3, quads=4, sixes=6
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['divisions']['Row'],
          'id' | 'display_name' | 'team_size' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['divisions']['Insert']>
      }
      teams: {
        Row: {
          id: string
          division_id: string
          name: string
          city: string | null
          captain_name: string
          captain_email: string
          captain_phone: string
          status: TeamStatus
          management_token: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['teams']['Row'],
          'id' | 'management_token' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
      }
      players: {
        Row: {
          id: string
          team_id: string
          name: string
          jersey_number: string | null // text in DB
          shirt_size: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['players']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['players']['Insert']>
      }
      registration_orders: {
        Row: {
          id: string
          captain_email: string
          total_cents: number
          currency: string
          status: RegistrationStatus
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['registration_orders']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['registration_orders']['Insert']>
      }
      registrations: {
        Row: {
          id: string
          order_id: string
          team_id: string
          amount_cents: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['registrations']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['registrations']['Insert']>
      }
      payments: {
        Row: {
          id: string
          order_id: string
          stripe_payment_intent_id: string
          stripe_charge_id: string | null
          amount_cents: number
          currency: string
          status: string // raw Stripe status string
          refunded_amount_cents: number
          refunded_at: string | null
          raw_event: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['payments']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      processed_webhooks: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
        }
        Insert: Database['public']['Tables']['processed_webhooks']['Row']
        Update: Partial<Database['public']['Tables']['processed_webhooks']['Insert']>
      }
    }
    Views: {
      teams_public: {
        Row: {
          id: string
          division_id: string
          name: string
          city: string | null
          captain_first_name: string
          created_at: string
        }
      }
      division_capacity: {
        Row: {
          division_id: string
          tournament_day_id: string
          tournament_id: string
          skill_level: string
          gender: DivisionGender
          display_name: string
          format: TeamFormat
          max_teams: number | null
          confirmed_teams: number
          spots_remaining: number | null
        }
      }
    }
    Functions: {
      manage_team_lookup: {
        Args: { token: string }
        Returns: Array<{
          team_id: string
          team_name: string
          city: string | null
          captain_name: string
          captain_email: string
          captain_phone: string
          status: TeamStatus
          division_name: string
          tournament_name: string
          tournament_date: string
          players: Json
        }>
      }
      manage_team_update_player: {
        Args: {
          token: string
          player_id: string
          new_name: string
          new_jersey_number: string | null
          new_shirt_size: string | null
        }
        Returns: boolean
      }
      register_order: {
        Args: {
          p_captain_email: string
          p_captain_name: string
          p_captain_phone: string
          p_captain_city: string
          p_total_cents: number
          p_teams: Json
        }
        Returns: Json
      }
    }
    Enums: {
      tournament_status: TournamentStatus
      division_gender: DivisionGender
      team_format: TeamFormat
      team_status: TeamStatus
      registration_status: RegistrationStatus
    }
  }
}
