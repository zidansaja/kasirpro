import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

function generateReturnNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const pad = (n: number) => String(n).padStart(4, '0');
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return db.productReturn.count({
    where: {
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  }).then((count) => `RET-${dateStr}-${pad(count + 1)}`);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }

    const returns = await db.productReturn.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, name: true, role: true },
        },
        transaction: {
          include: {
            transactionItems: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, returns });
  } catch (error) {
    console.error('Get returns error:', error);
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
    const { transactionId, items, reason, status } = body;

    if (!userId || !items || !items.length || !reason) {
      return NextResponse.json(
        { success: false, message: 'User, items, dan alasan wajib diisi' },
        { status: 400 }
      );
    }

    const finalStatus = status || 'PENDING';
    const returnNumber = await generateReturnNumber();
    const totalRefund = items.reduce(
      (sum: number, item: Record<string, number>) => sum + item.subtotal,
      0
    );

    const productReturn = await db.$transaction(async (tx) => {
      const ret = await tx.productReturn.create({
        data: {
          returnNumber,
          transactionId: transactionId || null,
          userId,
          totalRefund,
          reason,
          status: finalStatus,
          items: {
            create: items.map((item: Record<string, unknown>) => ({
              productId: item.productId as string,
              productName: item.productName as string,
              quantity: item.quantity as number,
              price: item.price as number,
              subtotal: item.subtotal as number,
            })),
          },
        },
        include: {
          user: {
            select: { id: true, username: true, name: true, role: true },
          },
          transaction: true,
          items: true,
        },
      });

      // If APPROVED, restore stock
      if (finalStatus === 'APPROVED') {
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId as string },
            data: { stock: { increment: item.quantity as number } },
          });
        }
      }

      return ret;
    });

    return NextResponse.json({ success: true, productReturn }, { status: 201 });
  } catch (error) {
    console.error('Create return error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
