import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function calculateProfit(
  items: { productId: string; price: number; quantity: number }[]
): Promise<number> {
  return items.reduce(async (sumPromise, item) => {
    const sum = await sumPromise;
    const product = await db.product.findUnique({
      where: { id: item.productId },
      select: { buyPrice: true },
    });
    const buyPrice = product?.buyPrice || 0;
    return sum + (item.price - buyPrice) * item.quantity;
  }, Promise.resolve(0));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { success: false, message: 'Tipe laporan wajib diisi (daily, monthly, yearly)' },
        { status: 400 }
      );
    }

    if (type === 'daily') {
      return handleDailyReport(searchParams);
    } else if (type === 'monthly') {
      return handleMonthlyReport(searchParams);
    } else if (type === 'yearly') {
      return handleYearlyReport(searchParams);
    } else {
      return NextResponse.json(
        { success: false, message: 'Tipe laporan tidak valid' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

async function handleDailyReport(
  searchParams: URLSearchParams
): Promise<NextResponse> {
  const date = searchParams.get('date');
  if (!date) {
    return NextResponse.json(
      { success: false, message: 'Tanggal wajib diisi' },
      { status: 400 }
    );
  }

  const start = new Date(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const transactions = await db.transaction.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: {
      user: { select: { id: true, username: true, name: true, role: true } },
      transactionItems: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalTax = transactions.reduce((sum, t) => sum + (t.taxAmount || 0), 0);

  let totalProfit = 0;
  for (const trx of transactions) {
    totalProfit += await calculateProfit(trx.transactionItems);
  }

  return NextResponse.json({
    success: true,
    report: {
      date,
      transactionCount: transactions.length,
      totalRevenue,
      totalProfit,
      totalTax,
      transactions,
    },
  });
}

async function handleMonthlyReport(
  searchParams: URLSearchParams
): Promise<NextResponse> {
  const month = parseInt(searchParams.get('month') || '', 10);
  const year = parseInt(searchParams.get('year') || '', 10);

  if (!month || !year) {
    return NextResponse.json(
      { success: false, message: 'Bulan dan tahun wajib diisi' },
      { status: 400 }
    );
  }

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const transactions = await db.transaction.findMany({
    where: { createdAt: { gte: monthStart, lt: monthEnd } },
    include: {
      user: { select: { id: true, username: true, name: true, role: true } },
      transactionItems: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalTax = transactions.reduce((sum, t) => sum + (t.taxAmount || 0), 0);

  let totalProfit = 0;
  for (const trx of transactions) {
    totalProfit += await calculateProfit(trx.transactionItems);
  }

  // Daily breakdown
  const dailyMap = new Map<string, { revenue: number; count: number }>();
  for (const trx of transactions) {
    const day = trx.createdAt.toISOString().slice(0, 10);
    const existing = dailyMap.get(day) || { revenue: 0, count: 0 };
    existing.revenue += trx.totalAmount;
    existing.count += 1;
    dailyMap.set(day, existing);
  }

  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    success: true,
    report: {
      month,
      year,
      transactionCount: transactions.length,
      totalRevenue,
      totalProfit,
      totalTax,
      dailyBreakdown,
    },
  });
}

async function handleYearlyReport(
  searchParams: URLSearchParams
): Promise<NextResponse> {
  const year = parseInt(searchParams.get('year') || '', 10);

  if (!year) {
    return NextResponse.json(
      { success: false, message: 'Tahun wajib diisi' },
      { status: 400 }
    );
  }

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const transactions = await db.transaction.findMany({
    where: { createdAt: { gte: yearStart, lt: yearEnd } },
    include: { transactionItems: true },
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalTax = transactions.reduce((sum, t) => sum + (t.taxAmount || 0), 0);

  let totalProfit = 0;
  for (const trx of transactions) {
    totalProfit += await calculateProfit(trx.transactionItems);
  }

  // Monthly breakdown
  const monthlyMap = new Map<number, { revenue: number; count: number }>();
  for (const trx of transactions) {
    const m = trx.createdAt.getMonth() + 1;
    const existing = monthlyMap.get(m) || { revenue: 0, count: 0 };
    existing.revenue += trx.totalAmount;
    existing.count += 1;
    monthlyMap.set(m, existing);
  }

  const monthlyBreakdown = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month - b.month);

  return NextResponse.json({
    success: true,
    report: {
      year,
      transactionCount: transactions.length,
      totalRevenue,
      totalProfit,
      totalTax,
      monthlyBreakdown,
    },
  });
}
