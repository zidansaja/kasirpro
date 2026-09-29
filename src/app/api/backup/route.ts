import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya admin yang dapat melakukan backup.' },
        { status: 403 }
      );
    }

    // Fetch all data with nested relations
    const [users, categories, products, customers, transactions, stockOpnames, returns, expenses, shifts] =
      await Promise.all([
        db.user.findMany({
          select: {
            id: true,
            username: true,
            name: true,
            password: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        db.category.findMany({
          orderBy: { createdAt: 'asc' },
        }),
        db.product.findMany({
          orderBy: { createdAt: 'asc' },
        }),
        db.customer.findMany({
          orderBy: { createdAt: 'asc' },
        }),
        db.transaction.findMany({
          include: {
            transactionItems: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        db.stockOpname.findMany({
          include: {
            items: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        db.productReturn.findMany({
          include: {
            items: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        db.expense.findMany({
          orderBy: { createdAt: 'asc' },
        }),
        db.shift.findMany({
          orderBy: { createdAt: 'asc' },
        }),
      ]);

    const backup = {
      version: '2.1',
      exportedAt: new Date().toISOString(),
      data: {
        users,
        categories,
        products,
        customers,
        transactions,
        stockOpnames,
        returns,
        expenses,
        shifts,
      },
    };

    const filename = `kasirpro-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    const jsonStr = JSON.stringify(backup, null, 2);

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat membuat backup' },
      { status: 500 }
    );
  }
}
