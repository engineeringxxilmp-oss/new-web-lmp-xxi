/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import db from './db/localDb';
import {
  Area,
  Equipment,
  PrEngineering,
  VendorTeknisi,
  OrderBarang,
  BarangDatang,
  RiwayatEquipment,
  SystemBranding,
  FontStyle,
  FilmUpload,
  ReportHistoryItem
} from './types';

// Import structural components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Menu, X, LogOut, User, Clock } from 'lucide-react';

// Import views
import Login, { UserSession } from './views/Login';
import Dashboard from './views/Dashboard';
import MasterArea from './views/MasterArea';
import EquipmentView from './views/Equipment';
import PrEngineeringView, { getIndonesianDate } from './views/PrEngineering';
import VendorTeknisiView from './views/VendorTeknisi';
import OrderDanBarangDatangView from './views/OrderDanBarangDatang';
import OrderBarangView from './views/OrderBarang';
import BarangDatangView from './views/BarangDatang';
import RiwayatEquipmentView from './views/RiwayatEquipment';
import ReportHistoryView from './views/ReportHistoryView';
import BeritaAcaraPermintaanView from './views/BeritaAcaraPermintaanView';
import SopKnowledgeCenter from './views/SopKnowledgeCenter';
import FilmUploadView from './views/FilmUploadView';
import LaporanFilm from './views/LaporanFilm';
import RapotFilm from './views/RapotFilm';
import Laporan from './views/Laporan';
import Pengaturan from './views/Pengaturan';
import IpCredentialManager from './views/IpCredentialManager';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('xxi_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const handleLoginSuccess = (user: UserSession) => {
    setCurrentUser(user);
    localStorage.setItem('xxi_auth_user', JSON.stringify(user));
    triggerToast(`Otentikasi Berhasil! Selamat Datang, ${user.name} (${user.role})`, 'success');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('xxi_auth_user');
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setSidebarOpen(false);
    setActiveTab('dashboard');
    triggerToast('Anda telah keluar (logout) dari sistem.', 'info');
  };

  // Database states
  const [areas, setAreas] = useState<Area[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [prList, setPrList] = useState<PrEngineering[]>([]);
  const [vendors, setVendors] = useState<VendorTeknisi[]>([]);
  const [orders, setOrders] = useState<OrderBarang[]>([]);
  const [barangDatang, setBarangDatang] = useState<BarangDatang[]>([]);
  const [riwayat, setRiwayat] = useState<RiwayatEquipment[]>([]);
  const [filmUploads, setFilmUploads] = useState<FilmUpload[]>([]);
  const [reportHistories, setReportHistories] = useState<ReportHistoryItem[]>([]);
  const [branding, setBranding] = useState<SystemBranding>({
    logoUrl: '',
    title: 'CINEMA XXI',
    subtitle: 'LIPPO MALL PURI',
    font: 'Inter',
    headerBg: 'gradient-dark',
    illustration: 'Anime-Slideshow'
  });

  // Toasts state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Live Real-Time Date & Clock for Top Sticky Bar
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = daysIndo[currentTime.getDay()];
  const dateNum = String(currentTime.getDate()).padStart(2, '0');
  const monthName = monthsIndo[currentTime.getMonth()];
  const yearNum = currentTime.getFullYear();

  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');

  // Auto-save visual indicator states
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Pull all records from DB
  const syncWithDatabase = () => {
    setAreas(db.getAreas());
    setEquipment(db.getEquipment());
    setPrList(db.getPrEngineering());
    setVendors(db.getVendors());
    setOrders(db.getOrders());
    setBarangDatang(db.getBarangDatang());
    setRiwayat(db.getRiwayat());
    setFilmUploads(db.getFilmUploads());
    setReportHistories(db.getReportHistories());
    setBranding(db.getBranding());
  };

  // Subscribe on mount
  useEffect(() => {
    syncWithDatabase();
    const unsubscribe = db.subscribe(() => {
      setSaveStatus('saving');
      syncWithDatabase();
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('saved');
      }, 1000);
    });
    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      triggerToast('Koneksi internet terhubung kembali.', 'success');
    };
    const handleOffline = () => {
      triggerToast('Koneksi internet bermasalah.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      triggerToast('Koneksi internet bermasalah.', 'error');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- DATABASE ACTION HANDLERS WITH TOAST NOTIFICATIONS ---
  const handleSaveArea = (a: Area) => {
    try {
      db.saveArea(a);
      triggerToast('Data berhasil disimpan.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleDeleteArea = (id: string) => {
    try {
      db.deleteArea(id);
      triggerToast('Data berhasil dihapus.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleSaveEquipment = async (eq: Equipment) => {
    try {
      await db.saveEquipment(eq);
      triggerToast('Data berhasil disimpan ke Firestore.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan ke Firestore.', 'error');
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await db.deleteEquipment(id);
      triggerToast('Data berhasil dihapus dari Firestore.', 'success');
    } catch (e) {
      triggerToast('Data gagal dihapus dari Firestore.', 'error');
    }
  };

  const handleSavePrEngineering = (pr: PrEngineering) => {
    try {
      db.savePrEngineering(pr);
      triggerToast('Data berhasil disimpan.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleDeletePrEngineering = (id: string) => {
    try {
      db.deletePrEngineering(id);
      triggerToast('Data berhasil dihapus.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleSaveVendor = (v: VendorTeknisi) => {
    try {
      db.saveVendor(v);
      triggerToast('Data berhasil disimpan.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleDeleteVendor = (id: string) => {
    try {
      db.deleteVendor(id);
      triggerToast('Data berhasil dihapus.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleSaveOrder = (o: OrderBarang) => {
    try {
      db.saveOrder(o);
      triggerToast('Data berhasil disimpan.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleDeleteOrder = (id: string) => {
    try {
      db.deleteOrder(id);
      triggerToast('Data berhasil dihapus.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleReceiveOrder = (order: OrderBarang) => {
    try {
      const payload: BarangDatang = {
        id: `arr-${Date.now()}`,
        tanggalBarangDatang: getIndonesianDate(),
        namaBarang: order.namaBarang,
        quantity: order.quantity,
        sesuaiOrder: true,
        status: 'Sudah Datang'
      };
      db.receiveOrder(order.id, payload);
      triggerToast(`Barang "${order.namaBarang}" (${order.quantity} unit) otomatis diterima & dipindahkan ke Barang Datang!`, 'success');
    } catch (e) {
      triggerToast('Gagal memproses penerimaan barang.', 'error');
    }
  };

  const handleSaveBarangDatang = (item: BarangDatang) => {
    try {
      db.saveBarangDatang(item);
      triggerToast('Data berhasil disimpan.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleDeleteBarangDatang = (id: string) => {
    try {
      db.deleteBarangDatang(id);
      triggerToast('Data berhasil dihapus.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleSaveRiwayat = (r: RiwayatEquipment) => {
    try {
      db.saveRiwayat(r);
      triggerToast('Data berhasil disimpan.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleDeleteRiwayat = (id: string) => {
    try {
      db.deleteRiwayat(id);
      triggerToast('Data berhasil dihapus.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleSaveReportHistory = (item: ReportHistoryItem) => {
    try {
      db.saveReportHistory(item);
      triggerToast('Data report history berhasil disimpan.', 'success');
    } catch (e) {
      triggerToast('Data report history gagal disimpan.', 'error');
    }
  };

  const handleDeleteReportHistory = (id: string) => {
    try {
      db.deleteReportHistory(id);
      triggerToast('Data report history berhasil dihapus.', 'success');
    } catch (e) {
      triggerToast('Data report history gagal dihapus.', 'error');
    }
  };

  const handleUpdateBranding = (b: SystemBranding) => {
    try {
      db.saveBranding(b);
      triggerToast('Data berhasil disimpan.', 'success');
    } catch (e) {
      triggerToast('Data gagal disimpan.', 'error');
    }
  };

  const handleSaveFilmUpload = (film: FilmUpload) => {
    try {
      db.saveFilmUpload(film);
      triggerToast('Data film berhasil disimpan.', 'success');
    } catch (e) {
      triggerToast('Data film gagal disimpan.', 'error');
    }
  };

  const handleDeleteFilmUpload = (id: string) => {
    try {
      db.deleteFilmUpload(id);
      triggerToast('Data film berhasil dihapus.', 'success');
    } catch (e) {
      triggerToast('Data film gagal dihapus.', 'error');
    }
  };

  // Determine active font family dynamically
  const getFontFamily = (font: FontStyle) => {
    switch (font) {
      case 'Space Grotesk':
        return '"Space Grotesk", sans-serif';
      case 'JetBrains Mono':
        return '"JetBrains Mono", monospace';
      case 'Playfair Display':
        return '"Playfair Display", serif';
      case 'Inter':
      default:
        return '"Inter", sans-serif';
    }
  };

  // Render correct content tab view
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            areas={areas}
            equipment={equipment}
            prList={prList}
            vendors={vendors}
            orders={orders}
            barangDatang={barangDatang}
            onSelectTab={(tab) => setActiveTab(tab)}
          />
        );
      case 'master-area':
        return (
          <MasterArea
            areas={areas}
            onSave={handleSaveArea}
            onDelete={handleDeleteArea}
            equipment={equipment}
            onSaveEquipment={handleSaveEquipment}
            onDeleteEquipment={handleDeleteEquipment}
          />
        );
      case 'ip-credential-manager':
        return (
          <IpCredentialManager
            onShowToast={triggerToast}
          />
        );
      case 'equipment':
        return (
          <EquipmentView
            equipment={equipment}
            areas={areas}
            onSave={handleSaveEquipment}
            onDelete={handleDeleteEquipment}
          />
        );
      case 'pr-engineering':
        return (
          <PrEngineeringView
            prList={prList}
            areas={areas}
            onSave={handleSavePrEngineering}
            onDelete={handleDeletePrEngineering}
          />
        );
      case 'vendor-teknisi':
        return (
          <VendorTeknisiView
            vendors={vendors}
            areas={areas}
            onSave={handleSaveVendor}
            onDelete={handleDeleteVendor}
          />
        );
      case 'order-dan-barang-datang':
        return (
          <OrderDanBarangDatangView
            orders={orders}
            onSaveOrder={handleSaveOrder}
            onDeleteOrder={handleDeleteOrder}
            barangDatang={barangDatang}
            onSaveBarangDatang={handleSaveBarangDatang}
            onDeleteBarangDatang={handleDeleteBarangDatang}
            onReceiveOrder={handleReceiveOrder}
            defaultSubTab="order"
          />
        );
      case 'order-barang':
        return (
          <OrderDanBarangDatangView
            orders={orders}
            onSaveOrder={handleSaveOrder}
            onDeleteOrder={handleDeleteOrder}
            barangDatang={barangDatang}
            onSaveBarangDatang={handleSaveBarangDatang}
            onDeleteBarangDatang={handleDeleteBarangDatang}
            onReceiveOrder={handleReceiveOrder}
            defaultSubTab="order"
          />
        );
      case 'barang-datang':
        return (
          <OrderDanBarangDatangView
            orders={orders}
            onSaveOrder={handleSaveOrder}
            onDeleteOrder={handleDeleteOrder}
            barangDatang={barangDatang}
            onSaveBarangDatang={handleSaveBarangDatang}
            onDeleteBarangDatang={handleDeleteBarangDatang}
            onReceiveOrder={handleReceiveOrder}
            defaultSubTab="barang-datang"
          />
        );
      case 'riwayat-equipment':
        return (
          <RiwayatEquipmentView
            riwayat={riwayat}
            equipment={equipment}
            areas={areas}
            onSave={handleSaveRiwayat}
            onDelete={handleDeleteRiwayat}
          />
        );
      case 'report-history':
        return (
          <ReportHistoryView
            reportHistories={reportHistories}
            onSave={handleSaveReportHistory}
            onDelete={handleDeleteReportHistory}
            onShowToast={triggerToast}
          />
        );
      case 'berita-acara-permintaan':
        return (
          <BeritaAcaraPermintaanView
            onShowToast={triggerToast}
          />
        );
      case 'sop-knowledge':
        return (
          <SopKnowledgeCenter
            onShowToast={triggerToast}
          />
        );
      case 'rapot-film':
        return (
          <RapotFilm
            filmUploads={filmUploads}
            onSaveFilmUpload={handleSaveFilmUpload}
            onDeleteFilmUpload={handleDeleteFilmUpload}
            branding={branding}
            defaultSubTab="upload"
          />
        );
      case 'film-upload':
        return (
          <RapotFilm
            filmUploads={filmUploads}
            onSaveFilmUpload={handleSaveFilmUpload}
            onDeleteFilmUpload={handleDeleteFilmUpload}
            branding={branding}
            defaultSubTab="upload"
          />
        );
      case 'laporan-film':
        return (
          <RapotFilm
            filmUploads={filmUploads}
            onSaveFilmUpload={handleSaveFilmUpload}
            onDeleteFilmUpload={handleDeleteFilmUpload}
            branding={branding}
            defaultSubTab="laporan"
          />
        );
      case 'laporan':
        return (
          <Laporan
            areas={areas}
            equipment={equipment}
            prList={prList}
            vendors={vendors}
            orders={orders}
            barangDatang={barangDatang}
            riwayat={riwayat}
          />
        );
      case 'pengaturan':
        return (
          <Pengaturan
            branding={branding}
            onUpdateBranding={handleUpdateBranding}
            onImportSuccess={() => {
              syncWithDatabase();
              triggerToast('Database berhasil di-restore! Semua data telah sinkron.', 'success');
            }}
          />
        );
      default:
        return (
          <div className="p-8 text-center text-gray-500 font-sans">
            Halaman sedang dalam konstruksi.
          </div>
        );
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      style={{ fontFamily: getFontFamily(branding.font) }}
      className="min-h-screen cyber-bg flex overflow-hidden antialiased text-slate-800 transition-all duration-300"
      id="main-app-container"
    >
      {/* App Sidebar navigation */}
      <Sidebar
        activeTab={activeTab as any}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" id="app-workspace-scroll">
        
        {/* Mobile Sticky Top Navigation Header */}
        <div className="md:hidden bg-[#070b16]/95 backdrop-blur-xl border-b border-cyan-500/30 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <div className="h-8 w-15 rounded-lg bg-cyan-950 border border-cyan-400/60 flex items-center justify-center text-cyan-300 font-black text-[11px] font-mono shadow-[0_0_10px_rgba(0,240,255,0.4)] shrink-0">
              NSR014
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black tracking-tight text-amber-300 uppercase leading-none drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] truncate">CINEMA XXI</p>
              <p className="text-[9px] font-extrabold text-cyan-300 uppercase tracking-wider mt-0.5 truncate">{currentUser.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-400/50 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.3)] shrink-0"
              id="mobile-top-menu-btn"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Sticky Top Navigation Bar across all views */}
        <div className="hidden md:flex items-center justify-between sticky top-0 z-30 bg-[#070b16]/90 backdrop-blur-2xl border-b border-cyan-500/30 px-6 py-2.5 shadow-[0_4px_25px_rgba(0,0,0,0.6)] shrink-0 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-8 w-20 rounded-lg bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-300 font-black text-xs font-mono shadow-[0_0_12px_rgba(0,240,255,0.4)] shrink-0">
              NSR014
            </div>
            <div>
              <span className="text-xs font-black text-amber-300 uppercase tracking-widest font-mono">CINEMA XXI - LIPPO MALL PURI</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-black text-white uppercase tracking-wider font-sans">
                  {
                    activeTab === 'dashboard' ? '📊 Dashboard Utama' :
                    activeTab === 'master-area' ? '📍 Master Area / Zona XXI' :
                    activeTab === 'equipment' ? '🔧 Master Equipment Bioskop' :
                    activeTab === 'pr-engineering' ? '📋 PR Engineering' :
                    activeTab === 'vendor-teknisi' ? '👥 Vendor & Teknisi' :
                    activeTab === 'order-barang' ? '📦 Order Barang Teknik' :
                    activeTab === 'barang-datang' ? '🚚 Log Barang Datang' :
                    activeTab === 'riwayat-equipment' ? '📜 Riwayat Maintenance' :
                    activeTab === 'report-history' ? '📄 Form History Pergantian Unit / Sparepart' :
                    activeTab === 'film-upload' ? '🎞️ Log Film' :
                    '⚙️ Menu System'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Clock, Day, Date, Month & Year HUD Widget - CENTER ROW */}
          <div className="flex-1 flex items-center justify-center" id="top-nav-realtime-widget">
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-[#070f26] via-[#0b1b3d] to-[#070f26] px-4 py-1.5 rounded-xl border-2 border-cyan-400/80 text-cyan-200 shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:border-cyan-300 transition-all">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-950/90 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.5)] shrink-0">
                <Clock className="w-3.5 h-3.5 text-cyan-300 animate-[spin_8s_linear_infinite] drop-shadow-[0_0_6px_#00f0ff]" />
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center font-black tracking-widest text-white text-xs sm:text-sm md:text-[15px] font-['Orbitron',sans-serif]">
                  <span className="bg-black/70 px-1.5 py-0.5 rounded border border-cyan-500/40 text-cyan-300 drop-shadow-[0_0_8px_#00f0ff]">{hours}</span>
                  <span className="text-cyan-400 animate-pulse mx-0.5 font-black">:</span>
                  <span className="bg-black/70 px-1.5 py-0.5 rounded border border-cyan-500/40 text-cyan-300 drop-shadow-[0_0_8px_#00f0ff]">{minutes}</span>
                  <span className="text-cyan-400 animate-pulse mx-0.5 font-black">:</span>
                  <span className="bg-black/70 px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 drop-shadow-[0_0_8px_#34d399]">{seconds}</span>
                  <span className="ml-1 text-[10px] text-cyan-400 font-extrabold">WIB</span>
                </div>
                <span className="text-cyan-500/60 font-black">&bull;</span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold tracking-wider text-slate-100">
                  <span className="text-amber-400 font-black">{dayName.toUpperCase()},</span>
                  <span className="text-emerald-300 font-semibold">{dateNum} {monthName.toUpperCase()} {yearNum}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Logged in user info badge */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs font-mono flex items-center gap-2 text-cyan-300">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-white">{currentUser.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono uppercase">{currentUser.role}</span>
            </div>

            {/* Quick search button */}
            <button
              onClick={() => {
                const searchBtn = document.getElementById('global-search-btn');
                if (searchBtn) searchBtn.click();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-xs font-mono text-cyan-300 hover:border-cyan-400 hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>🔍 Search</span>
              <kbd className="px-1.5 py-0.5 rounded bg-cyan-950 text-[10px] text-cyan-400 border border-cyan-500/40 font-mono">Ctrl + K</kbd>
            </button>

            {/* Desktop Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.3)]"
              id="desktop-top-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Dynamic header customizer with responsive padding matching main content - only rendered on dashboard */}
        {activeTab === 'dashboard' && (
          <div className="px-3 sm:px-6 md:px-8 pt-4 w-full max-w-[100vw] mx-auto">
            <Header branding={branding} saveStatus={saveStatus} onChangeTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
          </div>
        )}

        {/* Tab Canvas Content area with safe margins and responsive containers */}
        <main className="flex-1 px-3 sm:px-6 md:px-8 py-5 w-full max-w-[100vw] mx-auto" id="main-content-view">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Toast Notifications */}
      <div className="fixed bottom-24 right-6 md:bottom-6 md:right-6 z-[60] flex flex-col gap-2.5 max-w-[calc(100%-3rem)] sm:max-w-sm w-full pointer-events-none" id="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl border backdrop-blur-xl flex items-center gap-3 pointer-events-auto animate-slide-in bg-zinc-950/95 shadow-[0_10px_40px_rgba(0,0,0,0.6)] ${
              toast.type === 'success'
                ? 'border-emerald-500/35 text-emerald-400 shadow-emerald-500/5'
                : toast.type === 'error'
                ? 'border-rose-500/35 text-rose-400 shadow-rose-500/5'
                : 'border-amber-500/35 text-amber-400 shadow-amber-500/5'
            }`}
            id={`toast-${toast.id}`}
          >
            <div className={`h-2 w-2 rounded-full flex-shrink-0 animate-pulse ${
              toast.type === 'success'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : toast.type === 'error'
                ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
            }`} />
            <p className="text-xs font-semibold font-sans flex-1 leading-snug">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
