
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "referral_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
