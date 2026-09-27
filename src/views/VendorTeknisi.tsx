/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VendorTeknisi, Area, VendorCategory, VendorStatus, SystemBranding } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Check,
  Clock,
  ShieldCheck,
  Calendar,
  Hourglass,
  BarChart3,
  MapPin,
  ChevronDown,
  CheckCircle2,
  Download,
  Filter,
  Search,
  Wrench,
  Fan,
  Building2,
  X
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { getIndonesianDate, toISODate } from './PrEngineering';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper functions for automatic duration calculation
function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const isoDate = toISODate(dateStr);
  if (!isoDate) return null;
  const time = timeStr || '00:00';
  const d = new Date(`${isoDate}T${time}:00`);
  return isNaN(d.getTime()) ? null : d;
}

function getDurationMinutes(startDateStr: string, endDateStr: string, startTimeStr: string, endTimeStr: string): number {
  const start = parseDateTime(startDateStr, startTimeStr);
  const end = parseDateTime(endDateStr || startDateStr, endTimeStr);
  if (!start || !end) return 0;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / (1000 * 60));
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 Menit';
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} Hari`);
  if (hours > 0) parts.push(`${hours} Jam`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} Menit`);

  return parts.join(' ');
}

function countUniqueMonths(vendorsList: VendorTeknisi[]): number {
  const monthsSet = new Set<string>();
  vendorsList.forEach((v) => {
    const isoDate = toISODate(v.tanggal);
    if (isoDate) {
      const monthPart = isoDate.substring(0, 7); // YYYY-MM
      monthsSet.add(monthPart);
    }
  });
  return monthsSet.size || 0;
}

// Normalize vendor category
export function normalizeVendorCategory(v: VendorTeknisi): VendorCategory {
  if (v.category) return v.category;
  const text = `${v.namaVendor} ${v.namaTeknisi} ${v.hasilPekerjaan}`.toUpperCase();
  if (text.includes('AC') || text.includes('DAIKIN') || text.includes('CHILLER') || text.includes('HVAC') || text.includes('COOLING')) {
    return 'SERVICE AC';
  }
  if (
    text.includes('CHRISTIE') ||
    text.includes('BARCO') ||
    text.includes('NEC') ||
    text.includes('PROJECTOR') ||
    text.includes('DOLBY') ||
    text.includes('SOUND') ||
    text.includes('OPR') ||
    text.includes('SERVER') ||
    text.includes('AUDIO')
  ) {
    return 'SERVICE OPR';
  }
  return 'SERVICE TEKNIK';
}

interface VendorTeknisiProps {
  vendors: VendorTeknisi[];
  areas: Area[];
  branding?: SystemBranding;
  onSave: (v: VendorTeknisi) => void;
  onDelete: (id: string) => void;
}

export default function VendorTeknisiView({ vendors, areas, branding, onSave, onDelete }: VendorTeknisiProps) {
  // Category Filter
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | VendorCategory>('ALL');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorTeknisi | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSavedVendorId, setLastSavedVendorId] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState<VendorCategory>('SERVICE TEKNIK');
  const [namaVendor, setNamaVendor] = useState('');
  const [namaTeknisi, setNamaTeknisi] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [jamMulai, setJamMulai] = useState('');
  const [jamSelesai, setJamSelesai] = useState('');
  const [areaId, setAreaId] = useState('');
  const [hasilPekerjaan, setHasilPekerjaan] = useState('');
  const [status, setStatus] = useState<VendorStatus>('Belum');
  const [siapaYangNemenin, setSiapaYangNemenin] = useState('TEKNIK');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quick status change with auto-save
  const handleQuickChangeVendorStatus = (v: VendorTeknisi, newStatus: VendorStatus) => {
    const updated: VendorTeknisi = {
      ...v,
      status: newStatus,
      tanggalSelesai:
        newStatus === 'Selesai'
          ? v.tanggalSelesai?.trim()
            ? v.tanggalSelesai
            : getIndonesianDate()
          : v.tanggalSelesai || v.tanggal
    };
    onSave(updated);
    setLastSavedVendorId(v.id);
    setTimeout(() => {
      setLastSavedVendorId((prev) => (prev === v.id ? null : prev));
    }, 2000);
  };

  const openAddModal = (initialCat?: VendorCategory) => {
    setEditingVendor(null);
    setCategory(initialCat || (selectedCategory !== 'ALL' ? selectedCategory : 'SERVICE TEKNIK'));
    setNamaVendor('');
    setNamaTeknisi('');
    setTanggal(getIndonesianDate());
    setTanggalSelesai(getIndonesianDate());
    setJamMulai('08:00');
    setJamSelesai('12:00');
    setAreaId(areas[0]?.id || '');
    setHasilPekerjaan('');
    setStatus('Belum');
    setSiapaYangNemenin('TEKNIK');
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (v: VendorTeknisi) => {
    setEditingVendor(v);
    setCategory(normalizeVendorCategory(v));
    setNamaVendor(v.namaVendor);
    setNamaTeknisi(v.namaTeknisi);
    setTanggal(v.tanggal);
    setTanggalSelesai(v.tanggalSelesai || v.tanggal);
    setJamMulai(v.jamMulai);
    setJamSelesai(v.jamSelesai);
    setAreaId(v.areaId);
    setHasilPekerjaan(v.hasilPekerjaan);
    setStatus(v.status);
    setSiapaYangNemenin(v.siapaYangNemenin || 'TEKNIK');
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!namaVendor.trim()) newErrors.namaVendor = 'Nama Vendor wajib diisi.';
    if (!namaTeknisi.trim()) newErrors.namaTeknisi = 'Nama Teknisi wajib diisi.';
    if (!tanggal.trim()) newErrors.tanggal = 'Tanggal mulai wajib diisi.';
    if (!tanggalSelesai.trim()) newErrors.tanggalSelesai = 'Tanggal selesai wajib diisi.';
    if (!jamMulai.trim()) newErrors.jamMulai = 'Jam Mulai wajib diisi (e.g. 08:00).';
    if (!jamSelesai.trim()) newErrors.jamSelesai = 'Jam Selesai wajib diisi (e.g. 13:30).';
    if (!areaId) newErrors.areaId = 'Wajib memilih area pekerjaan.';

    // Validate 24h format HH:MM
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (jamMulai && !timeRegex.test(jamMulai)) {
      newErrors.jamMulai = 'Format harus 24 jam (Contoh: 08:30)';
    }
    if (jamSelesai && !timeRegex.test(jamSelesai)) {
      newErrors.jamSelesai = 'Format harus 24 jam (Contoh: 14:15)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const vendorPayload: VendorTeknisi = {
      id: editingVendor ? editingVendor.id : `ven-${Date.now()}`,
      category,
      namaVendor: namaVendor.trim(),
      namaTeknisi: namaTeknisi.trim(),
      tanggal: tanggal.trim(),
      tanggalSelesai: tanggalSelesai.trim(),
      jamMulai: jamMulai.trim(),
      jamSelesai: jamSelesai.trim(),
      areaId,
      hasilPekerjaan: hasilPekerjaan.trim(),
      status,
      siapaYangNemenin
    };

    onSave(vendorPayload);
    setIsModalOpen(false);
  };

  const triggerDelete = (id: string) => {
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      onDelete(deletingId);
      setDeletingId(null);
    }
  };

  const getAreaName = (id: string) => {
    return areas.find((a) => a.id === id)?.name || 'Tanpa Area';
  };

  // Filtered List
  const filteredVendors = vendors.filter((v) => {
    const normCat = normalizeVendorCategory(v);
    if (selectedCategory !== 'ALL' && normCat !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const area = getAreaName(v.areaId).toLowerCase();
      return (
        v.namaVendor.toLowerCase().includes(q) ||
        v.namaTeknisi.toLowerCase().includes(q) ||
        v.hasilPekerjaan.toLowerCase().includes(q) ||
        area.includes(q) ||
        (v.siapaYangNemenin || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Category counts
  const countTeknik = vendors.filter((v) => normalizeVendorCategory(v) === 'SERVICE TEKNIK').length;
  const countAc = vendors.filter((v) => normalizeVendorCategory(v) === 'SERVICE AC').length;
  const countOpr = vendors.filter((v) => normalizeVendorCategory(v) === 'SERVICE OPR').length;

  const renderCategoryBadge = (cat: VendorCategory) => {
    if (cat === 'SERVICE OPR') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-black border bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/50 flex items-center gap-1.5 shadow-[0_0_8px_rgba(217,70,239,0.3)]">
          <Wrench className="w-3.5 h-3.5 text-fuchsia-400" /> SERVICE OPR
        </span>
      );
    }
    if (cat === 'SERVICE AC') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-black border bg-cyan-950/80 text-cyan-300 border-cyan-500/50 flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,240,255,0.3)]">
          <Fan className="w-3.5 h-3.5 text-cyan-400" /> SERVICE AC
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-md text-xs font-black border bg-amber-950/80 text-amber-300 border-amber-500/50 flex items-center gap-1.5 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
        <Building2 className="w-3.5 h-3.5 text-amber-400" /> SERVICE TEKNIK
      </span>
    );
  };

  const renderVendorStatusSelect = (v: VendorTeknisi) => {
    const norm = (s: string): VendorStatus => {
      if (s === 'Selesai') return 'Selesai';
      if (s === 'On Progress' || s === 'Sedang Di Proses' || s === 'Sedang Diproses') return 'Sedang Di Proses';
      return 'Belum Di Kerjakan';
    };

    const currentVal = norm(v.status);
    const isRecentlySaved = lastSavedVendorId === v.id;

    const colorStyles: Record<string, string> = {
      'Belum Di Kerjakan':
        'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:border-rose-400 focus:ring-rose-400/50',
      'Sedang Di Proses':
        'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:border-amber-400 focus:ring-amber-400/50',
      'Selesai':
        'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:border-emerald-400 focus:ring-emerald-400/50'
    };

    const chevronColor: Record<string, string> = {
      'Belum Di Kerjakan': 'text-rose-400',
      'Sedang Di Proses': 'text-amber-400',
      'Selesai': 'text-emerald-400'
    };

    return (
      <div className="inline-flex items-center gap-2">
        <div className="relative inline-flex items-center group">
          <select
            value={currentVal}
            onChange={(e) => {
              const newStatus = e.target.value as VendorStatus;
              handleQuickChangeVendorStatus(v, newStatus);
            }}
            className={`appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs md:text-sm font-mono font-black border cursor-pointer transition-all duration-200 focus:outline-hidden focus:ring-2 select-vendor-status-dropdown ${
              colorStyles[currentVal] || colorStyles['Belum Di Kerjakan']
            }`}
            title="Pilih opsi: Belum Di Kerjakan, Sedang Di Proses, Selesai (Tersimpan Otomatis)"
            id={`select-status-vendor-${v.id}`}
          >
            <option value="Belum Di Kerjakan" className="bg-slate-900 text-rose-400 font-bold">
              Belum Dikerjakan
            </option>
            <option value="Sedang Di Proses" className="bg-slate-900 text-amber-400 font-bold">
              Sedang Diproses
            </option>
            <option value="Selesai" className="bg-slate-900 text-emerald-400 font-bold">
              Selesai
            </option>
          </select>
          <div className="absolute right-2.5 pointer-events-none flex items-center">
            <ChevronDown
              className={`w-3.5 h-3.5 ${chevronColor[currentVal] || 'text-rose-400'} transition-transform group-hover:translate-y-0.5`}
            />
          </div>
        </div>

        {isRecentlySaved && (
          <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> Tersimpan
          </span>
        )}
      </div>
    );
  };

  // PDF Exporter per category
  const handleExportPdf = (targetCategory: VendorCategory) => {
    const list = vendors.filter((v) => normalizeVendorCategory(v) === targetCategory);

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const cinemaTitle = branding?.title || 'CINEMA XXI';
    const cinemaSubtitle = branding?.subtitle || 'LIPPO MALL PURI';
    const reportDate = getIndonesianDate();

    // Top Header Banner
    doc.setFillColor(13, 19, 34); // #0d1322
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(0, 240, 255); // Cyan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${cinemaTitle} - ${cinemaSubtitle}`, 14, 11);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(`LOG KUNJUNGAN SERVICE VENDOR — ${targetCategory}`, 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`Dicetak: ${reportDate}`, 283, 15, { align: 'right' });

    // Table
    const tableData = list.map((v, idx) => {
      const area = getAreaName(v.areaId);
      const durationMins = getDurationMinutes(v.tanggal, v.tanggalSelesai || v.tanggal, v.jamMulai, v.jamSelesai);
      const durationStr = formatDuration(durationMins);
      const jadwalStr = `${v.tanggal} (${v.jamMulai} - ${v.jamSelesai})`;

      return [
        idx + 1,
        `${v.namaVendor}\nTeknisi: ${v.namaTeknisi}`,
        area,
        jadwalStr,
        durationStr,
        v.siapaYangNemenin || 'TEKNIK',
        v.status,
        v.hasilPekerjaan || '-'
      ];
    });

    autoTable(doc, {
      startY: 30,
      margin: { left: 14, right: 14 },
      tableLineWidth: 0.25,
      tableLineColor: [0, 0, 0],
      head: [['NO', 'VENDOR & TEKNISI', 'AREA KERJA', 'JADWAL KUNJUNGAN', 'DURASI', 'PENDAMPING', 'STATUS', 'CATATAN / HASIL KERJA']],
      body: tableData.length > 0 ? tableData : [['-', '-', `Tidak ada log ${targetCategory}`, '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: {
        fillColor: targetCategory === 'SERVICE OPR' ? [192, 38, 211] : targetCategory === 'SERVICE AC' ? [8, 145, 178] : [217, 119, 6],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        minCellHeight: 10
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        valign: 'middle',
        minCellHeight: 9
      },
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        textColor: [0, 0, 0],
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 42 },
        4: { halign: 'center', cellWidth: 24 },
        5: { halign: 'center', cellWidth: 26 },
        6: { halign: 'center', cellWidth: 25 },
        7: { cellWidth: 'auto' }
      }
    });

    // Signature Footer
    const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : 160;
    const pageHeight = doc.internal.pageSize.getHeight();
    const sigY = finalY > pageHeight - 40 ? pageHeight - 35 : finalY;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    doc.text('Vendor Pelaksana,', 30, sigY);
    doc.text('Teknisi Lapangan', 30, sigY + 5);
    doc.text('( ............................................. )', 30, sigY + 22);

    doc.text('Diterima / Didampingi,', 130, sigY);
    doc.text('Staff Engineering XXI', 130, sigY + 5);
    doc.text('( ............................................. )', 130, sigY + 22);

    doc.text('Mengetahui,', 220, sigY);
    doc.text('Cinema Manager XXI', 220, sigY + 5);
    doc.text('( ............................................. )', 220, sigY + 22);

    doc.save(`Laporan_${targetCategory.replace(/\s+/g, '_')}_${reportDate.replace(/\s+/g, '_')}.pdf`);
  };

  // Duration analytics
  const totalMinsAll = vendors.reduce((sum, v) => {
    return sum + getDurationMinutes(v.tanggal, v.tanggalSelesai || v.tanggal, v.jamMulai, v.jamSelesai);
  }, 0);

  const minsInHour = 60;
  const minsInDay = 24 * 60;
  const minsInMonth = 30 * 24 * 60;

  let tempMins = totalMinsAll;
  const totalMonths = Math.floor(tempMins / minsInMonth);
  tempMins %= minsInMonth;
  const totalDays = Math.floor(tempMins / minsInDay);
  tempMins %= minsInDay;
  const totalHours = Math.floor(tempMins / minsInHour);
  const totalRemainingMinutes = tempMins % minsInHour;

  const totalSessions = vendors.length;
  const uniqueMonths = countUniqueMonths(vendors);
  const totalDaysConverted = (totalMinsAll / (24 * 60)).toFixed(1);
  const totalMonthsConverted = (totalMinsAll / (30 * 24 * 60)).toFixed(2);

  return (
    <div className="space-y-6" id="vendor-teknisi-tab-view">
      {/* Intro Header */}
      <div className="bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-950/80 text-blue-300 font-mono text-[11px] font-bold border border-blue-500/40 uppercase tracking-widest">
                CINEMA XXI VENDOR LOG & SERVICE
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              <Users className="h-7 w-7 text-blue-400 drop-shadow-[0_0_8px_#60a5fa]" />
              SERVICE
            </h2>
            <p className="text-sm md:text-base text-slate-200 mt-1 font-sans">
              Log aktivitas service vendor external, pemeliharaan berkala, dan penugasan spesialis dalam 3 kategori: SERVICE TEKNIK, SERVICE AC, dan SERVICE OPR.
            </p>
          </div>

          {/* Action Buttons: Add Log & Export PDF */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1.5 bg-[#080d1a] p-1.5 rounded-2xl border border-cyan-500/30 shadow-inner">
              <button
                onClick={() => handleExportPdf('SERVICE TEKNIK')}
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-amber-300 hover:bg-amber-950/80 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Cetak PDF SERVICE TEKNIK"
              >
                <Download className="w-3.5 h-3.5" /> PDF TEKNIK
              </button>
              <button
                onClick={() => handleExportPdf('SERVICE AC')}
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-950/80 border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Cetak PDF SERVICE AC"
              >
                <Download className="w-3.5 h-3.5" /> PDF AC
              </button>
              <button
                onClick={() => handleExportPdf('SERVICE OPR')}
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-fuchsia-300 hover:bg-fuchsia-950/80 border border-fuchsia-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Cetak PDF SERVICE OPR"
              >
                <Download className="w-3.5 h-3.5" /> PDF OPR
              </button>
            </div>

            <button
              onClick={() => openAddModal()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-3 text-sm md:text-base font-bold text-white hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] cursor-pointer shrink-0 border border-blue-400/40"
              id="btn-add-vendor"
            >
              <Plus className="h-5 w-5" /> Tambah Log Kerja
            </button>
          </div>
        </div>

        {/* 3 Categories Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-6 pt-5 border-t border-cyan-500/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-cyan-400" /> Kategori:
            </span>

            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'bg-[#080d1a] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              Semua ({vendors.length})
            </button>

            <button
              onClick={() => setSelectedCategory('SERVICE TEKNIK')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'SERVICE TEKNIK'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                  : 'bg-[#080d1a] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>SERVICE TEKNIK ({countTeknik})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('SERVICE AC')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'SERVICE AC'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                  : 'bg-[#080d1a] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <Fan className="w-3.5 h-3.5 text-cyan-400" />
              <span>SERVICE AC ({countAc})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('SERVICE OPR')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'SERVICE OPR'
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/60 shadow-[0_0_10px_rgba(217,70,239,0.25)]'
                  : 'bg-[#080d1a] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>SERVICE OPR ({countOpr})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari vendor, teknisi, area, pendamping..."
              className="w-full bg-[#080d1a] border border-cyan-500/30 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
            />
          </div>
        </div>
      </div>

      {/* Kunjungan Duration Analytics Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="vendor-duration-stats">
        <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300">
          <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40 group-hover:scale-105 transition-transform">
            <Hourglass className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-xs sm:text-sm font-black text-amber-400 tracking-wider uppercase font-mono">
            Total Akumulasi Waktu
          </p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 font-sans tracking-tight">
            {totalMonths > 0 ? `${totalMonths} Bln ` : ''}
            {totalDays > 0 ? `${totalDays} Hari ` : ''}
            {totalHours > 0 ? `${totalHours} Jam` : totalRemainingMinutes > 0 ? `${totalRemainingMinutes} Mnt` : '0 Jam'}
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-300 font-bold font-sans">
            <span>Detail Waktu</span>
            <span className="font-extrabold font-mono text-cyan-300">
              {totalMonths}m {totalDays}d {totalHours}h {totalRemainingMinutes}m
            </span>
          </div>
        </div>

        <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
          <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/40 group-hover:scale-105 transition-transform">
            <Calendar className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-xs sm:text-sm font-black text-blue-400 tracking-wider uppercase font-mono">
            Total Hari Kunjungan
          </p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 font-sans tracking-tight">
            {totalDaysConverted} <span className="text-base font-extrabold text-slate-300 uppercase font-mono">Hari</span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-300 font-bold font-sans">
            <span>Perkiraan Bulan</span>
            <span className="font-extrabold font-mono text-cyan-300">~{totalMonthsConverted} Bulan</span>
          </div>
        </div>

        <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
          <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 group-hover:scale-105 transition-transform">
            <Clock className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-xs sm:text-sm font-black text-emerald-400 tracking-wider uppercase font-mono">
            Total Jam Kunjungan
          </p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 font-sans tracking-tight">
            {Math.floor(totalMinsAll / 60).toLocaleString('id-ID')}{' '}
            <span className="text-base font-extrabold text-slate-300 uppercase font-mono">Jam</span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-300 font-bold font-sans">
            <span>Sisa Menit</span>
            <span className="font-extrabold font-mono text-cyan-300">{totalMinsAll % 60} Menit</span>
          </div>
        </div>

        <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
          <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/40 group-hover:scale-105 transition-transform">
            <BarChart3 className="h-6 w-6 text-purple-400" />
          </div>
          <p className="text-xs sm:text-sm font-black text-purple-400 tracking-wider uppercase font-mono">
            Siklus & Frekuensi
          </p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2 font-sans tracking-tight">
            {uniqueMonths} <span className="text-base font-extrabold text-slate-300 uppercase font-mono">Bulan Aktif</span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-300 font-bold font-sans">
            <span>Sesi Kunjungan</span>
            <span className="font-extrabold font-mono text-cyan-300">{totalSessions} Kali Visit</span>
          </div>
        </div>
      </div>

      {/* List Table */}
      <div className="bg-[#0a0f1d]/80 rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="px-4 sm:px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-blue-400" />
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
              Log Service & Kunjungan Vendor ({filteredVendors.length})
            </span>
          </div>
          <span className="text-xs md:text-sm font-mono text-cyan-400 font-extrabold">
            KATEGORI: {selectedCategory === 'ALL' ? 'SEMUA' : selectedCategory}
          </span>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-400">
            <Users className="h-8 w-8 mx-auto stroke-2 mb-2 text-slate-500" />
            <p className="text-base font-bold text-slate-300">Belum ada kunjungan vendor terdaftar pada kategori ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800" id="vendor-list-container">
            {filteredVendors.map((v) => {
              const normCat = normalizeVendorCategory(v);
              const durationMins = getDurationMinutes(v.tanggal, v.tanggalSelesai || v.tanggal, v.jamMulai, v.jamSelesai);
              const durationStr = formatDuration(durationMins);
              return (
                <div
                  key={v.id}
                  className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-800/30 transition-colors"
                  id={`vendor-item-${v.id}`}
                >
                  {/* Left / Main Section */}
                  <div className="space-y-3 flex-1 max-w-4xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {renderCategoryBadge(normCat)}
                      <span className="px-3 py-1 rounded-lg bg-indigo-950/80 text-indigo-200 text-xs md:text-sm font-black border border-indigo-500/40 inline-flex items-center gap-1.5 font-sans">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        {getAreaName(v.areaId)}
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-blue-950/80 text-blue-200 text-xs md:text-sm font-black border border-blue-500/40 inline-flex items-center gap-1.5 font-sans">
                        <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        {durationStr}
                      </span>
                      {v.siapaYangNemenin && (
                        <span className="px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-200 text-xs md:text-sm font-black border border-emerald-500/40 inline-flex items-center gap-1.5 font-sans">
                          <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Pendamping: {v.siapaYangNemenin}
                        </span>
                      )}
                      <span className="text-xs md:text-sm text-cyan-300 font-black font-mono">
                        Jadwal: {v.tanggal} {v.tanggalSelesai && v.tanggalSelesai !== v.tanggal ? `s/d ${v.tanggalSelesai}` : ''} ({v.jamMulai} - {v.jamSelesai} WIB)
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-white text-lg md:text-xl leading-snug">{v.namaVendor}</h4>
                      <p className="text-sm md:text-base text-slate-300 font-sans mt-0.5">
                        Teknisi Lapangan: <span className="font-extrabold text-cyan-300">{v.namaTeknisi}</span>
                      </p>
                    </div>

                    {v.hasilPekerjaan ? (
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm md:text-base text-slate-200 font-medium leading-relaxed">
                        <span className="text-xs font-mono font-bold uppercase text-slate-400 block mb-1">Hasil & Progres Pekerjaan:</span>
                        {v.hasilPekerjaan}
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-500">Belum ada catatan hasil pekerjaan.</p>
                    )}
                  </div>

                  {/* Right Section: Status with Auto-Save & Action Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800 shrink-0">
                    <div>{renderVendorStatusSelect(v)}</div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(v)}
                        className="p-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer border border-transparent hover:border-cyan-500/30"
                        title="Ubah Log Vendor"
                        id={`btn-edit-vendor-${v.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => triggerDelete(v.id)}
                        className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
                        title="Hapus Log Vendor"
                        id={`btn-delete-vendor-${v.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal (RAPOT FILM HARD REFERENCE DESIGN) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
          id="modal-vendor-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="bg-[#0d1322] border border-cyan-500/40 rounded-2xl max-w-2xl sm:max-w-3xl w-full p-6 sm:p-8 text-white shadow-[0_0_60px_rgba(0,240,255,0.25)] animate-scale-in my-auto max-h-[92vh] overflow-y-auto"
            id="modal-vendor-card"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-cyan-500/20">
              <div className="flex items-center gap-3 text-cyan-300 font-mono font-bold text-base sm:text-lg">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/40 shadow-inner">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white text-base sm:text-lg font-black tracking-wide">
                    {editingVendor ? 'UBAH LOG SERVICE VENDOR' : 'TAMBAH LOG SERVICE VENDOR'}
                  </h3>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    Lippo Mall Puri XXI — Form Kunjungan & Maintenance Service
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors border border-transparent hover:border-slate-700 active:scale-95"
                title="Tutup Dialog"
                id="btn-close-modal-vendor"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-6 mt-6 font-mono text-sm" id="form-vendor-work">
              {/* Category */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider">
                  Kategori Service <span className="text-rose-400 font-bold">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VendorCategory)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all cursor-pointer shadow-inner"
                  id="select-vendor-category"
                >
                  <option value="SERVICE TEKNIK" className="bg-slate-900 text-amber-400 font-bold py-2">
                    SERVICE TEKNIK (Civil, Building, Premier, Cafe, General)
                  </option>
                  <option value="SERVICE AC" className="bg-slate-900 text-cyan-400 font-bold py-2">
                    SERVICE AC (Daikin, Chiller, AHU, HVAC, Ducting)
                  </option>
                  <option value="SERVICE OPR" className="bg-slate-900 text-fuchsia-400 font-bold py-2">
                    SERVICE OPR (Christie, Barco, Dolby, Sound, Server, Projector)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Vendor */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider">
                    Nama Vendor / Kontraktor <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={namaVendor}
                    onChange={(e) => {
                      setNamaVendor(e.target.value);
                      setErrors({ ...errors, namaVendor: '' });
                    }}
                    placeholder="Contoh: PT Barco Indonesia / Daikin Service"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all shadow-inner"
                    id="input-vendor-name"
                  />
                  {errors.namaVendor && (
                    <p className="text-xs font-semibold text-rose-400 mt-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {errors.namaVendor}
                    </p>
                  )}
                </div>

                {/* Nama Teknisi */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider">
                    Nama Teknisi Pelaksana <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={namaTeknisi}
                    onChange={(e) => {
                      setNamaTeknisi(e.target.value);
                      setErrors({ ...errors, namaTeknisi: '' });
                    }}
                    placeholder="Contoh: Hendra Wijaya"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all shadow-inner"
                    id="input-vendor-tech-name"
                  />
                  {errors.namaTeknisi && (
                    <p className="text-xs font-semibold text-rose-400 mt-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {errors.namaTeknisi}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal Mulai */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider">
                    Tanggal Visit Mulai <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    value={toISODate(tanggal)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setTanggal(getIndonesianDate(val));
                      } else {
                        setTanggal('');
                      }
                      setErrors({ ...errors, tanggal: '' });
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all shadow-inner"
                    id="input-vendor-date"
                  />
                  {errors.tanggal && (
                    <p className="text-xs font-semibold text-rose-400 mt-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {errors.tanggal}
                    </p>
                  )}
                </div>

                {/* Tanggal Selesai */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider">
                    Tanggal Visit Selesai <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    value={toISODate(tanggalSelesai)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setTanggalSelesai(getIndonesianDate(val));
                      } else {
                        setTanggalSelesai('');
                      }
                      setErrors({ ...errors, tanggalSelesai: '' });
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all shadow-inner"
                    id="input-vendor-date-end"
                  />
                  {errors.tanggalSelesai && (
                    <p className="text-xs font-semibold text-rose-400 mt-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {errors.tanggalSelesai}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Jam Mulai */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" /> Jam Mulai (24H) <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    type="time"
                    value={jamMulai}
                    onChange={(e) => {
                      setJamMulai(e.target.value);
                      setErrors({ ...errors, jamMulai: '' });
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all text-center shadow-inner"
                    id="input-vendor-time-start"
                  />
                  {errors.jamMulai && (
                    <p className="text-xs font-semibold text-rose-400 mt-1 leading-tight flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {errors.jamMulai}
                    </p>
                  )}
                </div>

                {/* Jam Selesai */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" /> Jam Selesai (24H) <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    type="time"
                    value={jamSelesai}
                    onChange={(e) => {
                      setJamSelesai(e.target.value);
                      setErrors({ ...errors, jamSelesai: '' });
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all text-center shadow-inner"
                    id="input-vendor-time-end"
                  />
                  {errors.jamSelesai && (
                    <p className="text-xs font-semibold text-rose-400 mt-1 leading-tight flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {errors.jamSelesai}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Area Pekerjaan */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider">
                    Area Pekerjaan <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <select
                    value={areaId}
                    onChange={(e) => {
                      setAreaId(e.target.value);
                      setErrors({ ...errors, areaId: '' });
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all cursor-pointer shadow-inner"
                    id="select-vendor-area"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-500">
                      Pilih Area...
                    </option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id} className="bg-slate-900 text-white py-2">
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {errors.areaId && (
                    <p className="text-xs font-semibold text-rose-400 mt-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {errors.areaId}
                    </p>
                  )}
                </div>

                {/* Pendamping */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Pendamping Internal
                  </label>
                  <input
                    type="text"
                    value={siapaYangNemenin}
                    onChange={(e) => setSiapaYangNemenin(e.target.value)}
                    placeholder="Contoh: TEKNIK / OPR / SPV"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all shadow-inner"
                    id="input-vendor-escort"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider">
                  Status Kunjungan
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VendorStatus)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all cursor-pointer shadow-inner"
                  id="select-vendor-status-modal"
                >
                  <option value="Belum" className="bg-slate-900 text-rose-400 font-bold py-2">
                    Belum Dikerjakan
                  </option>
                  <option value="On Progress" className="bg-slate-900 text-amber-400 font-bold py-2">
                    Sedang Diproses
                  </option>
                  <option value="Selesai" className="bg-slate-900 text-emerald-400 font-bold py-2">
                    Selesai
                  </option>
                </select>
              </div>

              {/* Hasil Pekerjaan */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-2 text-xs tracking-wider">
                  Hasil & Catatan Pekerjaan
                </label>
                <textarea
                  rows={3}
                  value={hasilPekerjaan}
                  onChange={(e) => setHasilPekerjaan(e.target.value)}
                  placeholder="Deskripsikan tindakan yang dilakukan teknisi, penggantian komponen, atau rekomendasi..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm font-medium placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all leading-relaxed shadow-inner resize-none"
                  id="input-vendor-result"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm cursor-pointer transition-all border border-slate-700 active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-sm flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 transition-all"
                  id="btn-save-vendor"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{editingVendor ? 'Simpan Perubahan' : 'Simpan Log Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deletion */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Log Vendor"
        message="Yakin ingin menghapus catatan kunjungan vendor ini? Tindakan ini permanen."
      />
    </div>
  );
}
