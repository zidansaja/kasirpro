'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  Clock,
  AlertCircle,
} from 'lucide-react'
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
import type { ProductReturn, Transaction, Product, ReturnItem } from '@/lib/types'
import { format } from 'date-fns'

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

const statusBadge: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'PENDING', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/30' },
  APPROVED: { label: 'APPROVED', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30' },
  REJECTED: { label: 'REJECTED', className: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30' },
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

interface ManualItem {
  product: Product | null
  productId: string
  productName: string
  quantity: number
  price: number
}

// Status flow stepper for detail dialog
function StatusFlowStepper({ status }: { status: string }) {
  const steps = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'RESOLVED', label: status === 'APPROVED' ? 'Disetujui' : 'Ditolak' },
  ]
  const isResolved = status === 'APPROVED' || status === 'REJECTED'
  const currentStep = isResolved ? 1 : 0
  const isApproved = status === 'APPROVED'

  return (
    <div className="flex items-center gap-2 py-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          currentStep >= 0
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
        }`}>
          {currentStep >= 0 ? <Clock className="w-4 h-4" /> : '1'}
        </div>
        <span className={`text-xs font-medium ${currentStep >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
          Pending
        </span>
      </div>
      <div className={`flex-1 h-0.5 mx-2 ${isResolved
        ? isApproved ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-red-300 dark:bg-red-700'
        : 'bg-gray-200 dark:bg-gray-700'
      }`} />
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          isResolved
            ? isApproved
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
        }`}>
          {isResolved
            ? isApproved ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />
            : '2'
          }
        </div>
        <span className={`text-xs font-medium ${isResolved
          ? isApproved ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
          : 'text-gray-400 dark:text-gray-500'
        }`}>
          {status === 'APPROVED' ? 'Disetujui' : status === 'REJECTED' ? 'Ditolak' : 'Menunggu'}
        </span>
      </div>
    </div>
  )
}

export default function ReturnsView() {
  const user = useAppStore((s) => s.user)
  const isAdmin = user?.role === 'ADMIN'

  const [returns, setReturns] = useState<ProductReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTxId, setSelectedTxId] = useState('')
  const [returnItems, setReturnItems] = useState<ManualItem[]>([])
  const [returnReason, setReturnReason] = useState('')
  const [creating, setCreating] = useState(false)

  // Product search for manual add
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<ProductReturn | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Approve/Reject dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const fetchReturns = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      const res = await fetch(`/api/returns?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setReturns(data.returns)
      }
    } catch {
      toast.error('Gagal memuat data retur')
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=9999')
      const data = await res.json()
      if (data.success) {
        setProducts(data.products)
      }
    } catch {
      // silently fail
    }
  }, [])

  const handleOpenCreate = async () => {
    setCreateOpen(true)
    setSelectedTxId('')
    setReturnItems([])
    setReturnReason('')
    setProductSearch('')

    // Fetch recent transactions
    try {
      const res = await fetch('/api/transactions?limit=50')
      const data = await res.json()
      if (data.success) {
        setTransactions(data.transactions)
      }
    } catch {
      // silently fail
    }

    // Fetch products for manual add
    fetchProducts()
  }

  const handleSelectTransaction = (txId: string) => {
    setSelectedTxId(txId)
    if (!txId) {
      setReturnItems([])
      return
    }
    const tx = transactions.find((t) => t.id === txId)
    if (tx?.transactionItems) {
      setReturnItems(
        tx.transactionItems.map((item) => ({
          product: null,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        }))
      )
    }
  }

  const handleProductSearch = (value: string) => {
    setProductSearch(value)
    if (value.length > 0) {
      const results = products.filter(
        (p) =>
          p.name.toLowerCase().includes(value.toLowerCase()) ||
          p.sku.toLowerCase().includes(value.toLowerCase())
      )
      setSearchResults(results.slice(0, 10))
      setShowProductDropdown(results.length > 0)
    } else {
      setSearchResults([])
      setShowProductDropdown(false)
    }
  }

  const handleSelectProduct = (product: Product) => {
    setReturnItems((prev) => [
      ...prev,
      {
        product,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.sellPrice,
      },
    ])
    setProductSearch('')
    setShowProductDropdown(false)
  }

  const handleUpdateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      setReturnItems((prev) => prev.filter((_, i) => i !== index))
      return
    }
    setReturnItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item))
    )
  }

  const handleRemoveItem = (index: number) => {
    setReturnItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totalRefund = returnItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleCreateReturn = async () => {
    if (returnItems.length === 0) {
      toast.error('Tambahkan minimal 1 produk')
      return
    }
    if (!returnReason.trim()) {
      toast.error('Masukkan alasan retur')
      return
    }

    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        reason: returnReason.trim(),
        items: returnItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
      }
      if (selectedTxId) {
        body.transactionId = selectedTxId
      }

      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Retur berhasil dibuat')
        setCreateOpen(false)
        fetchReturns()
      } else {
        toast.error(data.error || 'Gagal membuat retur')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setCreating(false)
    }
  }

  const handleOpenDetail = async (id: string) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailData(null)
    try {
      const res = await fetch(`/api/returns/${id}`)
      const data = await res.json()
      if (data.success) {
        setDetailData(data.returnData)
      }
    } catch {
      toast.error('Gagal memuat detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmId) return
    setConfirming(true)
    try {
      const res = await fetch(`/api/returns/${confirmId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: confirmAction }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          confirmAction === 'APPROVED' ? 'Retur disetujui' : 'Retur ditolak'
        )
        setConfirmOpen(false)
        setConfirmId(null)
        fetchReturns()
      } else {
        toast.error(data.error || 'Gagal mengubah status')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setConfirming(false)
    }
  }

  // Summary stats
  const stats = useMemo(() => {
    const total = returns.length
    const pending = returns.filter((r) => r.status === 'PENDING').length
    const now = new Date()
    const processedThisMonth = returns
      .filter((r) => {
        if (r.status === 'PENDING') return false
        const d = new Date(r.updatedAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, r) => sum + r.totalRefund, 0)
    return { total, pending, processedThisMonth }
  }, [returns])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
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
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Retur Barang</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola retur barang</p>
          </div>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Buat Retur Baru
        </Button>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Retur</p>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Menunggu</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Diproses Bulan Ini</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatRupiah(stats.processedThisMonth)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterStatus[]).map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(s)}
            className={`cursor-pointer ${
              filterStatus === s
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : ''
            }`}
          >
            {s === 'ALL' ? 'Semua' : s.charAt(0) + s.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Returns Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db transparent',
          }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                  <TableHead className="text-xs font-semibold">No. Retur</TableHead>
                  <TableHead className="text-xs font-semibold">No. Transaksi</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Tanggal</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">Kasir</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Total Refund</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Alasan</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 dark:text-gray-500 py-8">
                      <RotateCcw className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      Belum ada data retur
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((r) => {
                    const badge = statusBadge[r.status]
                    return (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 border-b transition-colors"
                      >
                        <TableCell className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                          {r.returnNumber}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {r.transaction?.transactionNumber || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                          {format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                          {r.user?.name || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-sm font-bold text-red-700 dark:text-red-400">
                            {formatRupiah(r.totalRefund)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell max-w-[200px] truncate">
                          {r.reason}
                        </TableCell>
                        <TableCell>
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => handleOpenDetail(r.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {r.status === 'PENDING' && isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                                  onClick={() => {
                                    setConfirmId(r.id)
                                    setConfirmAction('APPROVED')
                                    setConfirmOpen(true)
                                  }}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                  onClick={() => {
                                    setConfirmId(r.id)
                                    setConfirmAction('REJECTED')
                                    setConfirmOpen(true)
                                  }}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Retur Baru</DialogTitle>
            <DialogDescription>
              Pilih transaksi atau tambah produk manual untuk retur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Transaction Select */}
            <div className="space-y-2">
              <Label>Transaksi (opsional)</Label>
              <Select value={selectedTxId} onValueChange={handleSelectTransaction}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih transaksi..." />
                </SelectTrigger>
                <SelectContent>
                  {transactions.map((tx) => (
                    <SelectItem key={tx.id} value={tx.id}>
                      {tx.transactionNumber} - {formatRupiah(tx.totalAmount)} ({format(new Date(tx.createdAt), 'dd/MM/yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Produk Retur</Label>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Total: {formatRupiah(totalRefund)}
                </span>
              </div>

              {/* Product search dropdown */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder="Cari produk untuk ditambahkan..."
                  value={productSearch}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  className="pl-9 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                  onFocus={() => {
                    if (productSearch.length > 0 && searchResults.length > 0) {
                      setShowProductDropdown(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowProductDropdown(false), 200)
                  }}
                />
                {showProductDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm flex items-center justify-between cursor-pointer"
                        onMouseDown={() => handleSelectProduct(p)}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{p.sku} • {formatRupiah(p.sellPrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items table */}
              {returnItems.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db transparent',
                }}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                        <TableHead className="text-xs font-semibold">Produk</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Harga</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Subtotal</TableHead>
                        <TableHead className="text-xs font-semibold w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnItems.map((item, idx) => (
                        <TableRow key={`${item.productId}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">
                            {formatRupiah(item.price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value) || 0)}
                              className="w-20 text-right ml-auto dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                              min={1}
                            />
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                            {formatRupiah(item.price * item.quantity)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                              onClick={() => handleRemoveItem(idx)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Alasan Retur</Label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Masukkan alasan retur..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="cursor-pointer">
              Batal
            </Button>
            <Button
              onClick={handleCreateReturn}
              disabled={creating || returnItems.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Buat Retur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Retur</DialogTitle>
            <DialogDescription>
              {detailData ? (
                <span className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{detailData.returnNumber}</span>
                  <Badge className={statusBadge[detailData.status].className}>
                    {statusBadge[detailData.status].label}
                  </Badge>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(detailData.createdAt), 'dd/MM/yyyy HH:mm')}
                  </span>
                </span>
              ) : (
                <span className="sr-only">Memuat detail retur</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {detailLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : detailData ? (
              <>
                {/* Status Flow Stepper */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <StatusFlowStepper status={detailData.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">No. Transaksi:</span>{' '}
                    <span className="font-mono font-medium">{detailData.transaction?.transactionNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Kasir:</span>{' '}
                    <span className="font-medium">{detailData.user?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Total Refund:</span>{' '}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatRupiah(detailData.totalRefund)}</span>
                  </div>
                </div>

                {/* Reason Callout */}
                <div className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-600 rounded-r-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Alasan Retur</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{detailData.reason}</p>
                </div>

                {detailData.items && detailData.items.length > 0 && (
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#d1d5db transparent',
                  }}>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                          <TableHead className="text-xs font-semibold">Produk</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Harga</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="table-row-hover">
                        {detailData.items.map((item: ReturnItem) => (
                          <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.productName}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">
                              {formatRupiah(item.price)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
                              {formatRupiah(item.subtotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Tidak ada data</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'APPROVED' ? 'Setujui Retur?' : 'Tolak Retur?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'APPROVED'
                ? 'Stok produk akan dikembalikan dan refund diproses.'
                : 'Retur ini akan ditolak dan stok tidak berubah.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={confirming}
              className={`cursor-pointer ${
                confirmAction === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {confirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmAction === 'APPROVED' ? 'Setujui' : 'Tolak'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
