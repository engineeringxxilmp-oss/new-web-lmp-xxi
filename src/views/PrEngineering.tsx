/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PrEngineering, Area, PrCategory, PrStatus } from '../types';
import { Plus, Edit2, Trash2, ClipboardList, Check, Clock, Eye, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

interface PrEngineeringProps {
  prList: PrEngineering[];
  areas: Area[];
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
  const cleanStr = indonesianDateStr.trim();
  
  // If it starts with YYYY-MM-DD (e.g. ISO string)
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    return cleanStr.substring(0, 10);
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmMatch = cleanStr.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const month = parseInt(dmMatch[2], 10);
    const year = parseInt(dmMatch[3], 10);
    const dStr = day < 10 ? `0${day}` : `${day}`;
    const mStr = month < 10 ? `0${month}` : `${month}`;
    return `${year}-${mStr}-${dStr}`;
  }

  // Match YYYY/MM/DD or YYYY-MM-DD
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
  const monthsIndShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const monthsEngShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
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
  } catch (e) {}
  
  return '';
};

export default function PrEngineeringView({ prList, areas, onSave, onDelete }: PrEngineeringProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingPr, setEditingPr] = useState<PrEngineering | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSavedPrId, setLastSavedPrId] = useState<string | null>(null);

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

  // Form states
  const [category, setCategory] = useState<PrCategory>('PR AC');
  const [areaId, setAreaId] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [tanggalPenemuan, setTanggalPenemuan] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [status, setStatus] = useState<PrStatus>('Belum Dikerjakan');
  const [keterangan, setKeterangan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openAddModal = () => {
    setEditingPr(null);
    setCategory('PR AC');
    setAreaId(areas[0]?.id || '');
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
    setCategory(pr.category);
    setAreaId(pr.areaId);
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

    if (!keluhan.trim()) newErrors.keluhan = 'Keluhan / detail kerusakan wajib diisi.';
    if (!areaId) newErrors.areaId = 'Wajib memilih area.';
    if (!tanggalPenemuan.trim()) newErrors.tanggalPenemuan = 'Tanggal penemuan wajib diisi.';

    // Auto set tanggalSelesai if status is marked Selesai and it is currently empty
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

  const renderCategoryBadge = (cat: PrCategory) => {
    const maps = {
      'PR AC': 'bg-blue-100 text-blue-950 border-blue-300',
      'PR Projector': 'bg-amber-100 text-amber-950 border-amber-300',
      'PR Building': 'bg-rose-100 text-rose-950 border-rose-300',
      'PR Studio': 'bg-purple-100 text-purple-950 border-purple-300',
      'PR Engineering': 'bg-emerald-100 text-emerald-950 border-emerald-300'
    };
    return (
      <span className={`px-3.5 py-1.5 rounded-md text-sm md:text-base font-black border ${maps[cat] || 'bg-slate-200 text-slate-950'}`}>
        {cat}
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
              Belum Di Kerjakan
            </option>
            <option value="Sedang Diproses" className="bg-slate-900 text-amber-400 font-bold">
              Sedang Di Proses
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

  const renderStatusBadge = (s: PrStatus) => {
    const maps: Record<string, string> = {
      'Belum Dikerjakan': 'bg-red-100 text-red-950 border-red-300',
      'Belum Di Kerjakan': 'bg-red-100 text-red-950 border-red-300',
      'Sedang Diproses': 'bg-amber-100 text-amber-950 border-amber-300',
      'Sedang Di Proses': 'bg-amber-100 text-amber-950 border-amber-300',
      'Selesai': 'bg-emerald-100 text-emerald-950 border-emerald-300'
    };
    return (
      <span className={`px-3.5 py-1.5 rounded-full text-sm md:text-base font-black border ${maps[s] || 'bg-slate-200 text-slate-950'}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6" id="pr-engineering-tab-view">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <ClipboardList className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
            PR Engineering
          </h2>
          <p className="text-sm md:text-base text-slate-200 mt-1.5 font-sans font-medium">
            Catat complain kerusakan, penanganan AC / projector, dan maintenance terjadwal lainnya.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-base font-bold text-white hover:bg-cyan-500 active:scale-95 transition-all shadow-[0_0_18px_rgba(0,240,255,0.4)] cursor-pointer shrink-0 border border-cyan-400/40"
          id="btn-add-pr"
        >
          <Plus className="h-5 w-5" /> Tambah PR Ticket
        </button>
      </div>

      {/* Grid container of PR list */}
      <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <ClipboardList className="h-5 w-5 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            <span className="font-extrabold text-base tracking-tight text-cyan-300">Semua Tiket PR ({prList.length})</span>
          </div>
          <span className="text-xs md:text-sm font-mono text-amber-300 font-extrabold">Total Pending: {prList.filter(p=>p.status!=='Selesai').length}</span>
        </div>

        {prList.length === 0 ? (
          <div className="p-12 text-center text-slate-300">
            <ClipboardList className="h-8 w-8 mx-auto stroke-2 mb-2 text-cyan-400 animate-pulse" />
            <p className="text-base font-bold text-slate-200">Semua aman! Belum ada PR Engineering yang terdaftar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800" id="pr-list-container">
            {prList.map((pr) => (
              <div
                key={pr.id}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                id={`pr-item-${pr.id}`}
              >
                {/* Left Side Content */}
                <div className="space-y-2.5 flex-1 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    {renderCategoryBadge(pr.category)}
                    <span className="text-sm md:text-base text-cyan-300 font-black font-mono">Ditemukan: {pr.tanggalPenemuan}</span>
                    {pr.tanggalSelesai && (
                      <span className="text-sm md:text-base text-emerald-400 font-black font-mono">• Selesai: {pr.tanggalSelesai}</span>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-black text-white text-lg md:text-xl leading-snug">
                      {pr.keluhan}
                    </h4>
                    <p className="text-sm md:text-base text-slate-300 font-sans mt-1">
                      Area Penempatan: <span className="font-black text-amber-300">{getAreaName(pr.areaId)}</span>
                    </p>
                  </div>

                  {pr.keterangan && (
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm md:text-base text-slate-200 font-bold leading-relaxed">
                      Keterangan/Progress: {pr.keterangan}
                    </div>
                  )}
                </div>

                {/* Right Side Controls */}
                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  <div>
                    {renderPrStatusSelect(pr)}
                  </div>
                  
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
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPr ? 'Ubah Tiket PR' : 'Buat Tiket PR'}
      >
        <form onSubmit={handleSaveSubmit} className="space-y-5 font-sans" id="form-pr-eng">
          
          <div className="grid grid-cols-2 gap-4">
            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Kategori PR <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PrCategory)}
                className="w-full h-12 md:h-13 rounded-xl border-2 border-gray-200 px-4 text-base md:text-lg font-bold text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-hidden transition-all cursor-pointer"
                id="select-pr-cat"
              >
                <option value="PR AC" className="text-gray-900 bg-white">PR AC</option>
                <option value="PR Projector" className="text-gray-900 bg-white">PR Projector</option>
                <option value="PR Building" className="text-gray-900 bg-white">PR Building</option>
                <option value="PR Studio" className="text-gray-900 bg-white">PR Studio</option>
                <option value="PR Engineering" className="text-gray-900 bg-white">PR Engineering</option>
              </select>
            </div>

            {/* Area */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Area Kerusakan <span className="text-red-400">*</span>
              </label>
              <select
                value={areaId}
                onChange={(e) => {
                  setAreaId(e.target.value);
                  setErrors({ ...errors, areaId: '' });
                }}
                className="w-full h-12 md:h-13 rounded-xl border-2 border-gray-200 px-4 text-base md:text-lg font-bold text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-hidden transition-all cursor-pointer"
                id="select-pr-area"
              >
                <option value="" disabled className="text-gray-400 bg-white">Pilih Area...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id} className="text-gray-900 bg-white">{a.name}</option>
                ))}
              </select>
              {errors.areaId && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.areaId}</p>}
            </div>
          </div>

          {/* Keluhan */}
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
              Keluhan / Kerusakan Detail <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={keluhan}
              onChange={(e) => {
                setKeluhan(e.target.value);
                setErrors({ ...errors, keluhan: '' });
              }}
              placeholder="Contoh: Bunyi abnormal fan pada chiller area lobby..."
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base md:text-lg font-bold text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-hidden transition-all placeholder:text-gray-400 resize-none"
              id="input-pr-complaint"
            />
            {errors.keluhan && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.keluhan}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tanggal Penemuan */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Tanggal Temuan <span className="text-red-400">*</span>
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
                className="w-full h-12 md:h-13 rounded-xl border-2 border-gray-200 px-4 text-base md:text-lg font-bold text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-hidden transition-all"
                id="input-pr-date-found"
              />
              {errors.tanggalPenemuan && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.tanggalPenemuan}</p>}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono">
                Status Pekerjaan
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PrStatus)}
                className="w-full h-12 md:h-13 rounded-xl border-2 border-gray-200 px-4 text-base md:text-lg font-bold text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-hidden transition-all cursor-pointer"
                id="select-pr-status"
              >
                <option value="Belum Dikerjakan" className="text-gray-900 bg-white font-bold">Belum Di Kerjakan</option>
                <option value="Sedang Diproses" className="text-gray-900 bg-white font-bold">Sedang Di Proses</option>
                <option value="Selesai" className="text-gray-900 bg-white font-bold">Selesai</option>
              </select>
            </div>
          </div>

          {/* Tanggal Selesai (Hanya aktif jika status Selesai) */}
          {status === 'Selesai' && (
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono">
                Tanggal Selesai
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
                className="w-full h-12 md:h-13 rounded-xl border-2 border-emerald-300 px-4 text-base md:text-lg font-bold text-emerald-900 bg-white focus:border-emerald-500 focus:outline-hidden transition-all"
                id="input-pr-date-done"
              />
            </div>
          )}

          {/* Keterangan */}
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
              Keterangan Progress / Tindakan <span className="text-slate-300 font-normal font-sans text-xs">(Opsional)</span>
            </label>
            <textarea
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Tulis sparepart yang dibutuhkan, kronologi, atau teknisi pelaksana..."
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base md:text-lg font-bold text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-hidden transition-all placeholder:text-gray-400 resize-none"
              id="input-pr-desc"
            />
          </div>

          {/* Save buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-5 py-2.5 text-sm md:text-base font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 active:scale-95 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-sm md:text-base font-black text-white hover:bg-blue-700 active:scale-95 shadow-md transition-all cursor-pointer"
              id="btn-save-pr"
            >
              <Check className="h-4 w-4" /> Simpan
            </button>
          </div>
        </form>
      </Modal>

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
