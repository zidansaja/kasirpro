import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            transactionItems: {
              select: { id: true, productName: true, quantity: true, price: true, subtotal: true },
            },
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Get customer error:', error);
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
    const { name, phone, email, address, note } = body;

    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check phone uniqueness on change
    if (phone && phone.trim() && phone.trim() !== existing.phone) {
      const phoneExists = await db.customer.findUnique({ where: { phone: phone.trim() } });
      if (phoneExists) {
        return NextResponse.json(
          { success: false, message: 'Nomor telepon sudah digunakan pelanggan lain' },
          { status: 400 }
        );
      }
    }

    const customer = await db.customer.update({
      where: { id },
      data: {
        name: name?.trim() || undefined,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        note: note?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Update customer error:', error);
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
        { success: false, message: 'Hanya admin yang dapat menghapus pelanggan' },
        { status: 403 }
      );
    }

    const existing = await db.customer.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (existing._count.transactions > 0) {
      return NextResponse.json(
        { success: false, message: `Pelanggan tidak dapat dihapus karena memiliki ${existing._count.transactions} transaksi terkait` },
        { status: 400 }
      );
    }

    await db.customer.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Pelanggan berhasil dihapus' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
