import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)

    const dayStart = new Date(dateStr + 'T00:00:00.000Z')
    const dayEnd = new Date(dateStr + 'T23:59:59.999Z')

    // Transactions for the day with items
    const transactions = await db.transaction.findMany({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
      include: {
        transactionItems: true,
        user: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Expenses for the day
    const expenses = await db.expense.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
    })

    // Payment method breakdown
    const paymentBreakdown: Record<string, { count: number; total: number }> = {}
    for (const t of transactions) {
      if (!paymentBreakdown[t.paymentMethod]) {
        paymentBreakdown[t.paymentMethod] = { count: 0, total: 0 }
      }
      paymentBreakdown[t.paymentMethod].count++
      paymentBreakdown[t.paymentMethod].total += t.totalAmount
    }

    // Top products
    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
    for (const t of transactions) {
      for (const item of t.transactionItems) {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0 }
        }
        productMap[item.productId].quantity += item.quantity
        productMap[item.productId].revenue += item.subtotal
      }
    }
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Hourly breakdown
    const hourlyBreakdown: { hour: number; revenue: number; count: number }[] = []
    for (let h = 0; h < 24; h++) {
      const hStart = new Date(dateStr)
      hStart.setHours(h, 0, 0, 0)
      const hEnd = new Date(dateStr)
      hEnd.setHours(h, 59, 59, 999)

      const hTx = transactions.filter((t) => {
        const tDate = new Date(t.createdAt)
        return tDate.getHours() === h
      })

      hourlyBreakdown.push({
        hour: h,
        revenue: hTx.reduce((s, t) => s + t.totalAmount, 0),
        count: hTx.length,
      })
    }

    // Calculate totals
    const totalRevenue = transactions.reduce((s, t) => s + t.totalAmount, 0)
    const totalTax = transactions.reduce((s, t) => s + (t.taxAmount || 0), 0)
    const totalDiscount = transactions.reduce((s, t) => s + t.discountAmount, 0)

    // Calculate COGS for profit - batch fetch product prices
    const productIds = [...new Set(transactions.flatMap((t) => t.transactionItems.map((i) => i.productId)))]
    const productPrices: Record<string, number> = {}
    if (productIds.length > 0) {
      const products = await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, buyPrice: true },
      })
      for (const p of products) {
        productPrices[p.id] = p.buyPrice
      }
    }
    let totalCOGS = 0
    for (const t of transactions) {
      for (const item of t.transactionItems) {
        const buyPrice = productPrices[item.productId] || 0
        totalCOGS += buyPrice * item.quantity
      }
    }

    const totalProfit = totalRevenue - totalCOGS
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const netProfit = totalProfit - totalExpenses

    return NextResponse.json({
      success: true,
      report: {
        date: dateStr,
        totalTransactions: transactions.length,
        totalRevenue,
        totalCOGS,
        totalProfit,
        totalTax,
        totalDiscount,
        totalExpenses,
        netProfit,
        paymentBreakdown,
        topProducts,
        hourlyBreakdown,
        transactions: transactions.map((t) => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          totalAmount: t.totalAmount,
          paymentMethod: t.paymentMethod,
          createdAt: t.createdAt,
          userName: t.user?.name || '-',
          itemCount: t.transactionItems.length,
        })),
      },
    })
  } catch (error) {
    console.error('End of day report error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
