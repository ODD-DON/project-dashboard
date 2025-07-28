"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Download, FileText, DollarSign, Trash2 } from "lucide-react"
import { format } from "date-fns"
import jsPDF from "jspdf"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

interface InvoiceProject {
  id: string
  title: string
  brand: string
  type: string
  description: string
  deadline: Date
  priority: number
  status: string
  created_at: Date
  files: any[]
  invoicePrice?: number
  addedToInvoiceAt?: Date
}

interface ExportedInvoice {
  id: string
  invoiceNumber: string
  brand: string
  fileName: string
  totalAmount: number
  exportedAt: Date
  isPaid: boolean
  projects: InvoiceProject[]
}

interface InvoiceManagerProps {
  invoiceProjects: { [brand: string]: InvoiceProject[] }
  setInvoiceProjects: React.Dispatch<React.SetStateAction<{ [brand: string]: InvoiceProject[] }>>
  onClearInvoiceHistory: (brand: string, count: number) => void
  exportedInvoices: { [brand: string]: ExportedInvoice[] }
  setExportedInvoices: React.Dispatch<React.SetStateAction<{ [brand: string]: ExportedInvoice[] }>>
  onDeleteProject: (brand: string, projectId: string, projectTitle: string) => void
  invoiceNumbers: { [brand: string]: number }
  setInvoiceNumbers: React.Dispatch<React.SetStateAction<{ [brand: string]: number }>>
  onReloadData: () => Promise<void>
}

const brandColors = {
  "Wami Live": "bg-purple-100 text-purple-800 border-purple-200",
  "Luck On Fourth": "bg-green-100 text-green-800 border-green-200",
  "The Hideout": "bg-orange-100 text-orange-800 border-orange-200",
}

const brandClients = {
  "Wami Live": "WAMI LIVE INC",
  "Luck On Fourth": "In And Out Gaming LLC",
  "The Hideout": "The Hideout Gaming LLC",
}

export function InvoiceManager({
  invoiceProjects,
  setInvoiceProjects,
  onClearInvoiceHistory,
  exportedInvoices,
  setExportedInvoices,
  onDeleteProject,
  invoiceNumbers,
  setInvoiceNumbers,
  onReloadData,
}: InvoiceManagerProps) {
  const getBrandTotal = (brand: string) => {
    return invoiceProjects[brand]?.reduce((sum, project) => sum + (project.invoicePrice || 0), 0) || 0
  }

  const toggleInvoicePaid = async (brand: string, invoiceId: string) => {
    try {
      // Find the current invoice
      const currentInvoice = exportedInvoices[brand]?.find((inv) => inv.id === invoiceId)
      if (!currentInvoice) return

      const newPaidStatus = !currentInvoice.isPaid

      // Update in Supabase
      const { error } = await supabase.from("exported_invoices").update({ is_paid: newPaidStatus }).eq("id", invoiceId)

      if (error) {
        console.error("Error updating invoice payment status:", error)
        toast.error("Failed to update payment status")
        return
      }

      // Update local state
      setExportedInvoices((prev) => ({
        ...prev,
        [brand]: prev[brand].map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, isPaid: newPaidStatus } : invoice,
        ),
      }))

      toast.success("Invoice payment status updated")
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast.error("Failed to update payment status")
    }
  }

  const clearInvoiceHistory = (brand: string) => {
    const invoiceCount = exportedInvoices[brand]?.length || 0

    if (invoiceCount === 0) {
      toast.error("No invoice history to clear")
      return
    }

    onClearInvoiceHistory(brand, invoiceCount)
  }

  const generateInvoicePDF = async (brand: string) => {
    const projects = invoiceProjects[brand]
    if (!projects || projects.length === 0) {
      toast.error("No projects to invoice")
      return
    }

    try {
      const doc = new jsPDF()
      const currentDate = new Date()
      const invoiceNumber = invoiceNumbers[brand].toString().padStart(3, "0")

      // Header
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("INVOICE", 20, 30)

      // Invoice details
      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Invoice #: ${invoiceNumber}`, 20, 45)
      doc.text(`Date: ${format(currentDate, "MM/dd/yyyy")}`, 20, 55)

      // From section - simplified
      doc.setFont("helvetica", "bold")
      doc.text("FROM:", 20, 75)
      doc.setFont("helvetica", "normal")
      doc.text("Julio Aleman", 20, 85)
      doc.text("Graphic Design Services", 20, 95)

      // To section
      doc.setFont("helvetica", "bold")
      doc.text("BILL TO:", 120, 75)
      doc.setFont("helvetica", "normal")
      doc.text(brandClients[brand as keyof typeof brandClients], 120, 85)

      // Projects table
      let yPos = 130
      doc.setFont("helvetica", "bold")
      doc.text("Description", 20, yPos)
      doc.text("Type", 100, yPos)
      doc.text("Amount", 150, yPos)

      // Table line
      doc.line(20, yPos + 5, 190, yPos + 5)
      yPos += 15

      doc.setFont("helvetica", "normal")
      let total = 0

      projects.forEach((project) => {
        const price = project.invoicePrice || 0
        total += price

        // Truncate long titles
        const title = project.title.length > 30 ? project.title.substring(0, 30) + "..." : project.title

        doc.text(title, 20, yPos)
        doc.text(project.type, 100, yPos)
        doc.text(`$${price.toFixed(2)}`, 150, yPos)
        yPos += 10

        // Add new page if needed
        if (yPos > 250) {
          doc.addPage()
          yPos = 30
        }
      })

      // Total
      yPos += 10
      doc.line(140, yPos, 190, yPos)
      yPos += 10
      doc.setFont("helvetica", "bold")
      doc.text(`TOTAL: $${total.toFixed(2)}`, 140, yPos)

      // Payment info only
      yPos += 30
      doc.setFont("helvetica", "bold")
      doc.text("PAYMENT INFORMATION:", 20, yPos)
      doc.setFont("helvetica", "normal")
      yPos += 10
      doc.text("Zelle: (630) 270-9307", 20, yPos)
      yPos += 10
      doc.text("PayPal: Julioaseves@gmail.com", 20, yPos)

      // Save PDF with new naming format
      const brandName = brand
        .replace(/\s+/g, "_")
        .replace("Luck_On_Fourth", "LUCK_ON_FOURTH")
        .replace("Wami_Live", "WAMI_LIVE")
        .replace("The_Hideout", "THE_HIDEOUT")
      const fileName = `${brandName}_Invoice_${format(currentDate, "M-dd-yy")}.pdf`

      // Save exported invoice to Supabase
      const exportedInvoiceData = {
        invoice_number: invoiceNumber,
        brand: brand,
        file_name: fileName,
        total_amount: total,
        is_paid: false,
        projects: projects,
      }

      const { error: exportError } = await supabase.from("exported_invoices").insert([exportedInvoiceData])

      if (exportError) {
        console.error("Error saving exported invoice:", exportError)
        toast.error("Failed to save invoice record")
        return
      }

      // Update invoice number in Supabase
      const { error: numberError } = await supabase
        .from("invoice_numbers")
        .update({ next_number: invoiceNumbers[brand] + 1 })
        .eq("brand", brand)

      if (numberError) {
        console.error("Error updating invoice number:", numberError)
        toast.error("Failed to update invoice number")
        return
      }

      // Clear invoice projects from Supabase
      const projectIds = projects.map((p) => p.id)
      const { error: clearError } = await supabase.from("invoice_projects").delete().in("project_id", projectIds)

      if (clearError) {
        console.error("Error clearing invoice projects:", clearError)
        toast.error("Failed to clear invoice projects")
        return
      }

      // Update local state
      setInvoiceNumbers((prev) => ({
        ...prev,
        [brand]: prev[brand] + 1,
      }))

      setInvoiceProjects((prev) => ({
        ...prev,
        [brand]: [],
      }))

      // Reload all data to sync with database
      await onReloadData()

      // Download the PDF
      doc.save(fileName)

      toast.success(`Invoice exported as ${fileName}`)
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast.error("Failed to generate invoice")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice Manager</h2>
          <p className="text-gray-600">Manage and export invoices for completed projects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(brandClients).map(([brand, client]) => {
          const projects = invoiceProjects[brand] || []
          const total = getBrandTotal(brand)
          const isOverThreshold = total >= 200

          return (
            <Card key={brand} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {brand}
                  </CardTitle>
                  <Badge variant="outline" className={brandColors[brand as keyof typeof brandColors]}>
                    {projects.length} projects
                  </Badge>
                </div>
                <CardDescription>{client}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Total Amount */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">Total Amount</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${isOverThreshold ? "text-green-600" : "text-gray-900"}`}>
                      ${total.toFixed(2)}
                    </div>
                    {isOverThreshold && <div className="text-xs text-green-600">Ready to invoice</div>}
                  </div>
                </div>

                {/* Projects List */}
                <div className="space-y-2">
                  {projects.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No completed projects</p>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{project.title}</p>
                          <p className="text-xs text-gray-500">{project.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">${project.invoicePrice?.toFixed(2)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteProject(brand, project.id, project.title)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Export Button */}
                <Separator />
                <Button
                  onClick={() => generateInvoicePDF(brand)}
                  disabled={projects.length === 0}
                  className="w-full"
                  variant={isOverThreshold ? "default" : "outline"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Invoice PDF
                </Button>

                {/* Exported Invoices History */}
                {exportedInvoices[brand] && exportedInvoices[brand].length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Invoice History</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearInvoiceHistory(brand)}
                          className="text-red-600 hover:text-red-700 h-6 px-2"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                      {exportedInvoices[brand].map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{invoice.fileName}</p>
                            <p className="text-xs text-gray-500">
                              ${invoice.totalAmount.toFixed(2)} • {format(invoice.exportedAt, "MMM dd, yyyy")}
                            </p>
                          </div>
                          <Button
                            variant={invoice.isPaid ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleInvoicePaid(brand, invoice.id)}
                            className={invoice.isPaid ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {invoice.isPaid ? "Paid ✓" : "Mark Paid"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {projects.length > 0 && (
                  <p className="text-xs text-gray-500 text-center">
                    Next invoice #: {invoiceNumbers[brand].toString().padStart(3, "0")}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
