/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { firestore, ensureFirebaseAuth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import studioProyektorService from '../services/studioProyektorService';
import studioProyektorDb from '../services/studioProyektorDb';
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
  JadwalFilmItem,
  FormCutiData,
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

class FirestoreDatabase {
  private listeners: Set<Listener> = new Set();

  // In-memory data store for synchronous getters used by UI components
  private areas: Area[] = [];
  private equipment: Equipment[] = [];
  private prList: PrEngineering[] = [];
  private vendors: VendorTeknisi[] = [];
  private orders: OrderBarang[] = [];
  private barangDatang: BarangDatang[] = [];
  private riwayat: RiwayatEquipment[] = [];
  private filmUploads: FilmUpload[] = [];
  private weeklyReports: WeeklyReport[] = [];
  private jadwalFilm: JadwalFilmItem[] = [];
  private ipDevices: IpDevice[] = [];
  private ipAreas: string[] = INITIAL_IP_AREAS;
  private ipCategories: string[] = INITIAL_IP_CATEGORIES;
  private reportHistories: ReportHistoryItem[] = [];
  private formCutiList: FormCutiData[] = [];
  private branding: SystemBranding = DEFAULT_BRANDING;
  private beritaAcaraDraft: BeritaAcaraDraft | null = null;

  private isInitialized = false;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    this.loadFromCache();
    this.initFirestore();
  }

  // Temporary local cache loader to avoid blank screens while network initializes
  private loadFromCache() {
    try {
      // 1. One-time clean slate wipe of legacy/cached operational data
      const CLEAN_SLATE_APPLIED_KEY = 'xxi_clean_slate_applied_oct_2026_v2';
      if (!localStorage.getItem(CLEAN_SLATE_APPLIED_KEY)) {
        const keysToRemove = [
          'fs_cache_areas',
          'fs_cache_equipment',
          'fs_cache_pr_engineering',
          'fs_cache_vendors',
          'fs_cache_orders',
          'fs_cache_barang_datang',
          'fs_cache_riwayat',
          'fs_cache_film_uploads',
          'fs_cache_weekly_reports',
          'fs_cache_jadwal_film',
          'fs_cache_ip_devices',
          'fs_cache_ip_areas',
          'fs_cache_ip_categories',
          'fs_cache_report_histories',
          'fs_cache_form_cuti',
          'fs_cache_berita_acara_draft',
          'xxi_areas',
          'xxi_equipment',
          'xxi_pr_engineering',
          'xxi_vendors',
          'xxi_orders',
          'xxi_barang_datang',
          'xxi_riwayat',
          'xxi_jadwal_film',
          'xxi_form_cuti_history_v1',
          'xxi_form_cuti_current_draft',
          'xxi_ba_draft_v2',
          'xxi_ba_batch_list',
          'xxi_selected_laporan_films',
          'xxi_has_imported_to_laporan',
          'xxi_weekly_reports_v1',
          'xxi_sp_studios_v2',
          'xxi_sp_proyektors_v2',
          'xxi_sp_studios_v1',
          'xxi_sp_proyektors_v1',
          'xxi_studio_proyektor_items_v3',
          'xxi_studio_proyektor_deleted_v3',
          'cinema_xxi_engineering_notes',
          'cinema_xxi_sop_documents',
          'xxi_ip_devices',
          'xxi_ip_areas',
          'xxi_ip_categories'
        ];
        keysToRemove.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch (_) {}
        });
        localStorage.setItem(CLEAN_SLATE_APPLIED_KEY, 'true');
      }

      const getCached = <T>(key: string, fallback: T): T => {
        const item = localStorage.getItem(`fs_cache_${key}`);
        if (!item) return fallback;
        try {
          return JSON.parse(item);
        } catch {
          return fallback;
        }
      };

      // Completely clean initial states
      this.areas = getCached('areas', []);
      this.equipment = getCached('equipment', []);
      this.prList = getCached('pr_engineering', []);
      this.vendors = getCached('vendors', []);
      this.orders = getCached('orders', []);
      this.barangDatang = getCached('barang_datang', []);
      this.riwayat = getCached('riwayat', []);
      this.filmUploads = getCached('film_uploads', []);
      this.weeklyReports = getCached<WeeklyReport[]>('weekly_reports', []);
      this.jadwalFilm = getCached('jadwal_film', []);
      this.ipDevices = getCached('ip_devices', []);
      this.ipAreas = getCached('ip_areas', []);
      this.ipCategories = getCached('ip_categories', []);
      this.reportHistories = getCached('report_histories', []);
      this.formCutiList = getCached('form_cuti', []);
      this.branding = getCached('branding', DEFAULT_BRANDING);
      this.beritaAcaraDraft = getCached('berita_acara_draft', null);
    } catch (e) {
      console.warn('Cache loading error:', e);
    }
  }

  private saveToCache<T>(key: string, data: T) {
    try {
      localStorage.setItem(`fs_cache_${key}`, JSON.stringify(data));
    } catch {
      // ignore storage quota errors
    }
  }

  // Subscribe UI components to changes
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // Real-time Firestore initialization
  private async initFirestore() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    await ensureFirebaseAuth();

    // One-time automatic clean-slate wipe on first boot to guarantee database is 100% clean
    const REMOTE_CLEAN_SLATE_FLAG = 'xxi_remote_clean_slate_executed_oct_2026_v2';
    if (!localStorage.getItem(REMOTE_CLEAN_SLATE_FLAG)) {
      try {
        await this.resetAllOperationalData();
        localStorage.setItem(REMOTE_CLEAN_SLATE_FLAG, 'true');
      } catch (err) {
        console.warn('Initial remote clean slate execution note:', err);
      }
    }

    this.attachRealtimeListeners();

    // Run seed asynchronously in background so listeners and cache are available immediately
    this.seedInitialDataIfNeeded().catch((err) => {
      console.warn('Seed initial data non-blocking status:', err);
    });
  }

  // Migrate existing data or seed master cinema areas if Firestore is empty
  private async seedInitialDataIfNeeded() {
    // Clean-slate state: do not automatically seed areas when empty.
    // User can add custom areas manually via Master Area view.
  }

  // Realtime Firestore listeners
  private attachRealtimeListeners() {
    // 1. Equipment Realtime Listener
    const unsubEq = onSnapshot(
      collection(firestore, 'equipment'),
      (snapshot) => {
        this.equipment = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Equipment));
        this.saveToCache('equipment', this.equipment);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'equipment');
      }
    );
    this.unsubscribers.push(unsubEq);

    // 2. Areas Realtime Listener
    const unsubAreas = onSnapshot(
      collection(firestore, 'areas'),
      (snapshot) => {
        this.areas = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Area));
        this.saveToCache('areas', this.areas);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'areas');
      }
    );
    this.unsubscribers.push(unsubAreas);

    // 3. PR Engineering Realtime Listener
    const unsubPr = onSnapshot(
      collection(firestore, 'pr_engineering'),
      (snapshot) => {
        this.prList = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as PrEngineering));
        this.saveToCache('pr_engineering', this.prList);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'pr_engineering');
      }
    );
    this.unsubscribers.push(unsubPr);

    // 4. Vendors Realtime Listener
    const unsubVendors = onSnapshot(
      collection(firestore, 'vendors'),
      (snapshot) => {
        this.vendors = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as VendorTeknisi));
        this.saveToCache('vendors', this.vendors);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'vendors');
      }
    );
    this.unsubscribers.push(unsubVendors);

    // 5. Orders Realtime Listener
    const unsubOrders = onSnapshot(
      collection(firestore, 'orders'),
      (snapshot) => {
        this.orders = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as OrderBarang));
        this.saveToCache('orders', this.orders);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'orders');
      }
    );
    this.unsubscribers.push(unsubOrders);

    // 6. Barang Datang Realtime Listener
    const unsubBd = onSnapshot(
      collection(firestore, 'barang_datang'),
      (snapshot) => {
        this.barangDatang = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as BarangDatang));
        this.saveToCache('barang_datang', this.barangDatang);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'barang_datang');
      }
    );
    this.unsubscribers.push(unsubBd);

    // 7. Riwayat Equipment Realtime Listener
    const unsubRiwayat = onSnapshot(
      collection(firestore, 'riwayat_equipment'),
      (snapshot) => {
        this.riwayat = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as RiwayatEquipment));
        this.saveToCache('riwayat', this.riwayat);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'riwayat_equipment');
      }
    );
    this.unsubscribers.push(unsubRiwayat);

    // 8. Film Uploads Realtime Listener
    const unsubFilm = onSnapshot(
      collection(firestore, 'film_uploads'),
      (snapshot) => {
        this.filmUploads = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as FilmUpload));
        this.saveToCache('film_uploads', this.filmUploads);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'film_uploads');
      }
    );
    this.unsubscribers.push(unsubFilm);

    // 9. Weekly Reports Realtime Listener
    const unsubReports = onSnapshot(
      collection(firestore, 'weekly_reports'),
      (snapshot) => {
        this.weeklyReports = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as WeeklyReport));
        this.saveToCache('weekly_reports', this.weeklyReports);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'weekly_reports');
      }
    );
    this.unsubscribers.push(unsubReports);

    // 9b. Jadwal Film Realtime Listener
    const unsubJadwal = onSnapshot(
      collection(firestore, 'jadwal_film'),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as JadwalFilmItem));
        if (docs.length > 0 || this.jadwalFilm.length === 0) {
          this.jadwalFilm = docs;
          this.saveToCache('jadwal_film', this.jadwalFilm);
          try {
            localStorage.setItem('xxi_jadwal_film', JSON.stringify(this.jadwalFilm));
            window.dispatchEvent(new CustomEvent('xxi_jadwal_film_updated', { detail: this.jadwalFilm }));
          } catch (_) {}
          this.notify();
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'jadwal_film');
      }
    );
    this.unsubscribers.push(unsubJadwal);

    // 10. IP Devices Realtime Listener
    const unsubIp = onSnapshot(
      collection(firestore, 'ip_devices'),
      (snapshot) => {
        this.ipDevices = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as IpDevice));
        this.saveToCache('ip_devices', this.ipDevices);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'ip_devices');
      }
    );
    this.unsubscribers.push(unsubIp);

    // 11. Report History Realtime Listener
    const unsubReportHistories = onSnapshot(
      collection(firestore, 'report_history'),
      (snapshot) => {
        this.reportHistories = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as ReportHistoryItem));
        this.saveToCache('report_histories', this.reportHistories);
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'report_history');
      }
    );
    this.unsubscribers.push(unsubReportHistories);

    // 12. Branding & System Settings Realtime Listener
    const unsubBranding = onSnapshot(
      doc(firestore, 'system_settings', 'branding'),
      (snapshot) => {
        if (snapshot.exists()) {
          this.branding = snapshot.data() as SystemBranding;
          this.saveToCache('branding', this.branding);
          this.notify();
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'system_settings/branding');
      }
    );
    this.unsubscribers.push(unsubBranding);

    // 13. IP Areas & Categories Realtime Listener
    const unsubIpConfig = onSnapshot(
      doc(firestore, 'system_settings', 'ip_config'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.areas) && data.areas.length > 0) {
            this.ipAreas = data.areas;
            this.saveToCache('ip_areas', this.ipAreas);
          }
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            this.ipCategories = data.categories;
            this.saveToCache('ip_categories', this.ipCategories);
          }
          this.notify();
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'system_settings/ip_config');
      }
    );
    this.unsubscribers.push(unsubIpConfig);

    // 14. Berita Acara Draft Realtime Listener
    const unsubDraft = onSnapshot(
      doc(firestore, 'system_settings', 'berita_acara_draft'),
      (snapshot) => {
        if (snapshot.exists()) {
          this.beritaAcaraDraft = snapshot.data() as BeritaAcaraDraft;
          this.saveToCache('berita_acara_draft', this.beritaAcaraDraft);
          this.notify();
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'system_settings/berita_acara_draft');
      }
    );
    this.unsubscribers.push(unsubDraft);

    // 15. Form Cuti Realtime Listener
    const unsubFormCuti = onSnapshot(
      collection(firestore, 'form_cuti'),
      (snapshot) => {
        this.formCutiList = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as FormCutiData));
        this.saveToCache('form_cuti', this.formCutiList);
        try {
          localStorage.setItem('xxi_form_cuti_history_v1', JSON.stringify(this.formCutiList));
        } catch (_) {}
        this.notify();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'form_cuti');
      }
    );
    this.unsubscribers.push(unsubFormCuti);
  }

  // --- EQUIPMENT CRUD (Firestore Primary) ---
  getEquipment(): Equipment[] {
    return this.equipment;
  }

  async saveEquipment(eq: Equipment): Promise<void> {
    const id = eq.id || `eq-${Date.now()}`;
    const payload = { ...eq, id, updated_at: new Date().toISOString() };

    // Update memory immediately for responsive UI
    const index = this.equipment.findIndex((i) => i.id === id);
    if (index > -1) {
      this.equipment[index] = payload;
    } else {
      this.equipment.push(payload);
    }
    this.saveToCache('equipment', this.equipment);
    this.notify();

    // Write to Firestore primary
    try {
      await setDoc(doc(firestore, 'equipment', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `equipment/${id}`);
    }
  }

  async deleteEquipment(id: string): Promise<void> {
    // Update memory immediately
    this.equipment = this.equipment.filter((item) => item.id !== id);
    this.saveToCache('equipment', this.equipment);
    this.notify();

    // Delete from Firestore primary
    try {
      await deleteDoc(doc(firestore, 'equipment', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `equipment/${id}`);
    }
  }

  // --- AREAS CRUD (Firestore Primary) ---
  getAreas(): Area[] {
    return this.areas;
  }

  async saveArea(area: Area): Promise<void> {
    const id = area.id || `area-${Date.now()}`;
    const payload = { ...area, id };

    const index = this.areas.findIndex((a) => a.id === id);
    if (index > -1) {
      this.areas[index] = payload;
    } else {
      this.areas.push(payload);
    }
    this.saveToCache('areas', this.areas);
    this.notify();

    try {
      await setDoc(doc(firestore, 'areas', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `areas/${id}`);
    }
  }

  async deleteArea(id: string): Promise<void> {
    this.areas = this.areas.filter((a) => a.id !== id);
    this.saveToCache('areas', this.areas);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'areas', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `areas/${id}`);
    }
  }

  // --- PR ENGINEERING CRUD (Firestore Primary) ---
  getPrEngineering(): PrEngineering[] {
    return this.prList;
  }

  async savePrEngineering(pr: PrEngineering): Promise<void> {
    const id = pr.id || `pr-${Date.now()}`;
    const payload = { ...pr, id };

    const index = this.prList.findIndex((item) => item.id === id);
    if (index > -1) {
      this.prList[index] = payload;
    } else {
      this.prList.push(payload);
    }
    this.saveToCache('pr_engineering', this.prList);
    this.notify();

    try {
      await setDoc(doc(firestore, 'pr_engineering', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `pr_engineering/${id}`);
    }
  }

  async deletePrEngineering(id: string): Promise<void> {
    this.prList = this.prList.filter((item) => item.id !== id);
    this.saveToCache('pr_engineering', this.prList);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'pr_engineering', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `pr_engineering/${id}`);
    }
  }

  // --- VENDORS CRUD (Firestore Primary) ---
  getVendors(): VendorTeknisi[] {
    return this.vendors;
  }

  async saveVendor(vendor: VendorTeknisi): Promise<void> {
    const id = vendor.id || `ven-${Date.now()}`;
    const payload = { ...vendor, id };

    const index = this.vendors.findIndex((item) => item.id === id);
    if (index > -1) {
      this.vendors[index] = payload;
    } else {
      this.vendors.push(payload);
    }
    this.saveToCache('vendors', this.vendors);
    this.notify();

    try {
      await setDoc(doc(firestore, 'vendors', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `vendors/${id}`);
    }
  }

  async deleteVendor(id: string): Promise<void> {
    this.vendors = this.vendors.filter((item) => item.id !== id);
    this.saveToCache('vendors', this.vendors);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'vendors', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vendors/${id}`);
    }
  }

  // --- ORDER BARANG CRUD (Firestore Primary) ---
  getOrders(): OrderBarang[] {
    return this.orders;
  }

  async saveOrder(order: OrderBarang): Promise<void> {
    const id = order.id || `ord-${Date.now()}`;
    const payload = { ...order, id };

    const index = this.orders.findIndex((item) => item.id === id);
    if (index > -1) {
      this.orders[index] = payload;
    } else {
      this.orders.push(payload);
    }
    this.saveToCache('orders', this.orders);
    this.notify();

    try {
      await setDoc(doc(firestore, 'orders', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${id}`);
    }
  }

  async deleteOrder(id: string): Promise<void> {
    this.orders = this.orders.filter((item) => item.id !== id);
    this.saveToCache('orders', this.orders);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'orders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  }

  async receiveOrder(orderId: string, barang: BarangDatang): Promise<void> {
    const barangId = barang.id || `bd-${Date.now()}`;
    const barangPayload = { ...barang, id: barangId };

    // Update memory
    this.orders = this.orders.filter((item) => item.id !== orderId);
    this.barangDatang.unshift(barangPayload);
    this.saveToCache('orders', this.orders);
    this.saveToCache('barang_datang', this.barangDatang);
    this.notify();

    // Firestore transaction / batch write
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'orders', orderId));
      batch.set(doc(firestore, 'barang_datang', barangId), barangPayload);
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders/receiveOrder');
    }
  }

  // --- BARANG DATANG CRUD (Firestore Primary) ---
  getBarangDatang(): BarangDatang[] {
    return this.barangDatang;
  }

  async saveBarangDatang(barang: BarangDatang): Promise<void> {
    const id = barang.id || `bd-${Date.now()}`;
    const payload = { ...barang, id };

    const index = this.barangDatang.findIndex((item) => item.id === id);
    if (index > -1) {
      this.barangDatang[index] = payload;
    } else {
      this.barangDatang.push(payload);
    }
    this.saveToCache('barang_datang', this.barangDatang);
    this.notify();

    try {
      await setDoc(doc(firestore, 'barang_datang', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `barang_datang/${id}`);
    }
  }

  async deleteBarangDatang(id: string): Promise<void> {
    this.barangDatang = this.barangDatang.filter((item) => item.id !== id);
    this.saveToCache('barang_datang', this.barangDatang);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'barang_datang', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `barang_datang/${id}`);
    }
  }

  // --- RIWAYAT / SERVICE CRUD (Firestore Primary) ---
  getRiwayat(): RiwayatEquipment[] {
    return this.riwayat;
  }

  async saveRiwayat(r: RiwayatEquipment): Promise<void> {
    const id = r.id || `rw-${Date.now()}`;
    const payload = { ...r, id };

    const index = this.riwayat.findIndex((item) => item.id === id);
    if (index > -1) {
      this.riwayat[index] = payload;
    } else {
      this.riwayat.push(payload);
    }
    this.saveToCache('riwayat', this.riwayat);
    this.notify();

    try {
      await setDoc(doc(firestore, 'riwayat_equipment', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `riwayat_equipment/${id}`);
    }
  }

  async deleteRiwayat(id: string): Promise<void> {
    this.riwayat = this.riwayat.filter((item) => item.id !== id);
    this.saveToCache('riwayat', this.riwayat);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'riwayat_equipment', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `riwayat_equipment/${id}`);
    }
  }

  // --- FILM UPLOAD CRUD (Firestore Primary) ---
  getFilmUploads(): FilmUpload[] {
    return this.filmUploads;
  }

  async saveFilmUpload(film: FilmUpload): Promise<void> {
    const id = film.id || `film-${Date.now()}`;
    const now = new Date().toISOString();
    const payload: FilmUpload = {
      ...film,
      id,
      created_at: film.created_at || now,
      updated_at: now
    };

    const index = this.filmUploads.findIndex((item) => item.id === id);
    if (index > -1) {
      this.filmUploads[index] = payload;
    } else {
      this.filmUploads.push(payload);
    }
    this.saveToCache('film_uploads', this.filmUploads);
    this.notify();

    try {
      await setDoc(doc(firestore, 'film_uploads', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `film_uploads/${id}`);
    }
  }

  async deleteFilmUpload(id: string): Promise<void> {
    this.filmUploads = this.filmUploads.filter((item) => item.id !== id);
    this.saveToCache('film_uploads', this.filmUploads);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'film_uploads', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `film_uploads/${id}`);
    }
  }

  // --- WEEKLY REPORTS CRUD (Firestore Primary) ---
  getWeeklyReports(): WeeklyReport[] {
    return this.weeklyReports;
  }

  async saveWeeklyReport(report: WeeklyReport): Promise<void> {
    const id = report.id || `wr-${Date.now()}`;
    const payload = { ...report, id };

    const norm = (p: string) => (p || '').replace(/\s*(?:[-–—]|s\/d|sd|sampai)\s*/gi, ' - ').trim().toLowerCase();
    const index = this.weeklyReports.findIndex(
      (item) => item.id === id || (item.periode && report.periode && norm(item.periode) === norm(report.periode))
    );
    if (index > -1) {
      this.weeklyReports[index] = payload;
    } else {
      this.weeklyReports.push(payload);
    }
    this.saveToCache('weekly_reports', this.weeklyReports);
    this.notify();

    try {
      console.log('[IMPORT] START FIRESTORE WRITE to weekly_reports/' + id);
      // Execute Firestore write with a safety timeout so offline stream retries never hang the Promise forever
      await Promise.race([
        setDoc(doc(firestore, 'weekly_reports', id), payload, { merge: true }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore write timeout or offline')), 2500)
        )
      ]);
      console.log('[IMPORT] FIRESTORE WRITE COMPLETE');
    } catch (error) {
      console.warn('[IMPORT] Firestore setDoc warning (local cache saved):', error);
      // We do not rethrow so that if Firestore backend is offline/disconnected,
      // the application can continue cleanly with local persistence
    }
  }

  async deleteWeeklyReport(id: string): Promise<void> {
    this.weeklyReports = this.weeklyReports.filter((item) => item.id !== id);
    this.saveToCache('weekly_reports', this.weeklyReports);
    this.notify();

    try {
      await Promise.race([
        deleteDoc(doc(firestore, 'weekly_reports', id)),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore delete timeout or offline')), 2500)
        )
      ]);
    } catch (error) {
      console.warn('Firestore delete error (local cache updated):', error);
    }
  }

  // --- JADWAL FILM CRUD (Firestore Primary) ---
  getJadwalFilm(): JadwalFilmItem[] {
    return this.jadwalFilm;
  }

  async saveJadwalFilm(item: JadwalFilmItem): Promise<void> {
    const id = item.id || `jdw-${Date.now()}`;
    const payload: JadwalFilmItem = { ...item, id };
    const index = this.jadwalFilm.findIndex((x) => x.id === id);
    if (index > -1) {
      this.jadwalFilm[index] = payload;
    } else {
      this.jadwalFilm.unshift(payload);
    }
    this.saveToCache('jadwal_film', this.jadwalFilm);
    try {
      localStorage.setItem('xxi_jadwal_film', JSON.stringify(this.jadwalFilm));
      window.dispatchEvent(new CustomEvent('xxi_jadwal_film_updated', { detail: this.jadwalFilm }));
    } catch (_) {}
    this.notify();

    try {
      await setDoc(doc(firestore, 'jadwal_film', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `jadwal_film/${id}`);
    }
  }

  async deleteJadwalFilm(id: string): Promise<void> {
    this.jadwalFilm = this.jadwalFilm.filter((x) => x.id !== id);
    this.saveToCache('jadwal_film', this.jadwalFilm);
    try {
      localStorage.setItem('xxi_jadwal_film', JSON.stringify(this.jadwalFilm));
      window.dispatchEvent(new CustomEvent('xxi_jadwal_film_updated', { detail: this.jadwalFilm }));
    } catch (_) {}
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'jadwal_film', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `jadwal_film/${id}`);
    }
  }

  // --- BERITA ACARA DRAFT CRUD (Firestore Primary) ---
  getBeritaAcaraDraft(): BeritaAcaraDraft | null {
    return this.beritaAcaraDraft;
  }

  async saveBeritaAcaraDraft(draft: BeritaAcaraDraft): Promise<void> {
    this.beritaAcaraDraft = draft;
    this.saveToCache('berita_acara_draft', draft);
    this.notify();

    try {
      await setDoc(doc(firestore, 'system_settings', 'berita_acara_draft'), draft, {
        merge: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_settings/berita_acara_draft');
    }
  }

  // --- BRANDING CRUD (Firestore Primary) ---
  getBranding(): SystemBranding {
    return this.branding;
  }

  async saveBranding(branding: SystemBranding): Promise<void> {
    this.branding = branding;
    this.saveToCache('branding', branding);
    this.notify();

    try {
      await setDoc(doc(firestore, 'system_settings', 'branding'), branding, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_settings/branding');
    }
  }

  // --- IP & CREDENTIAL MANAGER CRUD (Firestore Primary) ---
  getIpDevices(): IpDevice[] {
    return this.ipDevices;
  }

  async saveIpDevice(device: IpDevice): Promise<void> {
    const id = device.id || `ip-${Date.now()}`;
    const payload = { ...device, id, updated_at: new Date().toISOString() };

    const index = this.ipDevices.findIndex((item) => item.id === id);
    if (index > -1) {
      this.ipDevices[index] = payload;
    } else {
      this.ipDevices.push(payload);
    }
    this.saveToCache('ip_devices', this.ipDevices);
    this.notify();

    try {
      await setDoc(doc(firestore, 'ip_devices', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `ip_devices/${id}`);
    }
  }

  async deleteIpDevice(id: string): Promise<void> {
    this.ipDevices = this.ipDevices.filter((item) => item.id !== id);
    this.saveToCache('ip_devices', this.ipDevices);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'ip_devices', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ip_devices/${id}`);
    }
  }

  getIpAreas(): string[] {
    return this.ipAreas;
  }

  async saveIpArea(areaName: string): Promise<void> {
    const name = areaName.trim().toUpperCase();
    if (!this.ipAreas.includes(name)) {
      this.ipAreas = [...this.ipAreas, name];
      this.saveToCache('ip_areas', this.ipAreas);
      this.notify();

      try {
        await setDoc(
          doc(firestore, 'system_settings', 'ip_config'),
          { areas: this.ipAreas, categories: this.ipCategories },
          { merge: true }
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'system_settings/ip_config');
      }
    }
  }

  async deleteIpArea(areaName: string): Promise<void> {
    this.ipAreas = this.ipAreas.filter((a) => a !== areaName);
    this.saveToCache('ip_areas', this.ipAreas);
    this.notify();

    try {
      await setDoc(
        doc(firestore, 'system_settings', 'ip_config'),
        { areas: this.ipAreas, categories: this.ipCategories },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_settings/ip_config');
    }
  }

  getIpCategories(): string[] {
    return this.ipCategories;
  }

  async saveIpCategory(catName: string): Promise<void> {
    const name = catName.trim().toUpperCase();
    if (!this.ipCategories.includes(name)) {
      this.ipCategories = [...this.ipCategories, name];
      this.saveToCache('ip_categories', this.ipCategories);
      this.notify();

      try {
        await setDoc(
          doc(firestore, 'system_settings', 'ip_config'),
          { areas: this.ipAreas, categories: this.ipCategories },
          { merge: true }
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'system_settings/ip_config');
      }
    }
  }

  async deleteIpCategory(catName: string): Promise<void> {
    this.ipCategories = this.ipCategories.filter((c) => c !== catName);
    this.saveToCache('ip_categories', this.ipCategories);
    this.notify();

    try {
      await setDoc(
        doc(firestore, 'system_settings', 'ip_config'),
        { areas: this.ipAreas, categories: this.ipCategories },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_settings/ip_config');
    }
  }

  // --- REPORT HISTORY CRUD (Firestore Primary) ---
  getReportHistories(): ReportHistoryItem[] {
    return this.reportHistories;
  }

  async saveReportHistory(item: ReportHistoryItem): Promise<void> {
    const id = item.id || `rep-${Date.now()}`;
    const now = new Date().toISOString();
    const payload: ReportHistoryItem = {
      ...item,
      id,
      createdAt: item.createdAt || now,
      updatedAt: now
    };

    const index = this.reportHistories.findIndex((h) => h.id === id);
    if (index > -1) {
      this.reportHistories[index] = payload;
    } else {
      this.reportHistories.push(payload);
    }
    this.saveToCache('report_histories', this.reportHistories);
    this.notify();

    try {
      await setDoc(doc(firestore, 'report_history', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `report_history/${id}`);
    }
  }

  async deleteReportHistory(id: string): Promise<void> {
    this.reportHistories = this.reportHistories.filter((h) => h.id !== id);
    this.saveToCache('report_histories', this.reportHistories);
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'report_history', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `report_history/${id}`);
    }
  }

  // --- FORM CUTI CRUD (Firestore Primary) ---
  getFormCutiList(): FormCutiData[] {
    return this.formCutiList;
  }

  async saveFormCuti(data: FormCutiData): Promise<void> {
    const id = data.id || `cuti-${Date.now()}`;
    const now = new Date().toISOString();
    const payload: FormCutiData = {
      ...data,
      id,
      updatedAt: now
    };

    const index = this.formCutiList.findIndex((h) => h.id === id);
    if (index > -1) {
      this.formCutiList[index] = payload;
    } else {
      this.formCutiList.unshift(payload);
    }
    this.saveToCache('form_cuti', this.formCutiList);
    try {
      localStorage.setItem('xxi_form_cuti_history_v1', JSON.stringify(this.formCutiList));
    } catch (_) {}
    this.notify();

    try {
      await setDoc(doc(firestore, 'form_cuti', id), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `form_cuti/${id}`);
    }
  }

  async deleteFormCuti(id: string): Promise<void> {
    this.formCutiList = this.formCutiList.filter((h) => h.id !== id);
    this.saveToCache('form_cuti', this.formCutiList);
    try {
      localStorage.setItem('xxi_form_cuti_history_v1', JSON.stringify(this.formCutiList));
    } catch (_) {}
    this.notify();

    try {
      await deleteDoc(doc(firestore, 'form_cuti', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `form_cuti/${id}`);
    }
  }

  // --- BACKUP & RESTORE WITH FIRESTORE SYNC ---
  exportBackupData(): string {
    const payload = {
      version: '2.0.0-firestore',
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
      jadwalFilm: this.getJadwalFilm(),
      ipDevices: this.getIpDevices(),
      reportHistories: this.getReportHistories(),
      formCutiList: this.getFormCutiList(),
      branding: this.getBranding()
    };
    return JSON.stringify(payload, null, 2);
  }

  // --- RESET ALL OPERATIONAL DATA (SAFE CLEAN SLATE) ---
  async resetAllOperationalData(): Promise<void> {
    try {
      // 1. Reset in-memory state FIRST so all UI views immediately display clean empty state
      this.areas = [];
      this.equipment = [];
      this.prList = [];
      this.vendors = [];
      this.orders = [];
      this.barangDatang = [];
      this.riwayat = [];
      this.filmUploads = [];
      this.weeklyReports = [];
      this.jadwalFilm = [];
      this.ipDevices = [];
      this.ipAreas = [];
      this.ipCategories = [];
      this.reportHistories = [];
      this.formCutiList = [];
      this.beritaAcaraDraft = null;

      // 2. Clear operational local storage caches immediately (preserving configurations & auth)
      const operationalCacheKeys = [
        'fs_cache_areas',
        'fs_cache_equipment',
        'fs_cache_pr_engineering',
        'fs_cache_vendors',
        'fs_cache_orders',
        'fs_cache_barang_datang',
        'fs_cache_riwayat',
        'fs_cache_film_uploads',
        'fs_cache_weekly_reports',
        'fs_cache_jadwal_film',
        'fs_cache_ip_devices',
        'fs_cache_ip_areas',
        'fs_cache_ip_categories',
        'fs_cache_report_histories',
        'fs_cache_form_cuti',
        'fs_cache_berita_acara_draft',
        'xxi_areas',
        'xxi_equipment',
        'xxi_pr_engineering',
        'xxi_vendors',
        'xxi_orders',
        'xxi_barang_datang',
        'xxi_riwayat',
        'xxi_jadwal_film',
        'xxi_form_cuti_history_v1',
        'xxi_form_cuti_current_draft',
        'xxi_ba_draft_v2',
        'xxi_ba_batch_list',
        'xxi_selected_laporan_films',
        'xxi_has_imported_to_laporan',
        'xxi_weekly_reports_v1',
        'xxi_sp_studios_v2',
        'xxi_sp_proyektors_v2',
        'xxi_sp_studios_v1',
        'xxi_sp_proyektors_v1',
        'xxi_studio_proyektor_items_v3',
        'xxi_studio_proyektor_deleted_v3',
        'cinema_xxi_engineering_notes',
        'cinema_xxi_sop_documents',
        'xxi_ip_devices',
        'xxi_ip_areas',
        'xxi_ip_categories'
      ];

      operationalCacheKeys.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (_) {}
      });

      // 3. Notify all active listeners across all views immediately
      this.notify();

      // 4. Reset Studio & Proyektor services immediately
      try {
        await Promise.allSettled([
          studioProyektorService.resetOperationalData(),
          studioProyektorDb.resetAllData()
        ]);
      } catch (spErr) {
        console.warn('[Reset] Warn clearing studio proyektor operational data:', spErr);
      }

      // 5. Delete all operational docs in Firestore in parallel with timeout protection
      const operationalCollections = [
        'areas',
        'equipment',
        'pr_engineering',
        'vendors',
        'orders',
        'barang_datang',
        'riwayat_equipment',
        'film_uploads',
        'weekly_reports',
        'jadwal_film',
        'ip_devices',
        'report_histories',
        'report_history',
        'form_cuti',
        'sp_studios',
        'sp_proyektors',
        'studio_proyektor_v3'
      ];

      const deletePromises = operationalCollections.map(async (colName) => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 2500)
          );
          const snap = (await Promise.race([
            getDocs(collection(firestore, colName)),
            timeoutPromise
          ])) as any;

          if (snap && !snap.empty) {
            const batch = writeBatch(firestore);
            snap.docs.forEach((d: any) => {
              batch.delete(doc(firestore, colName, d.id));
            });
            await batch.commit();
          }
        } catch (colErr) {
          console.warn(`[Reset] Non-blocking warn clearing collection ${colName}:`, colErr);
        }
      });

      const clearDraftPromise = deleteDoc(doc(firestore, 'system_settings', 'berita_acara_draft')).catch(() => {});

      // Race with max 2.5 seconds timeout so the UI never hangs
      await Promise.race([
        Promise.allSettled([...deletePromises, clearDraftPromise]),
        new Promise((resolve) => setTimeout(resolve, 2500))
      ]);

      // 6. Final notify to make sure everything stays empty
      this.notify();
    } catch (err) {
      console.error('[Reset] Failed to reset operational data:', err);
      this.notify();
      throw err;
    }
  }

  async importRestoreData(jsonString: string): Promise<boolean> {
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
        // Batch upload to Firestore
        const batch = writeBatch(firestore);

        parsed.areas.forEach((a: Area) => {
          batch.set(doc(firestore, 'areas', a.id), a, { merge: true });
        });
        parsed.equipment.forEach((e: Equipment) => {
          batch.set(doc(firestore, 'equipment', e.id), e, { merge: true });
        });
        parsed.prEngineering.forEach((p: PrEngineering) => {
          batch.set(doc(firestore, 'pr_engineering', p.id), p, { merge: true });
        });
        parsed.vendors.forEach((v: VendorTeknisi) => {
          batch.set(doc(firestore, 'vendors', v.id), v, { merge: true });
        });
        parsed.orders.forEach((o: OrderBarang) => {
          batch.set(doc(firestore, 'orders', o.id), o, { merge: true });
        });
        parsed.barangDatang.forEach((b: BarangDatang) => {
          batch.set(doc(firestore, 'barang_datang', b.id), b, { merge: true });
        });
        parsed.riwayat.forEach((r: RiwayatEquipment) => {
          batch.set(doc(firestore, 'riwayat_equipment', r.id), r, { merge: true });
        });
        if (parsed.branding) {
          batch.set(doc(firestore, 'system_settings', 'branding'), parsed.branding, {
            merge: true
          });
        }
        await batch.commit();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import backup failed', e);
      return false;
    }
  }
}

export const firestoreDb = new FirestoreDatabase();
export const db = firestoreDb;
export default firestoreDb;
