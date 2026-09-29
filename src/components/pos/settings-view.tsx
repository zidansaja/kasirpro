'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Store,
  Percent,
  CircleDollarSign,
  Receipt,
  Loader2,
  Save,
  Eye,
  Printer,
  Ruler,
  Type,
  AlignJustify,
  ToggleLeft,
  Copy,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import type { StoreSetting } from '@/lib/types'

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

export default function SettingsView() {
  const { user } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Store info
  const [storeName, setStoreName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxPercent, setTaxPercent] = useState('11')
  const [currency, setCurrency] = useState('')
  const [receiptFooter, setReceiptFooter] = useState('')

  // Receipt print settings
  const [paperWidth, setPaperWidth] = useState('58')
  const [fontSize, setFontSize] = useState('small')
  const [charPerLine, setCharPerLine] = useState('32')
  const [lineSpacing, setLineSpacing] = useState('normal')
  const [margin, setMargin] = useState('2')
  const [showLogo, setShowLogo] = useState(true)
  const [showAddress, setShowAddress] = useState(true)
  const [showPhone, setShowPhone] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [showTax, setShowTax] = useState(true)
  const [showPayment, setShowPayment] = useState(true)
  const [showQrCode, setShowQrCode] = useState(false)
  const [showItems, setShowItems] = useState(true)
  const [duplicate, setDuplicate] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  // Auto-calculate chars per line when paper width changes
  useEffect(() => {
    const w = parseInt(paperWidth)
    if (w === 58) setCharPerLine('32')
    else if (w === 80) setCharPerLine('48')
    else if (w === 76) setCharPerLine('44')
  }, [paperWidth])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data.success && data.settings) {
        const s = data.settings as StoreSetting
        setStoreName(s.storeName || '')
        setAddress(s.address || '')
        setPhone(s.phone || '')
        setEmail(s.email || '')
        setTaxEnabled(s.taxEnabled)
        setTaxPercent(String(s.taxPercent))
        setCurrency(s.currency || '')
        setReceiptFooter(s.receiptFooter || '')
        setPaperWidth(String(s.receiptPaperWidth || 58))
        setFontSize(s.receiptFontSize || 'small')
        setCharPerLine(String(s.receiptCharPerLine || 32))
        setLineSpacing(s.receiptLineSpacing || 'normal')
        setMargin(String(s.receiptMargin ?? 2))
        setShowLogo(s.receiptShowLogo ?? true)
        setShowAddress(s.receiptShowAddress ?? true)
        setShowPhone(s.receiptShowPhone ?? true)
        setShowEmail(s.receiptShowEmail ?? false)
        setShowTax(s.receiptShowTax ?? true)
        setShowPayment(s.receiptShowPayment ?? true)
        setShowQrCode(s.receiptShowQrCode ?? false)
        setShowItems(s.receiptShowItems ?? true)
        setDuplicate(s.receiptDuplicate ?? false)
      }
    } catch {
      toast.error('Gagal memuat pengaturan')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!storeName.trim()) {
      toast.error('Nama toko wajib diisi')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/settings?userRole=${user?.role}&userId=${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeName.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          taxEnabled,
          taxPercent: parseFloat(taxPercent) || 11,
          currency: currency.trim() || 'IDR',
          receiptFooter: receiptFooter.trim() || null,
          receiptPaperWidth: parseInt(paperWidth) || 58,
          receiptFontSize: fontSize,
          receiptCharPerLine: parseInt(charPerLine) || 32,
          receiptLineSpacing: lineSpacing,
          receiptMargin: parseInt(margin) || 2,
          receiptShowLogo: showLogo,
          receiptShowAddress: showAddress,
          receiptShowPhone: showPhone,
          receiptShowEmail: showEmail,
          receiptShowTax: showTax,
          receiptShowPayment: showPayment,
          receiptShowQrCode: showQrCode,
          receiptShowItems: showItems,
          receiptDuplicate: duplicate,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Pengaturan berhasil disimpan')
      } else {
        toast.error(data.message || 'Gagal menyimpan pengaturan')
      }
    } catch {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  const taxRate = parseFloat(taxPercent) || 0

  // Receipt preview helpers
  const previewLine = (text: string) => {
    const max = parseInt(charPerLine) || 32
    if (text.length <= max) return text
    return text.substring(0, max - 1) + '…'
  }

  const previewDivider = () => {
    const max = parseInt(charPerLine) || 32
    return '-'.repeat(max)
  }

  const previewJustify = (left: string, right: string) => {
    const max = parseInt(charPerLine) || 32
    const space = max - left.length - right.length
    if (space <= 0) return left + ' ' + right
    return left + ' '.repeat(space) + right
  }

  const fontPx = fontSize === 'small' ? '10px' : fontSize === 'medium' ? '12px' : '14px'
  const lineH = lineSpacing === 'compact' ? '1.2' : lineSpacing === 'normal' ? '1.5' : '1.8'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-72 h-4" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-full h-48 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 w-12 h-12 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pengaturan Toko</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Konfigurasi informasi toko dan preferensi</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setPreviewOpen(true)}
          className="gap-2 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          Preview Struk
        </Button>
      </motion.div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Section 1: Informasi Toko */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 w-10 h-10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Informasi Toko</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Data yang ditampilkan di struk dan aplikasi</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nama Toko <span className="text-red-500">*</span>
                  </Label>
                  <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Masukkan nama toko" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300">Alamat</Label>
                  <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Masukkan alamat toko" rows={3} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">Telepon</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@toko.com" className="h-11" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 2: Pengaturan Pajak */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 w-10 h-10 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Pengaturan Pajak</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Konfigurasi PPN untuk transaksi</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">PPN Aktif</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Aktifkan perhitungan pajak pada transaksi</p>
                  </div>
                  <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
                </div>
                {taxEnabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="taxPercent" className="text-sm font-medium text-gray-700 dark:text-gray-300">Persentase Pajak (%)</Label>
                        <Input id="taxPercent" type="number" min="0" max="100" step="0.1" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} placeholder="11" className="h-11 w-full sm:w-32" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Tingkat pajak</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">{taxRate}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(taxRate, 100)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 3: Mata Uang */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm border-l-4 border-l-cyan-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/50 w-10 h-10 flex items-center justify-center">
                  <CircleDollarSign className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Mata Uang</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kode mata uang untuk transaksi</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-medium text-gray-700 dark:text-gray-300">Kode Mata Uang</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="IDR" className="h-11 w-full sm:w-32" />
                <p className="text-xs text-gray-400 dark:text-gray-500">Contoh: IDR, USD, SGD</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 4: Pengaturan Cetak Struk ★ NEW ★ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm border-l-4 border-l-violet-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-violet-50 dark:bg-violet-950/50 w-10 h-10 flex items-center justify-center">
                  <Printer className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Pengaturan Cetak Struk</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sesuaikan tampilan struk dengan kertas printer Anda</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Paper Width - Visual selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-violet-500" />
                    Lebar Kertas
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: '58', label: '58 mm', desc: 'Thermal kecil', width: 'w-20' },
                      { value: '76', label: '76 mm', desc: 'Thermal sedang', width: 'w-28' },
                      { value: '80', label: '80 mm', desc: 'Thermal besar', width: 'w-32' },
                    ].map((pw) => (
                      <button
                        key={pw.value}
                        onClick={() => setPaperWidth(pw.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          paperWidth === pw.value
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 bg-white dark:bg-gray-800/50'
                        }`}
                      >
                        {/* Visual paper representation */}
                        <div className={`${pw.width} h-16 rounded-sm border-2 ${paperWidth === pw.value ? 'border-violet-400 bg-white' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'} flex items-center justify-center shadow-sm`}>
                          <FileText className={`w-4 h-4 ${paperWidth === pw.value ? 'text-violet-500' : 'text-gray-400'}`} />
                        </div>
                        <div className="text-center">
                          <p className={`text-sm font-semibold ${paperWidth === pw.value ? 'text-violet-700 dark:text-violet-400' : 'text-gray-700 dark:text-gray-300'}`}>{pw.label}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{pw.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size & Line Spacing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Type className="w-4 h-4 text-violet-500" />
                      Ukuran Font
                    </Label>
                    <Select value={fontSize} onValueChange={setFontSize}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Kecil (10px) — Hemat kertas</SelectItem>
                        <SelectItem value="medium">Sedang (12px) — Standar</SelectItem>
                        <SelectItem value="large">Besar (14px) — Mudah baca</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <AlignJustify className="w-4 h-4 text-violet-500" />
                      Jarak Baris
                    </Label>
                    <Select value={lineSpacing} onValueChange={setLineSpacing}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Rapat — Hemat kertas</SelectItem>
                        <SelectItem value="normal">Normal — Standar</SelectItem>
                        <SelectItem value="relaxed">Longgar — Mudah baca</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Chars Per Line & Margin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="charPerLine" className="text-sm font-medium text-gray-700 dark:text-gray-300">Karakter Per Baris</Label>
                    <Input
                      id="charPerLine"
                      type="number"
                      min="20"
                      max="60"
                      value={charPerLine}
                      onChange={(e) => setCharPerLine(e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500">Auto: 58mm=32, 76mm=44, 80mm=48</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="margin" className="text-sm font-medium text-gray-700 dark:text-gray-300">Margin Kertas (mm)</Label>
                    <Input
                      id="margin"
                      type="number"
                      min="0"
                      max="10"
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500">Jarak tepi kertas ke konten</p>
                  </div>
                </div>

                <Separator className="my-2" />

                {/* Toggle settings - Show/Hide sections */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ToggleLeft className="w-4 h-4 text-violet-500" />
                    Tampilkan di Struk
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { label: 'Logo Toko', value: showLogo, setter: setShowLogo, icon: '🏪' },
                      { label: 'Alamat', value: showAddress, setter: setShowAddress, icon: '📍' },
                      { label: 'Telepon', value: showPhone, setter: setShowPhone, icon: '📞' },
                      { label: 'Email', value: showEmail, setter: setShowEmail, icon: '📧' },
                      { label: 'Detail Pajak', value: showTax, setter: setShowTax, icon: '🧾' },
                      { label: 'Metode Bayar', value: showPayment, setter: setShowPayment, icon: '💳' },
                      { label: 'QR Code', value: showQrCode, setter: setShowQrCode, icon: '📱' },
                      { label: 'Detail Item', value: showItems, setter: setShowItems, icon: '📦' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <span className="text-base">{item.icon}</span>
                          {item.label}
                        </span>
                        <Switch checked={item.value} onCheckedChange={item.setter} />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="my-2" />

                {/* Duplicate copy */}
                <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Cetak Duplikat</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cetak 2 salinan struk (untuk kasir & pelanggan)</p>
                    </div>
                  </div>
                  <Switch checked={duplicate} onCheckedChange={setDuplicate} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 5: Footer Struk */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm border-l-4 border-l-rose-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 w-10 h-10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Teks Footer Struk</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Teks yang ditampilkan di bagian bawah struk</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptFooter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Teks Footer</Label>
                <Textarea id="receiptFooter" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} placeholder="Terima Kasih Atas Kunjungan Anda" rows={2} />
                <p className="text-xs text-gray-400 dark:text-gray-500">Jika dikosongkan, akan menampilkan pesan default</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* Save Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 cursor-pointer px-8 h-11"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Receipt Preview Dialog - with print settings applied */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-500" />
              Preview Struk
            </DialogTitle>
            <DialogDescription>Preview sesuai pengaturan kertas Anda ({paperWidth}mm, font {fontSize})</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3">
            {/* Paper size indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Badge variant="outline" className="text-[10px]">{paperWidth}mm</Badge>
              <Badge variant="outline" className="text-[10px]">{charPerLine} char/baris</Badge>
              <Badge variant="outline" className="text-[10px]">Font {fontPx}</Badge>
            </div>

            {/* Receipt preview */}
            <div
              className="bg-white border border-gray-300 rounded-sm font-mono text-gray-800 overflow-hidden"
              style={{
                width: `${parseInt(paperWidth) * 0.264583}mm`, // mm to mm (1:1)
                maxWidth: '100%',
                fontSize: fontPx,
                lineHeight: lineH,
                padding: `${parseInt(margin)}mm`,
              }}
            >
              {/* Logo */}
              {showLogo && (
                <div className="text-center mb-1">
                  <p className="font-bold" style={{ fontSize: `calc(${fontPx} + 2px)` }}>{storeName || 'NAMA TOKO'}</p>
                </div>
              )}

              {/* Store info */}
              {(showAddress && address) && <p className="text-gray-500 text-center">{previewLine(address)}</p>}
              {(showPhone && phone) && <p className="text-gray-500 text-center">{previewLine('Telp: ' + phone)}</p>}
              {(showEmail && email) && <p className="text-gray-500 text-center">{previewLine(email)}</p>}

              <p className="text-gray-400 my-1">{previewDivider()}</p>

              {/* Transaction info */}
              <p>{previewJustify('No: TRX-001', new Date().toLocaleDateString('id-ID'))}</p>
              <p>{previewJustify('Kasir:', 'Admin')}</p>
              {showPayment && <p>{previewJustify('Metode:', 'CASH')}</p>}

              <p className="text-gray-400 my-1">{previewDivider()}</p>

              {/* Items */}
              {showItems && (
                <>
                  <p>{previewJustify('Contoh Produk', 'x2')}</p>
                  <p className="text-right">{formatRupiah(20000)}</p>
                  <p>{previewJustify('Produk Lain', 'x1')}</p>
                  <p className="text-right">{formatRupiah(15000)}</p>
                </>
              )}

              <p className="text-gray-400 my-1">{previewDivider()}</p>

              {/* Totals */}
              <p>{previewJustify('Subtotal', formatRupiah(35000))}</p>
              {showTax && taxEnabled && (
                <p className="text-gray-600">{previewJustify(`PPN (${taxRate}%)`, formatRupiah(Math.round(35000 * taxRate / 100)))}</p>
              )}
              <p className="font-bold">{previewJustify('TOTAL', formatRupiah(taxEnabled ? Math.round(35000 * (1 + taxRate / 100)) : 35000))}</p>

              <p className="text-gray-400 my-1">{previewDivider()}</p>

              {/* QR Code placeholder */}
              {showQrCode && (
                <div className="text-center my-1">
                  <p className="text-gray-400">[QR Code]</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center mt-1">
                <p className="text-gray-600">{receiptFooter || 'Terima Kasih'}</p>
              </div>
            </div>

            {/* Duplicate indicator */}
            {duplicate && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <Copy className="w-3.5 h-3.5" />
                <span>Akan dicetak 2 salinan (Kasir + Pelanggan)</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
