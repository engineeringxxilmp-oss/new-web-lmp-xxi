/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Equipment, Area, EquipmentStatus } from '../types';
import { Plus, Edit2, Trash2, Wrench, ShieldAlert, Check, HelpCircle, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

interface EquipmentProps {
  equipment: Equipment[];
  areas: Area[];
  onSave: (eq: Equipment) => void;
  onDelete: (id: string) => void;
}

export default function EquipmentView({ equipment, areas, onSave, onDelete }: EquipmentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSavedEqId, setLastSavedEqId] = useState<string | null>(null);

  // Quick change status with auto-save
  const handleQuickChangeEquipmentStatus = (eq: Equipment, newStatus: EquipmentStatus) => {
    const updated: Equipment = {
      ...eq,
      status: newStatus
    };
    onSave(updated);
    setLastSavedEqId(eq.id);
    setTimeout(() => {
      setLastSavedEqId((prev) => (prev === eq.id ? null : prev));
    }, 2000);
  };

  // Form states
  const [name, setName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<EquipmentStatus>('Normal');
  const [keterangan, setKeterangan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openAddModal = () => {
    setEditingEq(null);
    setName('');
    setAreaId(areas[0]?.id || '');
    setQuantity(1);
    setStatus('Normal');
    setKeterangan('');
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (eq: Equipment) => {
    setEditingEq(eq);
    setName(eq.name);
    setAreaId(eq.areaId);
    setQuantity(eq.quantity);
    setStatus(eq.status);
    setKeterangan(eq.keterangan);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Nama Equipment wajib diisi.';
    if (!areaId) newErrors.areaId = 'Wajib memilih area.';
    if (quantity < 1) newErrors.quantity = 'Quantity minimal 1.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const eqPayload: Equipment = {
      id: editingEq ? editingEq.id : `eq-${Date.now()}`,
      name: name.trim(),
      areaId,
      quantity: Number(quantity),
      status,
      keterangan: keterangan.trim()
    };

    onSave(eqPayload);
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

  const renderEquipmentStatusSelect = (eq: Equipment) => {
    const norm = (s: string): 'Normal' | 'Perbaikan' | 'Rusak' => {
      if (s === 'Rusak' || s === 'RUSAK') return 'Rusak';
      if (s === 'Perbaikan' || s === 'PERBAIKAN' || s === 'Maintenance') return 'Perbaikan';
      return 'Normal';
    };

    const currentVal = norm(eq.status);
    const isRecentlySaved = lastSavedEqId === eq.id;

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
              handleQuickChangeEquipmentStatus(eq, newStatus);
            }}
            className={`appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs md:text-sm font-mono font-black border cursor-pointer transition-all duration-200 focus:outline-hidden focus:ring-2 select-eq-status-dropdown ${
              colorStyles[currentVal] || colorStyles.Normal
            }`}
            title="Pilih status: NORMAL, PERBAIKAN, RUSAK (Tersimpan Otomatis)"
            id={`select-status-eq-${eq.id}`}
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

  // Modern status pill badges based on color constraints:
  // Hijau = Normal, Kuning = Maintenance / Perbaikan, Merah = Rusak
  const renderStatusBadge = (s: EquipmentStatus) => {
    const configs: Record<string, { bg: string; label: string; dot: string }> = {
      Normal: { bg: 'bg-emerald-100 border-emerald-300 text-emerald-950', label: 'NORMAL', dot: 'bg-emerald-600' },
      NORMAL: { bg: 'bg-emerald-100 border-emerald-300 text-emerald-950', label: 'NORMAL', dot: 'bg-emerald-600' },
      Maintenance: { bg: 'bg-amber-100 border-amber-300 text-amber-950', label: 'PERBAIKAN', dot: 'bg-amber-600' },
      Perbaikan: { bg: 'bg-amber-100 border-amber-300 text-amber-950', label: 'PERBAIKAN', dot: 'bg-amber-600' },
      PERBAIKAN: { bg: 'bg-amber-100 border-amber-300 text-amber-950', label: 'PERBAIKAN', dot: 'bg-amber-600' },
      Rusak: { bg: 'bg-rose-100 border-rose-300 text-rose-950', label: 'RUSAK', dot: 'bg-rose-600' },
      RUSAK: { bg: 'bg-rose-100 border-rose-300 text-rose-950', label: 'RUSAK', dot: 'bg-rose-600' }
    };
    const c = configs[s] || configs.Normal;
    return (
      <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm md:text-base font-black border ${c.bg}`}>
        <span className={`h-3 w-3 rounded-full ${c.dot} animate-pulse`} />
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6" id="equipment-tab-view">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <Wrench className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
            Daftar Equipment
          </h2>
          <p className="text-sm md:text-base text-slate-200 mt-1.5 font-sans font-medium">
            Kelola data logistik, AC, projector, sound system, kelistrikan, dan aset engineering di CINEMA XXI LIPPO MALL PURI.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-base font-bold text-white hover:bg-cyan-500 active:scale-95 transition-all shadow-[0_0_18px_rgba(0,240,255,0.4)] cursor-pointer shrink-0 border border-cyan-400/40"
          id="btn-add-equipment"
        >
          <Plus className="h-5 w-5" /> Tambah Equipment
        </button>
      </div>

      {/* Main Table View */}
      <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Wrench className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <span className="font-extrabold text-base tracking-tight text-cyan-300">Equipment List ({equipment.length})</span>
          </div>
          <div className="flex gap-4 text-xs md:text-sm font-mono text-slate-200 font-extrabold">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> NORMAL</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" /> PERBAIKAN</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" /> RUSAK</span>
          </div>
        </div>

        {equipment.length === 0 ? (
          <div className="p-12 text-center text-slate-300">
            <HelpCircle className="h-8 w-8 mx-auto stroke-2 mb-2 text-cyan-400" />
            <p className="text-base font-bold text-slate-200">Belum ada equipment terdaftar.</p>
            <button
              onClick={openAddModal}
              className="mt-3 text-sm font-bold text-cyan-400 hover:underline cursor-pointer"
            >
              Tambah equipment pertama Anda
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-800" id="equipment-mobile-list">
              {equipment.map((eq) => (
                <div key={eq.id} className="p-4 space-y-3 hover:bg-slate-800/40 transition-colors" id={`eq-card-mobile-${eq.id}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-black text-white text-base font-sans">{eq.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-2.5 py-1 rounded-md bg-slate-800 text-cyan-300 text-xs font-black border border-cyan-500/30">
                          {getAreaName(eq.areaId)}
                        </span>
                        <span className="text-xs font-mono text-emerald-300 font-extrabold">Qty: {eq.quantity}</span>
                      </div>
                    </div>
                    {renderEquipmentStatusSelect(eq)}
                  </div>
                  {eq.keterangan && (
                    <p className="text-sm md:text-base text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-slate-800 font-sans font-bold">
                      {eq.keterangan}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => openEditModal(eq)}
                      className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors flex items-center gap-1.5 text-xs md:text-sm font-black cursor-pointer"
                      title="Ubah"
                      id={`btn-edit-eq-mobile-${eq.id}`}
                    >
                      <Edit2 className="h-4 w-4" /> Ubah
                    </button>
                    <button
                      onClick={() => triggerDelete(eq.id)}
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors flex items-center gap-1.5 text-xs md:text-sm font-black cursor-pointer"
                      title="Hapus"
                      id={`btn-delete-eq-mobile-${eq.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse" id="equipment-table">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-sm md:text-base font-black text-cyan-300 uppercase tracking-wider font-mono">
                    <th className="px-6 py-4">Nama Equipment</th>
                    <th className="px-6 py-4">Area</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {equipment.map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-800/40 transition-colors" id={`eq-row-${eq.id}`}>
                      <td className="px-6 py-4">
                        <p className="font-black text-white text-lg font-sans">{eq.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3.5 py-1.5 rounded-md bg-slate-800 text-cyan-300 text-sm md:text-base font-black border border-cyan-500/30">
                          {getAreaName(eq.areaId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-lg md:text-xl text-emerald-300 font-mono">
                        {eq.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderEquipmentStatusSelect(eq)}
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <p className="text-sm md:text-base text-slate-200 font-bold line-clamp-3 leading-relaxed">
                          {eq.keterangan || <span className="italic text-slate-500 font-medium">Tidak ada keterangan</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(eq)}
                            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                            title="Ubah"
                            id={`btn-edit-eq-${eq.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerDelete(eq.id)}
                            className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Hapus"
                            id={`btn-delete-eq-${eq.id}`}
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

      {/* Add / Edit Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEq ? '🔧 Ubah Data Equipment' : '➕ Tambah Equipment Baru'}
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveSubmit} className="space-y-5 font-sans" id="form-equipment">
          
          {/* Top small reminder message */}
          <div className="text-xs md:text-sm text-cyan-200 bg-cyan-950/60 px-3.5 py-2.5 rounded-xl border border-cyan-500/30 flex items-center gap-2 leading-none">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
            <span className="font-semibold">Mohon isi detail equipment bioskop dengan lengkap.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Equipment Name */}
              <div className="space-y-1.5">
                <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
                  Nama Equipment <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors({ ...errors, name: '' });
                  }}
                  placeholder="Contoh: Chiller York 50 TR, Projector Barco..."
                  className="w-full h-12 md:h-13 rounded-xl border-2 border-slate-700 px-4 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all placeholder:text-slate-500"
                  id="input-eq-name"
                />
                {errors.name && <p className="text-sm font-semibold text-rose-400 mt-0.5">{errors.name}</p>}
              </div>

              {/* Area Selector */}
              <div className="space-y-1.5">
                <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
                  Area Penempatan <span className="text-rose-400">*</span>
                </label>
                <select
                  value={areaId}
                  onChange={(e) => {
                    setAreaId(e.target.value);
                    setErrors({ ...errors, areaId: '' });
                  }}
                  className="w-full h-12 md:h-13 rounded-xl border-2 border-slate-700 px-4 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all cursor-pointer"
                  id="select-eq-area"
                >
                  <option value="" disabled className="text-slate-500 bg-slate-900">Pilih Area...</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id} className="text-white bg-slate-900">{a.name}</option>
                  ))}
                </select>
                {errors.areaId && <p className="text-sm font-semibold text-rose-400 mt-0.5">{errors.areaId}</p>}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
                    Quantity <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(Number(e.target.value));
                      setErrors({ ...errors, quantity: '' });
                    }}
                    className="w-full h-12 md:h-13 rounded-xl border-2 border-slate-700 px-4 text-base md:text-lg font-bold text-emerald-300 bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all text-center font-mono"
                    id="input-eq-qty"
                  />
                  {errors.quantity && <p className="text-sm font-semibold text-rose-400 mt-0.5">{errors.quantity}</p>}
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
                    Status Kondisi
                  </label>
                  <select
                    value={status === 'Maintenance' ? 'Perbaikan' : status}
                    onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                    className="w-full h-12 md:h-13 rounded-xl border-2 border-slate-700 px-4 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all cursor-pointer font-mono"
                    id="select-eq-status"
                  >
                    <option value="Normal" className="text-emerald-400 bg-slate-900 font-bold">NORMAL</option>
                    <option value="Perbaikan" className="text-amber-400 bg-slate-900 font-bold">PERBAIKAN</option>
                    <option value="Rusak" className="text-rose-400 bg-slate-900 font-bold">RUSAK</option>
                  </select>
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1.5">
                <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
                  Keterangan Tambahan <span className="text-slate-400 font-normal font-sans text-xs">(Opsional)</span>
                </label>
                <textarea
                  rows={2.5}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Tulis perawatan terbaru, serial komponen, atau kendala..."
                  className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all placeholder:text-slate-500 resize-none"
                  id="input-eq-desc"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-5 py-2.5 text-sm md:text-base font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/50 px-6 py-2.5 text-sm md:text-base font-black text-white active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
              id="btn-save-eq"
            >
              <Check className="h-4 w-4 stroke-[2.5]" /> Simpan Equipment
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation popup */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Equipment"
        message="Yakin ingin menghapus data equipment ini? Tindakan ini tidak dapat dibatalkan."
      />
    </div>
  );
}
