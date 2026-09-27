/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LayoutDashboard,
  Map,
  Wrench,
  ClipboardList,
  Users,
  ShoppingBag,
  PackageCheck,
  History,
  Film,
  Clapperboard,
  FileSpreadsheet,
  FileText,
  BookOpen,
  Brain,
  Settings,
  Menu,
  X,
  Clock,
  Calendar,
  Shield,
  LogOut,
  UserCheck,
  Eye
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserSession } from '../views/Login';

export type TabId =
  | 'dashboard'
  | 'master-area'
  | 'ip-credential-manager'
  | 'equipment'
  | 'pr-engineering'
  | 'vendor-teknisi'
  | 'order-dan-barang-datang'
  | 'order-barang'
  | 'barang-datang'
  | 'riwayat-equipment'
  | 'report-history'
  | 'berita-acara-permintaan'
  | 'sop-knowledge'
  | 'rapot-film'
  | 'film-upload'
  | 'laporan-film'
  | 'laporan'
  | 'pengaturan';

interface SidebarProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  currentUser?: UserSession | null;
  onLogout?: () => void;
}

interface SidebarItem {
  id: TabId;
  label: string;
  icon: any;
  color: string;
}

export default function Sidebar({ activeTab, onChangeTab, isOpen: controlledIsOpen, setIsOpen: controlledSetIsOpen, currentUser, onLogout }: SidebarProps) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
  const setIsOpen = controlledSetIsOpen !== undefined ? controlledSetIsOpen : setLocalIsOpen;

  // Real-time Live Clock State (Jam, Hari, Bulan, Tahun)
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

  const menuItems: SidebarItem[] = [
    { id: 'dashboard', label: 'MENU', icon: LayoutDashboard, color: 'text-cyan-400' },
    { id: 'master-area', label: 'MASTER AREA LMP XXI', icon: Map, color: 'text-amber-400' },
    { id: 'ip-credential-manager', label: 'IP & LOGIN', icon: Shield, color: 'text-cyan-300' },
    { id: 'equipment', label: 'LIST PERALATAN', icon: Wrench, color: 'text-emerald-400' },
    { id: 'pr-engineering', label: 'PR ENGINEERING', icon: ClipboardList, color: 'text-rose-400' },
    { id: 'vendor-teknisi', label: 'SERVICE', icon: Users, color: 'text-blue-400' },
    { id: 'order-dan-barang-datang', label: 'ORDERAN', icon: PackageCheck, color: 'text-amber-300' },
    { id: 'report-history', label: 'RAPOT STD', icon: ClipboardList, color: 'text-amber-400' },
    { id: 'berita-acara-permintaan', label: 'BA ORDERAN', icon: FileText, color: 'text-amber-400' },
    { id: 'sop-knowledge', label: 'KITAB XXI', icon: BookOpen, color: 'text-amber-300' },
    { id: 'rapot-film', label: 'RAPOT FLIM', icon: Film, color: 'text-fuchsia-400' },
    { id: 'pengaturan', label: 'PENGATURAN', icon: Settings, color: 'text-slate-400' }
  ];

  const handleSelect = (id: TabId) => {
    onChangeTab(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Sidebar Shell */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-80 max-w-[88vw] border-r border-cyan-500/30 bg-[#070b16]/95 md:bg-[#070b16]/75 backdrop-blur-2xl transition-transform duration-300 flex flex-col justify-between text-slate-200 h-full max-h-screen md:h-screen md:sticky md:top-0 shadow-[0_0_40px_rgba(0,0,0,0.8)]
          ${isOpen ? 'translate-x-0 shadow-[0_0_60px_rgba(0,0,0,0.95)]' : '-translate-x-full md:translate-x-0'}
        `}
        id="sidebar-container"
      >
        <div className="flex flex-col flex-1 min-h-0 py-3 sm:py-6 overflow-hidden">
          
          {/* Internal Title Emblem & Mobile Close Button */}
          <div className="px-4 sm:px-5 pb-3 sm:pb-6 border-b border-cyan-500/20 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-20 sm:h-12 sm:w-26 rounded-xl bg-cyan-950/40 backdrop-blur-md border-2 border-cyan-400 flex items-center justify-center text-cyan-300 font-black text-sm sm:text-lg font-mono tracking-wider shadow-[0_0_18px_rgba(0,240,255,0.6)] shrink-0">
                NSR014
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-mono font-black text-cyan-400 tracking-widest uppercase truncate">NAVIGASI SISTEM</p>
                <p className="text-base sm:text-xl font-black text-amber-300 font-sans tracking-tight leading-none uppercase drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] mt-0.5 truncate">CINEMA XXI</p>
                <p className="text-[11px] sm:text-sm font-black text-slate-200 tracking-wider font-sans uppercase mt-0.5 truncate">LIPPO MALL PURI</p>
              </div>
            </div>

            {/* Dedicated Close Button for Mobile Drawer */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden h-9 w-9 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400 flex items-center justify-center cursor-pointer shrink-0 transition-all active:scale-95"
              title="Tutup Menu"
              id="sidebar-mobile-close-btn"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          {/* Navigation Links with touch-friendly heights */}
          <nav className="flex-1 space-y-1 sm:space-y-1.5 px-2.5 sm:px-3 py-2 sm:py-3 overflow-y-auto touch-scroll min-h-0" id="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === 'order-dan-barang-datang' && (activeTab === 'order-barang' || activeTab === 'barang-datang'));
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base md:text-lg font-extrabold tracking-wide transition-all duration-200 group cursor-pointer border min-h-[46px]
                    ${isActive
                      ? 'bg-gradient-to-r from-cyan-500/35 via-blue-600/35 to-cyan-500/20 backdrop-blur-md text-white shadow-[0_0_25px_rgba(0,240,255,0.35)] border-cyan-400 scale-[1.01]'
                      : 'border-transparent text-slate-200 hover:bg-cyan-950/40 hover:text-cyan-300 hover:border-cyan-500/30 hover:backdrop-blur-sm'
                    }
                  `}
                  id={`sidebar-item-${item.id}`}
                >
                  <Icon
                    className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-white drop-shadow-[0_0_8px_#00f0ff]' : item.color
                    }`}
                  />
                  <span className="truncate text-left">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-cyan-300 shadow-[0_0_10px_#00f0ff] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info brand */}
        <div className="p-3 sm:p-3.5 border-t border-cyan-500/15 bg-black/40 backdrop-blur-md text-center text-[10px] sm:text-xs md:text-sm font-mono text-slate-300 shrink-0">
          <p className="font-bold">© 2026 NSR014 CINEMA XXI</p>
          <p className="mt-0.5 text-cyan-400 font-extrabold tracking-wider uppercase drop-shadow-[0_0_6px_rgba(0,240,255,0.3)]">ENGINEERING MANAGEMENT</p>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden transition-opacity"
          id="mobile-sidebar-backdrop"
        />
      )}
    </>
  );
}
