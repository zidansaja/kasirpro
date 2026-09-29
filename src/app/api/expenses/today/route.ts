import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const result = await db.expense.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    })

    const totalExpenses = result._sum.amount ?? 0

    return NextResponse.json({ totalExpenses })
  } catch (error) {
    console.error('Get today expenses error:', error)
    return NextResponse.json({ totalExpenses: 0 })
  }
}
