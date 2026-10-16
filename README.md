# Corporate Banking PMO Desk

Dashboard PMO untuk tim Corporate Banking: portofolio proyek, timeline & milestone, jadwal dan notulen meeting, register vendor dengan arsip PDF, dan register risiko. Sorotan PMO (proyek tertinggal jadwal, milestone terlambat, serapan anggaran berlebih, kontrak vendor yang hampir habis, PKS yang belum diarsipkan) dihitung otomatis.

**Cara kerjanya**

| Bagian | Disimpan di | Fungsi |
|---|---|---|
| Data proyek, milestone, meeting, vendor, risiko | Google Sheets | Database bersama tim |
| PDF vendor (NDA, proposal, PKS, invoice, BAST) | Google Drive, folder `PMO Desk – Dokumen Vendor` | Arsip dokumen, satu subfolder per vendor |
| Dashboard | Google Apps Script (Web App) | Halaman yang dibuka tim, login dengan akun Google |
| Kode + alamat website | GitHub (repo ini) + GitHub Pages | Menyimpan kode dan memberi alamat yang mudah diingat |

Hak akses diatur lewat tombol **Share** di Google Sheet dan folder Drive. Orang yang tidak dibagikan tidak bisa melihat data meskipun punya link-nya.

```
pmo-desk/
├── apps-script/
│   ├── Code.gs        ← backend (tempel ke Apps Script)
│   └── Index.html     ← tampilan dashboard (tempel ke Apps Script, nama file: Index)
├── docs/
│   └── index.html     ← halaman GitHub Pages yang mengarahkan tim ke dashboard
└── README.md
```

---

## A. Pasang di Google (sekali saja, ±10 menit)

**1. Buat Google Sheet baru**
Buka [sheets.new](https://sheets.new), beri nama `PMO Desk – Data`.

**2. Tempel kode ke Apps Script**
1. Di Google Sheet: menu **Extensions → Apps Script**.
2. Ganti nama project (kiri atas) menjadi `PMO Desk`.
3. Buka file `Code.gs`, hapus semua isinya, lalu tempel isi file [`apps-script/Code.gs`](apps-script/Code.gs).
4. Klik **+** di samping *Files* → **HTML** → beri nama `Index` (tanpa `.html`). Hapus isinya, lalu tempel isi file [`apps-script/Index.html`](apps-script/Index.html).
5. Klik ikon **Save** (💾).

**3. Jalankan setup**
1. Di toolbar, pilih fungsi `setup` lalu klik **Run**.
2. Klik **Review permissions** → pilih akun Google Anda.
3. Muncul layar *"Google hasn't verified this app"*. Ini normal untuk script buatan sendiri: klik **Advanced → Go to PMO Desk (unsafe) → Allow**.
4. Setelah selesai, Google Sheet Anda punya tab **Proyek, Milestone, Meeting, Vendor, Dokumen, Risiko** berisi data contoh, dan folder **PMO Desk – Dokumen Vendor** muncul di Google Drive.

**4. Deploy sebagai Web App**
1. Klik **Deploy → New deployment** → ikon ⚙ → **Web app**.
2. Isi:
   - Description: `v1`
   - **Execute as: User accessing the web app**
   - **Who has access: Anyone with Google account**
3. Klik **Deploy**, lalu salin **Web app URL** (berakhiran `/exec`).

> Pengaturan ini membuat setiap orang mengakses data dengan akun Google-nya sendiri, jadi hanya orang yang Anda bagikan di langkah 5 yang bisa melihat dan mengubah data.

**5. Bagikan akses ke tim**
Lakukan pada **Google Sheet** *dan* **folder `PMO Desk – Dokumen Vendor`** di Google Drive:

- **Share** → tambahkan email anggota tim.
- Peran **Editor**: bisa menambah/mengubah data dan mengunggah PDF.
- Peran **Viewer**: hanya melihat dashboard (cocok untuk atasan atau stakeholder).

Pertama kali membuka dashboard, setiap anggota tim akan diminta memberi izin seperti langkah 3.

---

## B. Pasang di GitHub (±5 menit)

**6. Buat repository dan unggah file**
1. Di GitHub: **New repository** → nama `pmo-desk` → pilih **Public** → **Create repository**.
   GitHub Pages gratis untuk repository public. Repo ini hanya berisi kode, tidak ada data proyek, dokumen, maupun password.
2. Klik **uploading an existing file**, lalu seret seluruh isi folder ini (`README.md`, folder `apps-script`, folder `docs`). Klik **Commit changes**.

**7. Isi alamat Web App**
1. Di GitHub, buka `docs/index.html` → ikon ✏️ (Edit).
2. Ganti `PASTE_WEB_APP_URL_DI_SINI` dengan URL dari langkah 4.
3. Klik **Commit changes**.

**8. Aktifkan GitHub Pages**
1. **Settings → Pages**.
2. *Source*: **Deploy from a branch** → Branch: **main**, folder: **/docs** → **Save**.
3. Tunggu 1–2 menit. Alamat website tim Anda:
   `https://USERNAME-GITHUB-ANDA.github.io/pmo-desk/`

Kirim alamat itu ke tim. Halaman tersebut langsung mengarahkan ke dashboard.

---

## C. Pemakaian sehari-hari

- **Data contoh**: klik **Hapus data contoh** di banner atas dashboard saat siap memakai data asli. Data yang sudah Anda edit tidak ikut terhapus.
- **Unggah PDF**: tab **Vendor & Dokumen** → tombol unggah di kartu vendor, atau seret file ke kartu. Maksimal 10 MB per file (PDF, PNG, JPG). File tersimpan di subfolder vendor di Google Drive.
- **Sinkronisasi**: perubahan dari anggota tim lain muncul otomatis setiap menit, atau klik **Muat ulang**.
- **Lihat data mentah / backup**: tombol **Buka di Google Sheets** di tab Proyek. Untuk backup: di Google Sheet, **File → Download → Microsoft Excel (.xlsx)**.
- **Jejak perubahan**: setiap baris mencatat `updatedBy` (email) dan `updatedAt`.

## D. Memperbarui kode

1. Ganti isi `Code.gs` / `Index` di Apps Script dengan versi baru → Save.
2. **Deploy → Manage deployments** → ✏️ → *Version*: **New version** → **Deploy**.
   URL Web App tetap sama, jadi GitHub Pages tidak perlu diubah.
3. Perbarui juga file di repo GitHub agar kode tetap tersimpan rapi.

## E. Kalau ada masalah

| Pesan / gejala | Penyebab & solusi |
|---|---|
| "Aplikasi belum di-setup" | Pemilik belum menjalankan `setup()` (langkah 3). |
| "Anda belum punya akses ke Google Sheet PMO" | Bagikan Google Sheet ke email orang tersebut (langkah 5). |
| "Anda hanya punya akses lihat" | Ubah perannya menjadi Editor di Google Sheet **dan** folder dokumen. |
| Unggah PDF gagal karena akses | Folder `PMO Desk – Dokumen Vendor` belum dibagikan sebagai Editor. |
| "Script function not found: doGet" atau halaman kosong | File HTML di Apps Script harus bernama persis `Index`. Deploy ulang sebagai versi baru. |
| Akun Google kantor menolak membuka aplikasi | Admin Google Workspace perusahaan memblokir aplikasi yang tidak terverifikasi. Minta admin mengizinkan project ini. |
| Dokumen dihapus dari dashboard tapi file masih ada di Drive | Di My Drive, file hanya bisa dipindahkan ke Sampah oleh pengunggahnya. Gunakan Shared Drive bila tersedia, atau hapus manual. |
| GitHub Pages menampilkan "Alamat dashboard belum diatur" | `APP_URL` di `docs/index.html` belum diisi (langkah 7). |

## F. Keamanan & kepatuhan

- Data dan dokumen hanya tersimpan di Google Sheets dan Google Drive pemilik, dengan akses sesuai pengaturan Share. GitHub hanya menyimpan kode.
- Sebelum mengunggah kontrak atau dokumen vendor yang bersifat rahasia, pastikan penggunaan Google Workspace / akun Google untuk data tersebut sesuai kebijakan klasifikasi data dan IT bank.
- Untuk mencabut akses seseorang, hapus email-nya dari Share di Google Sheet dan folder dokumen.
