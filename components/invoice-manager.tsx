"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Download, FileText, DollarSign, Trash2, Bug, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import jsPDF from "jspdf"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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

interface InvoiceManagerProps {
  invoiceProjects: { [brand: string]: InvoiceProject[] }
  setInvoiceProjects: React.Dispatch<React.SetStateAction<{ [brand: string]: InvoiceProject[] }>>
  onClearInvoiceHistory: (brand: string, count: number) => void
  exportedInvoices: { [brand: string]: any[] }
  setExportedInvoices: React.Dispatch<React.SetStateAction<{ [brand: string]: any[] }>>
  onDeleteProject: (brand: string, projectId: string, projectTitle: string) => void
}

interface DebugLog {
  timestamp: string
  type: "info" | "success" | "error" | "warning"
  message: string
  data?: any
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
}: InvoiceManagerProps) {
  const [invoiceNumbers, setInvoiceNumbers] = useState<{ [brand: string]: number }>({
    "Wami Live": 1,
    "Luck On Fourth": 1,
    "The Hideout": 1,
  })
  const [loading, setLoading] = useState(true)
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [showDebug, setShowDebug] = useState(true)
  const [clearDialog, setClearDialog] = useState({
    isOpen: false,
    type: null,
    count: 0,
    brand: "",
  })
  const [projectToDelete, setProjectToDelete] = useState<{ brand: string; projectId: string } | null>(null)

  // Debug logging function
  const addDebugLog = useCallback((type: DebugLog["type"], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data,
    }
    setDebugLogs((prev) => [log, ...prev.slice(0, 49)]) // Keep last 50 logs
    console.log(`[${type.toUpperCase()}] ${message}`, data || "")
  }, [])

  // Manual refresh function
  const manualRefresh = async () => {
    addDebugLog("info", "🔄 Manual refresh triggered")
    await loadInvoiceData()
  }

  // Load invoice data function
  const loadInvoiceData = async () => {
    addDebugLog("info", "🔄 Starting invoice data load...")
    setLoading(true)

    try {
      // Test database connection first
      addDebugLog("info", "🔗 Testing database connection...")
      const { data: testData, error: testError } = await supabase.from("invoice_projects").select("count").limit(1)

      if (testError) {
        addDebugLog("error", "❌ Database connection failed", testError)
        setLoading(false)
        return
      }

      addDebugLog("success", "✅ Database connection successful")

      // Load invoice projects from database
      addDebugLog("info", "📊 Loading invoice projects...")
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoice_projects")
        .select("*")
        .order("added_to_invoice_at", { ascending: true })

      addDebugLog("info", `📊 Raw invoice query result: ${invoiceData?.length || 0} records`, invoiceData)

      if (invoiceError) {
        addDebugLog("error", "❌ Error loading invoice data", invoiceError)
        setLoading(false)
        return
      }

      // Group invoice projects by brand
      const groupedInvoiceData: { [brand: string]: InvoiceProject[] } = {
        "Wami Live": [],
        "Luck On Fourth": [],
        "The Hideout": [],
      }

      let processedCount = 0
      invoiceData?.forEach((item: any) => {
        addDebugLog("info", `🔄 Processing invoice item ${processedCount + 1}`, item)

        try {
          const project: InvoiceProject = {
            id: item.project_id,
            title: item.title,
            brand: item.brand,
            type: item.type,
            description: item.description,
            deadline: new Date(item.deadline),
            priority: item.priority,
            status: item.status,
            created_at: new Date(item.created_at),
            files: item.files || [],
            invoicePrice: Number.parseFloat(item.invoice_price),
            addedToInvoiceAt: item.added_to_invoice_at ? new Date(item.added_to_invoice_at) : undefined,
          }

          if (groupedInvoiceData[item.brand]) {
            groupedInvoiceData[item.brand].push(project)
            addDebugLog("success", `✅ Added project "${item.title}" to ${item.brand}`)
          } else {
            addDebugLog("warning", `⚠️ Unknown brand: ${item.brand}`)
          }
          processedCount++
        } catch (error) {
          addDebugLog("error", `❌ Error processing item ${processedCount + 1}`, error)
        }
      })

      addDebugLog("info", `📋 Grouped invoice data summary:`, {
        "Wami Live": groupedInvoiceData["Wami Live"].length,
        "Luck On Fourth": groupedInvoiceData["Luck On Fourth"].length,
        "The Hideout": groupedInvoiceData["The Hideout"].length,
      })

      // Update state
      setInvoiceProjects(groupedInvoiceData)
      addDebugLog("success", "✅ Invoice projects state updated")

      // Load exported invoices from database
      addDebugLog("info", "📄 Loading exported invoices...")
      const { data: exportedData, error: exportedError } = await supabase
        .from("exported_invoices")
        .select("*")
        .order("exported_at", { ascending: false })

      addDebugLog("info", `📄 Raw exported invoices: ${exportedData?.length || 0} records`, exportedData)

      if (exportedError) {
        addDebugLog("error", "❌ Error loading exported invoices", exportedError)
        setLoading(false)
        return
      }

      // Group exported invoices by brand
      const groupedExportedData: { [brand: string]: any[] } = {
        "Wami Live": [],
        "Luck On Fourth": [],
        "The Hideout": [],
      }

      exportedData?.forEach((item: any) => {
        const invoice = {
          id: item.id,
          invoiceNumber: item.invoice_number,
          fileName: item.file_name,
          totalAmount: Number.parseFloat(item.total_amount),
          exportedAt: new Date(item.exported_at),
          isPaid: item.is_paid,
          projects: item.projects,
        }

        if (groupedExportedData[item.brand]) {
          groupedExportedData[item.brand].push(invoice)
        }
      })

      setExportedInvoices(groupedExportedData)
      addDebugLog("success", "✅ Exported invoices state updated")

      addDebugLog("success", "🎉 Invoice data loading complete!")
    } catch (error) {
      addDebugLog("error", "💥 Critical error loading invoice data", error)
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    addDebugLog("info", "🚀 InvoiceManager component mounted")
    loadInvoiceData()
  }, [])

  const getBrandTotal = (brand: string) => {
    return invoiceProjects[brand]?.reduce((sum, project) => sum + (project.invoicePrice || 0), 0) || 0
  }

  const removeFromInvoice = (brand: string, projectId: string) => {
    const project = invoiceProjects[brand]?.find((p) => p.id === projectId)
    if (project) {
      onDeleteProject(brand, projectId, project.title)
    }
  }

  const toggleInvoicePaid = async (brand: string, invoiceId: string) => {
    addDebugLog("info", `💳 Toggling payment status for invoice ${invoiceId} in ${brand}`)

    const newExportedInvoices = {
      ...exportedInvoices,
      [brand]: exportedInvoices[brand].map((invoice) =>
        invoice.id === invoiceId ? { ...invoice, isPaid: !invoice.isPaid } : invoice,
      ),
    }

    setExportedInvoices(newExportedInvoices)

    try {
      const { error } = await supabase
        .from("exported_invoices")
        .update({ is_paid: !exportedInvoices[brand].find((inv) => inv.id === invoiceId)?.isPaid })
        .eq("id", invoiceId)

      if (error) {
        addDebugLog("error", "❌ Failed to update payment status in database", error)
        toast.error("Failed to update payment status")
        return
      }

      addDebugLog("success", "✅ Payment status updated in database")
      toast.success("Invoice payment status updated and saved!")
    } catch (error) {
      addDebugLog("error", "💥 Critical error updating payment status", error)
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
    addDebugLog("info", `📄 Starting PDF generation for ${brand}`)

    const projects = invoiceProjects[brand]
    if (!projects || projects.length === 0) {
      addDebugLog("warning", "⚠️ No projects to invoice")
      toast.error("No projects to invoice")
      return
    }

    addDebugLog("info", `📄 Generating PDF with ${projects.length} projects`, projects)

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

    // Track exported invoice
    const exportedInvoice = {
      id: Date.now().toString(),
      invoiceNumber,
      fileName,
      totalAmount: total,
      exportedAt: currentDate,
      isPaid: false,
      projects: [...projects],
    }

    addDebugLog("info", "💾 Saving exported invoice to database", exportedInvoice)

    // Update exported invoices and save to database
    const newExportedInvoices = {
      ...exportedInvoices,
      [brand]: [...exportedInvoices[brand], exportedInvoice],
    }

    setExportedInvoices(newExportedInvoices)

    // Save to database
    try {
      const { error } = await supabase.from("exported_invoices").insert([
        {
          brand,
          invoice_number: exportedInvoice.invoiceNumber,
          file_name: exportedInvoice.fileName,
          total_amount: exportedInvoice.totalAmount,
          exported_at: exportedInvoice.exportedAt.toISOString(),
          is_paid: exportedInvoice.isPaid,
          projects: exportedInvoice.projects,
        },
      ])

      if (error) {
        addDebugLog("error", "❌ Failed to save exported invoice to database", error)
        toast.error("Failed to save invoice to database")
        return
      }

      addDebugLog("success", "✅ Exported invoice saved to database")
    } catch (error) {
      addDebugLog("error", "💥 Critical error saving exported invoice", error)
      toast.error("Failed to save invoice to database")
      return
    }

    doc.save(fileName)
    addDebugLog("success", `📄 PDF saved as ${fileName}`)

    // Update invoice number and clear projects
    setInvoiceNumbers((prev) => ({
      ...prev,
      [brand]: prev[brand] + 1,
    }))

    // Clear invoice projects and save to database
    const clearedInvoiceProjects = {
      ...invoiceProjects,
      [brand]: [],
    }

    setInvoiceProjects(clearedInvoiceProjects)
    addDebugLog("info", `🧹 Clearing ${projects.length} projects from ${brand} invoice`)

    // Save cleared invoice projects to database
    try {
      const { error } = await supabase.from("invoice_projects").delete().eq("brand", brand)

      if (error) {
        addDebugLog("error", "❌ Failed to clear invoice projects from database", error)
        toast.error("Failed to clear invoice projects from database")
        return
      }

      addDebugLog("success", "✅ Invoice projects cleared from database")
    } catch (error) {
      addDebugLog("error", "💥 Critical error clearing invoice projects", error)
      toast.error("Failed to clear invoice projects from database")
      return
    }

    addDebugLog("success", `🎉 Invoice generation complete for ${brand}`)
    toast.success(`Invoice exported as ${fileName} - Data saved to database!`)
  }

  const handleDeleteInvoiceProject = (brand: string, projectId: string, projectTitle: string) => {
    setClearDialog({
      isOpen: true,
      type: "completed",
      count: 1,
      brand: `Remove "${projectTitle}" from ${brand} invoice`,
    })

    // Store the project info for deletion
    setProjectToDelete({ brand, projectId })
  }

  const getLogColor = (type: DebugLog["type"]) => {
    switch (type) {
      case "success":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "warning":
        return "text-yellow-600"
      default:
        return "text-blue-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Debug Panel */}
      <Card className="border-2 border-dashed border-yellow-300 bg-yellow-50">
        <Collapsible open={showDebug} onOpenChange={setShowDebug}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-yellow-100">
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Bug className="h-5 w-5" />
                Debug System Logs
                <Badge variant="outline" className="ml-auto">
                  {debugLogs.length} logs
                </Badge>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={manualRefresh} size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Manual Refresh
                </Button>
                <Button onClick={() => setDebugLogs([])} size="sm" variant="outline">
                  Clear Logs
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto bg-black text-green-400 p-4 rounded font-mono text-xs">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-500">No logs yet...</div>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className={`mb-1 ${getLogColor(log.type)}`}>
                      <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
                      {log.data && (
                        <div className="ml-4 text-gray-300 text-xs">
                          {typeof log.data === "object" ? JSON.stringify(log.data, null, 2) : log.data}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

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
                            onClick={() => handleDeleteInvoiceProject(brand, project.id, project.title)}
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
