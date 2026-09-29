'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, Loader2, Tags, Package, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'
import EmptyState from '@/components/pos/empty-state'

interface CategoryFormData {
  name: string
  description: string
}

const emptyForm: CategoryFormData = {
  name: '',
  description: '',
}

// Deterministic color mapping for category names
const CATEGORY_DOT_COLORS = [
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500',
  'bg-violet-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500',
]

const CATEGORY_BORDER_COLORS = [
  'border-l-emerald-500', 'border-l-amber-500', 'border-l-rose-500', 'border-l-sky-500',
  'border-l-violet-500', 'border-l-orange-500', 'border-l-teal-500', 'border-l-pink-500',
]

function getCategoryColorIndex(name: string): number {
  const hash = name.toLowerCase().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return hash % CATEGORY_DOT_COLORS.length
}

function getCategoryDotColor(name: string): string {
  return CATEGORY_DOT_COLORS[getCategoryColorIndex(name)]
}

function getCategoryBorderColor(name: string): string {
  return CATEGORY_BORDER_COLORS[getCategoryColorIndex(name)]
}

const formatNumber = (num: number) =>
  new Intl.NumberFormat('id-ID').format(num)

export default function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryFormData>(emptyForm)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (data.success) {
        setCategories(data.categories)
      }
    } catch {
      toast.error('Gagal memuat data kategori')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const openAddDialog = () => {
    setEditingCategory(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setForm({
      name: category.name,
      description: category.description || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nama kategori wajib diisi')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      }

      if (editingCategory) {
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Kategori berhasil diperbarui')
          setDialogOpen(false)
          fetchCategories()
        } else {
          toast.error(data.message || 'Gagal memperbarui kategori')
        }
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Kategori berhasil ditambahkan')
          setDialogOpen(false)
          fetchCategories()
        } else {
          toast.error(data.message || 'Gagal menambahkan kategori')
        }
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/categories/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Kategori berhasil dihapus')
        setDeleteId(null)
        fetchCategories()
      } else {
        toast.error(data.message || 'Gagal menghapus kategori')
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setDeleting(false)
    }
  }

  const getProductCount = (category: Category) => category._count?.products || 0

  // Stats
  const stats = useMemo(() => {
    const totalCategories = categories.length
    const totalProducts = categories.reduce((sum, c) => sum + getProductCount(c), 0)
    const emptyCategories = categories.filter((c) => getProductCount(c) === 0).length
    return { totalCategories, totalProducts, emptyCategories }
  }, [categories])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
            <Tags className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manajemen Kategori</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola kategori produk</p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kategori
        </Button>
      </div>

      {/* Stats Row */}
      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Tags className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Kategori</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatNumber(stats.totalCategories)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Produk Terdaftar</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatNumber(stats.totalProducts)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Kategori Kosong</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatNumber(stats.emptyCategories)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table - Desktop */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden sm:block max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-center">Jumlah Produk</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="table-row-hover">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState icon={Tags} title="Belum ada kategori" description="Tambahkan kategori pertama Anda" />
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => {
                  const count = getProductCount(category)
                  return (
                    <TableRow key={category.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${getCategoryDotColor(category.name)}`} />
                          <span className="font-medium text-gray-900 dark:text-gray-100">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                        {category.description || <span className="text-gray-400 dark:text-gray-500">-</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          count > 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {count}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                            onClick={() => setDeleteId(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))
          ) : categories.length === 0 ? (
            <EmptyState icon={Tags} title="Belum ada kategori" description="Tambahkan kategori pertama Anda" />
          ) : (
            categories.map((category) => {
              const count = getProductCount(category)
              return (
                <div key={category.id} className={`p-4 border-l-4 ${getCategoryBorderColor(category.name)} bg-white dark:bg-gray-800/50`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${getCategoryDotColor(category.name)}`} />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{category.name}</h3>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-5 line-clamp-2">{category.description}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                      count > 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {count} produk
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-2 ml-5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                      onClick={() => setDeleteId(category.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {!loading && categories.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total {categories.length} kategori
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}</DialogTitle>
            <DialogDescription className="sr-only">Formulir {editingCategory ? 'edit' : 'tambah'} kategori</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nama Kategori *</Label>
              <Input
                id="cat-name"
                placeholder="Masukkan nama kategori"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Deskripsi</Label>
              <Textarea
                id="cat-desc"
                placeholder="Deskripsi kategori (opsional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
