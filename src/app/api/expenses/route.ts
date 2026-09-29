import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    // Default to current month if no dates provided
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        dateFilter.lt = end;
      }
      where.date = dateFilter;
    } else {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      where.date = { gte: monthStart, lt: monthEnd };
    }

    if (category && category !== 'Semua') {
      where.category = category;
    }

    // Count total for pagination
    const total = await db.expense.count({ where });

    // Fetch expenses
    const expenses = await db.expense.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate total amount from ALL matching expenses (not just page)
    const allMatchingExpenses = await db.expense.findMany({
      where,
      select: { category: true, amount: true },
    });

    const totalAmount = allMatchingExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const groupedByCategory: Record<string, number> = {};
    for (const e of allMatchingExpenses) {
      groupedByCategory[e.category] = (groupedByCategory[e.category] || 0) + e.amount;
    }

    return NextResponse.json({
      success: true,
      expenses,
      totalAmount,
      groupedByCategory,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = getSessionUser(request).id;
    const { date, category, amount, description } = body;

    if (!userId || !date || !category || !amount) {
      return NextResponse.json(
        { success: false, message: 'User, tanggal, kategori, dan jumlah wajib diisi' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Jumlah harus lebih dari 0' },
        { status: 400 }
      );
    }

    const expense = await db.expense.create({
      data: {
        date: new Date(date),
        category,
        amount: Math.round(amount),
        description: description || null,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
