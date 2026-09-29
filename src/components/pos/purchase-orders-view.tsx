'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  ShoppingBag,
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  DollarSign,
  Search,
  Loader2,
  X,
  Eye,
  PackageCheck,
  Ban,
} from 'lucide-react'
import EmptyState from '@/components/pos/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { PurchaseOrder, PurchaseOrderItem, Supplier, Product } from '@/lib/types'

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  ORDERED: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  RECEIVED: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ORDERED: 'Dipesan',
  RECEIVED: 'Diterima',
  CANCELLED: 'Dibatalkan',
}

const STATUS_BORDER: Record<string, string> = {
  DRAFT: 'border-l-gray-400',
  ORDERED: 'border-l-amber-400',
  RECEIVED: 'border-l-emerald-400',
  CANCELLED: 'border-l-red-400',
}

const STATUS_DOT: Record<string, string> = {
  DRAFT: 'bg-gray-400',
  ORDERED: 'bg-amber-400',
  RECEIVED: 'bg-emerald-400',
  CANCELLED: 'bg-red-400',
}

const STATUS_FILTERS = ['Semua', 'DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED']

// Animated count-up hook
function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

interface POListItem {
  id: string
  orderNumber: string
  supplierId?: string
  supplier?: { id: string; name: string }
  userId: string
  user?: { id: string; name: string }
  date: string
  status: string
  totalAmount: number
  note?: string
  createdAt: string
  _count?: { items: number }
}

interface POResponse {
  success: boolean
  purchaseOrders: POListItem[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface FormItem {
  productId: string
  productName: string
  quantity: number
  buyPrice: number
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const display = useCountUp(value)
  return <>{prefix}{display.toLocaleString('id-ID')}{suffix}</>
}

export default function PurchaseOrdersView() {
  const user = useAppStore((s) => s.user)
  const isAdmin = user?.role === 'ADMIN'

  // List state
  const [purchaseOrders, setPurchaseOrders] = useState<POListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    receivedThisMonth: 0,
    receivedTotalValue: 0,
  })

  // Animated values
  const animatedTotalOrders = useCountUp(stats.totalOrders)
  const animatedReceivedThisMonth = useCountUp(stats.receivedThisMonth)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [formSupplierId, setFormSupplierId] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formItems, setFormItems] = useState<FormItem[]>([])
  const [newItemProductId, setNewItemProductId] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')
  const [newItemBuyPrice, setNewItemBuyPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Status change
  const [statusChanging, setStatusChanging] = useState(false)

  const fetchPurchaseOrders = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'Semua') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('page', String(page))
      params.set('limit', '10')

      const res = await fetch(`/api/purchase-orders?${params.toString()}`)
      const data: POResponse = await res.json()
      if (data.success) {
        setPurchaseOrders(data.purchaseOrders)
        if (data.pagination) {
          setTotal(data.pagination.total)
          setTotalPages(data.pagination.totalPages)
          setCurrentPage(data.pagination.page)
        }
      }
    } catch {
      toast.error('Gagal memuat data pesanan pembelian')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery, startDate, endDate])

  // Fetch stats separately (all POs regardless of filter)
  const fetchStats = useCallback(async () => {
    try {
      // Get all POs for stats
      const res = await fetch('/api/purchase-orders?limit=1000')
      const data: POResponse = await res.json()
      if (data.success) {
        const all = data.purchaseOrders
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const receivedThisMonth = all.filter(
          (po) => po.status === 'RECEIVED' && new Date(po.date) >= monthStart
        )
        const receivedAll = all.filter((po) => po.status === 'RECEIVED')

        setStats({
          totalOrders: all.length,
          pendingOrders: all.filter((po) => po.status === 'DRAFT' || po.status === 'ORDERED').length,
          receivedThisMonth: receivedThisMonth.length,
          receivedTotalValue: receivedAll.reduce((sum, po) => sum + po.totalAmount, 0),
        })
      }
    } catch {
      // Silently ignore stats error
    }
  }, [])

  useEffect(() => {
    fetchPurchaseOrders(1)
    fetchStats()
  }, [fetchPurchaseOrders, fetchStats])

  // Fetch suppliers and products for create dialog
  useEffect(() => {
    if (createOpen) {
      const fetchSuppliers = async () => {
        try {
          const res = await fetch('/api/suppliers?limit=100')
          const data = await res.json()
          if (data.success) setSuppliers(data.suppliers)
        } catch { /* ignore */ }
      }
      const fetchProducts = async () => {
        try {
          const res = await fetch('/api/products?limit=1000')
          const data = await res.json()
          if (data.success) setProducts(data.products)
        } catch { /* ignore */ }
      }
      fetchSuppliers()
      fetchProducts()
    }
  }, [createOpen])

  const handleFilter = () => {
    setCurrentPage(1)
    fetchPurchaseOrders(1)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
  }

  useEffect(() => {
    setCurrentPage(1)
    fetchPurchaseOrders(1)
  }, [statusFilter])

  // Form total
  const formTotal = useMemo(() =>
    formItems.reduce((sum, item) => sum + item.quantity * item.buyPrice, 0),
    [formItems]
  )

  // Create handlers
  const handleOpenCreate = () => {
    setCreateStep(1)
    setFormSupplierId('')
    setFormNote('')
    setFormItems([])
    setNewItemProductId('')
    setNewItemQuantity('')
    setNewItemBuyPrice('')
    setCreateOpen(true)
  }

  const handleAddItem = () => {
    if (!newItemProductId || !newItemQuantity || Number(newItemQuantity) <= 0 || !newItemBuyPrice || Number(newItemBuyPrice) <= 0) {
      toast.error('Produk, jumlah, dan harga beli wajib diisi dengan benar')
      return
    }
    const product = products.find((p) => p.id === newItemProductId)
    if (!product) return

    // Check duplicate
    if (formItems.find((i) => i.productId === newItemProductId)) {
      toast.error('Produk sudah ditambahkan')
      return
    }

    setFormItems([
      ...formItems,
      {
        productId: newItemProductId,
        productName: product.name,
        quantity: Number(newItemQuantity),
        buyPrice: Number(newItemBuyPrice),
      },
    ])
    setNewItemProductId('')
    setNewItemQuantity('')
    setNewItemBuyPrice('')
  }

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  // Auto-fill buy price when product is selected
  const handleProductSelect = (productId: string) => {
    setNewItemProductId(productId)
    const product = products.find((p) => p.id === productId)
    if (product && product.buyPrice > 0) {
      setNewItemBuyPrice(String(product.buyPrice))
    }
  }

  const handleSubmitCreate = async () => {
    if (formItems.length === 0) {
      toast.error('Tambahkan minimal satu produk')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          supplierId: formSupplierId || null,
          items: formItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            buyPrice: item.buyPrice,
          })),
          note: formNote || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Pesanan pembelian berhasil dibuat')
        setCreateOpen(false)
        fetchPurchaseOrders(1)
        fetchStats()
      } else {
        toast.error(data.message || 'Gagal membuat pesanan pembelian')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  // Detail
  const handleOpenDetail = async (id: string) => {
    setDetailPO(null)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/purchase-orders/${id}`)
      const data = await res.json()
      if (data.success) {
        setDetailPO(data.purchaseOrder)
      } else {
        toast.error(data.message || 'Gagal memuat detail')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setDetailLoading(false)
    }
  }

  // Delete
  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/purchase-orders/${deleteId}?userRole=${user?.role}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Pesanan pembelian berhasil dihapus')
        setDeleteOpen(false)
        setDeleteId(null)
        fetchPurchaseOrders(currentPage)
        fetchStats()
      } else {
        toast.error(data.message || 'Gagal menghapus pesanan')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setDeleting(false)
    }
  }

  // Status change
  const handleChangeStatus = async (id: string, newStatus: string) => {
    setStatusChanging(true)
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userRole: user?.role,
          status: newStatus,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Status berhasil diubah ke ${STATUS_LABELS[newStatus]}`)
        fetchPurchaseOrders(currentPage)
        fetchStats()
        // Refresh detail if open
        if (detailPO && detailPO.id === id) {
          setDetailPO(data.purchaseOrder)
        }
      } else {
        toast.error(data.message || 'Gagal mengubah status')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setStatusChanging(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pesanan Pembelian</h2>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Buat Pesanan
        </Button>
      </div>

      {/* Stats Cards - 3 cards with card-shine */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Pesanan */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="relative overflow-hidden rounded-2xl shadow-lg p-5 text-white transition-transform hover:scale-[1.02] hover:shadow-xl card-shine"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <div className="absolute -top-2 -right-2 opacity-15 text-white pointer-events-none">
            <ShoppingBag className="w-12 h-12" />
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-2 min-h-[100px] justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Total Pesanan</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{animatedTotalOrders}</p>
            </div>
            <p className="text-xs text-white/70">Semua pesanan</p>
          </div>
        </motion.div>

        {/* Nilai Pembelian */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl shadow-lg p-5 text-white transition-transform hover:scale-[1.02] hover:shadow-xl card-shine"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-600" />
          <div className="absolute -top-2 -right-2 opacity-15 text-white pointer-events-none">
            <DollarSign className="w-12 h-12" />
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-2 min-h-[100px] justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Nilai Pembelian</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{formatRupiah(stats.receivedTotalValue)}</p>
            </div>
            <p className="text-xs text-white/70">Total nilai diterima</p>
          </div>
        </motion.div>

        {/* Diterima Bulan Ini */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl shadow-lg p-5 text-white transition-transform hover:scale-[1.02] hover:shadow-xl card-shine col-span-2 lg:col-span-1"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-500" />
          <div className="absolute -top-2 -right-2 opacity-15 text-white pointer-events-none">
            <CheckCircle className="w-12 h-12" />
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-2 min-h-[100px] justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Diterima Bulan Ini</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{animatedReceivedThisMonth}</p>
            </div>
            <p className="text-xs text-white/70">Bulan berjalan</p>
          </div>
        </motion.div>
      </div>

      {/* Filter Bar */}
      <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Status filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusFilterChange(s)}
                  className={
                    statusFilter === s
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      : 'cursor-pointer'
                  }
                >
                  {s === 'Semua' ? 'Semua' : STATUS_LABELS[s] || s}
                </Button>
              ))}
            </div>
            {/* Search + Date range */}
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 w-full sm:w-auto">
                <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Pencarian</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Cari nomor pesanan atau supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                    className="h-10 pl-9"
                  />
                </div>
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Tanggal Akhir</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10"
                />
              </div>
              <Button
                onClick={handleFilter}
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer h-10"
              >
                <Search className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PO List */}
      <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700">
        <CardContent className="p-0">
          {purchaseOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Belum Ada Pesanan Pembelian"
              description="Buat pesanan pembelian baru untuk mulai melacak pembelian produk dari supplier."
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-100 dark:border-gray-700">
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">No. Pesanan</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Supplier</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center">Item</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Total</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => (
                      <TableRow
                        key={po.id}
                        className={`table-row-hover border-b border-gray-50 dark:border-gray-700/50 border-l-4 ${STATUS_BORDER[po.status] || 'border-l-gray-300'}`}
                      >
                        <TableCell className="py-3">
                          <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                            {po.orderNumber}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {po.supplier?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {format(new Date(po.date), 'd MMM yyyy', { locale: localeId })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {po._count?.items || 0} item
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatRupiah(po.totalAmount)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <Badge
                            variant="secondary"
                            className={STATUS_BADGES[po.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[po.status] || 'bg-gray-400'}`} />
                            {STATUS_LABELS[po.status] || po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950 cursor-pointer"
                              onClick={() => handleOpenDetail(po.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {po.status === 'DRAFT' && isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950 cursor-pointer"
                                onClick={() => handleDeleteClick(po.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                {purchaseOrders.map((po) => (
                  <motion.div
                    key={po.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                            {po.orderNumber}
                          </span>
                          <Badge
                            variant="secondary"
                            className={STATUS_BADGES[po.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[po.status] || 'bg-gray-400'}`} />
                            {STATUS_LABELS[po.status] || po.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {po.supplier?.name || 'Tanpa supplier'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {format(new Date(po.date), 'd MMM yyyy', { locale: localeId })} • {po._count?.items || 0} item
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {formatRupiah(po.totalAmount)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-emerald-600 cursor-pointer"
                            onClick={() => handleOpenDetail(po.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {po.status === 'DRAFT' && isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-red-600 cursor-pointer"
                              onClick={() => handleDeleteClick(po.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Halaman {currentPage} dari {totalPages} ({total} data)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => fetchPurchaseOrders(currentPage - 1)}
                      className="cursor-pointer"
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => fetchPurchaseOrders(currentPage + 1)}
                      className="cursor-pointer"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create PO Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Buat Pesanan Pembelian
            </DialogTitle>
            <DialogDescription>
              Langkah {createStep} dari 2 — {createStep === 1 ? 'Pilih supplier dan catatan' : 'Tambahkan produk pesanan'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Supplier + Note */}
          {createStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</Label>
                <Select value={formSupplierId} onValueChange={setFormSupplierId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih supplier (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tanpa Supplier</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Catatan</Label>
                <Textarea
                  placeholder="Catatan tambahan (opsional)"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: Add Items */}
          {createStep === 2 && (
            <div className="space-y-4 py-2">
              {/* Add item row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Produk</Label>
                  <Select value={newItemProductId} onValueChange={handleProductSelect}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Jumlah</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    min="1"
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Harga Beli</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newItemBuyPrice}
                    onChange={(e) => setNewItemBuyPrice(e.target.value)}
                    min="0"
                    className="h-10"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddItem}
                variant="outline"
                className="w-full cursor-pointer"
                disabled={!newItemProductId || !newItemQuantity || !newItemBuyPrice}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Produk
              </Button>

              {/* Items list */}
              {formItems.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {formItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} × {formatRupiah(item.buyPrice)} = {formatRupiah(item.quantity * item.buyPrice)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 cursor-pointer shrink-0"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Running total */}
              {formItems.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Pesanan</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(formTotal)}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={submitting}
              className="cursor-pointer"
            >
              Batal
            </Button>
            {createStep === 1 ? (
              <Button
                onClick={() => setCreateStep(2)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                Selanjutnya
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCreateStep(1)}
                  disabled={submitting}
                  className="cursor-pointer"
                >
                  Kembali
                </Button>
                <Button
                  onClick={handleSubmitCreate}
                  disabled={submitting || formItems.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Buat Pesanan'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Detail Pesanan Pembelian
            </DialogTitle>
            <DialogDescription>
              {detailPO?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : detailPO ? (
            <div className="space-y-4 py-2">
              {/* PO Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nomor Pesanan</p>
                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">{detailPO.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  <Badge
                    variant="secondary"
                    className={STATUS_BADGES[detailPO.status] || ''}
                  >
                    {STATUS_LABELS[detailPO.status] || detailPO.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Supplier</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{detailPO.supplier?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {format(new Date(detailPO.date), 'd MMMM yyyy', { locale: localeId })}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Catatan</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{detailPO.note || '-'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Pesanan</p>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-100 dark:border-gray-700">
                        <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400">Produk</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center">Qty</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Harga Beli</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailPO.items?.map((item: PurchaseOrderItem) => (
                        <TableRow key={item.id} className="border-b border-gray-50 dark:border-gray-700/50">
                          <TableCell className="py-2 text-sm text-gray-900 dark:text-gray-100">
                            {item.productName}
                          </TableCell>
                          <TableCell className="py-2 text-sm text-center text-gray-700 dark:text-gray-300">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="py-2 text-sm text-right text-gray-700 dark:text-gray-300">
                            {formatRupiah(item.buyPrice)}
                          </TableCell>
                          <TableCell className="py-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                            {formatRupiah(item.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatRupiah(detailPO.totalAmount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {detailPO.status === 'DRAFT' && (
                  <>
                    <Button
                      onClick={() => handleChangeStatus(detailPO.id, 'ORDERED')}
                      disabled={statusChanging}
                      className="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                    >
                      {statusChanging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-2" />}
                      Ubah ke Dipesan
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                        onClick={() => { setDetailOpen(false); handleDeleteClick(detailPO.id) }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus
                      </Button>
                    )}
                  </>
                )}
                {detailPO.status === 'ORDERED' && (
                  <>
                    <Button
                      onClick={() => handleChangeStatus(detailPO.id, 'RECEIVED')}
                      disabled={statusChanging}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      {statusChanging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Ubah ke Diterima
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                      onClick={() => handleChangeStatus(detailPO.id, 'CANCELLED')}
                      disabled={statusChanging}
                    >
                      {statusChanging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                      Batalkan
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              Hapus Pesanan Pembelian?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Tindakan ini tidak dapat dibatalkan. Pesanan pembelian ini akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="cursor-pointer">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
