'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText,
  Filter,
  Activity,
  Pencil,
  LogIn,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGOUT', label: 'LOGOUT' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Semua Entitas' },
  { value: 'Product', label: 'Produk' },
  { value: 'Category', label: 'Kategori' },
  { value: 'User', label: 'Pengguna' },
  { value: 'Transaction', label: 'Transaksi' },
  { value: 'Expense', label: 'Pengeluaran' },
  { value: 'Shift', label: 'Shift' },
  { value: 'StockOpname', label: 'Stok Opname' },
  { value: 'ProductReturn', label: 'Retur' },
  { value: 'Customer', label: 'Pelanggan' },
  { value: 'Supplier', label: 'Supplier' },
  { value: 'PurchaseOrder', label: 'Pembelian' },
]

const getActionBadge = (action: string) => {
  const map: Record<string, string> = {
    CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    LOGIN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    LOGOUT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return map[action] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

interface AuditLogEntry {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
  user?: { id: string; name: string; username: string } | null
}

export default function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ totalToday: 0, changesToday: 0, loginsToday: 0 })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (actionFilter) params.set('action', actionFilter)
      if (entityFilter) params.set('entity', entityFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/audit-logs?${params}`)
      const data = await res.json()
      if (data.success) {
        setLogs(data.logs)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
        setStats(data.stats)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, entityFilter, startDate, endDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const resetFilters = () => {
    setActionFilter('')
    setEntityFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const parseDetails = (details: string | null): string => {
    if (!details) return '-'
    try {
      const obj = JSON.parse(details)
      return JSON.stringify(obj, null, 2)
    } catch {
      return details
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Audit Log</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Riwayat aktivitas sistem</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-gray-100 dark:border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Hari Ini</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.totalToday}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-gray-100 dark:border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Perubahan Data</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.changesToday}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-gray-100 dark:border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Login</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.loginsToday}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filter Row */}
      <Card className="border-gray-100 dark:border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === '__all__' ? '' : v); setPage(1) }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v === '__all__' ? '' : v); setPage(1) }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Semua Entitas" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
              className="h-9"
              placeholder="Dari tanggal"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
              className="h-9"
              placeholder="Sampai tanggal"
            />
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-gray-100 dark:border-gray-800">
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                <ScrollText className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">Tidak ada log ditemukan</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                    <TableHead className="text-xs font-semibold">Waktu</TableHead>
                    <TableHead className="text-xs font-semibold">Pengguna</TableHead>
                    <TableHead className="text-xs font-semibold">Aksi</TableHead>
                    <TableHead className="text-xs font-semibold">Entitas</TableHead>
                    <TableHead className="text-xs font-semibold">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const isExpanded = expandedId === log.id
                    const detailsStr = parseDetails(log.details)
                    const truncated = detailsStr.length > 80 ? detailsStr.slice(0, 80) + '...' : detailsStr

                    return (
                      <TableRow
                        key={log.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      >
                        <TableCell className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {format(parseISO(log.createdAt), 'dd MMM HH:mm', { locale: localeId })}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {log.user?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] font-bold px-2 py-0.5 ${getActionBadge(log.action)}`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {log.entity}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="text-xs text-left text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer w-full"
                          >
                            <span className={isExpanded ? 'whitespace-pre-wrap font-mono' : ''}>
                              {isExpanded ? detailsStr : truncated}
                            </span>
                            {detailsStr.length > 80 && (
                              <span className="ml-1 inline-flex items-center text-emerald-600 dark:text-emerald-400">
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </span>
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Total {total} log
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Sebelumnya
                </Button>
                <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
