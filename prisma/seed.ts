import { db } from '../src/lib/db';
import { hashSync } from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const admin = await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrator',
      password: hashSync('admin123', 10),
      role: 'ADMIN',
      active: true,
    },
  });
  console.log('✅ Admin user created:', admin.username);

  // Create kasir user
  const kasir = await db.user.upsert({
    where: { username: 'kasir1' },
    update: {},
    create: {
      username: 'kasir1',
      name: 'Kasir Satu',
      password: hashSync('kasir123', 10),
      role: 'KASIR',
      active: true,
    },
  });
  console.log('✅ Kasir user created:', kasir.username);

  // Create categories
  const categories = await Promise.all([
    db.category.upsert({
      where: { id: 'cat-makanan' },
      update: { name: 'Makanan' },
      create: { id: 'cat-makanan', name: 'Makanan', description: 'Produk makanan' },
    }),
    db.category.upsert({
      where: { id: 'cat-minuman' },
      update: { name: 'Minuman' },
      create: { id: 'cat-minuman', name: 'Minuman', description: 'Produk minuman' },
    }),
    db.category.upsert({
      where: { id: 'cat-rokok' },
      update: { name: 'Rokok & Tembakau' },
      create: { id: 'cat-rokok', name: 'Rokok & Tembakau', description: 'Produk rokok' },
    }),
    db.category.upsert({
      where: { id: 'cat-kebutuhan' },
      update: { name: 'Kebutuhan Rumah Tangga' },
      create: { id: 'cat-kebutuhan', name: 'Kebutuhan Rumah Tangga', description: 'Kebutuhan sehari-hari' },
    }),
    db.category.upsert({
      where: { id: 'cat-lainnya' },
      update: { name: 'Lainnya' },
      create: { id: 'cat-lainnya', name: 'Lainnya', description: 'Kategori lainnya' },
    }),
  ]);
  console.log(`✅ ${categories.length} categories created`);

  // Create sample products
  const products = [
    { sku: 'MKN-001', name: 'Indomie Goreng', categoryId: 'cat-makanan', buyPrice: 2500, sellPrice: 3500, stock: 100, minStock: 20, unit: 'pcs', barcode: '089686010297' },
    { sku: 'MKN-002', name: 'Indomie Kuah Soto', categoryId: 'cat-makanan', buyPrice: 2500, sellPrice: 3500, stock: 80, minStock: 20, unit: 'pcs', barcode: '089686010303' },
    { sku: 'MKN-003', name: 'Roti Tawar Sari Roti', categoryId: 'cat-makanan', buyPrice: 12000, sellPrice: 16000, stock: 25, minStock: 5, unit: 'pcs' },
    { sku: 'MKN-004', name: 'Telur Ayam 1kg', categoryId: 'cat-makanan', buyPrice: 24000, sellPrice: 30000, stock: 15, minStock: 5, unit: 'kg' },
    { sku: 'MKN-005', name: 'Beras Premium 5kg', categoryId: 'cat-makanan', buyPrice: 60000, sellPrice: 75000, stock: 10, minStock: 3, unit: 'karung' },
    { sku: 'MKN-006', name: 'Minyak Goreng 1L', categoryId: 'cat-makanan', buyPrice: 14000, sellPrice: 18000, stock: 30, minStock: 10, unit: 'botol' },
    { sku: 'MNM-001', name: 'Aqua 600ml', categoryId: 'cat-minuman', buyPrice: 2000, sellPrice: 3500, stock: 200, minStock: 50, unit: 'botol', barcode: '8886008101035' },
    { sku: 'MNM-002', name: 'Teh Botol Sosro 450ml', categoryId: 'cat-minuman', buyPrice: 3000, sellPrice: 5000, stock: 100, minStock: 30, unit: 'botol' },
    { sku: 'MNM-003', name: 'Pocari Sweat 500ml', categoryId: 'cat-minuman', buyPrice: 6000, sellPrice: 8500, stock: 50, minStock: 15, unit: 'botol' },
    { sku: 'MNM-004', name: 'Kopi ABC Susu Sachet', categoryId: 'cat-minuman', buyPrice: 1000, sellPrice: 2000, stock: 300, minStock: 100, unit: 'sachet' },
    { sku: 'MNM-005', name: 'Coca Cola 390ml', categoryId: 'cat-minuman', buyPrice: 4000, sellPrice: 6000, stock: 60, minStock: 20, unit: 'kaleng' },
    { sku: 'RKK-001', name: 'Gudang Garam Surya 16', categoryId: 'cat-rokok', buyPrice: 28000, sellPrice: 33000, stock: 40, minStock: 10, unit: 'bungkus' },
    { sku: 'RKK-002', name: 'Djarum Super 12', categoryId: 'cat-rokok', buyPrice: 24000, sellPrice: 29000, stock: 35, minStock: 10, unit: 'bungkus' },
    { sku: 'RKK-003', name: 'Sampoerna Mild 16', categoryId: 'cat-rokok', buyPrice: 30000, sellPrice: 35000, stock: 30, minStock: 10, unit: 'bungkus' },
    { sku: 'RBT-001', name: 'Sabun Mandi Lifebuoy', categoryId: 'cat-kebutuhan', buyPrice: 3000, sellPrice: 5000, stock: 50, minStock: 15, unit: 'pcs' },
    { sku: 'RBT-002', name: 'Pasta Gigi Pepsodent 120g', categoryId: 'cat-kebutuhan', buyPrice: 8000, sellPrice: 12000, stock: 30, minStock: 10, unit: 'pcs' },
    { sku: 'RBT-003', name: 'Rinso Anti Noda 800g', categoryId: 'cat-kebutuhan', buyPrice: 12000, sellPrice: 17000, stock: 20, minStock: 5, unit: 'pcs' },
    { sku: 'RBT-004', name: 'Tisu Paseo 250 Sheet', categoryId: 'cat-kebutuhan', buyPrice: 8000, sellPrice: 12000, stock: 25, minStock: 8, unit: 'pcs' },
    { sku: 'LNN-001', name: 'Pulsa Elektrik 10.000', categoryId: 'cat-lainnya', buyPrice: 9500, sellPrice: 12000, stock: 999, minStock: 0, unit: 'pcs' },
    { sku: 'LNN-002', name: 'PLN Token 50.000', categoryId: 'cat-lainnya', buyPrice: 50000, sellPrice: 54000, stock: 999, minStock: 0, unit: 'pcs' },
  ];

  for (const p of products) {
    await db.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }
  console.log(`✅ ${products.length} products created`);

  // Create some sample transactions for demo
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);

  const sampleTransactions = [
    { date: today, items: [{ sku: 'MKN-001', qty: 3 }, { sku: 'Aqua-600ml', qty: 2 }] },
    { date: today, items: [{ sku: 'MNM-002', qty: 1 }, { sku: 'RKK-001', qty: 2 }] },
    { date: today, items: [{ sku: 'MNM-001', qty: 5 }, { sku: 'MKN-006', qty: 1 }, { sku: 'RBT-001', qty: 2 }] },
    { date: yesterday, items: [{ sku: 'MKN-001', qty: 5 }, { sku: 'MNM-001', qty: 3 }] },
    { date: yesterday, items: [{ sku: 'RKK-002', qty: 3 }, { sku: 'MNM-003', qty: 2 }, { sku: 'RBT-002', qty: 1 }] },
    { date: yesterday, items: [{ sku: 'MKN-003', qty: 2 }, { sku: 'MNM-004', qty: 10 }] },
    { date: twoDaysAgo, items: [{ sku: 'MKN-005', qty: 1 }, { sku: 'MNM-001', qty: 6 }, { sku: 'RBT-003', qty: 2 }] },
    { date: twoDaysAgo, items: [{ sku: 'RKK-003', qty: 2 }, { sku: 'MNM-005', qty: 3 }] },
  ];

  for (let i = 0; i < sampleTransactions.length; i++) {
    const st = sampleTransactions[i];
    const txDate = new Date(st.date.getTime() + i * 3600000 * (8 + i)); // spread across the day
    const txItems: { productId: string; productName: string; productSku: string; quantity: number; price: number; subtotal: number }[] = [];
    let totalAmount = 0;

    for (const item of st.items) {
      const product = await db.product.findUnique({ where: { sku: item.sku } });
      if (!product) continue;
      const subtotal = product.sellPrice * item.qty;
      totalAmount += subtotal;
      txItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.qty,
        price: product.sellPrice,
        subtotal,
      });
    }

    if (txItems.length === 0) continue;

    const txNumber = `TRX-${txDate.getFullYear()}${String(txDate.getMonth() + 1).padStart(2, '0')}${String(txDate.getDate()).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;

    await db.transaction.create({
      data: {
        transactionNumber: txNumber,
        userId: kasir.id,
        subtotalAmount: totalAmount,
        discountAmount: 0,
        totalAmount,
        paymentAmount: totalAmount,
        changeAmount: 0,
        paymentMethod: 'CASH',
        createdAt: txDate,
        transactionItems: {
          create: txItems,
        },
      },
    });
  }
  console.log(`✅ ${sampleTransactions.length} sample transactions created`);

  console.log('\n🎉 Seeding complete!');
  console.log('Admin Login: admin / admin123');
  console.log('Kasir Login: kasir1 / kasir123');
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
