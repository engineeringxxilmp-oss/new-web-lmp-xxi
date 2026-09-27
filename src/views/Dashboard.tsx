/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TabId } from '../components/Sidebar';
import { Area, Equipment, PrEngineering, VendorTeknisi, OrderBarang, BarangDatang } from '../types';
import {
  Wrench,
  CheckCircle,
  AlertTriangle,
  Flame,
  ClipboardList,
  Users,
  ShoppingBag,
  PackageCheck,
  Activity
} from 'lucide-react';

interface DashboardProps {
  areas: Area[];
  equipment: Equipment[];
  prList: PrEngineering[];
  vendors: VendorTeknisi[];
  orders: OrderBarang[];
  barangDatang: BarangDatang[];
  onSelectTab: (tab: TabId) => void;
}

export default function Dashboard({
  areas,
  equipment,
  prList,
  vendors,
  orders,
  barangDatang,
  onSelectTab
}: DashboardProps) {
  // Calculate real metrics from props
  const totalEquipment = equipment.length;
  const normalEquipment = equipment.filter((e) => e.status === 'Normal').length;
  const maintenanceEquipment = equipment.filter((e) => e.status === 'Maintenance').length;
  const rusakEquipment = equipment.filter((e) => e.status === 'Rusak').length;

  const openPr = prList.filter((p) => p.status !== 'Selesai').length;
  const pendingVendors = vendors.filter((v) => v.status !== 'Selesai').length;
  const activeOrders = orders.length;
  const incomingBarang = barangDatang.filter((b) => b.status !== 'Sudah Datang').length;

  // Helper to lookup area name
  const getAreaName = (areaId: string) => {
    const found = areas.find((a) => a.id === areaId);
    return found ? found.name : 'Area Umum';
  };

  // Generate custom sparkline path strings
  const generateSparklinePath = (seed: number, variant: 'up' | 'down' | 'wavy') => {
    const points = [];
    const count = 12;
    for (let i = 0; i <= count; i++) {
      const x = (i / count) * 90;
      let y = 18;
      if (variant === 'up') {
        y = 30 - (i * 2) - Math.sin(i * 1.5 + seed) * 4;
      } else if (variant === 'down') {
        y = 10 + (i * 1.6) + Math.sin(i * 1.5 + seed) * 4;
      } else {
        y = 18 + Math.sin(i * 1.1 + seed) * 8 + Math.cos(i * 2 + seed) * 3;
      }
      points.push(`${x},${y}`);
    }
    return `M ${points.join(' L ')}`;
  };

  return (
    <div className="space-y-6 animate-slide-in relative z-10 text-slate-900 font-sans pb-8" id="command-center-root">
      
      {/* Background Aesthetic Layer */}
      <div className="absolute inset-0 bg-transparent pointer-events-none overflow-hidden -z-20">
        <div className="absolute top-10 left-10 w-[450px] h-[450px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[160px]" />
      </div>

      {/* ==================== SECTION 1: OPERATIONAL CARDS (8 METRIC TILES) ==================== */}
      <div className="space-y-3" id="section-operational-cards">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold tracking-wider font-mono">
          <Activity className="h-4 w-4 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
          <span>METRIKS OPERASIONAL DAN STATISTIK UTAMA</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Total Equipment */}
          <div
            onClick={() => onSelectTab('equipment')}
            className="bg-[#0d1322]/90 backdrop-blur-md border border-cyan-500/25 group p-3.5 sm:p-5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:border-cyan-400 hover:-translate-y-0.5 text-white"
            id="op-card-total-eq"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-cyan-400 group-hover:text-cyan-300 transition-colors font-mono truncate">
                  TOTAL ALAT
                </h4>
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-cyan-400 tracking-tight leading-none mt-1 drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                  {totalEquipment}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-cyan-950/80 text-cyan-400 rounded-xl group-hover:scale-105 transition-transform border border-cyan-500/30 shadow-[0_0_8px_rgba(0,240,255,0.2)] shrink-0">
                <Wrench className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
            
            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
              <div className="flex-1 max-w-[60px] sm:max-w-[80px]">
                <svg className="w-full h-6 sm:h-7 text-cyan-400 opacity-80" viewBox="0 0 90 35">
                  <path d={generateSparklinePath(1.1, 'wavy')} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-right text-xs sm:text-sm shrink-0">
                <span className="text-emerald-400 font-black block leading-none font-mono text-sm sm:text-base">100.0%</span>
                <span className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-extrabold block mt-0.5 sm:mt-1 font-mono tracking-wide">OPERASIONAL</span>
              </div>
            </div>
          </div>

          {/* Card 2: Equipment Normal */}
          <div
            onClick={() => onSelectTab('equipment')}
            className="bg-[#0d1322]/90 backdrop-blur-md border border-cyan-500/25 group p-3.5 sm:p-5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:border-emerald-400 hover:-translate-y-0.5 text-white"
            id="op-card-normal-eq"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-emerald-400 group-hover:text-emerald-300 transition-colors font-mono truncate">
                  ALAT NORMAL
                </h4>
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-emerald-400 tracking-tight leading-none mt-1 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]">
                  {normalEquipment}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-emerald-950/80 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)] shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
              <div className="flex-1 max-w-[60px] sm:max-w-[80px]">
                <svg className="w-full h-6 sm:h-7 text-emerald-400 opacity-80" viewBox="0 0 90 35">
                  <path d={generateSparklinePath(1.5, 'up')} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-right text-xs sm:text-sm shrink-0">
                <span className="text-emerald-400 font-black block leading-none font-mono text-sm sm:text-base">
                  {totalEquipment > 0 ? ((normalEquipment / totalEquipment) * 100).toFixed(1) : '0'}%
                </span>
                <span className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-extrabold block mt-0.5 sm:mt-1 font-mono tracking-wide">KONDISI BAIK</span>
              </div>
            </div>
          </div>

          {/* Card 3: Equipment Maintenance */}
          <div
            onClick={() => onSelectTab('equipment')}
            className="bg-[#0d1322]/90 backdrop-blur-md border border-cyan-500/25 group p-3.5 sm:p-5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:border-amber-400 hover:-translate-y-0.5 text-white"
            id="op-card-maint-eq"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-amber-400 group-hover:text-amber-300 transition-colors font-mono truncate">
                  PEMELIHARAAN
                </h4>
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-amber-400 tracking-tight leading-none mt-1 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]">
                  {maintenanceEquipment}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-amber-950/80 text-amber-400 rounded-xl group-hover:scale-105 transition-transform border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)] shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
              <div className="flex-1 max-w-[60px] sm:max-w-[80px]">
                <svg className="w-full h-6 sm:h-7 text-amber-400 opacity-80" viewBox="0 0 90 35">
                  <path d={generateSparklinePath(2.2, 'wavy')} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-right text-xs sm:text-sm shrink-0">
                <span className="text-amber-400 font-black block leading-none font-mono text-sm sm:text-base">
                  {totalEquipment > 0 ? ((maintenanceEquipment / totalEquipment) * 100).toFixed(1) : '0'}%
                </span>
                <span className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-extrabold block mt-0.5 sm:mt-1 font-mono tracking-wide">MAINTENANCE</span>
              </div>
            </div>
          </div>

          {/* Card 4: Equipment Damage */}
          <div
            onClick={() => onSelectTab('equipment')}
            className="bg-[#0d1322]/90 backdrop-blur-md border border-cyan-500/25 group p-3.5 sm:p-5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:shadow-[0_0_20px_rgba(244,63,94,0.25)] hover:border-rose-400 hover:-translate-y-0.5 text-white"
            id="op-card-dmg-eq"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-rose-400 group-hover:text-rose-300 transition-colors font-mono truncate">
                  ALAT RUSAK
                </h4>
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-rose-400 tracking-tight leading-none mt-1 drop-shadow-[0_0_10px_rgba(251,113,133,0.4)]">
                  {rusakEquipment}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-rose-950/80 text-rose-400 rounded-xl group-hover:scale-105 transition-transform border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)] shrink-0">
                <Flame className="h-4 w-4 sm:h-6 sm:w-6 animate-pulse" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
              <div className="flex-1 max-w-[60px] sm:max-w-[80px]">
                <svg className="w-full h-6 sm:h-7 text-rose-400 opacity-80" viewBox="0 0 90 35">
                  <path d={generateSparklinePath(2.8, 'down')} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-right text-xs sm:text-sm shrink-0">
                <span className="text-rose-400 font-black block leading-none font-mono text-sm sm:text-base">
                  {totalEquipment > 0 ? ((rusakEquipment / totalEquipment) * 100).toFixed(1) : '0'}%
                </span>
                <span className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-extrabold block mt-0.5 sm:mt-1 font-mono tracking-wide">BUTUH PERBAIKAN</span>
              </div>
            </div>
          </div>

          {/* Card 5: Vendor Visit */}
          <div
            onClick={() => onSelectTab('vendor-teknisi')}
            className="bg-[#0d1322]/90 backdrop-blur-md border border-cyan-500/25 group p-3.5 sm:p-5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:border-sky-400 hover:-translate-y-0.5 text-white"
            id="op-card-vendor"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-sky-400 group-hover:text-sky-300 transition-colors font-mono truncate">
                  KUNJUNGAN VENDOR
                </h4>
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-sky-400 tracking-tight leading-none mt-1 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]">
                  {pendingVendors}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-sky-950/80 text-sky-400 rounded-xl group-hover:scale-105 transition-transform border border-sky-500/30 shadow-[0_0_8px_rgba(56,189,248,0.2)] shrink-0">
                <Users className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
              <div className="flex-1 max-w-[60px] sm:max-w-[80px]">
                <svg className="w-full h-6 sm:h-7 text-sky-400 opacity-80" viewBox="0 0 90 35">
                  <path d={generateSparklinePath(3.1, 'wavy')} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-right text-xs sm:text-sm shrink-0">
                <span className="text-sky-400 font-black block leading-none font-mono text-sm sm:text-base">TERJADWAL</span>
                <span className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-extrabold block mt-0.5 sm:mt-1 font-mono tracking-wide">DIKERJAKAN</span>
              </div>
            </div>
          </div>

          {/* Card 6: Open PR */}
          <div
            onClick={() => onSelectTab('pr-engineering')}
            className="bg-[#0d1322]/90 backdrop-blur-md border border-cyan-500/25 group p-3.5 sm:p-5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:shadow-[0_0_20px_rgba(192,132,252,0.2)] hover:border-purple-400 hover:-translate-y-0.5 text-white"
            id="op-card-pr"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-purple-400 group-hover:text-purple-300 transition-colors font-mono truncate">
                  PR ENGINEERING
                </h4>
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-purple-400 tracking-tight leading-none mt-1 drop-shadow-[0_0_10px_rgba(192,132,252,0.4)]">
                  {openPr}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-950/80 text-purple-400 rounded-xl group-hover:scale-105 transition-transform border border-purple-500/30 shadow-[0_0_8px_rgba(192,132,252,0.2)] shrink-0">
                <ClipboardList className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
              <div className="flex-1 max-w-[60px] sm:max-w-[80px]">
                <svg className="w-full h-6 sm:h-7 text-purple-400 opacity-80" viewBox="0 0 90 35">
                  <path d={generateSparklinePath(3.5, 'wavy')} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-right text-xs sm:text-sm shrink-0">
                <span className="text-purple-400 font-black block leading-none font-mono text-sm sm:text-base">AKTIF</span>
                <span className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-extrabold block mt-0.5 sm:mt-1 font-mono tracking-wide">DAFTAR ANTRIAN</span>
              </div>
            </div>
          </div>

          {/* Card 7: Orders */}
          <div
            onClick={() => onSelectTab('order-barang')}
            className="bg-[#0d1322]/90 backdrop-blur-md border border-cyan-500/25 group p-3.5 sm:p-5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:border-amber-400 hover:-translate-y-0.5 text-white"
            id="op-card-orders"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-amber-400 group-hover:text-amber-300 transition-colors font-mono truncate">
                  PESANAN BARANG
                </h4>
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-amber-400 tracking-tight leading-none mt-1 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]">
                  {activeOrders}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-amber-950/80 text-amber-400 rounded-xl group-hover:scale-105 transition-transform border border-amber-500/30 shadow-[0_0_8px_rgba(251,191,36,0.2)] shrink-0">
                <ShoppingBag className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
              <div className="flex-1 max-w-[60px] sm:max-w-[80px]">
                <svg className="w-full h-6 sm:h-7 text-amber-400 opacity-80" viewBox="0 0 90 35">
                  <path d={generateSparklinePath(4.1, 'up')} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-right text-xs sm:text-sm shrink-0">
                <span className="text-amber-400 font-black block leading-none font-mono text-sm sm:text-base">PROSES</span>
                <span className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-extrabold block mt-0.5 sm:mt-1 font-mono tracking-wide">LOGISTIK</span>
              </div>
            </div>
          </div>

          {/* Card 8: Incoming Goods */}
          <div
            onClick={() => onSelectTab('barang-datang')}
            className="bg-[#0d1322]/90 backdrop-blur-md border border-cyan-500/25 group p-3.5 sm:p-5 rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.05)] hover:shadow-[0_0_20px_rgba(45,212,191,0.2)] hover:border-teal-400 hover:-translate-y-0.5 text-white"
            id="op-card-incoming"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-teal-400 group-hover:text-teal-300 transition-colors font-mono truncate">
                  BARANG DATANG
                </h4>
                <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-teal-400 tracking-tight leading-none mt-1 drop-shadow-[0_0_10px_rgba(45,212,191,0.4)]">
                  {incomingBarang}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-teal-950/80 text-teal-400 rounded-xl group-hover:scale-105 transition-transform border border-teal-500/30 shadow-[0_0_8px_rgba(45,212,191,0.2)] shrink-0">
                <PackageCheck className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-cyan-500/15 flex items-center justify-between gap-2">
              <div className="flex-1 max-w-[60px] sm:max-w-[80px]">
                <svg className="w-full h-6 sm:h-7 text-teal-400 opacity-80" viewBox="0 0 90 35">
                  <path d={generateSparklinePath(4.6, 'wavy')} fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-right text-xs sm:text-sm shrink-0">
                <span className="text-teal-400 font-black block leading-none font-mono text-sm sm:text-base">PERJALANAN</span>
                <span className="text-slate-300 text-[10px] sm:text-xs md:text-sm font-extrabold block mt-0.5 sm:mt-1 font-mono tracking-wide">INBOUND SHIP</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
