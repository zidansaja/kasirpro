import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: 'Supplier tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
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
    const { name, contactPerson, phone, email, address, note } = body;

    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Supplier tidak ditemukan' },
        { status: 404 }
      );
    }

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        name: name?.trim() || undefined,
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        note: note?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
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
        { success: false, message: 'Hanya admin yang dapat menghapus supplier' },
        { status: 403 }
      );
    }

    const existing = await db.supplier.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Supplier tidak ditemukan' },
        { status: 404 }
      );
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        { success: false, message: `Supplier tidak dapat dihapus karena memiliki ${existing._count.products} produk terkait` },
        { status: 400 }
      );
    }

    await db.supplier.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Supplier berhasil dihapus' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
