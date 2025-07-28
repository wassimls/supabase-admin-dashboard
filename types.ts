export type Json = any;

export type Database = {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          id: number
          user_id: string
          plan: string
          status: string
          start_date: string
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          plan: string
          status: string
          start_date: string
          end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          plan?: string
          status?: string
          start_date?: string
          end_date?: string | null
          created_at?: string
        }
      }
      referral_usage: {
        Row: {
          id: number
          referral_code: string
          user_id: string
          used_at: string
          details: Json | null
        }
        Insert: {
          id?: number
          referral_code: string
          user_id: string
          used_at?: string
          details?: Json | null
        }
        Update: {
          id?: number
          referral_code?: string
          user_id?: string
          used_at?: string
          details?: Json | null
        }
      }
      user_progress: {
        Row: {
          id: number
          user_id: string
          course_id: string
          lesson_id: string
          progress_percentage: number
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          course_id: string
          lesson_id: string
          progress_percentage?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          course_id?: string
          lesson_id?: string
          progress_percentage?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
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
