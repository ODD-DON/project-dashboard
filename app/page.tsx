"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  CalendarIcon,
  Trash2,
  Edit,
  GripVertical,
  Plus,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Menu,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  TouchSensor,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { supabase } from "@/lib/supabase"
import { InvoiceManager } from "@/components/invoice-manager"

type Brand = "Wami Live" | "Luck On Fourth" | "The Hideout"
type ProjectType = "Flyer" | "Promo Video"
type Priority = number
type Status = "Pending" | "In Progress" | "Completed"

interface Project {
  id: string
  title: string
  brand: Brand
  type: ProjectType
  description: string
  deadline: Date
  priority: Priority
  status: Status
  created_at: Date
  files: ProjectFile[]
}

interface ProjectFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: Date
}

interface InvoiceProject extends Project {
  invoicePrice?: number
  addedToInvoiceAt?: Date
}

interface ExportedInvoice {
  id: string
  invoiceNumber: string
  brand: Brand
  fileName: string
  totalAmount: number
  exportedAt: Date
  isPaid: boolean
  projects: InvoiceProject[]
}

const brandColors = {
  "Wami Live": "bg-purple-100 text-purple-800 border-purple-200",
  "Luck On Fourth": "bg-green-100 text-green-800 border-green-200",
  "The Hideout": "bg-orange-100 text-orange-800 border-orange-200",
}

const getPriorityColor = (priority: number) => {
  if (priority <= 3) return "bg-red-100 text-red-800" // High priority (1-3)
  if (priority <= 7) return "bg-yellow-100 text-yellow-800" // Medium priority (4-7)
  return "bg-blue-100 text-blue-800" // Low priority (8+)
}

const statusColors = {
  Pending: "bg-gray-100 text-gray-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
}

// Mobile-friendly project card component
function MobileProjectCard({
  project,
  onStatusChange,
  onDelete,
  onEdit,
  onProjectClick,
}: {
  project: Project
  onStatusChange: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onEdit: (project: Project) => void
  onProjectClick: (project: Project) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card ref={setNodeRef} style={style} className="mb-4 touch-manipulation">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              className="cursor-grab active:cursor-grabbing p-2 touch-manipulation flex-shrink-0"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5 text-gray-400" />
            </button>
            <button
              onClick={() => onProjectClick(project)}
              className="font-semibold text-base sm:text-lg truncate text-left hover:text-blue-600 transition-colors flex-1 min-w-0"
            >
              {project.title}
            </button>
          </div>
          <div className="flex gap-1 ml-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit(project)} className="h-9 w-9 p-0">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(project.id)}
              className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={brandColors[project.brand]}>
              {project.brand}
            </Badge>
            <Badge variant="outline">{project.type}</Badge>
            <Badge variant="outline" className={getPriorityColor(project.priority)}>
              #{project.priority}
            </Badge>
          </div>

          <button
            onClick={() => onProjectClick(project)}
            className="text-sm text-gray-600 line-clamp-3 text-left hover:text-gray-800 transition-colors w-full"
          >
            {project.description}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm text-gray-500">Due: {format(project.deadline, "MMM dd, yyyy")}</span>
            <Select value={project.status} onValueChange={(value: Status) => onStatusChange(project.id, value)}>
              <SelectTrigger className="w-full sm:w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SortableProjectRow({
  project,
  onStatusChange,
  onDelete,
  onEdit,
  onProjectClick,
}: {
  project: Project
  onStatusChange: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onEdit: (project: Project) => void
  onProjectClick: (project: Project) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className="group cursor-pointer hover:bg-gray-50">
      <TableCell className="w-[200px]">
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 p-1 shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            onClick={() => onProjectClick(project)}
            className="font-medium hover:text-blue-600 transition-colors text-left truncate"
          >
            {project.title}
          </button>
        </div>
      </TableCell>
      <TableCell className="w-[120px]">
        <Badge variant="outline" className={`${brandColors[project.brand]} text-xs whitespace-nowrap`}>
          {project.brand}
        </Badge>
      </TableCell>
      <TableCell className="w-[100px] text-sm">{project.type}</TableCell>
      <TableCell className="w-[250px]">
        <button
          onClick={() => onProjectClick(project)}
          className="truncate text-sm text-muted-foreground hover:text-gray-700 transition-colors text-left max-w-[230px] block"
        >
          {project.description}
        </button>
      </TableCell>
      <TableCell className="w-[120px] text-sm">{format(project.deadline, "MMM dd, yyyy")}</TableCell>
      <TableCell className="w-[100px]">
        <Badge variant="outline" className={`${getPriorityColor(project.priority)} text-xs whitespace-nowrap`}>
          #{project.priority}
        </Badge>
      </TableCell>
      <TableCell className="w-[140px]">
        <Select value={project.status} onValueChange={(value: Status) => onStatusChange(project.id, value)}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="w-[100px]">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(project)} className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(project.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function ProjectManagementDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [activeTab, setActiveTab] = useState<"projects" | "invoices">("projects")
  const [invoiceProjects, setInvoiceProjects] = useState<{ [brand: string]: InvoiceProject[] }>({
    "Wami Live": [],
    "Luck On Fourth": [],
    "The Hideout": [],
  })
  const [exportedInvoices, setExportedInvoices] = useState<{ [brand: string]: ExportedInvoice[] }>({
    "Wami Live": [],
    "Luck On Fourth": [],
    "The Hideout": [],
  })

  const [projectToDelete, setProjectToDelete] = useState<{
    brand: string
    projectId: string
  } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    brand: "" as Brand,
    type: "" as ProjectType,
    description: "",
    deadline: undefined as Date | undefined,
    priority: 1 as Priority,
    files: [] as ProjectFile[],
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const [priceDialog, setPriceDialog] = useState<{
    isOpen: boolean
    project: Project | null
    price: string
  }>({
    isOpen: false,
    project: null,
    price: "",
  })

  const [clearDialog, setClearDialog] = useState<{
    isOpen: boolean
    type: "completed" | "invoice"
    brand?: string
    count: number
  }>({
    isOpen: false,
    type: "completed",
    count: 0,
  })

  const [invoiceNumbers, setInvoiceNumbers] = useState<{ [brand: string]: number }>({
    "Wami Live": 1000,
    "Luck On Fourth": 2000,
    "The Hideout": 3000,
  })

  // Load all data on mount
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      console.log("🔄 Starting comprehensive data load...")
      setLoading(true)

      // Load data in sequence with comprehensive error handling
      await loadProjects()
      await loadInvoiceProjects()
      await loadExportedInvoices()
      await loadInvoiceNumbers()

      console.log("✅ All data loaded successfully")
    } catch (error) {
      console.error("❌ Critical error loading application data:", error)
      toast.error("Failed to load application data. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      console.log("📋 Loading projects from database...")
      const { data, error } = await supabase.from("projects").select("*").order("priority", { ascending: true })

      if (error) {
        console.error("❌ Database error loading projects:", error)
        toast.error("Failed to load projects: " + error.message)
        return
      }

      const formattedProjects: Project[] = (data || []).map((p: any) => ({
        ...p,
        deadline: new Date(p.deadline),
        created_at: new Date(p.created_at),
        files: p.files || [],
      }))

      console.log(`✅ Successfully loaded ${formattedProjects.length} projects`)
      setProjects(formattedProjects)
    } catch (error) {
      console.error("❌ Exception loading projects:", error)
      toast.error("Failed to load projects")
    }
  }

  const loadInvoiceProjects = async () => {
    try {
      console.log("💰 Loading invoice projects from database...")

      // First, verify the table exists and get count
      const { count, error: countError } = await supabase
        .from("invoice_projects")
        .select("*", { count: "exact", head: true })

      if (countError) {
        console.error("❌ Error checking invoice_projects table:", countError)
        toast.error("Invoice projects table error: " + countError.message)
        return
      }

      console.log(`📊 Found ${count} invoice projects in database`)

      const { data, error } = await supabase
        .from("invoice_projects")
        .select("*")
        .order("added_to_invoice_at", { ascending: false })

      if (error) {
        console.error("❌ Database error loading invoice projects:", error)
        toast.error("Failed to load invoice projects: " + error.message)
        return
      }

      console.log("📊 Raw invoice projects data from database:", data)

      const formattedData: { [brand: string]: InvoiceProject[] } = {
        "Wami Live": [],
        "Luck On Fourth": [],
        "The Hideout": [],
      }

      if (data && data.length > 0) {
        data.forEach((item: any) => {
          try {
            const invoiceProject: InvoiceProject = {
              id: item.project_id, // Use project_id as the main ID
              title: item.title,
              brand: item.brand as Brand,
              type: item.type as ProjectType,
              description: item.description,
              deadline: new Date(item.deadline),
              priority: item.priority,
              status: item.status as Status,
              created_at: new Date(item.created_at),
              files: item.files || [],
              invoicePrice: Number.parseFloat(item.invoice_price.toString()),
              addedToInvoiceAt: new Date(item.added_to_invoice_at),
            }

            if (formattedData[item.brand]) {
              formattedData[item.brand].push(invoiceProject)
              console.log(`✅ Added invoice project "${item.title}" to ${item.brand}`)
            } else {
              console.warn(`⚠️ Unknown brand in invoice projects: ${item.brand}`)
            }
          } catch (itemError) {
            console.error("❌ Error processing invoice project item:", itemError, item)
          }
        })
      }

      console.log("✅ Final formatted invoice projects:", formattedData)

      // Log summary for each brand
      Object.entries(formattedData).forEach(([brand, projects]) => {
        console.log(
          `📊 ${brand}: ${projects.length} invoice projects, total: $${projects.reduce((sum, p) => sum + (p.invoicePrice || 0), 0).toFixed(2)}`,
        )
      })

      setInvoiceProjects(formattedData)
    } catch (error) {
      console.error("❌ Exception loading invoice projects:", error)
      toast.error("Failed to load invoice projects")
    }
  }

  const loadExportedInvoices = async () => {
    try {
      console.log("📄 Loading exported invoices from database...")
      const { data, error } = await supabase
        .from("exported_invoices")
        .select("*")
        .order("exported_at", { ascending: false })

      if (error) {
        console.error("❌ Database error loading exported invoices:", error)
        toast.error("Failed to load exported invoices: " + error.message)
        return
      }

      console.log(`📊 Raw exported invoices data: ${data?.length || 0} records`)

      const formattedData: { [brand: string]: ExportedInvoice[] } = {
        "Wami Live": [],
        "Luck On Fourth": [],
        "The Hideout": [],
      }

      if (data && data.length > 0) {
        data.forEach((item: any) => {
          try {
            const exportedInvoice: ExportedInvoice = {
              id: item.id,
              invoiceNumber: item.invoice_number,
              brand: item.brand as Brand,
              fileName: item.file_name,
              totalAmount: Number.parseFloat(item.total_amount.toString()),
              exportedAt: new Date(item.exported_at),
              isPaid: item.is_paid,
              projects: (item.projects || []).map((p: any) => ({
                ...p,
                deadline: new Date(p.deadline),
                created_at: new Date(p.created_at),
                addedToInvoiceAt: p.addedToInvoiceAt ? new Date(p.addedToInvoiceAt) : undefined,
              })),
            }

            if (formattedData[item.brand]) {
              formattedData[item.brand].push(exportedInvoice)
            } else {
              console.warn(`⚠️ Unknown brand in exported invoices: ${item.brand}`)
            }
          } catch (itemError) {
            console.error("❌ Error processing exported invoice item:", itemError, item)
          }
        })
      }

      console.log("✅ Exported invoices loaded successfully")
      setExportedInvoices(formattedData)
    } catch (error) {
      console.error("❌ Exception loading exported invoices:", error)
      toast.error("Failed to load exported invoices")
    }
  }

  const loadInvoiceNumbers = async () => {
    try {
      console.log("🔢 Loading invoice numbers from database...")
      const { data, error } = await supabase.from("invoice_numbers").select("*")

      if (error) {
        console.error("❌ Database error loading invoice numbers:", error)
        toast.error("Failed to load invoice numbers: " + error.message)
        return
      }

      const numbers: { [brand: string]: number } = {
        "Wami Live": 1000,
        "Luck On Fourth": 2000,
        "The Hideout": 3000,
      }

      if (data && data.length > 0) {
        data.forEach((item: any) => {
          numbers[item.brand] = item.next_number
        })
      }

      console.log("✅ Invoice numbers loaded:", numbers)
      setInvoiceNumbers(numbers)
    } catch (error) {
      console.error("❌ Exception loading invoice numbers:", error)
      toast.error("Failed to load invoice numbers")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const processFiles = (files: File[]) => {
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      return true
    })

    const newFiles: ProjectFile[] = validFiles.map((file) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date(),
    }))

    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...newFiles],
    }))
  }

  const removeFile = (fileId: string) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((file) => file.id !== fileId),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.title ||
      !formData.brand ||
      !formData.type ||
      !formData.description ||
      !formData.deadline ||
      !formData.priority
    ) {
      toast.error("Please fill in all fields")
      return
    }

    setSubmitting(true)

    try {
      const projectData = {
        title: formData.title,
        brand: formData.brand,
        type: formData.type,
        description: formData.description,
        deadline: formData.deadline.toISOString(),
        priority: formData.priority,
        status: editingProject?.status || "Pending",
        files: formData.files,
      }

      if (editingProject) {
        // Update existing project
        const { error } = await supabase.from("projects").update(projectData).eq("id", editingProject.id)

        if (error) {
          console.error("Error updating project:", error)
          toast.error("Failed to update project")
          return
        }

        toast.success("Project updated successfully!")
        setEditingProject(null)
      } else {
        // Create new project
        const { error } = await supabase.from("projects").insert([projectData])

        if (error) {
          console.error("Error creating project:", error)
          toast.error("Failed to create project")
          return
        }

        toast.success("Project created successfully!")
      }

      // Reset form
      setFormData({
        title: "",
        brand: "" as Brand,
        type: "" as ProjectType,
        description: "",
        deadline: undefined,
        priority: projects.length + 1,
        files: [],
      })

      // Reload projects
      await loadProjects()
    } catch (error) {
      console.error("Error submitting project:", error)
      toast.error("Failed to submit project")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, status: Status) => {
    try {
      // If marking as completed, show price dialog
      if (status === "Completed") {
        const project = projects.find((p) => p.id === id)
        if (project) {
          setPriceDialog({
            isOpen: true,
            project,
            price: "",
          })
          return
        }
      }

      const { error } = await supabase.from("projects").update({ status }).eq("id", id)

      if (error) {
        console.error("Error updating status:", error)
        toast.error("Failed to update status")
        return
      }

      // Update local state
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))

      if (status !== "Completed") {
        toast.success("Status updated successfully!")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
    }
  }

  const handlePriceSubmit = async () => {
    if (!priceDialog.project) return

    const invoicePrice = Number.parseFloat(priceDialog.price)
    if (isNaN(invoicePrice) || invoicePrice <= 0) {
      toast.error("Please enter a valid price")
      return
    }

    try {
      console.log("💰 CRITICAL: Starting project completion process...")
      console.log("💰 Project ID:", priceDialog.project.id)
      console.log("💰 Invoice Price:", invoicePrice)
      console.log("💰 Project Brand:", priceDialog.project.brand)

      // STEP 1: Update project status to completed in projects table
      console.log("🔄 STEP 1: Updating project status to completed...")
      const { error: projectError } = await supabase
        .from("projects")
        .update({ status: "Completed" })
        .eq("id", priceDialog.project.id)

      if (projectError) {
        console.error("❌ STEP 1 FAILED: Error updating project status:", projectError)
        toast.error("Failed to update project status: " + projectError.message)
        return
      }

      console.log("✅ STEP 1 SUCCESS: Project status updated to completed")

      // STEP 2: Add project to invoice_projects table (this is the CRITICAL step for persistence)
      console.log("🔄 STEP 2: Adding project to invoice_projects table...")
      const invoiceProjectData = {
        project_id: priceDialog.project.id, // This is the key for persistence
        title: priceDialog.project.title,
        brand: priceDialog.project.brand,
        type: priceDialog.project.type,
        description: priceDialog.project.description,
        deadline: priceDialog.project.deadline.toISOString(),
        priority: priceDialog.project.priority,
        status: "Completed",
        created_at: priceDialog.project.created_at.toISOString(),
        files: priceDialog.project.files,
        invoice_price: invoicePrice,
      }

      console.log("📝 STEP 2: Invoice project data to insert:", invoiceProjectData)

      // First check if project already exists in invoice_projects
      const { data: existingProject, error: checkError } = await supabase
        .from("invoice_projects")
        .select("id")
        .eq("project_id", priceDialog.project.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 = no rows found
        console.error("❌ STEP 2 FAILED: Error checking existing project:", checkError)
        toast.error("Failed to check existing project: " + checkError.message)
        return
      }

      let insertedData
      if (existingProject) {
        // Update existing record
        console.log("🔄 Project already exists in invoice, updating...")
        const { data, error: updateError } = await supabase
          .from("invoice_projects")
          .update(invoiceProjectData)
          .eq("project_id", priceDialog.project.id)
          .select()

        if (updateError) {
          console.error("❌ STEP 2 FAILED: Error updating invoice project:", updateError)
          toast.error("Failed to update invoice project: " + updateError.message)
          return
        }
        insertedData = data
      } else {
        // Insert new record
        console.log("🔄 Inserting new project to invoice...")
        const { data, error: insertError } = await supabase
          .from("invoice_projects")
          .insert([invoiceProjectData])
          .select()

        if (insertError) {
          console.error("❌ STEP 2 FAILED: Error adding to invoice projects:", insertError)
          toast.error("Failed to add to invoice: " + insertError.message)
          return
        }
        insertedData = data
      }

      console.log("✅ STEP 2 SUCCESS: Project added to invoice_projects table:", insertedData)

      // STEP 3: Update local state immediately for UI responsiveness
      console.log("🔄 STEP 3: Updating local state...")
      setProjects((prev) => prev.map((p) => (p.id === priceDialog.project!.id ? { ...p, status: "Completed" } : p)))

      // STEP 4: Force reload invoice projects to ensure data consistency
      console.log("🔄 STEP 4: Force reloading invoice projects from database...")
      await loadInvoiceProjects()

      // STEP 5: Close dialog and show success
      setPriceDialog({
        isOpen: false,
        project: null,
        price: "",
      })

      console.log("✅ CRITICAL SUCCESS: Project completion process finished successfully")
      toast.success(`Project completed and added to ${priceDialog.project.brand} invoice ($${invoicePrice})`)

      // Optional: Switch to invoices tab to show the result immediately
      setActiveTab("invoices")
    } catch (error) {
      console.error("❌ CRITICAL FAILURE: Error in project completion process:", error)
      toast.error("Failed to complete project: " + (error as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    const project = projects.find((p) => p.id === id)
    if (!project) return

    setClearDialog({
      isOpen: true,
      type: "completed",
      count: 1,
      brand: `Delete "${project.title}"`,
    })
  }

  const handleDeleteInvoiceProject = (brand: string, projectId: string, projectTitle: string) => {
    console.log("🗑️ Preparing to delete invoice project:", { brand, projectId, projectTitle })
    setClearDialog({
      isOpen: true,
      type: "completed",
      count: 1,
      brand: `Remove "${projectTitle}" from ${brand} invoice`,
    })

    // Store the project info for deletion
    setProjectToDelete({ brand, projectId })
  }

  const confirmDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id)

      if (error) {
        console.error("Error deleting project:", error)
        toast.error("Failed to delete project")
        return
      }

      toast.success("Project deleted successfully!")

      // Reload projects to get updated priorities
      await loadProjects()
    } catch (error) {
      console.error("Error deleting project:", error)
      toast.error("Failed to delete project")
    } finally {
      setClearDialog({ isOpen: false, type: "completed", count: 0 })
    }
  }

  const handleClearCompleted = async () => {
    const completedProjects = projects.filter((p) => p.status === "Completed")

    if (completedProjects.length === 0) {
      toast.error("No completed projects to clear")
      return
    }

    setClearDialog({
      isOpen: true,
      type: "completed",
      count: completedProjects.length,
    })
  }

  const confirmClearCompleted = async () => {
    if (clearDialog.type === "invoice" && clearDialog.brand) {
      // Handle invoice history clearing
      try {
        console.log("🗑️ Clearing invoice history for brand:", clearDialog.brand)
        const { error } = await supabase.from("exported_invoices").delete().eq("brand", clearDialog.brand)

        if (error) {
          console.error("❌ Error clearing invoice history:", error)
          toast.error("Failed to clear invoice history: " + error.message)
          return
        }

        await loadExportedInvoices()
        toast.success(`Cleared ${clearDialog.count} invoices from ${clearDialog.brand} history`)
      } catch (error) {
        console.error("❌ Error clearing invoice history:", error)
        toast.error("Failed to clear invoice history")
      }

      setClearDialog({ isOpen: false, type: "completed", count: 0 })
      return
    }

    // Handle invoice project deletion (CRITICAL: This mirrors the same deletion logic used in invoice export)
    if (projectToDelete) {
      try {
        console.log("🗑️ CRITICAL: Deleting invoice project using same method as export...")
        console.log("🗑️ Project to delete:", projectToDelete)

        // Use the EXACT same deletion method as in the invoice export process
        const { error } = await supabase.from("invoice_projects").delete().eq("project_id", projectToDelete.projectId)

        if (error) {
          console.error("❌ CRITICAL: Error removing from invoice:", error)
          toast.error("Failed to remove from invoice: " + error.message)
          return
        }

        console.log("✅ CRITICAL: Successfully removed from invoice using same method")

        // Force reload invoice projects to ensure UI consistency
        await loadInvoiceProjects()
        toast.success("Project removed from invoice")
      } catch (error) {
        console.error("❌ CRITICAL: Exception removing from invoice:", error)
        toast.error("Failed to remove from invoice")
      }

      setClearDialog({ isOpen: false, type: "completed", count: 0 })
      setProjectToDelete(null)
      return
    }

    // Handle single project deletion from main projects list
    if (clearDialog.brand && clearDialog.brand.includes('Delete "')) {
      const projectToDelete = projects.find((p) => clearDialog.brand?.includes(p.title))
      if (projectToDelete) {
        try {
          const { error } = await supabase.from("projects").delete().eq("id", projectToDelete.id)

          if (error) {
            console.error("Error deleting project:", error)
            toast.error("Failed to delete project")
            return
          }

          toast.success("Project deleted successfully!")
          await loadProjects()
        } catch (error) {
          console.error("Error deleting project:", error)
          toast.error("Failed to delete project")
        } finally {
          setClearDialog({ isOpen: false, type: "completed", count: 0 })
        }
      }
      return
    }

    // Rest of the existing completed projects clearing logic...
    try {
      setLoading(true)

      // Delete all completed projects from database
      const { error } = await supabase.from("projects").delete().eq("status", "Completed")

      if (error) {
        console.error("Error clearing completed projects:", error)
        toast.error("Failed to clear completed projects")
        return
      }

      toast.success(
        `Successfully cleared ${clearDialog.count} completed projects from database. Invoice data preserved.`,
      )

      // Reload projects to refresh the list
      await loadProjects()
    } catch (error) {
      console.error("Error clearing completed projects:", error)
      toast.error("Failed to clear completed projects")
    } finally {
      setLoading(false)
      setClearDialog({ isOpen: false, type: "completed", count: 0 })
    }
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      title: project.title,
      brand: project.brand,
      type: project.type,
      description: project.description,
      deadline: project.deadline,
      priority: project.priority,
      files: project.files || [],
    })

    // Scroll to form
    document.getElementById("project-submission")?.scrollIntoView({ behavior: "smooth" })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = projects.findIndex((item) => item.id === active.id)
      const newIndex = projects.findIndex((item) => item.id === over?.id)

      const reorderedItems = arrayMove(projects, oldIndex, newIndex)

      // Update local state immediately for better UX
      setProjects(reorderedItems)

      try {
        // Update priorities in database
        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          priority: index + 1,
        }))

        for (const update of updates) {
          await supabase.from("projects").update({ priority: update.priority }).eq("id", update.id)
        }

        toast.success("Project order updated!")
      } catch (error) {
        console.error("Error updating project order:", error)
        toast.error("Failed to update project order")
        // Reload projects to restore correct order
        await loadProjects()
      }
    }
  }

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
    setMobileMenuOpen(false)
  }

  const getProjectsByStatus = (status: Status) => {
    return projects.filter((p) => p.status === status)
  }

  const getCompletionPercentage = () => {
    if (projects.length === 0) return 0
    return Math.round((getProjectsByStatus("Completed").length / projects.length) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-base sm:text-lg">Loading projects...</span>
          </div>
          <p className="text-sm text-gray-500 max-w-md">
            Loading all project data including invoice information. This may take a moment.
          </p>
        </div>
      </div>
    )
  }

  // Filter out completed projects from main project list
  const activeProjects = projects.filter((p) => p.status !== "Completed")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Project Dashboard</h1>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => scrollToSection("project-submission")}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Submit Project
              </button>
              <button
                onClick={() => scrollToSection("project-list")}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Project List
              </button>
              <button
                onClick={() => scrollToSection("project-status")}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Status Overview
              </button>
            </nav>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 sm:gap-4 ml-4 sm:ml-6">
              <button
                onClick={() => setActiveTab("projects")}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === "projects" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => setActiveTab("invoices")}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === "invoices" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Invoices
              </button>
            </div>

            {/* Mobile Navigation */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col space-y-4 mt-8">
                  <button
                    onClick={() => scrollToSection("project-submission")}
                    className="text-left p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Submit Project
                  </button>
                  <button
                    onClick={() => scrollToSection("project-list")}
                    className="text-left p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Project List
                  </button>
                  <button
                    onClick={() => scrollToSection("project-status")}
                    className="text-left p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Status Overview
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {activeTab === "invoices" ? (
        <InvoiceManager
          invoiceProjects={invoiceProjects}
          setInvoiceProjects={setInvoiceProjects}
          onClearInvoiceHistory={(brand: string, count: number) => {
            setClearDialog({
              isOpen: true,
              type: "invoice",
              brand,
              count,
            })
          }}
          exportedInvoices={exportedInvoices}
          setExportedInvoices={setExportedInvoices}
          onDeleteProject={handleDeleteInvoiceProject}
          invoiceNumbers={invoiceNumbers}
          setInvoiceNumbers={setInvoiceNumbers}
          onReloadData={loadAllData}
        />
      ) : (
        <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8 md:space-y-12">
          {/* Project Submission Form */}
          <section id="project-submission" className="scroll-mt-20">
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  {editingProject ? "Edit Project" : "Submit New Project"}
                </CardTitle>
                <CardDescription className="text-sm">
                  {editingProject
                    ? "Update project details"
                    : "Fill out the form below to submit a new project request"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Select
                        value={formData.brand}
                        onValueChange={(value: Brand) => setFormData((prev) => ({ ...prev, brand: value }))}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Wami Live">Wami Live</SelectItem>
                          <SelectItem value="Luck On Fourth">Luck On Fourth</SelectItem>
                          <SelectItem value="The Hideout">The Hideout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Project Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: ProjectType) => setFormData((prev) => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Flyer">Flyer</SelectItem>
                          <SelectItem value="Promo Video">Promo Video</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter project title"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Provide as much detail as possible for this project. Include any specific requirements, goals, and ideas for the design/video."
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="files">Project Files (Optional)</Label>
                    <div className="space-y-3">
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors",
                          "border-gray-300 hover:border-gray-400",
                          "bg-gray-50 hover:bg-gray-100",
                        )}
                        onDrop={handleFileDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                      >
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <div className="space-y-2">
                          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Drop files here or{" "}
                              <button
                                type="button"
                                onClick={() => document.getElementById("file-upload")?.click()}
                                className="text-blue-600 hover:text-blue-700 underline"
                              >
                                browse
                              </button>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Images, PDFs, Word docs, and text files up to 10MB each
                            </p>
                          </div>
                        </div>
                      </div>

                      {formData.files.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Attached Files</Label>
                          <div className="grid grid-cols-1 gap-2">
                            {formData.files.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center shrink-0">
                                    {file.type.startsWith("image/") ? (
                                      <img
                                        src={file.url || "/placeholder.svg"}
                                        alt={file.name}
                                        className="w-8 h-8 object-cover rounded"
                                      />
                                    ) : (
                                      <div className="text-xs font-medium text-blue-600">
                                        {file.name.split(".").pop()?.toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(file.id)}
                                  className="text-red-600 hover:text-red-700 shrink-0 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Deadline</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-10 justify-start text-left font-normal",
                              !formData.deadline && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.deadline ? format(formData.deadline, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={formData.deadline}
                            onSelect={(date) => setFormData((prev) => ({ ...prev, deadline: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority (1 = Highest)</Label>
                      <Input
                        id="priority"
                        type="number"
                        min="1"
                        max="99"
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, priority: Number.parseInt(e.target.value) || 1 }))
                        }
                        placeholder="Enter priority number"
                        className="h-10"
                      />
                      <p className="text-xs text-gray-500">Lower numbers = higher priority</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2">
                    <Button type="submit" className="flex-1 h-10" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingProject ? "Updating..." : "Submitting..."}
                        </>
                      ) : editingProject ? (
                        "Update Project"
                      ) : (
                        "Submit Project"
                      )}
                    </Button>
                    {editingProject && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 bg-transparent"
                        onClick={() => {
                          setEditingProject(null)
                          setFormData({
                            title: "",
                            brand: "" as Brand,
                            type: "" as ProjectType,
                            description: "",
                            deadline: undefined,
                            priority: 1 as Priority,
                            files: [],
                          })
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>

          {/* Project List */}
          <section id="project-list" className="scroll-mt-20">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Project List
                </CardTitle>
                <CardDescription className="text-sm">
                  Drag and drop projects to reorder by priority. Higher priority items should be at the top.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeProjects.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-muted-foreground">No projects yet. Submit your first project above!</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    {/* Mobile View - Cards */}
                    <div className="md:hidden">
                      <SortableContext items={activeProjects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                        {activeProjects.map((project) => (
                          <MobileProjectCard
                            key={project.id}
                            project={project}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onProjectClick={setSelectedProject}
                          />
                        ))}
                      </SortableContext>
                    </div>

                    {/* Desktop View - Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Project Title</TableHead>
                            <TableHead className="w-[120px]">Brand</TableHead>
                            <TableHead className="w-[100px]">Type</TableHead>
                            <TableHead className="w-[250px]">Description</TableHead>
                            <TableHead className="w-[120px]">Deadline</TableHead>
                            <TableHead className="w-[100px]">Priority</TableHead>
                            <TableHead className="w-[140px]">Status</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <SortableContext
                            items={activeProjects.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {activeProjects.map((project) => (
                              <SortableProjectRow
                                key={project.id}
                                project={project}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                                onProjectClick={setSelectedProject}
                              />
                            ))}
                          </SortableContext>
                        </TableBody>
                      </Table>
                    </div>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Project Status Overview */}
          <section id="project-status" className="scroll-mt-20">
            <div className="space-y-4 sm:space-y-6">
              {/* Overall Progress */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    Overall Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Completion Rate</span>
                      <span className="font-medium">{getCompletionPercentage()}%</span>
                    </div>
                    <Progress value={getCompletionPercentage()} className="h-3" />
                    <p className="text-sm text-muted-foreground">
                      {getProjectsByStatus("Completed").length} of {projects.length} projects completed
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Pending Projects */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-gray-700 text-sm sm:text-base md:text-lg">
                      <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />
                      Pending ({getProjectsByStatus("Pending").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getProjectsByStatus("Pending").length === 0 ? (
                        <p className="text-sm text-muted-foreground">No pending projects</p>
                      ) : (
                        getProjectsByStatus("Pending").map((project) => (
                          <div key={project.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm truncate pr-2">{project.title}</h4>
                              <Badge variant="outline" className={`${brandColors[project.brand]} text-xs shrink-0`}>
                                {project.brand}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Due: {format(project.deadline, "MMM dd")}
                            </p>
                            <Badge variant="outline" className={`${getPriorityColor(project.priority)} text-xs`}>
                              #{project.priority}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* In Progress Projects */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-blue-700 text-sm sm:text-base md:text-lg">
                      <Clock className="h-4 w-4 md:h-5 md:w-5" />
                      In Progress ({getProjectsByStatus("In Progress").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getProjectsByStatus("In Progress").length === 0 ? (
                        <p className="text-sm text-muted-foreground">No projects in progress</p>
                      ) : (
                        getProjectsByStatus("In Progress").map((project) => (
                          <div key={project.id} className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm truncate pr-2">{project.title}</h4>
                              <Badge variant="outline" className={`${brandColors[project.brand]} text-xs shrink-0`}>
                                {project.brand}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Due: {format(project.deadline, "MMM dd")}
                            </p>
                            <Badge variant="outline" className={`${getPriorityColor(project.priority)} text-xs`}>
                              #{project.priority}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Completed Projects */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-green-700 text-sm sm:text-base md:text-lg">
                        <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                        Completed ({getProjectsByStatus("Completed").length})
                      </CardTitle>
                      {getProjectsByStatus("Completed").length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearCompleted}
                          className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 bg-transparent h-8"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Clear All</span>
                          <span className="sm:hidden">Clear</span>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getProjectsByStatus("Completed").length === 0 ? (
                        <p className="text-sm text-muted-foreground">No completed projects</p>
                      ) : (
                        getProjectsByStatus("Completed").map((project) => (
                          <div key={project.id} className="p-3 bg-green-50 rounded-lg opacity-75">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm truncate pr-2">{project.title}</h4>
                              <Badge variant="outline" className={`${brandColors[project.brand]} text-xs shrink-0`}>
                                {project.brand}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Due: {format(project.deadline, "MMM dd")}
                            </p>
                            <Badge variant="outline" className={`${getPriorityColor(project.priority)} text-xs`}>
                              #{project.priority}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </div>
      )}
      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl md:text-2xl pr-8">{selectedProject.title}</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Project details and specifications
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                {/* Project Meta Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Brand</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={`${brandColors[selectedProject.brand]} text-sm`}>
                          {selectedProject.brand}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Project Type</Label>
                      <p className="mt-1 text-sm font-medium">{selectedProject.type}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Priority</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={`${getPriorityColor(selectedProject.priority)} text-sm`}>
                          #{selectedProject.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={`${statusColors[selectedProject.status]} text-sm`}>
                          {selectedProject.status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Deadline</Label>
                      <p className="mt-1 text-sm font-medium">
                        {format(selectedProject.deadline, "EEEE, MMMM dd, yyyy")}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Created</Label>
                      <p className="mt-1 text-sm text-gray-600">
                        {format(selectedProject.created_at, "MMM dd, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Project Description */}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Project Description</Label>
                  <div className="mt-2 p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
                  </div>
                </div>

                {/* Project Files */}
                {selectedProject.files && selectedProject.files.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Project Files</Label>
                    <div className="mt-2 grid grid-cols-1 gap-3">
                      {selectedProject.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center shrink-0">
                            {file.type.startsWith("image/") ? (
                              <img
                                src={file.url || "/placeholder.svg"}
                                alt={file.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="text-xs font-medium text-blue-600">
                                {file.name.split(".").pop()?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB • {format(file.uploadedAt, "MMM dd, yyyy")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(file.url, "_blank")}
                            className="shrink-0 h-8 w-8 p-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleEdit(selectedProject)
                      setSelectedProject(null)
                    }}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Project
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleStatusChange(
                        selectedProject.id,
                        selectedProject.status === "Completed" ? "In Progress" : "Completed",
                      )
                    }}
                    className="flex-1"
                  >
                    {selectedProject.status === "Completed" ? "Mark In Progress" : "Mark Complete"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDelete(selectedProject.id)
                      setSelectedProject(null)
                    }}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Price Input Dialog */}
      <Dialog
        open={priceDialog.isOpen}
        onOpenChange={(open) => !open && setPriceDialog({ isOpen: false, project: null, price: "" })}
      >
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Set Invoice Price</DialogTitle>
            <DialogDescription>Enter the invoice price for "{priceDialog.project?.title}"</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="invoice-price">Invoice Price ($)</Label>
              <Input
                id="invoice-price"
                type="number"
                step="0.01"
                min="0"
                value={priceDialog.price}
                onChange={(e) => setPriceDialog((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                className="text-lg"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handlePriceSubmit}
                disabled={!priceDialog.price || Number.parseFloat(priceDialog.price) <= 0}
                className="flex-1"
              >
                Complete Project
              </Button>
              <Button
                variant="outline"
                onClick={() => setPriceDialog({ isOpen: false, project: null, price: "" })}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Clear Confirmation Dialog */}
      <Dialog
        open={clearDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setClearDialog({ isOpen: false, type: "completed", count: 0 })
            setProjectToDelete(null)
          }
        }}
      >
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirm Action
            </DialogTitle>
            <DialogDescription>
              {clearDialog.brand
                ? `Are you sure you want to delete this project? This action cannot be undone.`
                : clearDialog.type === "completed"
                  ? `Are you sure you want to permanently delete ${clearDialog.count} completed projects from the database? This will free up database space but will NOT affect your invoice data.`
                  : `Are you sure you want to clear ${clearDialog.count} invoices from invoice history? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <Button
              variant="destructive"
              onClick={() => {
                confirmClearCompleted()
              }}
              className="flex-1"
            >
              {clearDialog.brand && clearDialog.brand.includes('Remove "')
                ? "Remove from Invoice"
                : clearDialog.brand && clearDialog.brand.includes('Delete "')
                  ? "Delete Project"
                  : `Clear ${clearDialog.count} Items`}
            </Button>
            <Button
              variant="outline"
              onClick={() => setClearDialog({ isOpen: false, type: "completed", count: 0 })}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
