import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

function generateTransactionNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const pad = (n: number) => String(n).padStart(4, '0');
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return db.transaction.count({
    where: {
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  }).then((count) => `TRX-${dateStr}-${pad(count + 1)}`);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, name: true, role: true },
          },
          transactionItems: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.transaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
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
    const { items, discountAmount, paymentAmount, paymentMethod, note, customerName, customerId, taxEnabled, taxPercent, shiftId } = body;

    if (!userId || !items || !items.length || !paymentMethod) {
      return NextResponse.json(
        { success: false, message: 'User, items, dan metode pembayaran wajib diisi' },
        { status: 400 }
      );
    }

    // Validate all items have required fields
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.price) {
        return NextResponse.json(
          { success: false, message: 'Setiap item harus memiliki productId, quantity, dan price' },
          { status: 400 }
        );
      }
    }

    // Check stock availability
    for (const item of items) {
      const product = await db.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return NextResponse.json(
          { success: false, message: `Produk dengan ID ${item.productId} tidak ditemukan` },
          { status: 400 }
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { success: false, message: `Stok ${product.name} tidak mencukupi (tersedia: ${product.stock})` },
          { status: 400 }
        );
      }
    }

    const transactionNumber = await generateTransactionNumber();
    const subtotalAmount = items.reduce((sum: number, item: Record<string, number>) => {
      return sum + item.price * item.quantity;
    }, 0);
    const disc = discountAmount || 0;
    const isTaxEnabled = !!taxEnabled;
    const taxPct = taxPercent || 11;
    const subtotalAfterDiscount = subtotalAmount - disc;
    const taxAmt = isTaxEnabled ? Math.round(subtotalAfterDiscount * (taxPct / 100)) : 0;
    const totalAmount = subtotalAfterDiscount + taxAmt;
    const payAmt = paymentAmount || totalAmount;
    const changeAmount = payAmt - totalAmount;

    // Use a transaction to ensure data consistency
    const transaction = await db.$transaction(async (tx) => {
      // Create transaction
      const trx = await tx.transaction.create({
        data: {
          transactionNumber,
          userId,
          shiftId: shiftId || null,
          subtotalAmount,
          discountAmount: disc,
          totalAmount,
          paymentAmount: payAmt,
          changeAmount,
          paymentMethod,
          note: note || null,
          customerName: customerName || null,
          customerId: customerId || null,
          taxAmount: taxAmt,
          taxEnabled: isTaxEnabled,
          taxPercent: taxPct,
          transactionItems: {
            create: items.map((item: Record<string, unknown>) => ({
              productId: item.productId as string,
              productName: item.productName as string,
              productSku: (item.productSku as string) || null,
              quantity: item.quantity as number,
              price: item.price as number,
              subtotal: (item.price as number) * (item.quantity as number),
            })),
          },
        },
        include: {
          user: {
            select: { id: true, username: true, name: true, role: true },
          },
          transactionItems: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      // Deduct stock for each item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId as string },
          data: { stock: { decrement: item.quantity as number } },
        });
      }

      // Update customer stats if customerId provided
      if (customerId) {
        const loyaltyPoints = Math.floor(totalAmount / 10000); // 1 point per Rp10,000
        await tx.customer.update({
          where: { id: customerId as string },
          data: {
            visitCount: { increment: 1 },
            totalSpent: { increment: totalAmount },
            lastVisitAt: new Date(),
            points: { increment: loyaltyPoints },
            servedByUserId: userId,
          },
        });
      }

      return trx;
    });

    return NextResponse.json({ success: true, transaction }, { status: 201 });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
