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
        user: { select: { id: true, name: true } },
      },
    });

    if (!shift) {
      return NextResponse.json(
        { success: false, message: 'Shift tidak ditemukan' },
        { status: 404 }
      );
    }

    // Build the date range filter for legacy transactions (without shiftId)
    const legacyDateFilter: Record<string, unknown> = {
      createdAt: { gte: shift.openedAt },
    };
    if (shift.closedAt) {
      legacyDateFilter.createdAt = { gte: shift.openedAt, lte: shift.closedAt };
    }

    // Use shiftId-based filtering for accurate results
    // Also fallback to date-based for legacy transactions without shiftId
    const shiftTransactions = await db.transaction.findMany({
      where: {
        OR: [
          { shiftId: id },
          {
            ...legacyDateFilter,
            shiftId: null,
          },
        ],
      },
      include: {
        transactionItems: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate stats
    const totalTransactions = shiftTransactions.length;
    const cashTransactions = shiftTransactions.filter((t) => t.paymentMethod === 'CASH');
    const transferTransactions = shiftTransactions.filter((t) => t.paymentMethod === 'TRANSFER');
    const qrisTransactions = shiftTransactions.filter((t) => t.paymentMethod === 'QRIS');

    const totalRevenue = shiftTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalCashSales = cashTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalTransferSales = transferTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalQrisSales = qrisTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalDiscount = shiftTransactions.reduce((sum, t) => sum + t.discountAmount, 0);
    const totalTax = shiftTransactions.reduce((sum, t) => sum + (t.taxAmount || 0), 0);

    // Cash returns within this shift
    const cashReturns = await db.productReturn.aggregate({
      _sum: { totalRefund: true },
      _count: true,
      where: {
        status: 'APPROVED',
        createdAt: {
          gte: shift.openedAt,
          ...(shift.closedAt ? { lte: shift.closedAt } : {}),
        },
      },
    });

    const totalCashReturns = cashReturns._sum.totalRefund || 0;
    const totalReturns = cashReturns._count;

    // Expenses within this shift
    const shiftExpenses = await db.expense.aggregate({
      _sum: { amount: true },
      _count: true,
      where: {
        createdAt: {
          gte: shift.openedAt,
          ...(shift.closedAt ? { lte: shift.closedAt } : {}),
        },
      },
    });

    // Expected cash calculation: startCash + cashSales - cashReturns - expenses
    const expectedCash = shift.startCash + totalCashSales - totalCashReturns - (shiftExpenses._sum.amount || 0);
    const difference = shift.endCash != null ? shift.endCash - expectedCash : null;

    // Top selling products in this shift
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const tx of shiftTransactions) {
      for (const item of tx.transactionItems) {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productMap.set(item.productId, {
            name: item.productName,
            quantity: item.quantity,
            revenue: item.subtotal,
          });
        }
      }
    }
    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      summary: {
        shift: {
          id: shift.id,
          status: shift.status,
          openedAt: shift.openedAt,
          closedAt: shift.closedAt,
          startCash: shift.startCash,
          endCash: shift.endCash,
          expectedCash: shift.expectedCash,
          difference: shift.difference,
          note: shift.note,
          user: shift.user,
        },
        transactions: {
          total: totalTransactions,
          cash: cashTransactions.length,
          transfer: transferTransactions.length,
          qris: qrisTransactions.length,
        },
        revenue: {
          total: totalRevenue,
          cash: totalCashSales,
          transfer: totalTransferSales,
          qris: totalQrisSales,
          discount: totalDiscount,
          tax: totalTax,
        },
        returns: {
          total: totalReturns,
          cashRefund: totalCashReturns,
        },
        expenses: {
          total: shiftExpenses._count,
          amount: shiftExpenses._sum.amount || 0,
        },
        expectedCash,
        difference,
        topProducts,
        recentTransactions: shiftTransactions.slice(-10).reverse().map((t) => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          totalAmount: t.totalAmount,
          paymentMethod: t.paymentMethod,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get shift summary error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
