/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { StudioData, DenahGambarItem, FotoStudioItem } from '../../types/studioProyektor';
import {
  Film,
  Edit,
  Trash2,
  Upload,
  CheckCircle2,
  Maximize2,
  ImageIcon,
  Volume2,
  Armchair,
  FileText,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import ImageFullscreenModal from './ImageFullscreenModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface StudioDetailCardProps {
  studio: StudioData;
  onEdit?: () => void;
  onDelete: () => void;
  onUpdateStudio: (updated: StudioData) => void;
}

export default function StudioDetailCard({
  studio,
  onDelete,
  onUpdateStudio
}: StudioDetailCardProps) {
  const denahFileInputRef = useRef<HTMLInputElement>(null);
  const fotoFileInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<StudioData>(studio);

  // Synchronize draft when studio changes
  useEffect(() => {
    setDraft(studio);
  }, [studio]);

  // Staged Image Upload State (Pratinjau sebelum klik "Terapkan Gambar")
  const [stagedDenah, setStagedDenah] = useState<DenahGambarItem | null>(null);
  const [stagedFotos, setStagedFotos] = useState<FotoStudioItem[]>([]);

  // Fullscreen viewer state
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'studio' | 'denah' | 'foto';
    targetId?: string;
    itemName?: string;
  }>({ isOpen: false, type: 'studio' });

  // Handle Edit Input Changes
  const handleLayarChange = (field: keyof StudioData['layar'], value: string) => {
    setDraft((prev) => ({
      ...prev,
      layar: { ...prev.layar, [field]: value }
    }));
  };

  const handleSoundChange = (field: keyof StudioData['soundSystem'], value: string) => {
    setDraft((prev) => ({
      ...prev,
      soundSystem: { ...prev.soundSystem, [field]: value }
    }));
  };

  const handleFasilitasChange = (field: keyof StudioData['fasilitas'], value: string) => {
    setDraft((prev) => ({
      ...prev,
      fasilitas: { ...prev.fasilitas, [field]: value }
    }));
  };

  // Save changes handler
  const handleSaveDraft = () => {
    if (!draft.name.trim()) {
      alert('Nama studio tidak boleh kosong.');
      return;
    }
    onUpdateStudio(draft);
    setIsEditing(false);
  };

  // Cancel edit handler
  const handleCancelDraft = () => {
    setDraft(studio);
    setIsEditing(false);
  };

  // 1. Input Gambar Denah (Pilih file -> simpan di stagedDenah)
  const handleInputDenah = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeKB = (file.size / 1024).toFixed(1);
      setStagedDenah({
        id: `denah-${Date.now()}`,
        dataUrl,
        name: file.name,
        sizeFormatted: `${sizeKB} KB`,
        uploadedAt: new Date().toISOString(),
        applied: true
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 2. Terapkan Gambar Denah
  const handleApplyDenah = () => {
    if (!stagedDenah) return;
    onUpdateStudio({
      ...studio,
      denahGambar: stagedDenah
    });
    setStagedDenah(null);
  };

  // 3. Input Gambar Foto Studio
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
          id: `foto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  // 4. Terapkan Foto Studio
  const handleApplyFotos = () => {
    if (stagedFotos.length === 0) return;
    onUpdateStudio({
      ...studio,
      fotoStudio: [...(studio.fotoStudio || []), ...stagedFotos]
    });
    setStagedFotos([]);
  };

  // Confirm delete execution
  const handleExecuteDelete = () => {
    if (deleteConfirm.type === 'studio') {
      onDelete();
    } else if (deleteConfirm.type === 'denah') {
      onUpdateStudio({
        ...studio,
        denahGambar: null
      });
    } else if (deleteConfirm.type === 'foto' && deleteConfirm.targetId) {
      onUpdateStudio({
        ...studio,
        fotoStudio: (studio.fotoStudio || []).filter((f) => f.id !== deleteConfirm.targetId)
      });
    }
    setDeleteConfirm({ isOpen: false, type: 'studio' });
  };

  const isPremiere = (isEditing ? draft.studioType : studio.studioType) === 'Premiere';

  return (
    <div className="space-y-6 animate-fade-in" id="studio-detail-view">
      {/* 1. Header Card with Edit & Action Controls */}
      <div className="bg-[#0b1222]/90 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-950/90 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/40 uppercase tracking-widest flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              AREA STUDIO
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-amber-950/80 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/40 uppercase">
              {isPremiere ? 'THE PREMIERE XXI' : 'CINEMA XXI DELUXE'}
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
                placeholder="Nama Studio..."
              />
              <select
                value={draft.studioType}
                onChange={(e) => setDraft({ ...draft, studioType: e.target.value as 'Regular' | 'Premiere' })}
                className="bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 rounded-lg px-2.5 py-2"
              >
                <option value="Regular">Regular (Deluxe)</option>
                <option value="Premiere">The Premiere</option>
              </select>
            </div>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              {studio.name.toUpperCase()}
            </h1>
          )}
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-sans">
            Buku Referensi Teknis Layar, Sound System, Denah Arsitek &amp; Fasilitas Ruangan
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
                id="btn-simpan-perubahan-studio"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>

              <button
                type="button"
                onClick={handleCancelDraft}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-98"
                id="btn-batal-edit-studio"
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
              id="btn-edit-data-studio"
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
                type: 'studio',
                itemName: studio.name
              })
            }
            className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover:border-rose-400 active:scale-98"
            title="Hapus Studio Ini"
            id="btn-hapus-data-studio"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Hapus Data</span>
          </button>
        </div>
      </div>

      {/* 2. Grid Spesifikasi: Layar & Sound System */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL A: SPESIFIKASI LAYAR */}
        <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
            <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400" />
              A. SPESIFIKASI LAYAR
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
                  { label: 'Jenis Layar', key: 'jenisLayar' as const, highlight: true },
                  { label: 'Merek atau Tipe Layar', key: 'merekTipeLayar' as const },
                  { label: 'Ukuran Layar (Lebar)', key: 'ukuranLebar' as const, amber: true },
                  { label: 'Ukuran Layar (Tinggi)', key: 'ukuranTinggi' as const, amber: true },
                  { label: 'Rasio Aspek', key: 'rasioAspek' as const, cyan: true },
                  { label: 'Tipe Layar', key: 'tipeLayar' as const },
                  { label: 'Motor Layar', key: 'motorLayar' as const },
                  { label: 'Tipe Motor Layar', key: 'tipeMotorLayar' as const },
                  { label: 'Korden Layar', key: 'kordenLayar' as const },
                  { label: 'Tipe Korden Layar', key: 'tipeKordenLayar' as const },
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
                          value={draft.layar[row.key] || ''}
                          onChange={(e) => handleLayarChange(row.key, e.target.value)}
                          placeholder={`Isi ${row.label.toLowerCase()}...`}
                          className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded px-2.5 py-1 text-white text-xs font-mono focus:outline-none"
                        />
                      ) : (
                        <span
                          className={
                            row.highlight
                              ? 'text-white font-bold'
                              : row.amber
                              ? 'text-amber-300 font-bold'
                              : row.cyan
                              ? 'text-cyan-300 font-bold'
                              : 'text-slate-200'
                          }
                        >
                          {studio.layar[row.key] || '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL B: SPESIFIKASI SOUND SYSTEM */}
        <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
            <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              B. SPESIFIKASI SOUND SYSTEM
            </h3>
            <span className="text-[11px] font-mono text-slate-400">20 Parameter</span>
          </div>

          <div className="overflow-x-auto max-h-[520px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-900 text-cyan-300 font-mono uppercase text-[11px] border border-slate-800">
                  <th className="py-2.5 px-3 font-bold w-[42%]">Nama Spesifikasi</th>
                  <th className="py-2.5 px-3 font-bold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-slate-200">
                {[
                  { label: 'Jenis Sound System', key: 'jenisSoundSystem' as const, cyan: true },
                  { label: 'Merek Sound System', key: 'merekSoundSystem' as const },
                  { label: 'Tipe Sound System', key: 'tipeSoundSystem' as const },
                  { label: 'Prosesor', key: 'prosesor' as const, white: true },
                  { label: 'Tipe Prosesor', key: 'tipeProsesor' as const },
                  { label: 'DCM', key: 'dcm' as const },
                  { label: 'Tipe DCM', key: 'tipeDcm' as const },
                  { label: 'Crossover', key: 'crossover' as const },
                  { label: 'Tipe Crossover', key: 'tipeCrossover' as const },
                  { label: 'Monitor Sound', key: 'monitorSound' as const },
                  { label: 'Merek dan Tipe Monitor Sound', key: 'merekTipeMonitorSound' as const },
                  { label: 'Main Speaker Depan Kiri', key: 'mainSpeakerDepanKiri' as const },
                  { label: 'Main Speaker Depan Kanan', key: 'mainSpeakerDepanKanan' as const },
                  { label: 'Center Speaker', key: 'centerSpeaker' as const },
                  { label: 'Top Speaker (Atas)', key: 'topSpeaker' as const },
                  { label: 'Surround Speaker Kiri', key: 'surroundSpeakerKiri' as const },
                  { label: 'Surround Speaker Kanan', key: 'surroundSpeakerKanan' as const },
                  { label: 'Back Surround Kiri', key: 'backSurroundKiri' as const },
                  { label: 'Back Surround Kanan', key: 'backSurroundKanan' as const },
                  { label: 'Subwoofer', key: 'subwoofer' as const, amber: true },
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
                          value={draft.soundSystem[row.key] || ''}
                          onChange={(e) => handleSoundChange(row.key, e.target.value)}
                          placeholder={`Isi ${row.label.toLowerCase()}...`}
                          className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded px-2.5 py-1 text-white text-xs font-mono focus:outline-none"
                        />
                      ) : (
                        <span
                          className={
                            row.cyan
                              ? 'text-cyan-300 font-bold'
                              : row.white
                              ? 'text-white font-bold'
                              : row.amber
                              ? 'text-amber-300 font-bold'
                              : 'text-slate-200'
                          }
                        >
                          {studio.soundSystem[row.key] || '—'}
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

      {/* 3. Fasilitas Studio */}
      <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20">
          <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2">
            <Armchair className="w-4 h-4 text-cyan-400" />
            C. FASILITAS STUDIO
          </h3>
          <span className="text-[11px] font-mono text-slate-400">8 Parameter</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-cyan-300 font-mono uppercase text-[11px] border border-slate-800">
                <th className="py-2.5 px-3 font-bold w-[30%]">Fasilitas Studio</th>
                <th className="py-2.5 px-3 font-bold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-slate-200">
              {[
                { label: 'Jumlah Bangku', key: 'jumlahBangku' as const, emerald: true },
                { label: 'Tipe Bangku', key: 'tipeBangku' as const },
                { label: 'Jenis Lantai', key: 'jenisLantai' as const },
                { label: 'Jenis Dinding', key: 'jenisDinding' as const },
                { label: 'Jenis Plafon', key: 'jenisPlafon' as const },
                { label: 'Tipe Studio', key: 'tipeStudio' as const, white: true },
                { label: 'Fasilitas Tambahan', key: 'fasilitasTambahan' as const },
                { label: 'Keterangan', key: 'keterangan' as const }
              ].map((row) => (
                <tr key={row.key} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 text-slate-400 font-semibold bg-slate-950/40 align-middle">
                    {row.label}
                  </td>
                  <td className="py-2 px-3 align-middle">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft.fasilitas[row.key] || ''}
                        onChange={(e) => handleFasilitasChange(row.key, e.target.value)}
                        placeholder={`Isi ${row.label.toLowerCase()}...`}
                        className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded px-2.5 py-1 text-white text-xs font-mono focus:outline-none"
                      />
                    ) : (
                      <span
                        className={
                          row.emerald
                            ? 'text-emerald-400 font-bold'
                            : row.white
                            ? 'text-white font-bold'
                            : 'text-slate-200'
                        }
                      >
                        {studio.fasilitas[row.key] || '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Gambar dan Denah Arsitek Studio (D) */}
      <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
          <div>
            <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              D. DENAH ARSITEK DAN GAMBAR TEKNIS STUDIO
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Denah arsitek tata letak studio, seating layout, atau gambar teknik resmi.
            </p>
          </div>

          {/* Action buttons: Input Gambar, Terapkan Gambar, Hapus Gambar, Lihat Fullscreen */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={denahFileInputRef}
              onChange={handleInputDenah}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => denahFileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-cyan-400"
              id="btn-input-denah-studio"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Input Gambar</span>
            </button>

            {studio.denahGambar && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setFullscreenImage({
                      url: studio.denahGambar!.dataUrl,
                      title: `Denah Arsitek — ${studio.name}`,
                      subtitle: studio.denahGambar!.name
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  id="btn-fullscreen-denah-studio"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Lihat Fullscreen</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirm({
                      isOpen: true,
                      type: 'denah',
                      itemName: studio.denahGambar?.name
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  id="btn-hapus-denah-studio"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hapus Gambar</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Kotak Pratinjau Jika Ada Gambar Baru yang Baru Dipilih (Staged) */}
        {stagedDenah && (
          <div className="p-4 rounded-xl bg-cyan-950/40 border-2 border-dashed border-cyan-400/70 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-cyan-400" />
                Pratinjau Gambar Baru Terpilih (Belum Diterapkan)
              </span>
              <span className="text-[11px] font-mono text-slate-400">{stagedDenah.sizeFormatted}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 p-3 rounded-lg border border-cyan-500/30">
              <img
                src={stagedDenah.dataUrl}
                alt={stagedDenah.name}
                className="max-h-40 max-w-[200px] object-contain rounded border border-slate-700"
              />
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-xs font-mono font-bold text-white truncate max-w-sm">{stagedDenah.name}</p>
                <p className="text-[11px] text-slate-300">
                  Klik tombol <strong>"Terapkan Gambar"</strong> di bawah untuk memasang denah ini ke dalam spesifikasi {studio.name}.
                </p>
                <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={handleApplyDenah}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-black transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.35)] cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Terapkan Gambar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStagedDenah(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Display Area Denah yang Sudah Diterapkan */}
        {studio.denahGambar ? (
          <div className="relative group bg-[#070b14] border border-slate-800 rounded-xl overflow-hidden p-3 flex flex-col items-center justify-center min-h-[220px]">
            <img
              src={studio.denahGambar.dataUrl}
              alt={studio.denahGambar.name}
              className="max-h-[380px] w-auto max-w-full object-contain rounded shadow-lg transition-transform duration-200 group-hover:scale-[1.01]"
            />
            <div className="w-full flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
              <span className="text-white font-bold truncate max-w-xs">{studio.denahGambar.name}</span>
              <span>{studio.denahGambar.sizeFormatted || 'Tersimpan'}</span>
            </div>
          </div>
        ) : (
          !stagedDenah && (
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-500 font-mono">
              <ImageIcon className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
              <p className="text-sm font-semibold text-slate-400">Belum ada gambar</p>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan tombol "Input Gambar" di atas untuk mengunggah denah arsitek studio ini.
              </p>
            </div>
          )
        )}
      </div>

      {/* 5. Foto Studio (E) */}
      <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
          <div>
            <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              E. FOTO KONDISI STUDIO
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dokumentasi foto visual layar, deretan tempat duduk, speaker, atau interior studio.
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
              id="btn-input-foto-studio"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Input Gambar</span>
            </button>
          </div>
        </div>

        {/* Kotak Pratinjau Jika Ada Foto Baru yang Belum Diterapkan */}
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
              {stagedFotos.map((foto, idx) => (
                <div key={foto.id} className="relative bg-slate-900 rounded-lg p-1.5 border border-slate-700">
                  <img src={foto.dataUrl} alt={foto.title} className="h-24 w-full object-contain rounded" />
                  <p className="text-[10px] font-mono text-slate-300 truncate mt-1">{foto.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo Gallery Grid */}
        {studio.fotoStudio && studio.fotoStudio.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {studio.fotoStudio.map((foto, idx) => (
              <div
                key={foto.id}
                className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-xl overflow-hidden shadow-md transition"
              >
                <div
                  onClick={() =>
                    setFullscreenImage({
                      url: foto.dataUrl,
                      title: foto.title || `Foto Studio #${idx + 1}`,
                      subtitle: `${studio.name} — Cinema XXI Lippo Mall Puri`
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
                          title: foto.title || `Foto Studio #${idx + 1}`,
                          subtitle: `${studio.name} — Cinema XXI Lippo Mall Puri`
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
                Tambahkan foto dokumentasi visual kondisi studio melalui tombol "Input Gambar".
              </p>
            </div>
          )
        )}
      </div>

      {/* 6. Catatan Tambahan */}
      <div className="bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-5 shadow-lg space-y-2">
        <h3 className="text-sm font-black text-cyan-300 uppercase font-mono tracking-wider flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          CATATAN TEKNIS TAMBAHAN
        </h3>
        {isEditing ? (
          <textarea
            value={draft.catatanTambahan || ''}
            onChange={(e) => setDraft({ ...draft, catatanTambahan: e.target.value })}
            placeholder="Tuliskan catatan teknis tambahan terkait studio ini..."
            rows={4}
            className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-white text-xs font-mono focus:outline-none"
          />
        ) : studio.catatanTambahan ? (
          <p className="text-xs sm:text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
            {studio.catatanTambahan}
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
          deleteConfirm.type === 'studio'
            ? `Hapus Data ${studio.name}?`
            : deleteConfirm.type === 'denah'
            ? 'Hapus Denah Arsitek?'
            : 'Hapus Foto Studio?'
        }
        message={
          deleteConfirm.type === 'studio'
            ? `Seluruh spesifikasi teknis, denah, dan foto dari ${studio.name} akan dihapus secara permanen.`
            : 'Gambar ini akan dihapus dari data studio yang tersimpan.'
        }
        itemName={deleteConfirm.itemName}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: 'studio' })}
      />
    </div>
  );
}
