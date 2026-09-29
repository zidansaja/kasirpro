import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function generateSku(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SKU-${datePart}-${rand}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const lowStock = searchParams.get('lowStock') === 'true';

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (lowStock) {
      // Stock <= minStock will be filtered below since Prisma doesn't support column comparison
      // We'll use a workaround by fetching and filtering
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { category: true, supplier: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    let filtered = products;
    if (lowStock) {
      filtered = products.filter((p) => p.stock <= p.minStock);
    }

    return NextResponse.json({
      success: true,
      products: filtered,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sku,
      name,
      categoryId,
      buyPrice,
      sellPrice,
      stock,
      minStock,
      unit,
      barcode,
    } = body;

    if (!name || sellPrice === undefined) {
      return NextResponse.json(
        { success: false, message: 'Nama dan harga jual wajib diisi' },
        { status: 400 }
      );
    }

    const finalSku = sku || generateSku();

    const product = await db.product.create({
      data: {
        sku: finalSku,
        name,
        categoryId: categoryId || null,
        supplierId: body.supplierId || null,
        buyPrice: buyPrice || 0,
        sellPrice,
        stock: stock || 0,
        minStock: minStock || 5,
        unit: unit || 'pcs',
        barcode: barcode || null,
      },
      include: { category: true, supplier: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
