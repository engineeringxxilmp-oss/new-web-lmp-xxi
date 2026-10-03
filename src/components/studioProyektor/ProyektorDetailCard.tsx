/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { ProyektorData, FotoStudioItem, PerangkatTambahanItem } from '../../types/studioProyektor';
import {
  Projector,
  Edit,
  Trash2,
  Upload,
  Maximize2,
  ImageIcon,
  Server,
  Cpu,
  FileText,
  CheckCircle2,
  Save,
  X,
  AlertCircle,
  Plus
} from 'lucide-react';
import ImageFullscreenModal from './ImageFullscreenModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface ProyektorDetailCardProps {
  proyektor: ProyektorData;
  onEdit?: () => void;
  onDelete: () => void;
  onUpdateProyektor: (updated: ProyektorData) => void;
}

export default function ProyektorDetailCard({
  proyektor,
  onDelete,
  onUpdateProyektor
}: ProyektorDetailCardProps) {
  const fotoFileInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProyektorData>(proyektor);

  // Sync draft when proyektor changes
  useEffect(() => {
    setDraft(proyektor);
  }, [proyektor]);

  // Staged Image Upload State (Pratinjau sebelum klik "Terapkan Gambar")
  const [stagedFotos, setStagedFotos] = useState<FotoStudioItem[]>([]);

  // Fullscreen viewer state
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'proyektor' | 'foto';
    targetId?: string;
    itemName?: string;
  }>({ isOpen: false, type: 'proyektor' });

  // Handle Edit Input Changes
  const handleProyektorChange = (field: keyof ProyektorData['proyektor'], value: string) => {
    setDraft((prev) => ({
      ...prev,
      proyektor: { ...prev.proyektor, [field]: value }
    }));
  };

  const handleServerChange = (field: keyof ProyektorData['serverDanSistem'], value: string) => {
    setDraft((prev) => ({
      ...prev,
      serverDanSistem: { ...prev.serverDanSistem, [field]: value }
    }));
  };

  const handlePerangkatChange = (field: keyof ProyektorData['perangkatRuangProyektor'], value: string) => {
    setDraft((prev) => ({
      ...prev,
      perangkatRuangProyektor: { ...prev.perangkatRuangProyektor, [field]: value }
    }));
  };

  // Add Perangkat Tambahan (bisa untuk server atau booth)
  const handleAddPerangkatTambahan = () => {
    const newItem: PerangkatTambahanItem = {
      id: `perangkat-extra-${Date.now()}`,
      namaPerangkat: '',
      tipeModel: '',
      keterangan: ''
    };
    setDraft((prev) => ({
      ...prev,
      perangkatTambahan: [...(prev.perangkatTambahan || []), newItem]
    }));
  };

  const handlePerangkatTambahanChange = (id: string, field: keyof PerangkatTambahanItem, value: string) => {
    setDraft((prev) => ({
      ...prev,
      perangkatTambahan: (prev.perangkatTambahan || []).map((pt) =>
        pt.id === id ? { ...pt, [field]: value } : pt
      )
    }));
  };

  const handleRemovePerangkatTambahan = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      perangkatTambahan: (prev.perangkatTambahan || []).filter((pt) => pt.id !== id)
    }));
  };

  // Save changes handler
  const handleSaveDraft = () => {
    if (!draft.name.trim()) {
      alert('Nama ruang proyektor tidak boleh kosong.');
      return;
    }
    onUpdateProyektor(draft);
    setIsEditing(false);
  };

  // Cancel edit handler
  const handleCancelDraft = () => {
    setDraft(proyektor);
    setIsEditing(false);
  };

  // 1. Input Foto Perangkat
  const handleInputFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const pendingList: FotoStudioItem[] = [];
    let processed = 0;
    const total = files.length;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const sizeKB = (file.size / 1024).toFixed(1);
        pendingList.push({
          id: `foto-p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          dataUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
          sizeFormatted: `${sizeKB} KB`,
          uploadedAt: new Date().toISOString(),
          applied: true
        });
        processed++;
        if (processed === total) {
          setStagedFotos((prev) => [...prev, ...pendingList]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // 2. Terapkan Foto Perangkat
  const handleApplyFotos = () => {
    if (stagedFotos.length === 0) return;
    onUpdateProyektor({
      ...proyektor,
      fotoPerangkat: [...(proyektor.fotoPerangkat || []), ...stagedFotos]
    });
    setStagedFotos([]);
  };

  // Confirm delete execution
  const handleExecuteDelete = () => {
    if (deleteConfirm.type === 'proyektor') {
      onDelete();
    } else if (deleteConfirm.type === 'foto' && deleteConfirm.targetId) {
      onUpdateProyektor({
        ...proyektor,
        fotoPerangkat: (proyektor.fotoPerangkat || []).filter((f) => f.id !== deleteConfirm.targetId)
      });
    }
    setDeleteConfirm({ isOpen: false, type: 'proyektor' });
  };

  const isPremiere = proyektor.studioRef.toLowerCase().includes('premiere');

  return (
    <div className="space-y-6 animate-fade-in" id="proyektor-detail-view">
      {/* 1. Header Card */}
      <div className="bg-[#0b1222]/90 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950/90 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/40 uppercase tracking-widest flex items-center gap-1.5">
              <Projector className="w-3.5 h-3.5 text-cyan-400" />
              AREA PROYEKTOR
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-blue-950/80 text-blue-300 font-mono text-[11px] font-bold border border-blue-500/40 uppercase">
              RUANG {proyektor.studioRef.toUpperCase()}
            </span>
            {isEditing && (
              <span className="px-2.5 py-0.5 rounded-md bg-blue-900/90 text-cyan-200 font-mono text-[11px] font-bold border border-cyan-400 animate-pulse">
                MODE EDIT AKTIF
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="text-xl sm:text-2xl font-black text-white font-sans bg-slate-900 border border-cyan-400/60 rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-300"
                placeholder="Nama Ruang Proyektor..."
              />
              <input
                type="text"
                value={draft.studioRef}
                onChange={(e) => setDraft({ ...draft, studioRef: e.target.value })}
                className="bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 rounded-lg px-2.5 py-2 w-32"
                placeholder="Ref Studio..."
              />
            </div>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              {proyektor.name.toUpperCase()}
            </h1>
          )}
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-sans">
            Buku Referensi Spesifikasi Mesin Proyektor, Server IMS, Lampu &amp; Perangkat Booth
          </p>
        </div>

        {/* Action Buttons: Edit Data / Simpan Perubahan / Batal / Hapus Data */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-black transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer hover:scale-102 active:scale-98"
                id="btn-simpan-perubahan-proyektor"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>

              <button
                type="button"
                onClick={handleCancelDraft}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-98"
                id="btn-batal-edit-proyektor"
              >
                <X className="w-4 h-4" />
                <span>Batal</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer hover:scale-102 active:scale-98"
              id="btn-edit-data-proyektor"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Data</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setDeleteConfirm({
                isOpen: true,
                type: 'proyektor',
                itemName: proyektor.name
              })
            }
            className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover:border-rose-400 active:scale-98"
            title="Hapus Ruang Proyektor Ini"
            id="btn-hapus-data-proyektor"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Hapus Data</span>
          </button>
        </div>
      </div>

      {/* 2. Grid Spesifikasi: Mesin Proyektor & Server IMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL A: SPESIFIKASI PROYEKTOR */}
        <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
            <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <Projector className="w-4 h-4 text-cyan-400" />
              A. SPESIFIKASI PROYEKTOR
            </h3>
            <span className="text-[11px] font-mono text-slate-400">11 Parameter</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-cyan-300 font-mono uppercase text-[11px] border border-slate-800">
                  <th className="py-2.5 px-3 font-bold w-[42%]">Nama Spesifikasi</th>
                  <th className="py-2.5 px-3 font-bold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-slate-200">
                {[
                  { label: 'Merek Proyektor', key: 'merekProyektor' as const, highlight: true },
                  { label: 'Seri atau Model Proyektor', key: 'seriModelProyektor' as const, cyan: true },
                  { label: 'Teknologi Proyektor', key: 'teknologiProyektor' as const },
                  { label: 'Resolusi', key: 'resolusi' as const, amber: true },
                  { label: 'Tipe Lensa', key: 'tipeLensa' as const },
                  { label: 'Merek Lensa', key: 'merekLensa' as const },
                  { label: 'Nomor Seri Machine (SN Machine)', key: 'snMachine' as const, amber: true },
                  { label: 'Tipe Lampu atau Laser', key: 'tipeLampuLaser' as const },
                  { label: 'Merek Lampu', key: 'merekLampu' as const },
                  { label: 'Tipe Lampu', key: 'tipeLampu' as const },
                  { label: 'Keterangan Tambahan', key: 'keteranganTambahan' as const }
                ].map((row) => (
                  <tr key={row.key} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 text-slate-400 font-semibold bg-slate-950/40 align-middle">
                      {row.label}
                    </td>
                    <td className="py-2 px-3 align-middle">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.proyektor[row.key] || ''}
                          onChange={(e) => handleProyektorChange(row.key, e.target.value)}
                          placeholder={`Isi ${row.label.toLowerCase()}...`}
                          className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded px-2.5 py-1 text-white text-xs font-mono focus:outline-none"
                        />
                      ) : (
                        <span
                          className={
                            row.highlight
                              ? 'text-white font-bold'
                              : row.cyan
                              ? 'text-cyan-300 font-bold'
                              : row.amber
                              ? 'text-amber-300 font-bold'
                              : 'text-slate-200'
                          }
                        >
                          {proyektor.proyektor[row.key] || '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL B: SPESIFIKASI SERVER DAN SISTEM */}
        <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
            <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              B. SPESIFIKASI SERVER DAN SISTEM
            </h3>
            <span className="text-[11px] font-mono text-slate-400">7 Parameter</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-900 text-cyan-300 font-mono uppercase text-[11px] border border-slate-800">
                  <th className="py-2.5 px-3 font-bold w-[42%]">Nama Spesifikasi</th>
                  <th className="py-2.5 px-3 font-bold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-slate-200">
                {[
                  { label: 'Merek Server', key: 'merekServer' as const, highlight: true },
                  { label: 'Tipe Server', key: 'tipeServer' as const },
                  { label: 'Nomor Seri Server (SN Server)', key: 'snServer' as const, amber: true },
                  { label: 'Jenis IMS', key: 'jenisIms' as const, cyan: true },
                  { label: 'Model IMS', key: 'modelIms' as const },
                  { label: 'Kapasitas Penyimpanan', key: 'kapasitasPenyimpanan' as const, amber: true },
                  { label: 'Keterangan Tambahan', key: 'keteranganTambahan' as const }
                ].map((row) => (
                  <tr key={row.key} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 text-slate-400 font-semibold bg-slate-950/40 align-middle">
                      {row.label}
                    </td>
                    <td className="py-2 px-3 align-middle">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draft.serverDanSistem[row.key] || ''}
                          onChange={(e) => handleServerChange(row.key, e.target.value)}
                          placeholder={`Isi ${row.label.toLowerCase()}...`}
                          className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded px-2.5 py-1 text-white text-xs font-mono focus:outline-none"
                        />
                      ) : (
                        <span
                          className={
                            row.highlight
                              ? 'text-white font-bold'
                              : row.cyan
                              ? 'text-cyan-300 font-bold'
                              : row.amber
                              ? 'text-amber-300 font-bold'
                              : 'text-slate-200'
                          }
                        >
                          {proyektor.serverDanSistem[row.key] || '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Perangkat Ruang Proyektor & Perangkat Tambahan (C) */}
      <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div>
            <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              C. PERANGKAT RUANG PROYEKTOR (BOOTH HARDWARE)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Panel dimmer, PC komunikator, UPS, power supply, pencahayaan LED, dan perangkat pendukung.
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={handleAddPerangkatTambahan}
              className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-300 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Perangkat Ekstra</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-cyan-300 font-mono uppercase text-[11px] border border-slate-800">
                <th className="py-2.5 px-3 font-bold w-[30%]">Perangkat</th>
                <th className="py-2.5 px-3 font-bold">Detail / Tipe / Merek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-slate-200">
              {[
                { label: 'Panel Dimmer', key: 'panelDimmer' as const, tipeKey: 'tipePanelDimmer' as const },
                { label: 'PC Komunikator', key: 'pcKomunikator' as const, tipeKey: 'tipePcKomunikator' as const },
                { label: 'UPS', key: 'ups' as const, tipeKey: 'merekTipeUps' as const, highlight: true },
                { label: 'Power Supply', key: 'powerSupply' as const, tipeKey: 'tipePowerSupply' as const },
                { label: 'Lampu LED', key: 'lampuLed' as const, tipeKey: 'tipeLampuLed' as const },
                { label: 'Sound Ruang Proyektor', key: 'soundRuangProyektor' as const },
                { label: 'Lampu LED Tangga', key: 'lampuLedTangga' as const },
                { label: 'Keterangan Tambahan', key: 'keteranganTambahan' as const }
              ].map((row) => (
                <tr key={row.key} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-semibold bg-slate-950/40 align-middle">
                    {row.label}
                  </td>
                  <td className="py-2 px-3 align-middle">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={draft.perangkatRuangProyektor[row.key] || ''}
                          onChange={(e) => handlePerangkatChange(row.key, e.target.value)}
                          placeholder={`Status / Keterangan ${row.label}...`}
                          className="flex-1 bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded px-2.5 py-1 text-white text-xs font-mono focus:outline-none"
                        />
                        {row.tipeKey && (
                          <input
                            type="text"
                            value={draft.perangkatRuangProyektor[row.tipeKey] || ''}
                            onChange={(e) => handlePerangkatChange(row.tipeKey, e.target.value)}
                            placeholder="Merek / Tipe..."
                            className="w-44 bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded px-2.5 py-1 text-cyan-300 text-xs font-mono focus:outline-none"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={row.highlight ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                          {proyektor.perangkatRuangProyektor[row.key] || '—'}
                        </span>
                        {row.tipeKey && proyektor.perangkatRuangProyektor[row.tipeKey] && (
                          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/30">
                            {proyektor.perangkatRuangProyektor[row.tipeKey]}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {/* Perangkat Tambahan yang Ditambahkan Pengguna */}
              {(isEditing ? draft.perangkatTambahan : proyektor.perangkatTambahan)?.map((pt) => (
                <tr key={pt.id} className="hover:bg-slate-800/40 transition bg-cyan-950/10">
                  <td className="py-2 px-3 text-cyan-300 font-semibold bg-slate-950/60 align-middle">
                    {isEditing ? (
                      <input
                        type="text"
                        value={pt.namaPerangkat}
                        onChange={(e) => handlePerangkatTambahanChange(pt.id, 'namaPerangkat', e.target.value)}
                        placeholder="Nama Perangkat Ekstra..."
                        className="w-full bg-slate-900 border border-cyan-500/40 rounded px-2 py-1 text-cyan-300 text-xs font-mono focus:outline-none"
                      />
                    ) : (
                      pt.namaPerangkat || 'Perangkat Tambahan'
                    )}
                  </td>
                  <td className="py-2 px-3 align-middle">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pt.tipeModel}
                          onChange={(e) => handlePerangkatTambahanChange(pt.id, 'tipeModel', e.target.value)}
                          placeholder="Tipe / Model..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none"
                        />
                        <input
                          type="text"
                          value={pt.keterangan}
                          onChange={(e) => handlePerangkatTambahanChange(pt.id, 'keterangan', e.target.value)}
                          placeholder="Keterangan..."
                          className="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePerangkatTambahan(pt.id)}
                          className="p-1 rounded bg-rose-950 text-rose-400 hover:bg-rose-900 cursor-pointer"
                          title="Hapus baris perangkat ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{pt.tipeModel || '—'}</span>
                        {pt.keterangan && (
                          <span className="text-slate-400 text-xs">({pt.keterangan})</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Foto Proyektor dan Perangkat (D) */}
      <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
          <div>
            <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              D. FOTO PROYEKTOR, LENSA &amp; PERANGKAT BOOTH
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dokumentasi visual mesin proyektor, lensa, server IMS, UPS, panel dimmer, dan perangkat pendukung.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fotoFileInputRef}
              onChange={handleInputFoto}
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fotoFileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-cyan-400"
              id="btn-input-foto-proyektor"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Input Gambar</span>
            </button>
          </div>
        </div>

        {/* Kotak Pratinjau Foto Baru yang Belum Diterapkan */}
        {stagedFotos.length > 0 && (
          <div className="p-4 rounded-xl bg-cyan-950/40 border-2 border-dashed border-cyan-400/70 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-cyan-400" />
                {stagedFotos.length} Foto Baru Terpilih (Belum Diterapkan)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyFotos}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-black transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.35)] cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Terapkan Gambar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStagedFotos([])}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {stagedFotos.map((foto) => (
                <div key={foto.id} className="relative bg-slate-900 rounded-lg p-1.5 border border-slate-700">
                  <img src={foto.dataUrl} alt={foto.title} className="h-24 w-full object-contain rounded" />
                  <p className="text-[10px] font-mono text-slate-300 truncate mt-1">{foto.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Photo Grid */}
        {proyektor.fotoPerangkat && proyektor.fotoPerangkat.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {proyektor.fotoPerangkat.map((foto, idx) => (
              <div
                key={foto.id}
                className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-xl overflow-hidden shadow-md transition"
              >
                <div
                  onClick={() =>
                    setFullscreenImage({
                      url: foto.dataUrl,
                      title: foto.title || `Foto Perangkat #${idx + 1}`,
                      subtitle: `${proyektor.name} — Cinema XXI Lippo Mall Puri`
                    })
                  }
                  className="h-44 w-full bg-[#070b14] cursor-pointer flex items-center justify-center relative p-2 overflow-hidden"
                >
                  <img
                    src={foto.dataUrl}
                    alt={foto.title}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-200 rounded"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-cyan-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center backdrop-blur-[1px]">
                    <span className="px-2.5 py-1 rounded bg-slate-900/90 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40 flex items-center gap-1 shadow-lg">
                      <Maximize2 className="w-3.5 h-3.5" />
                      Lihat Fullscreen
                    </span>
                  </div>
                </div>

                <div className="p-2.5 flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-950 border-t border-slate-800">
                  <span className="truncate max-w-[150px] font-semibold text-white" title={foto.title}>
                    #{idx + 1} {foto.title}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setFullscreenImage({
                          url: foto.dataUrl,
                          title: foto.title || `Foto Perangkat #${idx + 1}`,
                          subtitle: `${proyektor.name} — Cinema XXI Lippo Mall Puri`
                        })
                      }
                      className="p-1 rounded hover:bg-cyan-950 hover:text-cyan-300 text-slate-400 transition cursor-pointer"
                      title="Lihat Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm({
                          isOpen: true,
                          type: 'foto',
                          targetId: foto.id,
                          itemName: foto.title
                        })
                      }
                      className="p-1 rounded hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition cursor-pointer"
                      title="Hapus foto ini"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          stagedFotos.length === 0 && (
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-500 font-mono">
              <ImageIcon className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
              <p className="text-sm font-semibold text-slate-400">Belum ada gambar</p>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan tombol "Input Gambar" di atas untuk menambahkan dokumentasi proyektor atau perangkat booth.
              </p>
            </div>
          )
        )}
      </div>

      {/* 5. Catatan Tambahan */}
      <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg space-y-2">
        <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          CATATAN TEKNIS TAMBAHAN
        </h3>
        {isEditing ? (
          <textarea
            value={draft.catatanTambahan || ''}
            onChange={(e) => setDraft({ ...draft, catatanTambahan: e.target.value })}
            placeholder="Tuliskan catatan teknis tambahan terkait ruang proyektor ini..."
            rows={4}
            className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-white text-xs font-mono focus:outline-none"
          />
        ) : proyektor.catatanTambahan ? (
          <p className="text-xs sm:text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
            {proyektor.catatanTambahan}
          </p>
        ) : (
          <p className="text-xs font-mono text-slate-500">Tidak ada catatan teknis tambahan.</p>
        )}
      </div>

      {/* Fullscreen Image Viewer Modal */}
      {fullscreenImage && (
        <ImageFullscreenModal
          isOpen={Boolean(fullscreenImage)}
          onClose={() => setFullscreenImage(null)}
          imageUrl={fullscreenImage.url}
          title={fullscreenImage.title}
          subtitle={fullscreenImage.subtitle}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        title={
          deleteConfirm.type === 'proyektor'
            ? `Hapus Data ${proyektor.name}?`
            : 'Hapus Foto Perangkat?'
        }
        message={
          deleteConfirm.type === 'proyektor'
            ? `Seluruh spesifikasi mesin, server, dan foto dari ${proyektor.name} akan dihapus secara permanen.`
            : 'Foto ini akan dihapus dari data ruang proyektor.'
        }
        itemName={deleteConfirm.itemName}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: 'proyektor' })}
      />
    </div>
  );
}
