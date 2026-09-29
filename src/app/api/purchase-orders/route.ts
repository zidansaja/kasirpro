import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const where: Record<string, unknown> = {};

    // Search by orderNumber or supplier name
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { supplier: { name: { contains: search } } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        dateFilter.lt = end;
      }
      where.date = dateFilter;
    }

    const total = await db.purchaseOrder.count({ where });

    const purchaseOrders = await db.purchaseOrder.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      purchaseOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
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
    const { supplierId, items, note } = body;

    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User dan item pesanan wajib diisi' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.buyPrice) {
        return NextResponse.json(
          { success: false, message: 'Setiap item harus memiliki produk, jumlah, dan harga beli' },
          { status: 400 }
        );
      }
      if (item.quantity <= 0 || item.buyPrice <= 0) {
        return NextResponse.json(
          { success: false, message: 'Jumlah dan harga beli harus lebih dari 0' },
          { status: 400 }
        );
      }
    }

    // Generate order number: PO-YYYYMMDD-NNNN
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${dateStr}-`;

    // Find max order number for today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const todayOrders = await db.purchaseOrder.findMany({
      where: {
        date: { gte: todayStart, lt: todayEnd },
      },
      select: { orderNumber: true },
      orderBy: { orderNumber: 'desc' },
      take: 1,
    });

    let nextNum = 1;
    if (todayOrders.length > 0) {
      const lastNum = parseInt(todayOrders[0].orderNumber.slice(prefix.length), 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    const orderNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // Fetch product names for items
    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    // Calculate total and build items data
    const orderItems = items.map((item: { productId: string; quantity: number; buyPrice: number }) => ({
      productId: item.productId,
      productName: productMap.get(item.productId) || 'Produk Tidak Dikenal',
      quantity: item.quantity,
      buyPrice: item.buyPrice,
      subtotal: item.quantity * item.buyPrice,
    }));
    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Create purchase order with items
    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        orderNumber,
        userId,
        supplierId: supplierId || null,
        note: note || null,
        status: 'DRAFT',
        totalAmount,
        items: {
          create: orderItems,
        },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
        items: true,
      },
    });

    return NextResponse.json({ success: true, purchaseOrder }, { status: 201 });
  } catch (error) {
    console.error('Create purchase order error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
