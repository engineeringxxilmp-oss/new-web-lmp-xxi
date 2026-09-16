/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Area,
  Equipment,
  PrEngineering,
  VendorTeknisi,
  OrderBarang,
  BarangDatang,
  RiwayatEquipment,
  SystemBranding,
  FilmUpload,
  WeeklyReport,
  BeritaAcaraDraft,
  IpDevice,
  ReportHistoryItem,
  INITIAL_AREAS,
  INITIAL_EQUIPMENT,
  INITIAL_PR_ENGINEERING,
  INITIAL_VENDORS,
  INITIAL_ORDERS,
  INITIAL_BARANG_DATANG,
  INITIAL_RIWAYAT,
  INITIAL_FILM_UPLOAD,
  INITIAL_IP_AREAS,
  INITIAL_IP_CATEGORIES,
  INITIAL_IP_DEVICES,
  INITIAL_REPORT_HISTORIES,
  DEFAULT_BRANDING
} from '../types';

type Listener = () => void;

class LocalDatabase {
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.init();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith('xxi_')) {
          this.notify();
        }
      });
    }
  }

  private init() {
    if (!localStorage.getItem('xxi_areas')) {
      localStorage.setItem('xxi_areas', JSON.stringify(INITIAL_AREAS));
    }
    if (!localStorage.getItem('xxi_equipment')) {
      localStorage.setItem('xxi_equipment', JSON.stringify(INITIAL_EQUIPMENT));
    }
    if (!localStorage.getItem('xxi_pr_engineering')) {
      localStorage.setItem('xxi_pr_engineering', JSON.stringify(INITIAL_PR_ENGINEERING));
    }
    if (!localStorage.getItem('xxi_vendors')) {
      localStorage.setItem('xxi_vendors', JSON.stringify(INITIAL_VENDORS));
    }
    if (!localStorage.getItem('xxi_orders')) {
      localStorage.setItem('xxi_orders', JSON.stringify(INITIAL_ORDERS));
    }
    if (!localStorage.getItem('xxi_barang_datang')) {
      localStorage.setItem('xxi_barang_datang', JSON.stringify(INITIAL_BARANG_DATANG));
    }
    if (!localStorage.getItem('xxi_riwayat')) {
      localStorage.setItem('xxi_riwayat', JSON.stringify(INITIAL_RIWAYAT));
    }
    if (!localStorage.getItem('xxi_film_upload')) {
      localStorage.setItem('xxi_film_upload', JSON.stringify(INITIAL_FILM_UPLOAD));
    }
    if (!localStorage.getItem('xxi_weekly_reports')) {
      localStorage.setItem('xxi_weekly_reports', JSON.stringify([]));
    }
    if (!localStorage.getItem('xxi_ip_devices')) {
      localStorage.setItem('xxi_ip_devices', JSON.stringify(INITIAL_IP_DEVICES));
    }
    if (!localStorage.getItem('xxi_ip_areas')) {
      localStorage.setItem('xxi_ip_areas', JSON.stringify(INITIAL_IP_AREAS));
    }
    if (!localStorage.getItem('xxi_ip_categories')) {
      localStorage.setItem('xxi_ip_categories', JSON.stringify(INITIAL_IP_CATEGORIES));
    }
    if (!localStorage.getItem('xxi_report_history')) {
      localStorage.setItem('xxi_report_history', JSON.stringify(INITIAL_REPORT_HISTORIES));
    }
    const currentBrandingStr = localStorage.getItem('xxi_branding');
    if (currentBrandingStr) {
      try {
        JSON.parse(currentBrandingStr);
      } catch (e) {
        localStorage.setItem('xxi_branding', JSON.stringify(DEFAULT_BRANDING));
      }
    } else {
      localStorage.setItem('xxi_branding', JSON.stringify(DEFAULT_BRANDING));
    }
  }

  // Real-time listener registration
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- GENERAL STORAGE HELPER ---
  private get<T>(key: string): T {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [] as any;
  }

  private set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
    this.notify();
  }

  // --- AREAS CRUD ---
  getAreas(): Area[] {
    return this.get<Area[]>('xxi_areas');
  }

  saveArea(area: Area): void {
    const areas = this.getAreas();
    const index = areas.findIndex((a) => a.id === area.id);
    if (index > -1) {
      areas[index] = area;
    } else {
      areas.push(area);
    }
    this.set('xxi_areas', areas);
  }

  deleteArea(id: string): void {
    const areas = this.getAreas().filter((a) => a.id !== id);
    this.set('xxi_areas', areas);

    // Relational cascade cleanup or safe state is handled in components
  }

  // --- EQUIPMENT CRUD ---
  getEquipment(): Equipment[] {
    return this.get<Equipment[]>('xxi_equipment');
  }

  saveEquipment(eq: Equipment): void {
    const list = this.getEquipment();
    const index = list.findIndex((item) => item.id === eq.id);
    if (index > -1) {
      list[index] = eq;
    } else {
      list.push(eq);
    }
    this.set('xxi_equipment', list);
  }

  deleteEquipment(id: string): void {
    const list = this.getEquipment().filter((item) => item.id !== id);
    this.set('xxi_equipment', list);
  }

  // --- PR ENGINEERING CRUD ---
  getPrEngineering(): PrEngineering[] {
    return this.get<PrEngineering[]>('xxi_pr_engineering');
  }

  savePrEngineering(pr: PrEngineering): void {
    const list = this.getPrEngineering();
    const index = list.findIndex((item) => item.id === pr.id);
    if (index > -1) {
      list[index] = pr;
    } else {
      list.push(pr);
    }
    this.set('xxi_pr_engineering', list);
  }

  deletePrEngineering(id: string): void {
    const list = this.getPrEngineering().filter((item) => item.id !== id);
    this.set('xxi_pr_engineering', list);
  }

  // --- VENDORS CRUD ---
  getVendors(): VendorTeknisi[] {
    return this.get<VendorTeknisi[]>('xxi_vendors');
  }

  saveVendor(vendor: VendorTeknisi): void {
    const list = this.getVendors();
    const index = list.findIndex((item) => item.id === vendor.id);
    if (index > -1) {
      list[index] = vendor;
    } else {
      list.push(vendor);
    }
    this.set('xxi_vendors', list);
  }

  deleteVendor(id: string): void {
    const list = this.getVendors().filter((item) => item.id !== id);
    this.set('xxi_vendors', list);
  }

  // --- ORDER BARANG CRUD ---
  getOrders(): OrderBarang[] {
    return this.get<OrderBarang[]>('xxi_orders');
  }

  saveOrder(order: OrderBarang): void {
    const list = this.getOrders();
    const index = list.findIndex((item) => item.id === order.id);
    if (index > -1) {
      list[index] = order;
    } else {
      list.push(order);
    }
    this.set('xxi_orders', list);
  }

  deleteOrder(id: string): void {
    const list = this.getOrders().filter((item) => item.id !== id);
    this.set('xxi_orders', list);
  }

  receiveOrder(orderId: string, barang: BarangDatang): void {
    const orders = this.getOrders().filter((item) => item.id !== orderId);
    localStorage.setItem('xxi_orders', JSON.stringify(orders));

    const barangList = this.getBarangDatang();
    const index = barangList.findIndex((item) => item.id === barang.id);
    if (index > -1) {
      barangList[index] = barang;
    } else {
      barangList.unshift(barang);
    }
    localStorage.setItem('xxi_barang_datang', JSON.stringify(barangList));
    this.notify();
  }

  // --- BARANG DATANG CRUD ---
  getBarangDatang(): BarangDatang[] {
    return this.get<BarangDatang[]>('xxi_barang_datang');
  }

  saveBarangDatang(barang: BarangDatang): void {
    const list = this.getBarangDatang();
    const index = list.findIndex((item) => item.id === barang.id);
    if (index > -1) {
      list[index] = barang;
    } else {
      list.push(barang);
    }
    this.set('xxi_barang_datang', list);
  }

  deleteBarangDatang(id: string): void {
    const list = this.getBarangDatang().filter((item) => item.id !== id);
    this.set('xxi_barang_datang', list);
  }

  // --- RIWAYAT CRUD ---
  getRiwayat(): RiwayatEquipment[] {
    return this.get<RiwayatEquipment[]>('xxi_riwayat');
  }

  saveRiwayat(r: RiwayatEquipment): void {
    const list = this.getRiwayat();
    const index = list.findIndex((item) => item.id === r.id);
    if (index > -1) {
      list[index] = r;
    } else {
      list.push(r);
    }
    this.set('xxi_riwayat', list);
  }

  deleteRiwayat(id: string): void {
    const list = this.getRiwayat().filter((item) => item.id !== id);
    this.set('xxi_riwayat', list);
  }

  // --- FILM UPLOAD CRUD ---
  getFilmUploads(): FilmUpload[] {
    return this.get<FilmUpload[]>('xxi_film_upload');
  }

  saveFilmUpload(film: FilmUpload): void {
    const list = this.getFilmUploads();
    const index = list.findIndex((item) => item.id === film.id);
    if (index > -1) {
      list[index] = { ...film, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...film, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    this.set('xxi_film_upload', list);
  }

  deleteFilmUpload(id: string): void {
    const list = this.getFilmUploads().filter((item) => item.id !== id);
    this.set('xxi_film_upload', list);
  }

  // --- WEEKLY REPORTS CRUD ---
  getWeeklyReports(): WeeklyReport[] {
    const reports = this.get<WeeklyReport[]>('xxi_weekly_reports') || [];
    // Deduplicate by period, keeping the last one
    const uniqueMap = new Map<string, WeeklyReport>();
    reports.forEach(r => {
      if (r && r.periode) {
        uniqueMap.set(r.periode, r);
      }
    });
    return Array.from(uniqueMap.values());
  }

  saveWeeklyReport(report: WeeklyReport): void {
    const list = this.getWeeklyReports();
    const index = list.findIndex((item) => item.id === report.id || item.periode === report.periode);
    if (index > -1) {
      list[index] = { ...report, id: list[index].id };
    } else {
      list.push(report);
    }
    this.set('xxi_weekly_reports', list);
  }

  deleteWeeklyReport(id: string): void {
    const list = this.getWeeklyReports().filter((item) => item.id !== id);
    this.set('xxi_weekly_reports', list);
  }

  // --- BERITA ACARA PERMINTAAN BARANG DRAFT CRUD ---
  getBeritaAcaraDraft(): BeritaAcaraDraft | null {
    const data = localStorage.getItem('xxi_berita_acara_draft');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  saveBeritaAcaraDraft(draft: BeritaAcaraDraft): void {
    localStorage.setItem('xxi_berita_acara_draft', JSON.stringify(draft));
    this.notify();
  }

  // --- BRANDING CRUD ---
  getBranding(): SystemBranding {
    const b = localStorage.getItem('xxi_branding');
    return b ? JSON.parse(b) : DEFAULT_BRANDING;
  }

  saveBranding(branding: SystemBranding): void {
    localStorage.setItem('xxi_branding', JSON.stringify(branding));
    this.notify();
  }

  // --- IP & CREDENTIAL MANAGER CRUD ---
  getIpDevices(): IpDevice[] {
    return this.get<IpDevice[]>('xxi_ip_devices');
  }

  saveIpDevice(device: IpDevice): void {
    const list = this.getIpDevices();
    const index = list.findIndex((item) => item.id === device.id);
    if (index > -1) {
      list[index] = device;
    } else {
      list.push(device);
    }
    this.set('xxi_ip_devices', list);
  }

  deleteIpDevice(id: string): void {
    const list = this.getIpDevices().filter((item) => item.id !== id);
    this.set('xxi_ip_devices', list);
  }

  getIpAreas(): string[] {
    const list = this.get<string[]>('xxi_ip_areas');
    if (!list || list.length === 0 || !list.includes('CINEMA')) {
      this.set('xxi_ip_areas', INITIAL_IP_AREAS);
      return INITIAL_IP_AREAS;
    }
    return list;
  }

  saveIpArea(areaName: string): void {
    const name = areaName.trim().toUpperCase();
    const list = this.getIpAreas();
    if (!list.includes(name)) {
      list.push(name);
      this.set('xxi_ip_areas', list);
    }
  }

  deleteIpArea(areaName: string): void {
    const list = this.getIpAreas().filter((a) => a !== areaName);
    this.set('xxi_ip_areas', list);
  }

  getIpCategories(): string[] {
    const list = this.get<string[]>('xxi_ip_categories');
    if (!list || list.length === 0 || !list.includes('NEXGENT')) {
      this.set('xxi_ip_categories', INITIAL_IP_CATEGORIES);
      return INITIAL_IP_CATEGORIES;
    }
    return list;
  }

  saveIpCategory(catName: string): void {
    const name = catName.trim().toUpperCase();
    const list = this.getIpCategories();
    if (!list.includes(name)) {
      list.push(name);
      this.set('xxi_ip_categories', list);
    }
  }

  deleteIpCategory(catName: string): void {
    const list = this.getIpCategories().filter((c) => c !== catName);
    this.set('xxi_ip_categories', list);
  }

  // --- REPORT HISTORY CRUD ---
  getReportHistories(): ReportHistoryItem[] {
    return this.get<ReportHistoryItem[]>('xxi_report_history');
  }

  saveReportHistory(item: ReportHistoryItem): void {
    const list = this.getReportHistories();
    const index = list.findIndex((h) => h.id === item.id);
    if (index > -1) {
      list[index] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set('xxi_report_history', list);
  }

  deleteReportHistory(id: string): void {
    const list = this.getReportHistories().filter((h) => h.id !== id);
    this.set('xxi_report_history', list);
  }

  // --- BACKUP & RESTORE ---
  exportBackupData(): string {
    const payload = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      areas: this.getAreas(),
      equipment: this.getEquipment(),
      prEngineering: this.getPrEngineering(),
      vendors: this.getVendors(),
      orders: this.getOrders(),
      barangDatang: this.getBarangDatang(),
      riwayat: this.getRiwayat(),
      filmUploads: this.getFilmUploads(),
      weeklyReports: this.getWeeklyReports(),
      branding: this.getBranding()
    };
    return JSON.stringify(payload, null, 2);
  }

  importRestoreData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (
        Array.isArray(parsed.areas) &&
        Array.isArray(parsed.equipment) &&
        Array.isArray(parsed.prEngineering) &&
        Array.isArray(parsed.vendors) &&
        Array.isArray(parsed.orders) &&
        Array.isArray(parsed.barangDatang) &&
        Array.isArray(parsed.riwayat)
      ) {
        this.set('xxi_areas', parsed.areas);
        this.set('xxi_equipment', parsed.equipment);
        this.set('xxi_pr_engineering', parsed.prEngineering);
        this.set('xxi_vendors', parsed.vendors);
        this.set('xxi_orders', parsed.orders);
        this.set('xxi_barang_datang', parsed.barangDatang);
        this.set('xxi_riwayat', parsed.riwayat);
        if (parsed.filmUploads && Array.isArray(parsed.filmUploads)) {
          this.set('xxi_film_upload', parsed.filmUploads);
        } else {
          this.set('xxi_film_upload', INITIAL_FILM_UPLOAD);
        }
        if (parsed.weeklyReports && Array.isArray(parsed.weeklyReports)) {
          this.set('xxi_weekly_reports', parsed.weeklyReports);
        } else {
          this.set('xxi_weekly_reports', []);
        }
        if (parsed.branding) {
          this.set('xxi_branding', parsed.branding);
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import backup failed', e);
      return false;
    }
  }
}

export const db = new LocalDatabase();
export default db;
