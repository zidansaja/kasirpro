import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compareSync } from 'bcryptjs';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifySessionToken } from '@/lib/session';

// Pembatas percobaan login: maksimal 5 kali gagal per 5 menit untuk tiap pengguna+IP (disimpan di memori)
const failedLogins = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILS = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi' },
        { status: 400 }
      );
    }

    const ipKey = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'local';
    const key = `${ipKey}:${String(username).toLowerCase()}`;
    const record = failedLogins.get(key);
    if (record && Date.now() - record.first < WINDOW_MS && record.count >= MAX_FAILS) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan gagal. Coba lagi dalam 5 menit.' },
        { status: 429 }
      );
    }
    const registerFail = () => {
      const now = Date.now();
      const r = failedLogins.get(key);
      if (!r || now - r.first >= WINDOW_MS) failedLogins.set(key, { count: 1, first: now });
      else r.count += 1;
    };

    const user = await db.user.findUnique({ where: { username } });

    if (!user) {
      registerFail();
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { success: false, message: 'Akun dinonaktifkan' },
        { status: 401 }
      );
    }

    const isValid = compareSync(password, user.password);
    if (!isValid) {
      registerFail();
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Record login in audit log (fire and forget)
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
      if (db.auditLog) {
        db.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            entity: 'User',
            entityId: user.id,
            details: JSON.stringify({ username: user.username, name: user.name }),
            ipAddress: ip,
          },
        }).catch(() => {});
      }
    } catch {}

    const { password: _, ...userWithoutPassword } = user;
    failedLogins.delete(key);
    const response = NextResponse.json({ success: true, user: userWithoutPassword });
    response.cookies.set(SESSION_COOKIE, createSessionToken({ id: user.id, role: user.role }), sessionCookieOptions);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Kembalikan pengguna yang sedang login (dari cookie sesi), atau null
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ success: true, user: null });
  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) return NextResponse.json({ success: true, user: null });
  const { password: _, ...userWithoutPassword } = user;
  return NextResponse.json({ success: true, user: userWithoutPassword });
}

export async function DELETE() {
  // Logout: hapus cookie sesi
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
