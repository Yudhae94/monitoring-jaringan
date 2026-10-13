-- =========================================================
-- SKEMA DATABASE SIM-RT
-- Semua tabel memakai IF NOT EXISTS agar aman dijalankan ulang
-- =========================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------
-- 1. USERS (autentikasi + role)
--    role: admin | bendahara | warga
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nama          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password      TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'warga'
                        CHECK (role IN ('admin','bendahara','warga')),
  no_hp         TEXT,
  avatar        TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login    TEXT,
  warga_id      INTEGER,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ---------------------------------------------------------
-- 2. KARTU KELUARGA
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS kartu_keluarga (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  no_kk          TEXT    NOT NULL UNIQUE,
  kepala_keluarga TEXT   NOT NULL,
  alamat         TEXT    NOT NULL,
  blok           TEXT,
  no_rumah       TEXT,
  rt             TEXT,
  rw             TEXT,
  kode_pos       TEXT,
  status_rumah   TEXT    NOT NULL DEFAULT 'milik'
                         CHECK (status_rumah IN ('milik','sewa','kontrak','numpang')),
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_kk_no_kk ON kartu_keluarga(no_kk);

-- ---------------------------------------------------------
-- 3. WARGA
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS warga (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kk_id          INTEGER NOT NULL,
  nik            TEXT    NOT NULL UNIQUE,
  nama           TEXT    NOT NULL,
  jenis_kelamin  TEXT    NOT NULL CHECK (jenis_kelamin IN ('L','P')),
  tempat_lahir   TEXT,
  tanggal_lahir  TEXT,
  agama          TEXT,
  status_perkawinan TEXT CHECK (status_perkawinan IN ('belum_kawin','kawin','cerai_hidup','cerai_mati')),
  pendidikan     TEXT,
  pekerjaan      TEXT,
  kewarganegaraan TEXT   NOT NULL DEFAULT 'WNI',
  status_keluarga TEXT   NOT NULL DEFAULT 'anggota'
                        CHECK (status_keluarga IN ('kepala_keluarga','istri','anak','familiar_lain')),
  no_hp          TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (kk_id) REFERENCES kartu_keluarga(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_warga_kk   ON warga(kk_id);
CREATE INDEX IF NOT EXISTS idx_warga_nama ON warga(nama);

-- ---------------------------------------------------------
-- 4. JENIS IURAN (master)
--    periode: bulanan | tahunan | insidental
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS jenis_iuran (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nama        TEXT    NOT NULL,
  periode     TEXT    NOT NULL DEFAULT 'bulanan'
                      CHECK (periode IN ('bulanan','tahunan','insidental')),
  nominal     REAL    NOT NULL DEFAULT 0,
  keterangan  TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------
-- 5. TAGIHAN IURAN (per KK per periode)
--    status: belum_bayar | sebagian | lunas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS tagihan (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kk_id         INTEGER NOT NULL,
  jenis_iuran_id INTEGER NOT NULL,
  periode_bulan INTEGER NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
  periode_tahun INTEGER NOT NULL,
  nominal       REAL    NOT NULL DEFAULT 0,
  terbayar      REAL    NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'belum_bayar'
                        CHECK (status IN ('belum_bayar','sebagian','lunas')),
  jatuh_tempo   TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (kk_id)          REFERENCES kartu_keluarga(id) ON DELETE CASCADE,
  FOREIGN KEY (jenis_iuran_id) REFERENCES jenis_iuran(id)    ON DELETE RESTRICT,
  UNIQUE (kk_id, jenis_iuran_id, periode_bulan, periode_tahun)
);

CREATE INDEX IF NOT EXISTS idx_tagihan_kk      ON tagihan(kk_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_periode ON tagihan(periode_tahun, periode_bulan);
CREATE INDEX IF NOT EXISTS idx_tagihan_status  ON tagihan(status);

-- ---------------------------------------------------------
-- 6. PEMBAYARAN
--    method: cash | transfer
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pembayaran (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tagihan_id    INTEGER NOT NULL,
  kk_id         INTEGER NOT NULL,
  tanggal       TEXT    NOT NULL DEFAULT (date('now','localtime')),
  nominal       REAL    NOT NULL DEFAULT 0,
  method        TEXT    NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','transfer')),
  no_referensi  TEXT,
  dicatat_oleh  INTEGER,
  keterangan    TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (tagihan_id)   REFERENCES tagihan(id)   ON DELETE CASCADE,
  FOREIGN KEY (kk_id)        REFERENCES kartu_keluarga(id) ON DELETE CASCADE,
  FOREIGN KEY (dicatat_oleh) REFERENCES users(id)     ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bayar_tagihan ON pembayaran(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_bayar_tanggal ON pembayaran(tanggal);

-- ---------------------------------------------------------
-- 7. KATEGORI TRANSAKSI KAS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS kategori_kas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nama      TEXT    NOT NULL,
  tipe      TEXT    NOT NULL CHECK (tipe IN ('masuk','keluar')),
  warna     TEXT    DEFAULT '#64748b',
  created_at TEXT   NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------
-- 8. TRANSAKSI KAS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaksi_kas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal      TEXT    NOT NULL DEFAULT (date('now','localtime')),
  tipe         TEXT    NOT NULL CHECK (tipe IN ('masuk','keluar')),
  kategori_id  INTEGER,
  nominal      REAL    NOT NULL DEFAULT 0,
  keterangan   TEXT    NOT NULL,
  sumber       TEXT    NOT NULL DEFAULT 'manual'
                       CHECK (sumber IN ('manual','iuran')),
  ref_pembayaran_id INTEGER,
  bukti        TEXT,
  dicatat_oleh INTEGER,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (kategori_id)       REFERENCES kategori_kas(id) ON DELETE SET NULL,
  FOREIGN KEY (dicatat_oleh)      REFERENCES users(id)        ON DELETE SET NULL,
  FOREIGN KEY (ref_pembayaran_id) REFERENCES pembayaran(id)   ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kas_tanggal  ON transaksi_kas(tanggal);
CREATE INDEX IF NOT EXISTS idx_kas_tipe     ON transaksi_kas(tipe);

-- ---------------------------------------------------------
-- 9. JENIS SURAT (master)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS jenis_surat (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  kode    TEXT    NOT NULL UNIQUE,
  nama    TEXT    NOT NULL,
  template TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------
-- 10. PENGAJUAN SURAT
--     status: menunggu | diproses | disetujui | ditolak | selesai
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pengajuan_surat (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  no_surat       TEXT UNIQUE,
  jenis_surat_id INTEGER NOT NULL,
  user_id        INTEGER,
  warga_id       INTEGER,
  nama_pemohon   TEXT    NOT NULL,
  nik_pemohon    TEXT,
  no_hp          TEXT,
  keperluan      TEXT    NOT NULL,
  keterangan     TEXT,
  status         TEXT    NOT NULL DEFAULT 'menunggu'
                         CHECK (status IN ('menunggu','diproses','disetujui','ditolak','selesai')),
  catatan_admin  TEXT,
  tanggal_pengajuan TEXT NOT NULL DEFAULT (date('now','localtime')),
  tanggal_proses TEXT,
  diproses_oleh  INTEGER,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (jenis_surat_id) REFERENCES jenis_surat(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id)        REFERENCES users(id)       ON DELETE SET NULL,
  FOREIGN KEY (warga_id)       REFERENCES warga(id)       ON DELETE SET NULL,
  FOREIGN KEY (diproses_oleh)  REFERENCES users(id)       ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_surat_status ON pengajuan_surat(status);
CREATE INDEX IF NOT EXISTS idx_surat_user   ON pengajuan_surat(user_id);

-- ---------------------------------------------------------
-- 11. PENGUMUMAN
--     prioritas: normal | penting | urgent
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pengumuman (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  judul       TEXT    NOT NULL,
  isi         TEXT    NOT NULL,
  prioritas   TEXT    NOT NULL DEFAULT 'normal'
                      CHECK (prioritas IN ('normal','penting','urgent')),
  tanggal_mulai TEXT  NOT NULL DEFAULT (date('now','localtime')),
  tanggal_selesai TEXT,
  is_publish  INTEGER NOT NULL DEFAULT 1,
  dibuat_oleh INTEGER,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (dibuat_oleh) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- 12. LOG AKTIVITAS (audit trail)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS aktivitas_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  aksi       TEXT    NOT NULL,
  modul      TEXT    NOT NULL,
  deskripsi  TEXT,
  ip_address TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_log_created ON aktivitas_log(created_at);

-- ---------------------------------------------------------
-- 13. PENDAFTARAN WARGA BARU
--     Alur: warga daftar mandiri -> masuk antrean di sini ->
--     admin menyetujui (akun user dibuat & aktif) atau menolak.
--     status: menunggu | disetujui | ditolak
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pendaftaran (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nama            TEXT    NOT NULL,
  email           TEXT    NOT NULL,
  no_hp           TEXT,
  nik             TEXT    NOT NULL,
  tempat_lahir    TEXT,
  tanggal_lahir   TEXT,
  jenis_kelamin   TEXT    NOT NULL CHECK (jenis_kelamin IN ('L','P')),
  alamat          TEXT    NOT NULL,
  no_rumah        TEXT,
  kk_id           INTEGER,
  password_hash   TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'menunggu'
                            CHECK (status IN ('menunggu','disetujui','ditolak')),
  alasan_menolak  TEXT,
  diverifikasi_oleh INTEGER,
  tanggal_diverifikasi TEXT,
  user_id         INTEGER,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (kk_id)              REFERENCES kartu_keluarga(id) ON DELETE SET NULL,
  FOREIGN KEY (diverifikasi_oleh)  REFERENCES users(id)            ON DELETE SET NULL,
  FOREIGN KEY (user_id)            REFERENCES users(id)            ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pendaftaran_status  ON pendaftaran(status);
CREATE INDEX IF NOT EXISTS idx_pendaftaran_email  ON pendaftaran(email);
CREATE INDEX IF NOT EXISTS idx_pendaftaran_nik    ON pendaftaran(nik);
CREATE INDEX IF NOT EXISTS idx_pendaftaran_created ON pendaftaran(created_at);
