'use client'

import { useState, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  ClipboardCheck,
  RotateCcw,
  BarChart3,
  Users,
  UsersRound,
  LogOut,
  Menu,
  Store,
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings,
  UserCircle,
  Moon,
  Sun,
  Wallet,
  Bell,
  Keyboard,
  Clock,
  Database,
  Truck,
  ShoppingBag,
  ScrollText,
  Home,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Loader2,
  Lock,
  Save,
  User,
  Shield,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { ViewType } from '@/lib/types'

interface NavItem {
  label: string
  view: ViewType
  icon: ReactNode
  adminOnly?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Utama',
    items: [
      { label: 'Dashboard', view: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Penjualan', view: 'pos', icon: <ShoppingCart className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Manajemen',
    items: [
      { label: 'Riwayat Transaksi', view: 'transactions', icon: <FileText className="w-5 h-5" />, adminOnly: true },
      { label: 'Produk', view: 'products', icon: <Package className="w-5 h-5" />, adminOnly: true },
      { label: 'Kategori', view: 'categories', icon: <Tags className="w-5 h-5" />, adminOnly: true },
    ],
  },
  {
    title: 'Operasional',
    items: [
      { label: 'Stok Opname', view: 'stock-opname', icon: <ClipboardCheck className="w-5 h-5" />, adminOnly: true },
      { label: 'Retur', view: 'returns', icon: <RotateCcw className="w-5 h-5" />, adminOnly: true },
      { label: 'Pengeluaran', view: 'expenses', icon: <Wallet className="w-5 h-5" />, adminOnly: true },
    ],
  },
  {
    title: 'Bisnis',
    items: [
      { label: 'Pelanggan', view: 'customers', icon: <UsersRound className="w-5 h-5" />, adminOnly: true },
      { label: 'Supplier', view: 'suppliers', icon: <Truck className="w-5 h-5" />, adminOnly: true },
      { label: 'Pembelian', view: 'purchase-orders', icon: <ShoppingBag className="w-5 h-5" />, adminOnly: true },
    ],
  },
  {
    title: 'Laporan & Shift',
    items: [
      { label: 'Shift', view: 'shifts', icon: <Clock className="w-5 h-5" /> },
      { label: 'Laporan', view: 'reports', icon: <BarChart3 className="w-5 h-5" />, adminOnly: true },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { label: 'Pengguna', view: 'users', icon: <Users className="w-5 h-5" />, adminOnly: true },
      { label: 'Audit Log', view: 'audit-logs', icon: <ScrollText className="w-5 h-5" />, adminOnly: true },
      { label: 'Backup', view: 'backup', icon: <Database className="w-5 h-5" />, adminOnly: true },
      { label: 'Pengaturan', view: 'settings', icon: <Settings className="w-5 h-5" />, adminOnly: true },
    ],
  },
]

// Flat list for label lookups
const allNavItems: NavItem[] = navSections.flatMap((s) => s.items)

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { currentView, setCurrentView, user } = useAppStore()
  const isAdmin = user?.role === 'ADMIN'

  const handleNav = (view: ViewType) => {
    setCurrentView(view)
    onNavigate?.()
  }

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navSections.map((section) => {
        const filteredItems = section.items.filter((item) => !item.adminOnly || isAdmin)
        if (filteredItems.length === 0) return null

        return (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {section.title}
              </p>
            )}
            {collapsed && <div className="pt-2" />}
            {filteredItems.map((item) => {
              const isActive = currentView === item.view
              return (
                <TooltipProvider key={item.view} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleNav(item.view)}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer relative
                          ${isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                          }
                          ${collapsed ? 'justify-center' : ''}
                        `}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-emerald-500 transition-all duration-200" />
                        )}
                        {isActive && (
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-l-full bg-emerald-500/50" />
                        )}
                        {item.icon}
                        {!collapsed && <span>{item.label}</span>}
                      </button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

function RealtimeClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fullStr = format(now, "EEEE, d MMM yyyy • HH:mm:ss 'WIB'", { locale: localeId })
  const shortStr = format(now, 'HH:mm', { locale: localeId })

  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      <span className="hidden md:inline">{fullStr}</span>
      <span className="md:hidden">{shortStr}</span>
    </span>
  )
}

const emptySubscribe = () => () => {}

function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
    >
      <Sun className={`h-4 w-4 transition-all duration-300 ${isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
      <Moon className={`absolute h-4 w-4 transition-all duration-300 ${isDark ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
    </Button>
  )
}

function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <div className="flex items-center gap-1.5">
      {isOnline ? (
        <Wifi className="w-3 h-3 text-emerald-500" />
      ) : (
        <WifiOff className="w-3 h-3 text-red-400" />
      )}
      <span className={`text-[11px] font-medium ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, currentView, setCurrentView } = useAppStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [footerDate] = useState(() => format(new Date(), 'd MMMM yyyy', { locale: localeId }))
  const [lowStockCount, setLowStockCount] = useState(0)

  // Profile dialog state
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileUsername, setProfileUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)

  // Sync profile form when dialog opens or user changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name)
      setProfileUsername(user.username)
    }
  }, [user, profileOpen])

  const handleProfileSave = async () => {
    if (!user) return
    if (!profileName.trim()) {
      toast.error('Nama wajib diisi')
      return
    }
    if (!profileUsername.trim()) {
      toast.error('Username wajib diisi')
      return
    }
    if (showPasswordSection) {
      if (!currentPassword) {
        toast.error('Password saat ini wajib diisi')
        return
      }
      if (!newPassword || newPassword.length < 6) {
        toast.error('Password baru minimal 6 karakter')
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error('Konfirmasi password tidak cocok')
        return
      }
      // Verify current password
      try {
        const verifyRes = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username, password: currentPassword }),
        })
        const verifyData = await verifyRes.json()
        if (!verifyData.success) {
          toast.error('Password saat ini salah')
          return
        }
      } catch {
        toast.error('Gagal verifikasi password')
        return
      }
    }

    setProfileSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: profileName.trim(),
        username: profileUsername.trim(),
      }
      if (showPasswordSection && newPassword) {
        body.password = newPassword
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success && data.user) {
        // Update the store with new user data
        useAppStore.getState().login({
          ...user,
          name: data.user.name,
          username: data.user.username,
          updatedAt: data.user.updatedAt,
        })
        toast.success('Profil berhasil diperbarui')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordSection(false)
        setProfileOpen(false)
      } else {
        toast.error(data.message || 'Gagal memperbarui profil')
      }
    } catch {
      toast.error('Gagal memperbarui profil')
    } finally {
      setProfileSaving(false)
    }
  }

  // Fetch low stock count on mount
  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const res = await fetch('/api/dashboard')
        const data = await res.json()
        if (data.success && data.stats) {
          setLowStockCount(data.stats.lowStockCount ?? 0)
        }
      } catch {
        // Silently ignore
      }
    }
    fetchLowStock()
    const interval = setInterval(fetchLowStock, 60000)
    return () => clearInterval(interval)
  }, [])

  // Global keyboard shortcuts
  const { setTheme: themeSetTheme, theme: currentThemeVal } = useTheme()
  const themeInfoRef = useRef({ theme: currentThemeVal as string, setTheme: themeSetTheme })
  useEffect(() => { themeInfoRef.current = { theme: currentThemeVal as string, setTheme: themeSetTheme } }, [currentThemeVal, themeSetTheme])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      const isSearchInput =
        target.tagName === 'INPUT' &&
        (target as HTMLInputElement).placeholder?.startsWith('Cari produk')
      const state = useAppStore.getState()

      // Enter in POS search: add first matching product to cart
      if (e.key === 'Enter' && isSearchInput && state.currentView === 'pos') {
        const value = (target as HTMLInputElement).value.trim()
        if (value) {
          e.preventDefault()
          const productGrid = document.querySelector('.grid.grid-cols-2')
          if (productGrid) {
            const firstBtn = productGrid.querySelector('button:not([disabled])') as HTMLElement | null
            if (firstBtn) {
              firstBtn.click()
              toast.info('Produk ditambahkan')
            }
          }
        }
        return
      }

      // Skip all other shortcuts when typing in inputs
      if (isInput) return

      // F2 → POS (Penjualan)
      if (e.code === 'F2') {
        e.preventDefault()
        state.setCurrentView('pos')
        toast.info('F2 → Penjualan')
        return
      }

      // F3 → Dashboard
      if (e.code === 'F3') {
        e.preventDefault()
        state.setCurrentView('dashboard')
        toast.info('F3 → Dashboard')
        return
      }

      // F4 → Barcode scan (POS) or Laporan (other views)
      if (e.code === 'F4') {
        e.preventDefault()
        if (state.currentView === 'pos') {
          const barcodeInput = document.querySelector('input[placeholder="Scan barcode..."]') as HTMLInputElement | null
          if (barcodeInput) {
            barcodeInput.focus()
            toast.info('F4 → Scan Barcode')
          }
        } else {
          state.setCurrentView('reports')
          toast.info('F4 → Laporan')
        }
        return
      }

      // F9 → Toggle dark/light mode
      if (e.code === 'F9') {
        e.preventDefault()
        const { theme, setTheme } = themeInfoRef.current
        setTheme(theme === 'dark' ? 'light' : 'dark')
        toast.info(theme === 'dark' ? 'Mode Terang' : 'Mode Gelap')
        return
      }

      // Ctrl/Cmd+N → Clear cart (POS only)
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        if (state.currentView === 'pos') {
          e.preventDefault()
          state.clearCart()
          toast.info('Keranjang dibersihkan')
        }
        return
      }

      // Escape → Close dialog or clear cart (POS)
      if (e.key === 'Escape') {
        const openDialog = document.querySelector('[data-state="open"][role="dialog"]')
        if (openDialog) {
          toast.info('Dialog ditutup')
        } else if (state.currentView === 'pos') {
          state.clearCart()
          toast.info('Keranjang dibersihkan')
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!user) return null

  const isAdmin = user.role === 'ADMIN'
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = () => {
    fetch('/api/auth', { method: 'DELETE' }).catch(() => {})
    logout()
    toast.success('Berhasil keluar')
  }

  const currentLabel = allNavItems.find((n) => n.view === currentView)?.label || 'Dashboard'

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300 ${
          sidebarCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {/* Store Branding */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-800 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="rounded-xl bg-emerald-600 w-10 h-10 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">KasirPro</span>
              <span className="text-xs text-gray-400 leading-tight">Sistem Kasir</span>
            </div>
          )}
        </div>

        <div className="flex-1 py-1 overflow-y-auto">
          <SidebarNav collapsed={sidebarCollapsed} />
        </div>

        {/* Sidebar Bottom Stats */}
        {!sidebarCollapsed && (
          <>
            <Separator className="mx-3" />
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Aktif</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {format(new Date(), 'd MMMM yyyy', { locale: localeId })}
              </p>
            </div>
          </>
        )}

        <Separator className="dark:bg-gray-800" />

        {/* Collapse toggle */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Glassmorphism Header */}
        <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu button - visible on screens smaller than md */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-gray-600 dark:text-gray-400 cursor-pointer">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex flex-col h-full"
                >
                  {/* Store branding in mobile sidebar */}
                  <SheetHeader className="px-4 pb-2">
                    <SheetTitle className="flex items-center gap-3 text-left">
                      <div className="rounded-xl bg-emerald-600 w-10 h-10 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">KasirPro</span>
                        <span className="text-xs text-gray-400 leading-tight">Sistem Kasir</span>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  <Separator className="mx-3" />
                  <div className="flex-1 py-2 overflow-y-auto">
                    <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
                  </div>
                  <Separator className="mx-3" />
                  <div className="p-3">
                    <button
                      onClick={() => {
                        handleLogout()
                        setMobileOpen(false)
                      }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-all cursor-pointer"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </motion.div>
              </SheetContent>
            </Sheet>

            {/* Mobile header branding */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="rounded-xl bg-emerald-600 w-8 h-8 flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">KasirPro</span>
                <span className="text-xs text-gray-400 leading-tight">Sistem Kasir</span>
              </div>
            </div>

            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hidden md:block">{currentLabel}</h1>

            {/* Real-time Clock */}
            <RealtimeClock />
          </div>

          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            {/* Notification Bell with pulse badge */}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative cursor-pointer"
                    onClick={() => {
                      setCurrentView('products')
                      toast.info('Menampilkan produk stok rendah')
                    }}
                  >
                    <Bell className="h-4 w-4" />
                    {lowStockCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                        {lowStockCount > 9 ? '9+' : lowStockCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stok Rendah</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* User Menu Dropdown with gradient avatar ring */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer outline-none">
                  <div className="rounded-full p-[2px] bg-gradient-to-tr from-emerald-400 via-emerald-500 to-teal-500">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">{user.name}</span>
                      <Badge variant={isAdmin ? 'default' : 'secondary'} className={`text-[10px] px-1.5 py-0 h-4 ${isAdmin ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400' : ''}`}>
                        {user.role}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">@{user.username}</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-gray-500">@{user.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)} className="cursor-pointer">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView('settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleLogout}
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Keyboard Shortcuts Help */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                  aria-label="Pintasan keyboard"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Pintasan Keyboard</h3>
                <div className="space-y-2.5">
                  {[
                    { key: 'F2', desc: 'Penjualan' },
                    { key: 'F3', desc: 'Dashboard' },
                    { key: 'F4', desc: 'Scan / Laporan' },
                    { key: 'F9', desc: 'Dark Mode' },
                    { key: 'Ctrl+N', desc: 'Hapus Keranjang' },
                    { key: 'Esc', desc: 'Tutup Dialog' },
                  ].map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{shortcut.desc}</span>
                      <kbd className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-mono font-medium text-gray-700 dark:text-gray-300">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Breadcrumb Trail */}
        <div className="px-4 lg:px-6 py-2 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-950/50">
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink
                  asChild
                  className="text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                >
                  <button onClick={() => setCurrentView('dashboard')}>
                    <Home className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />
                    Home
                  </button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {currentLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="p-4 lg:p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Enhanced Footer */}
        <footer className="px-4 lg:px-6 py-3 shrink-0">
          <div className="relative h-1 overflow-hidden rounded-full">
            {/* Animated wave decoration */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 1200 4"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M0,2 Q150,0 300,2 Q450,4 600,2 Q750,0 900,2 Q1050,4 1200,2"
                fill="none"
                stroke="url(#footerGradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                animate={{
                  d: [
                    "M0,2 Q150,0 300,2 Q450,4 600,2 Q750,0 900,2 Q1050,4 1200,2",
                    "M0,2 Q150,4 300,2 Q450,0 600,2 Q750,4 900,2 Q1050,0 1200,2",
                    "M0,2 Q150,0 300,2 Q450,4 600,2 Q750,0 900,2 Q1050,4 1200,2",
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <defs>
                <linearGradient id="footerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="30%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex items-center justify-between mt-2.5 gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 dark:text-gray-500">© 2026</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-medium">
                v1.0
              </Badge>
              <span className="text-xs text-gray-400 dark:text-gray-500">KasirPro</span>
            </div>
            <div className="flex items-center gap-3">
              <OnlineStatus />
              <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">{footerDate}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 w-8 h-8 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Profil Saya
            </DialogTitle>
            <DialogDescription>Kelola informasi akun dan keamanan Anda</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Avatar & Role Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="rounded-full p-[2px] bg-gradient-to-tr from-emerald-400 via-emerald-500 to-teal-500">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant={isAdmin ? 'default' : 'secondary'} className={`text-[10px] px-1.5 py-0 h-4 ${isAdmin ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400' : ''}`}>
                    {user?.role}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                    <Shield className="w-2.5 h-2.5 mr-1" />
                    {isAdmin ? 'Akses Penuh' : 'Akses Terbatas'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="profileName"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileUsername" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="profileUsername"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="h-11"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">Username digunakan untuk login</p>
              </div>
            </div>

            <Separator />

            {/* Password Change Section */}
            <div className="space-y-3">
              <button
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="flex items-center justify-between w-full text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Ubah Password</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showPasswordSection ? 'rotate-90' : ''}`} />
              </button>

              {showPasswordSection && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-2"
                >
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Verifikasi password saat ini diperlukan untuk keamanan
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password Saat Ini
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan password saat ini"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password Baru
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Konfirmasi Password Baru
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      className="h-11"
                    />
                    {confirmPassword && newPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Password tidak cocok
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setProfileOpen(false)
                setShowPasswordSection(false)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
              }}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 cursor-pointer min-w-[120px]"
            >
              {profileSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
