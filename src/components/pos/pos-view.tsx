'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  X,
  Delete,
  ChevronRight,
  Printer,
  ShoppingCart,
  Loader2,
  AlertCircle,
  Package,
  User,
  Pause,
  Play,
  Clock,
  Store,
  Heart,
  ScanBarcode,
  Star,
  Tag,
  Percent,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Product, Category, CartItem, PaymentMethod, Transaction, Customer, StoreSetting } from '@/lib/types'

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

const getCategoryColor = (categoryName: string): string => {
  const map: Record<string, string> = {
    'Makanan': 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    'Minuman': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'Rokok & Tembakau': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    'Kebutuhan Rumah Tangga': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    'Lainnya': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return map[categoryName] || 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
}

type DialogType = 'none' | 'payment' | 'receipt' | 'held-list'

type HeldTransaction = {
  id: number
  items: CartItem[]
  customerName: string
  createdAt: string
}

// Ripple state for numpad buttons
type RippleState = {
  id: number
  x: number
  y: number
}

export default function PosView() {
  const {
    user,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    getCartSubtotal,
    getCartCount,
  } = useAppStore()

  // Current shift for shift-aware transactions
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null)
  const [shiftLoading, setShiftLoading] = useState(true)

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeShake, setBarcodeShake] = useState(false)
  const [barcodeFocused, setBarcodeFocused] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [discount, setDiscount] = useState('')
  const [taxEnabled, setTaxEnabled] = useState(false)

  // Item-level discount (productId -> discount percent 0-100)
  const [itemDiscounts, setItemDiscounts] = useState<Map<string, number>>(new Map())
  const updateItemDiscount = useCallback((productId: string, discountPercent: number) => {
    setItemDiscounts(prev => {
      const next = new Map(prev)
      if (discountPercent <= 0) {
        next.delete(productId)
      } else {
        next.set(productId, Math.min(100, Math.max(0, discountPercent)))
      }
      return next
    })
  }, [])

  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const stored = localStorage.getItem('kasirpro-favorites')
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)))
      }
    } catch {
      // ignore
    }
  }, [])

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      localStorage.setItem('kasirpro-favorites', JSON.stringify([...next]))
      return next
    })
  }, [])

  // Payment dialog
  const [dialogType, setDialogType] = useState<DialogType>('none')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paying, setPaying] = useState(false)

  // Receipt
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null)

  // Store settings for receipt
  const defaultStoreSettings: StoreSetting = {
    id: '',
    storeName: 'KASIRPRO',
    taxEnabled: false,
    taxPercent: 11,
    currency: 'IDR',
    receiptPaperWidth: 58,
    receiptFontSize: 'small',
    receiptCharPerLine: 32,
    receiptLineSpacing: 'normal',
    receiptMargin: 2,
    receiptShowLogo: true,
    receiptShowAddress: true,
    receiptShowPhone: true,
    receiptShowEmail: false,
    receiptShowTax: true,
    receiptShowPayment: true,
    receiptShowQrCode: false,
    receiptShowItems: true,
    receiptDuplicate: false,
    createdAt: '',
    updatedAt: '',
  }
  const [storeSettings, setStoreSettings] = useState<StoreSetting>(defaultStoreSettings)

  // Fetch store settings on mount
  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.success && data.settings) {
          setStoreSettings(data.settings as StoreSetting)
        }
      } catch {
        // Use defaults
      }
    }
    fetchStoreSettings()
  }, [])

  // Fetch current shift for shift-aware transactions
  useEffect(() => {
    const fetchCurrentShift = async () => {
      try {
        if (user?.id) {
          const res = await fetch(`/api/shifts/current?userId=${user.id}`)
          const data = await res.json()
          if (data.success && data.shift) {
            setCurrentShiftId(data.shift.id)
          } else {
            setCurrentShiftId(null)
          }
        }
      } catch {
        setCurrentShiftId(null)
      } finally {
        setShiftLoading(false)
      }
    }
    fetchCurrentShift()
  }, [user?.id])

  // Customer name (POS-session specific)
  const [customerName, setCustomerName] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Held transactions
  const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>([])
  const [showResumeConfirm, setShowResumeConfirm] = useState(false)
  const [pendingResumeId, setPendingResumeId] = useState<number | null>(null)

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products')

  // Cart badge animation
  const [cartBadgeKey, setCartBadgeKey] = useState(0)

  // Cart item animation key (to force re-render for AnimatePresence)
  const [cartAnimKey, setCartAnimKey] = useState(0)

  // Numpad ripple
  const [ripples, setRipples] = useState<RippleState[]>([])
  const rippleIdRef = useRef(0)

  // Barcode scanner handler
  const handleBarcodeScan = useCallback(async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return

    try {
      const res = await fetch('/api/products?limit=9999')
      const data = await res.json()
      if (!data.success) {
        toast.error('Gagal memuat produk')
        setBarcodeInput('')
        return
      }

      const allProducts: Product[] = data.products
      const found = allProducts.find(
        (p: Product) => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase()
      )

      if (found) {
        if (found.stock <= 0) {
          toast.error('Stok produk habis')
          setBarcodeInput('')
          return
        }
        addToCart(found)
        setCartBadgeKey((k) => k + 1)
        setCartAnimKey((k) => k + 1)
        setBarcodeInput('')
        toast.success(`${found.name} ditambahkan`, { duration: 1500 })
        setMobileTab('cart')
        setTimeout(() => barcodeInputRef.current?.focus(), 50)
      } else {
        setBarcodeShake(true)
        toast.error('Produk tidak ditemukan')
        setTimeout(() => {
          setBarcodeInput('')
          setBarcodeShake(false)
        }, 1500)
        setTimeout(() => barcodeInputRef.current?.focus(), 1600)
      }
    } catch {
      toast.error('Gagal memindai barcode')
      setBarcodeInput('')
    }
  }, [addToCart])

  // Auto-focus barcode input on mount
  useEffect(() => {
    const timer = setTimeout(() => barcodeInputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  // Numpad ref
  const numpadRef = useRef<HTMLDivElement>(null)

  // Category product counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 }
    for (const p of products) {
      counts.all = (counts.all || 0) + 1
      if (p.categoryId) {
        counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
      }
    }
    return counts
  }, [products])

  const fetchProducts = useCallback(async () => {
    try {
      let url = '/api/products?limit=100'
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`
      }
      if (activeCategory !== 'all' && activeCategory !== 'favorites') {
        url += `&categoryId=${activeCategory}`
      }
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        let prods: Product[] = data.products
        // If favorites filter active, filter to only favorites
        if (activeCategory === 'favorites') {
          prods = prods.filter(p => favorites.has(p.id))
        }
        setProducts(prods)
      }
    } catch {
      // silently fail
    } finally {
      setLoadingProducts(false)
    }
  }, [search, activeCategory, favorites])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (data.success) {
        setCategories(data.categories)
      }
    } catch {
      // silently fail
    }
  }

  // Load held transactions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('kasirpro_held_transactions')
      if (stored) {
        setHeldTransactions(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    setLoadingProducts(true)
    const timer = setTimeout(fetchProducts, 300)
    return () => clearTimeout(timer)
  }, [fetchProducts])

  // Item-level discount aware subtotal
  const getItemDiscountedTotal = useCallback((item: CartItem) => {
    const dPercent = itemDiscounts.get(item.product.id) || 0
    const rawTotal = item.product.sellPrice * item.quantity
    if (dPercent > 0) {
      return rawTotal - Math.round(rawTotal * dPercent / 100)
    }
    return rawTotal
  }, [itemDiscounts])

  const getItemDiscountAmount = useCallback((item: CartItem) => {
    const dPercent = itemDiscounts.get(item.product.id) || 0
    if (dPercent > 0) {
      return Math.round(item.product.sellPrice * item.quantity * dPercent / 100)
    }
    return 0
  }, [itemDiscounts])

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + getItemDiscountedTotal(item), 0)
  }, [cart, getItemDiscountedTotal])

  const totalItemDiscountAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + getItemDiscountAmount(item), 0)
  }, [cart, getItemDiscountAmount])

  const discountAmount = Math.min(Number(discount) || 0, subtotal)
  const subtotalAfterDiscount = subtotal - discountAmount
  const taxAmount = taxEnabled ? Math.round(subtotalAfterDiscount * 0.11) : 0
  const total = subtotalAfterDiscount + taxAmount
  const payAmount = Number(paymentAmount) || 0
  const change = payAmount - total
  const cartCount = getCartCount()

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Stok produk habis')
      return
    }
    addToCart(product)
    setCartBadgeKey((k) => k + 1)
    setCartAnimKey((k) => k + 1)
    setMobileTab('cart')
  }

  const handleRemoveFromCart = (productId: string) => {
    // Clean up item discount when removing
    setItemDiscounts(prev => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
    removeFromCart(productId)
    setCartAnimKey((k) => k + 1)
  }

  // Payment numpad
  const handleNumpad = (value: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    // Ripple effect
    if (e && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = ++rippleIdRef.current
      setRipples(prev => [...prev, { id, x, y }])
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id))
      }, 600)
    }

    if (value === 'C') {
      setPaymentAmount('')
    } else if (value === 'backspace') {
      setPaymentAmount((prev) => prev.slice(0, -1))
    } else if (value === '00') {
      setPaymentAmount((prev) => prev + '00')
    } else {
      setPaymentAmount((prev) => prev + value)
    }
  }

  const openPaymentDialog = () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong')
      return
    }
    // Don't reset paymentMethod - keep user's selection
    // For non-CASH methods, auto-set payment amount to total
    if (paymentMethod !== 'CASH') {
      setPaymentAmount(String(total))
    } else {
      setPaymentAmount('')
    }
    setDialogType('payment')
  }

  // Customer search in POS
  useEffect(() => {
    if (customerName.length < 2) {
      setCustomerSearchResults([])
      setShowCustomerDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(customerName)}&limit=5`)
        const data = await res.json()
        if (data.success && data.customers.length > 0) {
          setCustomerSearchResults(data.customers)
          setShowCustomerDropdown(true)
        } else {
          setCustomerSearchResults([])
          setShowCustomerDropdown(false)
        }
      } catch {
        // silently fail
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerName])

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerName(customer.name)
    setCustomerId(customer.id)
    setShowCustomerDropdown(false)
    toast.success(`Pelanggan: ${customer.name}`)
  }

  const handlePay = async () => {
    if (!user?.id) {
      toast.error('Sesi telah berakhir, silakan login ulang')
      return
    }
    if (paymentMethod === 'CASH' && payAmount < total) {
      toast.error('Pembayaran kurang')
      return
    }

    setPaying(true)
    try {
      const items = cart.map((item) => {
        const dPercent = itemDiscounts.get(item.product.id) || 0
        return {
          productId: item.product.id,
          productName: item.product.name,
          productSku: item.product.sku,
          quantity: item.quantity,
          price: item.product.sellPrice,
          discountPercent: dPercent,
        }
      })

      const body: Record<string, unknown> = {
        userId: user!.id,
        items,
        discountAmount: discountAmount + totalItemDiscountAmount,
        paymentAmount: paymentMethod === 'CASH' ? payAmount : total,
        paymentMethod,
        customerName: customerName || undefined,
        customerId: customerId || undefined,
        taxEnabled,
        taxPercent: 11,
        shiftId: currentShiftId || undefined,
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!data.success) {
        toast.error(data.message || 'Gagal membuat transaksi')
        return
      }

      setLastTransaction(data.transaction)
      clearCart()
      setDiscount('')
      setPaymentAmount('')
      setCustomerName('')
      setCustomerId(null)
      setTaxEnabled(false)
      setItemDiscounts(new Map())
      setDialogType('receipt')
      toast.success('Transaksi berhasil!')
    } catch {
      toast.error('Gagal terhubung ke server')
    } finally {
      setPaying(false)
    }
  }

  const handlePrintReceipt = () => {
    window.print()
  }

  // Hold transaction
  const handleHold = () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong, tidak bisa menahan transaksi')
      return
    }
    const newHeld: HeldTransaction = {
      id: Date.now(),
      items: [...cart],
      customerName: customerName || '',
      createdAt: new Date().toISOString(),
    }
    const updated = [newHeld, ...heldTransactions]
    setHeldTransactions(updated)
    localStorage.setItem('kasirpro_held_transactions', JSON.stringify(updated))
    clearCart()
    setCustomerName('')
    setCustomerId(null)
    setDiscount('')
    setTaxEnabled(false)
    setItemDiscounts(new Map())
    toast.success('Transaksi ditahan')
  }

  // Resume transaction
  const handleResumeClick = () => {
    if (heldTransactions.length === 0) return
    if (cart.length > 0) {
      setShowResumeConfirm(true)
      setDialogType('held-list')
    } else {
      setDialogType('held-list')
    }
  }

  const handleResumeSelect = (held: HeldTransaction) => {
    if (cart.length > 0) {
      setPendingResumeId(held.id)
      setShowResumeConfirm(true)
    } else {
      doResume(held)
    }
  }

  const doResume = (held: HeldTransaction) => {
    clearCart()
    for (const item of held.items) {
      addToCart(item.product)
      updateCartQuantity(item.product.id, item.quantity)
    }
    setCustomerName(held.customerName || '')
    setCustomerId(null)
    const updated = heldTransactions.filter((h) => h.id !== held.id)
    setHeldTransactions(updated)
    localStorage.setItem('kasirpro_held_transactions', JSON.stringify(updated))
    setDialogType('none')
    setShowResumeConfirm(false)
    toast.success('Transaksi dilanjutkan')
  }

  const confirmResume = () => {
    if (pendingResumeId === null) return
    const held = heldTransactions.find((h) => h.id === pendingResumeId)
    if (held) {
      doResume(held)
    }
  }

  const cancelResume = () => {
    setShowResumeConfirm(false)
    setPendingResumeId(null)
  }

  const quickAmounts = [
    { label: 'Uang Pas', value: total },
    { label: formatRupiah(Math.ceil(total / 50000) * 50000), value: Math.ceil(total / 50000) * 50000 },
    { label: formatRupiah(Math.ceil(total / 100000) * 100000), value: Math.ceil(total / 100000) * 100000 },
  ]

  // Payment method card configs
  const paymentMethodCards = [
    {
      method: 'CASH' as PaymentMethod,
      label: 'Tunai',
      icon: <Banknote className="w-5 h-5" />,
      gradient: 'from-emerald-500 to-emerald-700',
      lightBg: 'bg-emerald-50 dark:bg-emerald-900/30',
      lightBorder: 'border-emerald-300 dark:border-emerald-700',
      activeClass: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    },
    {
      method: 'TRANSFER' as PaymentMethod,
      label: 'Transfer',
      icon: <CreditCard className="w-5 h-5" />,
      gradient: 'from-sky-500 to-sky-700',
      lightBg: 'bg-sky-50 dark:bg-sky-900/30',
      lightBorder: 'border-sky-300 dark:border-sky-700',
      activeClass: 'from-sky-500 to-sky-700 shadow-sky-500/30',
    },
    {
      method: 'QRIS' as PaymentMethod,
      label: 'QRIS',
      icon: <QrCode className="w-5 h-5" />,
      gradient: 'from-violet-500 to-violet-700',
      lightBg: 'bg-violet-50 dark:bg-violet-900/30',
      lightBorder: 'border-violet-300 dark:border-violet-700',
      activeClass: 'from-violet-500 to-violet-700 shadow-violet-500/30',
    },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-5.5rem)]">
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shine-sweep {
          0% { transform: translateX(-100%) rotate(15deg); }
          100% { transform: translateX(200%) rotate(15deg); }
        }
        @keyframes scan-pulse {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(2px); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slide-out-right {
          0% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes ripple-expand {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes low-stock-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        .shine-effect {
          position: relative;
          overflow: hidden;
        }
        .shine-effect::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 50%;
          height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: translateX(-100%) rotate(15deg);
          pointer-events: none;
        }
        .shine-effect:hover::after {
          animation: shine-sweep 0.6s ease-in-out;
        }
        .scan-line {
          animation: scan-pulse 1.5s ease-in-out infinite;
        }
        .low-stock-badge {
          animation: low-stock-pulse 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Mobile Tab Bar - Only visible below lg breakpoint */}
      <div className="lg:hidden flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shrink-0 mb-3">
        <button
          onClick={() => setMobileTab('products')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all cursor-pointer relative ${
            mobileTab === 'products'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produk</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
            mobileTab === 'products'
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
          }`}>
            {activeCategory === 'favorites' ? favorites.size : categoryCounts.all || 0}
          </span>
          {mobileTab === 'products' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all cursor-pointer relative ${
            mobileTab === 'cart'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Keranjang</span>
          {cartCount > 0 && (
            <motion.span
              key={cartBadgeKey}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`text-xs min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full font-bold transition-colors ${
                mobileTab === 'cart'
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                  : 'bg-emerald-600 text-white'
              }`}>
              {cartCount}
            </motion.span>
          )}
          {mobileTab === 'cart' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 overflow-hidden">
      {/* Left Panel - Products */}
      <div className={`${mobileTab === 'products' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0 min-h-0`}>
          {/* Barcode Scanner Input with pulsing scan line */}
        <div className="flex gap-2 mb-3">
          <div className={`relative flex-1 ${barcodeShake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}>
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan barcode..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onFocus={() => setBarcodeFocused(true)}
              onBlur={() => setBarcodeFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleBarcodeScan(barcodeInput)
                }
              }}
              className="w-full pl-10 pr-20 h-11 bg-white dark:bg-gray-800 border border-l-4 border-l-amber-400 border-gray-200 dark:border-gray-700 focus:border-l-amber-500 focus:border-emerald-500 focus:ring-2 focus:ring-amber-400/20 rounded-md text-sm dark:text-gray-100 dark:placeholder:text-gray-500 outline-none transition-all"
            />
            {/* Pulsing scan line animation when focused */}
            {barcodeFocused && (
              <div className="absolute left-10 right-20 top-1/2 -translate-y-1/2 h-[2px] pointer-events-none overflow-hidden">
                <div className="scan-line w-full h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              </div>
            )}
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 dark:text-gray-500 font-medium bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">F4: Scan</span>
          </div>
          <div className="relative hidden sm:block flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Cari produk (nama/SKU)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
        {/* Mobile-only search bar */}
        <div className="relative mb-3 sm:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Cari produk (nama/SKU)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>

        {/* Category Tabs with gradient pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 shrink-0" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCategory('all')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/25'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:text-emerald-700'
            }`}
          >
            Semua
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeCategory === 'all' ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {categoryCounts.all || 0}
            </span>
          </button>
          {/* Favorites filter */}
          <button
            onClick={() => setActiveCategory('favorites')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 cursor-pointer ${
              activeCategory === 'favorites'
                ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-amber-300 hover:text-amber-700'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Favorit
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeCategory === 'favorites' ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {favorites.size}
            </span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {cat.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeCategory === cat.id ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {categoryCounts[cat.id] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Tidak ada produk ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((product) => {
                const isFavorite = favorites.has(product.id)
                const isLowStock = product.stock > 0 && product.stock <= product.minStock
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock <= 0}
                    className={`group shine-effect relative text-left rounded-2xl border p-4 transition-all duration-300 cursor-pointer
                      ${
                        product.stock <= 0
                          ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                          : isFavorite
                            ? 'bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-600 shadow-sm shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-200/30 hover:border-amber-400 dark:hover:border-amber-500 hover:-translate-y-1 active:scale-[0.98]'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]'
                      }
                    `}
                    style={{
                      perspective: '600px',
                    }}
                    onMouseEnter={(e) => {
                      if (product.stock > 0) {
                        e.currentTarget.style.transform = 'rotateY(2deg) scale(1.02) translateY(-4px)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = ''
                    }}
                  >
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 rounded-2xl bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-center z-10">
                        <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Habis</Badge>
                      </div>
                    )}

                    {/* Low stock animated badge */}
                    {isLowStock && (
                      <div className="absolute -top-2 -right-2 z-20">
                        <span className="low-stock-badge inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white shadow-sm">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Stok Rendah!
                        </span>
                      </div>
                    )}

                    {/* Favorite heart icon */}
                    <div
                      className="absolute top-2 left-2 z-20"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(product.id)
                      }}
                    >
                      <motion.div
                        whileTap={{ scale: 0.7 }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                          isFavorite
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-500'
                            : 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
                      </motion.div>
                    </div>

                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-1 truncate pr-6">{product.sku}</p>
                    <div className={`w-10 h-10 rounded-xl ${getCategoryColor(product.category?.name || '')} flex items-center justify-center mx-auto mb-2`}>
                      <span className="text-lg font-bold">{product.name[0]}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 min-h-[2.5rem]">
                      {product.name}
                    </p>
                    <div className="mt-2.5 flex items-end justify-between">
                      <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                        {formatRupiah(product.sellPrice)}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                        product.stock <= 0
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          : isLowStock
                            ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {product.stock} {product.unit}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm">
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </div>
                    {/* Golden glow border for favorites */}
                    {isFavorite && (
                      <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-amber-300/40 dark:border-amber-500/30" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className={`${mobileTab === 'cart' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[400px] xl:w-[420px] shrink-0 flex-col bg-gray-50 dark:bg-gray-900/50 rounded-2xl shadow-sm border-t-4 border-t-emerald-600 lg:h-full overflow-hidden`}>
        {/* Cart Header - Desktop */}
        <div className="hidden lg:flex px-5 py-3.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Keranjang</h2>
            {cartCount > 0 && (
              <motion.span
                key={`desktop-${cartBadgeKey}`}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold"
              >
                {cartCount}
              </motion.span>
            )}
            {/* Shift Status Indicator */}
            {!shiftLoading && (
              currentShiftId ? (
                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Shift Aktif
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <AlertCircle className="w-3 h-3 mr-0.5" />
                  Tanpa Shift
                </Badge>
              )
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 px-2 py-1 rounded-md transition-colors"
            >
              Hapus Semua
            </button>
          )}
        </div>

        {/* Cart Header - Mobile with emerald gradient */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5" />
            <h2 className="font-bold">Keranjang</h2>
            {cartCount > 0 && (
              <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-white/20 text-xs font-bold">
                {cartCount}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Hold/Clear ghost buttons above cart items */}
        {cart.length > 0 && (
          <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-white/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={handleHold}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              Tahan
            </button>
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Kosongkan
            </button>
          </div>
        )}

        {/* Customer Name Field */}
        <div className="px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 relative">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Nama pelanggan (opsional)"
              value={customerName}
              onChange={(e) => {
                if (e.target.value.length <= 50) {
                  setCustomerName(e.target.value)
                  setCustomerId(null)
                }
              }}
              maxLength={50}
              className="h-8 text-sm pl-8 pr-7 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            {customerName && (
              <button
                onClick={() => { setCustomerName(''); setCustomerId(null); setShowCustomerDropdown(false) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {showCustomerDropdown && customerSearchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full z-50 mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
              {customerSearchResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.phone || 'Tanpa telepon'} &bull; ⭐ {c.points} poin</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {customerId && (
            <div className="absolute left-4 right-4 top-full z-50 mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="font-medium">✓ {customerName}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400">Terkait</Badge>
            </div>
          )}
        </div>

        {/* Cart Items with bounce-in / slide-out animation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ShoppingCart className="w-14 h-14 mb-3 opacity-40" />
              </motion.div>
              <p className="text-sm font-medium">Keranjang kosong</p>
              <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">Klik produk untuk menambahkan</p>
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-3"
              >
                <Sparkles className="w-5 h-5 text-emerald-300 dark:text-emerald-600" />
              </motion.div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {cart.map((item: CartItem) => {
                const itemDiscountPercent = itemDiscounts.get(item.product.id) || 0
                const itemTotal = getItemDiscountedTotal(item)
                const itemDiscAmt = getItemDiscountAmount(item)
                return (
                  <motion.div
                    key={item.product.id}
                    initial={{ scale: 0.8, opacity: 0, x: -20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ x: 100, opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.product.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRupiah(item.product.sellPrice)} / {item.product.unit}
                        </p>
                        {itemDiscountPercent > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            -{itemDiscountPercent}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right ml-2 min-w-[80px]">
                      {itemDiscountPercent > 0 && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 line-through">
                          {formatRupiah(item.product.sellPrice * item.quantity)}
                        </p>
                      )}
                      <p className={`text-sm font-semibold ${itemDiscountPercent > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {formatRupiah(itemTotal)}
                      </p>
                    </div>
                    {/* Item discount popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            itemDiscountPercent > 0
                              ? 'text-red-500 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50'
                              : 'text-gray-400 dark:text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3 space-y-2" side="left" align="center">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Diskon Item</p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="0"
                            value={itemDiscountPercent || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              updateItemDiscount(item.product.id, val)
                            }}
                            className="h-8 text-sm w-20 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                          />
                          <Percent className="w-4 h-4 text-gray-400" />
                        </div>
                        {itemDiscountPercent > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                            <p>Asli: {formatRupiah(item.product.sellPrice * item.quantity)}</p>
                            <p className="text-red-500">Diskon: -{formatRupiah(itemDiscAmt)}</p>
                            <p className="font-medium text-emerald-600">Hasil: {formatRupiah(itemTotal)}</p>
                          </div>
                        )}
                        <div className="flex gap-1 flex-wrap">
                          {[0, 5, 10, 15, 20, 25, 50].map(pct => (
                            <button
                              key={pct}
                              onClick={() => updateItemDiscount(item.product.id, pct)}
                              className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${
                                itemDiscountPercent === pct
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <button
                      onClick={() => handleRemoveFromCart(item.product.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer shrink-0 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Cart Footer - Payment Section with glassmorphism */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-t border-gray-100 dark:border-gray-700 p-4 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {/* Hold / Resume Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHold}
              disabled={cart.length === 0}
              className="flex-1 gap-1.5 h-8 text-xs dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Pause className="w-3.5 h-3.5" />
              Tahan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResumeClick}
              disabled={heldTransactions.length === 0}
              className="flex-1 gap-1.5 h-8 text-xs dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 relative"
            >
              <Play className="w-3.5 h-3.5" />
              Lanjut
              {heldTransactions.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                  {heldTransactions.length}
                </span>
              )}
            </Button>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-16 shrink-0">Diskon:</span>
            <Input
              type="number"
              placeholder="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="h-9 text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              min={0}
            />
          </div>

          {/* Tax Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Switch
                checked={taxEnabled}
                onCheckedChange={setTaxEnabled}
                className="data-[state=checked]:bg-emerald-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PPN 11%</span>
            </div>
            {taxEnabled && (
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {formatRupiah(taxAmount)}
              </span>
            )}
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">{formatRupiah(subtotal)}</span>
            </div>
            {totalItemDiscountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Diskon Item</span>
                <span className="font-medium text-red-600 dark:text-red-400">-{formatRupiah(totalItemDiscountAmount)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Diskon</span>
                <span className="font-medium text-red-600 dark:text-red-400">-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            {taxEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">PPN (11%)</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">+{formatRupiah(taxAmount)}</span>
              </div>
            )}
          </div>

          {/* Prominent Total with glassmorphism */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 shadow-lg shadow-emerald-600/20">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-emerald-100 text-sm">Total</span>
              <span className="font-bold text-white text-xl">{formatRupiah(total)}</span>
            </div>
          </div>

          {/* Payment Method Cards */}
          <div className="grid grid-cols-3 gap-2">
            {paymentMethodCards.map((m) => (
              <button
                key={m.method}
                onClick={() => setPaymentMethod(m.method)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer relative overflow-hidden ${
                  paymentMethod === m.method
                    ? `bg-gradient-to-br ${m.gradient} text-white border-transparent shadow-lg ${m.activeClass}`
                    : `${m.lightBg} ${m.lightBorder} text-gray-700 dark:text-gray-300 hover:shadow-md`
                }`}
              >
                <div className={`${
                  paymentMethod === m.method ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {m.icon}
                </div>
                <span className="text-xs font-semibold">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Pay Button */}
          <Button
            onClick={openPaymentDialog}
            disabled={cart.length === 0}
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-base cursor-pointer rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
          >
            {paymentMethod === 'CASH'
              ? `Bayar Tunai ${formatRupiah(total)}`
              : paymentMethod === 'QRIS'
                ? `Bayar QRIS ${formatRupiah(total)}`
                : `Transfer ${formatRupiah(total)}`}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
      </div>{/* End of inner content wrapper */}

      {/* Payment Dialog */}
      <Dialog open={dialogType === 'payment'} onOpenChange={(open) => { if (!open && !paying) setDialogType('none') }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-bold">Pembayaran</DialogTitle>
            <DialogDescription className="sr-only">Masukkan jumlah pembayaran</DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2">
            {/* Summary lines in payment dialog */}
            <div className="mb-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-700 dark:text-gray-200">{formatRupiah(subtotal)}</span>
              </div>
              {totalItemDiscountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Diskon Item</span>
                  <span className="text-red-600 dark:text-red-400">-{formatRupiah(totalItemDiscountAmount)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Diskon</span>
                  <span className="text-red-600 dark:text-red-400">-{formatRupiah(discountAmount)}</span>
                </div>
              )}
              {taxEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">PPN (11%)</span>
                  <span className="text-gray-700 dark:text-gray-200">+{formatRupiah(taxAmount)}</span>
                </div>
              )}
            </div>

            {/* Total - More Prominent with Gradient */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 mb-5 shadow-lg shadow-emerald-500/20">
              <p className="text-sm text-emerald-100 font-medium">Total yang harus dibayar</p>
              <p className="text-3xl font-bold text-white mt-1.5">{formatRupiah(total)}</p>
            </div>

            {paymentMethod === 'CASH' && (
              <>
                {/* Payment Amount Display */}
                <div className="mb-3">
                  <label className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1.5 block">Jumlah Bayar</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold text-sm">Rp</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={paymentAmount ? formatRupiah(Number(paymentAmount)) : ''}
                      readOnly
                      className="pl-12 pr-4 h-14 text-xl font-bold text-right text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Quick Amounts */}
                <div className="flex gap-2 mb-3">
                  {quickAmounts.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => setPaymentAmount(String(qa.value))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        payAmount === qa.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600'
                      }`}
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>

                {/* Change */}
                {payAmount > 0 && (
                  <div className={`rounded-2xl p-4 mb-3 ${
                    change >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800'
                  }`}>
                    <p className={`text-sm font-medium ${change >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                      {change >= 0 ? 'Kembalian' : 'Kurang'}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${change >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-red-800 dark:text-red-300'}`}>
                      {formatRupiah(Math.abs(change))}
                    </p>
                  </div>
                )}

                {/* Numpad with ripple effect + gradient */}
                <div ref={numpadRef} className="grid grid-cols-4 gap-2 mb-4 relative">
                  {ripples.map((ripple) => (
                    <span
                      key={ripple.id}
                      className="absolute w-8 h-8 rounded-full bg-emerald-400/30 pointer-events-none"
                      style={{
                        left: ripple.x - 16,
                        top: ripple.y - 16,
                        animation: 'ripple-expand 0.6s ease-out forwards',
                      }}
                    />
                  ))}
                  {(['1', '2', '3', 'backspace', '4', '5', '6', 'C', '7', '8', '9', '00', '0'] as const).map((key) => {
                    if (key === 'backspace') {
                      return (
                        <button
                          key={key}
                          onClick={(e) => handleNumpad(key, e)}
                          className="h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 flex items-center justify-center text-gray-600 dark:text-gray-400 transition-all cursor-pointer active:scale-95 relative overflow-hidden"
                        >
                          <Delete className="w-5 h-5" />
                        </button>
                      )
                    }
                    if (key === 'C') {
                      return (
                        <button
                          key={key}
                          onClick={(e) => handleNumpad(key, e)}
                          className="h-16 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/50 hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/50 dark:hover:to-red-900/70 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm transition-all cursor-pointer active:scale-95 relative overflow-hidden"
                        >
                          C
                        </button>
                      )
                    }
                    return (
                      <button
                        key={key}
                        onClick={(e) => handleNumpad(key, e)}
                        className="h-16 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-700 dark:hover:to-gray-600 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xl font-bold text-gray-900 dark:text-gray-100 transition-all active:scale-95 active:from-emerald-50 active:to-emerald-100 dark:active:from-emerald-900/30 dark:active:to-emerald-900/50 active:border-emerald-200 dark:active:border-emerald-700 cursor-pointer relative overflow-hidden"
                      >
                        {key}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* QRIS Payment Section */}
            {paymentMethod === 'QRIS' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4">
                  <div className="w-40 h-40 rounded-2xl bg-white border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center mb-3 shadow-inner">
                    <QrCode className="w-16 h-16 text-emerald-500 mb-2" />
                    <span className="text-[10px] text-gray-400 font-medium">QR Code Pembayaran</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Scan QR Code menggunakan aplikasi e-wallet atau mobile banking
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600">QRIS</Badge>
                    <span className="text-xs text-gray-400">Lewat aplikasi apapun</span>
                  </div>
                </div>
              </div>
            )}

            {/* TRANSFER Payment Section */}
            {paymentMethod === 'TRANSFER' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-sky-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Informasi Transfer</span>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Bank</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">BRI / BNI / Mandiri</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">No. Rekening</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100 font-mono">1234-5678-90</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Atas Nama</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{storeSettings.storeName || 'KasirPro'}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Jumlah Transfer</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(total)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Pastikan nominal transfer sesuai dengan total yang harus dibayar
                </p>
              </div>
            )}
          </div>

          {/* Confirm Button - More Prominent with Gradient */}
          <div className="px-6 pb-6">
            <Button
              onClick={handlePay}
              disabled={paying || (paymentMethod === 'CASH' && change < 0)}
              className="w-full h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-base cursor-pointer rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
            >
              {paying ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                paymentMethod === 'CASH'
                  ? `Konfirmasi Pembayaran ${formatRupiah(total)}`
                  : paymentMethod === 'QRIS'
                    ? `Konfirmasi QRIS ${formatRupiah(total)}`
                    : `Konfirmasi Transfer ${formatRupiah(total)}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={dialogType === 'receipt'} onOpenChange={(open) => { if (!open) setDialogType('none') }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Struk Pembayaran</DialogTitle>
            <DialogDescription className="sr-only">Detail struk transaksi</DialogDescription>
          </DialogHeader>
          <div id="receipt-content" className="p-6 dark:text-gray-900">
            {/* Thermal receipt style */}
            <div className="bg-white rounded-xl p-5 font-mono text-xs">
              {/* Top decorative dashed border */}
              <p className="text-center text-gray-300 tracking-widest text-[10px] mb-1">┌──────────────────────────┐</p>
              <p className="text-center text-gray-300 tracking-widest text-[10px] mb-3">│ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│</p>

              {/* Logo area with Store icon - Enhanced */}
              <div className="flex flex-col items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 flex items-center justify-center mb-2 shadow-sm">
                  <Store className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center tracking-wide">{storeSettings.storeName.toUpperCase()}</h2>
                {(storeSettings.address || storeSettings.phone || storeSettings.email) && (
                  <div className="mt-0.5 text-center">
                    {storeSettings.address && <p className="text-[10px] text-gray-500 dark:text-gray-400">{storeSettings.address}</p>}
                    {storeSettings.phone && <p className="text-[10px] text-gray-500 dark:text-gray-400">Telp: {storeSettings.phone}</p>}
                    {storeSettings.email && <p className="text-[10px] text-gray-500 dark:text-gray-400">{storeSettings.email}</p>}
                  </div>
                )}
              </div>

              <p className="text-center text-gray-300 dark:text-gray-600 mb-3">- - - - - - - - - - - - - - - - -</p>

              {lastTransaction && (
                <>
                  {lastTransaction.customerName && (
                    <p className="text-center text-[11px] text-gray-500 dark:text-gray-400 mb-1">Pelanggan: {lastTransaction.customerName}</p>
                  )}

                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">No. Transaksi</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{lastTransaction.transactionNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Tanggal</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {format(new Date(lastTransaction.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: localeId })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Kasir</span>
                      <span className="text-gray-900 dark:text-gray-100">{lastTransaction.user?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Metode</span>
                      <span className="text-gray-900 dark:text-gray-100">{lastTransaction.paymentMethod}</span>
                    </div>
                  </div>

                  <p className="text-center text-gray-300 dark:text-gray-600 my-2">- - - - - - - - - - - - - - - - -</p>

                  {/* Items with numbering and right-aligned prices */}
                  <div className="space-y-2 mb-3">
                    {lastTransaction.transactionItems?.map((item, idx) => (
                      <div key={item.id}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-gray-100">
                              <span className="text-gray-400 mr-1">{idx + 1}.</span>{item.productName}
                            </p>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 ml-2 shrink-0 text-right">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 ml-4">
                          {item.quantity} x {formatRupiah(item.price)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-center text-gray-300 dark:text-gray-600 my-2">- - - - - - - - - - - - - - - - -</p>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                      <span className="text-gray-900 dark:text-gray-100">{formatRupiah(lastTransaction.subtotalAmount)}</span>
                    </div>
                    {lastTransaction.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Diskon</span>
                        <span className="text-red-600 dark:text-red-400">-{formatRupiah(lastTransaction.discountAmount)}</span>
                      </div>
                    )}
                    {lastTransaction.taxEnabled && (lastTransaction.taxAmount ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">PPN ({lastTransaction.taxPercent || 11}%)</span>
                        <span className="text-gray-900 dark:text-gray-100">+{formatRupiah(lastTransaction.taxAmount ?? 0)}</span>
                      </div>
                    )}
                    <p className="text-center text-gray-300 dark:text-gray-600 my-1">- - - - - - - - - - - - - - - - -</p>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-gray-900 dark:text-gray-100">TOTAL</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">{formatRupiah(lastTransaction.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Bayar</span>
                      <span className="text-gray-900 dark:text-gray-100">{formatRupiah(lastTransaction.paymentAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Kembalian</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatRupiah(lastTransaction.changeAmount)}</span>
                    </div>
                  </div>

                  <p className="text-center text-gray-300 dark:text-gray-600 my-3">- - - - - - - - - - - - - - - - -</p>

                  {/* QR Code placeholder */}
                  <div className="flex flex-col items-center my-3">
                    <div className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                      <QrCode className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">Scan untuk detail</p>
                  </div>

                  {/* Thank you message */}
                  <div className="text-center">
                    {storeSettings.receiptFooter ? (
                      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{storeSettings.receiptFooter}</p>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Heart className="w-3 h-3 text-red-400" />
                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Terima Kasih Atas Kunjungan Anda</p>
                        <Heart className="w-3 h-3 text-red-400" />
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Barang yang sudah dibeli tidak dapat dikembalikan</p>
                  </div>

                  {/* Bottom decorative dashed border */}
                  <p className="text-center text-gray-300 tracking-widest text-[10px] mt-3 mb-1">│ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│</p>
                  <p className="text-center text-gray-300 tracking-widest text-[10px]">└──────────────────────────┘</p>
                </>
              )}
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setDialogType('none')}
              className="flex-1 h-11 cursor-pointer rounded-xl"
            >
              Tutup
            </Button>
            <Button
              onClick={handlePrintReceipt}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 cursor-pointer rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              Cetak
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Held Transactions Dialog */}
      <Dialog open={dialogType === 'held-list'} onOpenChange={(open) => { if (!open) setDialogType('none') }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-bold">Transaksi Ditahan</DialogTitle>
            <DialogDescription className="sr-only">Daftar transaksi yang ditahan</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 max-h-80 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
            {heldTransactions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Tidak ada transaksi ditahan</p>
            ) : (
              heldTransactions.map((held) => {
                const heldTotal = held.items.reduce((sum, i) => sum + i.product.sellPrice * i.quantity, 0)
                return (
                  <button
                    key={held.id}
                    onClick={() => handleResumeSelect(held)}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {format(new Date(held.createdAt), 'dd/MM/yyyy HH:mm', { locale: localeId })}
                      </div>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(heldTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {held.items.length} item{held.items.length > 1 ? 's' : ''}
                        {held.customerName ? ` · ${held.customerName}` : ''}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Lanjutkan &rarr;</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume Confirmation Alert Dialog */}
      <AlertDialog open={showResumeConfirm} onOpenChange={setShowResumeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Timbun Keranjang Saat Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Keranjang Anda sudah memiliki item. Melanjutkan transaksi yang ditahan akan mengganti semua item di keranjang saat ini. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelResume}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResume} className="bg-emerald-600 hover:bg-emerald-700">Ya, Lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
