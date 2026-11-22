# JejakNusantara untuk PAWM

Aplikasi Expo SDK 58 untuk menjelajahi destinasi dan cerita budaya. Tab Jelajah dan Akun membuka layar katalog dan login. Detail destinasi dan detail cerita ada di stack navigasi.

## Jalankan di emulator Android

Dari akar repo, jalankan API dan isi katalog demo.

```shell
docker compose up -d --build --wait
docker compose exec -T core-service python -m jejaknusantara.seed_demo
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
3. Di Akun, kirim form kosong untuk melihat validasi. Gunakan hanya data contoh saat mencoba form. Login belum terhubung ke backend, sehingga form belum membuat sesi atau mengirim data.
4. Coba pencarian tanpa hasil atau hentikan API lokal sementara untuk melihat kondisi kosong, pesan kesalahan, dan aksi coba lagi.

## Tes lokal

```shell
npm run typecheck
npm test
```

Data demo fiktif disediakan oleh backend. Foto ilustrasi lanskap Jawa dibuat dengan ImageGen dan dipakai sebagai pembuka katalog. Integrasi mitra dan APK release dijadwalkan setelah API publik serta kontrak mitra tersedia.
