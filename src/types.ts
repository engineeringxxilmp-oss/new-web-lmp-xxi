/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Area {
  id: string;
  name: string;
  keterangan?: string;
}

export type EquipmentStatus = 'Normal' | 'Maintenance' | 'Rusak' | 'Perbaikan' | 'NORMAL' | 'PERBAIKAN' | 'RUSAK';

export interface Equipment {
  id: string;
  name: string;
  areaId: string; // References Area.id
  quantity: number;
  status: EquipmentStatus;
  keterangan: string;
}

export type PrCategory = 'PR AC' | 'PR Projector' | 'PR Building' | 'PR Studio' | 'PR Engineering';
export type PrStatus = 'Belum Dikerjakan' | 'Sedang Diproses' | 'Selesai' | 'Belum Di Kerjakan' | 'Sedang Di Proses';

export interface PrEngineering {
  id: string;
  category: PrCategory;
  areaId: string; // References Area.id
  keluhan: string;
  tanggalPenemuan: string; // format: "10 Juli 2026"
  tanggalSelesai: string; // format: "10 Juli 2026" atau ""
  status: PrStatus;
  keterangan: string;
}

export type VendorStatus = 'Belum' | 'On Progress' | 'Selesai' | 'Belum Di Kerjakan' | 'Sedang Di Proses' | 'Belum Dikerjakan' | 'Sedang Diproses';

export interface VendorTeknisi {
  id: string;
  namaVendor: string;
  namaTeknisi: string;
  tanggal: string; // format: "10 Juli 2026" (Tanggal Visit Mulai)
  tanggalSelesai: string; // format: "10 Juli 2026" (Tanggal Visit Selesai)
  jamMulai: string; // format: "08:00"
  jamSelesai: string; // format: "13:30"
  areaId: string; // References Area.id
  hasilPekerjaan: string;
  status: VendorStatus;
  siapaYangNemenin?: string;
}

export type FkbStatus = 'Belum Naik FKB' | 'Sudah Naik FKB' | 'Belum Naik FPKB' | 'Sudah Naik FPKB';

export interface OrderBarang {
  id: string;
  tanggalOrder: string; // format: "10 Juli 2026"
  namaBarang: string;
  quantity: number;
  statusFkb: FkbStatus;
}

export type BarangStatus = 'Belum Datang' | 'Dalam Pengiriman' | 'Sudah Datang' | 'Belum Dateng' | 'Sudah Dateng';

export interface BarangDatang {
  id: string;
  tanggalBarangDatang: string; // format: "10 Juli 2026"
  namaBarang: string;
  quantity: number;
  sesuaiOrder: boolean;
  status: BarangStatus;
}

export interface RiwayatEquipment {
  id: string;
  equipmentId: string; // References Equipment.id
  areaId: string; // References Area.id
  tanggalMulai: string; // format: "10 Juli 2026"
  tanggalSelesai: string; // format: "10 Juli 2026" atau ""
  barangYangDiganti: string;
  status: EquipmentStatus;
  keterangan: string;
}

export type FormatFilm = '2D FLAT' | '2D SCOPE' | '3D' | 'IMAX' | 'ATMOS';
export type FormatSound = '5.1' | '7.1' | '7.1 ATMOS';
export type StatusTayang = 'BELUM TAYANG' | 'SEDANG TAYANG' | 'SUDAH TAYANG';

export interface FilmUpload {
  id: string;
  tanggal_terima: string;
  tanggal_ambil: string;
  judul_film: string;
  singkatan_film: string;
  format_film: FormatFilm;
  format_sound: FormatSound;
  status_tayang: StatusTayang;
  status_kdm: string;
  keterangan: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReport {
  id: string;
  periode: string;
  tanggal_generate: string;
  generated_by: string;
  jumlah_film: number;
  jumlah_kdm: number;
  jumlah_upload: number;
  status: string;
  report_json: string;
}

export type FontStyle = 'Inter' | 'Space Grotesk' | 'JetBrains Mono' | 'Playfair Display';
export type HeaderBgType = 'gradient-dark' | 'gradient-blue' | 'gradient-gold' | 'solid-slate' | 'solid-navy' | 'solid-black' | 'solid-pink' | 'gradient-pink';
export type IllustrationType = 'AC' | 'Projector' | 'Electrical' | 'Building' | 'All-in-One' | 'Anime-AC' | 'Anime-Projector' | 'Anime-Electrical' | 'Anime-Civil' | 'Anime-Slideshow' | 'All-Slideshow' | 'Real-AC-Chiller' | 'Real-AC-Indoor' | 'Real-Electrical' | 'Real-Projector' | 'Real-Resting' | 'Real-Civil' | 'Real-Slideshow';

export interface SystemBranding {
  logoUrl: string; // base64 or empty (uses default icon)
  title: string;
  subtitle: string;
  font: FontStyle;
  headerBg: HeaderBgType;
  illustration: IllustrationType;
}

// Initial Mock Data
export const INITIAL_AREAS: Area[] = [
  { id: 'area-1', name: 'Lobby Utama', keterangan: 'Area publik lantai 2 dekat bioskop XXI' },
  { id: 'area-2', name: 'Premier Lobby', keterangan: 'Lobby lounge khusus penonton XXI Premier' },
  { id: 'area-3', name: 'Koridor Utama', keterangan: 'Koridor akses menuju Studio 1-8' },
  { id: 'area-4', name: 'Kitchen & Cafe', keterangan: 'Dapur utama & counter concession XXI Cafe' },
  { id: 'area-5', name: 'Projector Room Studio 1-4', keterangan: 'Ruang proyeksi booth atas Studio 1-4' },
  { id: 'area-6', name: 'Projector Room Studio 5-8', keterangan: 'Ruang proyeksi booth atas Studio 5-8' },
  { id: 'area-7', name: 'Studio 1 (Ultra XD)', keterangan: 'Auditorium utama kapasitas besar Dolby Atmos' },
  { id: 'area-8', name: 'Studio 2', keterangan: 'Auditorium reguler Studio 2' },
  { id: 'area-9', name: 'Studio 3', keterangan: 'Auditorium reguler Studio 3' }
];

export const INITIAL_EQUIPMENT: Equipment[] = [
  { id: 'eq-1', name: 'Chiller AC York 50 TR', areaId: 'area-4', quantity: 2, status: 'Normal', keterangan: 'Pemeliharaan rutin tiap 3 bulan.' },
  { id: 'eq-2', name: 'Projector Barco DP4K-32B', areaId: 'area-5', quantity: 1, status: 'Normal', keterangan: 'Lampu baru diganti bulan lalu.' },
  { id: 'eq-3', name: 'Projector Christie CP2215', areaId: 'area-6', quantity: 1, status: 'Maintenance', keterangan: 'Kalibrasi lensa dan pembersihan debu.' },
  { id: 'eq-4', name: 'Exhaust Fan Lobby', areaId: 'area-1', quantity: 4, status: 'Rusak', keterangan: 'Motor dinamo terbakar, perlu gulung ulang.' },
  { id: 'eq-5', name: 'Speaker QSC SC-424', areaId: 'area-7', quantity: 6, status: 'Normal', keterangan: 'Speaker utama (L-C-R).' },
  { id: 'eq-6', name: 'UPS Riello 10kVA', areaId: 'area-5', quantity: 2, status: 'Normal', keterangan: 'Backup power untuk projector room.' },
  { id: 'eq-7', name: 'AC Split Daikin 2 PK', areaId: 'area-2', quantity: 3, status: 'Normal', keterangan: 'Suhu disetel 22 derajat Celcius.' }
];

export const INITIAL_PR_ENGINEERING: PrEngineering[] = [
  { id: 'pr-1', category: 'PR AC', areaId: 'area-2', keluhan: 'AC Premier Lobby kurang dingin, suhu terbaca 26C.', tanggalPenemuan: '05 Juli 2026', tanggalSelesai: '', status: 'Sedang Diproses', keterangan: 'Pengecekan kebocoran freon sedang dilakukan oleh tim internal.' },
  { id: 'pr-2', category: 'PR Projector', areaId: 'area-5', keluhan: 'Projector Studio 2 sering flickering setelah 2 jam menyala.', tanggalPenemuan: '07 Juli 2026', tanggalSelesai: '08 Juli 2026', status: 'Selesai', keterangan: 'Konektor kabel HDMI kendor, sudah diganti dengan kabel premium gold-plated.' },
  { id: 'pr-3', category: 'PR Building', areaId: 'area-3', keluhan: 'Plafon dekat pintu masuk Studio 1 terlihat rembes air.', tanggalPenemuan: '08 Juli 2026', tanggalSelesai: '', status: 'Belum Dikerjakan', keterangan: 'Perlu dicek jalur pipa AC di atas plafon.' }
];

export const INITIAL_VENDORS: VendorTeknisi[] = [
  { id: 'ven-1', namaVendor: 'CV Bintang AC Nusantara', namaTeknisi: 'Budi Santoso', tanggal: '09 Juli 2026', tanggalSelesai: '09 Juli 2026', jamMulai: '09:00', jamSelesai: '14:30', areaId: 'area-4', hasilPekerjaan: 'Melakukan cuci coil & vacuum drain AC Kitchen.', status: 'Selesai', siapaYangNemenin: 'TEKNIK' },
  { id: 'ven-2', namaVendor: 'PT Barco Indonesia', namaTeknisi: 'Hendra Wijaya', tanggal: '10 Juli 2026', tanggalSelesai: '10 Juli 2026', jamMulai: '10:00', jamSelesai: '12:00', areaId: 'area-5', hasilPekerjaan: 'Kunjungan rutin pemeriksaan optic block dan update firmware.', status: 'Belum', siapaYangNemenin: 'TEKNIK' }
];

export const INITIAL_ORDERS: OrderBarang[] = [
  { id: 'ord-1', tanggalOrder: '02 Juli 2026', namaBarang: 'Lampu Projector Xenon 4.5kW', quantity: 2, statusFkb: 'Sudah Naik FKB' },
  { id: 'ord-2', tanggalOrder: '08 Juli 2026', namaBarang: 'Freon R410A DuPont (Tabung 11kg)', quantity: 3, statusFkb: 'Belum Naik FKB' }
];

export const INITIAL_BARANG_DATANG: BarangDatang[] = [
  { id: 'arr-1', tanggalBarangDatang: '04 Juli 2026', namaBarang: 'Lampu Projector Xenon 4.5kW', quantity: 2, sesuaiOrder: true, status: 'Sudah Datang' },
  { id: 'arr-2', tanggalBarangDatang: '09 Juli 2026', namaBarang: 'Filter AC Split 2 PK', quantity: 10, sesuaiOrder: true, status: 'Dalam Pengiriman' }
];

export const INITIAL_RIWAYAT: RiwayatEquipment[] = [
  { id: 'hist-1', equipmentId: 'eq-2', areaId: 'area-5', tanggalMulai: '01 Juli 2026', tanggalSelesai: '01 Juli 2026', barangYangDiganti: 'Xenon Bulb 4.5kW', status: 'Normal', keterangan: 'Penggantian lampu projector berkala karena runtime habis.' },
  { id: 'hist-2', equipmentId: 'eq-4', areaId: 'area-1', tanggalMulai: '05 Juli 2026', tanggalSelesai: '', barangYangDiganti: 'Belum ada', status: 'Rusak', keterangan: 'Exhaust fan mati total, sedang dicarikan bengkel gulung dinamo.' }
];

export const DEFAULT_BRANDING: SystemBranding = {
  logoUrl: '',
  title: 'CINEMA XXI',
  subtitle: 'LIPPO MALL PURI',
  font: 'Inter',
  headerBg: 'gradient-dark',
  illustration: 'Anime-Slideshow'
};

export const INITIAL_FILM_UPLOAD: FilmUpload[] = [
  {
    id: 'film-1',
    tanggal_terima: '05 Juli 2026',
    tanggal_ambil: '06 Juli 2026',
    judul_film: 'Inside Out 2',
    singkatan_film: 'IO2',
    format_film: '2D SCOPE',
    format_sound: '7.1',
    status_tayang: 'SEDANG TAYANG',
    status_kdm: 'Aktif',
    keterangan: 'KDM Aktif sampai 20 Juli 2026.',
    created_at: '2026-07-05T10:00:00Z',
    updated_at: '2026-07-05T10:00:00Z'
  },
  {
    id: 'film-2',
    tanggal_terima: '08 Juli 2026',
    tanggal_ambil: '09 Juli 2026',
    judul_film: 'Deadpool & Wolverine',
    singkatan_film: 'D&W',
    format_film: 'IMAX',
    format_sound: '7.1 ATMOS',
    status_tayang: 'BELUM TAYANG',
    status_kdm: 'Aktif',
    keterangan: 'KDM Aktif per tanggal rilis 22 Juli.',
    created_at: '2026-07-08T14:30:00Z',
    updated_at: '2026-07-08T14:30:00Z'
  },
  {
    id: 'film-3',
    tanggal_terima: '01 Juli 2026',
    tanggal_ambil: '02 Juli 2026',
    judul_film: 'Despicable Me 4',
    singkatan_film: 'DM4',
    format_film: '3D',
    format_sound: '7.1 ATMOS',
    status_tayang: 'SUDAH TAYANG',
    status_kdm: 'Expired',
    keterangan: 'DCP dikembalikan ke distributor.',
    created_at: '2026-07-01T09:00:00Z',
    updated_at: '2026-07-10T18:00:00Z'
  },
  {
    id: 'film-4',
    tanggal_terima: '09 Juli 2026',
    tanggal_ambil: '10 Juli 2026',
    judul_film: 'Sekawan Limo',
    singkatan_film: 'SKL',
    format_film: '2D FLAT',
    format_sound: '5.1',
    status_tayang: 'SEDANG TAYANG',
    status_kdm: 'Aktif',
    keterangan: 'Sangat diminati penonton lokal.',
    created_at: '2026-07-09T11:00:00Z',
    updated_at: '2026-07-09T11:00:00Z'
  }
];

export interface BeritaAcaraDraft {
  id: string;
  nomorDokumen: string;
  tanggal: string;
  pemohon: string;
  departemen: string;
  htmlContent: string;
  images: { id: string; url: string; caption?: string; widthPercent?: number }[];
  updatedAt: string;
}

export type SopCategory =
  | 'Projector'
  | 'Audio System'
  | 'AC (Air Conditioner)'
  | 'Electrical'
  | 'Civil'
  | 'Networking'
  | 'IT'
  | 'Safety (K3)'
  | 'Engineering General'
  | 'Manual Book'
  | 'Wiring Diagram'
  | 'Troubleshooting'
  | 'Vendor Manual'
  | 'Software'
  | 'Lainnya';

export interface SopDocument {
  id: string;
  namaDokumen: string;
  kategori: SopCategory;
  deskripsi: string;
  versi: string;
  tanggalUpload: string;
  namaPengunggah: string;
  ukuranFile: string;
  formatFile: string;
  status: 'Aktif' | 'Arsip';
  googleDriveLink: string;
  googleDriveFileId: string;
  syncStatus: 'Synced' | 'Pending' | 'Error';
  isFavorite: boolean;
  tahun: string;
  catatan?: string;
}

export interface SopHistory {
  id: string;
  tanggal: string;
  waktu: string;
  namaAdmin: string;
  namaDokumen: string;
  versiLama: string;
  versiBaru: string;
  jenisPerubahan: 'Upload Dokumen' | 'Update Versi' | 'Edit Info' | 'Arsipkan' | 'Hapus';
}

export const INITIAL_SOP_DOCUMENTS: SopDocument[] = [];

export const INITIAL_SOP_HISTORY: SopHistory[] = [
  {
    id: 'hist-sop-1',
    tanggal: '12 Januari 2026',
    waktu: '14:20 WIB',
    namaAdmin: 'Chief Engineer XXI',
    namaDokumen: 'SOP Maintenance Routine Projector Barco DP4K-32B',
    versiLama: 'v2.0',
    versiBaru: 'v2.1',
    jenisPerubahan: 'Update Versi'
  },
  {
    id: 'hist-sop-2',
    tanggal: '20 Maret 2026',
    waktu: '09:15 WIB',
    namaAdmin: 'IT Engineering Support',
    namaDokumen: 'Troubleshooting Fast-Guide Network DCP & KDM Delivery',
    versiLama: '-',
    versiBaru: 'v1.5',
    jenisPerubahan: 'Upload Dokumen'
  }
];

export type KbCategory =
  | 'Projector'
  | 'Audio'
  | 'AC'
  | 'Electrical'
  | 'Civil'
  | 'Networking'
  | 'IT'
  | 'Safety'
  | 'Troubleshooting'
  | 'Tips & Trick'
  | 'Pengalaman Lapangan'
  | 'Maintenance'
  | 'Software'
  | 'Lainnya';

export interface TroubleshootingDetails {
  gejala: string;
  penyebab: string;
  langkahPemeriksaan: string;
  langkahPerbaikan: string;
  hasil: string;
  catatanTambahan?: string;
  tipsPencegahan?: string;
}

export interface KnowledgeArticle {
  id: string;
  judul: string;
  kategori: KbCategory;
  ringkasan: string;
  isiArtikel: string;
  penulis: string;
  tanggalDibuat: string;
  tanggalDiubah: string;
  tags: string[];
  status: 'Publish' | 'Draft';
  viewsCount: number;
  isFavorite: boolean;
  type: 'Troubleshooting' | 'Tips & Trick' | 'General';
  troubleshootingDetails?: TroubleshootingDetails;
}

export const INITIAL_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'kb-1',
    judul: 'Solusi Lampu Xenon Projector Barco Gagal Igniter Saat Switch On Studio 3',
    kategori: 'Projector',
    ringkasan: 'Langkah cepat penanganan saat lamp igniter Barco terdengar mengklik 3x namun lampu tidak menyala dan timbul alarm "Lamp Ignition Failed".',
    isiArtikel: `### Penanganan Lamp Ignition Error pada Projector Barco DP4K

Saat pemutaran film pertama di Studio 3, terjadi kendala lampu projector tidak bisa menyala. Indikator pada Barco Commander menunjukkan alarm **Lamp Ignition Failed**.

#### Gejala yang Teramati:
- Terdengar suara spark/kliking 3 kali dari rumah lampu.
- Tegangan power supply (LPS) terdeteksi normal 380V 3 Phase.
- Exhaust fan berputar pada RPM maksimal.

#### Penyebab Utama:
Oksidasi pada terminal anoda/katoda Xenon bulb serta kotornya kontaktor HV Trigger board akibat debu ruangan projection booth.

#### Solusi Lapangan:
1. Matikan breaker utama projector dan tunggu 15 menit hingga kapasitor terbuang aman.
2. Buka door housing lamp, gunakan amplas halus (grade 1000) untuk membersihkan kerak oksidasi pada konektor tembaga bulb.
3. Semprotkan Contact Cleaner pada soket HV Trigger.
4. Kencangkan baut terminal dengan kunci torque 4.5 Nm.
5. Nyalakan kembali projector — Lampu berhasil menyala stabil pada arus 125 Ampere.`,
    penulis: 'Senior Projector Tech XXI',
    tanggalDibuat: '18 Februari 2026',
    tanggalDiubah: '18 Februari 2026',
    tags: ['Barco', 'Projector', 'Lampu Xenon', 'Igniter', 'Studio 3'],
    status: 'Publish',
    viewsCount: 142,
    isFavorite: true,
    type: 'Troubleshooting',
    troubleshootingDetails: {
      gejala: 'Lampu projector tidak mau menyala, terdengar bunyi kliking 3 kali, timbul alarm "Lamp Ignition Failed" di Barco Commander.',
      penyebab: 'Oksidasi kontak terminal anoda/katoda lampu Xenon dan penumpukan debu halus pada High Voltage (HV) Trigger Board.',
      langkahPemeriksaan: 'Cek voltage LPS (380V), cek fisik terminal lampu dari kehitaman/oksidasi, periksa sakelar interlock pintu housing.',
      langkahPerbaikan: 'Bersihkan oksida terminal tembaga dengan amplas halus, semprot contact cleaner pada HV trigger, kencangkan baut pengikat terminal.',
      hasil: 'Lampu nyala normal seketika, arus terukur 125A stabil tanpa alarm berulang.',
      catatanTambahan: 'Gunakan sarung tangan K3 anti-statis saat memegang kaca bulb Xenon.',
      tipsPencegahan: 'Lakukan pembersihan terminal lampu setiap 250 jam operasional secara rutin.'
    }
  },
  {
    id: 'kb-2',
    judul: 'Tips & Trik Setting Cepat BGC (Bass Management) Dolby CP850 Tanpa Distorsi',
    kategori: 'Audio',
    ringkasan: 'Panduan teknis mempercepat kalibrasi subwoofer Atmos agar suara dentuman bas di Studio Premiere terasa mantap namun tetap bersih dari clipping.',
    isiArtikel: `### Trik Pengaturan Cepat Dolby CP850

Seringkali nada rendah (low frequency) terasa pecah atau 'boomy' saat adegan ledakan film action jika gain crossover tidak seimbang.

#### Langkah Efisien:
1. Buka Web GUI Dolby CP850 via IP lokal 192.168.1.100.
2. Masuk ke menu **Room EQ -> Bass Management**.
3. Set crossover subwoofer LFE pada **80 Hz High Pass / Low Pass 24dB/octave Linkwitz-Riley**.
4. Aktifkan **High Pass Filter 20 Hz** pada channel LFE untuk membuang frekuensi infrasonic yang membuat cone subwoofer meliar tanpa suara.
5. Lakukan check RTA menggunakan Pink Noise — hasil dentuman kini jauh lebih crisp & terarah!`,
    penulis: 'Chief Audio Specialist',
    tanggalDibuat: '02 Maret 2026',
    tanggalDiubah: '02 Maret 2026',
    tags: ['Dolby CP850', 'Audio', 'Bass Management', 'Subwoofer', 'Kalibrasi'],
    status: 'Publish',
    viewsCount: 98,
    isFavorite: true,
    type: 'Tips & Trick'
  },
  {
    id: 'kb-3',
    judul: 'Prosedur Respon Cepat Saat Chiller AC Mati Total Akibat Trip Overload LVMDP',
    kategori: 'AC',
    ringkasan: 'SOP darurat penanganan suhu studio naik mendadak karena breaker MCB Chiller York trip saat beban puncak sore hari.',
    isiArtikel: `### Langkah Darurat Pemulihan Chiller AC

Apabila suhu di Studio 1-6 terasa panas bersamaan, kemungkinan besar Chiller sentral mengalami Trip Overload.

#### Urutan Tindakan:
1. Jangan langsung meng-ON kan breaker yang trip!
2. Periksa panel LVMDP di lantai basement, catat nilai ampermeter pada Phase R-S-T.
3. Periksa temperatur air pendingin (Chilled Water In/Out) pada manometer Chiller York.
4. Reset fault alarm di Display Control Chiller dengan menekan tombol **STOP -> RESET -> AUTO**.
5. Nyalakan Chiller Pump 1 terlebih dahulu, tunggu aliran air stabil 2 menit, baru aktifkan Kompresor 1 & 2 secara bertahap.`,
    penulis: 'Supervisor HVAC XXI',
    tanggalDibuat: '10 Januari 2026',
    tanggalDiubah: '12 Januari 2026',
    tags: ['AC', 'Chiller York', 'Overload', 'LVMDP', 'Tanggap Darurat'],
    status: 'Publish',
    viewsCount: 185,
    isFavorite: false,
    type: 'Troubleshooting',
    troubleshootingDetails: {
      gejala: 'Suhu ruangan semua studio naik di atas 26°C secara bertahap, indikator Chiller off.',
      penyebab: 'Lonjakan arus akibat fluktuasi tegangan PLN saat puncak beban mal.',
      langkahPemeriksaan: 'Cek ampermeter LVMDP, periksa keterkaitan tekanan freon R410A.',
      langkahPerbaikan: 'Reset error di layar York, start pompa sirkulasi air chilled water, start kompresor bertahap.',
      hasil: 'Suhu kembali normal 20°C dalam waktu 20 menit.',
      catatanTambahan: 'Koordinasi dengan engineering mall jika tegangan masuk PLN di bawah 370V.',
      tipsPencegahan: 'Pastikan filter strainer air bersih dari lumut setiap bulan.'
    }
  },
  {
    id: 'kb-4',
    judul: 'Cara Mengatasi Error Transfer DCP "Space Allocation Failed" di Server TMS',
    kategori: 'IT',
    ringkasan: 'Metode aman membersihkan cache film lama yang sudah turun tayang tanpa merusak database ingest TMS XXI.',
    isiArtikel: `### Pembersihan Storage TMS Aman & Efisien

Saat menerima file film 4K berukuran >250GB, sering muncul pesan error **Space Allocation Failed** di TMS Server.

#### Solusi Aman:
1. Buka menu **DCP Manager -> Show Storage Usage**.
2. Filter film berdasarkan **Status Tayang: Expired / Off-Play**.
3. Pilih film lama, lakukan **Delete Content Only** (jangan delete KDM atau metadata).
4. Jalankan command **Purge Trash Buffer** untuk membebaskan inode disk.
5. Kapasitas HDD akan langsung lega kembali tanpa resiko hilangnya playlist jadwal tayang.`,
    penulis: 'IT Lead XXI Puri',
    tanggalDibuat: '25 Maret 2026',
    tanggalDiubah: '25 Maret 2026',
    tags: ['TMS', 'DCP', 'Storage', 'Server', 'IT'],
    status: 'Publish',
    viewsCount: 76,
    isFavorite: false,
    type: 'Tips & Trick'
  }
];

export type CctvCameraCategory = 'studio' | 'projector_room' | 'other';
export type CctvConnectionStatus = 'ONLINE' | 'CONNECTING' | 'OFFLINE' | 'NOT CONFIGURED';

export interface CctvCamera {
  id: string;
  name: string;
  location: string;
  category: CctvCameraCategory;
  channel: number;
  enabled: boolean;
  status: CctvConnectionStatus;
  ipAddress?: string;
  rtspUrl?: string;
  hlsUrl?: string;
  webRtcUrl?: string;
  lastActive?: string;
  fps?: number;
  resolution?: string;
}

export interface CctvNvrConfig {
  ip: string;
  subnet: string;
  gateway: string;
  httpPort: number;
  mediaPort: number;
  gatewayBackendUrl?: string;
  isOnline: boolean;
}

export const INITIAL_NVR_CONFIG: CctvNvrConfig = {
  ip: '10.101.47.231',
  subnet: '255.255.255.0',
  gateway: '10.101.47.151',
  httpPort: 80,
  mediaPort: 34567,
  gatewayBackendUrl: '',
  isOnline: true
};

export const INITIAL_CCTV_CAMERAS: CctvCamera[] = [
  // 8 Studio Cameras
  {
    id: 'cam-st-1',
    name: 'CCTV Studio 1 - Theater View',
    location: 'Studio 1 (Auditorium)',
    category: 'studio',
    channel: 1,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Stream Streamer)'
  },
  {
    id: 'cam-st-2',
    name: 'CCTV Studio 2 - Theater View',
    location: 'Studio 2 (Auditorium)',
    category: 'studio',
    channel: 2,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-st-3',
    name: 'CCTV Studio 3 - Theater View',
    location: 'Studio 3 (Auditorium)',
    category: 'studio',
    channel: 3,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-st-4',
    name: 'CCTV Studio 4 - Theater View',
    location: 'Studio 4 (Auditorium)',
    category: 'studio',
    channel: 4,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-st-5',
    name: 'CCTV Studio 5 - Theater View',
    location: 'Studio 5 (Auditorium)',
    category: 'studio',
    channel: 5,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-st-6',
    name: 'CCTV Studio 6 - Theater View',
    location: 'Studio 6 (Auditorium)',
    category: 'studio',
    channel: 6,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-st-7',
    name: 'CCTV Studio 7 - Theater View',
    location: 'Studio 7 (Auditorium)',
    category: 'studio',
    channel: 7,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-st-8',
    name: 'CCTV Studio 8 - Premiere Theater',
    location: 'Studio 8 (Premiere)',
    category: 'studio',
    channel: 8,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  // 8 Projector Room Cameras
  {
    id: 'cam-pr-1',
    name: 'CCTV Booth Projector 1 - Barco DP4K',
    location: 'Projector Room Studio 1',
    category: 'projector_room',
    channel: 9,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-pr-2',
    name: 'CCTV Booth Projector 2 - Barco DP4K',
    location: 'Projector Room Studio 2',
    category: 'projector_room',
    channel: 10,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-pr-3',
    name: 'CCTV Booth Projector 3 - Christie Laser',
    location: 'Projector Room Studio 3',
    category: 'projector_room',
    channel: 11,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-pr-4',
    name: 'CCTV Booth Projector 4 - Barco DP4K',
    location: 'Projector Room Studio 4',
    category: 'projector_room',
    channel: 12,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-pr-5',
    name: 'CCTV Booth Projector 5 - Barco DP2K',
    location: 'Projector Room Studio 5',
    category: 'projector_room',
    channel: 13,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-pr-6',
    name: 'CCTV Booth Projector 6 - Christie Laser',
    location: 'Projector Room Studio 6',
    category: 'projector_room',
    channel: 14,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-pr-7',
    name: 'CCTV Booth Projector 7 - Barco DP4K',
    location: 'Projector Room Studio 7',
    category: 'projector_room',
    channel: 15,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  },
  {
    id: 'cam-pr-8',
    name: 'CCTV Booth Projector 8 - Barco Laser Premiere',
    location: 'Projector Room Studio 8 (Premiere)',
    category: 'projector_room',
    channel: 16,
    enabled: true,
    status: 'ONLINE',
    ipAddress: '10.101.47.231',
    fps: 25,
    resolution: '1920x1080 60Hz',
    lastActive: 'Aktif (Live Streamer)'
  }
];

export interface EngineeringNote {
  id: string;
  judul: string;
  kategori: string;
  prioritas: 'Biasa' | 'Penting' | 'Khusus / Emergency';
  isi: string;
  penulis: string;
  tanggal: string;
  isPinned?: boolean;
  linkedSopId?: string;
  tags?: string[];
}

export const INITIAL_ENGINEERING_NOTES: EngineeringNote[] = [];

// --- IP & CREDENTIAL MANAGER TYPES ---
export interface IpCredential {
  id: string;
  nickname: string; // e.g. Administrator, Operator, Technician, Maintenance
  username: string; // e.g. admin, operator
  password: string; // e.g. XXI@2026!
  role?: string;    // e.g. Full Access, Read-Only, Maintenance
  notes?: string;
}

export interface IpDevice {
  id: string;
  deviceName: string;        // e.g. Projector Barco Studio 1
  nickname?: string;          // e.g. PROJ-S1
  category: string;           // Projector, IMS, Audio Processor, Amplifier, Dimmer, ACT, POS, Router, etc.
  area: string;               // Studio, Loket / POS, Server & Network, Office, Engineering, Other
  location: string;           // Studio 1, Loket 1, Server Room, etc.
  description?: string;

  ipAddress?: string;         // e.g. 192.168.10.101
  port?: string;              // e.g. 80, 8080
  webInterfaceUrl?: string;   // e.g. http://192.168.10.101:8080
  networkNotes?: string;

  credentials: IpCredential[];

  createdAt?: string;
  updatedAt?: string;
}

export const INITIAL_IP_AREAS: string[] = [
  'CINEMA',
  'CAFE',
  'PREMIERE',
  'MULA MULA'
];

export const INITIAL_IP_CATEGORIES: string[] = [
  'LMS / AAM',
  'NEXGENT',
  'PC SERVER',
  'BACKUP SERVER',
  'WIFI',
  'PROCESSOR SOUND',
  'DIMMER',
  'BAR STATION',
  'COOK STATION',
  'NVR CCTV',
  'PROJECTOR',
  'IMS',
  'NAS',
  'AMPLIFIER',
  'AUTOMATION',
  'POS',
  'ROUTER',
  'SWITCH',
  'PRINTER',
  'PERANGKAT LAINNYA'
];

export const INITIAL_IP_DEVICES: IpDevice[] = [
  {
    id: 'dev-proj-s1',
    deviceName: 'Projector Barco DP4K-19B',
    nickname: 'PROJ-S1',
    category: 'PROJECTOR',
    area: 'CINEMA',
    location: 'Studio 1',
    description: 'Projector Utama Studio 1 (Barco Digital Cinema)',
    ipAddress: '192.168.10.101',
    port: '8080',
    webInterfaceUrl: 'http://192.168.10.101:8080',
    networkNotes: 'VLAN 10 Cinema Equipment',
    credentials: [
      {
        id: 'cred-1-1',
        nickname: 'Administrator',
        username: 'admin',
        password: 'BarcoAdmin2026!',
        role: 'Full Access',
        notes: 'Akses penuh konfig lampu & lensa'
      },
      {
        id: 'cred-1-2',
        nickname: 'Operator / Show Runner',
        username: 'operator',
        password: 'OperatorStudio1',
        role: 'Operator',
        notes: 'Akses pementasan harian'
      }
    ],
    createdAt: '01 Juli 2026, 09:00',
    updatedAt: '06 Agustus 2026, 10:15'
  },
  {
    id: 'dev-ims-s1',
    deviceName: 'Dolby IMS3000 Server',
    nickname: 'IMS-S1',
    category: 'IMS',
    area: 'CINEMA',
    location: 'Studio 1',
    description: 'Integrated Media Server Studio 1',
    ipAddress: '192.168.10.102',
    port: '80',
    webInterfaceUrl: 'http://192.168.10.102',
    networkNotes: 'Terhubung ke LMS Utama XXI',
    credentials: [
      {
        id: 'cred-2-1',
        nickname: 'Master Root',
        username: 'dolbyadmin',
        password: 'DolbyXXI@Master2026',
        role: 'Administrator',
        notes: 'Ingest KDM & SPL'
      }
    ],
    createdAt: '01 Juli 2026, 09:10',
    updatedAt: '05 Agustus 2026, 14:20'
  },
  {
    id: 'dev-audio-s1',
    deviceName: 'CP750 Dolby Audio Processor',
    nickname: 'AUDIO-S1',
    category: 'PROCESSOR SOUND',
    area: 'PREMIERE',
    location: 'Studio 1',
    description: 'Processor Suara Cinema Studio 1',
    ipAddress: '192.168.10.103',
    port: '80',
    webInterfaceUrl: 'http://192.168.10.103',
    networkNotes: 'Ethernet Direct',
    credentials: [
      {
        id: 'cred-3-1',
        nickname: 'Technician',
        username: 'tech',
        password: 'DolbyCP750Pass',
        role: 'Maintenance',
        notes: 'Equalizer & EQ Preset'
      }
    ],
    createdAt: '01 Juli 2026, 09:15',
    updatedAt: '04 Agustus 2026, 11:00'
  },
  {
    id: 'dev-lms-main',
    deviceName: 'GDC LMS Server Master',
    nickname: 'LMS-SERVER',
    category: 'LMS / AAM',
    area: 'MULA MULA',
    location: 'Server Room Main',
    description: 'Library Management System Pusat XXI Lippo Mall Puri',
    ipAddress: '192.168.1.50',
    port: '443',
    webInterfaceUrl: 'https://192.168.1.50',
    networkNotes: 'Server Terpusat Pengiriman Film',
    credentials: [
      {
        id: 'cred-4-1',
        nickname: 'Super Admin',
        username: 'gdcadmin',
        password: 'LmsPuriMaster#2026',
        role: 'Super Admin',
        notes: 'Akses Distribusi Konten Film'
      }
    ],
    createdAt: '01 Juli 2026, 08:00',
    updatedAt: '06 Agustus 2026, 08:30'
  },
  {
    id: 'dev-pos-1',
    deviceName: 'PC Loket XXI #1',
    nickname: 'LOKET-PC1',
    category: 'POS',
    area: 'CAFE',
    location: 'Loket 1',
    description: 'PC Kasir Penjualan Tiket Studio & F&B',
    ipAddress: '192.168.20.11',
    port: '3389',
    networkNotes: 'Static IP POS Subnet',
    credentials: [
      {
        id: 'cred-5-1',
        nickname: 'Kasir Shift 1',
        username: 'posuser1',
        password: 'LoketXXI123!',
        role: 'Operator POS',
        notes: 'Login Aplikasi Ticketing'
      }
    ],
    createdAt: '02 Juli 2026, 10:00',
    updatedAt: '03 Agustus 2026, 16:45'
  }
];

export type HistoryCategory = 'PROJECTOR' | 'SERVER' | 'SOUND SYSTEM' | 'LAIN-LAIN';

export interface ReportHistoryItem {
  id: string;
  no?: number;
  tanggal: string; // YYYY-MM-DD or DD/MM/YYYY
  studio: string; // e.g. "STUDIO 1", "STUDIO 2", etc.
  kategori: HistoryCategory;
  unitPart: string; // e.g. "Barco SP35B 4K"
  keterangan: string; // e.g. "GANTI PROJ BARCO SP 35B 4K"
  parafTeknisi: string; // e.g. "Ngatemin (Pak Min)"
  parafTeamlead: string; // e.g. "Andri (Pasbro)"
  parafManager: string; // e.g. "Manager XXI"
  createdAt?: string;
  updatedAt?: string;
}

export const INITIAL_REPORT_HISTORIES: ReportHistoryItem[] = [
  {
    id: 'rh-1',
    no: 1,
    tanggal: '2025-05-28',
    studio: 'STUDIO 1',
    kategori: 'PROJECTOR',
    unitPart: 'Barco SP 35B 4K',
    keterangan: 'GANTI PROJ BARCO SP 35B 4K',
    parafTeknisi: 'Ngatemin (Pak Min)',
    parafTeamlead: 'Andri (Pasbro)',
    parafManager: 'Manager XXI',
    createdAt: '2025-05-28T10:00:00Z',
    updatedAt: '2025-05-28T10:00:00Z'
  },
  {
    id: 'rh-2',
    no: 2,
    tanggal: '2025-06-18',
    studio: 'STUDIO 1',
    kategori: 'LAIN-LAIN',
    unitPart: 'Panel Lampu Dimer',
    keterangan: 'GANTI PANEL LAMPU DIMER',
    parafTeknisi: 'Ngatemin (Pak Min)',
    parafTeamlead: 'Andri (Pasbro)',
    parafManager: 'Manager XXI',
    createdAt: '2025-06-18T11:00:00Z',
    updatedAt: '2025-06-18T11:00:00Z'
  },
  {
    id: 'rh-3',
    no: 3,
    tanggal: '2025-07-14',
    studio: 'STUDIO 1',
    kategori: 'PROJECTOR',
    unitPart: 'Convergent + Scanplug',
    keterangan: 'CONVERTGENT + SCANPLUG',
    parafTeknisi: 'Ngatemin (Pak Min)',
    parafTeamlead: 'Andri (Pasbro)',
    parafManager: 'Manager XXI',
    createdAt: '2025-07-14T09:30:00Z',
    updatedAt: '2025-07-14T09:30:00Z'
  },
  {
    id: 'rh-4',
    no: 4,
    tanggal: '2025-08-24',
    studio: 'STUDIO 1',
    kategori: 'SOUND SYSTEM',
    unitPart: 'Speaker Low 1030',
    keterangan: 'GANTI SPEAKER LOW 1030',
    parafTeknisi: 'Ngatemin (Pak Min)',
    parafTeamlead: 'Andri (Pasbro)',
    parafManager: 'Manager XXI',
    createdAt: '2025-08-24T14:15:00Z',
    updatedAt: '2025-08-24T14:15:00Z'
  },
  {
    id: 'rh-5',
    no: 5,
    tanggal: '2025-06-18',
    studio: 'STUDIO 1',
    kategori: 'LAIN-LAIN',
    unitPart: 'Panel Lampu Dimer',
    keterangan: 'GANTI PANEL LAMPU DIMER',
    parafTeknisi: 'Ngatemin (Pak Min)',
    parafTeamlead: 'Andri (Pasbro)',
    parafManager: 'Manager XXI',
    createdAt: '2025-06-18T15:00:00Z',
    updatedAt: '2025-06-18T15:00:00Z'
  },
  {
    id: 'rh-6',
    no: 6,
    tanggal: '2026-03-12',
    studio: 'STUDIO 1',
    kategori: 'SERVER',
    unitPart: 'Flash Card IMS',
    keterangan: 'GANTI FLASH CARD',
    parafTeknisi: 'Ngatemin (Pak Min)',
    parafTeamlead: 'Andri (Pasbro)',
    parafManager: 'Manager XXI',
    createdAt: '2026-03-12T08:45:00Z',
    updatedAt: '2026-03-12T08:45:00Z'
  },
  {
    id: 'rh-7',
    no: 1,
    tanggal: '2026-02-10',
    studio: 'STUDIO 2',
    kategori: 'PROJECTOR',
    unitPart: 'Lampu Xenon 4.5kW',
    keterangan: 'GANTI LAMPU XENON PROJECTOR BERKALA',
    parafTeknisi: 'Ngatemin (Pak Min)',
    parafTeamlead: 'Andri (Pasbro)',
    parafManager: 'Manager XXI',
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-02-10T10:00:00Z'
  },
  {
    id: 'rh-8',
    no: 1,
    tanggal: '2026-01-15',
    studio: 'STUDIO 3',
    kategori: 'SOUND SYSTEM',
    unitPart: 'Crossover Dolby CP850',
    keterangan: 'KALIBRASI & GANTI FUSE CROSSOVER AUDIO',
    parafTeknisi: 'Ngatemin (Pak Min)',
    parafTeamlead: 'Andri (Pasbro)',
    parafManager: 'Manager XXI',
    createdAt: '2026-01-15T11:00:00Z',
    updatedAt: '2026-01-15T11:00:00Z'
  }
];





