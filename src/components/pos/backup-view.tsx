'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Database,
  Download,
  Upload,
  Loader2,
  FileJson,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Inbox,
  ShieldCheck,
  Package,
  Users,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { useAppStore } from '@/lib/store'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

interface BackupHistoryEntry {
  date: string
  filename: string
  size: number
}

interface DataHealth {
  products: number
  transactions: number
  customers: number
}

const STORAGE_KEY = 'kasirpro-backup-history'
const LAST_BACKUP_KEY = 'kasirpro-last-backup'

function getBackupHistory(): BackupHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveBackupHistory(entries: BackupHistoryEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 10)))
}

function getLastBackup(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_BACKUP_KEY)
}

function saveLastBackup(date: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_BACKUP_KEY, date)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BackupView() {
  const { user } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [restoreResult, setRestoreResult] = useState<Record<string, number> | null>(null)
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([])
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [dataHealth, setDataHealth] = useState<DataHealth>({ products: 0, transactions: 0, customers: 0 })

  useEffect(() => {
    setBackupHistory(getBackupHistory())
    setLastBackup(getLastBackup())
    fetchDataHealth()
  }, [])

  const fetchDataHealth = async () => {
    try {
      const [prodRes, txRes, custRes] = await Promise.all([
        fetch('/api/products?limit=1'),
        fetch('/api/transactions?limit=1'),
        fetch('/api/customers?limit=1'),
      ])
      const [prodData, txData, custData] = await Promise.all([
        prodRes.json(),
        txRes.json(),
        custRes.json(),
      ])
      setDataHealth({
        products: prodData.pagination?.total || 0,
        transactions: txData.pagination?.total || 0,
        customers: custData.pagination?.total || 0,
      })
    } catch {
      // silently fail
    }
  }

  const handleBackup = async () => {
    setIsBackingUp(true)
    try {
      const res = await fetch(`/api/backup?userRole=${user?.role}&userId=${user?.id}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal membuat backup')
      }

      const blob = await res.blob()
      const filename = `kasirpro-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const now = new Date().toISOString()
      saveLastBackup(now)
      setLastBackup(now)

      const newEntry: BackupHistoryEntry = {
        date: now,
        filename,
        size: blob.size,
      }
      const updated = [newEntry, ...getBackupHistory()].slice(0, 10)
      saveBackupHistory(updated)
      setBackupHistory(updated)

      toast.success('Backup berhasil diunduh')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat backup')
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast.error('File harus berformat JSON')
        return
      }
      setSelectedFile(file)
      setRestoreResult(null)
    }
  }

  const handleRestore = async () => {
    if (!selectedFile) return
    setShowRestoreDialog(false)
    setIsRestoring(true)
    setRestoreResult(null)

    try {
      const text = await selectedFile.text()
      const json = JSON.parse(text)

      const res = await fetch(`/api/restore?userRole=${user?.role}&userId=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal restore data')
      }

      const data = await res.json()
      setRestoreResult(data.imported)

      const total = Object.values(data.imported).reduce((s: number, v: unknown) => s + (v as number), 0)
      toast.success(`Restore berhasil! ${total} data diimpor`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal restore data')
    } finally {
      setIsRestoring(false)
    }
  }

  const dataLabels: Record<string, string> = {
    users: 'Pengguna',
    categories: 'Kategori',
    products: 'Produk',
    customers: 'Pelanggan',
    transactions: 'Transaksi',
    stockOpnames: 'Stok Opname',
    returns: 'Retur',
    expenses: 'Pengeluaran',
    shifts: 'Shift',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 w-12 h-12 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Backup & Restore</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola cadangan data toko Anda</p>
        </div>
      </motion.div>

      {/* Data Health Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Kesehatan Data</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center mx-auto mb-2 shadow-sm">
                <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{dataHealth.products}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Produk</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center mx-auto mb-2 shadow-sm">
                <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{dataHealth.transactions}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Transaksi</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center mx-auto mb-2 shadow-sm">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{dataHealth.customers}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Pelanggan</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Two Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-2xl p-[2px] bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-500">
            <Card className="rounded-2xl overflow-hidden border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* ShieldCheck Icon */}
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 w-20 h-20 flex items-center justify-center">
                    <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Ekspor Data
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Ekspor semua data toko ke file JSON
                    </p>
                  </div>

                  {/* Data included */}
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {['Pengguna', 'Produk', 'Kategori', 'Transaksi', 'Pelanggan', 'Stok Opname', 'Retur', 'Pengeluaran', 'Shift'].map((label) => (
                      <Badge
                        key={label}
                        variant="secondary"
                        className="text-[10px] px-2 py-0 h-5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>

                  {/* File size estimate + Last backup */}
                  <div className="w-full space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                      <HardDrive className="w-3.5 h-3.5 shrink-0" />
                      <span>Format: <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1 font-normal">JSON</Badge></span>
                    </div>
                    {lastBackup && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Backup terakhir: {format(new Date(lastBackup), "dd MMM yyyy, HH:mm", { locale: localeId })}</span>
                      </div>
                    )}
                  </div>

                  {/* Backup Button with pulse */}
                  <Button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 cursor-pointer animate-pulse-subtle"
                  >
                    {isBackingUp ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Membuat Backup...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Unduh Backup
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Restore Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="rounded-2xl p-[2px] bg-gradient-to-br from-amber-500 via-orange-400 to-amber-600">
            <Card className="rounded-2xl overflow-hidden border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* AlertTriangle Icon */}
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 w-20 h-20 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Impor Data
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Impor data dari file backup
                    </p>
                  </div>

                  {/* Supported format badge */}
                  <Badge variant="outline" className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                    <FileJson className="w-3.5 h-3.5 mr-1" />
                    Format didukung: .json
                  </Badge>

                  {/* Warning */}
                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2.5 w-full text-left">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Data yang ada akan ditambahkan, tidak ditimpa. Data duplikat akan dilewati.</span>
                  </div>

                  {/* File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-dashed border-2 h-20 flex-col gap-1 hover:bg-amber-50 dark:hover:bg-amber-950/20 cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedFile ? selectedFile.name : 'Pilih file backup (.json)'}
                    </span>
                    {selectedFile && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </span>
                    )}
                  </Button>

                  {/* Restore Result Summary */}
                  {restoreResult && (
                    <div className="w-full bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Restore Berhasil</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        {Object.entries(restoreResult)
                          .filter(([, v]) => v > 0)
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between gap-2">
                              <span className="text-gray-600 dark:text-gray-400">{dataLabels[key] || key}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-200">{value as number}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Restore Button */}
                  <Button
                    onClick={() => setShowRestoreDialog(true)}
                    disabled={!selectedFile || isRestoring}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 cursor-pointer"
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memulihkan Data...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Mulai Restore
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Backup History - Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Riwayat Backup
              </h3>
              <Badge variant="secondary" className="text-[10px] h-5">
                {backupHistory.length} backup
              </Badge>
            </div>

            {backupHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-xl bg-gray-100 dark:bg-gray-800 w-16 h-16 flex items-center justify-center mb-3">
                  <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada backup</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Buat backup pertama Anda dengan tombol Unduh Backup di atas
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-emerald-200 dark:bg-emerald-800" />
                  <div className="space-y-3">
                    {backupHistory.map((entry, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3 pl-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        {/* Timeline dot */}
                        <div className={`absolute left-[11px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${index === 0 ? 'bg-emerald-500' : 'bg-emerald-300 dark:bg-emerald-700'}`} />
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-2">
                            <FileJson className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                              {entry.filename}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{format(new Date(entry.date), "dd MMM yyyy, HH:mm:ss", { locale: localeId })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] h-5 font-normal">
                            <HardDrive className="w-3 h-3 mr-1" />
                            {formatFileSize(entry.size)}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Konfirmasi Restore Data
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Anda akan memulihkan data dari file backup:
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                  <div className="font-medium text-gray-900 dark:text-gray-200">{selectedFile?.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ukuran: {selectedFile ? formatFileSize(selectedFile.size) : '-'}
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                    Perhatian:
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 mt-1.5 space-y-1 list-disc list-inside">
                    <li>Data duplikat (username, SKU, dll) akan dilewati</li>
                    <li>Data akan ditambahkan ke database yang ada</li>
                    <li>Proses ini tidak dapat dibatalkan</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              Ya, Lanjutkan Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
