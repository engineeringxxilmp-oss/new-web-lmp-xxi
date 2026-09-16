/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RiwayatEquipment, Equipment, Area, EquipmentStatus } from '../types';
import { Plus, Edit2, Trash2, History, Check, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getIndonesianDate } from './PrEngineering';

// Helper to convert Indonesian date e.g. "11 Juli 2026" or "11 July 2026" to "2026-07-11"
const toISODate = (indonesianDateStr: string): string => {
  if (!indonesianDateStr) return '';
  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(indonesianDateStr)) {
    return indonesianDateStr;
  }
  
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const parts = indonesianDateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthName = parts[1];
    const year = parseInt(parts[2], 10);
    
    const monthIndex = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    if (monthIndex !== -1) {
      const dStr = day < 10 ? `0${day}` : `${day}`;
      const mStr = monthIndex + 1 < 10 ? `0${monthIndex + 1}` : `${monthIndex + 1}`;
      return `${year}-${mStr}-${dStr}`;
    }
  }
  
  try {
    const d = new Date(indonesianDateStr);
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

interface RiwayatEquipmentProps {
  riwayat: RiwayatEquipment[];
  equipment: Equipment[];
  areas: Area[];
  onSave: (r: RiwayatEquipment) => void;
  onDelete: (id: string) => void;
}

export default function RiwayatEquipmentView({
  riwayat,
  equipment,
  areas,
  onSave,
  onDelete
}: RiwayatEquipmentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingRiwayat, setEditingRiwayat] = useState<RiwayatEquipment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSavedRiwayatId, setLastSavedRiwayatId] = useState<string | null>(null);

  // Quick change status with auto-save
  const handleQuickChangeHistoryStatus = (r: RiwayatEquipment, newStatus: EquipmentStatus) => {
    const isNormal = newStatus === 'Normal' || newStatus === 'NORMAL';
    const updated: RiwayatEquipment = {
      ...r,
      status: newStatus,
      tanggalSelesai: isNormal ? (r.tanggalSelesai?.trim() ? r.tanggalSelesai : getIndonesianDate()) : r.tanggalSelesai
    };
    onSave(updated);
    setLastSavedRiwayatId(r.id);
    setTimeout(() => {
      setLastSavedRiwayatId((prev) => (prev === r.id ? null : prev));
    }, 2000);
  };

  // Form states
  const [equipmentId, setEquipmentId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [barangYangDiganti, setBarangYangDiganti] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('Normal');
  const [keterangan, setKeterangan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openAddModal = () => {
    setEditingRiwayat(null);
    setEquipmentId('');
    setAreaId('');
    setTanggalMulai(getIndonesianDate());
    setTanggalSelesai('');
    setBarangYangDiganti('');
    setStatus('Normal');
    setKeterangan('');
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (r: RiwayatEquipment) => {
    setEditingRiwayat(r);
    setEquipmentId(getEquipmentName(r.equipmentId));
    setAreaId(getAreaName(r.areaId));
    setTanggalMulai(r.tanggalMulai);
    setTanggalSelesai(r.tanggalSelesai);
    setBarangYangDiganti(r.barangYangDiganti);
    setStatus(r.status);
    setKeterangan(r.keterangan);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!equipmentId.trim()) newErrors.equipmentId = 'Wajib mengisi nama equipment.';
    if (!areaId.trim()) newErrors.areaId = 'Wajib mengisi area kejadian.';
    if (!tanggalMulai.trim()) newErrors.tanggalMulai = 'Tanggal mulai wajib diisi.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: RiwayatEquipment = {
      id: editingRiwayat ? editingRiwayat.id : `hist-${Date.now()}`,
      equipmentId: equipmentId.trim(),
      areaId: areaId.trim(),
      tanggalMulai: tanggalMulai.trim(),
      tanggalSelesai: tanggalSelesai.trim(),
      barangYangDiganti: barangYangDiganti.trim() || 'Tidak ada',
      status,
      keterangan: keterangan.trim()
    };

    onSave(payload);
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

  const getEquipmentName = (idOrName: string) => {
    return equipment.find((e) => e.id === idOrName)?.name || idOrName || 'Tanpa Nama Equipment';
  };

  const getAreaName = (idOrName: string) => {
    return areas.find((a) => a.id === idOrName)?.name || idOrName || 'Tanpa Area';
  };

  const renderEquipmentStatusSelect = (r: RiwayatEquipment) => {
    const norm = (s: string): 'Normal' | 'Perbaikan' | 'Rusak' => {
      if (s === 'Rusak' || s === 'RUSAK') return 'Rusak';
      if (s === 'Perbaikan' || s === 'PERBAIKAN' || s === 'Maintenance') return 'Perbaikan';
      return 'Normal';
    };

    const currentVal = norm(r.status);
    const isRecentlySaved = lastSavedRiwayatId === r.id;

    const colorStyles: Record<string, string> = {
      Normal: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:border-emerald-400 focus:ring-emerald-400/50',
      Perbaikan: 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:border-amber-400 focus:ring-amber-400/50',
      Rusak: 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:border-rose-400 focus:ring-rose-400/50'
    };

    const chevronColor: Record<string, string> = {
      Normal: 'text-emerald-400',
      Perbaikan: 'text-amber-400',
      Rusak: 'text-rose-400'
    };

    return (
      <div className="inline-flex items-center gap-2">
        <div className="relative inline-flex items-center group">
          <select
            value={currentVal}
            onChange={(e) => {
              const newStatus = e.target.value as EquipmentStatus;
              handleQuickChangeHistoryStatus(r, newStatus);
            }}
            className={`appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs md:text-sm font-mono font-black border cursor-pointer transition-all duration-200 focus:outline-hidden focus:ring-2 select-history-status-dropdown ${
              colorStyles[currentVal] || colorStyles.Normal
            }`}
            title="Pilih status: NORMAL, PERBAIKAN, RUSAK (Tersimpan Otomatis)"
            id={`select-status-history-${r.id}`}
          >
            <option value="Normal" className="bg-slate-900 text-emerald-400 font-bold">
              NORMAL
            </option>
            <option value="Perbaikan" className="bg-slate-900 text-amber-400 font-bold">
              PERBAIKAN
            </option>
            <option value="Rusak" className="bg-slate-900 text-rose-400 font-bold">
              RUSAK
            </option>
          </select>
          <div className="absolute right-2.5 pointer-events-none flex items-center">
            <ChevronDown
              className={`w-3.5 h-3.5 ${
                chevronColor[currentVal] || 'text-emerald-400'
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

  const renderStatusBadge = (s: EquipmentStatus) => {
    const maps: Record<string, string> = {
      Normal: 'bg-emerald-100 border-emerald-300 text-emerald-950',
      NORMAL: 'bg-emerald-100 border-emerald-300 text-emerald-950',
      Maintenance: 'bg-amber-100 border-amber-300 text-amber-950',
      Perbaikan: 'bg-amber-100 border-amber-300 text-amber-950',
      PERBAIKAN: 'bg-amber-100 border-amber-300 text-amber-950',
      Rusak: 'bg-rose-100 border-rose-300 text-rose-950',
      RUSAK: 'bg-rose-100 border-rose-300 text-rose-950'
    };
    return (
      <span className={`px-3.5 py-1.5 rounded-full text-sm md:text-base font-black border ${maps[s] || 'bg-slate-100 text-slate-900'}`}>
        {s === 'Maintenance' ? 'PERBAIKAN' : s}
      </span>
    );
  };

  return (
    <div className="space-y-6" id="riwayat-equipment-tab-view">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <History className="h-6 w-6 text-purple-400 drop-shadow-[0_0_8px_#c084fc]" />
            RAPOT AREA
          </h2>
          <p className="text-sm md:text-base text-slate-200 mt-1.5 font-sans font-medium">
            Log histografi penanganan mesin, penggantian sparepart, overhaul chiller, kalibrasi lensa proyektor, dll.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-base font-bold text-white hover:bg-cyan-500 active:scale-95 transition-all shadow-[0_0_18px_rgba(0,240,255,0.4)] cursor-pointer shrink-0 border border-cyan-400/40"
          id="btn-add-history"
        >
          <Plus className="h-5 w-5" /> Log Riwayat Servis
        </button>
      </div>

      {/* List Card */}
      <div className="bg-[#0a0f1d]/80 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <History className="h-5 w-5 text-teal-400" />
            <span className="font-extrabold text-base tracking-tight text-white">Log Servis &amp; Pemeliharaan ({riwayat.length})</span>
          </div>
          <span className="text-xs md:text-sm font-mono text-cyan-400 font-extrabold">HIST_DB: OPERATIONAL_HIST</span>
        </div>

        {riwayat.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="h-8 w-8 mx-auto stroke-2 mb-2 text-slate-500" />
            <p className="text-base font-bold text-slate-300">Belum ada catatan riwayat pemeliharaan.</p>
          </div>
        ) : (
          <>
            {/* Mobile Log Cards */}
            <div className="block md:hidden divide-y divide-slate-800" id="history-mobile-list">
              {riwayat.map((r) => (
                <div key={r.id} className="p-4 space-y-3 hover:bg-slate-900/40 transition-colors" id={`history-card-mobile-${r.id}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-black text-white text-base font-sans">
                        {getEquipmentName(r.equipmentId)}
                      </p>
                      <p className="text-xs md:text-sm text-slate-300 mt-0.5 font-sans font-medium">
                        Area: <span className="font-black text-cyan-300">{getAreaName(r.areaId)}</span>
                      </p>
                    </div>
                    {renderEquipmentStatusSelect(r)}
                  </div>
                  
                  <div className="text-xs md:text-sm space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-sans">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono font-bold">DURASI:</span>
                      <span className="font-extrabold text-cyan-300">Mulai: {r.tanggalMulai}</span>
                    </div>
                    {r.tanggalSelesai && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-mono font-bold">SELESAI:</span>
                        <span className="font-black text-emerald-400">{r.tanggalSelesai}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400 font-mono font-bold">SPAREPART:</span>
                      <span className="font-black text-slate-200">{r.barangYangDiganti || 'Tidak ada'}</span>
                    </div>
                  </div>

                  {r.keterangan && (
                    <p className="text-sm md:text-base text-slate-200 font-bold bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-sans">
                      <span className="text-slate-400 font-extrabold uppercase font-mono text-xs block mb-0.5">Keterangan Tindakan:</span>
                      {r.keterangan}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => openEditModal(r)}
                      className="px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1 text-xs md:text-sm font-bold cursor-pointer"
                      title="Ubah"
                      id={`btn-edit-history-mobile-${r.id}`}
                    >
                      <Edit2 className="h-4 w-4" /> Ubah
                    </button>
                    <button
                      onClick={() => triggerDelete(r.id)}
                      className="px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors flex items-center gap-1 text-xs md:text-sm font-bold cursor-pointer border border-rose-500/30"
                      title="Hapus"
                      id={`btn-delete-history-mobile-${r.id}`}
                    >
                      <Trash2 className="h-4 w-4" /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse" id="history-table">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-sm md:text-base font-black text-slate-200 uppercase tracking-wider font-mono">
                    <th className="px-6 py-4">Equipment &amp; Lokasi</th>
                    <th className="px-6 py-4">Durasi Pengerjaan</th>
                    <th className="px-6 py-4">Barang / Suku Cadang Diganti</th>
                    <th className="px-6 py-4">Kondisi Akhir</th>
                    <th className="px-6 py-4">Keterangan Tindakan</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {riwayat.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors" id={`history-row-${r.id}`}>
                      <td className="px-6 py-4">
                        <p className="font-black text-white text-lg font-sans">
                          {getEquipmentName(r.equipmentId)}
                        </p>
                        <p className="text-sm md:text-base text-slate-300 mt-1 flex items-center gap-1 font-sans font-medium">
                          Area: <span className="font-black text-cyan-300">{getAreaName(r.areaId)}</span>
                        </p>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm md:text-base">
                        <p className="text-cyan-300 font-black">Mulai: {r.tanggalMulai}</p>
                        {r.tanggalSelesai ? (
                          <p className="text-emerald-400 font-extrabold mt-1">Selesai: {r.tanggalSelesai}</p>
                        ) : (
                          <p className="text-rose-400 font-extrabold mt-1">Status: Sedang Berlangsung</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-sm md:text-base font-black font-sans">
                          {r.barangYangDiganti || 'Tidak ada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderEquipmentStatusSelect(r)}
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <p className="text-base md:text-lg text-slate-200 font-bold line-clamp-3 leading-relaxed">
                          {r.keterangan || <span className="italic text-slate-500 font-medium">Tidak ada deskripsi</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                            title="Ubah"
                            id={`btn-edit-history-${r.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerDelete(r.id)}
                            className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Hapus"
                            id={`btn-delete-history-${r.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRiwayat ? 'Ubah Riwayat Pemeliharaan' : 'Log Riwayat Pemeliharaan'}
      >
        <form onSubmit={handleSaveSubmit} className="space-y-5 font-sans" id="form-history-add">
          
          <div className="grid grid-cols-2 gap-4">
            {/* Equipment Input */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Pilih Equipment <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={equipmentId}
                onChange={(e) => {
                  setEquipmentId(e.target.value);
                  setErrors({ ...errors, equipmentId: '' });
                }}
                placeholder="Ketik nama equipment..."
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500"
                id="input-history-eq"
              />
              {errors.equipmentId && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.equipmentId}</p>}
            </div>

            {/* Area */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Area Kejadian <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={areaId}
                onChange={(e) => {
                  setAreaId(e.target.value);
                  setErrors({ ...errors, areaId: '' });
                }}
                placeholder="Ketik area kejadian..."
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500"
                id="input-history-area"
              />
              {errors.areaId && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.areaId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tanggal Mulai */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Tanggal Mulai Servis <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={toISODate(tanggalMulai)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setTanggalMulai(getIndonesianDate(val));
                  } else {
                    setTanggalMulai('');
                  }
                  setErrors({ ...errors, tanggalMulai: '' });
                }}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all"
                id="input-history-date-start"
              />
              {errors.tanggalMulai && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.tanggalMulai}</p>}
            </div>

            {/* Tanggal Selesai */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Tanggal Selesai <span className="text-slate-300 font-normal font-sans text-xs">(Opsional)</span>
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
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all"
                id="input-history-date-end"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Barang Yang Diganti */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Suku Cadang Diganti <span className="text-slate-300 font-normal font-sans text-xs">(Opsional)</span>
              </label>
              <input
                type="text"
                value={barangYangDiganti}
                onChange={(e) => setBarangYangDiganti(e.target.value)}
                placeholder="Contoh: Valve Expansion York, Oli Compressor..."
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500"
                id="input-history-replaced-parts"
              />
            </div>

            {/* Status Akhir */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono">
                Kondisi Akhir Alat
              </label>
              <select
                value={status === 'Maintenance' ? 'Perbaikan' : status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all cursor-pointer"
                id="select-history-status"
              >
                <option value="Normal" className="text-slate-100 bg-slate-900 font-bold">NORMAL</option>
                <option value="Perbaikan" className="text-slate-100 bg-slate-900 font-bold">PERBAIKAN</option>
                <option value="Rusak" className="text-slate-100 bg-slate-900 font-bold">RUSAK</option>
              </select>
            </div>
          </div>

          {/* Keterangan */}
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
              Deskripsi Tindakan Perbaikan <span className="text-slate-300 font-normal font-sans text-xs">(Opsional)</span>
            </label>
            <textarea
              rows={3}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Tulis kronologi perbaikan secara rinci..."
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500 resize-none"
              id="input-history-desc"
            />
          </div>

          {/* Save buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-5 py-2.5 text-sm md:text-base font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm md:text-base font-black text-white hover:bg-cyan-500 active:scale-95 shadow-md transition-all cursor-pointer"
              id="btn-save-history"
            >
              <Check className="h-4 w-4" /> Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation popup */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Log Riwayat"
        message="Yakin ingin menghapus catatan sejarah pemeliharaan alat ini? Tindakan ini tidak dapat dibatalkan."
      />
    </div>
  );
}
