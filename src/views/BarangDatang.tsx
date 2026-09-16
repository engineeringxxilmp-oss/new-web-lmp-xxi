/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BarangDatang, BarangStatus } from '../types';
import { Plus, Edit2, Trash2, PackageCheck, Check, AlertCircle, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getIndonesianDate, toISODate } from './PrEngineering';

interface BarangDatangProps {
  items: BarangDatang[];
  onSave: (item: BarangDatang) => void;
  onDelete: (id: string) => void;
}

export default function BarangDatangView({ items, onSave, onDelete }: BarangDatangProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BarangDatang | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  // Form states
  const [tanggalBarangDatang, setTanggalBarangDatang] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sesuaiOrder, setSesuaiOrder] = useState(true);
  const [status, setStatus] = useState<BarangStatus>('Sudah Datang');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openAddModal = () => {
    setEditingItem(null);
    setTanggalBarangDatang(getIndonesianDate());
    setNamaBarang('');
    setQuantity(1);
    setSesuaiOrder(true);
    setStatus('Sudah Datang');
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item: BarangDatang) => {
    setEditingItem(item);
    setTanggalBarangDatang(item.tanggalBarangDatang);
    setNamaBarang(item.namaBarang);
    setQuantity(item.quantity);
    setSesuaiOrder(item.sesuaiOrder);
    setStatus(item.status);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!namaBarang.trim()) newErrors.namaBarang = 'Nama Barang wajib diisi.';
    if (!tanggalBarangDatang.trim()) newErrors.tanggalBarangDatang = 'Tanggal barang datang wajib diisi.';
    if (quantity < 1) newErrors.quantity = 'Quantity minimal 1.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: BarangDatang = {
      id: editingItem ? editingItem.id : `arr-${Date.now()}`,
      tanggalBarangDatang: tanggalBarangDatang.trim(),
      namaBarang: namaBarang.trim(),
      quantity: Number(quantity),
      sesuaiOrder,
      status
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

  const handleQuickChangeStatus = (item: BarangDatang, newStatus: BarangStatus) => {
    const updated: BarangDatang = {
      ...item,
      status: newStatus
    };
    onSave(updated);
    setLastSavedId(item.id);
    setTimeout(() => {
      setLastSavedId((prev) => (prev === item.id ? null : prev));
    }, 2000);
  };

  const renderGoodsStatusSelect = (item: BarangDatang) => {
    const norm = (s: string): BarangStatus => {
      if (s === 'Sudah Datang' || s === 'Sudah Dateng') return 'Sudah Dateng';
      if (s === 'Dalam Pengiriman') return 'Dalam Pengiriman';
      return 'Belum Dateng';
    };

    const currentVal = norm(item.status);
    const isRecentlySaved = lastSavedId === item.id;

    const colorStyles: Record<string, string> = {
      'Sudah Dateng': 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:border-emerald-400 focus:ring-emerald-400/50',
      'Dalam Pengiriman': 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] hover:border-amber-400 focus:ring-amber-400/50',
      'Belum Dateng': 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:border-rose-400 focus:ring-rose-400/50'
    };

    const chevronColor: Record<string, string> = {
      'Sudah Dateng': 'text-emerald-400',
      'Dalam Pengiriman': 'text-amber-400',
      'Belum Dateng': 'text-rose-400'
    };

    return (
      <div className="inline-flex items-center gap-2">
        <div className="relative inline-flex items-center group">
          <select
            value={currentVal}
            onChange={(e) => {
              const newStatus = e.target.value as BarangStatus;
              handleQuickChangeStatus(item, newStatus);
            }}
            className={`appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs font-mono font-black border cursor-pointer transition-all duration-200 focus:outline-hidden focus:ring-2 select-goods-status-dropdown ${
              colorStyles[currentVal] || colorStyles['Belum Dateng']
            }`}
            title="Pilih opsi: Belum Dateng, Sudah Dateng, atau Dalam Pengiriman (Tersimpan Otomatis)"
            id={`select-status-goods-page-${item.id}`}
          >
            <option value="Belum Dateng" className="bg-slate-900 text-rose-400 font-bold">
              Belum Dateng
            </option>
            <option value="Sudah Dateng" className="bg-slate-900 text-emerald-400 font-bold">
              Sudah Dateng
            </option>
            <option value="Dalam Pengiriman" className="bg-slate-900 text-amber-400 font-bold">
              Dalam Pengiriman
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
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse">
            <Check className="w-3 h-3 text-emerald-400" /> Tersimpan
          </span>
        )}
      </div>
    );
  };

  const renderSesuaiBadge = (sesuai: boolean) => {
    return sesuai ? (
      <span className="px-3 py-1.5 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300 text-sm md:text-base font-black inline-flex items-center gap-1.5">
        <Check className="w-4.5 h-4.5 text-emerald-700" /> Sesuai Order
      </span>
    ) : (
      <span className="px-3 py-1.5 rounded-md bg-rose-100 text-rose-950 border border-rose-300 text-sm md:text-base font-black inline-flex items-center gap-1.5">
        <AlertCircle className="w-4.5 h-4.5 text-rose-700" /> Selisih / Tidak Sesuai
      </span>
    );
  };

  const renderStatusBadge = (s: BarangStatus) => {
    const maps: Record<string, string> = {
      'Belum Datang': 'bg-slate-200 text-slate-950 border-slate-300',
      'Belum Dateng': 'bg-rose-100 text-rose-950 border-rose-300',
      'Dalam Pengiriman': 'bg-amber-100 text-amber-950 border-amber-300',
      'Sudah Datang': 'bg-emerald-100 text-emerald-950 border-emerald-300',
      'Sudah Dateng': 'bg-emerald-100 text-emerald-950 border-emerald-300'
    };
    return (
      <span className={`px-3.5 py-1.5 rounded-full text-sm md:text-base font-black border ${maps[s] || 'bg-slate-100 text-slate-900'}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6" id="barang-datang-tab-view">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <PackageCheck className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
            Barang Datang / Penerimaan
          </h2>
          <p className="text-sm md:text-base text-slate-200 mt-1.5 font-sans font-medium">
            Verifikasi dan log barang yang dikirim oleh vendor, kurir, atau divisi purchasing untuk dicocokkan dengan order.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-base font-bold text-white hover:bg-cyan-500 active:scale-95 transition-all shadow-[0_0_18px_rgba(0,240,255,0.4)] cursor-pointer shrink-0 border border-cyan-400/40"
          id="btn-add-barang-datang"
        >
          <Plus className="h-5 w-5" /> Catat Barang Datang
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#0a0f1d]/80 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <PackageCheck className="h-5 w-5 text-purple-400" />
            <span className="font-extrabold text-base tracking-tight text-white">Barang Diterima / Dalam Transit ({items.length})</span>
          </div>
          <span className="text-xs md:text-sm font-mono text-cyan-400 font-extrabold">RECEIPT_LOG: WH_INCOMING</span>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <PackageCheck className="h-8 w-8 mx-auto stroke-2 mb-2 text-slate-500" />
            <p className="text-base font-bold text-slate-300">Belum ada penerimaan barang terdaftar.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-slate-800" id="incoming-goods-mobile-list">
              {items.map((item) => (
                <div key={item.id} className="p-4 space-y-3 bg-slate-950/60" id={`goods-card-mobile-${item.id}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-black text-white text-base font-sans">{item.namaBarang}</p>
                      <p className="text-xs font-mono font-bold text-slate-400 mt-1">Tanggal Diterima: <span className="font-extrabold text-cyan-300">{item.tanggalBarangDatang}</span></p>
                    </div>
                    {renderGoodsStatusSelect(item)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-extrabold text-cyan-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700 text-xs">Qty: {item.quantity} Pcs</span>
                    {renderSesuaiBadge(item.sesuaiOrder)}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
                    <button
                      onClick={() => openEditModal(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      id={`btn-edit-goods-m-${item.id}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Ubah
                    </button>
                    <button
                      onClick={() => triggerDelete(item.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-rose-500/30"
                      id={`btn-delete-goods-m-${item.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse" id="incoming-goods-table">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-sm md:text-base font-black text-slate-200 uppercase tracking-wider font-mono">
                    <th className="px-6 py-4">Tanggal Penerimaan</th>
                    <th className="px-6 py-4">Nama Barang</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4">Verifikasi Order</th>
                    <th className="px-6 py-4">Status Kurir</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors" id={`goods-row-${item.id}`}>
                      <td className="px-6 py-4 font-mono text-sm md:text-base font-black text-cyan-300">
                        {item.tanggalBarangDatang}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-white text-lg font-sans">{item.namaBarang}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-lg md:text-xl text-white font-mono">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4">
                        {renderSesuaiBadge(item.sesuaiOrder)}
                      </td>
                      <td className="px-6 py-4">
                        {renderGoodsStatusSelect(item)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                            title="Ubah"
                            id={`btn-edit-goods-${item.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerDelete(item.id)}
                            className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Hapus"
                            id={`btn-delete-goods-${item.id}`}
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
        title={editingItem ? 'Ubah Penerimaan Barang' : 'Log Penerimaan Barang'}
      >
        <form onSubmit={handleSaveSubmit} className="space-y-5 font-sans" id="form-goods-arrival">
          
          {/* Tanggal */}
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
              Tanggal Barang Datang / Rencana Datang <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={toISODate(tanggalBarangDatang)}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  setTanggalBarangDatang(getIndonesianDate(val));
                } else {
                  setTanggalBarangDatang('');
                }
                setErrors({ ...errors, tanggalBarangDatang: '' });
              }}
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all"
              id="input-goods-arrival-date"
            />
            {errors.tanggalBarangDatang && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.tanggalBarangDatang}</p>}
          </div>

          {/* Nama Barang */}
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
              Nama Barang <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={namaBarang}
              onChange={(e) => {
                setNamaBarang(e.target.value);
                setErrors({ ...errors, namaBarang: '' });
              }}
              placeholder="Contoh: Lampu Xenon, Filter AC..."
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500"
              id="input-goods-name"
            />
            {errors.namaBarang && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.namaBarang}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-1">
                Quantity Diterima <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(Number(e.target.value));
                  setErrors({ ...errors, quantity: '' });
                }}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all text-center"
                id="input-goods-qty"
              />
              {errors.quantity && <p className="text-sm font-semibold text-rose-500 mt-0.5">{errors.quantity}</p>}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-white uppercase tracking-wider font-mono">
                Status Transit
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BarangStatus)}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-hidden transition-all cursor-pointer"
                id="select-goods-status"
              >
                <option value="Belum Dateng" className="text-slate-100 bg-slate-900">Belum Dateng</option>
                <option value="Sudah Dateng" className="text-slate-100 bg-slate-900">Sudah Dateng</option>
                <option value="Dalam Pengiriman" className="text-slate-100 bg-slate-900">Dalam Pengiriman</option>
              </select>
            </div>
          </div>

          {/* Sesuai Order (Checkbox / Toggle) */}
          <div className="space-y-1.5 p-4 rounded-xl bg-slate-900/90 border border-slate-700">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={sesuaiOrder}
                onChange={(e) => setSesuaiOrder(e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded-sm border-gray-300 cursor-pointer"
                id="checkbox-goods-matching"
              />
              <div>
                <label htmlFor="checkbox-goods-matching" className="text-base md:text-lg font-black text-white cursor-pointer">
                  Kesesuaian Spesifikasi &amp; Jumlah
                </label>
                <p className="text-xs md:text-sm text-slate-300 font-medium leading-normal">
                  Centang jika jumlah barang dan spesifikasi fisik sesuai dengan FKB / order awal.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
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
              id="btn-save-goods"
            >
              <Check className="h-4 w-4" /> Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm deletion popup */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Log Penerimaan"
        message="Yakin ingin menghapus data penerimaan barang datang ini? Tindakan ini tidak dapat dikembalikan."
      />
    </div>
  );
}
