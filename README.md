# KasirPro

Aplikasi kasir (Point of Sale) berbasis web untuk toko kecil, dibangun dengan bantuan AI (vibe coding).

**Teknologi:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Prisma, SQLite, Zustand.

## Fitur
- Kasir: keranjang, pembayaran, struk
- Produk, kategori, stok, stock opname, retur
- Laporan harian, bulanan, tahunan dengan grafik
- Shift kasir, pengeluaran, pelanggan dengan poin, supplier, pembelian barang
- Peran Admin dan Kasir (login dengan sesi cookie), log aktivitas, backup dan restore

## Menjalankan
1. Salin `.env.example` menjadi `.env`, lalu isi `SESSION_SECRET` dengan teks acak minimal 32 karakter
   (buat dengan `openssl rand -base64 48`).
2. Pasang dependensi dan siapkan database:
   ```
   npm install
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   ```
3. Jalankan: `npx next dev -p 3000`, lalu buka http://localhost:3000

## Akun awal (dari seed)
- Admin: `admin` / `admin123`
- Kasir: `kasir1` / `kasir123`

Ganti kedua password ini segera setelah login pertama.

## Catatan
Proyek ini masih dalam pengembangan dan belum memiliki tes otomatis.
