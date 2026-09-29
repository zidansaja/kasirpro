import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'totalSpent';

    const validSortFields = ['totalSpent', 'visitCount'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'totalSpent';

    const customers = await db.customer.findMany({
      take: 10,
      orderBy: { [orderField]: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        points: true,
        totalSpent: true,
        visitCount: true,
        lastVisitAt: true,
      },
    });

    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('Get top customers error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
