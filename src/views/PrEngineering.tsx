/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PrEngineering, Area, Equipment, PrCategory, PrStatus, SystemBranding } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  ClipboardList,
  Check,
  Clock,
  ChevronDown,
  X,
  CheckCircle2,
  Download,
  Filter,
  Search,
  Wrench,
  Fan,
  Building2,
  History,
  AlertCircle
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PrEngineeringProps {
  prList: PrEngineering[];
  areas: Area[];
  equipment?: Equipment[];
  branding?: SystemBranding;
  onSave: (pr: PrEngineering) => void;
  onDelete: (id: string) => void;
}

// Format today's date in Indonesian style "09 Juli 2026"
export const getIndonesianDate = (dString?: string) => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  let d: Date;
  if (dString) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dString)) {
      const parts = dString.split('-');
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dString);
    }
  } else {
    d = new Date();
  }
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = dString ? d.getFullYear() : 2026;
  return `${day < 10 ? '0' + day : day} ${month} ${year}`;
};

// Helper to convert Indonesian date e.g. "11 Juli 2026" to "2026-07-11"
export const toISODate = (indonesianDateStr: string): string => {
  if (!indonesianDateStr) return '';
  // Strip optional day name prefix e.g. "Senin, 22 September 2026" or "Senin, 11 Juli 2026"
  const cleanStr = indonesianDateStr.replace(/^[A-Za-z]+,\s*/, '').trim();
  
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    return cleanStr.substring(0, 10);
  }

  const dmMatch = cleanStr.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const month = parseInt(dmMatch[2], 10);
    const year = parseInt(dmMatch[3], 10);
    const dStr = day < 10 ? `0${day}` : `${day}`;
    const mStr = month < 10 ? `0${month}` : `${month}`;
    return `${year}-${mStr}-${dStr}`;
  }

  const ymMatch = cleanStr.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (ymMatch) {
    const year = parseInt(ymMatch[1], 10);
    const month = parseInt(ymMatch[2], 10);
    const day = parseInt(ymMatch[3], 10);
    const dStr = day < 10 ? `0${day}` : `${day}`;
    const mStr = month < 10 ? `0${month}` : `${month}`;
    return `${year}-${mStr}-${dStr}`;
  }
  
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthsEng = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthsIndShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthsEngShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const parts = cleanStr.split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthName = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    
    let monthIndex = months.findIndex(m => m.toLowerCase() === monthName);
    if (monthIndex === -1) monthIndex = monthsEng.findIndex(m => m.toLowerCase() === monthName);
    if (monthIndex === -1) monthIndex = monthsIndShort.findIndex(m => m.toLowerCase() === monthName);
    if (monthIndex === -1) monthIndex = monthsEngShort.findIndex(m => m.toLowerCase() === monthName);
    
    if (monthIndex !== -1) {
      const dStr = day < 10 ? `0${day}` : `${day}`;
      const mStr = monthIndex + 1 < 10 ? `0${monthIndex + 1}` : `${monthIndex + 1}`;
      return `${year}-${mStr}-${dStr}`;
    }
  }
  
  try {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const monthIndex = d.getMonth();
      const year = d.getFullYear();
      const dStr = day < 10 ? `0${day}` : `${day}`;
      const mStr = monthIndex + 1 < 10 ? `0${monthIndex + 1}` : `${monthIndex + 1}`;
      return `${year}-${mStr}-${dStr}`;
    }
  } catch (_) {}
  
  return '';
};

// Normalize categories into 3 main categories
export function normalizePrCategory(cat: string): 'PR OPR' | 'PR AC' | 'PR TEKNIK' {
  const upper = (cat || '').toUpperCase();
  if (upper.includes('AC')) return 'PR AC';
  if (upper.includes('OPR') || upper.includes('PROJECTOR') || upper.includes('STUDIO')) return 'PR OPR';
  return 'PR TEKNIK';
}

export default function PrEngineeringView({
  prList,
  areas,
  equipment = [],
  branding,
  onSave,
  onDelete
}: PrEngineeringProps) {
  // Main view modes: ACTIVE PR vs HISTORY PR
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  
  // Category Filter: SEMUA | PR OPR | PR AC | PR TEKNIK
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'PR OPR' | 'PR AC' | 'PR TEKNIK'>('ALL');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Modal and action states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingPr, setEditingPr] = useState<PrEngineering | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSavedPrId, setLastSavedPrId] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState<'PR OPR' | 'PR AC' | 'PR TEKNIK'>('PR OPR');
  const [areaId, setAreaId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [tanggalPenemuan, setTanggalPenemuan] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [status, setStatus] = useState<PrStatus>('Belum Dikerjakan');
  const [keterangan, setKeterangan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quick change status with auto save
  const handleQuickChangePrStatus = (pr: PrEngineering, newStatus: PrStatus) => {
    const isSelesai = newStatus === 'Selesai';
    const updated: PrEngineering = {
      ...pr,
      status: newStatus,
      tanggalSelesai: isSelesai ? (pr.tanggalSelesai?.trim() ? pr.tanggalSelesai : getIndonesianDate()) : ''
    };
    onSave(updated);
    setLastSavedPrId(pr.id);
    setTimeout(() => {
      setLastSavedPrId((prev) => (prev === pr.id ? null : prev));
    }, 2000);
  };

  const openAddModal = (initialCat?: 'PR OPR' | 'PR AC' | 'PR TEKNIK') => {
    setEditingPr(null);
    setCategory(initialCat || (selectedCategory !== 'ALL' ? selectedCategory : 'PR OPR'));
    setAreaId(areas[0]?.id || '');
    setEquipmentId('');
    setKeluhan('');
    setTanggalPenemuan(getIndonesianDate());
    setTanggalSelesai('');
    setStatus('Belum Dikerjakan');
    setKeterangan('');
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (pr: PrEngineering) => {
    setEditingPr(pr);
    setCategory(normalizePrCategory(pr.category));
    setAreaId(pr.areaId);
    setEquipmentId(pr.equipmentId || '');
    setKeluhan(pr.keluhan);
    setTanggalPenemuan(pr.tanggalPenemuan);
    setTanggalSelesai(pr.tanggalSelesai);
    setStatus(pr.status);
    setKeterangan(pr.keterangan);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!keluhan.trim()) newErrors.keluhan = 'Detail keluhan / kerusakan wajib diisi.';
    if (!areaId) newErrors.areaId = 'Wajib memilih area.';
    if (!tanggalPenemuan.trim()) newErrors.tanggalPenemuan = 'Tanggal penemuan wajib diisi.';

    let finalTanggalSelesai = tanggalSelesai;
    if (status === 'Selesai' && !tanggalSelesai.trim()) {
      finalTanggalSelesai = getIndonesianDate();
    } else if (status !== 'Selesai') {
      finalTanggalSelesai = '';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const prPayload: PrEngineering = {
      id: editingPr ? editingPr.id : `pr-${Date.now()}`,
      category,
      areaId,
      equipmentId: equipmentId || undefined,
      keluhan: keluhan.trim(),
      tanggalPenemuan: tanggalPenemuan.trim(),
      tanggalSelesai: finalTanggalSelesai.trim(),
      status,
      keterangan: keterangan.trim()
    };

    onSave(prPayload);
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

  const getEquipmentName = (id?: string) => {
    if (!id) return '';
    return equipment.find((e) => e.id === id)?.name || '';
  };

  // Filter list based on viewMode (Active vs History), selectedCategory, and search query
  const filteredList = prList.filter((pr) => {
    const isDone = pr.status === 'Selesai';
    if (viewMode === 'active' && isDone) return false;
    if (viewMode === 'history' && !isDone) return false;

    const normCat = normalizePrCategory(pr.category);
    if (selectedCategory !== 'ALL' && normCat !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const areaName = getAreaName(pr.areaId).toLowerCase();
      const eqName = getEquipmentName(pr.equipmentId).toLowerCase();
      const matchKeluhan = pr.keluhan.toLowerCase().includes(q);
      const matchKet = (pr.keterangan || '').toLowerCase().includes(q);
      return matchKeluhan || matchKet || areaName.includes(q) || eqName.includes(q);
    }

    return true;
  });

  // Counts for Badges
  const activeCount = prList.filter((p) => p.status !== 'Selesai').length;
  const historyCount = prList.filter((p) => p.status === 'Selesai').length;

  const countOpr = prList.filter((p) => normalizePrCategory(p.category) === 'PR OPR' && (viewMode === 'active' ? p.status !== 'Selesai' : p.status === 'Selesai')).length;
  const countAc = prList.filter((p) => normalizePrCategory(p.category) === 'PR AC' && (viewMode === 'active' ? p.status !== 'Selesai' : p.status === 'Selesai')).length;
  const countTeknik = prList.filter((p) => normalizePrCategory(p.category) === 'PR TEKNIK' && (viewMode === 'active' ? p.status !== 'Selesai' : p.status === 'Selesai')).length;

  const renderCategoryBadge = (cat: string) => {
    const norm = normalizePrCategory(cat);
    if (norm === 'PR OPR') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-black border bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/50 flex items-center gap-1.5 shadow-[0_0_8px_rgba(217,70,239,0.3)]">
          <Wrench className="w-3.5 h-3.5 text-fuchsia-400" /> PR OPR
        </span>
      );
    }
    if (norm === 'PR AC') {
      return (
        <span className="px-3 py-1 rounded-md text-xs font-black border bg-cyan-950/80 text-cyan-300 border-cyan-500/50 flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,240,255,0.3)]">
          <Fan className="w-3.5 h-3.5 text-cyan-400" /> PR AC
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-md text-xs font-black border bg-amber-950/80 text-amber-300 border-amber-500/50 flex items-center gap-1.5 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
        <Building2 className="w-3.5 h-3.5 text-amber-400" /> PR TEKNIK
      </span>
    );
  };

  const renderPrStatusSelect = (pr: PrEngineering) => {
    const norm = (s: string): PrStatus => {
      if (s === 'Selesai') return 'Selesai';
      if (s === 'Sedang Diproses' || s === 'Sedang Di Proses') return 'Sedang Diproses';
      return 'Belum Dikerjakan';
    };

    const currentVal = norm(pr.status);
    const isRecentlySaved = lastSavedPrId === pr.id;

    const colorStyles: Record<string, string> = {
      'Belum Dikerjakan': 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:border-rose-400 focus:ring-rose-400/50',
      'Sedang Diproses': 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:border-amber-400 focus:ring-amber-400/50',
      'Selesai': 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:border-emerald-400 focus:ring-emerald-400/50'
    };

    const chevronColor: Record<string, string> = {
      'Belum Dikerjakan': 'text-rose-400',
      'Sedang Diproses': 'text-amber-400',
      'Selesai': 'text-emerald-400'
    };

    return (
      <div className="inline-flex items-center gap-2">
        <div className="relative inline-flex items-center group">
          <select
            value={currentVal}
            onChange={(e) => {
              const newStatus = e.target.value as PrStatus;
              handleQuickChangePrStatus(pr, newStatus);
            }}
            className={`appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs md:text-sm font-mono font-black border cursor-pointer transition-all duration-200 focus:outline-hidden focus:ring-2 select-pr-status-dropdown ${
              colorStyles[currentVal] || colorStyles['Belum Dikerjakan']
            }`}
            title="Pilih opsi status PR (Tersimpan Otomatis)"
            id={`select-status-pr-${pr.id}`}
          >
            <option value="Belum Dikerjakan" className="bg-slate-900 text-rose-400 font-bold">
              Belum Dikerjakan
            </option>
            <option value="Sedang Diproses" className="bg-slate-900 text-amber-400 font-bold">
              Sedang Diproses
            </option>
            <option value="Selesai" className="bg-slate-900 text-emerald-400 font-bold">
              Selesai
            </option>
          </select>
          <div className="absolute right-2.5 pointer-events-none flex items-center">
            <ChevronDown
              className={`w-3.5 h-3.5 ${
                chevronColor[currentVal] || 'text-rose-400'
              } transition-transform group-hover:translate-y-0.5`}
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

  // PDF Exporter dedicated per category
  const handleExportPdfPerCategory = (targetCategory: 'PR OPR' | 'PR AC' | 'PR TEKNIK') => {
    const filteredByCategory = prList.filter((p) => normalizePrCategory(p.category) === targetCategory);

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const cinemaTitle = branding?.title || 'CINEMA XXI';
    const cinemaSubtitle = branding?.subtitle || 'LIPPO MALL PURI';
    const reportDate = getIndonesianDate();

    // Header banner
    doc.setFillColor(13, 19, 34); // #0d1322
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(0, 240, 255); // Cyan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${cinemaTitle} - ${cinemaSubtitle}`, 14, 11);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(`LAPORAN PERBAIKAN & PEMELIHARAAN — KATEGORI ${targetCategory}`, 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`Dicetak: ${reportDate}`, 283, 15, { align: 'right' });

    // Table rows
    const tableData = filteredByCategory.map((p, idx) => {
      const eq = getEquipmentName(p.equipmentId);
      const area = getAreaName(p.areaId);
      return [
        idx + 1,
        eq ? `${area} - ${eq}` : area,
        p.keluhan,
        p.tanggalPenemuan,
        p.tanggalSelesai || '-',
        p.status,
        p.keterangan || '-'
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['NO', 'AREA / PERALATAN', 'DETAIL MASALAH / KELUHAN', 'TGL TEMUAN', 'TGL SELESAI', 'STATUS', 'CATATAN / TINDAKAN']],
      body: tableData.length > 0 ? tableData : [['-', '-', `Tidak ada tiket ${targetCategory}`, '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: {
        fillColor: targetCategory === 'PR OPR' ? [192, 38, 211] : targetCategory === 'PR AC' ? [8, 145, 178] : [217, 119, 6],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        lineWidth: 0.25,
        lineColor: [40, 40, 40]
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3.5,
        valign: 'middle',
        lineWidth: 0.2,
        lineColor: [70, 70, 70]
      },
      tableLineWidth: 0.25,
      tableLineColor: [40, 40, 40],
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 45 },
        2: { cellWidth: 70 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 26 },
        5: { halign: 'center', cellWidth: 28 },
        6: { cellWidth: 'auto' }
      }
    });

    // Signature Footer
    const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : 160;
    const pageHeight = doc.internal.pageSize.getHeight();
    const sigY = finalY > pageHeight - 40 ? pageHeight - 35 : finalY;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    doc.text('Dibuat Oleh,', 30, sigY);
    doc.text('Operator / Teknisi', 30, sigY + 5);
    doc.text('( ............................................. )', 30, sigY + 22);

    doc.text('Mengetahui,', 220, sigY);
    doc.text('Cinema Manager / Head Eng.', 220, sigY + 5);
    doc.text('( ............................................. )', 220, sigY + 22);

    doc.save(`Laporan_${targetCategory.replace(/\s+/g, '_')}_${reportDate.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6" id="pr-engineering-tab-view">
      {/* Top Banner Header */}
      <div className="bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-950/80 text-rose-300 font-mono text-[11px] font-bold border border-rose-500/40 uppercase tracking-widest">
                CINEMA XXI ENGINEERING TICKETING
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              <ClipboardList className="h-7 w-7 text-rose-400 drop-shadow-[0_0_8px_#f43f5e]" />
              PR ENGINEERING
            </h2>
            <p className="text-sm md:text-base text-slate-200 mt-1.5 font-sans font-medium max-w-3xl">
              Sistem pelaporan keluhan dan penanganan maintenance Cinema XXI yang terbagi menjadi 3 kategori: PR OPR, PR AC, dan PR TEKNIK.
            </p>
          </div>

          {/* Action Buttons: Add PR & Export PDF */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1.5 bg-[#080d1a] p-1.5 rounded-2xl border border-cyan-500/30 shadow-inner">
              <button
                onClick={() => handleExportPdfPerCategory('PR OPR')}
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-fuchsia-300 hover:bg-fuchsia-950/80 border border-fuchsia-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Cetak PDF PR OPR"
              >
                <Download className="w-3.5 h-3.5" /> PDF OPR
              </button>
              <button
                onClick={() => handleExportPdfPerCategory('PR AC')}
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-950/80 border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Cetak PDF PR AC"
              >
                <Download className="w-3.5 h-3.5" /> PDF AC
              </button>
              <button
                onClick={() => handleExportPdfPerCategory('PR TEKNIK')}
                className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-amber-300 hover:bg-amber-950/80 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Cetak PDF PR TEKNIK"
              >
                <Download className="w-3.5 h-3.5" /> PDF TEKNIK
              </button>
            </div>

            <button
              onClick={() => openAddModal()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-3 text-sm md:text-base font-bold text-white hover:from-rose-500 hover:to-pink-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] cursor-pointer shrink-0 border border-rose-400/40"
              id="btn-add-pr"
            >
              <Plus className="h-5 w-5" /> Tambah PR Ticket
            </button>
          </div>
        </div>

        {/* Primary View Switcher: ACTIVE PR vs HISTORY PR */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-6 pt-5 border-t border-cyan-500/20">
          <div className="flex items-center gap-2 p-1.5 bg-[#080d1a] rounded-2xl border border-cyan-500/30 w-full sm:w-auto shadow-inner">
            <button
              onClick={() => setViewMode('active')}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black transition-all cursor-pointer flex-1 sm:flex-initial ${
                viewMode === 'active'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] border border-cyan-400/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              id="tab-active-pr"
              type="button"
            >
              <ClipboardList className="h-4 w-4" />
              <span>ACTIVE PR ({activeCount})</span>
            </button>

            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black transition-all cursor-pointer flex-1 sm:flex-initial ${
                viewMode === 'history'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              id="tab-history-pr"
              type="button"
            >
              <History className="h-4 w-4" />
              <span>HISTORY PR ({historyCount})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari keluhan, area, atau catatan..."
              className="w-full bg-[#080d1a] border border-cyan-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
            />
          </div>
        </div>

        {/* 3 Categories Secondary Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <span className="text-xs font-mono font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Kategori:
          </span>

          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'bg-[#080d1a] text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            Semua ({filteredList.length})
          </button>

          <button
            onClick={() => setSelectedCategory('PR OPR')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'PR OPR'
                ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/60 shadow-[0_0_10px_rgba(217,70,239,0.25)]'
                : 'bg-[#080d1a] text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>PR OPR ({countOpr})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('PR AC')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'PR AC'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                : 'bg-[#080d1a] text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <Fan className="w-3.5 h-3.5 text-cyan-400" />
            <span>PR AC ({countAc})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('PR TEKNIK')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'PR TEKNIK'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'bg-[#080d1a] text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>PR TEKNIK ({countTeknik})</span>
          </button>
        </div>
      </div>

      {/* PR Cards List */}
      <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <ClipboardList className="h-5 w-5 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-cyan-300">
              {viewMode === 'active' ? 'DAFTAR ACTIVE PR' : 'DAFTAR HISTORY PR (SELESAI)'} — {selectedCategory === 'ALL' ? 'SEMUA KATEGORI' : selectedCategory} ({filteredList.length})
            </span>
          </div>
          <span className="text-xs md:text-sm font-mono text-amber-300 font-extrabold">
            {viewMode === 'active' ? `Pending: ${filteredList.length}` : `Arsip Selesai: ${filteredList.length}`}
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-300">
            <CheckCircle2 className="h-10 w-10 mx-auto stroke-2 mb-3 text-cyan-400 animate-pulse" />
            <p className="text-base font-bold text-slate-200">
              {viewMode === 'active'
                ? 'Tidak ada tiket Active PR untuk kategori ini. Semua pekerjaan aman!'
                : 'Belum ada riwayat tiket PR yang selesai pada kategori ini.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800" id="pr-list-container">
            {filteredList.map((pr) => {
              const eqName = getEquipmentName(pr.equipmentId);
              return (
                <div
                  key={pr.id}
                  className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                  id={`pr-item-${pr.id}`}
                >
                  {/* Left Side Content */}
                  <div className="space-y-2.5 flex-1 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {renderCategoryBadge(pr.category)}
                      <span className="text-xs md:text-sm text-cyan-300 font-black font-mono">
                        Ditemukan: {pr.tanggalPenemuan}
                      </span>
                      {pr.tanggalSelesai && (
                        <span className="text-xs md:text-sm text-emerald-400 font-black font-mono">
                          • Selesai: {pr.tanggalSelesai}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-black text-white text-base md:text-lg leading-snug">
                        {pr.keluhan}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-300 font-sans mt-1">
                        <p>
                          Area: <span className="font-black text-amber-300">{getAreaName(pr.areaId)}</span>
                        </p>
                        {eqName && (
                          <p>
                            Peralatan: <span className="font-bold text-cyan-300">{eqName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {pr.keterangan && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-200 font-bold leading-relaxed">
                        Keterangan / Tindakan: {pr.keterangan}
                      </div>
                    )}
                  </div>

                  {/* Right Side Controls */}
                  <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    <div>{renderPrStatusSelect(pr)}</div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(pr)}
                        className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Ubah PR"
                        id={`btn-edit-pr-${pr.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => triggerDelete(pr.id)}
                        className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                        title="Hapus PR"
                        id={`btn-delete-pr-${pr.id}`}
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
          id="modal-pr-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="bg-[#0d1322] border border-cyan-500/40 rounded-2xl max-w-2xl sm:max-w-3xl w-full p-6 sm:p-8 text-white shadow-[0_0_60px_rgba(0,240,255,0.25)] animate-scale-in my-auto max-h-[92vh] overflow-y-auto"
            id="modal-pr-card"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-cyan-500/20">
              <div className="flex items-center gap-3 text-cyan-300 font-mono font-bold text-base sm:text-lg">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/40 shadow-inner">
                  <ClipboardList className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white text-base sm:text-lg font-black tracking-wide">
                    {editingPr ? 'EDIT TIKET PR ENGINEERING' : 'BUAT TIKET PR ENGINEERING'}
                  </h3>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    Lippo Mall Puri XXI — Form Permintaan Perbaikan (PR OPR / PR AC / PR TEKNIK)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors border border-transparent hover:border-slate-700 active:scale-95"
                title="Tutup Dialog"
                id="btn-close-modal-pr"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-6 mt-6 font-mono text-sm" id="form-pr-eng">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* 3 Kategori Utama PR */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                    Kategori PR <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as 'PR OPR' | 'PR AC' | 'PR TEKNIK')}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm sm:text-base font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all cursor-pointer shadow-inner"
                    id="select-pr-cat"
                  >
                    <option value="PR OPR" className="bg-slate-900 text-fuchsia-400 font-bold py-2">
                      PR OPR (Projector, Sound, Studio, Booth OPR)
                    </option>
                    <option value="PR AC" className="bg-slate-900 text-cyan-400 font-bold py-2">
                      PR AC (AC Studio, AC Lobby, Koridor, HVAC)
                    </option>
                    <option value="PR TEKNIK" className="bg-slate-900 text-amber-400 font-bold py-2">
                      PR TEKNIK (Civil, Ceiling, Painting, Cafe, Premier)
                    </option>
                  </select>
                </div>

                {/* Area */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                    Area Kerusakan <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <select
                    value={areaId}
                    onChange={(e) => {
                      setAreaId(e.target.value);
                      setErrors({ ...errors, areaId: '' });
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm sm:text-base font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all cursor-pointer shadow-inner"
                    id="select-pr-area"
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
                  {errors.areaId && <p className="text-xs font-bold text-rose-400 mt-2 font-mono">{errors.areaId}</p>}
                </div>
              </div>

              {/* Equipment Selection (optional, especially helpful for PR OPR) */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                  Peralatan Terkait <span className="text-slate-500 font-normal lowercase">(opsional)</span>
                </label>
                <select
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm sm:text-base font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all cursor-pointer shadow-inner"
                  id="select-pr-equipment"
                >
                  <option value="" className="bg-slate-900 text-slate-500">
                    -- Tanpa Peralatan Tertentu / Umum --
                  </option>
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id} className="bg-slate-900 text-white py-2">
                      {eq.name} ({getAreaName(eq.areaId)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Keluhan / Detail Kerusakan */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                  Detail Masalah / Keluhan <span className="text-rose-400 font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  value={keluhan}
                  onChange={(e) => {
                    setKeluhan(e.target.value);
                    setErrors({ ...errors, keluhan: '' });
                  }}
                  placeholder="Contoh: Bunyi abnormal blower fan AC di Lobby Utama / Lampu Projector Studio 2 kedip-kedip..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm sm:text-base font-medium placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all leading-relaxed shadow-inner resize-none"
                  id="input-pr-complaint"
                />
                {errors.keluhan && <p className="text-xs font-bold text-rose-400 mt-2 font-mono">{errors.keluhan}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Tanggal Penemuan */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider flex items-center justify-between">
                    <span>
                      Tanggal Ditemukan <span className="text-rose-400 font-bold">*</span>
                    </span>
                    <span className="text-[11px] text-cyan-400 font-normal">Klik untuk kalender</span>
                  </label>
                  <input
                    type="date"
                    value={toISODate(tanggalPenemuan)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setTanggalPenemuan(getIndonesianDate(val));
                      } else {
                        setTanggalPenemuan('');
                      }
                      setErrors({ ...errors, tanggalPenemuan: '' });
                    }}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as any).showPicker?.();
                      } catch (_) {}
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm sm:text-base font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all cursor-pointer shadow-inner"
                    id="input-pr-date-found"
                  />
                  {errors.tanggalPenemuan && (
                    <p className="text-xs font-bold text-rose-400 mt-2 font-mono">{errors.tanggalPenemuan}</p>
                  )}
                </div>

                {/* Status Pekerjaan */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                    Status Pekerjaan
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PrStatus)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm sm:text-base font-semibold focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all cursor-pointer shadow-inner"
                    id="select-pr-status"
                  >
                    <option value="Belum Dikerjakan" className="bg-slate-900 text-rose-400 font-bold py-2">
                      Belum Dikerjakan
                    </option>
                    <option value="Sedang Diproses" className="bg-slate-900 text-amber-400 font-bold py-2">
                      Sedang Diproses
                    </option>
                    <option value="Selesai" className="bg-slate-900 text-emerald-400 font-bold py-2">
                      Selesai
                    </option>
                  </select>
                </div>
              </div>

              {/* Tanggal Selesai */}
              {status === 'Selesai' && (
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider flex items-center justify-between">
                    <span>
                      Tanggal Selesai <span className="text-emerald-400 font-bold">*</span>
                    </span>
                    <span className="text-[11px] text-cyan-400 font-normal">Klik untuk kalender</span>
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
                    }}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as any).showPicker?.();
                      } catch (_) {}
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-emerald-400/80 text-white text-sm sm:text-base font-semibold focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all cursor-pointer shadow-inner"
                    id="input-pr-date-done"
                  />
                </div>
              )}

              {/* Keterangan / Tindakan / Catatan */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                  Catatan / Proses / Tindakan <span className="text-slate-500 font-normal lowercase">(opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Tulis sparepart yang digunakan, kronologi perbaikan, atau teknisi yang menangani..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-cyan-400/80 text-white text-sm sm:text-base font-medium placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all leading-relaxed shadow-inner resize-none"
                  id="input-pr-desc"
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
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95 transition-all"
                  id="btn-save-pr"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{editingPr ? 'Simpan Perubahan' : 'Simpan Tiket PR'}</span>
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
        title="Hapus Tiket PR"
        message="Yakin ingin menghapus tiket PR ini? Tindakan ini bersifat permanen."
      />
    </div>
  );
}
