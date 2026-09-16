/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VendorTeknisi, Area, VendorStatus } from '../types';
import { Plus, Edit2, Trash2, Users, Check, Clock, ShieldCheck, Calendar, Hourglass, BarChart3, MapPin, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getIndonesianDate, toISODate } from './PrEngineering';

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
  vendorsList.forEach(v => {
    const isoDate = toISODate(v.tanggal);
    if (isoDate) {
      const monthPart = isoDate.substring(0, 7); // YYYY-MM
      monthsSet.add(monthPart);
    }
  });
  return monthsSet.size || 0;
}

interface VendorTeknisiProps {
  vendors: VendorTeknisi[];
  areas: Area[];
  onSave: (v: VendorTeknisi) => void;
  onDelete: (id: string) => void;
}

export default function VendorTeknisiView({ vendors, areas, onSave, onDelete }: VendorTeknisiProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorTeknisi | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSavedVendorId, setLastSavedVendorId] = useState<string | null>(null);

  // Quick status change with auto-save
  const handleQuickChangeVendorStatus = (v: VendorTeknisi, newStatus: VendorStatus) => {
    const updated: VendorTeknisi = {
      ...v,
      status: newStatus,
      tanggalSelesai: newStatus === 'Selesai' ? (v.tanggalSelesai?.trim() ? v.tanggalSelesai : getIndonesianDate()) : (v.tanggalSelesai || v.tanggal)
    };
    onSave(updated);
    setLastSavedVendorId(v.id);
    setTimeout(() => {
      setLastSavedVendorId((prev) => (prev === v.id ? null : prev));
    }, 2000);
  };

  // Form states
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

  const openAddModal = () => {
    setEditingVendor(null);
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

  const renderVendorStatusSelect = (v: VendorTeknisi) => {
    const norm = (s: string): VendorStatus => {
      if (s === 'Selesai') return 'Selesai';
      if (s === 'On Progress' || s === 'Sedang Di Proses' || s === 'Sedang Diproses') return 'Sedang Di Proses';
      return 'Belum Di Kerjakan';
    };

    const currentVal = norm(v.status);
    const isRecentlySaved = lastSavedVendorId === v.id;

    const colorStyles: Record<string, string> = {
      'Belum Di Kerjakan': 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:border-rose-400 focus:ring-rose-400/50',
      'Sedang Di Proses': 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:border-amber-400 focus:ring-amber-400/50',
      'Selesai': 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:border-emerald-400 focus:ring-emerald-400/50'
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
              Belum Di Kerjakan
            </option>
            <option value="Sedang Di Proses" className="bg-slate-900 text-amber-400 font-bold">
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

  const renderStatusBadge = (s: VendorStatus) => {
    const maps = {
      'Belum': { bg: 'bg-rose-100 text-rose-950 border-rose-300', dot: 'bg-rose-600', label: 'Belum Mulai' },
      'On Progress': { bg: 'bg-amber-100 text-amber-950 border-amber-300', dot: 'bg-amber-600', label: 'Sedang Berjalan' },
      'Selesai': { bg: 'bg-emerald-100 text-emerald-950 border-emerald-300', dot: 'bg-emerald-600', label: 'Selesai' }
    };
    const c = maps[s] || { bg: 'bg-slate-200 text-slate-950 border-slate-300', dot: 'bg-slate-600', label: s };
    return (
      <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm md:text-base font-black border whitespace-nowrap shadow-2xs ${c.bg}`}>
        <span className={`h-3 w-3 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  };

  // Analytics calculations for vendor visit duration (Bulan, Hari, Jam)
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
  
  const totalHoursConverted = (totalMinsAll / 60).toFixed(1);
  const totalDaysConverted = (totalMinsAll / (24 * 60)).toFixed(1);
  const totalMonthsConverted = (totalMinsAll / (30 * 24 * 60)).toFixed(2);

  return (
    <div className="space-y-6" id="vendor-teknisi-tab-view">
      {/* Intro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <Users className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
            Vendor &amp; Teknisi
          </h2>
          <p className="text-sm md:text-base text-slate-300 mt-1 font-sans">
            Log pekerjaan vendor external, servis berkala, dan penugasan kontraktor pihak ketiga.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-base font-bold text-white hover:bg-cyan-500 active:scale-95 transition-all shadow-[0_0_18px_rgba(0,240,255,0.4)] cursor-pointer shrink-0 border border-cyan-400/40"
          id="btn-add-vendor"
        >
          <Plus className="h-5 w-5" /> Tambah Log Kerja
        </button>
      </div>

      {/* Kunjungan Duration Analytics Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="vendor-duration-stats">
        {/* Card 1: Akumulasi Campuran */}
        <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300">
          <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40 group-hover:scale-105 transition-transform">
            <Hourglass className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-sm md:text-base font-black text-amber-400 tracking-wider uppercase font-mono">Total Akumulasi Waktu</p>
          <p className="text-3xl md:text-4xl font-black text-white mt-2 font-sans tracking-tight">
            {totalMonths > 0 ? `${totalMonths} Bln ` : ''}
            {totalDays > 0 ? `${totalDays} Hari ` : ''}
            {totalHours > 0 ? `${totalHours} Jam` : totalRemainingMinutes > 0 ? `${totalRemainingMinutes} Mnt` : '0 Jam'}
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-sm md:text-base text-slate-300 font-bold font-sans">
            <span>Detail Waktu</span>
            <span className="font-extrabold font-mono text-cyan-300 text-sm md:text-base">
              {totalMonths}m {totalDays}d {totalHours}h {totalRemainingMinutes}m
            </span>
          </div>
        </div>

        {/* Card 2: Total Hari */}
        <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
          <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/40 group-hover:scale-105 transition-transform">
            <Calendar className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-sm md:text-base font-black text-blue-400 tracking-wider uppercase font-mono">Total Hari Kunjungan</p>
          <p className="text-3xl md:text-4xl font-black text-white mt-2 font-sans tracking-tight">
            {totalDaysConverted} <span className="text-base md:text-lg font-extrabold text-slate-300 uppercase font-mono">Hari</span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-sm md:text-base text-slate-300 font-bold font-sans">
            <span>Perkiraan Bulan</span>
            <span className="font-extrabold font-mono text-cyan-300 text-sm md:text-base">~{totalMonthsConverted} Bulan</span>
          </div>
        </div>

        {/* Card 3: Total Jam */}
        <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
          <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 group-hover:scale-105 transition-transform">
            <Clock className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm md:text-base font-black text-emerald-400 tracking-wider uppercase font-mono">Total Jam Kunjungan</p>
          <p className="text-3xl md:text-4xl font-black text-white mt-2 font-sans tracking-tight">
            {Math.floor(totalMinsAll / 60).toLocaleString('id-ID')} <span className="text-base md:text-lg font-extrabold text-slate-300 uppercase font-mono">Jam</span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-sm md:text-base text-slate-300 font-bold font-sans">
            <span>Sisa Menit</span>
            <span className="font-extrabold font-mono text-cyan-300 text-sm md:text-base">{totalMinsAll % 60} Menit</span>
          </div>
        </div>

        {/* Card 4: Bulan & Sesi */}
        <div className="bg-[#0a0f1d]/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
          <div className="absolute right-4 top-4 h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/40 group-hover:scale-105 transition-transform">
            <BarChart3 className="h-6 w-6 text-purple-400" />
          </div>
          <p className="text-sm md:text-base font-black text-purple-400 tracking-wider uppercase font-mono">Siklus &amp; Frekuensi</p>
          <p className="text-3xl md:text-4xl font-black text-white mt-2 font-sans tracking-tight">
            {uniqueMonths} <span className="text-base md:text-lg font-extrabold text-slate-300 uppercase font-mono">Bulan Aktif</span>
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-sm md:text-base text-slate-300 font-bold font-sans">
            <span>Sesi Kunjungan</span>
            <span className="font-extrabold font-mono text-cyan-300 text-sm md:text-base">{totalSessions} Kali Visit</span>
          </div>
        </div>
      </div>

      {/* List Table */}
      <div className="bg-[#0a0f1d]/80 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-emerald-400" />
            <span className="font-extrabold text-base tracking-tight text-white">Kunjungan Vendor ({vendors.length})</span>
          </div>
          <span className="text-xs md:text-sm font-mono text-cyan-400 font-extrabold">LOG_DEPT: SPECIALIST_KONTRAK</span>
        </div>

        {vendors.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-400">
            <Users className="h-8 w-8 mx-auto stroke-2 mb-2 text-slate-500" />
            <p className="text-base font-bold text-slate-300">Belum ada kunjungan vendor terdaftar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800" id="vendor-list-container">
            {vendors.map((v) => {
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
                    {/* Header Row: Badges and Tags */}
                    <div className="flex flex-wrap items-center gap-2.5">
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

                    {/* Vendor Name & Teknisi */}
                    <div>
                      <h4 className="font-black text-white text-lg md:text-xl leading-snug">
                        {v.namaVendor}
                      </h4>
                      <p className="text-sm md:text-base text-slate-300 font-sans mt-0.5">
                        Teknisi Lapangan: <span className="font-extrabold text-cyan-300">{v.namaTeknisi}</span>
                      </p>
                    </div>

                    {/* Hasil Pekerjaan */}
                    {v.hasilPekerjaan ? (
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm md:text-base text-slate-200 font-medium leading-relaxed">
                        <span className="text-xs font-mono font-bold uppercase text-slate-400 block mb-1">Hasil &amp; Progres Pekerjaan:</span>
                        {v.hasilPekerjaan}
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-500">Belum ada catatan hasil pekerjaan.</p>
                    )}
                  </div>

                  {/* Right Section: Status with Auto-Save & Action Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800 shrink-0">
                    <div>
                      {renderVendorStatusSelect(v)}
                    </div>

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

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? 'Ubah Log Kunjungan' : 'Tambah Log Kunjungan'}
      >
        <form onSubmit={handleSaveSubmit} className="space-y-5 font-sans" id="form-vendor-work">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Vendor */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Nama Vendor <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={namaVendor}
                onChange={(e) => {
                  setNamaVendor(e.target.value);
                  setErrors({ ...errors, namaVendor: '' });
                }}
                placeholder="Contoh: PT Barco Indonesia"
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500"
                id="input-vendor-name"
              />
              {errors.namaVendor && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.namaVendor}</p>}
            </div>

            {/* Nama Teknisi */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Nama Teknisi Pelaksana <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={namaTeknisi}
                onChange={(e) => {
                  setNamaTeknisi(e.target.value);
                  setErrors({ ...errors, namaTeknisi: '' });
                }}
                placeholder="Contoh: Hendra Wijaya"
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500"
                id="input-vendor-tech-name"
              />
              {errors.namaTeknisi && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.namaTeknisi}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal Mulai */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Tanggal Visit Mulai <span className="text-red-400">*</span>
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
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all"
                id="input-vendor-date"
              />
              {errors.tanggal && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.tanggal}</p>}
            </div>

            {/* Tanggal Selesai */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Tanggal Visit Selesai <span className="text-red-400">*</span>
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
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all"
                id="input-vendor-date-end"
              />
              {errors.tanggalSelesai && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.tanggalSelesai}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Jam Mulai */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                <Clock className="w-4 h-4 text-cyan-400" /> Mulai (24H) <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={jamMulai}
                onChange={(e) => {
                  setJamMulai(e.target.value);
                  setErrors({ ...errors, jamMulai: '' });
                }}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all text-center"
                id="input-vendor-time-start"
              />
              {errors.jamMulai && <p className="text-xs font-semibold text-rose-500 mt-0.5 leading-tight">{errors.jamMulai}</p>}
            </div>

            {/* Jam Selesai */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                <Clock className="w-4 h-4 text-cyan-400" /> Selesai (24H) <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={jamSelesai}
                onChange={(e) => {
                  setJamSelesai(e.target.value);
                  setErrors({ ...errors, jamSelesai: '' });
                }}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all text-center"
                id="input-vendor-time-end"
              />
              {errors.jamSelesai && <p className="text-xs font-semibold text-rose-500 mt-0.5 leading-tight">{errors.jamSelesai}</p>}
            </div>
          </div>

          {/* Live Calculated Duration Preview */}
          <div className="bg-blue-950/60 border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-200 font-sans shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
                <Clock className="w-4 h-4 text-cyan-300 animate-pulse" />
              </div>
              <div>
                <span className="font-bold block text-white text-sm">Durasi Kunjungan Otomatis:</span>
                <span className="text-xs text-cyan-300 font-medium font-mono uppercase">BERDASARKAN TANGGAL &amp; JAM</span>
              </div>
            </div>
            <span className="font-black bg-cyan-600 text-white px-4 py-2 rounded-xl text-sm font-mono tracking-tight shadow-sm self-start sm:self-center">
              {formatDuration(getDurationMinutes(tanggal, tanggalSelesai || tanggal, jamMulai, jamSelesai))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Area Pekerjaan */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Area Pekerjaan <span className="text-red-400">*</span>
              </label>
              <select
                value={areaId}
                onChange={(e) => {
                  setAreaId(e.target.value);
                  setErrors({ ...errors, areaId: '' });
                }}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all cursor-pointer"
                id="select-vendor-area"
              >
                <option value="" disabled className="text-slate-500 bg-slate-900">Pilih Area...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id} className="text-slate-100 bg-slate-900">{a.name}</option>
                ))}
              </select>
              {errors.areaId && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.areaId}</p>}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono">
                Status Progress
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VendorStatus)}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all cursor-pointer"
                id="select-vendor-status"
              >
                <option value="Belum Di Kerjakan" className="text-slate-100 bg-slate-900 font-bold">Belum Di Kerjakan</option>
                <option value="Sedang Di Proses" className="text-slate-100 bg-slate-900 font-bold">Sedang Di Proses</option>
                <option value="Selesai" className="text-slate-100 bg-slate-900 font-bold">Selesai</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Siapa yang nemenin? */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Siapa yang nemenin? <span className="text-red-400">*</span>
              </label>
              <select
                value={siapaYangNemenin}
                onChange={(e) => setSiapaYangNemenin(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all cursor-pointer"
                id="select-vendor-escort"
              >
                <option value="TEKNIK" className="text-slate-100 bg-slate-900">TEKNIK</option>
                <option value="CS" className="text-slate-100 bg-slate-900">CS</option>
                <option value="CAFE" className="text-slate-100 bg-slate-900">CAFE</option>
                <option value="SECURITY" className="text-slate-100 bg-slate-900">SECURITY</option>
                <option value="PREMIERE" className="text-slate-100 bg-slate-900">PREMIERE</option>
                <option value="MULA MULA" className="text-slate-100 bg-slate-900">MULA MULA</option>
              </select>
            </div>
          </div>

          {/* Hasil Pekerjaan */}
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
              Hasil Pekerjaan / Laporan Singkat <span className="text-slate-300 font-normal font-sans text-xs">(Opsional)</span>
            </label>
            <textarea
              rows={3}
              value={hasilPekerjaan}
              onChange={(e) => setHasilPekerjaan(e.target.value)}
              placeholder="Tulis sparepart yang diganti, setelan parameter mesin, atau status kelayakan..."
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500 resize-none"
              id="input-vendor-results"
            />
          </div>

          {/* Save triggers */}
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
              id="btn-save-vendor"
            >
              <Check className="h-4 w-4" /> Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm deletion */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Log Vendor"
        message="Yakin ingin menghapus data log pekerjaan vendor ini? Tindakan ini bersifat permanen."
      />
    </div>
  );
}
