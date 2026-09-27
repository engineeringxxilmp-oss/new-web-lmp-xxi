/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ServerConfigItem, DEFAULT_SERVER_CONFIGS } from '../../types';
import {
  Server,
  HardDrive,
  Edit2,
  Plus,
  RefreshCw,
  Save,
  CheckCircle2,
  Database,
  Search,
  Trash2,
  Check,
  X,
  Layers,
  Cpu
} from 'lucide-react';

const STORAGE_KEY = 'xxi_server_configs';

export default function ServerStorageView() {
  const [servers, setServers] = useState<ServerConfigItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_SERVER_CONFIGS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [editingServer, setEditingServer] = useState<ServerConfigItem | null>(null);
  const [editCapacity, setEditCapacity] = useState('');
  const [editName, setEditName] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerCapacity, setNewServerCapacity] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Save to persistent storage whenever servers change
  const saveServers = (updated: ServerConfigItem[]) => {
    setServers(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSyncStatus('Tersimpan & Sinkron');
      setTimeout(() => setSyncStatus(null), 2500);
    } catch (_) {}
  };

  const handleResetDefault = () => {
    if (window.confirm('Kembalikan konfigurasi server ke standar default XXI Lippo Mall Puri?')) {
      saveServers(DEFAULT_SERVER_CONFIGS);
    }
  };

  const openEditModal = (srv: ServerConfigItem) => {
    setEditingServer(srv);
    setEditName(srv.name);
    setEditCapacity(srv.capacityTb);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer) return;
    const updated = servers.map((s) =>
      s.id === editingServer.id ? { ...s, name: editName.trim() || s.name, capacityTb: editCapacity.trim() || s.capacityTb } : s
    );
    saveServers(updated);
    setEditingServer(null);
  };

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newServerCapacity.trim()) return;
    const newSrv: ServerConfigItem = {
      id: `srv-${Date.now()}`,
      name: newServerName.trim(),
      capacityTb: newServerCapacity.trim().toUpperCase().includes('TB') ? newServerCapacity.trim() : `${newServerCapacity.trim()} TB`
    };
    saveServers([...servers, newSrv]);
    setNewServerName('');
    setNewServerCapacity('');
    setIsAddModalOpen(false);
  };

  const handleDeleteServer = (id: string) => {
    if (window.confirm('Hapus unit server ini dari daftar kapasitas?')) {
      saveServers(servers.filter((s) => s.id !== id));
    }
  };

  // Filter servers
  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.capacityTb.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Total storage calculation in TB
  const totalCapacityTb = servers.reduce((sum, s) => {
    const val = parseFloat(s.capacityTb.replace(/[^0-9.]/g, ''));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="space-y-6" id="server-storage-view-root">
      {/* Overview Metric Banner */}
      <div className="bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/40 uppercase tracking-widest">
                CINEMA XXI SERVER &amp; STORAGE MATRIX
              </span>
              {syncStatus && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/50 flex items-center gap-1 animate-pulse">
                  <Check className="w-3 h-3 text-emerald-400" /> {syncStatus}
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              <Server className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
              SERVER &amp; KAPASITAS HARDDISK
            </h2>
            <p className="text-sm md:text-base text-slate-200 mt-1 font-sans">
              Monitoring kapasitas storage server DCP Studio 1–8, Premiere 1–2, dan Library AHM XXI Lippo Mall Puri. Anda dapat mengedit kapasitas jika sewaktu-waktu ada penambahan atau perubahan harddisk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => saveServers([...servers])}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-cyan-300 border border-cyan-500/40 hover:bg-slate-800 text-xs sm:text-sm font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Sinkronisasi Data Server"
            >
              <Save className="w-4 h-4 text-cyan-400" />
              <span>Simpan &amp; Sinkron</span>
            </button>

            <button
              onClick={handleResetDefault}
              className="px-3 py-2.5 rounded-xl bg-slate-900 text-slate-400 border border-slate-700 hover:text-white text-xs sm:text-sm font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Kembalikan ke standar default"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset Default</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95 border border-cyan-400/40"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Server</span>
            </button>
          </div>
        </div>

        {/* Storage Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-cyan-500/20">
          <div className="bg-[#080d1a] border border-cyan-500/30 rounded-xl p-4 flex items-center gap-3.5 shadow-inner">
            <div className="p-3 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Total Kapasitas Terpasang</span>
              <span className="text-2xl font-black text-cyan-300 font-mono tracking-tight">
                {totalCapacityTb.toFixed(1)} TB
              </span>
            </div>
          </div>

          <div className="bg-[#080d1a] border border-fuchsia-500/30 rounded-xl p-4 flex items-center gap-3.5 shadow-inner">
            <div className="p-3 rounded-lg bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Total Unit Server</span>
              <span className="text-2xl font-black text-fuchsia-300 font-mono tracking-tight">
                {servers.length} Unit
              </span>
            </div>
          </div>

          <div className="bg-[#080d1a] border border-amber-500/30 rounded-xl p-4 flex items-center gap-3.5 shadow-inner">
            <div className="p-3 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Storage Terbesar</span>
              <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
                Library / AHM (18.5 TB)
              </span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 pt-3 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari unit server atau kapasitas..."
              className="w-full bg-[#080d1a] border border-cyan-500/30 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            Menampilkan {filteredServers.length} dari {servers.length} Server
          </span>
        </div>
      </div>

      {/* Grid of Servers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" id="server-list-grid">
        {filteredServers.map((srv, idx) => {
          const capNum = parseFloat(srv.capacityTb.replace(/[^0-9.]/g, '')) || 1.8;
          const isLibrary = srv.name.toLowerCase().includes('library') || srv.name.toLowerCase().includes('ahm');
          const isPremiere = srv.name.toLowerCase().includes('premiere');

          return (
            <div
              key={srv.id}
              className="bg-[#0a0f1d]/90 rounded-2xl border border-cyan-500/25 p-5 shadow-lg relative overflow-hidden group hover:border-cyan-400/60 transition-all"
              id={`server-card-${srv.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-center shrink-0 ${
                      isLibrary
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : isPremiere
                        ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/40 shadow-[0_0_12px_rgba(217,70,239,0.25)]'
                        : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                    }`}
                  >
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-wide font-sans">{srv.name}</h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {srv.id.substring(0, 10)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(srv)}
                    className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Ubah Kapasitas Server"
                    id={`btn-edit-srv-${srv.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {servers.length > 1 && (
                    <button
                      onClick={() => handleDeleteServer(srv.id)}
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                      title="Hapus Server"
                      id={`btn-del-srv-${srv.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Capacity Display */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">Kapasitas Storage</span>
                  <span className="text-xl font-black font-mono text-cyan-300">{srv.capacityTb}</span>
                </div>

                {/* Progress bar visual */}
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      isLibrary
                        ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                        : isPremiere
                        ? 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-300'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(15, (capNum / 20) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1.5">
                  <span>DCP Storage</span>
                  <span>{isLibrary ? 'Main Ingest Server' : 'Playback Unit'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0d1322] border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-[0_0_50px_rgba(0,240,255,0.25)] animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                <span>EDIT SERVER &amp; KAPASITAS</span>
              </div>
              <button
                onClick={() => setEditingServer(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4 font-mono text-sm">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1 text-xs">Nama Server / Studio</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-white font-semibold focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1 text-xs">
                  Kapasitas Storage (Contoh: 1.8 TB / 3.7 TB / 10.7 TB)
                </label>
                <input
                  type="text"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  placeholder="Contoh: 3.5 TB"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-white font-semibold focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingServer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0d1322] border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-[0_0_50px_rgba(0,240,255,0.25)] animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold">
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>TAMBAH UNIT SERVER BARU</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddServer} className="space-y-4 mt-4 font-mono text-sm">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1 text-xs">
                  Nama Server / Lokasi (Contoh: Studio 9 / Backup NAS)
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Contoh: Studio 9"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-white font-semibold focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1 text-xs">
                  Kapasitas Storage (Contoh: 3.5 TB / 7.3 TB)
                </label>
                <input
                  type="text"
                  value={newServerCapacity}
                  onChange={(e) => setNewServerCapacity(e.target.value)}
                  placeholder="Contoh: 3.5 TB"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-white font-semibold focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan Server</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
