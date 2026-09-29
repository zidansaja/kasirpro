'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Wallet,
  Pencil,
  Trash2,
  TrendingDown,
  CalendarDays,
  Search,
  Loader2,
  X,
  Receipt,
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
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

const EXPENSE_CATEGORIES = [
  'Listrik & Air',
  'Transportasi',
  'Supli & Bahan',
  'Gaji Karyawan',
  'Sewa Tempat',
  'Perlengkapan',
  'Internet & Telepon',
  'Lainnya',
] as const

const CATEGORY_COLORS: Record<string, string> = {
  'Listrik & Air': 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Transportasi': 'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400',
  'Supli & Bahan': 'bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  'Gaji Karyawan': 'bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
  'Sewa Tempat': 'bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400',
  'Perlengkapan': 'bg-teal-100 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400',
  'Internet & Telepon': 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Lainnya': 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-700/30 dark:text-gray-400',
}

const EXPENSE_BORDER_COLORS: Record<string, string> = {
  'Listrik & Air': 'border-l-blue-500',
  'Transportasi': 'border-l-orange-500',
  'Supli & Bahan': 'border-l-amber-500',
  'Gaji Karyawan': 'border-l-emerald-500',
  'Sewa Tempat': 'border-l-violet-500',
  'Perlengkapan': 'border-l-teal-500',
  'Internet & Telepon': 'border-l-cyan-500',
  'Lainnya': 'border-l-gray-400',
}

const getExpenseBorderColor = (category: string): string => {
  return EXPENSE_BORDER_COLORS[category] || 'border-l-gray-400'
}

interface ExpenseItem {
  id: string
  date: string
  category: string
  amount: number
  description: string | null
  userId: string
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string }
}

interface ExpenseResponse {
  success: boolean
  expenses: ExpenseItem[]
  totalAmount: number
  groupedByCategory: Record<string, number>
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export default function ExpensesView() {
  const user = useAppStore((s) => s.user)
  const isAdmin = user?.role === 'ADMIN'

  // Default to current month
  const initialRange = getCurrentMonthRange()
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)
  const [categoryFilter, setCategoryFilter] = useState('Semua')

  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [groupedByCategory, setGroupedByCategory] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog states
  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null)
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formCategory, setFormCategory] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchExpenses = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('startDate', startDate)
      params.set('endDate', endDate)
      if (categoryFilter !== 'Semua') params.set('category', categoryFilter)
      params.set('page', String(page))
      params.set('limit', '50')

      const res = await fetch(`/api/expenses?${params.toString()}`)
      const data: ExpenseResponse = await res.json()
      if (data.success) {
        setExpenses(data.expenses)
        setTotalAmount(data.totalAmount)
        setGroupedByCategory(data.groupedByCategory)
        if (data.pagination) {
          setTotal(data.pagination.total)
          setTotalPages(data.pagination.totalPages)
          setCurrentPage(data.pagination.page)
        }
      }
    } catch {
      toast.error('Gagal memuat data pengeluaran')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, categoryFilter])

  useEffect(() => {
    fetchExpenses(1)
  }, [fetchExpenses])

  // Computed summary values
  const summaryCards = useMemo(() => {
    // Total Pengeluaran
    const totalExp = totalAmount

    // Rata-rata Harian
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    const avgDaily = totalExp / diffDays

    // Kategori Terbesar
    let topCategory = '-'
    let topAmount = 0
    for (const [cat, amt] of Object.entries(groupedByCategory)) {
      if (amt > topAmount) {
        topAmount = amt
        topCategory = cat
      }
    }

    return { totalExp, avgDaily, topCategory, topCategoryAmount: topAmount, diffDays }
  }, [totalAmount, groupedByCategory, startDate, endDate])

  // Form handlers
  const handleOpenCreate = () => {
    setEditingExpense(null)
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormCategory('')
    setFormAmount('')
    setFormDescription('')
    setFormOpen(true)
  }

  const handleOpenEdit = (expense: ExpenseItem) => {
    setEditingExpense(expense)
    setFormDate(expense.date.slice(0, 10))
    setFormCategory(expense.category)
    setFormAmount(String(expense.amount))
    setFormDescription(expense.description || '')
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formDate || !formCategory || !formAmount || Number(formAmount) <= 0) {
      toast.error('Tanggal, kategori, dan jumlah wajib diisi dengan benar')
      return
    }

    setSubmitting(true)
    try {
      if (editingExpense) {
        const res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            userRole: user?.role,
            date: formDate,
            category: formCategory,
            amount: Number(formAmount),
            description: formDescription || null,
          }),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Pengeluaran berhasil diperbarui')
          setFormOpen(false)
          fetchExpenses(currentPage)
        } else {
          toast.error(data.message || 'Gagal memperbarui pengeluaran')
        }
      } else {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            date: formDate,
            category: formCategory,
            amount: Number(formAmount),
            description: formDescription || null,
          }),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Pengeluaran berhasil ditambahkan')
          setFormOpen(false)
          fetchExpenses(currentPage)
        } else {
          toast.error(data.message || 'Gagal menambahkan pengeluaran')
        }
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/expenses/${deleteId}?userRole=${user?.role}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Pengeluaran berhasil dihapus')
        setDeleteOpen(false)
        setDeleteId(null)
        fetchExpenses(currentPage)
      } else {
        toast.error(data.message || 'Gagal menghapus pengeluaran')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setDeleting(false)
    }
  }

  const handleFilter = () => {
    setCurrentPage(1)
    fetchExpenses(1)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pengeluaran</h2>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pengeluaran
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Pengeluaran */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="relative overflow-hidden rounded-2xl shadow-lg p-5 text-white transition-transform hover:scale-[1.02] hover:shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <div className="absolute -top-2 -right-2 opacity-15 text-white pointer-events-none">
            <TrendingDown className="w-12 h-12" />
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-2 min-h-[100px] justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Total Pengeluaran</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{formatRupiah(summaryCards.totalExp)}</p>
            </div>
            <p className="text-xs text-white/70">{summaryCards.diffDays} hari dalam periode</p>
          </div>
        </motion.div>

        {/* Rata-rata Harian */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl shadow-lg p-5 text-white transition-transform hover:scale-[1.02] hover:shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500" />
          <div className="absolute -top-2 -right-2 opacity-15 text-white pointer-events-none">
            <CalendarDays className="w-12 h-12" />
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-2 min-h-[100px] justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Rata-rata Harian</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{formatRupiah(summaryCards.avgDaily)}</p>
            </div>
            <p className="text-xs text-white/70">Per hari dalam periode</p>
          </div>
        </motion.div>

        {/* Kategori Terbesar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl shadow-lg p-5 text-white transition-transform hover:scale-[1.02] hover:shadow-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-600" />
          <div className="absolute -top-2 -right-2 opacity-15 text-white pointer-events-none">
            <Receipt className="w-12 h-12" />
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-2 min-h-[100px] justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Kategori Terbesar</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{summaryCards.topCategory}</p>
            </div>
            <p className="text-xs text-white/70">{formatRupiah(summaryCards.topCategoryAmount)}</p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-3">
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
            <div className="flex-1 w-full sm:w-auto">
              <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Kategori</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua</SelectItem>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleFilter}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer h-10"
            >
              <Search className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card className="border-0 shadow-sm dark:bg-gray-800/50 dark:border-gray-700">
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Belum Ada Pengeluaran
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                Mulai catat pengeluaran operasional harian Anda untuk memantau arus kas.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-100 dark:border-gray-700">
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Kategori</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Deskripsi</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Jumlah</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow
                        key={expense.id}
                        className={`table-row-hover border-b border-gray-50 dark:border-gray-700/50 border-l-2 ${getExpenseBorderColor(expense.category)}`}
                      >
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {format(new Date(expense.date), "d MMMM yyyy", { locale: localeId })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="secondary"
                            className={CATEGORY_COLORS[expense.category] || 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}
                          >
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {expense.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            -{formatRupiah(expense.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950 cursor-pointer"
                              onClick={() => handleOpenEdit(expense)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950 cursor-pointer"
                                onClick={() => handleDeleteClick(expense.id)}
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
                {expenses.map((expense) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-4 border-l-2 ${getExpenseBorderColor(expense.category)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={CATEGORY_COLORS[expense.category] || 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}
                          >
                            {expense.category}
                          </Badge>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {format(new Date(expense.date), "d MMM yyyy", { locale: localeId })}
                          </span>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {expense.description}
                          </p>
                        )}
                        {expense.user && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            oleh {expense.user.name}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                          -{formatRupiah(expense.amount)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-emerald-600 cursor-pointer"
                            onClick={() => handleOpenEdit(expense)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-red-600 cursor-pointer"
                              onClick={() => handleDeleteClick(expense.id)}
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
                      onClick={() => fetchExpenses(currentPage - 1)}
                      className="cursor-pointer"
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => fetchExpenses(currentPage + 1)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? 'Perbarui detail pengeluaran operasional.'
                : 'Catat pengeluaran operasional harian.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kategori <span className="text-red-500">*</span></Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jumlah (Rp) <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                  Rp
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  min="0"
                  className="h-10 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi</Label>
              <Textarea
                placeholder="Keterangan tambahan (opsional)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : editingExpense ? (
                'Simpan Perubahan'
              ) : (
                'Tambah Pengeluaran'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              Hapus Pengeluaran?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Tindakan ini tidak dapat dibatalkan. Data pengeluaran ini akan dihapus secara permanen.
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
