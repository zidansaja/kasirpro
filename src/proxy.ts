import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

// Penjaga semua endpoint /api. Berjalan sebelum route dieksekusi.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Login/logout ditangani langsung oleh route /api/auth
  if (pathname === '/api/auth') return NextResponse.next()

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ success: false, message: 'Silakan login terlebih dahulu' }, { status: 401 })
  }

  const isAdmin = session.role === 'ADMIN'
  const method = request.method
  const deny = () =>
    NextResponse.json({ success: false, message: 'Akses ditolak. Hanya admin.' }, { status: 403 })

  // Endpoint khusus admin
  if (pathname === '/api/users' || pathname.startsWith('/api/audit-logs') ||
      pathname.startsWith('/api/backup') || pathname.startsWith('/api/restore')) {
    if (!isAdmin) return deny()
  }
  // Ubah/hapus pengguna: admin, atau pengguna itu sendiri (ganti profil)
  if (pathname.startsWith('/api/users/')) {
    const targetId = pathname.split('/')[3]
    if (!isAdmin && (targetId !== session.id || method === 'DELETE')) return deny()
  }
  // Pengaturan toko: semua boleh baca, hanya admin yang boleh ubah
  if (pathname.startsWith('/api/settings') && method !== 'GET' && !isAdmin) return deny()

  // Header identitas dari klien dihapus dulu, lalu diisi ulang dari sesi yang terverifikasi
  const headers = new Headers(request.headers)
  headers.set('x-session-user-id', session.id)
  headers.set('x-session-user-role', session.role)

  // Route lama membaca ?userRole= dari URL. Timpa dengan role asli supaya tidak bisa dipalsukan.
  const url = request.nextUrl.clone()
  if (url.searchParams.has('userRole')) url.searchParams.set('userRole', session.role)

  return NextResponse.rewrite(url, { request: { headers } })
}

export const config = {
  matcher: '/api/:path*',
}
