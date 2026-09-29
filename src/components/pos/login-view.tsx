'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Store, User, Lock, Loader2, Eye, EyeOff, Keyboard, Check, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import type { User as UserType } from '@/lib/types'

export default function LoginView() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Load remembered username on mount
  useEffect(() => {
    const saved = localStorage.getItem('kasirpro_username')
    if (saved) {
      setUsername(saved)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.message || 'Login gagal')
        setLoginAttempts((prev) => prev + 1)
        return
      }

      // Remember username if checked
      if (rememberMe) {
        localStorage.setItem('kasirpro_username', username.trim())
      } else {
        localStorage.removeItem('kasirpro_username')
      }

      // Reset attempts on success
      setLoginAttempts(0)

      // Show success animation
      setShowSuccess(true)

      const user = data.user as UserType

      // Brief delay for success animation before navigating
      setTimeout(() => {
        useAppStore.getState().login(user)
        toast.success(`Selamat datang, ${user.name}!`)
      }, 800)
    } catch {
      setError('Terjadi kesalahan koneksi. Silakan coba lagi.')
      setLoginAttempts((prev) => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 relative overflow-hidden">
      {/* Dot pattern background overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Animated SVG Wave Background */}
      <div className="absolute bottom-0 left-0 w-full z-0 overflow-hidden">
        <svg
          className="w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{ minHeight: '120px' }}
        >
          <motion.path
            fill="rgba(16, 185, 129, 0.08)"
            animate={{
              d: [
                "M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,165.3C960,160,1056,192,1152,202.7C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,256L48,240C96,224,192,192,288,186.7C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,165.3C1248,171,1344,213,1392,234.7L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,165.3C960,160,1056,192,1152,202.7C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            fill="rgba(20, 184, 166, 0.06)"
            animate={{
              d: [
                "M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,245.3C672,256,768,256,864,240C960,224,1056,192,1152,186.7C1248,181,1344,203,1392,213.3L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,229.3C672,213,768,203,864,213.3C960,224,1056,256,1152,261.3C1248,267,1344,245,1392,234.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,245.3C672,256,768,256,864,240C960,224,1056,192,1152,186.7C1248,181,1344,203,1392,213.3L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              ],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            fill="rgba(16, 185, 129, 0.04)"
            animate={{
              d: [
                "M0,160L48,170.7C96,181,192,203,288,208C384,213,480,203,576,186.7C672,171,768,149,864,154.7C960,160,1056,192,1152,202.7C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,192L48,186.7C96,181,192,171,288,181.3C384,192,480,224,576,229.3C672,235,768,213,864,197.3C960,181,1056,171,1152,176C1248,181,1344,203,1392,213.3L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,160L48,170.7C96,181,192,203,288,208C384,213,480,203,576,186.7C672,171,768,149,864,154.7C960,160,1056,192,1152,202.7C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              ],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-600/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-24 h-24 rounded-full bg-white dark:bg-gray-900 shadow-2xl flex items-center justify-center"
            >
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
              >
                <Check className="w-12 h-12 text-emerald-500" strokeWidth={3} />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-white/95 dark:bg-white/5 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-10 px-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
              transition={{
                scale: { delay: 0.2, duration: 0.4, type: 'spring', stiffness: 200 },
                opacity: { delay: 0.2, duration: 0.4 },
                y: { delay: 1, duration: 3, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="mx-auto mb-5 w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30"
            >
              <Store className="w-12 h-12 text-white" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="flex items-center justify-center gap-2"
            >
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                KasirPro
              </h1>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5">
                v2.0
              </span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-1.5"
            >
              Sistem Kasir Modern
            </motion.p>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400"
                >
                  <div className="flex items-center justify-between">
                    <span>{error}</span>
                    {loginAttempts > 0 && (
                      <span className="text-xs text-red-500/70 dark:text-red-400/70 ml-2 shrink-0">
                        Percobaan ke-{loginAttempts}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Show attempts counter even without error if there were failed attempts */}
              {!error && loginAttempts > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-red-400/60 dark:text-red-400/40 text-center"
                >
                  Percobaan ke-{loginAttempts} gagal
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-12 h-12 bg-gray-50/80 border-gray-200 dark:bg-white/10 dark:border-white/20 dark:text-white dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-white/15 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-base transition-shadow duration-200 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 bg-gray-50/80 border-gray-200 dark:bg-white/10 dark:border-white/20 dark:text-white dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-white/15 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-base transition-shadow duration-200 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <Label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                  Ingat Saya
                </Label>
              </div>

              <Button
                type="submit"
                disabled={loading || showSuccess}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-base mt-2 cursor-pointer rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-700/30 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>

              {/* Keyboard shortcut hints */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="flex items-center justify-center gap-1.5 pt-1"
              >
                <Keyboard className="w-3.5 h-3.5 text-emerald-200/60 dark:text-gray-600" />
                <span className="text-xs text-emerald-200/60 dark:text-gray-600">
                  Tips: Gunakan F2 untuk membuka kasir, F3 untuk dashboard
                </span>
              </motion.div>

              {/* Demo Credentials Collapsible */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
              >
                <Collapsible open={demoOpen} onOpenChange={setDemoOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-200/70 dark:text-gray-500 hover:text-emerald-200 dark:hover:text-gray-400 transition-colors cursor-pointer py-1"
                    >
                      {demoOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Lihat Demo
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-2 rounded-xl bg-emerald-800/20 dark:bg-white/5 border border-emerald-700/20 dark:border-white/10 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-200/50 dark:text-gray-500 font-semibold mb-2">Akun Demo</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-xs text-emerald-100/80 dark:text-gray-300 font-medium">Admin</span>
                            <span className="text-[11px] text-emerald-200/50 dark:text-gray-500 font-mono">admin / admin123</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-emerald-200/50 hover:text-emerald-100 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer"
                          onClick={() => copyToClipboard('admin', 'admin-user')}
                        >
                          {copiedField === 'admin-user' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-xs text-emerald-100/80 dark:text-gray-300 font-medium">Kasir</span>
                            <span className="text-[11px] text-emerald-200/50 dark:text-gray-500 font-mono">kasir1 / kasir123</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-emerald-200/50 hover:text-emerald-100 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer"
                          onClick={() => copyToClipboard('kasir1', 'kasir-user')}
                        >
                          {copiedField === 'kasir-user' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            </motion.form>
          </CardContent>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center mt-6 text-sm text-emerald-100/70 dark:text-gray-500 font-medium"
        >
          &copy; 2026 KasirPro
        </motion.p>
      </motion.div>
    </div>
  )
}
