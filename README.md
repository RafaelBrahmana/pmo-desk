# Project Management Dashboard

_Project Portfolio, Coordination & Monitoring · Talent Partnership Intern — designed & developed by Rafael Brahmana_

Dashboard PMO Corporate Banking: portofolio proyek, timeline & milestone, jadwal dan notulen meeting, vendor dengan arsip PDF, dan register risiko. Sorotan PMO (proyek tertinggal jadwal, milestone terlambat, serapan anggaran berlebih, notulen tertunda, kontrak vendor yang hampir habis, PKS yang belum diarsipkan) dihitung otomatis.

**Website:** https://rafaelbrahmana.github.io/pmo-desk/

## Dua mode

| | Mode demo | Mode tim |
|---|---|---|
| Aktif bila | `API_URL` di `docs/config.js` kosong | `API_URL` diisi URL Web App Google |
| Data & PDF tersimpan di | Browser masing-masing orang | Google Sheets + Google Drive pemilik |
| Dilihat tim? | Tidak | Ya, dengan kode akses tim |

```
pmo-desk/
├── docs/
│   ├── index.html     ← dashboard (GitHub Pages)
│   └── config.js      ← isi API_URL di sini untuk mode tim
├── apps-script/
│   └── Code.gs        ← backend Google, satu-satunya file yang ditempel ke Apps Script
└── README.md
```

---

## Mengaktifkan mode tim (sekali saja, ±10 menit)

**1. Buat project Apps Script**
Buka [script.new](https://script.new) (login dengan akun Google pemilik data). Klik *Untitled project* di kiri atas, ganti menjadi `PMO Desk`.

**2. Tempel kode**
Hapus semua isi editor, lalu tempel seluruh isi [`apps-script/Code.gs`](apps-script/Code.gs). Klik ikon **Save** (💾).

**3. Jalankan setup**
1. Di toolbar atas, pastikan fungsi yang dipilih adalah **setup**, lalu klik **Run**.
2. Klik **Review permissions** → pilih akun Anda.
3. Muncul *"Google hasn't verified this app"*: klik **Advanced → Go to PMO Desk (unsafe) → Allow**. Ini normal untuk script buatan sendiri.
4. Di **Execution log** di bawah, catat **KODE AKSES TIM** (format `XXXX-XXXX-XXXX`). Google Sheet `PMO Desk – Data` dan folder `PMO Desk – Dokumen Vendor` otomatis dibuat di Google Drive Anda.

**4. Deploy**
1. **Deploy → New deployment** → ikon ⚙ → **Web app**.
2. **Execute as: Me** · **Who has access: Anyone**.
3. **Deploy** → salin **Web app URL** (berakhiran `/exec`).

**5. Hubungkan website**
Di GitHub, buka `docs/config.js` → ✏️ Edit → tempel URL di antara tanda kutip `API_URL: ""` → **Commit changes**. Dalam 1–2 menit website berubah ke **Mode tim**.

**6. Bagikan ke tim**
Kirim alamat website dan **kode akses tim** ke anggota tim. Mereka cukup mengisi nama dan kode akses sekali di setiap browser.

> Tim tidak perlu akses ke Google Sheet atau Drive. Semua data dibaca dan ditulis lewat script dengan kode akses tersebut.

---

## Pemakaian sehari-hari

- **Data contoh**: klik **Hapus data contoh** saat siap memakai data asli. Data yang sudah diedit tidak ikut terhapus.
- **Unggah PDF**: tab **Vendor & Dokumen** → tombol unggah di kartu vendor, atau seret file ke kartu. Maks. 10 MB (PDF, PNG, JPG).
- **Sinkronisasi**: perubahan anggota tim lain muncul otomatis setiap menit, atau klik **Muat ulang**.
- **Jejak perubahan**: setiap baris di Google Sheet mencatat nama pengubah (`updatedBy`) dan waktunya (`updatedAt`).
- **Backup**: buka Google Sheet `PMO Desk – Data` → **File → Download → Microsoft Excel**.

## Keamanan

- Alamat website bersifat publik, tetapi data hanya bisa dibuka dengan **kode akses tim**. Tanpa kode, server menolak semua permintaan.
- **Ganti kode** bila bocor atau ada anggota yang keluar: di Apps Script pilih fungsi **gantiKodeAkses** → **Run** → kode baru muncul di Execution log. Semua orang otomatis keluar dan perlu masuk dengan kode baru.
- Data dan PDF tersimpan di Google Drive pemilik, bukan di GitHub. Repository ini hanya berisi kode.
- Sebelum mengunggah kontrak atau dokumen vendor rahasia, pastikan penggunaan akun Google untuk data tersebut sesuai kebijakan klasifikasi data dan IT bank.

## Memperbarui backend

Ganti isi editor Apps Script dengan `Code.gs` terbaru → Save → **Deploy → Manage deployments** → ✏️ → *Version*: **New version** → **Deploy**. URL tetap sama, jadi `config.js` tidak perlu diubah.

## Kalau ada masalah

| Pesan | Solusi |
|---|---|
| "Server belum di-setup" | Jalankan `setup` (langkah 3). |
| "Kode akses salah atau sudah diganti" | Minta kode terbaru ke pemilik. |
| "Balasan server tidak terbaca" | Deploy ulang dengan **Who has access: Anyone** (langkah 4). |
| Opsi *Anyone* tidak tersedia | Akun Google Workspace kantor membatasinya. Pakai akun Gmail pribadi atau minta admin mengizinkan. |
| Website masih *Mode demo* setelah URL diisi | Tunggu 1–2 menit, lalu muat ulang dengan Ctrl+Shift+R. |
