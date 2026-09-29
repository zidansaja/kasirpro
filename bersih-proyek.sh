#!/bin/bash
# Membersihkan proyek KasirPro sebelum di-upload ke GitHub.
# Jalankan di folder proyek (yang ada package.json):  bash bersih-proyek.sh
set -e

[ -f package.json ] || { echo "GAGAL: jalankan skrip ini di folder proyek (yang ada package.json)."; exit 1; }
command -v git >/dev/null || { echo "GAGAL: git belum terpasang."; exit 1; }
if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
  echo "GAGAL: isi identitas git dulu (satu kali saja), lalu jalankan skrip ini lagi:"
  echo '  git config --global user.name "Nama Anda"'
  echo '  git config --global user.email "email@anda.com"'
  exit 1
fi

echo "1/4 Menghapus file sisa AI (log, screenshot, catatan agent, skrip server lama)..."
rm -rf tool-results upload download examples mini-services .zscripts tests agent-ctx
rm -f agent-ctx-11-a.md agent-browser Caddyfile cd curl sleep tail worklog.md bun.lock
rm -f qa-*.png qa6-*.png screenshot-*.png dev.log server.log

echo "2/4 Memperbarui .gitignore (database dan .env tidak boleh ikut)..."
touch .gitignore
add() { grep -qxF -- "$1" .gitignore || echo "$1" >> .gitignore; }
add ""
add "# tambahan KasirPro"
add "!.env.example"
add "db/*.db"
add "db/*.db-journal"
add "*.log"
add "*.tsbuildinfo"
add "/upload"
add "/tool-results"
mkdir -p db && touch db/.gitkeep

echo "3/4 Menulis README.md..."
cat > README.md << 'EOF'
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
EOF

echo "4/4 Membuat riwayat git baru yang bersih..."
if [ -d .git ]; then
  cadangan="../git-lama-$(date +%Y%m%d%H%M%S)"
  mv .git "$cadangan"
  echo "     Riwayat git lama disimpan di: $cadangan"
fi
git init -q -b main
git add -A
git commit -q -m "Versi awal KasirPro"

echo ""
echo "SELESAI. Cek bahwa file berbahaya tidak ikut tercatat (hasilnya harus kosong):"
git ls-files | grep -E '(^\.env$|\.db$|tool-results|upload/)' || echo "  (kosong = aman)"
