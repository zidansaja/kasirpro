'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Truck,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Package,
  Eye,
  User,
  CheckCircle2,
  Info,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { formatDate, formatRupiah } from '@/lib/utils'
import type { Supplier, Product } from '@/lib/types'

// Avatar color based on name hash - 5 colors
const getAvatarColor = (name: string) => {
  const colors = [
    'from-emerald-400 to-emerald-600',
    'from-orange-400 to-orange-600',
    'from-cyan-400 to-cyan-600',
    'from-rose-400 to-rose-600',
    'from-violet-400 to-violet-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Empty State component
function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
      <Icon className="w-12 h-12 mb-3 opacity-50" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs mt-1">{description}</p>
    </div>
  )
}

export default function SuppliersView() {
  const { user } = useAppStore()
  const isAdmin = user?.role === 'ADMIN'

  // List state
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Stats
  const [stats, setStats] = useState({ totalSuppliers: 0, withPhone: 0, totalProducts: 0 })

  // Dialogs
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailSupplier, setDetailSupplier] = useState<(Supplier & { products?: Product[] }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formContactPerson, setFormContactPerson] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formNote, setFormNote] = useState('')

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      })
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/suppliers?${params}`)
      const data = await res.json()
      if (data.success) {
        setSuppliers(data.suppliers)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [search, page])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers?limit=9999')
      const data = await res.json()
      if (data.success) {
        const allSuppliers = data.suppliers
        const withPhone = allSuppliers.filter((s: Supplier) => s.phone && s.phone.trim()).length
        const totalProducts = allSuppliers.reduce((sum: number, s: Supplier) => sum + (s._count?.products || 0), 0)
        setStats({
          totalSuppliers: data.pagination.total,
          withPhone,
          totalProducts,
        })
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Debounced search
  useEffect(() => {
    setPage(1)
    const timer = setTimeout(fetchSuppliers, 300)
    return () => clearTimeout(timer)
  }, [search])

  const openAddForm = () => {
    setEditingSupplier(null)
    setFormName('')
    setFormContactPerson('')
    setFormPhone('')
    setFormEmail('')
    setFormAddress('')
    setFormNote('')
    setShowForm(true)
  }

  const openEditForm = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormName(supplier.name)
    setFormContactPerson(supplier.contactPerson || '')
    setFormPhone(supplier.phone || '')
    setFormEmail(supplier.email || '')
    setFormAddress(supplier.address || '')
    setFormNote(supplier.note || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Nama supplier wajib diisi')
      return
    }

    setSaving(true)
    try {
      const body = {
        name: formName,
        contactPerson: formContactPerson || undefined,
        phone: formPhone || undefined,
        email: formEmail || undefined,
        address: formAddress || undefined,
        note: formNote || undefined,
      }

      let res: Response
      if (editingSupplier) {
        res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const data = await res.json()
      if (data.success) {
        toast.success(editingSupplier ? 'Supplier berhasil diperbarui' : 'Supplier berhasil ditambahkan')
        setShowForm(false)
        fetchSuppliers()
        fetchStats()
      } else {
        toast.error(data.message || 'Gagal menyimpan supplier')
      }
    } catch {
      toast.error('Gagal terhubung ke server')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteConfirm = (supplier: Supplier) => {
    setDeletingSupplier(supplier)
    setShowDelete(true)
  }

  const handleDelete = async () => {
    if (!deletingSupplier) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/suppliers/${deletingSupplier.id}?userRole=${user?.role}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Supplier berhasil dihapus')
        setShowDelete(false)
        setDeletingSupplier(null)
        fetchSuppliers()
        fetchStats()
      } else {
        toast.error(data.message || 'Gagal menghapus supplier')
      }
    } catch {
      toast.error('Gagal terhubung ke server')
    } finally {
      setDeleting(false)
    }
  }

  const openDetail = async (supplier: Supplier) => {
    setDetailSupplier(null)
    setShowDetail(true)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`)
      const data = await res.json()
      if (data.success) {
        setDetailSupplier(data.supplier)
      }
    } catch {
      toast.error('Gagal memuat detail supplier')
    }
  }

  const statsCards = [
    {
      label: 'Total Supplier',
      value: stats.totalSuppliers,
      icon: Truck,
      gradient: 'from-emerald-500 to-emerald-700',
      shadow: 'shadow-emerald-500/20',
    },
    {
      label: 'Produk Terhubung',
      value: stats.totalProducts,
      icon: Package,
      gradient: 'from-teal-500 to-teal-700',
      shadow: 'shadow-teal-500/20',
    },
    {
      label: 'Supplier Aktif',
      value: stats.withPhone,
      icon: CheckCircle2,
      gradient: 'from-emerald-600 to-teal-600',
      shadow: 'shadow-emerald-600/20',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${statsCards[0].gradient} flex items-center justify-center shadow-lg ${statsCards[0].shadow}`}>
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manajemen Supplier</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola data supplier produk</p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={openAddForm} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
            <Plus className="w-4 h-4" />
            Tambah Supplier
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <div className="relative overflow-hidden rounded-2xl shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl card-shine">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient}`} />
              <div className="absolute -top-2 -right-2 opacity-15 text-white pointer-events-none">
                <stat.icon className="w-12 h-12" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative z-10 p-5 flex flex-col min-h-[100px] justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1 tracking-tight">{stat.value}</p>
                </div>
                <p className="text-xs text-white/70">&nbsp;</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari nama, kontak, atau telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Supplier Table / Cards */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Produk</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="w-24 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : suppliers.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8}>
                      <EmptyState icon={Truck} title="Belum ada supplier" description="Tambahkan supplier pertama Anda" />
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier, idx) => (
                    <TableRow key={supplier.id} className={`table-row-hover cursor-pointer ${idx % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}`} onClick={() => openDetail(supplier)}>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {(page - 1) * 10 + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(supplier.name)} flex items-center justify-center shrink-0`}>
                            <span className="text-xs font-bold text-white">{supplier.name[0]?.toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{supplier.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {supplier.contactPerson ? (
                          <span className="inline-flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            {supplier.contactPerson}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{supplier.phone || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[180px]">{supplier.email || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {supplier._count?.products || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{supplier.address || '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-emerald-600 cursor-pointer" onClick={() => openDetail(supplier)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 cursor-pointer" onClick={() => openEditForm(supplier)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 cursor-pointer" onClick={() => openDeleteConfirm(supplier)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <div className="flex gap-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              ))
            ) : suppliers.length === 0 ? (
              <EmptyState icon={Truck} title="Belum ada supplier" description="Tambahkan supplier pertama Anda" />
            ) : (
              suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors border-l-4 border-l-emerald-400"
                  onClick={() => openDetail(supplier)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(supplier.name)} flex items-center justify-center shrink-0`}>
                        <span className="text-xs font-bold text-white">{supplier.name[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{supplier.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{supplier.contactPerson || '-'}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {supplier._count?.products || 0} produk
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {supplier.phone && <span>{supplier.phone}</span>}
                    {supplier.email && <>
                      {supplier.phone && <span>•</span>}
                      <span className="truncate max-w-[140px]">{supplier.email}</span>
                    </>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Menampilkan {(page - 1) * 10 + 1}-{Math.min(page * 10, total)} dari {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm" className="h-8 text-xs dark:border-gray-600 dark:text-gray-300"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline" size="sm" className="h-8 text-xs dark:border-gray-600 dark:text-gray-300"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Callout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4">
          <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Tips</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Gunakan Supplier untuk melacak sumber produk Anda. Hubungkan supplier ke produk agar pembelian lebih terorganisir.</p>
          </div>
        </div>
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}</DialogTitle>
            <DialogDescription className="sr-only">Form supplier</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sup-name">Nama <span className="text-red-500">*</span></Label>
              <Input
                id="sup-name"
                placeholder="Nama supplier"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-contact">Kontak Person</Label>
              <Input
                id="sup-contact"
                placeholder="Nama kontak person"
                value={formContactPerson}
                onChange={(e) => setFormContactPerson(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-phone">Telepon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="sup-phone"
                  placeholder="08xx atau 62xx"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-email">Email</Label>
              <Input
                id="sup-email"
                type="email"
                placeholder="email@contoh.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-address">Alamat</Label>
              <Textarea
                id="sup-address"
                placeholder="Alamat lengkap"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-note">Catatan</Label>
              <Textarea
                id="sup-note"
                placeholder="Catatan tambahan"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="dark:border-gray-600 dark:text-gray-300 cursor-pointer">
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingSupplier ? 'Simpan Perubahan' : 'Tambah Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus supplier <strong>{deletingSupplier?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="dark:border-gray-600 dark:text-gray-300 cursor-pointer">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailSupplier ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(detailSupplier.name)} flex items-center justify-center`}>
                    <span className="text-sm font-bold text-white">{detailSupplier.name[0]?.toUpperCase()}</span>
                  </div>
                  {detailSupplier.name}
                </DialogTitle>
                <DialogDescription className="sr-only">Detail supplier</DialogDescription>
              </DialogHeader>

              {/* Supplier Info Card */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{detailSupplier.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{detailSupplier.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{detailSupplier.address || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Kontak: {detailSupplier.contactPerson || '-'}</span>
                  </div>
                </div>
                {detailSupplier.note && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">Catatan: {detailSupplier.note}</p>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-3 text-center">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Produk</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">{detailSupplier._count?.products || 0}</p>
                </div>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-3 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Bergabung</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">{formatDate(detailSupplier.createdAt)}</p>
                </div>
              </div>

              {/* Products Supplied */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Produk dari Supplier
                </h4>
                {detailSupplier.products && detailSupplier.products.length > 0 ? (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                    {detailSupplier.products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            SKU: {product.sku} • Stok: {product.stock} {product.unit}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(product.sellPrice)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Belum ada produk terhubung</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
