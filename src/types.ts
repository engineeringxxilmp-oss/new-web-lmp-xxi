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

export type PrCategory = 'PR OPR' | 'PR AC' | 'PR TEKNIK' | 'PR Projector' | 'PR Building' | 'PR Studio' | 'PR Engineering';
export type PrStatus = 'Belum Dikerjakan' | 'Sedang Diproses' | 'Selesai' | 'Belum Di Kerjakan' | 'Sedang Di Proses';

export interface PrEngineering {
  id: string;
  category: PrCategory;
  areaId: string; // References Area.id
  equipmentId?: string; // Optional reference to Equipment.id
  keluhan: string;
  tanggalPenemuan: string; // format: "10 Juli 2026"
  tanggalSelesai: string; // format: "10 Juli 2026" atau ""
  status: PrStatus;
  keterangan: string;
}

export type VendorCategory = 'SERVICE TEKNIK' | 'SERVICE AC' | 'SERVICE OPR';
export type VendorStatus = 'Belum' | 'On Progress' | 'Selesai' | 'Belum Di Kerjakan' | 'Sedang Di Proses' | 'Belum Dikerjakan' | 'Sedang Diproses';

export interface VendorTeknisi {
  id: string;
  category?: VendorCategory;
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

export interface ServerConfigItem {
  id: string;
  name: string;
  capacityTb: string;
}

export const DEFAULT_SERVER_CONFIGS: ServerConfigItem[] = [
  { id: 'srv-std1', name: 'Studio 1', capacityTb: '1.8 TB' },
  { id: 'srv-std2', name: 'Studio 2', capacityTb: '1.8 TB' },
  { id: 'srv-std3', name: 'Studio 3', capacityTb: '3.7 TB' },
  { id: 'srv-std4', name: 'Studio 4', capacityTb: '10.7 TB' },
  { id: 'srv-std5', name: 'Studio 5', capacityTb: '1.8 TB' },
  { id: 'srv-std6', name: 'Studio 6', capacityTb: '3.5 TB' },
  { id: 'srv-std7', name: 'Studio 7', capacityTb: '3.7 TB' },
  { id: 'srv-std8', name: 'Studio 8', capacityTb: '1.8 TB' },
  { id: 'srv-prem1', name: 'Premiere 1', capacityTb: '1.8 TB' },
  { id: 'srv-prem2', name: 'Premiere 2', capacityTb: '7.3 TB' },
  { id: 'srv-library', name: 'Library / AHM', capacityTb: '18.5 TB' }
];

export interface BalasanManagerItem {
  id: string;
  periode: string;
  fileUrl?: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  uploadedAt?: string;
  tanggalUpload?: string;
  fileData?: string;
  catatan?: string;
  catatanManager?: string;
  driveLink?: string;
  driveSynced?: boolean;
  namaManager?: string;
  tanggalKeputusan?: string;
  filmDihapus?: string;
  filmDipertahankan?: string;
  status: 'Sudah Dibalas' | 'Menunggu Balasan';
}

export interface JadwalFilmItem {
  id: string;
  tanggalJadwal?: string;
  tanggal?: string;
  imageUrl?: string;
  gambarJadwal?: string;
  studio?: string;
  detectedTitles?: string[];
  judulTerdeteksi?: string[];
  matchedFilmTitles?: string[];
  unmatchedFilmTitles?: string[];
  uploadedAt?: string;
  driveLink?: string;
  driveSynced?: boolean;
  catatan?: string;
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

export type FormatFilm = '2D Scoop' | '2D Flat' | '3D Scoop' | '3D Flat' | '2D FLAT' | '2D SCOPE' | '3D' | 'IMAX' | 'ATMOS' | string;
export type FormatSound = '5.1' | '7.1' | 'Atmos' | '7.1 ATMOS' | string;
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
  studio?: string;
  tanggal_kdm?: string;
  tahun?: string;
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

// Initial Mock Data (Empty for fresh start - will be populated by user)
export const INITIAL_AREAS: Area[] = [];

export const INITIAL_EQUIPMENT: Equipment[] = [];

export const INITIAL_PR_ENGINEERING: PrEngineering[] = [];

export const INITIAL_VENDORS: VendorTeknisi[] = [];

export const INITIAL_ORDERS: OrderBarang[] = [];

export const INITIAL_BARANG_DATANG: BarangDatang[] = [];

export const INITIAL_RIWAYAT: RiwayatEquipment[] = [];

export const DEFAULT_BRANDING: SystemBranding = {
  logoUrl: '',
  title: 'CINEMA XXI',
  subtitle: 'LIPPO MALL PURI',
  font: 'Inter',
  headerBg: 'gradient-dark',
  illustration: 'Anime-Slideshow'
};

export const INITIAL_FILM_UPLOAD: FilmUpload[] = [];

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

export const INITIAL_SOP_HISTORY: SopHistory[] = [];

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

export const INITIAL_IP_AREAS: string[] = [];

export const INITIAL_IP_CATEGORIES: string[] = [];

export const INITIAL_IP_DEVICES: IpDevice[] = [];

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

export const INITIAL_REPORT_HISTORIES: ReportHistoryItem[] = [];

export type JenisCutiType =
  | 'Cuti Tahunan'
  | 'Menikah'
  | 'Menikahkan Anak'
  | 'Khitanan Anak'
  | 'Baptisan Anak'
  | 'Istri Melahirkan / Keguguran'
  | 'Suami/Istri, Orangtua/Mertua atau Menantu Meninggal'
  | 'Anggota keluarga dalam 1 rumah meninggal dunia';

export interface FormCutiData {
  id: string;
  // I. DATA PEGAWAI
  nama: string;
  divisi: string;
  jabatan: string;
  nik: string;
  noHp: string;

  // II. RENCANA CUTI
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  jumlahHari: number;

  // III. BEKERJA KEMBALI
  tanggalKembali: string; // YYYY-MM-DD

  // IV. JENIS CUTI
  jenisCuti: JenisCutiType | string;

  // V. ALASAN CUTI
  alasanCuti: string;

  // VI. PEJABAT PENGGANTI SELAMA CUTI
  penggantiNama: string;
  penggantiNoHp: string;

  // VII. BAGIAN PARAF / PERSETUJUAN
  diajukanOlehNama: string;
  diajukanOlehJabatan: string;
  diajukanOlehTanggal: string;

  disetujuiOlehNama: string;
  disetujuiOlehJabatan: string;
  disetujuiOlehTanggal: string;

  mengetahuiNama: string;
  mengetahuiJabatan: string;
  mengetahuiTanggal: string;

  // VIII. HUMAN CAPITAL (1. DATA CUTI & 2. HASIL VERIFIKASI DATA CUTI KARYAWAN)
  hcHakCutiTahun: string;
  hcHakCutiHari: string;
  hcCutiTelahDiambil: string;
  hcCutiAkanDiambil: string;
  hcIzin?: string;
  hcAlpa?: string;
  hcSakit?: string;
  hcSisaCuti: string;
  hcStatusVerifikasi?: 'Dapat Diproses' | 'Tidak Dapat Diproses' | '';
  hcCatatan: string;
  hcParafNama: string;
  hcParafTanggal: string;

  createdAt: string;
  updatedAt: string;
}





