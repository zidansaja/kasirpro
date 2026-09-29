'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Wallet,
  CalendarDays,
  Trophy,
  ShoppingBag,
  Calculator,
  Plus,
  ClipboardCheck,
  BarChart3,
  Search,
  CreditCard,
  QrCode,
  Banknote,
  Star,
  Users,
  Clock,
  Flame,
  Zap,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
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
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { DashboardStats, Transaction, Product, DailyReport } from '@/lib/types'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'

// ─── CSS Keyframe Animations (injected once) ────────────────────────────────
const STYLE_ID = 'kasirpro-dashboard-animations'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes shimmer-sweep {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes glow-rotate {
      0% { --glow-angle: 0deg; }
      100% { --glow-angle: 360deg; }
    }
    @keyframes glow-border-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulse-warning {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
      50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
    }
    @keyframes pulse-danger {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
      50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
    }
    .shimmer-text {
      background: linear-gradient(
        90deg,
        currentColor 0%,
        currentColor 40%,
        rgba(255,255,255,0.6) 50%,
        currentColor 60%,
        currentColor 100%
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shimmer-sweep 3s ease-in-out infinite;
    }
    .shimmer-text-dark {
      background: linear-gradient(
        90deg,
        currentColor 0%,
        currentColor 40%,
        rgba(255,255,255,0.35) 50%,
        currentColor 60%,
        currentColor 100%
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shimmer-sweep 3s ease-in-out infinite;
    }
    .glow-card {
      position: relative;
      overflow: hidden;
    }
    .glow-card::before {
      content: '';
      position: absolute;
      inset: -2px;
      z-index: 0;
      border-radius: inherit;
      background: conic-gradient(
        from var(--glow-angle, 0deg),
        transparent 0%,
        rgba(255,255,255,0.15) 10%,
        transparent 20%,
        transparent 100%
      );
      opacity: 0;
      transition: opacity 0.4s ease;
      pointer-events: none;
    }
    .glow-card:hover::before {
      opacity: 1;
      animation: glow-border-spin 3s linear infinite;
    }
    .glow-card > .glow-card-content {
      position: relative;
      z-index: 1;
    }
    .quick-action-btn {
      position: relative;
      overflow: hidden;
    }
    .quick-action-btn::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 2px;
      background: linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.9), rgba(255,255,255,0.6));
      border-radius: 1px;
      transition: width 0.3s ease, left 0.3s ease;
    }
    .quick-action-btn:hover::after {
      width: 70%;
      left: 15%;
    }
  `
  document.head.appendChild(style)
}

// ─── useCountUp Hook ───────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1000, enabled = true) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const targetRef = useRef(target)
  const durationRef = useRef(duration)

  useEffect(() => {
    targetRef.current = target
    durationRef.current = duration
  }, [target, duration])

  useEffect(() => {
    if (!enabled) return
    startTimeRef.current = 0

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / durationRef.current, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * targetRef.current))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [enabled])

  return display
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

const formatRupiahFromCount = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

const getTodayStr = () => {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

const getYesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

interface TrendData {
  direction: 'up' | 'down' | 'neutral'
  value: string
}

function computeTrend(current: number, previous: number): TrendData {
  if (previous === 0 && current === 0) return { direction: 'neutral', value: '0%' }
  if (previous === 0) return { direction: 'up', value: '+100%' }
  const pct = ((current - previous) / previous) * 100
  const formatted = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
  return {
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
    value: formatted,
  }
}

function TrendIndicator({ trend, className = '' }: { trend: TrendData; className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {trend.direction === 'up' ? (
        <TrendingUp className="w-3.5 h-3.5" />
      ) : trend.direction === 'down' ? (
        <TrendingDown className="w-3.5 h-3.5" />
      ) : (
        <Minus className="w-3.5 h-3.5" />
      )}
      <span className="text-xs font-medium">{trend.value}</span>
    </div>
  )
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

interface PaymentMethodData {
  name: string
  value: number
  color: string
}

interface TopCustomer {
  id: string
  name: string
  phone?: string
  totalSpent: number
  visitCount: number
}

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 1.3
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return percent > 0 ? (
    <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={500}>
      {name} {(percent * 100).toFixed(0)}%
    </text>
  ) : null
}

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#10b981',
  TRANSFER: '#3b82f6',
  QRIS: '#8b5cf6',
}

// ─── Quick Action Config ───────────────────────────────────────────────────
const quickActions = [
  { label: 'Transaksi Baru', icon: ShoppingCart, view: 'pos' as const, bg: 'bg-emerald-500 hover:bg-emerald-600', darkBg: 'dark:bg-emerald-600 dark:hover:bg-emerald-700', iconBg: 'bg-emerald-400/30' },
  { label: 'Tambah Produk', icon: Plus, view: 'products' as const, bg: 'bg-blue-500 hover:bg-blue-600', darkBg: 'dark:bg-blue-600 dark:hover:bg-blue-700', iconBg: 'bg-blue-400/30' },
  { label: 'Stok Opname', icon: ClipboardCheck, view: 'stock-opname' as const, bg: 'bg-amber-500 hover:bg-amber-600', darkBg: 'dark:bg-amber-600 dark:hover:bg-amber-700', iconBg: 'bg-amber-400/30' },
  { label: 'Laporan', icon: BarChart3, view: 'reports' as const, bg: 'bg-violet-500 hover:bg-violet-600', darkBg: 'dark:bg-violet-600 dark:hover:bg-violet-700', iconBg: 'bg-violet-400/30' },
  { label: 'Pengeluaran', icon: Wallet, view: 'expenses' as const, bg: 'bg-rose-500 hover:bg-rose-600', darkBg: 'dark:bg-rose-600 dark:hover:bg-rose-700', iconBg: 'bg-rose-400/30' },
  { label: 'Cari Produk', icon: Search, view: 'products' as const, bg: 'bg-teal-500 hover:bg-teal-600', darkBg: 'dark:bg-teal-600 dark:hover:bg-teal-700', iconBg: 'bg-teal-400/30' },
]

// ─── Payment Method Icon ────────────────────────────────────────────────────
function PaymentMethodIcon({ method }: { method: string }) {
  switch (method) {
    case 'CASH':
      return <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
    case 'TRANSFER':
      return <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
    case 'QRIS':
      return <QrCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
    default:
      return null
  }
}

// ─── Section Title Component (Enhanced) ─────────────────────────────────────
function SectionTitle({ children, className = '', icon }: { children: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
            {icon}
          </span>
        )}
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {children}
        </h3>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/30 via-emerald-500/10 to-transparent" />
    </div>
  )
}

// ─── Product Trend Line Colors ─────────────────────────────────────────────
const PRODUCT_LINE_COLORS = ['#10b981', '#f97316', '#06b6d4', '#f43f5e', '#8b5cf6']

// ─── Stat Card Gradient Icon Bgs ───────────────────────────────────────────
const STAT_ICON_GRADIENTS: Record<string, string> = {
  'Penjualan Hari Ini': 'from-emerald-400 to-emerald-600',
  'Total Produk': 'from-sky-400 to-blue-600',
  'Stok Menipis': 'from-amber-400 to-orange-500',
  'Profit Hari Ini': 'from-teal-400 to-emerald-600',
  'Omset Bulan Ini': 'from-violet-400 to-purple-600',
  'Laba Bersih Hari Ini': 'from-rose-400 to-pink-600',
}

// ─── Hourly Heatmap Component (Enhanced) ───────────────────────────────────
function HourlyHeatmap({ hourlyRevenue }: { hourlyRevenue: { hour: number; revenue: number; count: number }[] }) {
  const [tooltipData, setTooltipData] = useState<{ hour: number; revenue: number; count: number; x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const maxRevenue = useMemo(() => {
    return Math.max(...hourlyRevenue.map((h) => h.revenue), 1)
  }, [hourlyRevenue])

  const getIntensity = useCallback((revenue: number) => {
    if (revenue === 0) return 0.08
    const normalized = revenue / maxRevenue
    // Use a power scale for more visual contrast
    return Math.max(0.15, Math.pow(normalized, 0.6)) * 0.85 + 0.15
  }, [maxRevenue])

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, h: { hour: number; revenue: number; count: number }) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return
    setTooltipData({
      ...h,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-12 gap-1.5 sm:gap-2">
        {hourlyRevenue.map((h, index) => {
          const intensity = getIntensity(h.revenue)
          const hourStr = `${String(h.hour).padStart(2, '0')}`
          return (
            <motion.div
              key={h.hour}
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.025, duration: 0.35, ease: 'easeOut' }}
              onMouseEnter={(e) => handleMouseEnter(e, h)}
              onMouseLeave={handleMouseLeave}
              className="relative rounded-lg p-1.5 sm:p-2 cursor-default transition-all duration-200 hover:scale-110 hover:shadow-lg hover:z-10 border border-emerald-200/30 dark:border-emerald-800/20"
              style={{
                backgroundColor: `rgba(16, 185, 129, ${intensity})`,
              }}
            >
              <p className="text-[10px] sm:text-xs font-bold text-gray-800 dark:text-gray-100 text-center">{hourStr}</p>
              <p className={`text-[8px] sm:text-[10px] mt-0.5 font-medium text-center ${h.revenue === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-emerald-900/80 dark:text-emerald-100'}`}>
                {h.revenue === 0 ? '-' : formatRupiah(h.revenue)}
              </p>
            </motion.div>
          )
        })}
      </div>
      {tooltipData && (
        <div
          className="absolute z-50 pointer-events-none bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 text-sm min-w-[160px]"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {String(tooltipData.hour).padStart(2, '0')}:00 - {String(tooltipData.hour).padStart(2, '0')}:59
          </p>
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pendapatan: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(tooltipData.revenue)}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Transaksi: <span className="font-semibold text-gray-900 dark:text-gray-100">{tooltipData.count}</span>
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 mt-3">
        <span className="text-[10px] text-gray-400">Rendah</span>
        <div className="flex gap-0.5">
          {[0.08, 0.25, 0.45, 0.65, 1.0].map((o) => (
            <div
              key={o}
              className="w-4 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(16, 185, 129, ${o})` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-gray-400">Tinggi</span>
      </div>
    </div>
  )
}

// ─── Product Trend Section Component ───────────────────────────────────────
function ProductTrendSection({ topProductsWeekly }: {
  topProductsWeekly: {
    productId: string
    productName: string
    totalRevenue: number
    totalQuantity: number
    dailyData: { date: string; revenue: number; quantity: number }[]
  }[]
}) {
  // Build chart data: merge all dailyData into single array by date
  const chartData = useMemo(() => {
    if (topProductsWeekly.length === 0) return []
    const dates = topProductsWeekly[0]?.dailyData.map((d) => d.date) ?? []
    return dates.map((date) => {
      const point: Record<string, any> = {
        name: format(new Date(date + 'T00:00:00'), 'dd MMM', { locale: localeId }),
      }
      for (const product of topProductsWeekly) {
        const day = product.dailyData.find((d) => d.date === date)
        point[product.productName] = day?.revenue ?? 0
      }
      return point
    })
  }, [topProductsWeekly])

  // Compute trend for each product
  const getProductTrend = useCallback((product: typeof topProductsWeekly[number]) => {
    const daily = product.dailyData
    if (daily.length < 4) return 'neutral' as const
    const firstHalf = daily.slice(0, 3)
    const lastHalf = daily.slice(-3)
    const firstAvg = firstHalf.reduce((s, d) => s + d.revenue, 0) / firstHalf.length
    const lastAvg = lastHalf.reduce((s, d) => s + d.revenue, 0) / lastHalf.length
    if (firstAvg === 0 && lastAvg === 0) return 'neutral' as const
    if (firstAvg === 0) return 'up' as const
    const pctChange = ((lastAvg - firstAvg) / firstAvg) * 100
    if (pctChange > 5) return 'up' as const
    if (pctChange < -5) return 'down' as const
    return 'neutral' as const
  }, [])

  if (topProductsWeekly.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        Belum ada data tren produk
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="h-64 rounded-xl bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-800/50 dark:to-gray-800/50 p-2 text-gray-500 dark:text-gray-400 [&_.recharts-default-tooltip]:dark:bg-gray-800 [&_.recharts-default-tooltip]:dark:border-gray-700">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="[&_line]:dark:stroke-gray-700" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              axisLine={{ stroke: '#e5e7eb' }}
              className="[&_line]:dark:stroke-gray-700"
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'currentColor' }}
              axisLine={{ stroke: '#e5e7eb' }}
              className="[&__line]:dark:stroke-gray-700"
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)
              }
            />
            <RechartsTooltip
              formatter={(value: number, name: string) => [formatRupiah(value), name]}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
              wrapperClassName="dark:[&_.recharts-default-tooltip]:!bg-gray-800 dark:[&_.recharts-default-tooltip]:!border-gray-700 dark:[&_.recharts-tooltip-label]:!text-gray-100 dark:[&_.recharts-tooltip-item]:!text-gray-300"
            />
            <Legend
              verticalAlign="bottom"
              iconType="line"
              iconSize={12}
              wrapperStyle={{ fontSize: '11px', color: 'currentColor', paddingTop: '8px' }}
            />
            {topProductsWeekly.map((product, i) => (
              <Line
                key={product.productId}
                type="monotone"
                dataKey={product.productName}
                stroke={PRODUCT_LINE_COLORS[i % PRODUCT_LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
              <TableHead className="text-xs font-semibold">Produk</TableHead>
              <TableHead className="text-xs font-semibold text-right">Terjual</TableHead>
              <TableHead className="text-xs font-semibold text-right">Total Pendapatan</TableHead>
              <TableHead className="text-xs font-semibold text-center">Tren</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topProductsWeekly.map((product, i) => {
              const trend = getProductTrend(product)
              return (
                <TableRow key={product.productId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PRODUCT_LINE_COLORS[i % PRODUCT_LINE_COLORS.length] }} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{product.productName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                    {product.totalQuantity} pcs
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                    {formatRupiah(product.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-center">
                    {trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500 inline-block" />
                    ) : trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-rose-500 inline-block" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-400 inline-block" />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Top Products Weekly Horizontal Bar Chart ──────────────────────────────
function TopProductsWeeklyBarChart({ topProductsWeekly }: {
  topProductsWeekly: {
    productId: string
    productName: string
    totalRevenue: number
    totalQuantity: number
    dailyData: { date: string; revenue: number; quantity: number }[]
  }[]
}) {
  if (topProductsWeekly.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        Belum ada data produk
      </div>
    )
  }

  // Sort by totalRevenue descending for the bar chart
  const sorted = [...topProductsWeekly].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const maxRevenue = Math.max(...sorted.map((p) => p.totalRevenue), 1)

  const barData = sorted.map((p) => ({
    name: p.productName.length > 18 ? p.productName.slice(0, 16) + '...' : p.productName,
    fullName: p.productName,
    revenue: p.totalRevenue,
    quantity: p.totalQuantity,
  }))

  return (
    <div className="space-y-3">
      <div className="h-[Math.max(200, sorted.length * 40)]px rounded-xl bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-800/50 dark:to-gray-800/50 p-2 text-gray-500 dark:text-gray-400 [&_.recharts-default-tooltip]:dark:bg-gray-800 [&_.recharts-default-tooltip]:dark:border-gray-700">
        <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 45)}>
          <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 40, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="hBarGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                <stop offset="50%" stopColor="#34d399" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#6ee7b7" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} className="[&_line]:dark:stroke-gray-700" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              axisLine={{ stroke: '#e5e7eb' }}
              className="[&_line]:dark:stroke-gray-700"
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              axisLine={{ stroke: '#e5e7eb' }}
              className="[&_line]:dark:stroke-gray-700"
              tickLine={false}
              width={100}
            />
            <RechartsTooltip
              formatter={(value: number, _name: string, props: any) => [formatRupiah(value), props.payload.fullName]}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
              wrapperClassName="dark:[&_.recharts-default-tooltip]:!bg-gray-800 dark:[&_.recharts-default-tooltip]:!border-gray-700 dark:[&_.recharts-tooltip-label]:!text-gray-100 dark:[&_.recharts-tooltip-item]:!text-gray-300"
            />
            <Bar dataKey="revenue" fill="url(#hBarGradient)" radius={[0, 6, 6, 0]} barSize={24}>
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="url(#hBarGradient)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quantity badges below chart */}
      <div className="flex flex-wrap gap-2">
        {sorted.map((product, i) => (
          <div
            key={product.productId}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30 px-2.5 py-1"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRODUCT_LINE_COLORS[i % PRODUCT_LINE_COLORS.length] }} />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate max-w-[120px]">{product.productName}</span>
            <Badge className="bg-emerald-100 dark:bg-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0 border-0 hover:bg-emerald-100">
              {product.totalQuantity} pcs
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [todayProfit, setTodayProfit] = useState<number | null>(null)
  const [todayExpenses, setTodayExpenses] = useState<number>(0)
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [customersAvailable, setCustomersAvailable] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
    fetchTodayProfit()
    fetchTodayExpenses()
    fetchTopCustomers()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayProfit = async () => {
    try {
      const today = getTodayStr()
      const res = await fetch(`/api/reports?type=daily&date=${today}`)
      const data = await res.json()
      if (data.success && data.report) {
        setTodayProfit((data.report as DailyReport).totalProfit)
      } else {
        setTodayProfit(0)
      }
    } catch {
      setTodayProfit(0)
    }
  }

  const fetchTodayExpenses = async () => {
    try {
      const res = await fetch('/api/expenses/today')
      const data = await res.json()
      if (data.totalExpenses !== undefined) {
        setTodayExpenses(data.totalExpenses)
      }
    } catch {
      // silently fail, keep default 0
    }
  }

  const fetchTopCustomers = async () => {
    try {
      const res = await fetch('/api/customers/top?sortBy=totalSpent')
      const data = await res.json()
      setCustomersAvailable(true)
      if (data.success && data.customers) {
        setTopCustomers(data.customers.slice(0, 3))
      }
    } catch {
      // silently fail - API may not be available yet
    }
  }

  const chartData = stats?.dailyRevenue.map((d) => ({
    name: format(new Date(d.date), 'dd MMM', { locale: localeId }),
    revenue: d.revenue,
    count: d.count,
  })) ?? []

  // Compute yesterday's revenue from dailyRevenue array for trend
  const yesterdayRevenue = useMemo(() => {
    const yesterday = getYesterdayStr()
    const found = stats?.dailyRevenue.find((d) => d.date === yesterday)
    return found?.revenue ?? 0
  }, [stats])

  const todayRevenue = stats?.todaySales ?? 0
  const netProfit = todayRevenue - todayExpenses

  const todayTxCount = stats?.todayTransactionCount ?? 0

  // ─── Animated Counters ───────────────────────────────────────────────────
  const animatedTodaySales = useCountUp(stats?.todaySales ?? 0, 1000, !!stats)
  const animatedTotalProducts = useCountUp(stats?.totalProducts ?? 0, 1000, !!stats)
  const animatedLowStock = useCountUp(stats?.lowStockCount ?? 0, 800, !!stats)
  const animatedProfit = useCountUp(todayProfit ?? 0, 1000, todayProfit !== null)
  const animatedMonthlyRevenue = useCountUp(stats?.monthlyRevenue ?? 0, 1200, !!stats)
  const animatedNetProfit = useCountUp(Math.abs(netProfit), 1000, !!stats)

  // Top selling products from recentTransactions
  const topProducts = useMemo<TopProduct[]>(() => {
    if (!stats?.recentTransactions) return []
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    for (const tx of stats.recentTransactions) {
      if (tx.transactionItems) {
        for (const item of tx.transactionItems) {
          const existing = productMap.get(item.productName)
          if (existing) {
            existing.quantity += item.quantity
            existing.revenue += item.subtotal
          } else {
            productMap.set(item.productName, {
              name: item.productName,
              quantity: item.quantity,
              revenue: item.subtotal,
            })
          }
        }
      }
    }
    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }, [stats])

  const maxTopProductQty = Math.max(...topProducts.map((p) => p.quantity), 1)

  // Payment method distribution
  const paymentMethodData = useMemo<PaymentMethodData[]>(() => {
    if (!stats?.recentTransactions) return []
    const countMap = new Map<string, number>()
    for (const tx of stats.recentTransactions) {
      countMap.set(tx.paymentMethod, (countMap.get(tx.paymentMethod) ?? 0) + 1)
    }
    return Array.from(countMap.entries()).map(([method, count]) => ({
      name: method,
      value: count,
      color: PAYMENT_COLORS[method] ?? '#9ca3af',
    }))
  }, [stats])

  const totalPaymentCount = paymentMethodData.reduce((sum, d) => sum + d.value, 0)

  const statCards = useMemo(() => {
    const cards = [
      {
        label: 'Penjualan Hari Ini',
        value: stats ? formatRupiahFromCount(animatedTodaySales) : '-',
        icon: <DollarSign className="w-7 h-7" />,
        gradient: 'from-emerald-500 to-emerald-600',
        trend: computeTrend(todayRevenue, yesterdayRevenue),
        trendColor: 'text-emerald-100',
        sub: `${todayTxCount} transaksi hari ini`,
      },
      {
        label: 'Total Produk',
        value: stats ? new Intl.NumberFormat('id-ID').format(animatedTotalProducts) : '-',
        icon: <Package className="w-7 h-7" />,
        gradient: 'from-sky-500 to-blue-600',
        trend: null,
        sub: 'Semua kategori',
      },
      {
        label: 'Stok Menipis',
        value: stats ? new Intl.NumberFormat('id-ID').format(animatedLowStock) : '-',
        icon: <AlertTriangle className="w-7 h-7" />,
        gradient: 'from-amber-500 to-orange-500',
        trend: null,
        sub: stats && stats.lowStockCount > 0 ? 'Perlu restock segera' : 'Semua stok aman',
      },
      {
        label: 'Profit Hari Ini',
        value: todayProfit !== null ? formatRupiahFromCount(animatedProfit) : '-',
        icon: <Wallet className="w-7 h-7" />,
        gradient: 'from-teal-500 to-emerald-600',
        trend: null,
        sub: todayProfit !== null && todayRevenue > 0
          ? `Margin ${((todayProfit / todayRevenue) * 100).toFixed(1)}%`
          : '-',
      },
      {
        label: 'Omset Bulan Ini',
        value: stats ? formatRupiahFromCount(animatedMonthlyRevenue) : '-',
        icon: <CalendarDays className="w-7 h-7" />,
        gradient: 'from-violet-500 to-purple-600',
        trend: null,
        sub: stats ? `${stats.monthlyTransactionCount} transaksi` : '-',
      },
      {
        label: 'Laba Bersih Hari Ini',
        value: stats
          ? (netProfit < 0 ? '-' : '') + formatRupiahFromCount(animatedNetProfit)
          : '-',
        icon: <Calculator className="w-7 h-7" />,
        gradient: 'from-rose-500 to-pink-600',
        trend: null,
        sub: `Pengeluaran: ${formatRupiah(todayExpenses)}`,
        isNegative: netProfit < 0,
      },
    ]
    return cards
  }, [stats, todayProfit, todayRevenue, yesterdayRevenue, todayTxCount, todayExpenses, netProfit, animatedTodaySales, animatedTotalProducts, animatedLowStock, animatedProfit, animatedMonthlyRevenue, animatedNetProfit])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl shadow-lg p-6 bg-gray-100 dark:bg-gray-800/50 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl opacity-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700">
            <CardContent className="p-6">
              <Skeleton className="h-8 w-40 mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700">
            <CardContent className="p-6">
              <Skeleton className="h-8 w-36 mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Stat Cards with Glow + Shimmer + Stagger ─────────────────────── */}
      <section>
        <SectionTitle icon={<Zap className="w-3 h-3" />}>Ringkasan Hari Ini</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mt-3">
          {statCards.map((card, index) => {
            const iconGradientClass = STAT_ICON_GRADIENTS[card.label] ?? card.gradient
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 30, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
                className="glow-card relative overflow-hidden rounded-2xl shadow-lg p-5 text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-xl group"
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 z-0 ${card.isNegative ? 'bg-gradient-to-br from-red-500 to-red-600' : `bg-gradient-to-br ${card.gradient}`}`} />

                {/* Decorative icon - top right, large, semi-transparent */}
                <div className="absolute -top-2 -right-2 opacity-10 text-white pointer-events-none group-hover:opacity-20 transition-opacity duration-500">
                  {card.icon}
                </div>

                {/* Decorative circle pattern */}
                <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

                {/* Content */}
                <div className="glow-card-content relative z-10 flex flex-col gap-2 min-h-[100px] justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">{card.label}</p>
                    <p className="text-2xl font-bold mt-1 tracking-tight text-white shimmer-text-dark">{card.value}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/80">{card.sub}</p>
                    {card.trend && (
                      <TrendIndicator trend={card.trend} className={card.trendColor} />
                    )}
                  </div>
                </div>

                {/* Gradient Icon Background */}
                <div className={`absolute bottom-2 right-2 w-10 h-10 rounded-xl bg-gradient-to-br ${iconGradientClass} opacity-30 shadow-lg pointer-events-none`} />
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ─── Quick Actions - Aksi Cepat with gradient underline ──────────── */}
      <section>
        <SectionTitle icon={<Activity className="w-3 h-3" />}>Aksi Cepat</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.3, duration: 0.35 }}
                onClick={() => useAppStore.getState().setCurrentView(action.view)}
                className={`quick-action-btn flex flex-col items-center gap-2.5 rounded-xl p-4 text-white transition-all duration-200 hover:scale-[1.05] hover:shadow-md active:scale-[0.97] cursor-pointer ${action.bg} ${action.darkBg}`}
              >
                <div className={`w-10 h-10 rounded-lg ${action.iconBg} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-center leading-tight">{action.label}</span>
              </motion.button>
            )
          })}
        </div>
      </section>

      {/* ─── Top Customers - Pelanggan Terbaik ───────────────────────────── */}
      {customersAvailable && (
        <section>
          <SectionTitle icon={<Star className="w-3 h-3" />} className="flex items-center gap-2">
            Pelanggan Terbaik
          </SectionTitle>
          {topCustomers.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              {topCustomers.map((customer, index) => {
                const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'
                return (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.4 }}
                    className="flex-1 rounded-xl bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-100 dark:border-gray-700 shadow-sm p-3"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-xl">{rankEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{customer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Total Belanja</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(customer.totalSpent)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Kunjungan</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{customer.visitCount}x</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-100 dark:border-gray-700 shadow-sm p-6">
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada pelanggan</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── Charts Section with Glassmorphism ───────────────────────────── */}
      <section>
        <SectionTitle icon={<TrendingUp className="w-3 h-3" />}>Grafik & Analitik</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-3">
          {/* Revenue Chart (2/3) */}
          <Card className="lg:col-span-2 border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700 hover:shadow-md transition-shadow bg-white/70 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Pendapatan 7 Hari Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-72 rounded-xl bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-800/50 dark:to-gray-800/50 p-2 text-gray-500 dark:text-gray-400 [&_.recharts-default-tooltip]:dark:bg-gray-800 [&_.recharts-default-tooltip]:dark:border-gray-700">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                      </linearGradient>
                      <filter id="barShadow" x="-10%" y="-10%" width="120%" height="130%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#059669" floodOpacity={0.3} />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="[&_line]:dark:stroke-gray-700" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      className="[&_line]:dark:stroke-gray-700"
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      className="[&__line]:dark:stroke-gray-700"
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)
                      }
                    />
                    <RechartsTooltip
                      formatter={(value: number) => [formatRupiah(value), 'Pendapatan']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                      wrapperClassName="dark:[&_.recharts-default-tooltip]:!bg-gray-800 dark:[&_.recharts-default-tooltip]:!border-gray-700 dark:[&_.recharts-tooltip-label]:!text-gray-100 dark:[&_.recharts-tooltip-item]:!text-gray-300"
                    />
                    <Bar dataKey="revenue" fill="url(#barGradient)" radius={[8, 8, 0, 0]} filter="url(#barShadow)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Distribution (1/3) */}
          <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700 hover:shadow-md transition-shadow bg-white/70 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Metode Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {paymentMethodData.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-sm text-gray-400">
                  Belum ada data transaksi
                </div>
              ) : (
                <div className="h-72 text-gray-700 dark:text-gray-300 [&_.recharts-default-tooltip]:dark:bg-gray-800 [&_.recharts-default-tooltip]:dark:border-gray-700">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={CustomPieLabel}
                        labelLine={false}
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => [`${value} transaksi`, 'Metode']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        }}
                        wrapperClassName="dark:[&_.recharts-default-tooltip]:!bg-gray-800 dark:[&_.recharts-default-tooltip]:!border-gray-700 dark:[&_.recharts-tooltip-label]:!text-gray-100 dark:[&_.recharts-tooltip-item]:!text-gray-300"
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => {
                          const item = paymentMethodData.find((d) => d.name === value)
                          const count = item?.value ?? 0
                          const pct = totalPaymentCount > 0 ? ((count / totalPaymentCount) * 100).toFixed(0) : '0'
                          return `${value} (${count} · ${pct}%)`
                        }}
                        wrapperStyle={{ fontSize: '12px', color: 'currentColor' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Top Selling Products ─────────────────────────────────────────── */}
      <section>
        <SectionTitle icon={<Trophy className="w-3 h-3" />}>Produk Terlaris</SectionTitle>
        <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700 mt-3 hover:shadow-md transition-shadow bg-white/70 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Trophy className="w-4 h-4 text-amber-500" />
              Produk Terlaris
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                Belum ada data produk terlaris
              </div>
            ) : (
              <div
                className="max-h-48 overflow-x-auto flex gap-3 pb-1"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db transparent',
                }}
              >
                {topProducts.map((product, index) => (
                  <motion.div
                    key={product.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.06, duration: 0.35 }}
                    className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-3 min-w-48 flex-shrink-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                    </div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-xs text-gray-500">Terjual</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{product.quantity} pcs</span>
                    </div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs text-gray-500">Total</span>
                      <span className="text-sm font-bold text-emerald-600">{formatRupiah(product.revenue)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.max((product.quantity / maxTopProductQty) * 100, 4)}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Hourly Sales Heatmap - JAM RAMAI ───────────────────────────── */}
      <section>
        <SectionTitle icon={<Flame className="w-3 h-3" />} className="flex items-center gap-2">
          Jam Ramai
        </SectionTitle>
        <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700 mt-3 hover:shadow-md transition-shadow bg-white/70 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="w-4 h-4 text-emerald-600" />
              Peta Panas Penjualan Per Jam
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <HourlyHeatmap hourlyRevenue={stats?.hourlyRevenue ?? []} />
          </CardContent>
        </Card>
      </section>

      {/* ─── Product Performance Trends - TREN PRODUK ────────────────────── */}
      <section>
        <SectionTitle icon={<BarChart3 className="w-3 h-3" />} className="flex items-center gap-2">
          Tren Produk
        </SectionTitle>
        <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700 mt-3 hover:shadow-md transition-shadow bg-white/70 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Tren Performa Produk (7 Hari)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ProductTrendSection topProductsWeekly={stats?.topProductsWeekly ?? []} />
          </CardContent>
        </Card>
      </section>

      {/* ─── Top Products Weekly Horizontal Bar Chart ────────────────────── */}
      <section>
        <SectionTitle icon={<Trophy className="w-3 h-3" />} className="flex items-center gap-2">
          Produk Terlaris Mingguan
        </SectionTitle>
        <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700 mt-3 hover:shadow-md transition-shadow bg-white/70 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Pendapatan Produk Minggu Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TopProductsWeeklyBarChart topProductsWeekly={stats?.topProductsWeekly ?? []} />
          </CardContent>
        </Card>
      </section>

      {/* ─── Low Stock Alert with Pulse Animation ────────────────────────── */}
      <section>
        <SectionTitle icon={<AlertTriangle className="w-3 h-3" />}>Peringatan Stok</SectionTitle>
        <Card className="border-0 shadow-sm overflow-hidden dark:bg-gray-800/50 dark:border-gray-700 mt-3 hover:shadow-md transition-shadow bg-white/70 backdrop-blur-md">
          {/* Amber gradient header bar */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div
              className="max-h-72 overflow-y-auto space-y-2 pr-1"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db transparent',
              }}
            >
              {!stats?.lowStockProducts || stats.lowStockProducts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Semua stok aman</p>
              ) : (
                stats.lowStockProducts.map((product: Product, index: number) => {
                  const ratio = product.minStock > 0 ? product.stock / product.minStock : 0
                  const isCritical = product.stock <= product.minStock
                  const borderColor = isCritical
                    ? 'border-l-red-500'
                    : ratio <= 2
                      ? 'border-l-amber-500'
                      : 'border-l-emerald-500'
                  const textColor = isCritical
                    ? 'text-red-600 dark:text-red-400'
                    : ratio <= 2
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  const barColor = isCritical
                    ? 'bg-red-500'
                    : ratio <= 2
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  const barBg = isCritical
                    ? 'bg-red-100 dark:bg-red-900/20'
                    : ratio <= 2
                      ? 'bg-amber-100 dark:bg-amber-900/20'
                      : 'bg-emerald-100 dark:bg-emerald-900/20'
                  const barWidth = product.minStock > 0
                    ? Math.min((product.stock / (product.minStock * 3)) * 100, 100)
                    : 100
                  const pulseAnim = isCritical ? 'pulse-danger' : ratio <= 2 ? 'pulse-warning' : ''

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className={`rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 border-l-4 ${borderColor} shadow-sm p-3 ${pulseAnim ? `[animation:${pulseAnim}_2s_ease-in-out_infinite]` : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          {isCritical && (
                            <AlertTriangle className={`w-4 h-4 ${textColor} animate-pulse shrink-0`} />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                            <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-xs text-gray-500">Stok:</span>
                          <span className={`text-sm font-bold ${textColor}`}>
                            {product.stock}
                          </span>
                          <span className="text-xs text-gray-400">/ min {product.minStock} {product.unit}</span>
                        </div>
                      </div>
                      <div className={`w-full ${barBg} rounded-full h-2`}>
                        <div
                          className={`${barColor} h-2 rounded-full transition-all`}
                          style={{ width: `${Math.max(barWidth, 4)}%` }}
                        />
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
            {/* Lihat Semua Produk link */}
            {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => useAppStore.getState().setCurrentView('products')}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium hover:underline cursor-pointer transition-colors"
                >
                  Lihat Semua Produk →
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Recent Transactions with Zebra Striping ─────────────────────── */}
      <section>
        <SectionTitle icon={<ShoppingCart className="w-3 h-3" />}>Transaksi Terbaru</SectionTitle>
        <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700 mt-3 hover:shadow-md transition-shadow bg-white/70 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              Transaksi Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div
              className="max-h-96 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db transparent',
              }}
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">No. Transaksi</TableHead>
                    <TableHead className="text-xs font-semibold">Kasir</TableHead>
                    <TableHead className="text-xs font-semibold">Metode</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                    <TableHead className="text-xs font-semibold">Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!stats?.recentTransactions || stats.recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                        Belum ada transaksi
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.recentTransactions.slice(0, 5).map((tx: Transaction, index: number) => (
                      <TableRow
                        key={tx.id}
                        className={`transition-colors duration-150 ${
                          index % 2 === 0
                            ? 'bg-emerald-50/30 hover:bg-emerald-100/40 dark:bg-emerald-900/5 dark:hover:bg-emerald-900/10'
                            : 'hover:bg-emerald-50/40 dark:hover:bg-emerald-900/8'
                        }`}
                      >
                        {/* Status dot */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Selesai</span>
                          </div>
                        </TableCell>
                        {/* Transaction Number */}
                        <TableCell className="text-sm font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
                          {tx.transactionNumber}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-300">{tx.user?.name || '-'}</TableCell>
                        {/* Payment Method with icon */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <PaymentMethodIcon method={tx.paymentMethod} />
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                tx.paymentMethod === 'CASH'
                                  ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400'
                                  : tx.paymentMethod === 'TRANSFER'
                                    ? 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400'
                                    : 'border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400'
                              }`}
                            >
                              {tx.paymentMethod}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right shimmer-text">
                          {formatRupiah(tx.totalAmount)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(tx.createdAt), 'dd/MM HH:mm', { locale: localeId })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
