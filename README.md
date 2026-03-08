# 🎓 Smart Selasar
https://smart-selasar.vercel.app/

**Smart Selasar** adalah aplikasi web modern untuk memfasilitasi pemesanan makanan dan pemantauan ketersediaan kursi kantin (selasar) secara *real-time*. Dibuat dengan antarmuka yang ramah pengguna, mahasiswa atau pengunjung dapat melihat kursi mana yang kosong, memesan makanan dari vendor yang buka, dan langsung membayar secara digital.

---

## ✨ Fitur Utama

- **🪑 Real-Time Seat Monitoring:** Pantau ketersediaan kursi secara langsung. (🟩 Hijau = Kosong, 🟥 Merah = Terisi).
- **🏪 Real-Time Vendor Status:** Menampilkan status vendor/kantin (Buka/Tutup) secara otomatis.
- **🛍️ Smart Cart System:** Sistem keranjang belanja yang interaktif untuk menambah/mengurangi pesanan.
- **💳 Integrasi Payment Gateway:** Pembayaran digital instan dan aman menggunakan **Midtrans Snap**.
- **🎟️ Live Order Tracking:** Lacak status pesanan secara *real-time* (Menunggu Dimasak ⏳ -> Sedang Dimasak 👨‍🍳 -> Siap Diambil ✅).
- **📱 Responsive & Modern UI:** Desain antarmuka yang estetik, modern, dan responsif (nyaman digunakan di HP maupun Laptop) menggunakan Tailwind CSS.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend:** [Next.js](https://nextjs.org/) (React) dengan App Router
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database & Realtime Backend:** [Supabase](https://supabase.com/) (PostgreSQL & Realtime Subscriptions)
- **Payment Gateway:** [Midtrans](https://midtrans.com/) (Snap API)

---

## 📦 Prasyarat (Prerequisites)

Sebelum memulai, pastikan kamu sudah menginstal:
- [Node.js](https://nodejs.org/) (versi 16.x atau terbaru)
- Akun [Supabase](https://supabase.com/) (dengan tabel `seats`, `vendors`, `menus`, dan `orders` yang sudah dikonfigurasi).
- Akun [Midtrans](https://midtrans.com/) (untuk mendapatkan Client Key dan Server Key).

---

## 🚀 Cara Menjalankan Proyek (Getting Started)

1. **Clone repositori ini** (atau *download* file proyeknya):
   ```bash
   git clone [https://github.com/username/smart-selasar.git](https://github.com/username/smart-selasar.git)
   cd smart-selasar
Instal dependensi (dependencies):

Bash
npm install
# atau menggunakan yarn/pnpm:
# yarn install
# pnpm install
Siapkan Environment Variables:
Buat file bernama .env.local di root directory proyek, lalu isi dengan konfigurasi berikut (sesuaikan dengan kredensial milikmu):

Code snippet
NEXT_PUBLIC_SUPABASE_URL=[https://proyek-kamu.supabase.co](https://proyek-kamu.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=kunci-anon-supabase-kamu
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-kunci-midtrans-kamu

# Note: Server key biasanya digunakan di sisi API Route (backend)
MIDTRANS_SERVER_KEY=SB-Mid-server-kunci-midtrans-kamu
Jalankan Development Server:

Bash
npm run dev
Buka Aplikasi:
Buka browser dan akses http://localhost:3000.

🗄️ Struktur Database (Supabase)
Proyek ini membutuhkan 4 tabel utama di database PostgreSQL (Supabase):

seats: Menyimpan data kursi (id, seat_code, is_occupied).

vendors: Menyimpan data toko/kantin (id, vendor_name, is_open).

menus: Menyimpan daftar makanan/minuman (id, vendor_id, item_name, price).

orders: Menyimpan riwayat pesanan (id, vendor_id, seat_code, total_price, order_details, status).

Pastikan fitur Realtime diaktifkan untuk tabel seats, vendors, dan orders di menu Database > Replication pada dashboard Supabase.
