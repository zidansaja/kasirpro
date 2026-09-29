import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.openedAt = { gte: start, lte: end };
    }

    // Count total for pagination
    const total = await db.shift.count({ where });

    // Fetch shifts
    const shifts = await db.shift.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { openedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      shifts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get shifts error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startCash, note } = body;
    const { id: userId, role: userRole } = getSessionUser(request);

    if (!userId || startCash === undefined || startCash < 0) {
      return NextResponse.json(
        { success: false, message: 'User dan kas awal wajib diisi' },
        { status: 400 }
      );
    }

    // Check if user already has an open shift
    const existingOpen = await db.shift.findFirst({
      where: { userId, status: 'OPEN' },
    });

    if (existingOpen) {
      return NextResponse.json(
        { success: false, message: 'Anda sudah memiliki shift yang aktif. Tutup shift terlebih dahulu.' },
        { status: 400 }
      );
    }

    const shift = await db.shift.create({
      data: {
        userId,
        startCash: Number(startCash),
        note: note || null,
        status: 'OPEN',
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, shift }, { status: 201 });
  } catch (error) {
    console.error('Create shift error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
