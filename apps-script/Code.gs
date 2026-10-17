/**
 * Corporate Banking PMO Desk — backend Google (API untuk website GitHub Pages)
 *
 * Hanya file ini yang perlu ditempel ke Google Apps Script.
 * - setup() membuat Google Sheet "PMO Desk – Data", folder Drive "CIMB NIAGA PM" (semua PDF vendor),
 *   data contoh, dan KODE AKSES TIM (lihat Execution log setelah Run).
 * - Website (nixons88.github.io/pmo-desk) memanggil script ini lewat URL Web App.
 *   Setiap permintaan wajib membawa kode akses tim; tanpa kode, data tidak bisa dibaca atau diubah.
 *
 * Deploy → New deployment → Web app:
 *   Execute as     : Me
 *   Who has access : Anyone
 */

const APP_TZ = 'Asia/Jakarta';
const SHEET_NAME = 'PMO Desk – Data';
const FOLDER_NAME = 'CIMB NIAGA PM';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB per file
const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg'];

const SCHEMA = {
  projects:   { sheet: 'Proyek',    fields: ['id', 'code', 'name', 'segment', 'sponsor', 'pm', 'phase', 'rag', 'priority', 'start', 'end', 'progress', 'budget', 'spent', 'objective'] },
  milestones: { sheet: 'Milestone', fields: ['id', 'projectId', 'title', 'due', 'status', 'owner'] },
  meetings:   { sheet: 'Meeting',   fields: ['id', 'projectId', 'type', 'title', 'date', 'time', 'duration', 'location', 'attendees', 'agenda', 'mom', 'actions'] },
  vendors:    { sheet: 'Vendor',    fields: ['id', 'name', 'category', 'status', 'projectId', 'contractValue', 'contractEnd', 'pic', 'contact', 'rating', 'notes'] },
  documents:  { sheet: 'Dokumen',   fields: ['id', 'vendorId', 'projectId', 'name', 'docType', 'note', 'fileId', 'size', 'contentType', 'uploadedAt'] },
  risks:      { sheet: 'Risiko',    fields: ['id', 'projectId', 'category', 'title', 'impact', 'likelihood', 'status', 'owner', 'due', 'mitigation'] },
};
const META_FIELDS = ['example', 'updatedAt', 'updatedBy'];
const NUMERIC = ['progress', 'budget', 'spent', 'duration', 'contractValue', 'rating', 'impact', 'likelihood', 'size'];

let WHO_ = '';

/* ------------------------------------------------------------------ */
/* Setup — jalankan sekali dari editor Apps Script                      */
/* ------------------------------------------------------------------ */

function setup() {
  const props = PropertiesService.getScriptProperties();

  let ss = null;
  const sid = props.getProperty('SHEET_ID');
  if (sid) { try { ss = SpreadsheetApp.openById(sid); } catch (e) { ss = null; } }
  if (!ss) { try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; } }
  if (!ss) ss = SpreadsheetApp.create(SHEET_NAME);
  ss.setSpreadsheetTimeZone(APP_TZ);

  Object.keys(SCHEMA).forEach(function (col) {
    const s = SCHEMA[col];
    let sh = ss.getSheetByName(s.sheet);
    if (!sh) sh = ss.insertSheet(s.sheet);
    const head = s.fields.concat(META_FIELDS);
    sh.getRange(1, 1, 1, head.length).setValues([head])
      .setFontWeight('bold').setBackground('#0F1B2B').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    head.forEach(function (h, j) {
      if (NUMERIC.indexOf(h) < 0 && h !== 'example') {
        sh.getRange(2, j + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
      }
    });
  });
  const ours = Object.keys(SCHEMA).map(function (c) { return SCHEMA[c].sheet; });
  ss.getSheets().forEach(function (sh) {
    if (ours.indexOf(sh.getName()) < 0 && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });

  let folder = null;
  const fid = props.getProperty('FOLDER_ID');
  if (fid) { try { folder = DriveApp.getFolderById(fid); } catch (e) { folder = null; } }
  if (!folder) folder = DriveApp.createFolder(FOLDER_NAME);

  let key = props.getProperty('ACCESS_KEY');
  if (!key) key = newAccessKey_();
  props.setProperties({ SHEET_ID: ss.getId(), FOLDER_ID: folder.getId(), ACCESS_KEY: key });

  if (ss.getSheetByName('Proyek').getLastRow() < 2) seedExamples_(ss);

  Logger.log('==============================================');
  Logger.log('SETUP SELESAI');
  Logger.log('KODE AKSES TIM : ' + key);
  Logger.log('Google Sheet   : ' + ss.getUrl());
  Logger.log('Folder Drive   : ' + folder.getUrl());
  Logger.log('Langkah berikutnya: Deploy → New deployment → Web app.');
  Logger.log('==============================================');
}

/** Jalankan bila kode akses bocor atau ada anggota tim yang keluar. Kode lama langsung tidak berlaku. */
function gantiKodeAkses() {
  const key = newAccessKey_();
  PropertiesService.getScriptProperties().setProperty('ACCESS_KEY', key);
  Logger.log('KODE AKSES TIM BARU : ' + key);
}

function newAccessKey_() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += abc.charAt(Math.floor(Math.random() * abc.length));
    if (i === 3 || i === 7) out += '-';
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Web API                                                             */
/* ------------------------------------------------------------------ */

function doGet() {
  return json_({ ok: true, app: 'Corporate Banking PMO Desk API', message: 'API aktif. Buka dashboard lewat website GitHub Pages.' });
}

function doPost(e) {
  let body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, code: 'BAD_REQUEST', error: 'Permintaan tidak valid.' }); }

  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('ACCESS_KEY');
  if (!key || !props.getProperty('SHEET_ID')) {
    return json_({ ok: false, code: 'NOT_SETUP', error: 'Server belum di-setup. Pemilik perlu menjalankan setup() di Apps Script.' });
  }
  if (String(body.key || '').trim().toUpperCase() !== key) {
    return json_({ ok: false, code: 'AUTH', error: 'Kode akses salah atau sudah diganti. Minta kode terbaru ke PMO.' });
  }
  WHO_ = String(body.who || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 60);

  const routes = {
    getAll: getAll, saveItem: saveItem, deleteItems: deleteItems, deleteProject: deleteProject,
    clearExamples: clearExamples, uploadDocument: uploadDocument, getFile: getFile,
  };
  const fn = routes[body.action];
  if (!fn) return json_({ ok: false, code: 'BAD_REQUEST', error: 'Aksi tidak dikenal.' });
  try {
    const args = Array.isArray(body.args) ? body.args : [];
    return json_({ ok: true, data: fn.apply(null, args) });
  } catch (err) {
    return json_({ ok: false, code: 'ERROR', error: String((err && err.message) || err).replace(/^Exception:\s*/, '') });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Aksi                                                                */
/* ------------------------------------------------------------------ */

function getAll() {
  const ss = ss_();
  const out = {};
  Object.keys(SCHEMA).forEach(function (c) { out[c] = readCol_(ss, c); });
  out.meta = { serverTime: new Date().toISOString() };
  return out;
}

function saveItem(col, item) {
  checkCol_(col);
  if (!item || typeof item !== 'object') throw new Error('Data tidak valid.');
  return withLock_(function (ss) { writeItem_(ss, col, item); });
}

/** list: [{col, id}] — menghapus vendor ikut menghapus dokumennya. */
function deleteItems(list) {
  if (!Array.isArray(list) || !list.length) throw new Error('Tidak ada data yang dihapus.');
  return withLock_(function (ss) {
    const byCol = {};
    list.forEach(function (x) { checkCol_(x.col); (byCol[x.col] = byCol[x.col] || []).push(String(x.id)); });
    if (byCol.vendors) {
      const docs = readCol_(ss, 'documents').filter(function (d) { return byCol.vendors.indexOf(String(d.vendorId)) >= 0; });
      byCol.documents = (byCol.documents || []).concat(docs.map(function (d) { return d.id; }));
    }
    if (byCol.documents) trashFiles_(readCol_(ss, 'documents').filter(function (d) { return byCol.documents.indexOf(String(d.id)) >= 0; }));
    Object.keys(byCol).forEach(function (c) { deleteRows_(ss, c, byCol[c]); });
  });
}

function deleteProject(projectId) {
  projectId = String(projectId);
  return withLock_(function (ss) {
    ['milestones', 'meetings', 'risks'].forEach(function (c) {
      const ids = readCol_(ss, c).filter(function (x) { return String(x.projectId) === projectId; }).map(function (x) { return x.id; });
      if (ids.length) deleteRows_(ss, c, ids);
    });
    ['vendors', 'documents'].forEach(function (c) {
      readCol_(ss, c).filter(function (x) { return String(x.projectId) === projectId; })
        .forEach(function (x) { writeItem_(ss, c, { id: x.id, projectId: '' }); });
    });
    deleteRows_(ss, 'projects', [projectId]);
  });
}

function clearExamples() {
  return withLock_(function (ss) {
    Object.keys(SCHEMA).forEach(function (c) {
      const rows = readCol_(ss, c).filter(function (x) { return x.example === true; });
      if (!rows.length) return;
      if (c === 'documents') trashFiles_(rows);
      deleteRows_(ss, c, rows.map(function (x) { return x.id; }));
    });
  });
}

/** meta: {vendorId, name, docType, note, contentType}; b64: isi file (base64). */
function uploadDocument(meta, b64) {
  if (!meta || !b64) throw new Error('File tidak terbaca. Coba pilih file lagi.');
  const mime = String(meta.contentType || '');
  if (ALLOWED_MIME.indexOf(mime) < 0) throw new Error('Format tidak didukung. Unggah PDF, PNG, atau JPG.');
  const bytes = Utilities.base64Decode(b64);
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('File melebihi 10 MB. Kompres PDF lalu unggah ulang.');
  const name = String(meta.name || 'dokumen').replace(/[\\/:*?"<>|]/g, '_').slice(0, 180);

  return withLock_(function (ss) {
    const vendor = readCol_(ss, 'vendors').filter(function (v) { return String(v.id) === String(meta.vendorId); })[0];
    if (!vendor) throw new Error('Vendor tidak ditemukan. Muat ulang halaman lalu coba lagi.');
    // Semua dokumen masuk langsung ke folder "CIMB NIAGA PM"; nama file diawali vendor & jenis agar mudah dilacak.
    const file = folder_().createFile(Utilities.newBlob(bytes, mime, driveName_(vendor.name, meta.docType, name)));
    file.setDescription((meta.docType || '') + ' · ' + (vendor.name || '') + (meta.note ? ' · ' + meta.note : ''));
    writeItem_(ss, 'documents', {
      vendorId: vendor.id, projectId: vendor.projectId || '', name: name,
      docType: String(meta.docType || 'Lainnya'), note: String(meta.note || ''),
      fileId: file.getId(), size: bytes.length, contentType: mime,
      uploadedAt: new Date().toISOString(), example: false,
    });
  });
}

/** Mengirim isi dokumen ke website (hanya untuk pemegang kode akses). */
function getFile(docId) {
  const doc = readCol_(ss_(), 'documents').filter(function (d) { return String(d.id) === String(docId); })[0];
  if (!doc || !doc.fileId) throw new Error('Dokumen tidak ditemukan.');
  let blob;
  try { blob = DriveApp.getFileById(doc.fileId).getBlob(); }
  catch (e) { throw new Error('File sudah dihapus dari Google Drive.'); }
  return { name: doc.name, contentType: blob.getContentType() || doc.contentType, b64: Utilities.base64Encode(blob.getBytes()) };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Server belum di-setup. Pemilik perlu menjalankan setup() di Apps Script.');
  return SpreadsheetApp.openById(id);
}

function folder_() {
  return DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
}

function driveName_(vendor, type, name) {
  const clean = function (x) { return String(x || '').replace(/\s*\/\s*/g, '-').replace(/[\\:*?"<>|]/g, '_').trim(); };
  return (clean(vendor) || 'Tanpa vendor') + ' – ' + (clean(type) || 'Lainnya') + ' – ' + clean(name);
}

/**
 * Jalankan SEKALI setelah memperbarui kode: mengganti nama folder dokumen menjadi "CIMB NIAGA PM",
 * memindahkan semua file dari subfolder vendor lama ke dalamnya (dengan nama berawalan vendor & jenis),
 * lalu memindahkan subfolder yang sudah kosong ke Sampah.
 */
function rapikanFolder() {
  const folder = folder_();
  folder.setName(FOLDER_NAME);
  const docs = readCol_(ss_(), 'documents');
  const vendors = readCol_(ss_(), 'vendors');
  const byFile = {};
  docs.forEach(function (d) { if (d.fileId) byFile[d.fileId] = d; });
  const vName = {};
  vendors.forEach(function (v) { vName[v.id] = v.name; });
  let moved = 0, removed = 0;
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const sub = subs.next();
    const files = sub.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      const d = byFile[f.getId()];
      f.moveTo(folder);
      if (d) f.setName(driveName_(vName[d.vendorId] || sub.getName(), d.docType, d.name));
      else f.setName(driveName_(sub.getName(), 'Lainnya', f.getName()));
      moved++;
    }
    if (!sub.getFiles().hasNext() && !sub.getFolders().hasNext()) { sub.setTrashed(true); removed++; }
  }
  Logger.log('Folder: ' + folder.getName() + ' · ' + folder.getUrl());
  Logger.log(moved + ' file dipindahkan, ' + removed + ' subfolder kosong dipindahkan ke Sampah.');
}

function checkCol_(col) {
  if (!Object.prototype.hasOwnProperty.call(SCHEMA, col)) throw new Error('Jenis data tidak dikenal: ' + col);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Server sedang menyimpan perubahan lain. Coba lagi beberapa detik lagi.');
  try {
    fn(ss_());
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return getAll();
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function readCol_(ss, col) {
  const sh = ss.getSheetByName(SCHEMA[col].sheet);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(String);
  const tz = ss.getSpreadsheetTimeZone();
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const o = {};
    head.forEach(function (h, j) { if (h) o[h] = norm_(h, vals[i][j], tz); });
    if (o.id) out.push(o);
  }
  return out;
}

function norm_(k, v, tz) {
  if (v instanceof Date) {
    if (k === 'time') return Utilities.formatDate(v, tz, 'HH:mm');
    if (k === 'updatedAt' || k === 'uploadedAt') return v.toISOString();
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  if (k === 'example') return v === true || String(v).toUpperCase() === 'TRUE';
  if (NUMERIC.indexOf(k) >= 0) return v === '' || v === null ? 0 : (Number(v) || 0);
  return v === null || v === undefined ? '' : String(v);
}

function clean_(k, v) {
  if (k === 'example') return v === true;
  if (NUMERIC.indexOf(k) >= 0) { const n = Number(v); return isFinite(n) ? n : 0; }
  let s = v === null || v === undefined ? '' : String(v);
  if (s.length > 45000) s = s.slice(0, 45000);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // cegah teks dibaca sebagai rumus
  return s;
}

function writeItem_(ss, col, item) {
  const s = SCHEMA[col];
  const sh = ss.getSheetByName(s.sheet);
  if (!sh) throw new Error('Sheet "' + s.sheet + '" tidak ditemukan. Jalankan setup() lagi.');
  const head = headers_(sh);
  const tz = ss.getSpreadsheetTimeZone();
  const last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  const idx = item.id ? ids.indexOf(String(item.id)) : -1;

  const merged = {};
  if (idx >= 0) {
    const row = sh.getRange(idx + 2, 1, 1, head.length).getValues()[0];
    head.forEach(function (h, j) { merged[h] = norm_(h, row[j], tz); });
  } else {
    merged.example = false;
  }
  s.fields.concat(['example']).forEach(function (k) {
    if (k !== 'id' && Object.prototype.hasOwnProperty.call(item, k)) merged[k] = item[k];
  });
  merged.id = idx >= 0 ? ids[idx] : (item.id ? String(item.id) : col.charAt(0) + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 10));
  merged.updatedAt = new Date().toISOString();
  merged.updatedBy = WHO_;

  const values = head.map(function (h) { return clean_(h, merged[h]); });
  const formats = head.map(function (h) { return NUMERIC.indexOf(h) >= 0 || h === 'example' ? 'General' : '@'; });
  const r = idx >= 0 ? idx + 2 : last + 1;
  const rg = sh.getRange(r, 1, 1, head.length);
  rg.setNumberFormats([formats]);
  rg.setValues([values]);
  return merged.id;
}

function deleteRows_(ss, col, ids) {
  const sh = ss.getSheetByName(SCHEMA[col].sheet);
  const last = sh.getLastRow();
  if (last < 2) return;
  const want = {};
  ids.forEach(function (id) { want[String(id)] = true; });
  const vals = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (want[String(vals[i][0])]) sh.deleteRow(i + 2);
  }
}

function trashFiles_(docs) {
  docs.forEach(function (d) {
    if (!d.fileId) return;
    try { DriveApp.getFileById(d.fileId).setTrashed(true); } catch (e) { /* sudah terhapus */ }
  });
}

/* ------------------------------------------------------------------ */
/* Data contoh (fiktif) — dibuat sekali oleh setup()                    */
/* ------------------------------------------------------------------ */

function seedExamples_(ss) {
  const ex = function (o) { o.example = true; return o; };
  const P = [
    { id: 'p-cms', code: 'CB-2026-011', name: 'Cash Management System v3 (Corporate Portal)', segment: 'Cash Management', sponsor: 'Head of Transaction Banking', pm: 'Rafael', phase: 'Eksekusi', rag: 'a', priority: 'Tinggi', start: '2026-04-01', end: '2027-01-29', progress: 58, budget: 6500000000, spent: 4300000000, objective: 'Migrasi 1.200 nasabah korporasi ke portal cash management baru dengan fitur liquidity sweeping dan virtual account real-time.' },
    { id: 'p-scf', code: 'CB-2026-014', name: 'Supply Chain Financing Platform', segment: 'Trade Finance', sponsor: 'Head of Corporate Banking', pm: 'Rafael', phase: 'Eksekusi', rag: 'r', priority: 'Tinggi', start: '2026-03-02', end: '2026-12-18', progress: 41, budget: 8200000000, spent: 5900000000, objective: 'Platform pembiayaan distributor dan supplier untuk 15 anchor korporasi, terintegrasi dengan ERP anchor.' },
    { id: 'p-ekyb', code: 'CB-2026-017', name: 'Digital Corporate Onboarding (e-KYB)', segment: 'Corporate Banking', sponsor: 'Head of Corporate Banking', pm: 'Rafael', phase: 'UAT', rag: 'g', priority: 'Tinggi', start: '2026-05-04', end: '2026-11-27', progress: 82, budget: 3100000000, spent: 2250000000, objective: 'Memangkas waktu pembukaan rekening korporasi dari 14 hari kerja menjadi 3 hari melalui verifikasi dokumen digital dan integrasi AHU.' },
    { id: 'p-h2h', code: 'CB-2026-021', name: 'Host-to-Host Payroll Klien BUMN Energi', segment: 'Transaction Banking', sponsor: 'Relationship Manager Group Head', pm: 'Rafael', phase: 'Perencanaan', rag: 'g', priority: 'Sedang', start: '2026-08-17', end: '2027-02-26', progress: 27, budget: 1450000000, spent: 310000000, objective: 'Integrasi H2H payroll untuk sekitar 38.000 karyawan dengan rekonsiliasi otomatis harian.' },
    { id: 'p-trade', code: 'CB-2026-024', name: 'Trade Finance Workflow Automation', segment: 'Trade Finance', sponsor: 'Head of Trade Finance', pm: 'Rafael', phase: 'Inisiasi', rag: 'a', priority: 'Sedang', start: '2026-09-21', end: '2027-06-30', progress: 8, budget: 4800000000, spent: 150000000, objective: 'Otomasi alur LC dan SKBDN end-to-end dengan target TAT penerbitan LC di bawah 1 hari kerja.' },
    { id: 'p-ews', code: 'CB-2026-006', name: 'Corporate Credit Early Warning Dashboard', segment: 'Corporate Banking', sponsor: 'Chief Risk Officer', pm: 'Rafael', phase: 'Selesai', rag: 'g', priority: 'Sedang', start: '2026-01-12', end: '2026-07-31', progress: 100, budget: 2000000000, spent: 1870000000, objective: 'Dashboard peringatan dini kredit korporasi berbasis 24 indikator keuangan dan perilaku rekening.' },
  ];
  const M = [
    ['m1', 'p-cms', 'BRD & FSD sign-off', '2026-05-15', 'Selesai', 'Business Analyst'],
    ['m2', 'p-cms', 'SIT selesai', '2026-09-30', 'Berjalan', 'IT Delivery'],
    ['m3', 'p-cms', 'UAT dengan 20 nasabah pilot', '2026-11-20', 'Belum mulai', 'Product Owner'],
    ['m4', 'p-cms', 'Go-live batch 1', '2027-01-15', 'Belum mulai', 'Rafael'],
    ['m5', 'p-scf', 'Integrasi ERP anchor (3 dari 15)', '2026-08-28', 'Selesai', 'PT Sinergi Data Nusantara'],
    ['m6', 'p-scf', 'Integrasi ERP anchor (15 dari 15)', '2026-10-09', 'Terblokir', 'PT Sinergi Data Nusantara'],
    ['m7', 'p-scf', 'Persetujuan Kepatuhan & Risk', '2026-10-30', 'Berjalan', 'Compliance'],
    ['m8', 'p-scf', 'UAT end-to-end', '2026-11-25', 'Belum mulai', 'Product Owner'],
    ['m9', 'p-ekyb', 'Integrasi API AHU', '2026-08-14', 'Selesai', 'IT Delivery'],
    ['m10', 'p-ekyb', 'UAT', '2026-10-23', 'Berjalan', 'Operations'],
    ['m11', 'p-ekyb', 'Go-live', '2026-11-27', 'Belum mulai', 'Rafael'],
    ['m12', 'p-h2h', 'Kick-off & kebutuhan format file', '2026-09-04', 'Selesai', 'Rafael'],
    ['m13', 'p-h2h', 'Desain interface & keamanan (SFTP/PGP)', '2026-10-30', 'Berjalan', 'IT Security'],
    ['m14', 'p-trade', 'RFP dikirim ke 3 vendor', '2026-10-02', 'Selesai', 'Procurement'],
    ['m15', 'p-trade', 'Penetapan vendor', '2026-10-28', 'Berjalan', 'Procurement'],
  ].map(function (a) { return { id: a[0], projectId: a[1], title: a[2], due: a[3], status: a[4], owner: a[5] }; });
  const T = [
    ['mt1', 'p-cms', 'Steering Committee', 'SteerCo CMS v3: keputusan jadwal UAT', '2026-10-15', '14:00', 90, 'Ruang Rapat Direksi Lt. 21', 'Head of Transaction Banking, IT Delivery, PT Arunika', '1. Status SIT dan defect kritikal\n2. Opsi jadwal UAT pilot\n3. Persetujuan change request #04', '', ''],
    ['mt2', 'p-scf', 'Weekly Progress', 'Weekly progress SCF', '2026-10-14', '10:00', 60, 'Microsoft Teams', 'Tim proyek, PT Sinergi Data Nusantara', 'Update integrasi ERP anchor batch 2 dan rencana pemulihan jadwal', '', ''],
    ['mt3', 'p-trade', 'Vendor Meeting', 'Presentasi solusi vendor Trade Finance', '2026-10-16', '09:30', 120, 'Ruang Rapat Lt. 12', 'Procurement, Trade Ops, IT Architecture', 'Demo solusi dan tanya jawab teknis dari 3 vendor shortlist', '', ''],
    ['mt4', 'p-ekyb', 'UAT Review', 'Review hasil UAT minggu 1', '2026-10-20', '13:30', 60, 'Microsoft Teams', 'Operations, Compliance, Kalyana Advisory', 'Rekap test case lulus/gagal dan prioritas perbaikan', '', ''],
    ['mt5', 'p-h2h', 'Workshop / Requirement', 'Workshop format file payroll dengan klien', '2026-10-22', '10:00', 120, 'Kantor klien, Jakarta', 'RM, IT Integration, tim HR & Treasury klien', 'Finalisasi format file, jadwal cut-off, dan skema rekonsiliasi', '', ''],
    ['mt6', 'p-scf', 'Steering Committee', 'SteerCo SCF: recovery plan', '2026-10-27', '15:00', 60, 'Ruang Rapat Direksi Lt. 21', 'Head of Corporate Banking, CRO office, vendor', 'Persetujuan recovery plan dan opsi penalti vendor', '', ''],
    ['mt7', 'p-cms', 'Weekly Progress', 'Weekly progress CMS v3', '2026-10-07', '10:00', 60, 'Microsoft Teams', 'Tim proyek, PT Arunika', 'Status SIT', 'SIT 86% selesai; 7 defect kritikal tersisa di modul liquidity sweeping. Vendor meminta perpanjangan SIT 2 minggu.', 'PT Arunika kirim rencana perbaikan defect — 10 Okt\nIT Delivery siapkan environment UAT — 24 Okt\nPMO siapkan materi SteerCo — 14 Okt'],
    ['mt8', 'p-scf', 'Vendor Meeting', 'Eskalasi keterlambatan integrasi ERP', '2026-10-09', '16:00', 45, 'Ruang Rapat Lt. 12', 'PT Sinergi Data Nusantara, IT Delivery', 'Penyebab keterlambatan dan komitmen tanggal baru', '', ''],
    ['mt9', 'p-trade', 'Internal', 'Kick-off Trade Finance Automation', '2026-09-23', '09:00', 90, 'Ruang Rapat Lt. 12', 'Trade Ops, IT, Procurement, Compliance', 'Ruang lingkup, timeline seleksi vendor', 'Ruang lingkup fase 1: LC impor dan SKBDN. RFP dikirim ke 3 vendor paling lambat 2 Okt.', 'Procurement kirim RFP — 2 Okt\nTrade Ops petakan proses as-is — 9 Okt'],
    ['mt10', 'p-ekyb', 'Internal', 'Persiapan UAT e-KYB', '2026-10-12', '14:00', 60, 'Microsoft Teams', 'Operations, IT Delivery', 'Kesiapan data uji dan user UAT', '', ''],
  ].map(function (a) { return { id: a[0], projectId: a[1], type: a[2], title: a[3], date: a[4], time: a[5], duration: a[6], location: a[7], attendees: a[8], agenda: a[9], mom: a[10], actions: a[11] }; });
  const V = [
    { id: 'v1', name: 'PT Arunika Solusi Digital', category: 'Software / Core System', status: 'Aktif', projectId: 'p-cms', contractValue: 4100000000, contractEnd: '2027-03-31', pic: 'Dimas Pratama', contact: 'dimas.p@arunika.example', rating: 3, notes: 'Kualitas build cukup, tetapi jumlah defect SIT di atas target.' },
    { id: 'v2', name: 'PT Sinergi Data Nusantara', category: 'System Integrator', status: 'Aktif', projectId: 'p-scf', contractValue: 5200000000, contractEnd: '2026-12-31', pic: 'Laras Wibowo', contact: 'laras@sinergidata.example', rating: 2, notes: 'Integrasi ERP terlambat; surat teguran pertama dikirim 2 Okt.' },
    { id: 'v3', name: 'Kalyana Advisory', category: 'Konsultan', status: 'PKS ditandatangani', projectId: 'p-ekyb', contractValue: 950000000, contractEnd: '2026-11-30', pic: 'Nadia Kusuma', contact: 'nadia@kalyana.example', rating: 4, notes: '' },
    { id: 'v4', name: 'PT Mitra Integrasi Teknologi', category: 'System Integrator', status: 'Negosiasi', projectId: 'p-h2h', contractValue: 780000000, contractEnd: '', pic: 'Yoga Hartanto', contact: '0812-0000-1234', rating: 0, notes: 'Negosiasi SLA dukungan 24/7 saat cut-off payroll.' },
    { id: 'v5', name: 'PT Lintas Niaga Sistem', category: 'Software / Core System', status: 'Evaluasi / RFP', projectId: 'p-trade', contractValue: 0, contractEnd: '', pic: 'Hendra Saputra', contact: 'hendra@lintasniaga.example', rating: 0, notes: 'Shortlist RFP, demo 16 Okt.' },
    { id: 'v6', name: 'Cakra Cloud Indonesia', category: 'Infrastruktur / Cloud', status: 'Evaluasi / RFP', projectId: 'p-trade', contractValue: 0, contractEnd: '', pic: 'Maya Sari', contact: 'maya@cakracloud.example', rating: 0, notes: '' },
  ];
  const R = [
    ['r1', 'p-scf', 'Vendor', 'Integrasi ERP anchor terlambat karena kesiapan tim IT anchor', 5, 4, 'Open', 'Rafael', '2026-10-27', 'Recovery plan per anchor, tambah 2 engineer vendor, eskalasi ke RM masing-masing anchor.'],
    ['r2', 'p-scf', 'Regulasi / Compliance', 'Persetujuan kepatuhan atas skema pembiayaan belum terbit', 4, 3, 'Mitigasi berjalan', 'Compliance', '2026-10-30', 'Sesi klarifikasi mingguan dengan Compliance; dokumen kajian hukum dikirim 8 Okt.'],
    ['r3', 'p-cms', 'Teknologi', 'Performa sistem saat batch end-of-month belum teruji', 4, 4, 'Mitigasi berjalan', 'IT Delivery', '2026-11-06', 'Load test dengan volume 2x puncak transaksi sebelum UAT.'],
    ['r4', 'p-cms', 'Operasional', 'Resistensi nasabah migrasi dari portal lama', 3, 3, 'Open', 'Product Owner', '2026-12-15', 'Program pendampingan RM dan masa paralel 3 bulan.'],
    ['r5', 'p-ekyb', 'Teknologi', 'Downtime API AHU saat go-live', 3, 2, 'Open', 'IT Delivery', '2026-11-20', 'Fallback verifikasi manual dan antrean retry otomatis.'],
    ['r6', 'p-h2h', 'Jadwal', 'Perubahan format file dari klien setelah desain dikunci', 3, 3, 'Open', 'Rafael', '2026-10-22', 'Sign-off format file di workshop 22 Okt; perubahan berikutnya lewat CR.'],
    ['r7', 'p-trade', 'Anggaran', 'Seleksi vendor melewati batas penyerapan anggaran Q4', 4, 3, 'Open', 'Procurement', '2026-10-28', 'Percepat evaluasi teknis paralel dengan evaluasi komersial.'],
    ['r8', 'p-cms', 'Anggaran', 'Biaya change request melampaui contingency 10%', 3, 4, 'Open', 'Rafael', '2026-10-15', 'Prioritasi CR di SteerCo; tunda CR non-kritikal ke fase 2.'],
    ['r9', 'p-ekyb', 'Regulasi / Compliance', 'Temuan audit atas retensi dokumen digital', 4, 2, 'Closed', 'Compliance', '2026-09-30', 'Kebijakan retensi 10 tahun disetujui dan diterapkan.'],
  ].map(function (a) { return { id: a[0], projectId: a[1], category: a[2], title: a[3], impact: a[4], likelihood: a[5], status: a[6], owner: a[7], due: a[8], mitigation: a[9] }; });

  [['projects', P], ['milestones', M], ['meetings', T], ['vendors', V], ['risks', R]].forEach(function (pair) {
    pair[1].forEach(function (o) { writeItem_(ss, pair[0], ex(o)); });
  });
}
