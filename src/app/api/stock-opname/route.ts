import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = {};
    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);

    const stockOpnames = await db.stockOpname.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, name: true, role: true },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, stockOpnames });
  } catch (error) {
    console.error('Get stock opnames error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = getSessionUser(request).id;
    const { month, year, note, status, items } = body;

    if (!userId || !month || !year || !items || !items.length) {
      return NextResponse.json(
        { success: false, message: 'User, bulan, tahun, dan items wajib diisi' },
        { status: 400 }
      );
    }

    // Check if stock opname already exists for this month/year
    const existing = await db.stockOpname.findUnique({
      where: { month_year: { month, year } },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Stock opname untuk bulan dan tahun ini sudah ada' },
        { status: 400 }
      );
    }

    const finalStatus = status || 'DRAFT';

    const stockOpname = await db.$transaction(async (tx) => {
      const so = await tx.stockOpname.create({
        data: {
          userId,
          month,
          year,
          note: note || null,
          status: finalStatus,
          items: {
            create: items.map((item: Record<string, unknown>) => ({
              productId: item.productId as string,
              productName: item.productName as string,
              systemStock: item.systemStock as number,
              actualStock: item.actualStock as number,
              difference: (item.actualStock as number) - (item.systemStock as number),
              note: (item.note as string) || null,
            })),
          },
        },
        include: {
          user: {
            select: { id: true, username: true, name: true, role: true },
          },
          items: true,
        },
      });

      // If APPROVED, update product stocks
      if (finalStatus === 'APPROVED') {
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId as string },
            data: { stock: item.actualStock as number },
          });
        }
      }

      return so;
    });

    return NextResponse.json({ success: true, stockOpname }, { status: 201 });
  } catch (error) {
    console.error('Create stock opname error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
