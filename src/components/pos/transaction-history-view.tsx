'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  ShoppingCart,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import type { Transaction, TransactionItem, PaymentMethod, Product } from '@/lib/types'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { generateCSV, downloadFile, formatRupiah, formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: idLocale })
  } catch {
    return dateStr
  }
}

const formatDateShort = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: idLocale })
  } catch {
    return dateStr
  }
}

const paymentBadge: Record<PaymentMethod, { label: string; className: string }> = {
  CASH: { label: 'CASH', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30' },
  TRANSFER: { label: 'TRANSFER', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30' },
  QRIS: { label: 'QRIS', className: 'bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/30' },
}

const PAGE_SIZE = 20

export default function TransactionHistoryView() {
  const { cart, addToCart, clearCart, setCurrentView } = useAppStore()

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<Transaction | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Reorder dialog
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false)
  const [reorderTransaction, setReorderTransaction] = useState<Transaction | null>(null)
  const [reorderLoading, setReorderLoading] = useState(false)

  // Fetch all transactions for date range (no server-side pagination)
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('limit', '9999')

      const res = await fetch(`/api/transactions?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setAllTransactions(data.transactions || [])
      } else {
        toast.error('Gagal memuat data transaksi')
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Client-side filtering
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions

    if (paymentFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.paymentMethod === paymentFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((t) =>
        t.transactionNumber.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [allTransactions, paymentFilter, searchQuery])

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const totalFiltered = filteredTransactions.length

  // Reset page if it exceeds total pages after filtering
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const displayedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredTransactions.slice(start, start + PAGE_SIZE)
  }, [filteredTransactions, page])

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }
    const headers = [
      'No', 'Nomor Transaksi', 'Tanggal', 'Metode Pembayaran', 'Jumlah Item',
      'Subtotal', 'Diskon', 'Total', 'Dibayar', 'Kembalian', 'Kasir', 'Pelanggan',
    ]
    const rows = filteredTransactions.map((tx, idx) => [
      idx + 1,
      tx.transactionNumber,
      formatDateTime(tx.createdAt, 'dd/MM/yyyy HH:mm'),
      tx.paymentMethod,
      tx.transactionItems?.length ?? 0,
      formatRupiah(tx.subtotalAmount),
      formatRupiah(tx.discountAmount),
      formatRupiah(tx.totalAmount),
      formatRupiah(tx.paymentAmount),
      formatRupiah(tx.changeAmount),
      tx.user?.name || '-',
      tx.customerName || '',
    ])
    const dateRange = startDate && endDate
      ? `${startDate}_${endDate}`
      : startDate
        ? `${startDate}_sekarang`
        : endDate
          ? `awal_${endDate}`
          : 'semua'
    const csv = generateCSV(headers, rows)
    downloadFile(csv, `transaksi-${dateRange}.csv`)
    toast.success('File CSV berhasil diunduh')
  }

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const res = await fetch(`/api/transactions/${id}`)
      const data = await res.json()
      if (data.success) {
        setDetailData(data.transaction)
      } else {
        toast.error('Gagal memuat detail transaksi')
        setDetailOpen(false)
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  // Reorder logic
  const handleReorder = async (tx: Transaction) => {
    // If cart already has items, show confirmation dialog
    if (cart.length > 0) {
      setReorderTransaction(tx)
      setReorderDialogOpen(true)
      return
    }
    await executeReorder(tx)
  }

  const executeReorder = async (tx: Transaction, clearExisting: boolean = false) => {
    setReorderLoading(true)
    try {
      // Fetch full transaction with items if not already loaded
      let txItems = tx.transactionItems
      if (!txItems || txItems.length === 0) {
        const res = await fetch(`/api/transactions/${tx.id}`)
        const data = await res.json()
        if (data.success && data.transaction?.transactionItems) {
          txItems = data.transaction.transactionItems
        } else {
          toast.error('Gagal memuat item transaksi')
          return
        }
      }

      if (clearExisting) {
        clearCart()
      }

      // Fetch products and add to cart
      let addedCount = 0
      for (const item of txItems!) {
        try {
          const res = await fetch(`/api/products/${item.productId}`)
          const data = await res.json()
          if (data.success && data.product) {
            const product = data.product as Product
            addToCart(product, item.quantity)
            addedCount++
          }
        } catch {
          // skip this product if not found
        }
      }

      if (addedCount > 0) {
        toast.success(`${addedCount} item ditambahkan ke keranjang`, {
          description: `Dari transaksi ${tx.transactionNumber}`,
        })
        // Navigate to POS view
        setCurrentView('pos')
      } else {
        toast.error('Tidak ada item yang bisa ditambahkan')
      }
    } catch {
      toast.error('Gagal memproses pesanan ulang')
    } finally {
      setReorderLoading(false)
      setReorderDialogOpen(false)
      setReorderTransaction(null)
    }
  }

  const handleResetFilters = () => {
    setStartDate('')
    setEndDate('')
    setPaymentFilter('ALL')
    setSearchQuery('')
    setPage(1)
  }

  const hasActiveFilters = startDate || endDate || paymentFilter !== 'ALL' || searchQuery.trim()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Riwayat Transaksi</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola dan lihat semua transaksi</p>
          </div>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="text-gray-600 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tanggal Mulai</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                className="h-9 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tanggal Akhir</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                className="h-9 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Metode Pembayaran</label>
              <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1) }}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="CASH">CASH</SelectItem>
                  <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                  <SelectItem value="QRIS">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cari No. Transaksi</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder="TRX-..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                  className="h-9 pl-8 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-28 ml-auto" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : displayedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tidak ada transaksi ditemukan</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Coba ubah filter atau tanggal pencarian
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">No. Transaksi</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Kasir</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Metode</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Total</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center w-28">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="table-row-hover">
                    {displayedTransactions.map((tx, idx) => {
                      const badge = paymentBadge[tx.paymentMethod]
                      return (
                        <motion.tr
                          key={tx.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: idx * 0.03 }}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <TableCell className="py-3">
                            <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                              {tx.transactionNumber}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(tx.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 hidden md:table-cell">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {tx.user?.name || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className={badge.className}>
                                {badge.label}
                              </Badge>
                              {tx.taxEnabled && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/30 text-[10px] px-1.5 py-0">
                                  PPN
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatRupiah(tx.totalAmount)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                                onClick={() => handleViewDetail(tx.id)}
                                title="Lihat Detail"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer"
                                onClick={() => handleReorder(tx)}
                                disabled={reorderLoading}
                                title="Pesan Ulang"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Menampilkan {displayedTransactions.length} dari {totalFiltered} transaksi
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="ml-2 cursor-pointer dark:text-gray-300 dark:hover:text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 p-0 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`h-8 w-8 p-0 text-xs cursor-pointer ${
                          page === pageNum
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : ''
                        }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 p-0 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) setDetailOpen(false) }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>
              {detailData
                ? `Transaksi ${detailData.transactionNumber}`
                : 'Memuat data transaksi...'}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
              <Skeleton className="h-24 w-full" />
            </div>
          ) : detailData ? (
            <div className="space-y-5">
              {/* Transaction Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">No. Transaksi</p>
                  <p className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {detailData.transactionNumber}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(detailData.createdAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kasir</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {detailData.user?.name || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Metode Pembayaran</p>
                  <Badge
                    variant="secondary"
                    className={paymentBadge[detailData.paymentMethod].className}
                  >
                    {paymentBadge[detailData.paymentMethod].label}
                  </Badge>
                </div>
              </div>

              {/* Amounts */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatRupiah(detailData.subtotalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Diskon</span>
                  <span className="font-medium text-red-600">
                    -{formatRupiah(detailData.discountAmount)}
                  </span>
                </div>
                {detailData.taxEnabled && (detailData.taxAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">PPN ({detailData.taxPercent || 11}%)</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      +{formatRupiah(detailData.taxAmount!)}
                    </span>
                  </div>
                )}
                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-2 flex justify-between text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Total</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {formatRupiah(detailData.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Bayar</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatRupiah(detailData.paymentAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Kembalian</span>
                  <span className="font-medium text-emerald-600">
                    {formatRupiah(detailData.changeAmount)}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Item Transaksi</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/30 cursor-pointer"
                    onClick={() => handleReorder(detailData)}
                    disabled={reorderLoading}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Pesan Ulang
                  </Button>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                        <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400">Produk</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center">Qty</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Harga</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="table-row-hover">
                      {detailData.transactionItems && detailData.transactionItems.length > 0 ? (
                        detailData.transactionItems.map((item: TransactionItem) => (
                          <TableRow key={item.id}>
                            <TableCell className="py-2 text-sm text-gray-900 dark:text-gray-100">
                              {item.productName}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-center text-gray-600 dark:text-gray-400">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-right text-gray-600 dark:text-gray-400">
                              {formatRupiah(item.price)}
                            </TableCell>
                            <TableCell className="py-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                              {formatRupiah(item.subtotal)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-6 text-center text-sm text-gray-400 dark:text-gray-500"
                          >
                            Tidak ada item
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {detailData.note && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Catatan</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{detailData.note}</p>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailOpen(false)}
              className="cursor-pointer"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder Confirmation AlertDialog */}
      <AlertDialog open={reorderDialogOpen} onOpenChange={setReorderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              Keranjang Tidak Kosong
            </AlertDialogTitle>
            <AlertDialogDescription>
              Keranjang Anda sudah berisi {cart.length} item. Apakah Anda ingin mengosongkan keranjang terlebih dahulu atau menambahkan item dari transaksi <strong>{reorderTransaction?.transactionNumber}</strong> ke keranjang yang ada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 flex-col sm:flex-row">
            <AlertDialogCancel className="dark:border-gray-600 dark:text-gray-300 cursor-pointer">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reorderTransaction && executeReorder(reorderTransaction, false)}
              disabled={reorderLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              {reorderLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Tambahkan
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => reorderTransaction && executeReorder(reorderTransaction, true)}
              disabled={reorderLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {reorderLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Kosongkan & Tambahkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
