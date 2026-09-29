import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const expense = await db.expense.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { success: false, message: 'Pengeluaran tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Get expense error:', error);
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
    const { date, category, amount, description } = body;
    const { id: userId, role: userRole } = getSessionUser(request);

    const existing = await db.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Pengeluaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Only owner or ADMIN can edit
    if (existing.userId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Anda tidak memiliki izin untuk mengubah pengeluaran ini' },
        { status: 403 }
      );
    }

    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Jumlah harus lebih dari 0' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (date) updateData.date = new Date(date);
    if (category) updateData.category = category;
    if (amount !== undefined) updateData.amount = Math.round(amount);
    if (description !== undefined) updateData.description = description || null;

    const expense = await db.expense.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Update expense error:', error);
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

    // Only ADMIN can delete
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Hanya admin yang dapat menghapus pengeluaran' },
        { status: 403 }
      );
    }

    const existing = await db.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Pengeluaran tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Pengeluaran berhasil dihapus' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
