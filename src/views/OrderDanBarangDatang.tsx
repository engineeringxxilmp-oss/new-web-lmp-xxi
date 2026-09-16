/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OrderBarang, BarangDatang, FkbStatus, BarangStatus } from '../types';
import {
  ShoppingBag,
  PackageCheck,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Truck,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getIndonesianDate, toISODate } from './PrEngineering';

interface OrderDanBarangDatangProps {
  orders: OrderBarang[];
  onSaveOrder: (order: OrderBarang) => void;
  onDeleteOrder: (id: string) => void;
  barangDatang: BarangDatang[];
  onSaveBarangDatang: (item: BarangDatang) => void;
  onDeleteBarangDatang: (id: string) => void;
  onReceiveOrder?: (order: OrderBarang) => void;
  defaultSubTab?: 'order' | 'barang-datang';
}

export default function OrderDanBarangDatangView({
  orders,
  onSaveOrder,
  onDeleteOrder,
  barangDatang,
  onSaveBarangDatang,
  onDeleteBarangDatang,
  onReceiveOrder,
  defaultSubTab = 'order'
}: OrderDanBarangDatangProps) {
  const [activeSubTab, setActiveSubTab] = useState<'order' | 'barang-datang'>(defaultSubTab);
  const [receiveSuccessBanner, setReceiveSuccessBanner] = useState<{
    namaBarang: string;
    quantity: number;
  } | null>(null);

  // ==================== ORDER BARANG STATE ====================
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOrderConfirmOpen, setIsOrderConfirmOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderBarang | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [lastSavedOrderId, setLastSavedOrderId] = useState<string | null>(null);

  const [orderTanggal, setOrderTanggal] = useState('');
  const [orderNamaBarang, setOrderNamaBarang] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [orderStatusFkb, setOrderStatusFkb] = useState<FkbStatus>('Belum Naik FKB');
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});

  const handleQuickChangeFkbStatus = (order: OrderBarang, newStatus: FkbStatus) => {
    const updated: OrderBarang = {
      ...order,
      statusFkb: newStatus
    };
    onSaveOrder(updated);
    setLastSavedOrderId(order.id);
    setTimeout(() => {
      setLastSavedOrderId((prev) => (prev === order.id ? null : prev));
    }, 2000);
  };

  // ==================== BARANG DATANG STATE ====================
  const [isGoodsModalOpen, setIsGoodsModalOpen] = useState(false);
  const [isGoodsConfirmOpen, setIsGoodsConfirmOpen] = useState(false);
  const [editingGoods, setEditingGoods] = useState<BarangDatang | null>(null);
  const [deletingGoodsId, setDeletingGoodsId] = useState<string | null>(null);
  const [lastSavedGoodsId, setLastSavedGoodsId] = useState<string | null>(null);

  const [goodsTanggal, setGoodsTanggal] = useState('');
  const [goodsNamaBarang, setGoodsNamaBarang] = useState('');
  const [goodsQty, setGoodsQty] = useState(1);
  const [goodsSesuaiOrder, setGoodsSesuaiOrder] = useState(true);
  const [goodsStatus, setGoodsStatus] = useState<BarangStatus>('Sudah Dateng');
  const [goodsErrors, setGoodsErrors] = useState<Record<string, string>>({});

  const handleQuickChangeGoodsStatus = (item: BarangDatang, newStatus: BarangStatus) => {
    const updated: BarangDatang = {
      ...item,
      status: newStatus
    };
    onSaveBarangDatang(updated);
    setLastSavedGoodsId(item.id);
    setTimeout(() => {
      setLastSavedGoodsId((prev) => (prev === item.id ? null : prev));
    }, 2000);
  };

  // ==================== ORDER HANDLERS ====================
  const openAddOrderModal = () => {
    setEditingOrder(null);
    setOrderTanggal(getIndonesianDate());
    setOrderNamaBarang('');
    setOrderQty(1);
    setOrderStatusFkb('Belum Naik FPKB');
    setOrderErrors({});
    setIsOrderModalOpen(true);
  };

  const openEditOrderModal = (order: OrderBarang) => {
    setEditingOrder(order);
    setOrderTanggal(order.tanggalOrder);
    setOrderNamaBarang(order.namaBarang);
    setOrderQty(order.quantity);
    setOrderStatusFkb(order.statusFkb);
    setOrderErrors({});
    setIsOrderModalOpen(true);
  };

  const handleSaveOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!orderNamaBarang.trim()) errors.namaBarang = 'Nama Barang / Sparepart wajib diisi.';
    if (!orderTanggal.trim()) errors.tanggalOrder = 'Tanggal order wajib diisi.';
    if (orderQty < 1) errors.quantity = 'Quantity minimal 1.';

    if (Object.keys(errors).length > 0) {
      setOrderErrors(errors);
      return;
    }

    const payload: OrderBarang = {
      id: editingOrder ? editingOrder.id : `ord-${Date.now()}`,
      tanggalOrder: orderTanggal.trim(),
      namaBarang: orderNamaBarang.trim(),
      quantity: Number(orderQty),
      statusFkb: orderStatusFkb
    };

    onSaveOrder(payload);
    setIsOrderModalOpen(false);
  };

  const triggerDeleteOrder = (id: string) => {
    setDeletingOrderId(id);
    setIsOrderConfirmOpen(true);
  };

  const confirmDeleteOrder = () => {
    if (deletingOrderId) {
      onDeleteOrder(deletingOrderId);
      setDeletingOrderId(null);
    }
  };

  // Quick action: Terima orderan barang -> otomatis status berubah ke Barang Datang & nama barang terhapus dari Orderan Barang
  const handleQuickReceiveFromOrder = (order: OrderBarang) => {
    if (onReceiveOrder) {
      onReceiveOrder(order);
    } else {
      const payload: BarangDatang = {
        id: `arr-${Date.now()}`,
        tanggalBarangDatang: getIndonesianDate(),
        namaBarang: order.namaBarang,
        quantity: order.quantity,
        sesuaiOrder: true,
        status: 'Sudah Datang'
      };
      onSaveBarangDatang(payload);
      onDeleteOrder(order.id);
    }

    setReceiveSuccessBanner({
      namaBarang: order.namaBarang,
      quantity: order.quantity
    });
    setTimeout(() => {
      setReceiveSuccessBanner(null);
    }, 6000);
  };

  // ==================== BARANG DATANG HANDLERS ====================
  const openAddGoodsModal = () => {
    setEditingGoods(null);
    setGoodsTanggal(getIndonesianDate());
    setGoodsNamaBarang('');
    setGoodsQty(1);
    setGoodsSesuaiOrder(true);
    setGoodsStatus('Sudah Datang');
    setGoodsErrors({});
    setIsGoodsModalOpen(true);
  };

  const openEditGoodsModal = (item: BarangDatang) => {
    setEditingGoods(item);
    setGoodsTanggal(item.tanggalBarangDatang);
    setGoodsNamaBarang(item.namaBarang);
    setGoodsQty(item.quantity);
    setGoodsSesuaiOrder(item.sesuaiOrder);
    setGoodsStatus(item.status);
    setGoodsErrors({});
    setIsGoodsModalOpen(true);
  };

  const handleSaveGoodsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!goodsNamaBarang.trim()) errors.namaBarang = 'Nama Barang wajib diisi.';
    if (!goodsTanggal.trim()) errors.tanggalBarangDatang = 'Tanggal barang datang wajib diisi.';
    if (goodsQty < 1) errors.quantity = 'Quantity minimal 1.';

    if (Object.keys(errors).length > 0) {
      setGoodsErrors(errors);
      return;
    }

    const payload: BarangDatang = {
      id: editingGoods ? editingGoods.id : `arr-${Date.now()}`,
      tanggalBarangDatang: goodsTanggal.trim(),
      namaBarang: goodsNamaBarang.trim(),
      quantity: Number(goodsQty),
      sesuaiOrder: goodsSesuaiOrder,
      status: goodsStatus
    };

    onSaveBarangDatang(payload);
    setIsGoodsModalOpen(false);
  };

  const triggerDeleteGoods = (id: string) => {
    setDeletingGoodsId(id);
    setIsGoodsConfirmOpen(true);
  };

  const confirmDeleteGoods = () => {
    if (deletingGoodsId) {
      onDeleteBarangDatang(deletingGoodsId);
      setDeletingGoodsId(null);
    }
  };

  // Badges & Quick Selectors
  const renderFkbStatusSelect = (o: OrderBarang) => {
    const isNaik = o.statusFkb === 'Sudah Naik FKB' || o.statusFkb === 'Sudah Naik FPKB';
    const currentValue: FkbStatus = isNaik ? 'Sudah Naik FPKB' : 'Belum Naik FPKB';
    const isRecentlySaved = lastSavedOrderId === o.id;

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
            id={`select-status-fpkb-${o.id}`}
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
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black border ${
          isNaik
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
            : 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${isNaik ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-400 shadow-[0_0_6px_#f43f5e]'}`} />
        {displayLabel}
      </span>
    );
  };

  const renderSesuaiBadge = (sesuai: boolean) => {
    return sesuai ? (
      <span className="px-2.5 py-1 rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold inline-flex items-center gap-1">
        <Check className="w-3.5 h-3.5 text-emerald-400" /> Sesuai Order
      </span>
    ) : (
      <span className="px-2.5 py-1 rounded-md bg-rose-950/70 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold inline-flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Selisih / Tidak Sesuai
      </span>
    );
  };

  const renderGoodsStatusSelect = (item: BarangDatang) => {
    const norm = (s: string): BarangStatus => {
      if (s === 'Sudah Datang' || s === 'Sudah Dateng') return 'Sudah Dateng';
      if (s === 'Dalam Pengiriman') return 'Dalam Pengiriman';
      return 'Belum Dateng';
    };

    const currentVal = norm(item.status);
    const isRecentlySaved = lastSavedGoodsId === item.id;

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
              handleQuickChangeGoodsStatus(item, newStatus);
            }}
            className={`appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs font-mono font-black border cursor-pointer transition-all duration-200 focus:outline-hidden focus:ring-2 select-goods-status-dropdown ${
              colorStyles[currentVal] || colorStyles['Belum Dateng']
            }`}
            title="Pilih opsi: Belum Dateng, Sudah Dateng, atau Dalam Pengiriman (Tersimpan Otomatis)"
            id={`select-status-goods-${item.id}`}
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

  const renderStatusBadge = (s: BarangStatus) => {
    const maps: Record<string, string> = {
      'Belum Datang': 'bg-slate-900 text-slate-300 border-slate-700',
      'Belum Dateng': 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
      'Dalam Pengiriman': 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
      'Sudah Datang': 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
      'Sudah Dateng': 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-mono font-black border ${maps[s] || 'bg-slate-900 text-slate-300 border-slate-700'}`}>
        {s}
      </span>
    );
  };

  // Metrics
  const totalOrders = orders.length;
  const fkbNaikCount = orders.filter((o) => o.statusFkb === 'Sudah Naik FKB' || o.statusFkb === 'Sudah Naik FPKB').length;
  const totalBarangDatang = barangDatang.length;
  const barangDiterimaCount = barangDatang.filter((b) => b.status === 'Sudah Datang' || b.status === 'Sudah Dateng').length;
  const barangInTransitCount = barangDatang.filter((b) => b.status === 'Dalam Pengiriman').length;

  return (
    <div className="space-y-6" id="order-dan-barang-datang-view">
      {/* Intro Header & Unified Navigation */}
      <div className="bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              <Layers className="h-7 w-7 text-amber-400 drop-shadow-[0_0_8px_#f59e0b]" />
              ORDERAN
            </h2>
            <p className="text-sm md:text-base text-slate-200 mt-1.5 font-sans font-medium">
              Pusat logistik terintegrasi untuk pemesanan pengadaan suku cadang engineering (FPKB - Formulir Permintaan Kebutuhan Barang) dan verifikasi penerimaan barang fisik.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeSubTab === 'order' ? (
              <button
                onClick={openAddOrderModal}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm md:text-base font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer w-full sm:w-auto border border-amber-300"
                id="btn-add-order-unified"
              >
                <Plus className="h-5 w-5" /> Tambah Order
              </button>
            ) : (
              <button
                onClick={openAddGoodsModal}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm md:text-base font-black text-white hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer w-full sm:w-auto border border-emerald-400/50"
                id="btn-add-goods-unified"
              >
                <Plus className="h-5 w-5" /> Catat Barang Datang
              </button>
            )}
          </div>
        </div>

        {/* Operational Mini Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-cyan-500/20">
          <div className="bg-[#080d1a]/80 p-3.5 rounded-xl border border-amber-500/25 text-center flex flex-col items-center justify-center">
            <p className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider text-center">Total Order</p>
            <p className="text-2xl font-black text-amber-300 font-mono mt-0.5 text-center">{totalOrders}</p>
          </div>
          <div className="bg-[#080d1a]/80 p-3.5 rounded-xl border border-emerald-500/25 text-center flex flex-col items-center justify-center">
            <p className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider text-center">Sudah Naik FPKB</p>
            <p className="text-2xl font-black text-emerald-300 font-mono mt-0.5 text-center">{fkbNaikCount}</p>
          </div>
          <div className="bg-[#080d1a]/80 p-3.5 rounded-xl border border-teal-500/25 text-center flex flex-col items-center justify-center">
            <p className="text-[11px] font-mono font-bold text-teal-400 uppercase tracking-wider text-center">Barang Datang</p>
            <p className="text-2xl font-black text-teal-300 font-mono mt-0.5 text-center">{barangDiterimaCount}</p>
          </div>
          <div className="bg-[#080d1a]/80 p-3.5 rounded-xl border border-cyan-500/25 text-center flex flex-col items-center justify-center">
            <p className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider text-center">Dalam Transit</p>
            <p className="text-2xl font-black text-cyan-300 font-mono mt-0.5 text-center">{barangInTransitCount}</p>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-2 mt-6 p-1.5 bg-slate-900/90 rounded-2xl border border-cyan-500/30 w-full sm:w-fit" id="logistics-tab-switcher">
          <button
            onClick={() => setActiveSubTab('order')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-mono text-sm md:text-base font-black transition-all cursor-pointer flex-1 sm:flex-initial justify-center ${
              activeSubTab === 'order'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            id="tab-btn-order-barang"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>ORDER BARANG</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                activeSubTab === 'order' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('barang-datang')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-mono text-sm md:text-base font-black transition-all cursor-pointer flex-1 sm:flex-initial justify-center ${
              activeSubTab === 'barang-datang'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            id="tab-btn-barang-datang"
          >
            <PackageCheck className="h-4 w-4" />
            <span>LAP BARANG DATENG</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                activeSubTab === 'barang-datang' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {barangDatang.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ======================= TAB 1: ORDER BARANG ============================ */}
      {/* ========================================================================= */}
      {activeSubTab === 'order' && (
        <div className="space-y-4 animate-fade-in" id="content-subtab-order">
          {/* Notification Banner when item is automatically received */}
          {receiveSuccessBanner && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/95 via-slate-900/95 to-teal-950/95 border-2 border-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.35)] text-emerald-200" id="receive-success-banner">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-900/80 text-emerald-300 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.4)] shrink-0">
                  <PackageCheck className="w-5 h-5 animate-pulse text-emerald-300" />
                </div>
                <div>
                  <p className="font-black text-white text-sm md:text-base font-sans">
                    Barang <span className="text-emerald-300 underline font-black">"{receiveSuccessBanner.namaBarang}"</span> ({receiveSuccessBanner.quantity} unit) Berhasil Diterima!
                  </p>
                  <p className="text-xs text-emerald-400/90 font-mono mt-0.5">
                    Nama barang otomatis hilang dari Orderan dan statusnya masuk ke tab <strong className="text-cyan-300">LAP BARANG DATENG</strong> ("Sudah Datang").
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveSubTab('barang-datang');
                  setReceiveSuccessBanner(null);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs font-mono border border-emerald-300 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer active:scale-95 shrink-0"
                id="btn-goto-barang-datang"
              >
                <span>Buka Lap Barang Dateng</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <ShoppingBag className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="font-extrabold text-base tracking-tight text-amber-300">
                  Daftar Pengadaan &amp; Pemesanan ({orders.length})
                </span>
              </div>
              <span className="text-xs md:text-sm font-mono text-cyan-300 font-extrabold">
                STATUS FPKB (Formulir Permintaan Kebutuhan Barang)
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center text-slate-300">
                <ShoppingBag className="h-10 w-10 mx-auto stroke-2 mb-3 text-amber-400" />
                <p className="text-base font-bold text-slate-200">Belum ada pengadaan barang terdaftar.</p>
                <p className="text-xs text-slate-400 mt-1">Klik tombol "+ Tambah Order" untuk mencatat pemesanan baru.</p>
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="block md:hidden divide-y divide-slate-800" id="unified-orders-mobile-list">
                  {orders.map((o) => (
                    <div key={o.id} className="p-4 space-y-3 hover:bg-slate-800/40 transition-colors" id={`order-unified-m-${o.id}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-black text-white text-base font-sans">{o.namaBarang}</p>
                          <p className="text-xs font-mono font-bold text-slate-400 mt-1">
                            Tanggal Order: <span className="font-extrabold text-cyan-300">{o.tanggalOrder}</span>
                          </p>
                        </div>
                        {renderFkbStatusSelect(o)}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                        <span className="font-mono font-extrabold text-amber-300 bg-slate-900/90 px-2.5 py-1 rounded-md border border-amber-500/30">
                          Qty: {o.quantity} Pcs
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickReceiveFromOrder(o)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 text-emerald-300 border border-emerald-500/50 hover:from-emerald-900 hover:to-teal-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.25)] active:scale-95"
                            title={`Terima "${o.namaBarang}" & otomatis pindahkan ke Barang Datang`}
                            id={`btn-receive-order-m-${o.id}`}
                          >
                            <PackageCheck className="h-3.5 w-3.5 text-emerald-400" /> Terima
                          </button>
                          <button
                            onClick={() => openEditOrderModal(o)}
                            className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            id={`btn-edit-order-m-${o.id}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => triggerDeleteOrder(o.id)}
                            className="px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            id={`btn-delete-order-m-${o.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="unified-orders-table">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-sm md:text-base font-black text-amber-300 uppercase tracking-wider font-mono">
                        <th className="px-6 py-4">Tanggal Order</th>
                        <th className="px-6 py-4">Nama Barang / Suku Cadang</th>
                        <th className="px-6 py-4 text-center">Quantity</th>
                        <th className="px-6 py-4">STATUS FPKB</th>
                        <th className="px-6 py-4 text-center">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-800/40 transition-colors" id={`order-unified-row-${o.id}`}>
                          <td className="px-6 py-4 font-mono text-sm md:text-base font-black text-cyan-300">
                            {o.tanggalOrder}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-black text-white text-base md:text-lg font-sans">{o.namaBarang}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-black text-lg md:text-xl text-amber-300 font-mono">
                            {o.quantity}
                          </td>
                          <td className="px-6 py-4">
                            {renderFkbStatusSelect(o)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleQuickReceiveFromOrder(o)}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 text-emerald-300 border border-emerald-500/50 hover:border-emerald-400 hover:from-emerald-900 hover:to-teal-800 hover:text-white text-xs font-mono font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] active:scale-95 group"
                                title={`Terima "${o.namaBarang}" & otomatis pindahkan ke Barang Datang`}
                                id={`btn-receive-order-${o.id}`}
                              >
                                <PackageCheck className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                                <span>Terima</span>
                              </button>
                              <button
                                onClick={() => openEditOrderModal(o)}
                                className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                                title="Ubah"
                                id={`btn-edit-order-${o.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => triggerDeleteOrder(o.id)}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===================== TAB 2: LAP BARANG DATENG ========================== */}
      {/* ========================================================================= */}
      {activeSubTab === 'barang-datang' && (
        <div className="space-y-4 animate-fade-in" id="content-subtab-barang-datang">
          <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <PackageCheck className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <span className="font-extrabold text-base tracking-tight text-emerald-300">
                  Daftar Penerimaan &amp; Transit ({barangDatang.length})
                </span>
              </div>
              <span className="text-xs md:text-sm font-mono text-teal-300 font-extrabold">
                VERIFIKASI FISIK &amp; KONDISI BARANG
              </span>
            </div>

            {barangDatang.length === 0 ? (
              <div className="p-12 text-center text-slate-300">
                <PackageCheck className="h-10 w-10 mx-auto stroke-2 mb-3 text-emerald-400" />
                <p className="text-base font-bold text-slate-200">Belum ada penerimaan barang terdaftar.</p>
                <p className="text-xs text-slate-400 mt-1">Klik "+ Catat Barang Datang" untuk mendata barang masuk.</p>
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="block md:hidden divide-y divide-slate-800" id="unified-goods-mobile-list">
                  {barangDatang.map((item) => (
                    <div key={item.id} className="p-4 space-y-3 bg-slate-950/60" id={`goods-unified-m-${item.id}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-black text-white text-base font-sans">{item.namaBarang}</p>
                          <p className="text-xs font-mono font-bold text-slate-400 mt-1">
                            Tanggal Diterima: <span className="font-extrabold text-cyan-300">{item.tanggalBarangDatang}</span>
                          </p>
                        </div>
                        {renderGoodsStatusSelect(item)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-emerald-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700 text-xs">
                          Qty: {item.quantity} Pcs
                        </span>
                        {renderSesuaiBadge(item.sesuaiOrder)}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
                        <button
                          onClick={() => openEditGoodsModal(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          id={`btn-edit-goods-m-${item.id}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Ubah
                        </button>
                        <button
                          onClick={() => triggerDeleteGoods(item.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-rose-500/30"
                          id={`btn-delete-goods-m-${item.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="unified-goods-table">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-sm md:text-base font-black text-emerald-300 uppercase tracking-wider font-mono">
                        <th className="px-6 py-4">Tanggal Penerimaan</th>
                        <th className="px-6 py-4">Nama Barang</th>
                        <th className="px-6 py-4 text-center">Qty</th>
                        <th className="px-6 py-4">Kesesuaian Order</th>
                        <th className="px-6 py-4">Status Kurir / Gudang</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {barangDatang.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors" id={`goods-unified-row-${item.id}`}>
                          <td className="px-6 py-4 font-mono text-sm md:text-base font-black text-cyan-300">
                            {item.tanggalBarangDatang}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-black text-white text-base md:text-lg font-sans">{item.namaBarang}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-black text-lg md:text-xl text-emerald-300 font-mono">
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
                                onClick={() => openEditGoodsModal(item)}
                                className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                                title="Ubah"
                                id={`btn-edit-goods-${item.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => triggerDeleteGoods(item.id)}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================== MODAL ORDER BARANG ============================= */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title={editingOrder ? 'Ubah Order Barang' : 'Tambah Order Barang'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveOrderSubmit} className="space-y-5 font-sans" id="form-order-unified">
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1">
              Tanggal Pemesanan <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={toISODate(orderTanggal)}
              onChange={(e) => {
                const val = e.target.value;
                setOrderTanggal(val ? getIndonesianDate(val) : '');
                setOrderErrors({ ...orderErrors, tanggalOrder: '' });
              }}
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-hidden transition-all font-mono"
              id="input-unified-order-date"
            />
            {orderErrors.tanggalOrder && <p className="text-sm font-semibold text-rose-400 mt-0.5">{orderErrors.tanggalOrder}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1">
              Nama Barang / Sparepart <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={orderNamaBarang}
              onChange={(e) => {
                setOrderNamaBarang(e.target.value);
                setOrderErrors({ ...orderErrors, namaBarang: '' });
              }}
              placeholder="Contoh: Magnetic Contactor Schneider 18A..."
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-hidden transition-all placeholder:text-slate-500"
              id="input-unified-order-item-name"
            />
            {orderErrors.namaBarang && <p className="text-sm font-semibold text-rose-400 mt-0.5">{orderErrors.namaBarang}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1">
                Quantity <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={orderQty}
                onChange={(e) => {
                  setOrderQty(Number(e.target.value));
                  setOrderErrors({ ...orderErrors, quantity: '' });
                }}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-amber-300 bg-slate-900/90 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-hidden transition-all text-center font-mono"
                id="input-unified-order-qty"
              />
              {orderErrors.quantity && <p className="text-sm font-semibold text-rose-400 mt-0.5">{orderErrors.quantity}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-amber-300 uppercase tracking-wider font-mono">
                STATUS FPKB (Formulir Permintaan Kebutuhan Barang)
              </label>
              <select
                value={orderStatusFkb === 'Sudah Naik FKB' || orderStatusFkb === 'Sudah Naik FPKB' ? 'Sudah Naik FPKB' : 'Belum Naik FPKB'}
                onChange={(e) => setOrderStatusFkb(e.target.value as FkbStatus)}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-hidden transition-all cursor-pointer font-mono"
                id="select-unified-order-fkb"
              >
                <option value="Belum Naik FPKB" className="text-rose-400 bg-slate-900 font-bold">Belum Naik FPKB</option>
                <option value="Sudah Naik FPKB" className="text-emerald-400 bg-slate-900 font-bold">Sudah Naik FPKB</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(false)}
              className="rounded-xl px-5 py-2.5 text-sm md:text-base font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 border border-amber-300 px-6 py-2.5 text-sm md:text-base font-black text-slate-950 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
              id="btn-save-order-unified"
            >
              <Check className="h-4 w-4" /> Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* ======================== MODAL BARANG DATANG ============================ */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isGoodsModalOpen}
        onClose={() => setIsGoodsModalOpen(false)}
        title={editingGoods ? 'Ubah Penerimaan Barang' : 'Log Penerimaan Barang Datang'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveGoodsSubmit} className="space-y-5 font-sans" id="form-goods-unified">
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-emerald-300 uppercase tracking-wider font-mono flex items-center gap-1">
              Tanggal Barang Datang / Rencana Datang <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={toISODate(goodsTanggal)}
              onChange={(e) => {
                const val = e.target.value;
                setGoodsTanggal(val ? getIndonesianDate(val) : '');
                setGoodsErrors({ ...goodsErrors, tanggalBarangDatang: '' });
              }}
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900 focus:border-emerald-400 focus:outline-hidden transition-all font-mono"
              id="input-unified-goods-date"
            />
            {goodsErrors.tanggalBarangDatang && <p className="text-sm font-semibold text-rose-500 mt-0.5">{goodsErrors.tanggalBarangDatang}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-emerald-300 uppercase tracking-wider font-mono flex items-center gap-1">
              Nama Barang <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={goodsNamaBarang}
              onChange={(e) => {
                setGoodsNamaBarang(e.target.value);
                setGoodsErrors({ ...goodsErrors, namaBarang: '' });
              }}
              placeholder="Contoh: Lampu Xenon, Filter AC..."
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900 focus:border-emerald-400 focus:outline-hidden transition-all placeholder:text-slate-500"
              id="input-unified-goods-name"
            />
            {goodsErrors.namaBarang && <p className="text-sm font-semibold text-rose-500 mt-0.5">{goodsErrors.namaBarang}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-emerald-300 uppercase tracking-wider font-mono flex items-center gap-1">
                Quantity Diterima <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={goodsQty}
                onChange={(e) => {
                  setGoodsQty(Number(e.target.value));
                  setGoodsErrors({ ...goodsErrors, quantity: '' });
                }}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-emerald-300 bg-slate-900 focus:border-emerald-400 focus:outline-hidden transition-all text-center font-mono"
                id="input-unified-goods-qty"
              />
              {goodsErrors.quantity && <p className="text-sm font-semibold text-rose-500 mt-0.5">{goodsErrors.quantity}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-base md:text-lg font-black text-emerald-300 uppercase tracking-wider font-mono">
                Status Transit
              </label>
              <select
                value={goodsStatus}
                onChange={(e) => setGoodsStatus(e.target.value as BarangStatus)}
                className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900 focus:border-emerald-400 focus:outline-hidden transition-all cursor-pointer font-mono"
                id="select-unified-goods-status"
              >
                <option value="Belum Dateng" className="text-slate-100 bg-slate-900">Belum Dateng</option>
                <option value="Sudah Dateng" className="text-slate-100 bg-slate-900">Sudah Dateng</option>
                <option value="Dalam Pengiriman" className="text-slate-100 bg-slate-900">Dalam Pengiriman</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 p-4 rounded-xl bg-slate-900/90 border border-slate-700">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={goodsSesuaiOrder}
                onChange={(e) => setGoodsSesuaiOrder(e.target.checked)}
                className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 rounded-sm border-gray-300 cursor-pointer"
                id="checkbox-unified-goods-matching"
              />
              <div>
                <label htmlFor="checkbox-unified-goods-matching" className="text-base md:text-lg font-black text-white cursor-pointer">
                  Kesesuaian Spesifikasi &amp; Jumlah
                </label>
                <p className="text-xs md:text-sm text-slate-300 font-medium leading-normal">
                  Centang jika jumlah barang dan spesifikasi fisik sesuai dengan pesanan / FKB.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsGoodsModalOpen(false)}
              className="rounded-xl px-5 py-2.5 text-sm md:text-base font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/50 px-6 py-2.5 text-sm md:text-base font-black text-white active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
              id="btn-save-goods-unified"
            >
              <Check className="h-4 w-4" /> Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation delete popups */}
      <ConfirmDialog
        isOpen={isOrderConfirmOpen}
        onClose={() => setIsOrderConfirmOpen(false)}
        onConfirm={confirmDeleteOrder}
        title="Hapus Log Order"
        message="Yakin ingin menghapus data pemesanan barang ini? Tindakan ini tidak dapat diurungkan."
      />

      <ConfirmDialog
        isOpen={isGoodsConfirmOpen}
        onClose={() => setIsGoodsConfirmOpen(false)}
        onConfirm={confirmDeleteGoods}
        title="Hapus Log Penerimaan"
        message="Yakin ingin menghapus data penerimaan barang datang ini? Tindakan ini tidak dapat dikembalikan."
      />
    </div>
  );
}
