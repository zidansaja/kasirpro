'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Calculator,
  BarChart3,
  Eye,
  Download,
  CalendarDays,
  PieChart as PieChartIcon,
  Trophy,
  Wallet,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  Inbox,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import type { DailyReport, MonthlyReport, YearlyReport, Transaction, TransactionItem } from '@/lib/types'

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const Y_AXIS_FORMAT = (v: number) => {
  if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}M`
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}jt`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`
  return String(v)
}

const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
  const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const today = format(new Date(), 'yyyy-MM-dd')
const currentMonth = String(new Date().getMonth() + 1)
const currentYear = String(new Date().getFullYear())

// Custom chart tooltip component with emerald accent
function CustomChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; name?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-lg px-4 py-3 min-w-[140px]">
      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">{entry.name || 'Pendapatan'}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatRupiah(entry.value)}</span>
        </div>
      ))}
      {payload.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            {payload[0].value > 0 ? '↗ Naik' : '↘ Turun'}
          </span>
        </div>
      )}
    </div>
  )
}

// Enhanced empty state with illustration
function EnhancedEmptyState({ icon, message, description }: { icon: React.ReactNode; message: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-700">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
      )}
    </div>
  )
}

// Chart card wrapper with hover effect
function ChartCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState('harian')

  const tabVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Laporan</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 dark:bg-gray-800">
          <TabsTrigger
            value="harian"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white cursor-pointer transition-all duration-200"
          >
            Harian
          </TabsTrigger>
          <TabsTrigger
            value="bulanan"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white cursor-pointer transition-all duration-200"
          >
            Bulanan
          </TabsTrigger>
          <TabsTrigger
            value="tahunan"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white cursor-pointer transition-all duration-200"
          >
            Tahunan
          </TabsTrigger>
          <TabsTrigger
            value="eod"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white cursor-pointer transition-all duration-200"
          >
            Akhir Hari
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <TabsContent value="harian" forceMount={activeTab === 'harian' ? true : undefined}>
              <DailyReportTab />
            </TabsContent>
            <TabsContent value="bulanan" forceMount={activeTab === 'bulanan' ? true : undefined}>
              <MonthlyReportTab />
            </TabsContent>
            <TabsContent value="tahunan" forceMount={activeTab === 'tahunan' ? true : undefined}>
              <YearlyReportTab />
            </TabsContent>
            <TabsContent value="eod" forceMount={activeTab === 'eod' ? true : undefined}>
              <EndOfDayTab />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}

function ReportStatCard({ label, value, icon, gradient, isRevenue }: { label: string; value: string; icon: React.ReactNode; gradient: string; isRevenue?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div
        className={`relative overflow-hidden rounded-2xl shadow-lg p-5 text-white transition-transform hover:scale-[1.02] hover:shadow-xl cursor-default ${isRevenue ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : ''}`}
      >
        {/* Gradient background */}
        {!isRevenue && <div className={`absolute inset-0 ${gradient}`} />}
        {isRevenue && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600" />}

        {/* Decorative icon - top right, large, semi-transparent */}
        <div className="absolute -top-2 -right-2 opacity-15 text-white pointer-events-none">
          {icon}
        </div>

        {/* Decorative circle pattern */}
        <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-2 min-h-[88px] justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{label}</p>
            <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function DailyReportTab() {
  const [date, setDate] = useState(today)
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTx, setDetailTx] = useState<Transaction | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=daily&date=${date}`)
      const data = await res.json()
      if (data.success) setReport(data.report)
    } catch {
      toast.error('Gagal memuat laporan harian')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { fetchReport() }, [fetchReport])

  const avgPerTx = report && report.transactionCount > 0
    ? report.totalRevenue / report.transactionCount
    : 0

  const statCards = [
    { label: 'Total Pendapatan', value: report ? formatRupiah(report.totalRevenue) : '-', icon: <DollarSign className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600', isRevenue: true },
    { label: 'Total Profit', value: report ? formatRupiah(report.totalProfit) : '-', icon: <TrendingUp className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-blue-500 to-blue-600', isRevenue: false },
    { label: 'Jumlah Transaksi', value: report ? String(report.transactionCount) : '-', icon: <ShoppingCart className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-amber-500 to-orange-500', isRevenue: false },
    { label: 'Rata-rata per Transaksi', value: report ? formatRupiah(avgPerTx) : '-', icon: <Calculator className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-violet-500 to-purple-600', isRevenue: false },
  ]

  const handleExportCSV = () => {
    if (!report?.transactions || report.transactions.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }
    setExportLoading(true)
    setTimeout(() => {
      const headers = ['No. Transaksi', 'Waktu', 'Kasir', 'Metode', 'Total']
      const rows = report.transactions.map((tx) => [
        tx.transactionNumber,
        format(parseISO(tx.createdAt), 'dd/MM/yyyy HH:mm'),
        tx.user?.name || '-',
        tx.paymentMethod,
        formatRupiah(tx.totalAmount),
      ])
      downloadCSV(`laporan-harian-${date}.csv`, headers, rows)
      toast.success('File CSV berhasil diunduh')
      setExportLoading(false)
      setExportOpen(false)
    }, 500)
  }

  const handlePrint = () => {
    setExportOpen(false)
    window.print()
  }

  const handleOpenTxDetail = async (txId: string) => {
    setDetailOpen(true)
    try {
      const res = await fetch(`/api/transactions/${txId}`)
      const data = await res.json()
      if (data.success) setDetailTx(data.transaction)
    } catch {
      toast.error('Gagal memuat detail transaksi')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3 items-center">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl shadow-lg p-5 bg-gray-100 dark:bg-gray-800/50 animate-pulse">
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Label className="font-medium text-gray-700 dark:text-gray-300">Tanggal:</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
        />
        <DropdownMenu open={exportOpen} onOpenChange={setExportOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto cursor-pointer" disabled={exportLoading}>
              {exportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <ReportStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            gradient={card.gradient}
            isRevenue={card.isRevenue}
          />
        ))}
      </div>

      <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                  <TableHead className="text-xs font-semibold">No. Transaksi</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">Waktu</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Kasir</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Metode Pembayaran</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                  <TableHead className="text-xs font-semibold w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!report?.transactions || report.transactions.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EnhancedEmptyState
                        icon={<BarChart3 className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
                        message="Tidak ada transaksi pada tanggal ini"
                        description="Coba pilih tanggal lain atau buat transaksi baru"
                      />
                    </TableCell>
                  </TableRow>
                ) : report.transactions.map((tx: Transaction, idx: number) => (
                  <TableRow key={tx.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${idx % 2 === 1 ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''}`}>
                    <TableCell className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">{tx.transactionNumber}</TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">{format(parseISO(tx.createdAt), 'HH:mm')}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">{tx.user?.name || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className={`text-xs ${tx.paymentMethod === 'CASH' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400' : tx.paymentMethod === 'TRANSFER' ? 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400' : 'border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400'}`}>{tx.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">{formatRupiah(tx.totalAmount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => handleOpenTxDetail(tx.id)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>{detailTx && <span className="font-mono font-semibold">{detailTx.transactionNumber}</span>}</DialogDescription>
          </DialogHeader>
          {detailTx && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500 dark:text-gray-400">Kasir:</span> <span className="font-medium">{detailTx.user?.name || '-'}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">Waktu:</span> <span className="font-medium">{format(parseISO(detailTx.createdAt), 'dd/MM/yyyy HH:mm')}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">Metode:</span> <Badge variant="outline" className="text-xs">{detailTx.paymentMethod}</Badge></div>
                <div><span className="text-gray-500 dark:text-gray-400">Total:</span> <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatRupiah(detailTx.totalAmount)}</span></div>
              </div>
              {detailTx.transactionItems && detailTx.transactionItems.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                        <TableHead className="text-xs font-semibold">Produk</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Harga</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailTx.transactionItems.map((item: TransactionItem) => (
                        <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                          <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                          <TableCell className="text-sm text-right">{formatRupiah(item.price)}</TableCell>
                          <TableCell className="text-sm font-semibold text-right">{formatRupiah(item.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MonthlyReportTab() {
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(currentYear)
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=monthly&month=${month}&year=${year}`)
      const data = await res.json()
      if (data.success) setReport(data.report)
    } catch {
      toast.error('Gagal memuat laporan bulanan')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchReport() }, [fetchReport])

  const chartData = report?.dailyBreakdown.map((d) => ({
    name: format(parseISO(d.date), 'dd MMM'),
    revenue: d.revenue,
    count: d.count,
  })) ?? []

  const statCards = [
    { label: 'Total Pendapatan Bulan Ini', value: report ? formatRupiah(report.totalRevenue) : '-', icon: <DollarSign className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600', isRevenue: true },
    { label: 'Total Profit', value: report ? formatRupiah(report.totalProfit) : '-', icon: <TrendingUp className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-blue-500 to-blue-600', isRevenue: false },
    { label: 'Jumlah Transaksi', value: report ? String(report.transactionCount) : '-', icon: <ShoppingCart className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-amber-500 to-orange-500', isRevenue: false },
  ]

  const handleExportCSV = () => {
    if (!report?.dailyBreakdown || report.dailyBreakdown.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }
    setExportLoading(true)
    setTimeout(() => {
      const headers = ['Tanggal', 'Pendapatan', 'Jumlah Transaksi']
      const rows = report.dailyBreakdown.map((d) => [
        format(parseISO(d.date), 'dd/MM/yyyy'),
        formatRupiah(d.revenue),
        String(d.count),
      ])
      downloadCSV(`laporan-bulanan-${String(month).padStart(2, '0')}-${year}.csv`, headers, rows)
      toast.success('File CSV berhasil diunduh')
      setExportLoading(false)
      setExportOpen(false)
    }, 500)
  }

  const handlePrint = () => {
    setExportOpen(false)
    window.print()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3 items-center">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36 ml-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl shadow-lg p-5 bg-gray-100 dark:bg-gray-800/50 animate-pulse">
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Label className="font-medium text-gray-700 dark:text-gray-300">Bulan:</Label>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="font-medium text-gray-700 dark:text-gray-300">Tahun:</Label>
        <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" min={2000} max={2100} />
        <DropdownMenu open={exportOpen} onOpenChange={setExportOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto cursor-pointer" disabled={exportLoading}>
              {exportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <ReportStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            gradient={card.gradient}
            isRevenue={card.isRevenue}
          />
        ))}
      </div>

      <ChartCard>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Pendapatan Harian</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-72 [&_text]:fill-gray-500 dark:[&_text]:fill-gray-400 [&_line]:stroke-gray-200 dark:[&_line]:stroke-gray-700">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={Y_AXIS_FORMAT} />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Pendapatan" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EnhancedEmptyState
                  icon={<BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                  message="Tidak ada data untuk ditampilkan"
                  description="Pilih bulan dan tahun lain untuk melihat data"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </ChartCard>

      <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Rincian Harian</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                  <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Pendapatan</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Jumlah Transaksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!report?.dailyBreakdown || report.dailyBreakdown.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <EnhancedEmptyState
                        icon={<Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
                        message="Tidak ada data"
                        description="Belum ada transaksi pada periode ini"
                      />
                    </TableCell>
                  </TableRow>
                ) : report.dailyBreakdown.map((d, idx) => (
                  <TableRow key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${idx % 2 === 1 ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''}`}>
                    <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">{format(parseISO(d.date), 'dd MMMM yyyy')}</TableCell>
                    <TableCell className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">{formatRupiah(d.revenue)}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">{d.count} transaksi</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function YearlyReportTab() {
  const [year, setYear] = useState(currentYear)
  const [report, setReport] = useState<YearlyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=yearly&year=${year}`)
      const data = await res.json()
      if (data.success) setReport(data.report)
    } catch {
      toast.error('Gagal memuat laporan tahunan')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { fetchReport() }, [fetchReport])

  const chartData = report?.monthlyBreakdown.map((d) => ({
    name: MONTH_NAMES[d.month - 1],
    revenue: d.revenue,
    count: d.count,
  })) ?? []

  const statCards = [
    { label: 'Total Pendapatan Tahun Ini', value: report ? formatRupiah(report.totalRevenue) : '-', icon: <DollarSign className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600', isRevenue: true },
    { label: 'Total Profit', value: report ? formatRupiah(report.totalProfit) : '-', icon: <TrendingUp className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-blue-500 to-blue-600', isRevenue: false },
    { label: 'Jumlah Transaksi', value: report ? String(report.transactionCount) : '-', icon: <ShoppingCart className="w-12 h-12" />, gradient: 'bg-gradient-to-br from-amber-500 to-orange-500', isRevenue: false },
  ]

  const handleExportCSV = () => {
    if (!report?.monthlyBreakdown || report.monthlyBreakdown.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }
    setExportLoading(true)
    setTimeout(() => {
      const headers = ['Bulan', 'Pendapatan', 'Jumlah Transaksi']
      const rows = report.monthlyBreakdown.map((d) => [
        MONTH_NAMES[d.month - 1],
        formatRupiah(d.revenue),
        String(d.count),
      ])
      downloadCSV(`laporan-tahunan-${year}.csv`, headers, rows)
      toast.success('File CSV berhasil diunduh')
      setExportLoading(false)
      setExportOpen(false)
    }, 500)
  }

  const handlePrint = () => {
    setExportOpen(false)
    window.print()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3 items-center">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36 ml-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl shadow-lg p-5 bg-gray-100 dark:bg-gray-800/50 animate-pulse">
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Label className="font-medium text-gray-700 dark:text-gray-300">Tahun:</Label>
        <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" min={2000} max={2100} />
        <DropdownMenu open={exportOpen} onOpenChange={setExportOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto cursor-pointer" disabled={exportLoading}>
              {exportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <ReportStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            gradient={card.gradient}
            isRevenue={card.isRevenue}
          />
        ))}
      </div>

      <ChartCard>
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Pendapatan Bulanan</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-72 [&_text]:fill-gray-500 dark:[&_text]:fill-gray-400 [&_line]:stroke-gray-200 dark:[&_line]:stroke-gray-700">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} tickFormatter={Y_AXIS_FORMAT} />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Pendapatan" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EnhancedEmptyState
                  icon={<BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
                  message="Tidak ada data untuk ditampilkan"
                  description="Pilih tahun lain untuk melihat data"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </ChartCard>

      <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Rincian Bulanan</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Mini summary row above table */}
          {report && (
            <div className="flex gap-4 mb-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 flex-1 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Pendapatan</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate">{formatRupiah(report.totalRevenue)}</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 flex-1 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Profit</p>
                  <p className="text-sm font-bold text-violet-700 dark:text-violet-400 truncate">{formatRupiah(report.totalProfit)}</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 flex-1 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Jumlah Transaksi</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{report.transactionCount}</p>
                </div>
              </div>
            </div>
          )}
          <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                  <TableHead className="text-xs font-semibold">Bulan</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Pendapatan</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Jumlah Transaksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!report?.monthlyBreakdown || report.monthlyBreakdown.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <EnhancedEmptyState
                        icon={<Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
                        message="Tidak ada data"
                        description="Belum ada transaksi pada tahun ini"
                      />
                    </TableCell>
                  </TableRow>
                ) : report.monthlyBreakdown.map((d, idx) => (
                  <TableRow key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${idx % 2 === 1 ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''}`}>
                    <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">{MONTH_NAMES[d.month - 1]}</TableCell>
                    <TableCell className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">{formatRupiah(d.revenue)}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">{d.count} transaksi</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444']

function EndOfDayTab() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [report, setReport] = useState<{
    date: string
    totalTransactions: number
    totalRevenue: number
    totalCOGS: number
    totalProfit: number
    totalTax: number
    totalDiscount: number
    totalExpenses: number
    netProfit: number
    paymentBreakdown: Record<string, { count: number; total: number }>
    topProducts: { name: string; quantity: number; revenue: number }[]
    hourlyBreakdown: { hour: number; revenue: number; count: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/end-of-day?date=${selectedDate}`)
      const data = await res.json()
      if (data.success) setReport(data.report)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => { fetchReport() }, [fetchReport])

  const handleDownload = () => {
    if (!report) return
    const lines = [
      `=== LAPORAN AKHIR HARI ===`,
      `Tanggal: ${report.date}`,
      ``,
      `--- RINGKASAN ---`,
      `Total Transaksi      : ${report.totalTransactions}`,
      `Total Pendapatan      : ${formatRupiah(report.totalRevenue)}`,
      `Total Keuntungan     : ${formatRupiah(report.totalProfit)}`,
      `Total Pengeluaran    : ${formatRupiah(report.totalExpenses)}`,
      `Laba Bersih           : ${formatRupiah(report.netProfit)}`,
      ``,
      `--- METODE PEMBAYARAN ---`,
      ...Object.entries(report.paymentBreakdown).map(
        ([method, data]) => `${method.padEnd(15)} : ${data.count} trx | ${formatRupiah(data.total)}`
      ),
      ``,
      `--- TOP 5 PRODUK ---`,
      ...report.topProducts.map(
        (p, i) => `${i + 1}. ${p.name.padEnd(25)} | Qty: ${String(p.quantity).padStart(4)} | ${formatRupiah(p.revenue)}`
      ),
      ``,
      `Dibuat: ${format(new Date(), 'dd MMM yyyy HH:mm:ss')}`,
      `KasirPro v1.0`,
    ]
    const text = lines.join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `laporan-akhir-hari-${report.date}.txt`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Laporan berhasil diunduh')
  }

  const paymentPieData = report
    ? Object.entries(report.paymentBreakdown).map(([name, data]) => ({
        name: name === 'CASH' ? 'Tunai' : name === 'TRANSFER' ? 'Transfer' : name === 'QRIS' ? 'QRIS' : name,
        value: data.total,
      }))
    : []

  const hourlyData = (report?.hourlyBreakdown || []).filter((h) => h.revenue > 0)

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal:</Label>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-48 h-9 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
        />
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={!report || loading} className="cursor-pointer">
          <Download className="w-4 h-4 mr-2" />
          Unduh Laporan
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !report ? (
        <EnhancedEmptyState
          icon={<BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600" />}
          message="Tidak ada data untuk tanggal ini"
          description="Pilih tanggal lain untuk melihat laporan"
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <Card className="border-gray-100 dark:border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Pendapatan</p>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate">{formatRupiah(report.totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="border-gray-100 dark:border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Keuntungan</p>
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-400 truncate">{formatRupiah(report.totalProfit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-gray-100 dark:border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Pengeluaran</p>
                      <p className="text-sm font-bold text-red-700 dark:text-red-400 truncate">{formatRupiah(report.totalExpenses)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-gray-100 dark:border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${report.netProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      <Trophy className={`w-5 h-5 ${report.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Laba Bersih</p>
                      <p className={`text-sm font-bold truncate ${report.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{formatRupiah(report.netProfit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Method Pie Chart */}
            <ChartCard>
              <Card className="border-gray-100 dark:border-gray-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Metode Pembayaran
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-4">
                  {paymentPieData.length === 0 ? (
                    <EnhancedEmptyState
                      icon={<PieChartIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
                      message="Tidak ada data"
                      description="Belum ada transaksi pada tanggal ini"
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={paymentPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          dataKey="value"
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {paymentPieData.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v: number) => formatRupiah(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </ChartCard>

            {/* Hourly Sales Mini Bar Chart */}
            <ChartCard>
              <Card className="border-gray-100 dark:border-gray-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Penjualan Per Jam
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-4">
                  {hourlyData.length === 0 ? (
                    <EnhancedEmptyState
                      icon={<BarChart3 className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
                      message="Tidak ada data"
                      description="Belum ada penjualan pada tanggal ini"
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={(h: number) => `${String(h).padStart(2, '0')}:00`}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis tickFormatter={Y_AXIS_FORMAT} tick={{ fontSize: 10 }} width={55} />
                        <RechartsTooltip
                          content={<CustomChartTooltip />}
                          labelFormatter={(h: number) => `Jam ${String(h).padStart(2, '0')}:00`}
                        />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Pendapatan" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </ChartCard>
          </div>

          {/* Top 5 Products Table */}
          <Card className="border-gray-100 dark:border-gray-800">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Top 5 Produk Terlaris
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              {report.topProducts.length === 0 ? (
                <EnhancedEmptyState
                  icon={<Trophy className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
                  message="Tidak ada data produk"
                  description="Belum ada penjualan pada tanggal ini"
                />
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                        <TableHead className="text-xs font-semibold">#</TableHead>
                        <TableHead className="text-xs font-semibold">Produk</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Pendapatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.topProducts.map((p, i) => (
                        <TableRow key={i} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${i % 2 === 1 ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''}`}>
                          <TableCell className="text-sm font-bold text-gray-400">{i + 1}</TableCell>
                          <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400 text-right">{p.quantity}</TableCell>
                          <TableCell className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">{formatRupiah(p.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
