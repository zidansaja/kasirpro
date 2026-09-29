'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Filter,
  X,
  Package,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Product, Category, Supplier } from '@/lib/types'
import EmptyState from '@/components/pos/empty-state'

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

const getCategoryColor = (categoryName: string): string => {
  const map: Record<string, string> = {
    'Makanan': 'bg-orange-500',
    'Minuman': 'bg-blue-500',
    'Rokok & Tembakau': 'bg-amber-500',
    'Kebutuhan Rumah Tangga': 'bg-purple-500',
    'Lainnya': 'bg-gray-400',
  }
  return map[categoryName] || 'bg-emerald-500'
}

interface ProductFormData {
  name: string
  sku: string
  categoryId: string
  supplierId: string
  buyPrice: string
  sellPrice: string
  stock: string
  minStock: string
  unit: string
  barcode: string
}

const emptyForm: ProductFormData = {
  name: '',
  sku: '',
  categoryId: '',
  supplierId: '',
  buyPrice: '',
  sellPrice: '',
  stock: '',
  minStock: '',
  unit: 'pcs',
  barcode: '',
}

export default function ProductsView() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(emptyForm)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const limit = 20

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryId) params.set('categoryId', categoryId)
      if (lowStock) params.set('lowStock', 'true')
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setProducts(data.products)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
      }
    } catch {
      toast.error('Gagal memuat data produk')
    } finally {
      setLoading(false)
    }
  }, [search, categoryId, lowStock, page])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (data.success) {
        setCategories(data.categories)
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers?limit=100')
      const data = await res.json()
      if (data.success) {
        setSuppliers(data.suppliers)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchSuppliers()
  }, [fetchCategories, fetchSuppliers])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    setPage(1)
  }, [search, categoryId, lowStock])

  const openAddDialog = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      buyPrice: String(product.buyPrice),
      sellPrice: String(product.sellPrice),
      stock: String(product.stock),
      minStock: String(product.minStock),
      unit: product.unit,
      barcode: product.barcode || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nama produk wajib diisi')
      return
    }
    if (!form.sellPrice || Number(form.sellPrice) <= 0) {
      toast.error('Harga jual wajib diisi')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        categoryId: form.categoryId || undefined,
        supplierId: form.supplierId || undefined,
        buyPrice: Number(form.buyPrice) || 0,
        sellPrice: Number(form.sellPrice),
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
        unit: form.unit.trim() || 'pcs',
        barcode: form.barcode.trim() || undefined,
      }

      if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, sku: form.sku.trim() || editingProduct.sku }),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Produk berhasil diperbarui')
          setDialogOpen(false)
          fetchProducts()
        } else {
          toast.error(data.message || 'Gagal memperbarui produk')
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Produk berhasil ditambahkan')
          setDialogOpen(false)
          fetchProducts()
        } else {
          toast.error(data.message || 'Gagal menambahkan produk')
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
      const res = await fetch(`/api/products/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Produk berhasil dihapus')
        setDeleteId(null)
        fetchProducts()
      } else {
        toast.error(data.message || 'Gagal menghapus produk')
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setDeleting(false)
    }
  }

  const getCategoryName = (catId?: string) => {
    if (!catId) return '-'
    const cat = categories.find((c) => c.id === catId)
    return cat?.name || '-'
  }

  const activeFiltersCount = [search, categoryId, lowStock].filter(Boolean).length

  const clearFilters = () => {
    setSearch('')
    setCategoryId('')
    setLowStock(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manajemen Produk</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola data produk toko Anda</p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Cari nama atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryId} onValueChange={(val) => setCategoryId(val === '__all__' ? '' : val)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Kategori</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => setLowStock(!lowStock)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
              lowStock
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${lowStock ? 'text-amber-600 dark:text-amber-400' : ''}`} />
            Stok Rendah
          </button>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer shrink-0">
              <X className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                <TableHead className="w-[100px]">SKU</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead className="hidden md:table-cell">Kategori</TableHead>
                <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Harga Beli</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="text-center">Stok</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Min Stok</TableHead>
                <TableHead className="hidden xl:table-cell">Satuan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="table-row-hover">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <EmptyState icon={Package} title="Belum ada produk" description="Tambahkan produk pertama Anda" />
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const isLowStock = product.stock <= product.minStock
                  return (
                    <TableRow key={product.id} className="group">
                      <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">{product.sku}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${getCategoryColor(product.category?.name || '')}`} />
                          <div className="font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                        </div>
                        {product.barcode && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-[18px]">{product.barcode}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {product.category ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {product.category.name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {product.supplier ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300">{product.supplier.name}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-gray-600 dark:text-gray-400 text-sm">
                        {formatRupiah(product.buyPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(product.sellPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={isLowStock ? 'destructive' : 'secondary'}
                          className={isLowStock ? 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30' : ''}
                        >
                          {isLowStock && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {product.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell text-gray-500 dark:text-gray-400 text-sm">
                        {product.minStock}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-gray-600 dark:text-gray-400 text-sm">
                        {product.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                            onClick={() => openEditDialog(product)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                            onClick={() => setDeleteId(product.id)}
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

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total} produk
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Sebelumnya
              </Button>
              <span className="px-3 text-sm text-gray-700 dark:text-gray-300 font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="cursor-pointer"
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
            <DialogDescription className="sr-only">Formulir {editingProduct ? 'edit' : 'tambah'} produk</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="prod-name">Nama Produk *</Label>
                <Input
                  id="prod-name"
                  placeholder="Masukkan nama produk"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-sku">SKU</Label>
                <Input
                  id="prod-sku"
                  placeholder="Otomatis jika kosong"
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-barcode">Barcode</Label>
                <Input
                  id="prod-barcode"
                  placeholder="Masukkan barcode"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Kategori</Label>
                <Select value={form.categoryId} onValueChange={(val) => setForm((f) => ({ ...f, categoryId: val === '__none__' ? '' : val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tanpa Kategori</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Supplier</Label>
                <Select value={form.supplierId} onValueChange={(val) => setForm((f) => ({ ...f, supplierId: val === '__none__' ? '' : val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tanpa Supplier</SelectItem>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-buy-price">Harga Beli</Label>
                <Input
                  id="prod-buy-price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.buyPrice}
                  onChange={(e) => setForm((f) => ({ ...f, buyPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-sell-price">Harga Jual *</Label>
                <Input
                  id="prod-sell-price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.sellPrice}
                  onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-stock">Stok</Label>
                <Input
                  id="prod-stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-min-stock">Min. Stok</Label>
                <Input
                  id="prod-min-stock"
                  type="number"
                  min="0"
                  placeholder="5"
                  value={form.minStock}
                  onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-unit">Satuan</Label>
                <Input
                  id="prod-unit"
                  placeholder="pcs"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
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
              {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.
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
