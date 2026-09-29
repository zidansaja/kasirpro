import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    if (amount === undefined || amount === null || !reason?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Jumlah poin dan alasan wajib diisi' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || !Number.isInteger(amount)) {
      return NextResponse.json(
        { success: false, message: 'Jumlah poin harus berupa bilangan bulat' },
        { status: 400 }
      );
    }

    if (amount === 0) {
      return NextResponse.json(
        { success: false, message: 'Jumlah poin tidak boleh nol' },
        { status: 400 }
      );
    }

    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      );
    }

    const newPoints = existing.points + amount;
    if (newPoints < 0) {
      return NextResponse.json(
        { success: false, message: `Poin tidak cukup. Poin saat ini: ${existing.points}` },
        { status: 400 }
      );
    }

    const customer = await db.customer.update({
      where: { id },
      data: {
        points: newPoints,
        note: existing.note
          ? `${existing.note} | ${amount > 0 ? '+' : ''}${amount} poin: ${reason.trim()}`
          : `${amount > 0 ? '+' : ''}${amount} poin: ${reason.trim()}`,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Adjust points error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
