'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, Loader2, Search, Users, Shield, UserCheck } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
import { toast } from 'sonner'
import type { User } from '@/lib/types'
import EmptyState from '@/components/pos/empty-state'
import { formatDateTime } from '@/lib/utils'

interface UserAddFormData {
  username: string
  name: string
  password: string
  role: 'ADMIN' | 'KASIR'
}

interface UserEditFormData {
  name: string
  password: string
  role: 'ADMIN' | 'KASIR'
  active: boolean
}

const emptyAddForm: UserAddFormData = {
  username: '',
  name: '',
  password: '',
  role: 'KASIR',
}

const emptyEditForm: UserEditFormData = {
  name: '',
  password: '',
  role: 'KASIR',
  active: true,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRelativeTime(dateStr: string): string {
  try {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins} menit lalu`
    if (diffHours < 24) return `${diffHours} jam lalu`
    if (diffDays < 7) return `${diffDays} hari lalu`
    return formatDateTime(dateStr, 'dd MMM yyyy')
  } catch {
    return '-'
  }
}

// Role card component for dialogs
function RoleCard({
  role,
  selected,
  onSelect,
}: {
  role: 'ADMIN' | 'KASIR'
  selected: boolean
  onSelect: () => void
}) {
  const isAdmin = role === 'ADMIN'
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 relative rounded-xl border-2 p-4 text-left cursor-pointer transition-all ${
        selected
          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
        isAdmin
          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
          : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
      }`}>
        {isAdmin ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
      </div>
      <p className={`font-semibold text-sm ${
        selected
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {role}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {isAdmin ? 'Akses penuh sistem' : 'Akses kasir & transaksi'}
      </p>
    </button>
  )
}

export default function UsersView() {
  const { user: currentUser } = useAppStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Add dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addForm, setAddForm] = useState<UserAddFormData>(emptyAddForm)

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<UserEditFormData>(emptyEditForm)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const res = await fetch(`/api/users?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
      }
    } catch {
      toast.error('Gagal memuat data pengguna')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openAddDialog = () => {
    setAddForm(emptyAddForm)
    setAddDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditForm({
      name: user.name,
      password: '',
      role: user.role,
      active: user.active,
    })
    setEditDialogOpen(true)
  }

  const handleAdd = async () => {
    if (!addForm.username.trim()) {
      toast.error('Username wajib diisi')
      return
    }
    if (!addForm.name.trim()) {
      toast.error('Nama wajib diisi')
      return
    }
    if (!addForm.password) {
      toast.error('Password wajib diisi')
      return
    }
    if (addForm.password.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: addForm.username.trim(),
          name: addForm.name.trim(),
          password: addForm.password,
          role: addForm.role,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Pengguna berhasil ditambahkan')
        setAddDialogOpen(false)
        fetchUsers()
      } else {
        toast.error(data.message || 'Gagal menambahkan pengguna')
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editingUser) return
    if (!editForm.name.trim()) {
      toast.error('Nama wajib diisi')
      return
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name.trim(),
        role: editForm.role,
        active: editForm.active,
      }
      if (editForm.password) {
        payload.password = editForm.password
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Pengguna berhasil diperbarui')
        setEditDialogOpen(false)
        fetchUsers()
      } else {
        toast.error(data.message || 'Gagal memperbarui pengguna')
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    if (currentUser?.id === deleteId) {
      toast.error('Anda tidak dapat menghapus akun sendiri')
      setDeleteId(null)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Pengguna berhasil dihapus')
        setDeleteId(null)
        fetchUsers()
      } else {
        toast.error(data.message || 'Gagal menghapus pengguna')
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi')
    } finally {
      setDeleting(false)
    }
  }

  const stats = useMemo(() => {
    const totalUsers = users.length
    const activeUsers = users.filter((u) => u.active).length
    const adminCount = users.filter((u) => u.role === 'ADMIN').length
    return { totalUsers, activeUsers, adminCount }
  }, [users])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manajemen Pengguna</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola akun pengguna sistem</p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pengguna
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Cari username atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                <TableHead>Pengguna</TableHead>
                <TableHead className="hidden sm:table-cell">Nama</TableHead>
                <TableHead className="text-center">Role</TableHead>
                <TableHead className="text-center hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="table-row-hover">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState icon={Users} title="Belum ada pengguna" description="Tambahkan pengguna pertama" />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br text-white text-xs font-bold ${
                          user.role === 'ADMIN'
                            ? 'from-emerald-400 to-emerald-600'
                            : 'from-blue-400 to-blue-600'
                        }`}>
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-900 dark:text-gray-100">@{user.username}</span>
                            <span className={`relative flex h-2 w-2 shrink-0 ${
                              user.active
                                ? ''
                                : 'opacity-40'
                            }`}>
                              {user.active && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                user.active ? 'bg-emerald-500' : 'bg-gray-400'
                              }`} />
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{user.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div>
                        <span className="text-gray-700 dark:text-gray-300">{user.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`relative flex h-2 w-2 shrink-0 ${
                            user.active ? '' : 'opacity-40'
                          }`}>
                            {user.active && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${
                              user.active ? 'bg-emerald-500' : 'bg-gray-400'
                            }`} />
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">Terakhir aktif: {getRelativeTime(user.updatedAt)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}
                        className={user.role === 'ADMIN' ? 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      {user.active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {currentUser?.id === user.id ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            disabled
                            title="Anda tidak dapat menghapus akun sendiri"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                            onClick={() => setDeleteId(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && users.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total {stats.totalUsers} pengguna • {stats.activeUsers} aktif • {stats.adminCount} admin
            </p>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription className="sr-only">Formulir tambah pengguna baru</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-username">Username *</Label>
              <Input
                id="add-username"
                placeholder="Masukkan username"
                value={addForm.username}
                onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-name">Nama *</Label>
              <Input
                id="add-name"
                placeholder="Masukkan nama lengkap"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password *</Label>
              <Input
                id="add-password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={addForm.password}
                onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-3">
                <RoleCard
                  role="ADMIN"
                  selected={addForm.role === 'ADMIN'}
                  onSelect={() => setAddForm((f) => ({ ...f, role: 'ADMIN' }))}
                />
                <RoleCard
                  role="KASIR"
                  selected={addForm.role === 'KASIR'}
                  onSelect={() => setAddForm((f) => ({ ...f, role: 'KASIR' }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="cursor-pointer">
              Batal
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tambah Pengguna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription className="sr-only">Formulir edit pengguna</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 rounded-md text-sm text-gray-700 dark:text-gray-300 font-mono">
                  @{editingUser.username}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nama *</Label>
                <Input
                  id="edit-name"
                  placeholder="Masukkan nama lengkap"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Password Baru</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Kosongkan jika tidak diubah"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">Kosongkan jika tidak ingin mengubah password</p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex gap-3">
                  <RoleCard
                    role="ADMIN"
                    selected={editForm.role === 'ADMIN'}
                    onSelect={() => setEditForm((f) => ({ ...f, role: 'ADMIN' }))}
                  />
                  <RoleCard
                    role="KASIR"
                    selected={editForm.role === 'KASIR'}
                    onSelect={() => setEditForm((f) => ({ ...f, role: 'KASIR' }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div>
                  <Label htmlFor="edit-active" className="cursor-pointer">Status Aktif</Label>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Nonaktifkan untuk menonaktifkan akses pengguna</p>
                </div>
                <Switch
                  id="edit-active"
                  checked={editForm.active}
                  onCheckedChange={(checked) => setEditForm((f) => ({ ...f, active: checked }))}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="cursor-pointer">
              Batal
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.
              <br />
              <span className="text-amber-600 dark:text-amber-400 font-medium">Catatan: Admin terakhir tidak dapat dihapus.</span>
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
