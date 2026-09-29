import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status harus APPROVED atau REJECTED' },
        { status: 400 }
      );
    }

    const existing = await db.productReturn.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Pengembalian tidak ditemukan' },
        { status: 404 }
      );
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Hanya pengembalian dengan status PENDING yang bisa diubah' },
        { status: 400 }
      );
    }

    const productReturn = await db.$transaction(async (tx) => {
      const updated = await tx.productReturn.update({
        where: { id },
        data: { status },
        include: {
          user: {
            select: { id: true, username: true, name: true, role: true },
          },
          transaction: true,
          items: true,
        },
      });

      // If APPROVED, restore stock
      if (status === 'APPROVED') {
        for (const item of updated.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, productReturn });
  } catch (error) {
    console.error('Update return error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
