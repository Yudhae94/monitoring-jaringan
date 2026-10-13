# =========================================================
# SIM-RT Dashboard
# Sistem Informasi Manajemen RT
# =========================================================

Dashboard administrasi Rukun Tetangga berbasis web.
Dibangun dengan **Express + EJS + SQLite**, arsitektur berlapis
(routes → controllers → services → repositories → database) agar mudah dimaintain.

## Fitur

| Modul | Admin | Bendahara | Warga |
|---|:--:|:--:|:--:|
| Dashboard statistik | ✅ | ✅ | ✅ |
| Data Kartu Keluarga & Warga | ✅ CRUD | 👁 lihat | — |
| Iuran bulanan & pembayaran | ✅ | ✅ | 👁 tagihan sendiri |
| Kas & Pengeluaran | ✅ | ✅ | — |
| Surat menyurat (pengajuan) | ✅ approve | ✅ | ✅ ajukan |
| Pengumuman | ✅ CRUD | 👁 | 👁 |
| Laporan keuangan | ✅ | ✅ | — |
| Manajemen user | ✅ | — | — |
| Profil pribadi | ✅ | ✅ | ✅ |

## Pendaftaran Warga Baru

Warga baru bisa mendaftar sendiri, lalu akunnya menunggu persetujuan admin.

| Tahap | URL | Akses |
|---|---|---|
| Formulir pendaftaran | `/daftar` | Publik |
| Konfirmasi terkirim | `/daftar/terkirim` | Publik |
| Antrean & verifikasi | `/pendaftaran` | Admin |

**Alur:** warga isi formulir (NIK, data diri, alamat, email, password) → data masuk
antrean berstatus `menunggu` → admin buka menu **Pendaftaran** (ada badge merah di
sidebar) lalu **Setujui** atau **Tolak** dengan alasan.

Saat disetujui, sistem otomatis membuat akun `role = warga` (akun langsung aktif).
Bila pendaftar menautkan Kartu Keluarga, data warga juga dibuat otomatis.

**Catatan keamanan:**
- Role selalu dipaksa `warga` — tidak bisa dipilih sendiri saat pendaftaran
- Password di-hash (bcrypt) dan tidak pernah ditampilkan kembali
- Email & NIK ganda ditolak agar antrean tidak kembar
- Rate limit: maksimal 5 pendaftaran per jam per IP

## Menjalankan

```bash
npm install
npm run db:reset     # buat database + isi data contoh
npm start            # http://localhost:3000
```

## Pengujian & Utilitas

```bash
npm run test:smoke   # 89 pengujian seluruh modul
npm run test:daftar  # 50 pengujian alur pendaftaran
npm run check:views  # periksa keseimbangan tag HTML semua .ejs
npm run fix:encoding # perbaiki mojibake (emoji jadi "ðŸ‘¤")
```

> **Catatan encoding:** jangan memakai `Set-Content -Encoding UTF8` (PowerShell)
> untuk menyunting file berisi emoji — PowerShell membaca UTF-8 sebagai ANSI
> lalu menuliskannya ulang sehingga merusak karakter. Gunakan editor atau
> `fs.readFileSync/writeSync` dengan `'utf8'`. Jalankan `npm run fix:encoding`
> bila hal ini sudah terlanjur terjadi.

## Akun Demo

| Role | Email | Password |
|---|---|---|
| Admin | `admin@simrt.local` | `admin123` |
| Bendahara | `bendahara@simrt.local` | `bendahara123` |
| Warga | `warga@simrt.local` | `warga123` |

## Struktur Folder

```
src/
├── config/         # konfigurasi terpusat (app, database, session)
├── database/       # koneksi, skema, migrasi, seeder
├── models/         # repository — satu file per tabel
├── services/       # business logic (iuran, kas, surat, laporan)
├── controllers/    # menangani request/response
├── routes/         # definisi endpoint per modul
├── middlewares/    # auth, role guard, validator, error handler
├── utils/          # helper (format, tanggal, response)
├── views/          # template EJS
└── server.js       # entry point
```

## Mengubah Identitas

Semua identitas diatur di `.env` — tidak perlu mengubah kode.

| Variabel | Keterangan | Nilai saat ini |
|---|---|---|
| `RT_NAMA` | Nama kompleks (tampil di UI & kop surat) | `PRIME PANORAMA VILLAGE` |
| `RT_KELURAHAN` | Kelurahan | `Karawang Wetan` |
| `RT_KECAMATAN` | Kecamatan | `Karawang Timur` |
| `RT_KOTA` | Kota | `Karawang` |
| `RT_PROVINSI` | Provinsi | `Jawa Barat` |
| `RT_ALAMAT` | Alamat pada kop surat | `Jl. Melati Raya No. 12` |

## Mengubah Foto Background Login

Ganti file **`public/img/prime.webp`**, lalu hard-refresh browser
(`Ctrl + F5`) agar tidak memakai cache.

Gambar sekarang berformat **WebP** (meski nama file aslinya `.jpg`, isinya WebP).
Ukuran saat ini **382 × 510 px (potret)** — foto dipasang dengan
`background-size: auto 100%` supaya seluruh tinggi foto terlihat dan tidak terpotong.

Saran: gunakan gambar **potret** (tinggi > lebar). Kalau memakai gambar lanskap,
ganti `background-size: cover, auto 100%` menjadi `cover, cover` di
`public/css/style.css`. Format JPG/PNG/WebP, di bawah ±500 KB.
Kalau file tidak ada, halaman login tetap tampil dengan warna gradien (tidak rusak).
