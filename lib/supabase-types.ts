// Updated TypeScript types for the new invoice system
export interface PendingInvoice {
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

export interface InvoiceHistory {
  id: string
  invoice_number: string
  brand: string
  file_name: string
  total_amount: number
  exported_at: string
  is_paid: boolean
  projects_data: any[]
}

export interface InvoiceCounter {
  brand: string
  next_number: number
}

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
      pending_invoices: {
        Row: PendingInvoice
        Insert: Omit<PendingInvoice, "id" | "added_to_invoice_at"> & {
          id?: string
          added_to_invoice_at?: string
        }
        Update: Partial<PendingInvoice>
      }
      invoice_history: {
        Row: InvoiceHistory
        Insert: Omit<InvoiceHistory, "id" | "exported_at"> & {
          id?: string
          exported_at?: string
        }
        Update: Partial<InvoiceHistory>
      }
      invoice_counters: {
        Row: InvoiceCounter
        Insert: InvoiceCounter
        Update: Partial<InvoiceCounter>
      }
    }
    Functions: {
      export_invoice_atomic: {
        Args: {
          p_brand: string
          p_invoice_number: string
          p_file_name: string
          p_total_amount: number
          p_project_ids: string[]
        }
        Returns: boolean
      }
      add_to_pending_invoice: {
        Args: {
          p_project_id: string
          p_title: string
          p_brand: string
          p_type: string
          p_description: string
          p_deadline: string
          p_priority: number
          p_created_at: string
          p_files: any
          p_invoice_price: number
        }
        Returns: boolean
      }
      toggle_invoice_payment: {
        Args: {
          p_invoice_id: string
        }
        Returns: boolean
      }
    }
  }
}
