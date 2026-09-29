import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Parallel queries
    const [
      todayTransactions,
      totalProducts,
      lowStockProductsRaw,
      monthTransactions,
      yearTransactions,
      recentTransactions,
    ] = await Promise.all([
      // Today's transactions
      db.transaction.findMany({
        where: { createdAt: { gte: todayStart, lt: todayEnd } },
        select: { totalAmount: true },
      }),
      // Total products
      db.product.count(),
      // Low stock products - fetch all and filter (Prisma doesn't support column comparison)
      db.product.findMany({
        include: { category: true },
      }),
      // Monthly transactions
      db.transaction.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { totalAmount: true },
      }),
      // Yearly transactions
      db.transaction.findMany({
        where: { createdAt: { gte: yearStart } },
        select: { totalAmount: true },
      }),
      // Recent 10 transactions
      db.transaction.findMany({
        take: 10,
        include: {
          user: { select: { id: true, username: true, name: true, role: true } },
          transactionItems: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const todaySales = todayTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0
    );
    const todayTransactionCount = todayTransactions.length;
    const allProducts = lowStockProductsRaw;
    const lowStockProducts = allProducts.filter((p) => p.stock <= p.minStock);
    const lowStockCount = lowStockProducts.length;
    const monthlyRevenue = monthTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0
    );
    const monthlyTransactionCount = monthTransactions.length;
    const yearlyRevenue = yearTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0
    );
    const yearlyTransactionCount = yearTransactions.length;

    // Daily revenue for last 7 days
    const last7Days: { date: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

      const dayTransactions = await db.transaction.findMany({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
        select: { totalAmount: true },
      });

      const dateStr = dayStart.toISOString().slice(0, 10);
      last7Days.push({
        date: dateStr,
        revenue: dayTransactions.reduce((sum, t) => sum + t.totalAmount, 0),
        count: dayTransactions.length,
      });
    }

    // Hourly revenue for today
    const todayAllTx = await db.transaction.findMany({
      where: { createdAt: { gte: todayStart, lt: todayEnd } },
      select: { totalAmount: true, createdAt: true },
    });
    const hourlyRevenue: { hour: number; revenue: number; count: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hTx = todayAllTx.filter((t) => new Date(t.createdAt).getHours() === h);
      hourlyRevenue.push({
        hour: h,
        revenue: hTx.reduce((s, t) => s + t.totalAmount, 0),
        count: hTx.length,
      });
    }

    // Top 5 products by revenue over last 7 days
    const weekStartLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    const weekTxItems = await db.transactionItem.findMany({
      where: {
        transaction: {
          createdAt: { gte: weekStartLocal },
        },
      },
      select: {
        productId: true,
        productName: true,
        quantity: true,
        subtotal: true,
        transaction: { select: { createdAt: true } },
      },
    });

    // Build daily dates for last 7 days
    const dayDates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayDates.push(d.toISOString().slice(0, 10));
    }

    // Aggregate by product
    const productMap = new Map<string, { productId: string; productName: string; totalRevenue: number; totalQuantity: number; dailyMap: Map<string, { revenue: number; quantity: number }> }>();
    for (const item of weekTxItems) {
      const txDate = new Date(item.transaction.createdAt).toISOString().slice(0, 10);
      let entry = productMap.get(item.productId);
      if (!entry) {
        entry = {
          productId: item.productId,
          productName: item.productName,
          totalRevenue: 0,
          totalQuantity: 0,
          dailyMap: new Map(),
        };
        productMap.set(item.productId, entry);
      }
      entry.totalRevenue += item.subtotal;
      entry.totalQuantity += item.quantity;
      const day = entry.dailyMap.get(txDate) || { revenue: 0, quantity: 0 };
      day.revenue += item.subtotal;
      day.quantity += item.quantity;
      entry.dailyMap.set(txDate, day);
    }

    // Sort by totalRevenue desc and take top 5
    const topProductsWeekly = Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        totalRevenue: p.totalRevenue,
        totalQuantity: p.totalQuantity,
        dailyData: dayDates.map((date) => {
          const day = p.dailyMap.get(date);
          return { date, revenue: day?.revenue ?? 0, quantity: day?.quantity ?? 0 };
        }),
      }));

    return NextResponse.json({
      success: true,
      stats: {
        todaySales,
        todayTransactionCount,
        totalProducts,
        lowStockCount,
        monthlyRevenue,
        monthlyTransactionCount,
        yearlyRevenue,
        yearlyTransactionCount,
        recentTransactions,
        lowStockProducts,
        dailyRevenue: last7Days,
        hourlyRevenue,
        topProductsWeekly,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
