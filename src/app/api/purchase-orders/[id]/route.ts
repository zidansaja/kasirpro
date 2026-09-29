import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { success: false, message: 'Pesanan pembelian tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, purchaseOrder });
  } catch (error) {
    console.error('Get purchase order error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { supplierId, note, status } = body;
    const { id: userId, role: userRole } = getSessionUser(request);

    const existing = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Pesanan pembelian tidak ditemukan' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (supplierId !== undefined) updateData.supplierId = supplierId || null;
    if (note !== undefined) updateData.note = note || null;

    // Handle status change
    if (status && status !== existing.status) {
      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        DRAFT: ['ORDERED', 'CANCELLED'],
        ORDERED: ['RECEIVED', 'CANCELLED'],
        RECEIVED: [],
        CANCELLED: [],
      };

      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { success: false, message: `Status tidak dapat diubah dari ${existing.status} ke ${status}` },
          { status: 400 }
        );
      }

      updateData.status = status;

      // When status changes to RECEIVED, add stock to products
      if (status === 'RECEIVED') {
        for (const item of existing.items) {
          await db.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    const purchaseOrder = await db.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, purchaseOrder });
  } catch (error) {
    console.error('Update purchase order error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Hanya admin yang dapat menghapus pesanan pembelian' },
        { status: 403 }
      );
    }

    const existing = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Pesanan pembelian tidak ditemukan' },
        { status: 404 }
      );
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Hanya pesanan dengan status DRAFT yang dapat dihapus' },
        { status: 400 }
      );
    }

    await db.purchaseOrder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Pesanan pembelian berhasil dihapus' });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
