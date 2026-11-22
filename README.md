# JejakNusantara

Tugas 2 TST × PWAM · Microservice katalog destinasi wisata lokal dan cerita budaya

## Arsitektur

Permintaan publik masuk lewat Cloudflare Tunnel, diteruskan ke gateway Nginx, lalu diproses oleh FastAPI. Modul Destination Catalog dan Cultural Heritage Content berjalan dalam satu microservice. SQLite menyimpan destinasi, cerita, dan relasi many-to-many dalam volume Docker `catalog-data`.

API publik menampilkan konten berstatus terbit. Data demo bersifat fiktif dan dimasukkan secara eksplisit. Nginx membatasi laju permintaan gabungan ke gateway sebesar 10 permintaan per detik dengan burst 20.

## Cara mengakses API

Akses lokal dari perangkat yang menjalankan Docker tersedia di `http://127.0.0.1:8080`. Dokumentasi interaktif ada di `/docs` dan kontrak OpenAPI ada di `/openapi.json`.

Untuk akses dari luar jaringan STB, gunakan hostname HTTPS yang dicatat kelompok di API Registry. JejakNusantara berada di kelas K01 dan menggunakan domain `stei.fun`. Hostname yang diusulkan adalah `https://jejaknusantara.stei.fun`, jika nama tersebut tersedia di API Registry. Endpoint baca publik dapat digunakan langsung tanpa akun atau API key.

- `GET /api/health` mengembalikan `{"status":"ok"}` jika database dapat dibaca.
- `GET /api/destinations` menampilkan katalog terbit. Parameter opsional `q` mencari nama, deskripsi, atau judul cerita terbit terkait. `region` dan `category` menyaring nama wilayah dan kategori.
- `GET /api/destinations/{destination_id}` menampilkan detail, koordinat, informasi kunjungan, dan ringkasan cerita terbit terkait.
- `GET /api/cultural-stories/{story_id}` menampilkan narasi, sumber, dan destinasi terbit terkait.

Contoh berikut memakai ID dari data demo. Ganti URL dasar dengan hostname HTTPS kelompok setelah deployment.

```bash
curl -fsS 'http://127.0.0.1:8080/api/destinations?q=lentera'
curl -fsS 'http://127.0.0.1:8080/api/destinations/lembah-ranu'
curl -fsS 'http://127.0.0.1:8080/api/cultural-stories/tradisi-lentera'
```

ID yang tidak tersedia atau konten draf menghasilkan `404`. Parameter pencarian di atas 100 karakter menghasilkan `422`. Permintaan berlebih dapat menerima `429` dari gateway.

## Menjalankan stack dan deploy ke STB

1. Periksa arsitektur STB dengan `uname -m` dan pastikan Docker Compose tersedia. Image tunnel yang dipakai tersedia untuk Linux ARM64 dan AMD64. Untuk STB 32-bit, pilih image tunnel yang kompatibel sebelum tahap publikasi.
2. Jalankan stack dari akar repo dengan perintah berikut. Jalankan perintah kedua untuk mengisi data fiktif pada lingkungan demo milik kelompok.

```bash
docker compose up -d --build --wait
docker compose exec -T core-service python -m jejaknusantara.seed_demo
curl -fsS http://127.0.0.1:8080/api/health
```

3. Di dashboard Cloudflare kelas, buat tunnel kelompok dan petakan hostname kelompok di domain `stei.fun` ke `http://gateway:80`. Salin `.env.example` ke `.env` jika file itu belum ada, lalu isi `TUNNEL_TOKEN` langsung di STB.
4. Jalankan `docker compose --profile tunnel up -d`. Gateway memakai port loopback host untuk uji lokal. Cloudflare meneruskan HTTPS melalui koneksi keluar dari STB.
5. Dari luar jaringan STB, uji `/api/health` dan alur destinasi → cerita → destinasi lain lewat URL HTTPS. Catat URL dan dokumentasi aktual di Registry.

## Verifikasi dan serah terima

- Dari direktori `core-service/`, pasang dependensi melalui `python -m pip install -r requirements-dev.txt` dalam virtual environment, lalu jalankan `python -m unittest discover -s tests -v`.
- Cek data tetap terbaca setelah restart kontainer. Catat hasil uji dan URL HTTPS yang sudah aktif sebelum mengumpulkan PDF dan URL repo.
- Di Git, buat commit pengembangan API dan commit deployment sesuai pekerjaan tiap anggota. Terapkan patch kode dengan `git am` untuk mempertahankan author commit.

Tahap ini memuat API baca katalog, cerita, dan relasinya. Kurasi melalui admin, login dan favorit merupakan pekerjaan lanjutan. Integrasi API kelompok mitra masuk Tugas 3.
