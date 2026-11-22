# JejakNusantara untuk PAWM

Aplikasi Expo SDK 58 untuk menjelajahi destinasi dan cerita budaya. Tab Jelajah dan Akun membuka layar katalog dan login. Detail destinasi dan detail cerita ada di stack navigasi.

## Jalankan di emulator Android

Dari akar repo, jalankan API, isi katalog demo, dan buat akun uji.

```shell
docker compose up -d --build --wait
docker compose exec -T core-service python -m jejaknusantara.seed_demo
docker compose exec core-service python -m jejaknusantara.create_user
```

Dari direktori `mobile/`, gunakan Node.js 22.13+ dan Expo Go yang mendukung SDK 58.

```shell
npm ci
npm run android
```

Emulator Android Studio mengakses gateway laptop lewat `http://10.0.2.2:8080`. Jika port berubah atau aplikasi dijalankan di HP fisik, buat `mobile/.env` dari `.env.example` dan set `EXPO_PUBLIC_API_URL` ke origin yang bisa dijangkau perangkat. Pakai hostname HTTPS K01 dari API Registry setelah tunnel aktif. Mulai ulang Expo setelah mengubah variabel ini.

## Coba alur utama

1. Di Jelajah, cari `lentera` untuk melihat dua destinasi demo. Coba filter Alam atau Budaya.
2. Buka Lembah Ranu, baca Tradisi Lentera, lalu buka Padepokan Sora dari daftar destinasi terkait.
3. Di Akun, coba form kosong, kata sandi yang keliru, dan akun uji yang Anda buat. Login berhasil menampilkan profil. Tutup lalu buka aplikasi untuk memeriksa pemulihan sesi. Ketuk Keluar untuk menghapus sesi di perangkat dan meminta server mencabut token.
4. Coba pencarian tanpa hasil atau hentikan API lokal sementara untuk melihat kondisi kosong, pesan kesalahan, dan aksi coba lagi.

## Sesi akun

Aplikasi mengirim login ke `POST /api/auth/login`, memeriksa token lewat `GET /api/auth/me`, dan mengakhiri sesi lewat `POST /api/auth/logout`. Token dan waktu kedaluwarsa disimpan dengan Expo SecureStore. Token terkait alamat backend saat login. Build Android menggunakan HTTPS untuk autentikasi. HTTP hanya diizinkan untuk alamat emulator atau loopback pada mode pengembangan.

## Tes lokal

```shell
npm run typecheck
npm test
```

Data demo fiktif disediakan oleh backend. Foto ilustrasi lanskap Jawa dibuat dengan ImageGen dan dipakai sebagai pembuka katalog. Integrasi mitra dan APK release dijadwalkan setelah API publik serta kontrak mitra tersedia.
