import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const shift = await db.shift.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true },
        },
        transactions: {
          select: {
            id: true,
            transactionNumber: true,
            totalAmount: true,
            paymentMethod: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!shift) {
      return NextResponse.json(
        { success: false, message: 'Shift tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, shift });
  } catch (error) {
    console.error('Get shift error:', error);
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
    const { endCash, note } = body;

    if (endCash === undefined || endCash < 0) {
      return NextResponse.json(
        { success: false, message: 'Kas akhir wajib diisi' },
        { status: 400 }
      );
    }

    const shift = await db.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      return NextResponse.json(
        { success: false, message: 'Shift tidak ditemukan' },
        { status: 404 }
      );
    }

    if (shift.status === 'CLOSED') {
      return NextResponse.json(
        { success: false, message: 'Shift sudah ditutup' },
        { status: 400 }
      );
    }

    // Calculate expected cash using shiftId-based filtering (primary) + date-based fallback
    const cashSales = await db.transaction.aggregate({
      _sum: { totalAmount: true },
      _count: true,
      where: {
        paymentMethod: 'CASH',
        OR: [
          { shiftId: id },
          {
            createdAt: { gte: shift.openedAt },
            shiftId: null,
          },
        ],
      },
    });

    const allSales = await db.transaction.aggregate({
      _sum: { totalAmount: true },
      _count: true,
      where: {
        OR: [
          { shiftId: id },
          {
            createdAt: { gte: shift.openedAt },
            shiftId: null,
          },
        ],
      },
    });

    const cashReturns = await db.productReturn.aggregate({
      _sum: { totalRefund: true },
      where: {
        status: 'APPROVED',
        createdAt: {
          gte: shift.openedAt,
        },
      },
    });

    const shiftExpenses = await db.expense.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: {
          gte: shift.openedAt,
        },
      },
    });

    const totalCashSales = cashSales._sum.totalAmount || 0;
    const totalCashReturns = cashReturns._sum.totalRefund || 0;
    const totalExpenses = shiftExpenses._sum.amount || 0;
    // expectedCash = startCash + cashSales - cashReturns - expenses
    const expectedCash = shift.startCash + totalCashSales - totalCashReturns - totalExpenses;
    const difference = Number(endCash) - expectedCash;

    const closedAt = new Date();

    const updatedShift = await db.shift.update({
      where: { id },
      data: {
        endCash: Number(endCash),
        expectedCash,
        difference,
        status: 'CLOSED',
        closedAt,
        note: note !== undefined ? note : shift.note,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Also update all transactions in this shift that don't have shiftId yet
    await db.transaction.updateMany({
      where: {
        shiftId: null,
        createdAt: { gte: shift.openedAt, lte: closedAt },
      },
      data: { shiftId: id },
    });

    return NextResponse.json({
      success: true,
      shift: updatedShift,
      summary: {
        totalTransactions: allSales._count,
        totalCashSales,
        totalCashReturns,
        totalExpenses,
        expectedCash,
        difference,
      },
    });
  } catch (error) {
    console.error('Update shift error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
