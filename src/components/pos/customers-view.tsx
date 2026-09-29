'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  Search,
  Loader2,
  X,
  Star,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Eye,
  Minus,
  Crown,
  Award,
  Gem,
  Medal,
  Coins,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { formatRupiah, formatDate, formatDateTime } from '@/lib/utils'
import type { Customer, Transaction } from '@/lib/types'
import EmptyState from '@/components/pos/empty-state'

// Avatar color based on name hash
const getAvatarColor = (name: string) => {
  const colors = [
    'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600',
    'from-teal-400 to-teal-600',
    'from-rose-400 to-rose-600',
    'from-violet-400 to-violet-600',
    'from-cyan-400 to-cyan-600',
    'from-orange-400 to-orange-600',
    'from-pink-400 to-pink-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const formatPhone = (phone?: string) => {
  if (!phone) return '-'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('62')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9)}`
  }
  if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`
  }
  return phone
}

// Loyalty tier config - based on totalSpent (in Rupiah)
const TIERS = [
  { key: 'platinum', label: 'Platinum', minSpent: 5_000_000, icon: Crown, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500', ring: 'ring-2 ring-emerald-400/50', glow: true, benefits: 'Diskon 10%, Gratis ongkir, Prioritas layanan, Hadiah bulanan' },
  { key: 'gold', label: 'Gold', minSpent: 2_000_000, icon: Award, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', dot: 'bg-yellow-500', ring: '', glow: false, benefits: 'Diskon 5%, Gratis ongkir, Promo eksklusif' },
  { key: 'silver', label: 'Silver', minSpent: 500_000, icon: Medal, color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300', dot: 'bg-gray-400', ring: '', glow: false, benefits: 'Diskon 2%, Promo bulanan' },
  { key: 'bronze', label: 'Bronze', minSpent: 0, icon: Gem, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-400', ring: '', glow: false, benefits: 'Poin setiap transaksi' },
]

const getLoyaltyTierBySpent = (totalSpent: number) => {
  for (const tier of TIERS) {
    if (totalSpent >= tier.minSpent) return tier
  }
  return TIERS[TIERS.length - 1]
}

const getNextTier = (totalSpent: number) => {
  const currentTier = getLoyaltyTierBySpent(totalSpent)
  const currentIdx = TIERS.findIndex(t => t.key === currentTier.key)
  if (currentIdx === 0) return null // already at top
  return TIERS[currentIdx - 1]
}

const getTierProgress = (totalSpent: number) => {
  const nextTier = getNextTier(totalSpent)
  if (!nextTier) return 100
  const currentTier = getLoyaltyTierBySpent(totalSpent)
  const range = nextTier.minSpent - currentTier.minSpent
  const progress = range > 0 ? ((totalSpent - currentTier.minSpent) / range) * 100 : 0
  return Math.min(100, Math.max(0, progress))
}

// Points-based tier for backward compatibility
const getLoyaltyTier = (points: number) => {
  if (points >= 1000) return { label: 'Platinum', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500' }
  if (points >= 500) return { label: 'Gold', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' }
  if (points >= 100) return { label: 'Silver', color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300', dot: 'bg-gray-400' }
  return { label: 'Bronze', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-400' }
}

// Animated number component
function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, type: 'spring' }}
      className="inline-block"
    >
      {value}
    </motion.span>
  )
}

export default function CustomersView() {
  const { user } = useAppStore()
  const isAdmin = user?.role === 'ADMIN'

  // List state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [tierFilter, setTierFilter] = useState<string>('ALL')

  // Stats
  const [stats, setStats] = useState({ totalCustomers: 0, totalPoints: 0, activeCustomers: 0 })

  // Dialogs
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailCustomer, setDetailCustomer] = useState<(Customer & { transactions?: Transaction[] }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formNote, setFormNote] = useState('')

  // Points adjustment
  const [pointsAmount, setPointsAmount] = useState('')
  const [pointsReason, setPointsReason] = useState('')
  const [adjustingPoints, setAdjustingPoints] = useState(false)

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        sortBy,
        sortDir: sortBy === 'points' || sortBy === 'lastVisitAt' || sortBy === 'totalSpent' ? 'desc' : 'asc',
      })
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()
      if (data.success) {
        setCustomers(data.customers)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [search, sortBy, page])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?limit=9999')
      const data = await res.json()
      if (data.success) {
        const allCustomers = data.customers
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const active = allCustomers.filter(
          (c: Customer) => c.lastVisitAt && new Date(c.lastVisitAt) >= thirtyDaysAgo
        ).length
        const totalPts = allCustomers.reduce((sum: number, c: Customer) => sum + (c.points || 0), 0)
        setStats({
          totalCustomers: data.pagination.total,
          totalPoints: totalPts,
          activeCustomers: active,
        })
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Debounced search
  useEffect(() => {
    setPage(1)
    const timer = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Filter customers by tier
  const filteredCustomers = useMemo(() => {
    if (tierFilter === 'ALL') return customers
    const tierConfig = TIERS.find(t => t.key === tierFilter)
    if (!tierConfig) return customers
    const nextTierIdx = TIERS.findIndex(t => t.key === tierFilter)
    const nextTier = nextTierIdx > 0 ? TIERS[nextTierIdx - 1] : null
    if (nextTier) {
      return customers.filter(c => c.totalSpent >= tierConfig.minSpent && c.totalSpent < nextTier.minSpent)
    }
    return customers.filter(c => c.totalSpent >= tierConfig.minSpent)
  }, [customers, tierFilter])

  const openAddForm = () => {
    setEditingCustomer(null)
    setFormName('')
    setFormPhone('')
    setFormEmail('')
    setFormAddress('')
    setFormNote('')
    setShowForm(true)
  }

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormName(customer.name)
    setFormPhone(customer.phone || '')
    setFormEmail(customer.email || '')
    setFormAddress(customer.address || '')
    setFormNote(customer.note || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Nama pelanggan wajib diisi')
      return
    }

    setSaving(true)
    try {
      const body = {
        name: formName,
        phone: formPhone || undefined,
        email: formEmail || undefined,
        address: formAddress || undefined,
        note: formNote || undefined,
      }

      let res: Response
      if (editingCustomer) {
        res = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      const data = await res.json()
      if (data.success) {
        toast.success(editingCustomer ? 'Pelanggan berhasil diperbarui' : 'Pelanggan berhasil ditambahkan')
        setShowForm(false)
        fetchCustomers()
        fetchStats()
      } else {
        toast.error(data.message || 'Gagal menyimpan pelanggan')
      }
    } catch {
      toast.error('Gagal terhubung ke server')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteConfirm = (customer: Customer) => {
    setDeletingCustomer(customer)
    setShowDelete(true)
  }

  const handleDelete = async () => {
    if (!deletingCustomer) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/customers/${deletingCustomer.id}?userRole=${user?.role}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Pelanggan berhasil dihapus')
        setShowDelete(false)
        setDeletingCustomer(null)
        fetchCustomers()
        fetchStats()
      } else {
        toast.error(data.message || 'Gagal menghapus pelanggan')
      }
    } catch {
      toast.error('Gagal terhubung ke server')
    } finally {
      setDeleting(false)
    }
  }

  const openDetail = async (customer: Customer) => {
    setDetailCustomer(null)
    setShowDetail(true)
    try {
      const res = await fetch(`/api/customers/${customer.id}`)
      const data = await res.json()
      if (data.success) {
        setDetailCustomer(data.customer)
      }
    } catch {
      toast.error('Gagal memuat detail pelanggan')
    }
  }

  const handleAdjustPoints = async (isAdd: boolean) => {
    if (!detailCustomer) return
    const amount = parseInt(pointsAmount, 10)
    if (!amount || amount <= 0) {
      toast.error('Masukkan jumlah poin yang valid')
      return
    }
    if (!pointsReason.trim()) {
      toast.error('Masukkan alasan penyesuaian poin')
      return
    }

    setAdjustingPoints(true)
    try {
      const res = await fetch(`/api/customers/${detailCustomer.id}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: isAdd ? amount : -amount, reason: pointsReason }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Poin berhasil ${isAdd ? 'ditambahkan' : 'dikurangi'}`)
        setPointsAmount('')
        setPointsReason('')
        // Refresh detail
        openDetail(detailCustomer)
        fetchCustomers()
      } else {
        toast.error(data.message || 'Gagal menyesuaikan poin')
      }
    } catch {
      toast.error('Gagal terhubung ke server')
    } finally {
      setAdjustingPoints(false)
    }
  }

  const maxVisitCount = useMemo(() => {
    return Math.max(...customers.map(c => c.visitCount), 1)
  }, [customers])

  const statsCards = [
    {
      label: 'Total Pelanggan',
      value: stats.totalCustomers,
      icon: Users,
      gradient: 'from-emerald-500 to-emerald-700',
      shadow: 'shadow-emerald-500/20',
    },
    {
      label: 'Poin Total Terkumpul',
      value: `${stats.totalPoints.toLocaleString('id-ID')} poin`,
      icon: Star,
      gradient: 'from-amber-500 to-amber-700',
      shadow: 'shadow-amber-500/20',
    },
    {
      label: 'Pelanggan Aktif Bulan Ini',
      value: stats.activeCustomers,
      icon: UserCheck,
      gradient: 'from-emerald-600 to-teal-600',
      shadow: 'shadow-emerald-600/20',
    },
  ]

  // Tier badge component with tooltip
  const TierBadge = ({ totalSpent, size = 'sm' }: { totalSpent: number; size?: 'sm' | 'md' }) => {
    const tier = getLoyaltyTierBySpent(totalSpent)
    const TierIcon = tier.icon
    const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0 gap-1' : 'text-xs px-2 py-0.5 gap-1.5'
    const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center self-start font-semibold rounded-full mt-0.5 ${tier.color} ${sizeClasses} ${tier.glow ? 'ring-2 ring-emerald-400/30 shadow-sm shadow-emerald-500/20' : ''} cursor-help`}>
              <TierIcon className={iconSize} />
              {tier.label}
              {tier.glow && <Sparkles className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-500`} />}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            <p className="font-semibold mb-1">{tier.label} Tier</p>
            <p className="text-gray-500 dark:text-gray-400">{tier.benefits}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Tier progress bar component
  const TierProgressBar = ({ totalSpent }: { totalSpent: number }) => {
    const progress = getTierProgress(totalSpent)
    const nextTier = getNextTier(totalSpent)
    const currentTier = getLoyaltyTierBySpent(totalSpent)

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${currentTier.color} px-2 py-0.5 rounded-full`}>
            {currentTier.label}
          </span>
          {nextTier ? (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {formatRupiah(nextTier.minSpent - totalSpent)} lagi ke {nextTier.label}
            </span>
          ) : (
            <span className="text-[10px] text-emerald-500 font-medium">Tier tertinggi!</span>
          )}
        </div>
        <div className="relative">
          <Progress value={progress} className="h-2 bg-gray-100 dark:bg-gray-800" />
          <div
            className="absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${statsCards[0].gradient} flex items-center justify-center shadow-lg ${statsCards[0].shadow}`}>
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manajemen Pelanggan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola data pelanggan dan loyalitas</p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={openAddForm} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
            <Plus className="w-4 h-4" />
            Tambah Pelanggan
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

      {/* Search, Sort, and Tier Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari nama atau nomor telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nama</SelectItem>
            <SelectItem value="points">Poin</SelectItem>
            <SelectItem value="lastVisitAt">Kunjungan Terakhir</SelectItem>
            <SelectItem value="totalSpent">Total Belanja</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            <SelectValue placeholder="Semua Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Tier</SelectItem>
            <SelectItem value="platinum">💎 Platinum</SelectItem>
            <SelectItem value="gold">🥇 Gold</SelectItem>
            <SelectItem value="silver">🥈 Silver</SelectItem>
            <SelectItem value="bronze">🥉 Bronze</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer Table / Cards */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Poin</TableHead>
                  <TableHead className="text-right">Total Belanja</TableHead>
                  <TableHead className="text-center">Kunjungan</TableHead>
                  <TableHead>Kunjungan Terakhir</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCustomers.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9}>
                      <EmptyState icon={Users} title="Belum ada pelanggan" description="Tambahkan pelanggan pertama Anda" />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer, idx) => (
                    <TableRow key={customer.id} className="table-row-hover cursor-pointer" onClick={() => openDetail(customer)}>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {(page - 1) * 10 + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(customer.name)} flex items-center justify-center shrink-0`}>
                            <span className="text-xs font-bold text-white">{getInitials(customer.name)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{customer.name}</span>
                            <TierBadge totalSpent={customer.totalSpent} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{formatPhone(customer.phone)}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[180px]">{customer.email || '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          <Coins className="w-3 h-3" />
                          <AnimatedNumber value={customer.points} />
                          <span className="text-[10px] text-amber-500 dark:text-amber-500">poin</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatRupiah(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${(customer.visitCount / maxVisitCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">{customer.visitCount}x</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.lastVisitAt ? formatDateTime(customer.lastVisitAt) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-emerald-600 cursor-pointer" onClick={() => openDetail(customer)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 cursor-pointer" onClick={() => openEditForm(customer)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 cursor-pointer" onClick={() => openDeleteConfirm(customer)}>
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
            ) : filteredCustomers.length === 0 ? (
              <EmptyState icon={Users} title="Belum ada pelanggan" description="Tambahkan pelanggan pertama Anda" />
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors relative"
                  onClick={() => openDetail(customer)}
                >
                  {/* Tier badge top-right */}
                  <div className="absolute top-3 right-3">
                    <TierBadge totalSpent={customer.totalSpent} size="md" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(customer.name)} flex items-center justify-center shrink-0`}>
                        <span className="text-xs font-bold text-white">{getInitials(customer.name)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{customer.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatPhone(customer.phone)}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                      <Coins className="w-3 h-3" />
                      <AnimatedNumber value={customer.points} />
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatRupiah(customer.totalSpent)}</span>
                    <span>•</span>
                    <span>{customer.visitCount}x kunjungan</span>
                    {customer.lastVisitAt && (
                      <>
                        <span>•</span>
                        <span>{formatDate(customer.lastVisitAt)}</span>
                      </>
                    )}
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

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle>
            <DialogDescription className="sr-only">Form pelanggan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Nama <span className="text-red-500">*</span></Label>
              <Input
                id="cust-name"
                placeholder="Nama pelanggan"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Nomor Telepon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="cust-phone"
                  placeholder="08xx atau 62xx"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                placeholder="email@contoh.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-address">Alamat</Label>
              <Textarea
                id="cust-address"
                placeholder="Alamat lengkap"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-note">Catatan</Label>
              <Textarea
                id="cust-note"
                placeholder="Catatan tambahan"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                rows={2}
              />
            </div>

            {/* Tier progress bar in edit form */}
            {editingCustomer && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Status Loyalitas</p>
                <TierProgressBar totalSpent={editingCustomer.totalSpent} />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="dark:border-gray-600 dark:text-gray-300 cursor-pointer">
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingCustomer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pelanggan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pelanggan <strong>{deletingCustomer?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
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
          {detailCustomer ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(detailCustomer.name)} flex items-center justify-center`}>
                    <span className="text-sm font-bold text-white">{getInitials(detailCustomer.name)}</span>
                  </div>
                  {detailCustomer.name}
                </DialogTitle>
                <DialogDescription className="sr-only">Detail pelanggan</DialogDescription>
              </DialogHeader>

              {/* Customer Info Card */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{formatPhone(detailCustomer.phone)}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{detailCustomer.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{detailCustomer.address || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Bergabung {formatDate(detailCustomer.createdAt)}</span>
                  </div>
                </div>
                {detailCustomer.note && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">Catatan: {detailCustomer.note}</p>
                )}
              </div>

              {/* Tier Progress Section */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Status Loyalitas
                  </p>
                  <TierBadge totalSpent={detailCustomer.totalSpent} size="md" />
                </div>
                <TierProgressBar totalSpent={detailCustomer.totalSpent} />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-3 text-center">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Belanja</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatRupiah(detailCustomer.totalSpent)}</p>
                </div>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/30 p-3 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Kunjungan</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">{detailCustomer.visitCount}x</p>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 p-3 text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Poin Saat Ini</p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-1 flex items-center justify-center gap-1">
                    <Coins className="w-4 h-4" />
                    <AnimatedNumber value={detailCustomer.points} />
                  </p>
                </div>
                <div className="rounded-xl bg-violet-50 dark:bg-violet-900/30 p-3 text-center">
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Rata-rata Belanja</p>
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300 mt-1">
                    {detailCustomer.visitCount > 0 ? formatRupiah(detailCustomer.totalSpent / detailCustomer.visitCount) : '-' }
                  </p>
                </div>
              </div>

              {/* Points Adjustment Section */}
              {isAdmin && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Penyesuaian Poin
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      type="number"
                      placeholder="Jumlah poin"
                      value={pointsAmount}
                      onChange={(e) => setPointsAmount(e.target.value)}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      min={1}
                    />
                    <Input
                      placeholder="Alasan penyesuaian"
                      value={pointsReason}
                      onChange={(e) => setPointsReason(e.target.value)}
                      className="sm:col-span-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 cursor-pointer"
                      onClick={() => handleAdjustPoints(true)}
                      disabled={adjustingPoints}
                    >
                      {adjustingPoints ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Tambah Poin
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30 cursor-pointer"
                      onClick={() => handleAdjustPoints(false)}
                      disabled={adjustingPoints}
                    >
                      {adjustingPoints ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minus className="w-3.5 h-3.5" />}
                      Kurangi Poin
                    </Button>
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Transaksi Terakhir
                </h4>
                {detailCustomer.transactions && detailCustomer.transactions.length > 0 ? (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                    {detailCustomer.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tx.transactionNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(tx.createdAt)} • {tx.transactionItems?.length || 0} item
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(tx.totalAmount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Belum ada transaksi</p>
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
