import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    if (!db.auditLog) {
      return NextResponse.json({
        success: true,
        logs: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        stats: { totalToday: 0, changesToday: 0, loginsToday: 0 },
      })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const action = searchParams.get('action') || undefined
    const entity = searchParams.get('entity') || undefined
    const userId = searchParams.get('userId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const where: Prisma.AuditLogWhereInput = {}

    if (action) where.action = action
    if (entity) where.entity = entity
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.createdAt.lt = end
      }
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    // Stats for today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [totalToday, changesToday, loginsToday] = await Promise.all([
      db.auditLog.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.auditLog.count({
        where: { createdAt: { gte: todayStart }, action: { in: ['CREATE', 'UPDATE', 'DELETE'] } },
      }),
      db.auditLog.count({
        where: { createdAt: { gte: todayStart }, action: 'LOGIN' },
      }),
    ])

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalToday,
        changesToday,
        loginsToday,
      },
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
