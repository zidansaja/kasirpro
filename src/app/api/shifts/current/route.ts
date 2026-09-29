import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID wajib diisi' },
        { status: 400 }
      );
    }

    const shift = await db.shift.findFirst({
      where: { userId, status: 'OPEN' },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!shift) {
      return NextResponse.json({ success: true, shift: null });
    }

    // Get quick stats for the current shift
    const [txCount, cashRevenue, allRevenue] = await Promise.all([
      db.transaction.count({
        where: {
          OR: [
            { shiftId: shift.id },
            { createdAt: { gte: shift.openedAt }, shiftId: null },
          ],
        },
      }),
      db.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          paymentMethod: 'CASH',
          OR: [
            { shiftId: shift.id },
            { createdAt: { gte: shift.openedAt }, shiftId: null },
          ],
        },
      }),
      db.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          OR: [
            { shiftId: shift.id },
            { createdAt: { gte: shift.openedAt }, shiftId: null },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      shift,
      stats: {
        transactionCount: txCount,
        cashRevenue: cashRevenue._sum.totalAmount || 0,
        totalRevenue: allRevenue._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error('Get current shift error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
