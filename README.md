# Smart Attendance Converter

Prototype aplikasi web responsif untuk tools internal F&B. Aplikasi ini membantu admin mengubah file Excel mentah dari mesin kasir menjadi laporan kehadiran dan rekap gaji, lalu menyiapkan tampilan export gambar.

## Cara Menjalankan di VS Code

1. Buka folder `D:\Download\Smart Attendant` di VS Code.
2. Buka terminal VS Code.
3. Jalankan:

```bash
npm start
```

4. Buka `http://127.0.0.1:5500` di browser.

Alternatif tanpa terminal: install extension **Live Server**, klik kanan `index.html`, lalu pilih **Open with Live Server**. File `index.html` juga bisa dibuka langsung di browser untuk preview cepat.

## Cara Memakai Data Sendiri

Atur dulu **Acuan Waktu Kerja** di step **Upload**. Acuan dibuat ringkas untuk **Hari Biasa** dan **Jumat**. Jam Shift 1, Shift 2, dan toleransi dipakai sistem untuk membaca pola scan dan memberi rekomendasi konservatif. Sistem tidak mengisi jam absen yang hilang berdasarkan perkiraan; jika tidak ada scan masuk/pulang, data ditandai sebagai tidak scan atau perlu review. Setelah itu upload file absensi dari mesin kasir, lalu klik **Proses Data**. Nama staff di Review, Setting, Export, dan rekap akan mengikuti kolom nama dari file yang diupload.

Default acuan:

- Hari Biasa: Shift 1 `12:00 - 18:30`, Shift 2 `16:00 - 23:00`
- Jumat: Shift 1 `14:00 - 18:30`, Shift 2 `17:00 - 23:00`

Format yang didukung di prototype:

- `.xls`
- `.xlsx`
- `.csv`
- `.tsv`
- `.txt`

Contoh format:

```csv
Nama,Waktu,Status,Pengecualian
Budi,02/04/2026 16:02,C/Masuk,-
Budi,02/04/2026 22:50,C/Keluar,-
Sari,03/04/2026 11:00,C/Masuk,-
Sari,03/04/2026 16:00,C/Keluar,-
```

## Struktur File

- `index.html` - struktur utama aplikasi dan 4 step wizard.
- `styles.css` - desain responsif, warna Pizzain, card, tabel, badge, dan layout.
- `script.js` - dummy data, navigasi stepper, preview upload, dan render tabel.
- `server.js` - server lokal ringan berbasis Node.js.
- `package.json` - script `npm start` untuk menjalankan aplikasi.
- `xlsx.full.min.js` - parser spreadsheet lokal untuk membaca file Excel di browser.
- `DESIGN.md` - spesifikasi desain awal dari Stitch.

## UI yang Dipertahankan

- Wizard 4 langkah: Upload, Review, Setting, Export.
- Area upload file Excel/CSV yang langsung diproses.
- Tabel review dengan badge Aman, Perlu Review, dan Tidak Lengkap.
- Panel data bermasalah dengan aksi cepat.
- Setting staff, shift mingguan, dan rumus gaji.
- Preview laporan kehadiran, rekap gaji, serta tombol export gambar.

## UI yang Disederhanakan

- Tidak memakai sidebar besar supaya fokus tetap di alur kerja.
- Tidak membuat dashboard statistik kompleks.
- Tidak mengulang card penjelasan yang fungsinya sama.
- Filter dibuat ringan hanya di tahap Export.

## Catatan Data Contoh

Data contoh tidak lagi ditampilkan sebagai data kerja aktif. Nama staff akan diambil dari file upload. Jika belum ada file, tabel akan menampilkan state kosong.
