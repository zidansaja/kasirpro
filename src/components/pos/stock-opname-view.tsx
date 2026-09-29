'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Eye, CheckCircle2, Loader2, ClipboardCheck, Search, Pencil, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import type { StockOpname, StockOpnameItem, Product } from '@/lib/types'
import { format } from 'date-fns'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const formatNumber = (num: number) =>
  new Intl.NumberFormat('id-ID').format(num)

// Enhanced status badges with icons
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          <Pencil className="w-3 h-3" />
          DRAFT
        </span>
      )
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="w-3 h-3 animate-pulse" />
          SUBMITTED
        </span>
      )
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="w-3 h-3" />
          APPROVED
        </span>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

const statusBadge: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'DRAFT', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-700' },
  SUBMITTED: { label: 'SUBMITTED', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/30' },
  APPROVED: { label: 'APPROVED', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30' },
}

interface EditableItem {
  productId: string
  productName: string
  systemStock: number
  actualStock: number
  difference: number
  note: string
}

// Difference bar visualization for detail dialog
function DifferenceBar({ system, actual, difference }: { system: number; actual: number; difference: number }) {
  if (difference === 0) return null
  const max = Math.max(system, actual)
  if (max === 0) return null
  const systemWidth = Math.max(5, (system / max) * 100)
  const actualWidth = Math.max(5, (actual / max) * 100)
  const isPositive = difference > 0

  return (
    <div className="flex items-center gap-1 mt-1">
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gray-400 dark:bg-gray-500 rounded-full" style={{ width: `${systemWidth}%` }} />
          </div>
          <span className="text-[10px] text-gray-400 w-8 text-right">{formatNumber(system)}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${actualWidth}%` }} />
          </div>
          <span className={`text-[10px] w-8 text-right ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>{formatNumber(actual)}</span>
        </div>
      </div>
    </div>
  )
}

export default function StockOpnameView() {
  const user = useAppStore((s) => s.user)
  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createMonth, setCreateMonth] = useState('')
  const [createYear, setCreateYear] = useState(String(new Date().getFullYear()))
  const [creating, setCreating] = useState(false)

  // Edit dialog (after creating or editing DRAFT)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editItems, setEditItems] = useState<EditableItem[]>([])
  const [editSearch, setEditSearch] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<StockOpname | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Approve dialog
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveId, setApproveId] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)

  // List search
  const [listSearch, setListSearch] = useState('')

  const fetchStockOpnames = useCallback(async () => {
    try {
      const res = await fetch('/api/stock-opname')
      const data = await res.json()
      if (data.success) {
        setStockOpnames(data.stockOpnames)
      }
    } catch {
      toast.error('Gagal memuat data stok opname')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStockOpnames()
  }, [fetchStockOpnames])

  const handleCreate = async () => {
    const month = parseInt(createMonth)
    const year = parseInt(createYear)
    if (!month || !year || month < 1 || month > 12) {
      toast.error('Pilih bulan dan tahun yang valid')
      return
    }

    setCreating(true)
    try {
      // Fetch all products
      const prodRes = await fetch('/api/products?limit=9999')
      const prodData = await prodRes.json()
      if (!prodData.success) {
        toast.error('Gagal mengambil data produk')
        return
      }

      const products: Product[] = prodData.products
      const items = products.map((p) => ({
        productId: p.id,
        productName: p.name,
        systemStock: p.stock,
        actualStock: p.stock,
        difference: 0,
        note: '',
      }))

      const res = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, items }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Stok opname berhasil dibuat')
        setCreateOpen(false)
        setCreateMonth('')

        // Open edit view for the newly created stock opname
        setEditId(data.stockOpname.id)
        setEditItems(items)
        setEditOpen(true)
        fetchStockOpnames()
      } else {
        toast.error(data.error || 'Gagal membuat stok opname')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setCreating(false)
    }
  }

  const handleEditActualStock = (index: number, value: string) => {
    const num = value === '' ? 0 : parseInt(value) || 0
    setEditItems((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        actualStock: num,
        difference: num - updated[index].systemStock,
      }
      return updated
    })
  }

  const handleEditNote = (index: number, note: string) => {
    setEditItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], note }
      return updated
    })
  }

  const handleSaveEdit = async (submit = false) => {
    if (!editId) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/stock-opname/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: submit ? 'SUBMITTED' : 'DRAFT',
          items: editItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            systemStock: item.systemStock,
            actualStock: item.actualStock,
            difference: item.difference,
        note: item.note,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(submit ? 'Stok opname berhasil diajukan' : 'Draft berhasil disimpan')
        setEditOpen(false)
        setEditId(null)
        fetchStockOpnames()
      } else {
        toast.error(data.error || 'Gagal menyimpan')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setEditSaving(false)
    }
  }

  const handleOpenDetail = async (id: string) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailData(null)
    try {
      const res = await fetch(`/api/stock-opname/${id}`)
      const data = await res.json()
      if (data.success) {
        setDetailData(data.stockOpname)
      }
    } catch {
      toast.error('Gagal memuat detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenEdit = async (so: StockOpname) => {
    if (so.status !== 'DRAFT') {
      toast.error('Hanya draft yang bisa diedit')
      return
    }
    setEditId(so.id)
    if (so.items && so.items.length > 0) {
      setEditItems(
        so.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          systemStock: item.systemStock,
          actualStock: item.actualStock,
          difference: item.difference,
          note: item.note || '',
        }))
      )
    } else {
      // Fallback: fetch products
      try {
        const prodRes = await fetch('/api/products?limit=9999')
        const prodData = await prodRes.json()
        if (prodData.success) {
          setEditItems(
            prodData.products.map((p: Product) => ({
              productId: p.id,
              productName: p.name,
              systemStock: p.stock,
              actualStock: p.stock,
              difference: 0,
              note: '',
            }))
          )
        }
      } catch {
        toast.error('Gagal memuat produk')
        return
      }
    }
    setEditOpen(true)
  }

  const handleApprove = async () => {
    if (!approveId) return
    setApproving(true)
    try {
      const res = await fetch(`/api/stock-opname/${approveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Stok opname berhasil disetujui')
        setApproveOpen(false)
        setApproveId(null)
        fetchStockOpnames()
      } else {
        toast.error(data.error || 'Gagal menyetujui')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setApproving(false)
    }
  }

  // Client-side filter for stock opname list
  const filteredStockOpnames = useMemo(() => {
    if (!listSearch.trim()) return stockOpnames
    const q = listSearch.toLowerCase().trim()
    return stockOpnames.filter((so) => {
      const monthYear = `${MONTH_NAMES[so.month - 1]} ${so.year}`.toLowerCase()
      const status = so.status.toLowerCase()
      const userName = so.user?.name?.toLowerCase() || ''
      const note = so.note?.toLowerCase() || ''
      return (
        monthYear.includes(q) ||
        status.includes(q) ||
        userName.includes(q) ||
        note.includes(q)
      )
    })
  }, [stockOpnames, listSearch])

  const filteredEditItems = editSearch
    ? editItems.filter((item) =>
        item.productName.toLowerCase().includes(editSearch.toLowerCase())
      )
    : editItems

  // Summary stats
  const stats = useMemo(() => {
    const total = stockOpnames.length
    const submitted = stockOpnames.filter((so) => so.status === 'SUBMITTED').length
    const now = new Date()
    const approvedThisMonth = stockOpnames.filter((so) => {
      if (so.status !== 'APPROVED') return false
      const d = new Date(so.updatedAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    return { total, submitted, approvedThisMonth }
  }, [stockOpnames])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stok Opname</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola stock opname bulanan</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Cari stok opname..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="h-9 pl-8 w-56 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Buat Stok Opname Baru
          </Button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Opname</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Menunggu Persetujuan</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{stats.submitted}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Selesai Bulan Ini</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{stats.approvedThisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Opname List */}
      {filteredStockOpnames.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">{stockOpnames.length === 0 ? 'Belum ada stok opname' : 'Tidak ada stok opname ditemukan'}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{stockOpnames.length === 0 ? 'Klik tombol di atas untuk membuat stok opname baru' : 'Coba ubah kata kunci pencarian'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredStockOpnames.map((so) => {
            return (
              <motion.div
                key={so.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <ClipboardCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {MONTH_NAMES[so.month - 1]} {so.year}
                            </h3>
                            <StatusBadge status={so.status} />
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <span>Dibuat oleh: <span className="font-medium text-gray-700 dark:text-gray-300">{so.user?.name || '-'}</span></span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{format(new Date(so.createdAt), 'dd MMM yyyy HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(so.id)}
                          className="cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detail
                        </Button>
                        {so.status === 'DRAFT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(so)}
                            className="cursor-pointer"
                          >
                            Edit
                          </Button>
                        )}
                        {so.status === 'SUBMITTED' && user?.role === 'ADMIN' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setApproveId(so.id)
                              setApproveOpen(true)
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Setujui
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Stok Opname Baru</DialogTitle>
            <DialogDescription>
              Pilih bulan dan tahun untuk stok opname. Semua produk akan diambil otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Bulan</Label>
              <Select value={createMonth} onValueChange={setCreateMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tahun</Label>
              <Input
                type="number"
                value={createYear}
                onChange={(e) => setCreateYear(e.target.value)}
                min={2000}
                max={2100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="cursor-pointer">
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !createMonth}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Buat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Stok Opname</DialogTitle>
            <DialogDescription>
              Sesuaikan stok aktual untuk setiap produk. Selisih akan dihitung otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder="Cari produk..."
                  value={editSearch}
                  onChange={(e) => setEditSearch(e.target.value)}
                  className="pl-9 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db transparent',
            }}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                    <TableHead className="text-xs font-semibold">Produk</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Stok Sistem</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Stok Aktual</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Selisih</TableHead>
                    <TableHead className="text-xs font-semibold">Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="table-row-hover">
                  {filteredEditItems.map((item, idx) => {
                    const realIdx = editItems.findIndex((e) => e.productId === item.productId)
                    return (
                      <TableRow key={item.productId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">
                          {formatNumber(item.systemStock)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.actualStock}
                            onChange={(e) => handleEditActualStock(realIdx, e.target.value)}
                            className="w-24 text-right ml-auto dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                            min={0}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`text-sm font-semibold ${
                              item.difference > 0
                                ? 'text-emerald-600'
                                : item.difference < 0
                                  ? 'text-red-600'
                                  : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {item.difference > 0 ? '+' : ''}
                            {formatNumber(item.difference)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            value={item.note}
                            onChange={(e) => handleEditNote(realIdx, e.target.value)}
                            placeholder="-"
                            className="w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="cursor-pointer">
              Batal
            </Button>
            <Button
              onClick={() => handleSaveEdit(false)}
              disabled={editSaving}
              variant="outline"
              className="cursor-pointer"
            >
              {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
            <Button
              onClick={() => handleSaveEdit(true)}
              disabled={editSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Ajukan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detail Stok Opname - {detailData ? `${MONTH_NAMES[detailData.month - 1]} ${detailData.year}` : ''}
            </DialogTitle>
            <DialogDescription>
              {detailData ? (
                <span className="flex items-center gap-2 mt-1">
                  <StatusBadge status={detailData.status} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Oleh {detailData.user?.name || '-'} • {format(new Date(detailData.createdAt), 'dd MMM yyyy HH:mm')}
                  </span>
                </span>
              ) : (
                <span className="sr-only">Memuat detail stok opname</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {detailLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : detailData?.items && detailData.items.length > 0 ? (
              <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db transparent',
              }}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                      <TableHead className="text-xs font-semibold">Nama Produk</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Stok Sistem</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Stok Aktual</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Selisih</TableHead>
                      <TableHead className="text-xs font-semibold">Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="table-row-hover">
                    {detailData.items.map((item: StockOpnameItem) => (
                      <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <TableCell className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{item.productName}</div>
                          {item.difference !== 0 && (
                            <DifferenceBar
                              system={item.systemStock}
                              actual={item.actualStock}
                              difference={item.difference}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">
                          {formatNumber(item.systemStock)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">
                          {formatNumber(item.actualStock)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`text-sm font-semibold ${
                              item.difference > 0
                                ? 'text-emerald-600'
                                : item.difference < 0
                                  ? 'text-red-600'
                                  : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {item.difference > 0 ? '+' : ''}
                            {formatNumber(item.difference)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                          {item.note || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Tidak ada item</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Confirm Dialog */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui Stok Opname?</AlertDialogTitle>
            <AlertDialogDescription>
              Stok produk akan diperbarui sesuai stok aktual yang tercatat. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={approving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {approving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Setujui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
