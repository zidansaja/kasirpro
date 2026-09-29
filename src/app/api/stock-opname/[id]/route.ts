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

    if (!status || !['SUBMITTED', 'APPROVED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status harus SUBMITTED atau APPROVED' },
        { status: 400 }
      );
    }

    const existing = await db.stockOpname.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Stock opname tidak ditemukan' },
        { status: 404 }
      );
    }

    if (existing.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, message: 'Stock opname sudah disetujui' },
        { status: 400 }
      );
    }

    if (status === 'SUBMITTED' && existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Hanya draft yang bisa dikirim' },
        { status: 400 }
      );
    }

    if (status === 'APPROVED' && existing.status !== 'SUBMITTED') {
      return NextResponse.json(
        { success: false, message: 'Hanya yang sudah dikirim yang bisa disetujui' },
        { status: 400 }
      );
    }

    const stockOpname = await db.$transaction(async (tx) => {
      const updated = await tx.stockOpname.update({
        where: { id },
        data: { status },
        include: {
          user: {
            select: { id: true, username: true, name: true, role: true },
          },
          items: true,
        },
      });

      // If APPROVED, update product stocks
      if (status === 'APPROVED') {
        for (const item of updated.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: item.actualStock },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, stockOpname });
  } catch (error) {
    console.error('Update stock opname error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
