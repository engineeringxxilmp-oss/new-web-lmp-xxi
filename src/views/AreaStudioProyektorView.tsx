/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Projector,
  Film,
  Search,
  Download,
  Plus,
  Monitor,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { StudioData, ProyektorData } from '../types/studioProyektor';
import studioProyektorDb from '../services/studioProyektorDb';
import StudioDetailCard from '../components/studioProyektor/StudioDetailCard';
import ProyektorDetailCard from '../components/studioProyektor/ProyektorDetailCard';
import EditStudioModal from '../components/studioProyektor/EditStudioModal';
import EditProyektorModal from '../components/studioProyektor/EditProyektorModal';
import AddStudioProyektorModal from '../components/studioProyektor/AddStudioProyektorModal';
import { exportStudioProyektorToPdf } from '../utils/studioProyektorPdf';

interface AreaStudioProyektorViewProps {
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AreaStudioProyektorView({
  onShowToast
}: AreaStudioProyektorViewProps) {
  // Primary Category: 'studio' | 'proyektor'
  const [activeCategory, setActiveCategory] = useState<'studio' | 'proyektor'>('studio');

  // Database collections
  const [studios, setStudios] = useState<StudioData[]>([]);
  const [proyektors, setProyektors] = useState<ProyektorData[]>([]);

  // Selected item IDs
  const [selectedStudioId, setSelectedStudioId] = useState<string>('studio-1');
  const [selectedProyektorId, setSelectedProyektorId] = useState<string>('proyektor-1');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isEditStudioOpen, setIsEditStudioOpen] = useState(false);
  const [isEditProyektorOpen, setIsEditProyektorOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // PDF Export loading state
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');

  // Subscribe to DB updates
  useEffect(() => {
    const updateLocalState = () => {
      const s = studioProyektorDb.getStudios();
      const p = studioProyektorDb.getProyektors();
      setStudios(s);
      setProyektors(p);

      // Ensure active selections exist
      if (s.length > 0 && !s.some((item) => item.id === selectedStudioId)) {
        setSelectedStudioId(s[0].id);
      }
      if (p.length > 0 && !p.some((item) => item.id === selectedProyektorId)) {
        setSelectedProyektorId(p[0].id);
      }
    };

    updateLocalState();
    const unsubscribe = studioProyektorDb.subscribe(updateLocalState);
    return () => unsubscribe();
  }, []);

  // Filtered Studios based on search query
  const filteredStudios = useMemo(() => {
    if (!searchQuery.trim()) return studios;
    const q = searchQuery.toLowerCase().trim();
    return studios.filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        s.studioType.toLowerCase().includes(q) ||
        s.layar.jenisLayar.toLowerCase().includes(q) ||
        s.layar.merekTipeLayar.toLowerCase().includes(q) ||
        s.soundSystem.merekSoundSystem.toLowerCase().includes(q) ||
        s.soundSystem.prosesor.toLowerCase().includes(q) ||
        s.soundSystem.mainSpeakerDepanKiri.toLowerCase().includes(q) ||
        s.fasilitas.tipeBangku.toLowerCase().includes(q) ||
        s.catatanTambahan.toLowerCase().includes(q)
      );
    });
  }, [studios, searchQuery]);

  // Filtered Proyektors based on search query
  const filteredProyektors = useMemo(() => {
    if (!searchQuery.trim()) return proyektors;
    const q = searchQuery.toLowerCase().trim();
    return proyektors.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.studioRef.toLowerCase().includes(q) ||
        p.proyektor.merekProyektor.toLowerCase().includes(q) ||
        p.proyektor.seriModelProyektor.toLowerCase().includes(q) ||
        p.proyektor.snMachine.toLowerCase().includes(q) ||
        p.serverDanSistem.merekServer.toLowerCase().includes(q) ||
        p.serverDanSistem.tipeServer.toLowerCase().includes(q) ||
        p.serverDanSistem.snServer.toLowerCase().includes(q) ||
        p.serverDanSistem.modelIms.toLowerCase().includes(q) ||
        p.perangkatRuangProyektor.ups.toLowerCase().includes(q) ||
        p.perangkatRuangProyektor.panelDimmer.toLowerCase().includes(q) ||
        p.catatanTambahan.toLowerCase().includes(q)
      );
    });
  }, [proyektors, searchQuery]);

  // Active studio and proyektor records
  const currentStudio = useMemo(() => {
    return studios.find((s) => s.id === selectedStudioId) || studios[0] || null;
  }, [studios, selectedStudioId]);

  const currentProyektor = useMemo(() => {
    return proyektors.find((p) => p.id === selectedProyektorId) || proyektors[0] || null;
  }, [proyektors, selectedProyektorId]);

  // Handle Export PDF
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportStudioProyektorToPdf(studios, proyektors, (progress) => {
        setPdfProgressText(progress);
      });
      onShowToast?.('File PDF berhasil dibuat dan mulai diunduh!', 'success');
    } catch (err: any) {
      console.error('[PDF Export Error]:', err);
      onShowToast?.(`Gagal mengekspor PDF: ${err?.message || 'Kesalahan sistem'}`, 'error');
    } finally {
      setIsExportingPdf(false);
      setPdfProgressText('');
    }
  };

  return (
    <div className="space-y-6" id="area-studio-proyektor-root">
      {/* 1. Upper Top Navigation & Control Banner */}
      <div className="bg-[#0d1322]/90 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/40 uppercase tracking-widest flex items-center gap-1.5">
                <Projector className="w-3.5 h-3.5 text-cyan-400" />
                DIGITAL TECHNICAL REFERENCE BOOK
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/40">
                XXI LIPPO MALL PURI
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              <Projector className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
              AREA STUDIO &amp; PROYEKTOR
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-sans">
              Data Spesifikasi Teknis Cinema XXI Lippo Mall Puri
            </p>
          </div>

          {/* Action buttons: Export PDF & Tambah Data */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-mono text-xs font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-50"
              id="btn-export-pdf-studio-proyektor"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Export PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-black transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer hover:scale-102 active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Category Switcher Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mt-6 pt-5 border-t border-cyan-500/20">
          {/* TWO PRIMARY CATEGORIES: [AREA STUDIO] & [AREA PROYEKTOR] */}
          <div
            className="flex items-center gap-2 p-1.5 bg-[#080d1a] rounded-2xl border border-cyan-500/30 shadow-inner"
            id="category-switcher"
          >
            <button
              type="button"
              onClick={() => setActiveCategory('studio')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeCategory === 'studio'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] border border-cyan-400/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>1. AREA STUDIO</span>
              <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[11px] font-bold text-cyan-200 border border-cyan-500/30">
                {studios.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('proyektor')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeCategory === 'proyektor'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] border border-cyan-400/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Projector className="w-4 h-4" />
              <span>2. AREA PROYEKTOR</span>
              <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[11px] font-bold text-cyan-200 border border-cyan-500/30">
                {proyektors.length}
              </span>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari studio, perangkat, tipe, merek, nomor seri (SN)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-white font-mono text-xs placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Room Navigation Selector Pills */}
        <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center gap-2 overflow-x-auto pb-1 touch-scroll">
          {activeCategory === 'studio' ? (
            filteredStudios.length > 0 ? (
              filteredStudios.map((s) => {
                const isActive = currentStudio?.id === s.id;
                const isPremiere = s.studioType === 'Premiere';
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStudioId(s.id)}
                    className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? isPremiere
                          ? 'bg-amber-950 text-amber-300 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-105'
                          : 'bg-cyan-950 text-cyan-300 border-2 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.35)] scale-105'
                        : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Film className={`w-3 h-3 ${isPremiere ? 'text-amber-400' : 'text-cyan-400'}`} />
                    <span>{s.name}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs font-mono text-slate-500 py-1">Tidak ada studio yang cocok dengan pencarian.</p>
            )
          ) : (
            filteredProyektors.length > 0 ? (
              filteredProyektors.map((p) => {
                const isActive = currentProyektor?.id === p.id;
                const isPremiere = p.studioRef.toLowerCase().includes('premiere');
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProyektorId(p.id)}
                    className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? isPremiere
                          ? 'bg-amber-950 text-amber-300 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-105'
                          : 'bg-cyan-950 text-cyan-300 border-2 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.35)] scale-105'
                        : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Projector className={`w-3 h-3 ${isPremiere ? 'text-amber-400' : 'text-cyan-400'}`} />
                    <span>{p.name}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs font-mono text-slate-500 py-1">Tidak ada ruang proyektor yang cocok dengan pencarian.</p>
            )
          )}
        </div>
      </div>

      {/* 2. Main Content Area */}
      {activeCategory === 'studio' && (
        currentStudio ? (
          <StudioDetailCard
            studio={currentStudio}
            onEdit={() => setIsEditStudioOpen(true)}
            onDelete={() => {
              studioProyektorDb.deleteStudio(currentStudio.id);
              onShowToast?.(`Data ${currentStudio.name} berhasil dihapus.`, 'info');
            }}
            onUpdateStudio={(updated) => {
              studioProyektorDb.saveStudio(updated);
              onShowToast?.(`Perubahan pada ${updated.name} berhasil disimpan.`, 'success');
            }}
          />
        ) : (
          <div className="bg-[#0d1322]/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
            <Film className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-300 font-mono">Belum Ada Data Studio</h3>
            <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
              Aplikasi dalam kondisi bersih (clean slate). Klik tombol &quot;Tambah Baru&quot; di atas untuk mendaftarkan Studio.
            </p>
          </div>
        )
      )}

      {activeCategory === 'proyektor' && (
        currentProyektor ? (
          <ProyektorDetailCard
            proyektor={currentProyektor}
            onEdit={() => setIsEditProyektorOpen(true)}
            onDelete={() => {
              studioProyektorDb.deleteProyektor(currentProyektor.id);
              onShowToast?.(`Data ${currentProyektor.name} berhasil dihapus.`, 'info');
            }}
            onUpdateProyektor={(updated) => {
              studioProyektorDb.saveProyektor(updated);
              onShowToast?.(`Perubahan pada ${updated.name} berhasil disimpan.`, 'success');
            }}
          />
        ) : (
          <div className="bg-[#0d1322]/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
            <Projector className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-300 font-mono">Belum Ada Data Ruang Proyektor</h3>
            <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
              Aplikasi dalam kondisi bersih (clean slate). Klik tombol &quot;Tambah Baru&quot; di atas untuk mendaftarkan Ruang Proyektor.
            </p>
          </div>
        )
      )}

      {/* Modal: Edit Studio */}
      <EditStudioModal
        isOpen={isEditStudioOpen}
        onClose={() => setIsEditStudioOpen(false)}
        studio={currentStudio}
        onSave={(updated) => {
          studioProyektorDb.saveStudio(updated);
          onShowToast?.(`Spesifikasi ${updated.name} berhasil diperbarui!`, 'success');
        }}
      />

      {/* Modal: Edit Proyektor */}
      <EditProyektorModal
        isOpen={isEditProyektorOpen}
        onClose={() => setIsEditProyektorOpen(false)}
        proyektor={currentProyektor}
        onSave={(updated) => {
          studioProyektorDb.saveProyektor(updated);
          onShowToast?.(`Spesifikasi ${updated.name} berhasil diperbarui!`, 'success');
        }}
      />

      {/* Modal: Tambah Ruangan Baru */}
      <AddStudioProyektorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultCategory={activeCategory}
        existingStudiosCount={studios.length}
        existingProyektorsCount={proyektors.length}
        onAddStudio={(item) => {
          studioProyektorDb.saveStudio(item);
          setActiveCategory('studio');
          setSelectedStudioId(item.id);
          onShowToast?.(`Ruangan ${item.name} berhasil ditambahkan!`, 'success');
        }}
        onAddProyektor={(item) => {
          studioProyektorDb.saveProyektor(item);
          setActiveCategory('proyektor');
          setSelectedProyektorId(item.id);
          onShowToast?.(`Ruangan ${item.name} berhasil ditambahkan!`, 'success');
        }}
      />

      {/* Loading Overlay for PDF Export */}
      {isExportingPdf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#0b1222] border-2 border-amber-500/50 p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center space-y-3">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            <h3 className="text-base font-bold text-white font-sans">Mengekspor Dokumen PDF</h3>
            <p className="text-xs font-mono text-amber-300">
              {pdfProgressText || 'Menyusun tabel spesifikasi dan gambar...'}
            </p>
            <p className="text-[11px] text-slate-400 font-sans">
              Mohon tunggu, seluruh data Area Studio dan Area Proyektor sedang disatukan dalam satu file PDF resmi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
