'use strict';

/**
 * Seeder: mengisi database dengan data contoh siap pakai.
 * Akun demo:
 *   admin@simrt.local     / admin123
 *   bendahara@simrt.local / bendahara123
 *   warga@simrt.local     / warga123
 */

const bcrypt = require('bcryptjs');
const db = require('./connection');
const { migrate } = require('./migrate');
const appConfig = require('../config/app');

const BULAN_TAHUN_INI = new Date().getMonth() + 1;

function seed() {
  console.log('\n▶ Mengisi data contoh...');
  const conn = db.getConnection();

  // Pastikan tabel sudah ada
  migrate();

  const count = db.get("SELECT COUNT(*) AS n FROM users").n;
  if (count > 0) {
    console.log('  ⚠ Database sudah berisi data. Seeder dilewati.');
    console.log('    Gunakan "npm run db:reset" untuk membangun ulang dari nol.');
    return;
  }

  const hash = (pwd) => bcrypt.hashSync(pwd, 10);

  db.transaction(() => {
    // ---------- 1. USERS ----------
    const users = [
      ['H. Ahmad Suryana', 'admin@simrt.local', hash('admin123'), 'admin', '081234567801'],
      ['Siti Aminah', 'bendahara@simrt.local', hash('bendahara123'), 'bendahara', '081234567802'],
      ['Budi Santoso', 'warga@simrt.local', hash('warga123'), 'warga', '081234567803'],
      ['Rina Marlina', 'rina@simrt.local', hash('warga123'), 'warga', '081234567804'],
      ['Dedi Kurniawan', 'dedi@simrt.local', hash('warga123'), 'warga', '081234567805'],
    ];
    const insertUser = conn.prepare(
      'INSERT INTO users (nama, email, password, role, no_hp) VALUES (?, ?, ?, ?, ?)'
    );
    users.forEach((u) => insertUser.run(...u));
    console.log(`  ✓ ${users.length} user dibuat (admin, bendahara, 3 warga)`);

    // ---------- 2. KARTU KELUARGA ----------
    const kkData = [
      ['3276010101010001', 'H. Ahmad Suryana', 'Jl. Melati Raya No. 12', 'A', '12', 'milik'],
      ['3276010101010002', 'Budi Santoso', 'Jl. Melati Raya No. 14', 'A', '14', 'milik'],
      ['3276010101010003', 'Dedi Kurniawan', 'Jl. Melati Raya No. 16', 'A', '16', 'sewa'],
      ['3276010101010004', 'Rina Marlina', 'Jl. Melati Raya No. 18', 'A', '18', 'milik'],
      ['3276010101010005', 'Joko Widodo', 'Jl. Melati Raya No. 20', 'A', '20', 'kontrak'],
      ['3276010101010006', 'Slamet Riyadi', 'Jl. Melati Raya No. 22', 'A', '22', 'milik'],
    ];
    const insertKK = conn.prepare(`
      INSERT INTO kartu_keluarga (no_kk, kepala_keluarga, alamat, blok, no_rumah, rt, rw, kode_pos, status_rumah)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    kkData.forEach((k) =>
      insertKK.run(k[0], k[1], k[2], k[3], k[4], appConfig.rt.number, appConfig.rt.rw, appConfig.rt.kodePos, k[5])
    );
    console.log(`  ✓ ${kkData.length} kartu keluarga dibuat`);

    // ---------- 3. WARGA ----------
    const wargaData = [
      // [kk_id, nik, nama, jk, ttl_tempat, ttl_tanggal, agama, kawin, pendidikan, pekerjaan, status_keluarga, hp]
      [1, '3276010101010001', 'H. Ahmad Suryana', 'L', 'Depok', '1970-03-12', 'Islam', 'kawin', 'S1', 'Pensiunan', 'kepala_keluarga', '081234567801'],
      [1, '3276010101010011', 'Hj. Maryam', 'P', 'Bogor', '1973-07-08', 'Islam', 'kawin', 'SMA', 'Ibu Rumah Tangga', 'istri', '081234567811'],
      [1, '3276010101010012', 'Fajar Suryana', 'L', 'Depok', '2002-01-19', 'Islam', 'belum_kawin', 'SMA', 'Mahasiswa', 'anak', '081234567812'],
      [2, '3276010101010002', 'Budi Santoso', 'L', 'Jakarta', '1985-05-20', 'Islam', 'kawin', 'S1', 'Karyawan Swasta', 'kepala_keluarga', '081234567802'],
      [2, '3276010101010021', 'Ani Santoso', 'P', 'Depok', '1988-11-02', 'Islam', 'kawin', 'D3', 'Guru', 'istri', '081234567821'],
      [2, '3276010101010022', 'Nabila Santoso', 'P', 'Depok', '2015-06-15', 'Islam', 'belum_kawin', 'SD', 'Pelajar', 'anak', ''],
      [3, '3276010101010003', 'Dedi Kurniawan', 'L', 'Bandung', '1990-02-25', 'Islam', 'kawin', 'SMA', 'Wiraswasta', 'kepala_keluarga', '081234567805'],
      [3, '3276010101010031', 'Wulan Kurniawan', 'P', 'Depok', '1993-09-30', 'Islam', 'kawin', 'SMA', 'Ibu Rumah Tangga', 'istri', '081234567831'],
      [4, '3276010101010004', 'Rina Marlina', 'P', 'Depok', '1992-04-17', 'Islam', 'cerai_hidup', 'S1', 'Perawat', 'kepala_keluarga', '081234567804'],
      [4, '3276010101010041', 'Ahmad Fauzi', 'L', 'Depok', '2018-12-01', 'Islam', 'belum_kawin', 'TK', 'Pelajar', 'anak', ''],
      [5, '3276010101010005', 'Joko Widodo', 'L', 'Solo', '1980-08-11', 'Islam', 'kawin', 'S1', 'PNS', 'kepala_keluarga', '081234567815'],
      [6, '3276010101010006', 'Slamet Riyadi', 'L', 'Semarang', '1978-06-05', 'Islam', 'kawin', 'SMA', 'Buruh', 'kepala_keluarga', '081234567816'],
    ];
    const insertWarga = conn.prepare(`
      INSERT INTO warga (kk_id, nik, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, agama,
                         status_perkawinan, pendidikan, pekerjaan, status_keluarga, no_hp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    wargaData.forEach((w) => insertWarga.run(...w));
    console.log(`  ✓ ${wargaData.length} warga dibuat`);

    // Tautkan akun warga ke data warga
    conn.prepare('UPDATE users SET warga_id = ? WHERE email = ?').run(2, 'warga@simrt.local');
    conn.prepare('UPDATE users SET warga_id = ? WHERE email = ?').run(9, 'rina@simrt.local');
    conn.prepare('UPDATE users SET warga_id = ? WHERE email = ?').run(7, 'dedi@simrt.local');

    // ---------- 4. KATEGORI KAS (dibuat lebih dulu agar FK transaksi kas valid) ----------
    const kategori = [
      ['Iuran Warga', 'masuk', '#16a34a'],
      ['Donasi/Sumbangan', 'masuk', '#0ea5e9'],
      ['Dana Sosial', 'masuk', '#8b5cf6'],
      ['Kebersihan & Sampah', 'keluar', '#f59e0b'],
      ['Keamanan & Ronda', 'keluar', '#ef4444'],
      ['Perbaikan Fasilitas', 'keluar', '#64748b'],
      ['Kegiatan & Acara', 'keluar', '#ec4899'],
      ['Administrasi', 'keluar', '#14b8a6'],
    ];
    const insertKategori = conn.prepare(
      'INSERT INTO kategori_kas (nama, tipe, warna) VALUES (?, ?, ?)'
    );
    kategori.forEach((k) => insertKategori.run(...k));
    console.log(`  ✓ ${kategori.length} kategori kas dibuat`);

    // ---------- 5. JENIS IURAN ----------
    const jenisIuran = [
      ['Iuran Kebersihan', 'bulanan', 50000, 'Iuran sampah & kebersihan lingkungan'],
      ['Iuran Keamanan', 'bulanan', 75000, 'Honor petugas ronda'],
      ['Iuran Sosial/Kematian', 'insidental', 100000, 'Dana sosial warga'],
    ];
    const insertJenis = conn.prepare(
      'INSERT INTO jenis_iuran (nama, periode, nominal, keterangan) VALUES (?, ?, ?, ?)'
    );
    jenisIuran.forEach((j) => insertJenis.run(...j));
    console.log(`  ✓ ${jenisIuran.length} jenis iuran dibuat`);

    // ---------- 6. TAGIHAN ----------
    const jenisBulanan = [1, 2]; // kebersihan & keamanan
    const insertTagihan = conn.prepare(`
      INSERT INTO tagihan (kk_id, jenis_iuran_id, periode_bulan, periode_tahun, nominal, terbayar, status, jatuh_tempo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertBayar = conn.prepare(`
      INSERT INTO pembayaran (tagihan_id, kk_id, tanggal, nominal, method, dicatat_oleh, keterangan)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertKas = conn.prepare(`
      INSERT INTO transaksi_kas (tanggal, tipe, kategori_id, nominal, keterangan, sumber, ref_pembayaran_id, dicatat_oleh)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tahun = new Date().getFullYear();
    let tagihanCount = 0;
    let bayarCount = 0;

    for (let bulan = 1; bulan <= BULAN_TAHUN_INI; bulan += 1) {
      for (const kkId of [1, 2, 3, 4, 5, 6]) {
        for (const jenisId of jenisBulanan) {
          const nominal = jenisId === 1 ? 50000 : 75000;
          // KK id 1..4 lunas, 5 sebagian, 6 belum bayar
          let terbayar = 0;
          let status = 'belum_bayar';
          if (kkId <= 4) {
            terbayar = nominal;
            status = 'lunas';
          } else if (kkId === 5 && bulan <= Math.ceil(BULAN_TAHUN_INI / 2)) {
            terbayar = nominal;
            status = 'lunas';
          }

          const jatuhTempo = `${tahun}-${String(bulan).padStart(2, '0')}-10`;
          const tagihanId = db.insert(
            `INSERT INTO tagihan (kk_id, jenis_iuran_id, periode_bulan, periode_tahun, nominal, terbayar, status, jatuh_tempo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [kkId, jenisId, bulan, tahun, nominal, terbayar, status, jatuhTempo]
          );
          tagihanCount += 1;

          if (status === 'lunas') {
            const tgl = `${tahun}-${String(bulan).padStart(2, '0')}-05`;
            const bayarId = db.insert(
              `INSERT INTO pembayaran (tagihan_id, kk_id, tanggal, nominal, method, dicatat_oleh, keterangan)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [tagihanId, kkId, tgl, nominal, 'cash', 2, 'Pembayaran iuran bulanan']
            );
            bayarCount += 1;

            db.insert(
              `INSERT INTO transaksi_kas (tanggal, tipe, kategori_id, nominal, keterangan, sumber, ref_pembayaran_id, dicatat_oleh)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                tgl,
                'masuk',
                1,
                nominal,
                `Iuran ${jenisId === 1 ? 'Kebersihan' : 'Keamanan'} - KK ${kkId} (${bulan}/${tahun})`,
                'iuran',
                bayarId,
                2,
              ]
            );
          }
        }
      }
    }
    console.log(`  ✓ ${tagihanCount} tagihan & ${bayarCount} pembayaran dibuat`);

    // ---------- 6. TRANSAKSI KAS (pengeluaran contoh) ----------
    const pengeluaran = [
      [`${tahun}-0${Math.min(9, BULAN_TAHUN_INI)}-03`, 'keluar', 4, 600000, 'Pembayaran jasa angkut sampah bulan ini'],
      [`${tahun}-0${Math.min(9, BULAN_TAHUN_INI)}-05`, 'keluar', 5, 900000, 'Honor petugas ronda 3 orang'],
      [`${tahun}-0${Math.min(9, BULAN_TAHUN_INI)}-12`, 'keluar', 6, 350000, 'Perbaikan lampu jalan blok A'],
      [`${tahun}-0${Math.min(9, BULAN_TAHUN_INI)}-20`, 'keluar', 7, 500000, 'Konsumsi rapat RT'],
    ];
    pengeluaran.forEach((p) => {
      db.insert(
        `INSERT INTO transaksi_kas (tanggal, tipe, kategori_id, nominal, keterangan, sumber, dicatat_oleh)
         VALUES (?, ?, ?, ?, ?, 'manual', 2)`,
        p
      );
    });
    db.insert(
      `INSERT INTO transaksi_kas (tanggal, tipe, kategori_id, nominal, keterangan, sumber, dicatat_oleh)
       VALUES (?, 'masuk', 2, ?, 'Sumbangan dari pengusaha lokal untuk renovasi pos ronda', 'manual', 2)`,
      [`${tahun}-0${Math.min(9, BULAN_TAHUN_INI)}-08`, 1500000]
    );
    console.log(`  ✓ ${pengeluaran.length + 1} transaksi kas manual dibuat`);

    // ---------- 9. JENIS SURAT ----------
    const jenisSurat = [
      ['SKD', 'Surat Keterangan Domisili', 'Menerangkan bahwa yang bersangkutan benar berdomisili di wilayah RT.'],
      ['SKTM', 'Surat Keterangan Tidak Mampu', 'Untuk keperluan keringanan biaya pendidikan/kesehatan.'],
      ['SKU', 'Surat Keterangan Usaha', 'Menerangkan keberadaan usaha yang dijalankan warga.'],
      ['SKCK', 'Pengantar SKCK', 'Surat pengantar pembuatan SKCK ke Polres setempat.'],
      ['SKL', 'Surat Keterangan Kelahiran', 'Keterangan kelahiran untuk pengurusan akta.'],
      ['SKP', 'Surat Keterangan Kematian', 'Keterangan kematian untuk pengurusan administrasi.'],
      ['IZIN', 'Surat Izin Keramaian', 'Izin kegiatan/acara yang melibatkan warga banyak.'],
    ];
    const insertSurat = conn.prepare(
      'INSERT INTO jenis_surat (kode, nama, template) VALUES (?, ?, ?)'
    );
    jenisSurat.forEach((s) => insertSurat.run(...s));
    console.log(`  ✓ ${jenisSurat.length} jenis surat dibuat`);

    // ---------- 10. PENGAJUAN SURAT ----------
    const bulanStr = String(BULAN_TAHUN_INI).padStart(2, '0');
    const suratData = [
      ['001/RT05/2026', 1, 3, 2, 'Budi Santoso', '3276010101010002', '081234567802',
        'Persyaratan pendaftaran sekolah anak', 'menunggu', null],
      ['002/RT05/2026', 3, 4, 7, 'Dedi Kurniawan', '3276010101010003', '081234567805',
        'Pengajuan KUR ke bank', 'disetujui', 'Sudah diverifikasi, data sesuai.'],
      ['003/RT05/2026', 2, 5, 9, 'Rina Marlina', '3276010101010004', '081234567804',
        'Keringanan biaya rumah sakit', 'diproses', 'Menunggu tanda tangan ketua RT.'],
      ['004/RT05/2026', 4, 3, 2, 'Budi Santoso', '3276010101010002', '081234567802',
        'Melengkapi berkas lamaran kerja', 'ditolak', 'Lengkapi surat pengantar dari kelurahan terlebih dahulu.'],
    ];
    suratData.forEach((s) => {
      db.insert(
        `INSERT INTO pengajuan_surat (no_surat, jenis_surat_id, user_id, warga_id, nama_pemohon, nik_pemohon,
                                      no_hp, keperluan, status, catatan_admin, tanggal_pengajuan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...s, `${tahun}-${bulanStr}-0${(s[8] === 'menunggu' ? 1 : 2) + suratData.indexOf(s)}`]
      );
    });
    console.log(`  ✓ ${suratData.length} pengajuan surat dibuat`);

    // ---------- 11. PENGUMUMAN ----------
    const pengumuman = [
      ['Kerja Bakti Bulan Ini', 'Diberitahukan kepada seluruh warga bahwa akan dilaksanakan kerja bakti membersihkan saluran air pada hari Minggu pukul 07.00 WIB. Mohon membawa peralatan masing-masing.', 'penting'],
      ['Jadwal Ronda Malam', 'Jadwal ronda malam telah diperbarui. Silakan cek papan informasi pos ronda untuk jadwal kelompok masing-masing.', 'normal'],
      ['Pemadaman Listrik Terjadwal', 'Akan ada pemadaman listrik terjadwal dari PLN pada hari Rabu pukul 09.00-12.00 WIB untuk pemeliharaan jaringan.', 'urgent'],
      ['Iuran Bulan Ini', `Mohon kepada warga yang belum melunasi iuran bulanan segera melakukan pembayaran kepada Bendahara (${appConfig.rt.bendahara}). Terima kasih.`, 'normal'],
    ];
    const insertPengumuman = conn.prepare(
      'INSERT INTO pengumuman (judul, isi, prioritas, dibuat_oleh) VALUES (?, ?, ?, 1)'
    );
    pengumuman.forEach((p) => insertPengumuman.run(...p));
    console.log(`  ✓ ${pengumuman.length} pengumuman dibuat`);

    // ---------- 12. LOG AKTIVITAS ----------
    db.insert(
      `INSERT INTO aktivitas_log (user_id, aksi, modul, deskripsi, ip_address)
       VALUES (1, 'SEED', 'system', 'Database diisi data contoh oleh seeder', '127.0.0.1')`
    );
  });

  console.log('\n✅ Seeder selesai.\n');
  console.log('   Akun demo:');
  console.log('   ┌──────────┬──────────────────────────┬───────────────┐');
  console.log('   │ Role     │ Email                    │ Password      │');
  console.log('   ├──────────┼──────────────────────────┼───────────────┤');
  console.log('   │ Admin    │ admin@simrt.local        │ admin123      │');
  console.log('   │ Bendahara│ bendahara@simrt.local    │ bendahara123  │');
  console.log('   │ Warga    │ warga@simrt.local        │ warga123      │');
  console.log('   └──────────┴──────────────────────────┴───────────────┘');
}

if (require.main === module) {
  try {
    seed();
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('✗ Seeder gagal:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

module.exports = { seed };
