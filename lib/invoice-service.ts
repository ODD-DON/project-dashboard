// New service layer for invoice operations
import { supabase } from "./supabase"
import type { PendingInvoice, InvoiceHistory } from "./supabase-types"

export class InvoiceService {
  // Load all pending invoices (projects ready for invoicing)
  static async loadPendingInvoices(): Promise<{ [brand: string]: PendingInvoice[] }> {
    console.log("📋 Loading pending invoices...")

    const { data, error } = await supabase
      .from("pending_invoices")
      .select("*")
      .order("added_to_invoice_at", { ascending: false })

    if (error) {
      console.error("❌ Error loading pending invoices:", error)
      throw new Error(`Failed to load pending invoices: ${error.message}`)
    }

    // Group by brand
    const grouped: { [brand: string]: PendingInvoice[] } = {
      "Wami Live": [],
      "Luck On Fourth": [],
      "The Hideout": [],
    }

    data?.forEach((invoice) => {
      if (grouped[invoice.brand]) {
        grouped[invoice.brand].push(invoice)
      }
    })

    console.log("✅ Pending invoices loaded:", grouped)
    return grouped
  }

  // Load invoice history (exported invoices)
  static async loadInvoiceHistory(): Promise<{ [brand: string]: InvoiceHistory[] }> {
    console.log("📄 Loading invoice history...")

    const { data, error } = await supabase
      .from("invoice_history")
      .select("*")
      .order("exported_at", { ascending: false })

    if (error) {
      console.error("❌ Error loading invoice history:", error)
      throw new Error(`Failed to load invoice history: ${error.message}`)
    }

    // Group by brand
    const grouped: { [brand: string]: InvoiceHistory[] } = {
      "Wami Live": [],
      "Luck On Fourth": [],
      "The Hideout": [],
    }

    data?.forEach((invoice) => {
      if (grouped[invoice.brand]) {
        grouped[invoice.brand].push(invoice)
      }
    })

    console.log("✅ Invoice history loaded:", grouped)
    return grouped
  }

  // Load invoice counters
  static async loadInvoiceCounters(): Promise<{ [brand: string]: number }> {
    console.log("🔢 Loading invoice counters...")

    const { data, error } = await supabase.from("invoice_counters").select("*")

    if (error) {
      console.error("❌ Error loading invoice counters:", error)
      throw new Error(`Failed to load invoice counters: ${error.message}`)
    }

    const counters: { [brand: string]: number } = {
      "Wami Live": 1000,
      "Luck On Fourth": 2000,
      "The Hideout": 3000,
    }

    data?.forEach((counter) => {
      counters[counter.brand] = counter.next_number
    })

    console.log("✅ Invoice counters loaded:", counters)
    return counters
  }

  // Add project to pending invoices
  static async addToPendingInvoice(project: any, invoicePrice: number): Promise<void> {
    console.log("💰 Adding project to pending invoices:", project.id)

    const { error } = await supabase.rpc("add_to_pending_invoice", {
      p_project_id: project.id,
      p_title: project.title,
      p_brand: project.brand,
      p_type: project.type,
      p_description: project.description,
      p_deadline: project.deadline.toISOString(),
      p_priority: project.priority,
      p_created_at: project.created_at.toISOString(),
      p_files: project.files,
      p_invoice_price: invoicePrice,
    })

    if (error) {
      console.error("❌ Error adding to pending invoice:", error)
      throw new Error(`Failed to add to pending invoice: ${error.message}`)
    }

    console.log("✅ Project added to pending invoices")
  }

  // Remove project from pending invoices
  static async removeFromPendingInvoice(projectId: string): Promise<void> {
    console.log("🗑️ Removing project from pending invoices:", projectId)

    const { error } = await supabase.from("pending_invoices").delete().eq("project_id", projectId)

    if (error) {
      console.error("❌ Error removing from pending invoice:", error)
      throw new Error(`Failed to remove from pending invoice: ${error.message}`)
    }

    console.log("✅ Project removed from pending invoices")
  }

  // Export invoice (atomic operation)
  static async exportInvoice(
    brand: string,
    invoiceNumber: string,
    fileName: string,
    totalAmount: number,
    projectIds: string[],
  ): Promise<void> {
    console.log("📤 Exporting invoice atomically:", { brand, invoiceNumber, fileName })

    const { error } = await supabase.rpc("export_invoice_atomic", {
      p_brand: brand,
      p_invoice_number: invoiceNumber,
      p_file_name: fileName,
      p_total_amount: totalAmount,
      p_project_ids: projectIds,
    })

    if (error) {
      console.error("❌ Error exporting invoice:", error)
      throw new Error(`Failed to export invoice: ${error.message}`)
    }

    console.log("✅ Invoice exported successfully")
  }

  // Toggle payment status
  static async togglePaymentStatus(invoiceId: string): Promise<void> {
    console.log("💳 Toggling payment status for invoice:", invoiceId)

    const { error } = await supabase.rpc("toggle_invoice_payment", {
      p_invoice_id: invoiceId,
    })

    if (error) {
      console.error("❌ Error toggling payment status:", error)
      throw new Error(`Failed to toggle payment status: ${error.message}`)
    }

    console.log("✅ Payment status toggled")
  }

  // Clear invoice history for a brand
  static async clearInvoiceHistory(brand: string): Promise<void> {
    console.log("🗑️ Clearing invoice history for brand:", brand)

    const { error } = await supabase.from("invoice_history").delete().eq("brand", brand)

    if (error) {
      console.error("❌ Error clearing invoice history:", error)
      throw new Error(`Failed to clear invoice history: ${error.message}`)
    }

    console.log("✅ Invoice history cleared")
  }
}
