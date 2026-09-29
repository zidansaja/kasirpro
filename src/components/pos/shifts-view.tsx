'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Play,
  Square,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TrendingUp,
  Banknote,
  AlertCircle,
  Timer,
  Filter,
  Calendar,
  Receipt,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Printer,
  Package,
  RotateCcw,
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
import { formatRupiah, formatDateTime, formatDate } from '@/lib/utils'
import EmptyState from '@/components/pos/empty-state'

type ShiftStatus = 'OPEN' | 'CLOSED'

interface ShiftUser {
  id: string
  name: string
}

interface ShiftItem {
  id: string
  userId: string
  openedAt: string
  closedAt?: string | null
  startCash: number
  endCash?: number | null
  expectedCash?: number | null
  difference?: number | null
  status: ShiftStatus
  note?: string | null
  createdAt: string
  updatedAt: string
  user?: ShiftUser
  transactions?: {
    id: string
    transactionNumber: string
    totalAmount: number
    paymentMethod: string
    createdAt: string
  }[]
}

interface ShiftSummary {
  shift: {
    id: string
    status: string
    openedAt: string
    closedAt?: string | null
    startCash: number
    endCash?: number | null
    expectedCash?: number | null
    difference?: number | null
    note?: string | null
    user?: ShiftUser
  }
  transactions: {
    total: number
    cash: number
    transfer: number
    qris: number
  }
  revenue: {
    total: number
    cash: number
    transfer: number
    qris: number
    discount: number
    tax: number
  }
  returns: {
    total: number
    cashRefund: number
  }
  expenses: {
    total: number
    amount: number
  }
  expectedCash: number
  difference: number | null
  topProducts: {
    productId: string
    name: string
    quantity: number
    revenue: number
  }[]
  recentTransactions: {
    id: string
    transactionNumber: string
    totalAmount: number
    paymentMethod: string
    createdAt: string
  }[]
}

interface ShiftsResponse {
  success: boolean
  shifts: ShiftItem[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Format shift duration with live updating
function formatShiftDuration(openedAt: string, closedAt?: string | null): string {
  try {
    const start = new Date(openedAt).getTime()
    const end = closedAt ? new Date(closedAt).getTime() : Date.now()
    const diffMs = end - start
    if (diffMs < 0) return '0j 0m'
    const totalMinutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      const remainHours = hours % 24
      return `${days}h ${remainHours}j ${minutes}m`
    }
    return `${hours}j ${minutes}m`
  } catch {
    return '-'
  }
}

// Cash difference visualization bar
function CashDifferenceBar({ expected, actual, difference }: { expected: number; actual: number; difference: number }) {
  if (difference == null) return null
  const max = Math.max(Math.abs(expected), Math.abs(actual))
  if (max === 0) return null
  const expectedWidth = Math.max(5, (Math.abs(expected) / max) * 100)
  const actualWidth = Math.max(5, (Math.abs(actual) / max) * 100)
  const isPositive = difference >= 0

  return (
    <div className="mt-1.5 w-full max-w-[120px]">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gray-400 dark:bg-gray-500 rounded-full" style={{ width: `${expectedWidth}%` }} />
          </div>
          <span className="text-[10px] text-gray-400 w-4">E</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${actualWidth}%` }} />
          </div>
          <span className={`text-[10px] w-4 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>A</span>
        </div>
      </div>
    </div>
  )
}

// Live timer component
function LiveTimer({ openedAt }: { openedAt: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])
  // Use `now` to trigger re-render
  const _ = now
  return <span>{formatShiftDuration(openedAt)}</span>
}

// Payment method badge
function PaymentBadge({ method }: { method: string }) {
  const config: Record<string, { label: string; className: string }> = {
    CASH: { label: 'Tunai', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    TRANSFER: { label: 'Transfer', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    QRIS: { label: 'QRIS', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  }
  const c = config[method] || { label: method, className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' }
  return <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${c.className}`}>{c.label}</Badge>
}

export default function ShiftsView() {
  const user = useAppStore((s) => s.user)

  // Current shift
  const [currentShift, setCurrentShift] = useState<ShiftItem | null>(null)
  const [currentLoading, setCurrentLoading] = useState(true)

  // Running stats for open shift (from API)
  const [shiftTxCount, setShiftTxCount] = useState(0)
  const [shiftCashRevenue, setShiftCashRevenue] = useState(0)
  const [shiftTotalRevenue, setShiftTotalRevenue] = useState(0)

  // History
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<string>('')

  // Open shift dialog
  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [startCashInput, setStartCashInput] = useState('')
  const [openNote, setOpenNote] = useState('')
  const [opening, setOpening] = useState(false)

  // Close shift dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [endCashInput, setEndCashInput] = useState('')
  const [closeNote, setCloseNote] = useState('')
  const [closing, setClosing] = useState(false)
  const [closeSummary, setCloseSummary] = useState<ShiftSummary | null>(null)

  // Detail dialog
  const [detailShift, setDetailShift] = useState<ShiftItem | null>(null)
  const [detailSummary, setDetailSummary] = useState<ShiftSummary | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Refresh timer ref
  const refreshRef = useRef<NodeJS.Timeout | null>(null)

  const fetchCurrentShift = useCallback(async () => {
    try {
      const res = await fetch(`/api/shifts/current?userId=${user?.id}`)
      const data = await res.json()
      if (data.success) {
        setCurrentShift(data.shift || null)
        if (data.stats) {
          setShiftTxCount(data.stats.transactionCount || 0)
          setShiftCashRevenue(data.stats.cashRevenue || 0)
          setShiftTotalRevenue(data.stats.totalRevenue || 0)
        }
      }
    } catch {
      // Silently ignore
    } finally {
      setCurrentLoading(false)
    }
  }, [user?.id])

  const fetchHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      })
      if (statusFilter && statusFilter !== 'ALL') {
        params.set('status', statusFilter)
      }
      if (dateFilter) {
        params.set('date', dateFilter)
      }
      const res = await fetch(`/api/shifts?${params.toString()}`)
      const data: ShiftsResponse = await res.json()
      if (data.success) {
        setShifts(data.shifts)
        if (data.pagination) {
          setTotal(data.pagination.total)
          setTotalPages(data.pagination.totalPages)
          setCurrentPage(data.pagination.page)
        }
      }
    } catch {
      toast.error('Gagal memuat riwayat shift')
    } finally {
      setHistoryLoading(false)
    }
  }, [statusFilter, dateFilter])

  useEffect(() => {
    fetchCurrentShift()
    fetchHistory(1)
  }, [fetchCurrentShift, fetchHistory])

  // Auto-refresh current shift stats every 60s
  useEffect(() => {
    if (currentShift) {
      refreshRef.current = setInterval(() => {
        fetchCurrentShift()
      }, 60000)
    }
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [currentShift, fetchCurrentShift])

  const handleOpenShift = () => {
    setStartCashInput('')
    setOpenNote('')
    setOpenDialogOpen(true)
  }

  const handleSubmitOpen = async () => {
    if (startCashInput === '' || Number(startCashInput) < 0) {
      toast.error('Kas awal harus diisi dengan benar')
      return
    }
    setOpening(true)
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userRole: user?.role,
          startCash: Number(startCashInput),
          note: openNote || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Shift berhasil dibuka')
        setOpenDialogOpen(false)
        fetchCurrentShift()
        fetchHistory(1)
      } else {
        toast.error(data.message || 'Gagal membuka shift')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setOpening(false)
    }
  }

  const handleCloseShift = async () => {
    if (!currentShift) return
    setEndCashInput('')
    setCloseNote(currentShift.note || '')
    // Fetch real summary from API
    try {
      const res = await fetch(`/api/shifts/${currentShift.id}/summary`)
      const data = await res.json()
      if (data.success) {
        setCloseSummary(data.summary)
      } else {
        setCloseSummary(null)
      }
    } catch {
      setCloseSummary(null)
    }
    setCloseDialogOpen(true)
  }

  const handleSubmitClose = async () => {
    if (!currentShift) return
    if (endCashInput === '' || Number(endCashInput) < 0) {
      toast.error('Kas akhir harus diisi dengan benar')
      return
    }
    setClosing(true)
    try {
      const res = await fetch(`/api/shifts/${currentShift.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endCash: Number(endCashInput),
          note: closeNote || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Shift berhasil ditutup')
        setCloseDialogOpen(false)
        setCurrentShift(null)
        setShiftTxCount(0)
        setShiftCashRevenue(0)
        setShiftTotalRevenue(0)
        fetchCurrentShift()
        fetchHistory(1)
      } else {
        toast.error(data.message || 'Gagal menutup shift')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setClosing(false)
    }
  }

  const handleViewDetail = async (shift: ShiftItem) => {
    setDetailShift(shift)
    setDetailSummary(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/shifts/${shift.id}/summary`)
      const data = await res.json()
      if (data.success) {
        setDetailSummary(data.summary)
      }
    } catch {
      toast.error('Gagal memuat detail shift')
    } finally {
      setDetailLoading(false)
    }
  }

  // Computed values for close dialog
  const closeExpectedCash = closeSummary?.expectedCash ?? (currentShift ? currentShift.startCash + shiftCashRevenue : 0)
  const closeTotalCashReturns = closeSummary?.returns?.cashRefund ?? 0
  const closeTotalExpenses = closeSummary?.expenses?.amount ?? 0
  const calcDifference = endCashInput !== '' ? Number(endCashInput) - closeExpectedCash : 0

  const handlePrintShiftSummary = (summary: ShiftSummary) => {
    const s = summary.shift
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return
    w.document.write(`
      <html><head><title>Ringkasan Shift</title>
      <style>
        body { font-family: monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
        h2 { text-align: center; margin: 0 0 8px; font-size: 14px; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .bold { font-weight: bold; }
        .center { text-align: center; }
      </style></head><body>
      <h2>RINGKASAN SHIFT</h2>
      <div class="line"></div>
      <div class="row"><span>Kasir:</span><span class="bold">${s.user?.name || '-'}</span></div>
      <div class="row"><span>Buka:</span><span>${formatDateTime(s.openedAt)}</span></div>
      <div class="row"><span>Tutup:</span><span>${s.closedAt ? formatDateTime(s.closedAt) : '-'}</span></div>
      <div class="row"><span>Durasi:</span><span>${formatShiftDuration(s.openedAt, s.closedAt)}</span></div>
      <div class="line"></div>
      <div class="row"><span>Kas Awal:</span><span>${formatRupiah(s.startCash)}</span></div>
      <div class="row"><span>Penjualan Tunai:</span><span>+${formatRupiah(summary.revenue.cash)}</span></div>
      <div class="row"><span>Retur Tunai:</span><span>-${formatRupiah(summary.returns.cashRefund)}</span></div>
      <div class="row"><span>Pengeluaran:</span><span>-${formatRupiah(summary.expenses.amount)}</span></div>
      <div class="line"></div>
      <div class="row"><span class="bold">Kas Diharapkan:</span><span class="bold">${formatRupiah(summary.expectedCash)}</span></div>
      <div class="row"><span class="bold">Kas Aktual:</span><span class="bold">${s.endCash != null ? formatRupiah(s.endCash) : '-'}</span></div>
      <div class="row"><span class="bold">Selisih:</span><span class="bold">${summary.difference != null ? (summary.difference >= 0 ? '+' : '') + formatRupiah(summary.difference) : '-'}</span></div>
      <div class="line"></div>
      <div class="row"><span>Total Transaksi:</span><span>${summary.transactions.total}</span></div>
      <div class="row"><span>Total Pendapatan:</span><span>${formatRupiah(summary.revenue.total)}</span></div>
      <div class="line"></div>
      <div class="center" style="margin-top:10px;font-size:10px;">Dicetak: ${formatDateTime(new Date().toISOString())}</div>
      </body></html>
    `)
    w.document.close()
    w.focus()
    w.print()
  }

  if (currentLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Clock className="w-5 h-5 text-violet-700 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manajemen Shift</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola shift kasir dan rekonsiliasi kas</p>
        </div>
      </div>

      {/* Current Shift Status Card */}
      {currentShift ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl shadow-lg"
        >
          {/* Solid gradient background - always visible */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 dark:from-emerald-700 dark:via-emerald-800 dark:to-teal-800 rounded-2xl" />
          {/* Decorative background elements */}
          <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/30 animate-pulse pointer-events-none" />
          <div className="absolute -top-2 -right-2 opacity-10 pointer-events-none">
            <Clock className="w-20 h-20 text-emerald-300" />
          </div>
          <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-emerald-500/10 pointer-events-none" />
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-emerald-400/5 pointer-events-none" />

          <div className="relative z-10 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">Shift Aktif</h3>
                  <Badge className="bg-emerald-500/30 text-emerald-100 hover:bg-emerald-500/30 border-0 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
                    </span>
                    OPEN
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-emerald-200/90">
                  <span>Dibuka: {formatDateTime(currentShift.openedAt)}</span>
                  <span className="flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    Durasi: <LiveTimer openedAt={currentShift.openedAt} />
                  </span>
                  <span>Kasir: {currentShift.user?.name || '-'}</span>
                </div>
              </div>
              <Button
                onClick={handleCloseShift}
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 cursor-pointer backdrop-blur-sm"
              >
                <Square className="w-4 h-4 mr-2" />
                Tutup Shift
              </Button>
            </div>

            {/* Running Totals */}
            <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-emerald-300/70 font-medium">Total Transaksi</p>
                <p className="text-xl font-bold mt-0.5 text-white">{shiftTxCount}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-300/70 font-medium flex items-center gap-1">
                  <Banknote className="w-3 h-3" /> Penjualan Tunai
                </p>
                <p className="text-xl font-bold mt-0.5 text-white">{formatRupiah(shiftCashRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-300/70 font-medium">Kas Awal</p>
                <p className="text-xl font-bold mt-0.5 text-white">{formatRupiah(currentShift.startCash)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-300/70 font-medium">Total Pendapatan</p>
                <p className="text-xl font-bold mt-0.5 text-white">{formatRupiah(shiftTotalRevenue)}</p>
              </div>
            </div>

            {/* Quick bottom row */}
            <div className="mt-3 pt-3 border-t border-white/15 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-emerald-200/80">
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Estimasi Kas: {formatRupiah(currentShift.startCash + shiftCashRevenue)}
              </span>
              {shiftTotalRevenue > shiftCashRevenue && (
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  Non-Tunai: {formatRupiah(shiftTotalRevenue - shiftCashRevenue)}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-8 flex flex-col items-center justify-center gap-4"
        >
          <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Clock className="w-7 h-7 text-violet-500 dark:text-violet-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Belum Ada Shift Aktif</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Buka shift baru untuk mulai mencatat transaksi harian Anda.
            </p>
          </div>
          <Button
            onClick={handleOpenShift}
            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white cursor-pointer shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
          >
            <Play className="w-4 h-4 mr-2" />
            Buka Shift
          </Button>
        </motion.div>
      )}

      {/* Shift History */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Riwayat Shift</h3>
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <Filter className="w-3.5 h-3.5 mr-1 text-gray-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem value="OPEN">Aktif</SelectItem>
                <SelectItem value="CLOSED">Ditutup</SelectItem>
              </SelectContent>
            </Select>
            {/* Date Filter */}
            <div className="relative">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="h-9 text-xs w-[140px] pr-8"
              />
              {dateFilter && (
                <button
                  onClick={() => { setDateFilter(''); setCurrentPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {historyLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700">
            <CardContent className="p-0">
              <EmptyState
                icon={Clock}
                title="Belum Ada Riwayat Shift"
                description="Riwayat shift yang sudah ditutup akan muncul di sini."
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700">
            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-100 dark:border-gray-700">
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Kasir</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Mulai</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tutup</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Durasi</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Kas Awal</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Kas Akhir</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Diharapkan</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Selisih</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow
                        key={shift.id}
                        className="table-row-hover border-b border-gray-50 dark:border-gray-700/50 cursor-pointer"
                        onClick={() => handleViewDetail(shift)}
                      >
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {formatDateTime(shift.openedAt, 'dd MMM yyyy')}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {shift.user?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDateTime(shift.openedAt, 'HH:mm')}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {shift.closedAt ? formatDateTime(shift.closedAt, 'HH:mm') : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {formatShiftDuration(shift.openedAt, shift.closedAt)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {formatRupiah(shift.startCash)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {shift.endCash != null ? formatRupiah(shift.endCash) : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {shift.expectedCash != null ? formatRupiah(shift.expectedCash) : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex flex-col items-end">
                            {shift.difference != null ? (
                              <span className={`text-sm font-semibold ${shift.difference >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {shift.difference >= 0 ? '+' : ''}{formatRupiah(shift.difference)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                            {shift.difference != null && shift.expectedCash != null && shift.endCash != null && (
                              <CashDifferenceBar
                                expected={shift.expectedCash}
                                actual={shift.endCash!}
                                difference={shift.difference}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="secondary"
                            className={shift.status === 'OPEN'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
                            }
                          >
                            {shift.status === 'OPEN' ? 'Aktif' : 'Ditutup'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:text-violet-400 dark:hover:bg-violet-950 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDetail(shift)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile & Tablet Card List */}
              <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                {shifts.map((shift) => (
                  <motion.div
                    key={shift.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => handleViewDetail(shift)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={shift.status === 'OPEN'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
                            }
                          >
                            {shift.status === 'OPEN' ? 'Aktif' : 'Ditutup'}
                          </Badge>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDateTime(shift.openedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {shift.user?.name || '-'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <Timer className="w-3 h-3" />
                            {formatShiftDuration(shift.openedAt, shift.closedAt)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Awal: {formatRupiah(shift.startCash)}
                          </span>
                          {shift.endCash != null && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Akhir: {formatRupiah(shift.endCash)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {shift.difference != null ? (
                          <span className={`text-xs font-semibold ${shift.difference >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {shift.difference >= 0 ? '+' : ''}{formatRupiah(shift.difference)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                        <Eye className="w-4 h-4 text-gray-300 dark:text-gray-600" />
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
                      onClick={() => fetchHistory(currentPage - 1)}
                      className="cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => fetchHistory(currentPage + 1)}
                      className="cursor-pointer"
                    >
                      Selanjutnya
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Open Shift Dialog */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Buka Shift Baru
            </DialogTitle>
            <DialogDescription>
              Masukkan jumlah kas awal untuk memulai shift kerja Anda hari ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="startCash">Kas Awal (Rp)</Label>
              <Input
                id="startCash"
                type="number"
                placeholder="Contoh: 500000"
                value={startCashInput}
                onChange={(e) => setStartCashInput(e.target.value)}
                min="0"
                autoFocus
                className="text-lg font-semibold"
              />
              {startCashInput && Number(startCashInput) > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Kas awal: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatRupiah(Number(startCashInput))}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="openNote">Catatan (Opsional)</Label>
              <Textarea
                id="openNote"
                placeholder="Catatan opsional..."
                value={openNote}
                onChange={(e) => setOpenNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDialogOpen(false)}
              disabled={opening}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmitOpen}
              disabled={opening || startCashInput === '' || Number(startCashInput) < 0}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white cursor-pointer"
            >
              {opening && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Play className="w-4 h-4 mr-2" />
              Buka Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Square className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              Tutup Shift
            </DialogTitle>
            <DialogDescription>
              Periksa rekonsiliasi kas sebelum menutup shift.
            </DialogDescription>
          </DialogHeader>

          {/* Summary from API */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Ringkasan Kas
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Kas Awal</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{formatRupiah(currentShift?.startCash ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  Penjualan Tunai
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">+{formatRupiah(closeSummary?.revenue?.cash ?? shiftCashRevenue)}</span>
              </div>
              {closeTotalCashReturns > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-red-500" />
                    Retur Tunai
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">-{formatRupiah(closeTotalCashReturns)}</span>
                </div>
              )}
              {closeTotalExpenses > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3 text-amber-500" />
                    Pengeluaran
                  </span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">-{formatRupiah(closeTotalExpenses)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Kas Diharapkan</span>
                <span className="font-bold text-gray-900 dark:text-gray-100 text-base">{formatRupiah(closeExpectedCash)}</span>
              </div>
            </div>
            {/* Transaction counts */}
            {closeSummary && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Banknote className="w-3 h-3 mr-1" />
                  {closeSummary.transactions.cash} Tunai
                </Badge>
                <Badge variant="secondary" className="text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                  <CreditCard className="w-3 h-3 mr-1" />
                  {closeSummary.transactions.transfer} Transfer
                </Badge>
                <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                  <Wallet className="w-3 h-3 mr-1" />
                  {closeSummary.transactions.qris} QRIS
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="endCash">Kas Akhir / Aktual (Rp)</Label>
              <Input
                id="endCash"
                type="number"
                placeholder="Masukkan jumlah kas di laci"
                value={endCashInput}
                onChange={(e) => setEndCashInput(e.target.value)}
                min="0"
                autoFocus
                className="text-lg font-semibold"
              />
            </div>

            {endCashInput !== '' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  calcDifference === 0
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : calcDifference > 0
                      ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <AlertCircle className={`w-4 h-4 shrink-0 ${
                  calcDifference === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : calcDifference > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                }`} />
                <span className={`text-sm font-medium ${
                  calcDifference === 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : calcDifference > 0
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-red-700 dark:text-red-300'
                }`}>
                  Selisih: {calcDifference >= 0 ? '+' : ''}{formatRupiah(calcDifference)}
                  {calcDifference === 0 && ' — Kas sesuai! ✓'}
                  {calcDifference > 0 && ' — Kas lebih (surplus)'}
                  {calcDifference < 0 && ' — Kas kurang (defisit)'}
                </span>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="closeNote">Catatan Penutupan (Opsional)</Label>
              <Textarea
                id="closeNote"
                placeholder="Catatan penutupan shift..."
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(false)}
              disabled={closing}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmitClose}
              disabled={closing || endCashInput === '' || Number(endCashInput) < 0}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {closing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Square className="w-4 h-4 mr-2" />
              Tutup Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Shift Dialog */}
      <Dialog open={!!detailShift} onOpenChange={(open) => { if (!open) { setDetailShift(null); setDetailSummary(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Eye className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              Detail Shift
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap mengenai shift kerja.
            </DialogDescription>
          </DialogHeader>
          {detailShift && (
            <div className="space-y-4">
              {/* Status & Cashier */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={detailShift.status === 'OPEN'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
                    }
                  >
                    {detailShift.status === 'OPEN' ? 'Aktif' : 'Ditutup'}
                  </Badge>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Kasir: <span className="font-medium text-gray-700 dark:text-gray-300">{detailShift.user?.name || '-'}</span>
                  </span>
                </div>
                {detailSummary && detailShift.status === 'CLOSED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintShiftSummary(detailSummary!)}
                    className="cursor-pointer text-xs"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Cetak
                  </Button>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Waktu Buka</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                    {formatDateTime(detailShift.openedAt)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Waktu Tutup</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                    {detailShift.closedAt ? formatDateTime(detailShift.closedAt) : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Durasi</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-gray-400" />
                    {detailShift.status === 'OPEN' ? <LiveTimer openedAt={detailShift.openedAt} /> : formatShiftDuration(detailShift.openedAt, detailShift.closedAt)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kas Awal</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                    {formatRupiah(detailShift.startCash)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kas Akhir (Aktual)</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                    {detailShift.endCash != null ? formatRupiah(detailShift.endCash) : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kas Diharapkan</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                    {detailShift.expectedCash != null ? formatRupiah(detailShift.expectedCash) : '-'}
                  </p>
                </div>
              </div>

              {/* Difference with bar */}
              {detailShift.difference != null && (
                <div className={`rounded-xl p-4 ${
                  detailShift.difference === 0
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : detailShift.difference > 0
                      ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Selisih Kas</p>
                      <p className={`text-lg font-bold mt-0.5 ${
                        detailShift.difference >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {detailShift.difference >= 0 ? '+' : ''}{formatRupiah(detailShift.difference)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {detailShift.difference === 0 ? 'Kas sesuai!' : detailShift.difference > 0 ? 'Kas lebih (surplus)' : 'Kas kurang (defisit)'}
                      </p>
                    </div>
                    {detailShift.expectedCash != null && detailShift.endCash != null && (
                      <CashDifferenceBar
                        expected={detailShift.expectedCash}
                        actual={detailShift.endCash!}
                        difference={detailShift.difference}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Summary from API */}
              {detailLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : detailSummary ? (
                <div className="space-y-3">
                  {/* Transaction Stats */}
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Statistik Transaksi
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{detailSummary.transactions.total}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Transaksi</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(detailSummary.revenue.cash)}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-center gap-1">
                        <Banknote className="w-3 h-3" /> Tunai
                      </p>
                    </div>
                    <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{formatRupiah(detailSummary.revenue.transfer)}</p>
                      <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 flex items-center justify-center gap-1">
                        <CreditCard className="w-3 h-3" /> Transfer
                      </p>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{formatRupiah(detailSummary.revenue.qris)}</p>
                      <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 flex items-center justify-center gap-1">
                        <Wallet className="w-3 h-3" /> QRIS
                      </p>
                    </div>
                  </div>

                  {/* Revenue Breakdown */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                    <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rincian Pendapatan</h5>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Total Pendapatan</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{formatRupiah(detailSummary.revenue.total)}</span>
                      </div>
                      {detailSummary.revenue.discount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Total Diskon</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400">-{formatRupiah(detailSummary.revenue.discount)}</span>
                        </div>
                      )}
                      {detailSummary.revenue.tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Total Pajak</span>
                          <span className="font-medium text-gray-600 dark:text-gray-400">{formatRupiah(detailSummary.revenue.tax)}</span>
                        </div>
                      )}
                      {detailSummary.returns.total > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Retur ({detailSummary.returns.total})
                          </span>
                          <span className="font-medium text-red-600 dark:text-red-400">-{formatRupiah(detailSummary.returns.cashRefund)}</span>
                        </div>
                      )}
                      {detailSummary.expenses.total > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3" /> Pengeluaran ({detailSummary.expenses.total})
                          </span>
                          <span className="font-medium text-amber-600 dark:text-amber-400">-{formatRupiah(detailSummary.expenses.amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Products */}
                  {detailSummary.topProducts.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Produk Terlaris
                      </h5>
                      <div className="space-y-1.5">
                        {detailSummary.topProducts.slice(0, 5).map((p, i) => (
                          <div key={p.productId} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                            <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{p.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{p.quantity}x</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatRupiah(p.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Transactions */}
                  {detailSummary.recentTransactions.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        Transaksi Terakhir
                      </h5>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {detailSummary.recentTransactions.map((tx) => (
                          <div key={tx.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{tx.transactionNumber}</span>
                            <PaymentBadge method={tx.paymentMethod} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-auto">{formatRupiah(tx.totalAmount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {detailShift.note && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Catatan</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{detailShift.note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
