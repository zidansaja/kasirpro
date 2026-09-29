import { createHmac, timingSafeEqual } from 'node:crypto'

// Nama cookie tempat token login disimpan (HttpOnly: tidak bisa dibaca JavaScript di browser)
export const SESSION_COOKIE = 'kasir_session'
const SESSION_MAX_AGE = 60 * 60 * 12 // login berlaku 12 jam

export interface SessionUser {
  id: string
  role: string
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET belum diatur di .env (minimal 32 karakter acak).')
  }
  return secret
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url')
}

// Token = data pengguna + tanda tangan rahasia. Kalau data diubah, tanda tangan tidak cocok.
export function createSessionToken(user: SessionUser): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  const payload = Buffer.from(JSON.stringify({ uid: user.id, role: user.role, exp })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.uid !== 'string' || typeof data.role !== 'string') return null
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null
    return { id: data.uid, role: data.role }
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Isi COOKIE_SECURE=true di .env kalau aplikasi diakses lewat HTTPS
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
  maxAge: SESSION_MAX_AGE,
}

// Dipakai di route API: identitas pengguna yang sudah diverifikasi oleh proxy.ts.
// Jangan pernah pakai userId/userRole dari body atau URL, karena bisa dipalsukan.
export function getSessionUser(request: Request): SessionUser {
  return {
    id: request.headers.get('x-session-user-id') || '',
    role: request.headers.get('x-session-user-role') || '',
  }
}
