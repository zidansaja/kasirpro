import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface BackupData {
  version?: string;
  exportedAt?: string;
  data: {
    users?: Record<string, unknown>[];
    categories?: Record<string, unknown>[];
    products?: Record<string, unknown>[];
    customers?: Record<string, unknown>[];
    transactions?: Record<string, unknown>[];
    stockOpnames?: Record<string, unknown>[];
    returns?: Record<string, unknown>[];
    expenses?: Record<string, unknown>[];
    shifts?: Record<string, unknown>[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya admin yang dapat melakukan restore.' },
        { status: 403 }
      );
    }

    const body: BackupData = await request.json();

    // Validate structure
    if (!body.version || !body.data || typeof body.data !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Format file backup tidak valid. File harus memiliki version dan data.' },
        { status: 400 }
      );
    }

    const imported: Record<string, number> = {
      users: 0,
      categories: 0,
      products: 0,
      customers: 0,
      transactions: 0,
      stockOpnames: 0,
      returns: 0,
      expenses: 0,
      shifts: 0,
    };

    // ID mapping: old ID -> new ID
    const categoryMap = new Map<string, string>();
    const userMap = new Map<string, string>();
    const productMap = new Map<string, string>();
    const customerMap = new Map<string, string>();
    const transactionMap = new Map<string, string>();

    const result = await db.$transaction(async (tx) => {
      // 1. Categories (upsert by name)
      if (body.data.categories && body.data.categories.length > 0) {
        for (const cat of body.data.categories) {
          const existing = await tx.category.findFirst({ where: { name: cat.name as string } });
          if (existing) {
            categoryMap.set(cat.id as string, existing.id);
          } else {
            const created = await tx.category.create({
              data: {
                name: cat.name as string,
                description: (cat.description as string) || null,
                createdAt: new Date(cat.createdAt as string),
                updatedAt: new Date(cat.updatedAt as string),
              },
            });
            categoryMap.set(cat.id as string, created.id);
            imported.categories++;
          }
        }
      }

      // 2. Users (skip if username exists)
      if (body.data.users && body.data.users.length > 0) {
        for (const u of body.data.users) {
          const existing = await tx.user.findUnique({ where: { username: u.username as string } });
          if (existing) {
            userMap.set(u.id as string, existing.id);
          } else {
            const created = await tx.user.create({
              data: {
                username: u.username as string,
                name: u.name as string,
                password: u.password as string,
                role: u.role as string,
                active: u.active as boolean,
                createdAt: new Date(u.createdAt as string),
                updatedAt: new Date(u.updatedAt as string),
              },
            });
            userMap.set(u.id as string, created.id);
            imported.users++;
          }
        }
      }

      // 3. Customers (upsert by phone or name)
      if (body.data.customers && body.data.customers.length > 0) {
        for (const c of body.data.customers) {
          let existing: { id: string } | null = null;
          if (c.phone) {
            existing = await tx.customer.findUnique({ where: { phone: c.phone as string } });
          }
          if (!existing) {
            existing = await tx.customer.findFirst({ where: { name: c.name as string } });
          }
          if (existing) {
            customerMap.set(c.id as string, existing.id);
          } else {
            const created = await tx.customer.create({
              data: {
                name: c.name as string,
                phone: (c.phone as string) || null,
                email: (c.email as string) || null,
                address: (c.address as string) || null,
                points: (c.points as number) || 0,
                totalSpent: (c.totalSpent as number) || 0,
                visitCount: (c.visitCount as number) || 0,
                lastVisitAt: c.lastVisitAt ? new Date(c.lastVisitAt as string) : null,
                note: (c.note as string) || null,
                createdAt: new Date(c.createdAt as string),
                updatedAt: new Date(c.updatedAt as string),
              },
            });
            customerMap.set(c.id as string, created.id);
            imported.customers++;
          }
        }
      }

      // 4. Products (map categoryId to new category IDs)
      if (body.data.products && body.data.products.length > 0) {
        for (const p of body.data.products) {
          const existing = await tx.product.findUnique({ where: { sku: p.sku as string } });
          if (existing) {
            productMap.set(p.id as string, existing.id);
          } else {
            const newCategoryId = p.categoryId ? categoryMap.get(p.categoryId as string) || null : null;
            const created = await tx.product.create({
              data: {
                sku: p.sku as string,
                name: p.name as string,
                categoryId: newCategoryId,
                buyPrice: (p.buyPrice as number) || 0,
                sellPrice: p.sellPrice as number,
                stock: (p.stock as number) || 0,
                minStock: (p.minStock as number) || 5,
                unit: (p.unit as string) || 'pcs',
                barcode: (p.barcode as string) || null,
                createdAt: new Date(p.createdAt as string),
                updatedAt: new Date(p.updatedAt as string),
              },
            });
            productMap.set(p.id as string, created.id);
            imported.products++;
          }
        }
      }

      // 5. Transactions + TransactionItems
      if (body.data.transactions && body.data.transactions.length > 0) {
        for (const t of body.data.transactions) {
          const newUserId = userMap.get(t.userId as string);
          if (!newUserId) continue;

          const newCustomerId = t.customerId ? customerMap.get(t.customerId as string) || null : null;

          const created = await tx.transaction.create({
            data: {
              transactionNumber: t.transactionNumber as string,
              userId: newUserId,
              subtotalAmount: t.subtotalAmount as number,
              discountAmount: (t.discountAmount as number) || 0,
              totalAmount: t.totalAmount as number,
              paymentAmount: t.paymentAmount as number,
              changeAmount: t.changeAmount as number,
              paymentMethod: (t.paymentMethod as string) || 'CASH',
              note: (t.note as string) || null,
              customerName: (t.customerName as string) || null,
              customerId: newCustomerId,
              taxAmount: (t.taxAmount as number) || 0,
              taxEnabled: (t.taxEnabled as boolean) || false,
              taxPercent: (t.taxPercent as number) || 11,
              createdAt: new Date(t.createdAt as string),
              updatedAt: new Date(t.updatedAt as string),
              transactionItems: {
                create: ((t.transactionItems as Record<string, unknown>[]) || []).map((item) => ({
                  productId: productMap.get(item.productId as string) || (item.productId as string),
                  productName: item.productName as string,
                  productSku: (item.productSku as string) || null,
                  quantity: item.quantity as number,
                  price: item.price as number,
                  subtotal: item.subtotal as number,
                  createdAt: new Date(item.createdAt as string),
                })),
              },
            },
          });
          transactionMap.set(t.id as string, created.id);
          imported.transactions++;
        }
      }

      // 6. StockOpnames + Items
      if (body.data.stockOpnames && body.data.stockOpnames.length > 0) {
        for (const so of body.data.stockOpnames) {
          const newUserId = userMap.get(so.userId as string);
          if (!newUserId) continue;

          // Skip if same month/year exists
          const existing = await tx.stockOpname.findUnique({
            where: { month_year: { month: so.month as number, year: so.year as number } },
          });
          if (existing) {
            imported.stockOpnames++;
            continue;
          }

          await tx.stockOpname.create({
            data: {
              userId: newUserId,
              month: so.month as number,
              year: so.year as number,
              note: (so.note as string) || null,
              status: (so.status as string) || 'DRAFT',
              createdAt: new Date(so.createdAt as string),
              updatedAt: new Date(so.updatedAt as string),
              items: {
                create: ((so.items as Record<string, unknown>[]) || []).map((item) => ({
                  productId: productMap.get(item.productId as string) || (item.productId as string),
                  productName: item.productName as string,
                  systemStock: item.systemStock as number,
                  actualStock: item.actualStock as number,
                  difference: item.difference as number,
                  note: (item.note as string) || null,
                })),
              },
            },
          });
          imported.stockOpnames++;
        }
      }

      // 7. Returns + Items
      if (body.data.returns && body.data.returns.length > 0) {
        for (const r of body.data.returns) {
          const newUserId = userMap.get(r.userId as string);
          if (!newUserId) continue;

          const newTransactionId = r.transactionId
            ? transactionMap.get(r.transactionId as string) || null
            : null;

          await tx.productReturn.create({
            data: {
              returnNumber: r.returnNumber as string,
              transactionId: newTransactionId,
              userId: newUserId,
              totalRefund: r.totalRefund as number,
              reason: r.reason as string,
              status: (r.status as string) || 'PENDING',
              createdAt: new Date(r.createdAt as string),
              updatedAt: new Date(r.updatedAt as string),
              items: {
                create: ((r.items as Record<string, unknown>[]) || []).map((item) => ({
                  productId: productMap.get(item.productId as string) || (item.productId as string),
                  productName: item.productName as string,
                  quantity: item.quantity as number,
                  price: item.price as number,
                  subtotal: item.subtotal as number,
                })),
              },
            },
          });
          imported.returns++;
        }
      }

      // 8. Expenses
      if (body.data.expenses && body.data.expenses.length > 0) {
        for (const e of body.data.expenses) {
          const newUserId = userMap.get(e.userId as string);
          if (!newUserId) continue;

          await tx.expense.create({
            data: {
              date: new Date(e.date as string),
              category: e.category as string,
              amount: e.amount as number,
              description: (e.description as string) || null,
              userId: newUserId,
              createdAt: new Date(e.createdAt as string),
              updatedAt: new Date(e.updatedAt as string),
            },
          });
          imported.expenses++;
        }
      }

      // 9. Shifts
      if (body.data.shifts && body.data.shifts.length > 0) {
        for (const s of body.data.shifts) {
          const newUserId = userMap.get(s.userId as string);
          if (!newUserId) continue;

          await tx.shift.create({
            data: {
              userId: newUserId,
              openedAt: new Date(s.openedAt as string),
              closedAt: s.closedAt ? new Date(s.closedAt as string) : null,
              startCash: s.startCash as number,
              endCash: s.endCash ? (s.endCash as number) : null,
              expectedCash: s.expectedCash ? (s.expectedCash as number) : null,
              difference: s.difference ? (s.difference as number) : null,
              status: (s.status as string) || 'OPEN',
              note: (s.note as string) || null,
              createdAt: new Date(s.createdAt as string),
              updatedAt: new Date(s.updatedAt as string),
            },
          });
          imported.shifts++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Restore berhasil',
      imported,
    });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat restore data' },
      { status: 500 }
    );
  }
}
