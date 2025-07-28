import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          title: string
          brand: string
          type: string
          description: string
          deadline: string
          priority: number
          status: string
          created_at: string
          files: any[]
        }
        Insert: {
          id?: string
          title: string
          brand: string
          type: string
          description: string
          deadline: string
          priority: number
          status?: string
          created_at?: string
          files?: any[]
        }
        Update: {
          id?: string
          title?: string
          brand?: string
          type?: string
          description?: string
          deadline?: string
          priority?: number
          status?: string
          created_at?: string
          files?: any[]
        }
      }
      invoice_projects: {
        Row: {
          id: string
          project_id: string
          title: string
          brand: string
          type: string
          description: string
          deadline: string
          priority: number
          status: string
          created_at: string
          files: any[]
          invoice_price: number
          added_to_invoice_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          brand: string
          type: string
          description: string
          deadline: string
          priority: number
          status: string
          created_at: string
          files?: any[]
          invoice_price: number
          added_to_invoice_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          brand?: string
          type?: string
          description?: string
          deadline?: string
          priority?: number
          status?: string
          created_at?: string
          files?: any[]
          invoice_price?: number
          added_to_invoice_at?: string
        }
      }
      exported_invoices: {
        Row: {
          id: string
          invoice_number: string
          brand: string
          file_name: string
          total_amount: number
          exported_at: string
          is_paid: boolean
          projects: any[]
        }
        Insert: {
          id?: string
          invoice_number: string
          brand: string
          file_name: string
          total_amount: number
          exported_at?: string
          is_paid?: boolean
          projects: any[]
        }
        Update: {
          id?: string
          invoice_number?: string
          brand?: string
          file_name?: string
          total_amount?: number
          exported_at?: string
          is_paid?: boolean
          projects?: any[]
        }
      }
      invoice_numbers: {
        Row: {
          brand: string
          next_number: number
        }
        Insert: {
          brand: string
          next_number?: number
        }
        Update: {
          brand?: string
          next_number?: number
        }
      }
    }
  }
}
