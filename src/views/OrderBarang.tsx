/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OrderBarang, FkbStatus } from '../types';
import { Plus, Edit2, Trash2, ShoppingBag, Check, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getIndonesianDate, toISODate } from './PrEngineering';

interface OrderBarangProps {
  orders: OrderBarang[];
  onSave: (order: OrderBarang) => void;
  onDelete: (id: string) => void;
}

export default function OrderBarangView({ orders, onSave, onDelete }: OrderBarangProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderBarang | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  // Form states
  const [tanggalOrder, setTanggalOrder] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [statusFkb, setStatusFkb] = useState<FkbStatus>('Belum Naik FKB');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openAddModal = () => {
    setEditingOrder(null);
    setTanggalOrder(getIndonesianDate());
    setNamaBarang('');
    setQuantity(1);
    setStatusFkb('Belum Naik FPKB');
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (order: OrderBarang) => {
    setEditingOrder(order);
    setTanggalOrder(order.tanggalOrder);
    setNamaBarang(order.namaBarang);
    setQuantity(order.quantity);
    setStatusFkb(order.statusFkb);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!namaBarang.trim()) newErrors.namaBarang = 'Nama Barang / Sparepart wajib diisi.';
    if (!tanggalOrder.trim()) newErrors.tanggalOrder = 'Tanggal order wajib diisi.';
    if (quantity < 1) newErrors.quantity = 'Quantity minimal 1.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const orderPayload: OrderBarang = {
      id: editingOrder ? editingOrder.id : `ord-${Date.now()}`,
      tanggalOrder: tanggalOrder.trim(),
      namaBarang: namaBarang.trim(),
      quantity: Number(quantity),
      statusFkb
    };

    onSave(orderPayload);
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

  const handleQuickChangeFkbStatus = (order: OrderBarang, newStatus: FkbStatus) => {
    const updated: OrderBarang = {
      ...order,
      statusFkb: newStatus
    };
    onSave(updated);
    setLastSavedId(order.id);
    setTimeout(() => {
      setLastSavedId((prev) => (prev === order.id ? null : prev));
    }, 2000);
  };

  const renderFkbStatusSelect = (o: OrderBarang) => {
    const isNaik = o.statusFkb === 'Sudah Naik FKB' || o.statusFkb === 'Sudah Naik FPKB';
    const currentValue: FkbStatus = isNaik ? 'Sudah Naik FPKB' : 'Belum Naik FPKB';
    const isRecentlySaved = lastSavedId === o.id;

    return (
      <div className="inline-flex items-center gap-2">
        <div className="relative inline-flex items-center group">
          <select
            value={currentValue}
            onChange={(e) => {
              const newStatus = e.target.value as FkbStatus;
              handleQuickChangeFkbStatus(o, newStatus);
            }}
            className={`appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs font-mono font-black border cursor-pointer transition-all duration-200 focus:outline-hidden focus:ring-2 select-fpkb-dropdown ${
              isNaik
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:border-emerald-400 focus:ring-emerald-400/50'
                : 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:border-rose-400 focus:ring-rose-400/50'
            }`}
            title="Pilih opsi: Belum Naik FPKB atau Sudah Naik FPKB (Tersimpan Otomatis)"
            id={`select-order-fpkb-cell-${o.id}`}
          >
            <option value="Belum Naik FPKB" className="bg-slate-900 text-rose-400 font-bold">
              Belum Naik FPKB
            </option>
            <option value="Sudah Naik FPKB" className="bg-slate-900 text-emerald-400 font-bold">
              Sudah Naik FPKB
            </option>
          </select>
          <div className="absolute right-2.5 pointer-events-none flex items-center">
            <ChevronDown
              className={`w-3.5 h-3.5 ${
                isNaik ? 'text-emerald-400' : 'text-rose-400'
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

  const renderFkbBadge = (status: FkbStatus) => {
    const isNaik = status === 'Sudah Naik FKB' || status === 'Sudah Naik FPKB';
    const displayLabel = isNaik ? 'Sudah Naik FPKB' : 'Belum Naik FPKB';
    return (
      <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm md:text-base font-black border ${
        isNaik ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
      }`}>
        <span className={`h-2.5 w-2.5 rounded-full ${isNaik ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'}`} />
        {displayLabel}
      </span>
    );
  };

  return (
    <div className="space-y-6" id="order-barang-tab-view">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <ShoppingBag className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
            Order Barang / Pengadaan
          </h2>
          <p className="text-sm md:text-base text-slate-200 mt-1.5 font-sans font-medium">
            Catat pemesanan suku cadang, fitting lampu, freon, kabel, dan logistik engineering lainnya ke bagian purchasing.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-base font-bold text-white hover:bg-cyan-500 active:scale-95 transition-all shadow-[0_0_18px_rgba(0,240,255,0.4)] cursor-pointer shrink-0 border border-cyan-400/40"
          id="btn-add-order"
        >
          <Plus className="h-5 w-5" /> Tambah Order
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <ShoppingBag className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
            <span className="font-extrabold text-base tracking-tight text-cyan-300">Daftar Order Barang ({orders.length})</span>
          </div>
          <span className="text-xs md:text-sm font-mono text-amber-300 font-extrabold">STATUS: FPKB (Formulir Permintaan Kebutuhan Barang)</span>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-300">
            <ShoppingBag className="h-8 w-8 mx-auto stroke-2 mb-2 text-cyan-400" />
            <p className="text-base font-bold text-slate-200">Belum ada pengadaan barang terdaftar.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-slate-800" id="orders-mobile-list">
              {orders.map((o) => (
                <div key={o.id} className="p-4 space-y-3 hover:bg-slate-800/40 transition-colors" id={`order-card-mobile-${o.id}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-black text-white text-base font-sans">{o.namaBarang}</p>
                      <p className="text-xs font-mono font-bold text-slate-400 mt-1">Tanggal Order: <span className="font-extrabold text-cyan-300">{o.tanggalOrder}</span></p>
                    </div>
                    {renderFkbStatusSelect(o)}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <span className="font-mono font-extrabold text-emerald-300 bg-slate-900/80 px-2.5 py-1 rounded-md border border-cyan-500/30">Qty: {o.quantity} Pcs</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(o)}
                        className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        id={`btn-edit-order-m-${o.id}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Ubah
                      </button>
                      <button
                        onClick={() => triggerDelete(o.id)}
                        className="px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        id={`btn-delete-order-m-${o.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse" id="orders-table">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-sm md:text-base font-black text-cyan-300 uppercase tracking-wider font-mono">
                    <th className="px-6 py-4">Tanggal Order</th>
                    <th className="px-6 py-4">Nama Barang / Suku Cadang</th>
                    <th className="px-6 py-4 text-center">Quantity</th>
                    <th className="px-6 py-4">STATUS FPKB</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition-colors" id={`order-row-${o.id}`}>
                      <td className="px-6 py-4 font-mono text-sm md:text-base font-black text-cyan-300">
                        {o.tanggalOrder}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-white text-lg font-sans">{o.namaBarang}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-lg md:text-xl text-emerald-300 font-mono">
                        {o.quantity}
                      </td>
                      <td className="px-6 py-4">
                        {renderFkbStatusSelect(o)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(o)}
                            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                            title="Ubah"
                            id={`btn-edit-order-${o.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerDelete(o.id)}
                            className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Hapus"
                            id={`btn-delete-order-${o.id}`}
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
        title={editingOrder ? 'Ubah Order Barang' : 'Tambah Order Barang'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveSubmit} className="space-y-5 font-sans" id="form-order-add">
          
          {/* Tanggal Order */}
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
              Tanggal Pemesanan <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={toISODate(tanggalOrder)}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  setTanggalOrder(getIndonesianDate(val));
                } else {
                  setTanggalOrder('');
                }
                setErrors({ ...errors, tanggalOrder: '' });
              }}
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all font-mono"
              id="input-order-date"
            />
            {errors.tanggalOrder && <p className="text-sm font-semibold text-rose-400 mt-0.5">{errors.tanggalOrder}</p>}
          </div>

          {/* Nama Barang */}
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
              Nama Barang / Sparepart <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={namaBarang}
              onChange={(e) => {
                setNamaBarang(e.target.value);
                setErrors({ ...errors, namaBarang: '' });
              }}
              placeholder="Contoh: Magnetic Contactor Schneider 18A..."
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all placeholder:text-slate-500"
              id="input-order-item-name"
            />
            {errors.namaBarang && <p className="text-sm font-semibold text-rose-400 mt-0.5">{errors.namaBarang}</p>}
          </div>

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
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-emerald-300 bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all text-center font-mono"
                id="input-order-qty"
              />
              {errors.quantity && <p className="text-sm font-semibold text-rose-400 mt-0.5">{errors.quantity}</p>}
            </div>

            {/* Status FKB */}
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono">
                STATUS FPKB (Formulir Permintaan Kebutuhan Barang)
              </label>
              <select
                value={statusFkb === 'Sudah Naik FKB' || statusFkb === 'Sudah Naik FPKB' ? 'Sudah Naik FPKB' : 'Belum Naik FPKB'}
                onChange={(e) => setStatusFkb(e.target.value as FkbStatus)}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all cursor-pointer font-mono"
                id="select-order-fkb"
              >
                <option value="Belum Naik FPKB" className="text-rose-400 bg-slate-900 font-bold">Belum Naik FPKB</option>
                <option value="Sudah Naik FPKB" className="text-emerald-400 bg-slate-900 font-bold">Sudah Naik FPKB</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
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
              id="btn-save-order"
            >
              <Check className="h-4 w-4" /> Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation delete popup */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Log Order"
        message="Yakin ingin menghapus data pemesanan barang ini? Tindakan ini tidak dapat diurungkan."
      />
    </div>
  );
}
