/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StudioData } from '../../types/studioProyektor';
import { X, Save, Film, Volume2, Armchair, FileText, CheckCircle2 } from 'lucide-react';

interface EditStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  studio: StudioData | null;
  onSave: (updated: StudioData) => void;
}

export default function EditStudioModal({
  isOpen,
  onClose,
  studio,
  onSave
}: EditStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'layar' | 'sound' | 'fasilitas' | 'catatan'>('layar');
  const [formData, setFormData] = useState<StudioData | null>(null);

  useEffect(() => {
    if (studio) {
      setFormData(JSON.parse(JSON.stringify(studio)));
      setActiveTab('layar');
    }
  }, [studio, isOpen]);

  if (!isOpen || !formData) return null;

  const handleLayarChange = (field: keyof StudioData['layar'], value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        layar: {
          ...prev.layar,
          [field]: value
        }
      };
    });
  };

  const handleSoundChange = (field: keyof StudioData['soundSystem'], value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        soundSystem: {
          ...prev.soundSystem,
          [field]: value
        }
      };
    });
  };

  const handleFasilitasChange = (field: keyof StudioData['fasilitas'], value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fasilitas: {
          ...prev.fasilitas,
          [field]: value
        }
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    onSave(formData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-[#0b1222] border-2 border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#070b16] border-b border-cyan-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              <Film className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-sans flex items-center gap-2">
                <span>EDIT SPESIFIKASI:</span>
                <span className="text-amber-300">{formData.name}</span>
              </h2>
              <p className="text-[11px] font-mono text-cyan-400">
                Lengkapi dan perbarui rincian teknis studio secara manual.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="px-5 pt-3 pb-2 bg-[#090f1d] border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('layar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'layar'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Spesifikasi Layar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sound')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'sound'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Sound System</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fasilitas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'fasilitas'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Armchair className="w-3.5 h-3.5" />
            <span>Fasilitas Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catatan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'catatan'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Catatan Tambahan</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: SPESIFIKASI LAYAR */}
          {activeTab === 'layar' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Jenis Layar</label>
                  <input
                    type="text"
                    value={formData.layar.jenisLayar}
                    onChange={(e) => handleLayarChange('jenisLayar', e.target.value)}
                    placeholder="Contoh: Perforated White Matt / Silver 3D"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Merek atau Tipe Layar</label>
                  <input
                    type="text"
                    value={formData.layar.merekTipeLayar}
                    onChange={(e) => handleLayarChange('merekTipeLayar', e.target.value)}
                    placeholder="Contoh: Harkness Hall Perlux 180"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Ukuran Layar (Lebar)</label>
                  <input
                    type="text"
                    value={formData.layar.ukuranLebar}
                    onChange={(e) => handleLayarChange('ukuranLebar', e.target.value)}
                    placeholder="Contoh: 14.20 Meter"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Ukuran Layar (Tinggi)</label>
                  <input
                    type="text"
                    value={formData.layar.ukuranTinggi}
                    onChange={(e) => handleLayarChange('ukuranTinggi', e.target.value)}
                    placeholder="Contoh: 6.80 Meter"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Rasio Aspek</label>
                  <input
                    type="text"
                    value={formData.layar.rasioAspek}
                    onChange={(e) => handleLayarChange('rasioAspek', e.target.value)}
                    placeholder="Contoh: 2.39:1 (Scope) / 1.85:1 (Flat)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Layar</label>
                  <input
                    type="text"
                    value={formData.layar.tipeLayar}
                    onChange={(e) => handleLayarChange('tipeLayar', e.target.value)}
                    placeholder="Contoh: Curved Fixed Frame"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Motor Layar</label>
                  <input
                    type="text"
                    value={formData.layar.motorLayar}
                    onChange={(e) => handleLayarChange('motorLayar', e.target.value)}
                    placeholder="Contoh: Somfy Electric Motor"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Motor Layar</label>
                  <input
                    type="text"
                    value={formData.layar.tipeMotorLayar}
                    onChange={(e) => handleLayarChange('tipeMotorLayar', e.target.value)}
                    placeholder="Contoh: Automatic Masking Control"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Korden Layar</label>
                  <input
                    type="text"
                    value={formData.layar.kordenLayar}
                    onChange={(e) => handleLayarChange('kordenLayar', e.target.value)}
                    placeholder="Contoh: Velvet Black Heavy Duty"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Korden Layar</label>
                  <input
                    type="text"
                    value={formData.layar.tipeKordenLayar}
                    onChange={(e) => handleLayarChange('tipeKordenLayar', e.target.value)}
                    placeholder="Contoh: Side Masking Horizontal Draw"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Keterangan Tambahan Layar</label>
                <textarea
                  rows={2}
                  value={formData.layar.keteranganTambahan}
                  onChange={(e) => handleLayarChange('keteranganTambahan', e.target.value)}
                  placeholder="Catatan instalasi, kondisi material, atau nomor sertifikasi..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: SOUND SYSTEM */}
          {activeTab === 'sound' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Jenis Sound System</label>
                  <input
                    type="text"
                    value={formData.soundSystem.jenisSoundSystem}
                    onChange={(e) => handleSoundChange('jenisSoundSystem', e.target.value)}
                    placeholder="Contoh: Dolby Atmos / 7.1 Surround / 5.1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Merek Sound System</label>
                  <input
                    type="text"
                    value={formData.soundSystem.merekSoundSystem}
                    onChange={(e) => handleSoundChange('merekSoundSystem', e.target.value)}
                    placeholder="Contoh: QSC / JBL Professional / Dolby"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Sound System</label>
                  <input
                    type="text"
                    value={formData.soundSystem.tipeSoundSystem}
                    onChange={(e) => handleSoundChange('tipeSoundSystem', e.target.value)}
                    placeholder="Contoh: Cinema Sound System 7.1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Prosesor</label>
                  <input
                    type="text"
                    value={formData.soundSystem.prosesor}
                    onChange={(e) => handleSoundChange('prosesor', e.target.value)}
                    placeholder="Contoh: Dolby CP750 / CP950 / QSC Core"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Prosesor</label>
                  <input
                    type="text"
                    value={formData.soundSystem.tipeProsesor}
                    onChange={(e) => handleSoundChange('tipeProsesor', e.target.value)}
                    placeholder="Contoh: Digital Cinema Processor"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">DCM</label>
                  <input
                    type="text"
                    value={formData.soundSystem.dcm}
                    onChange={(e) => handleSoundChange('dcm', e.target.value)}
                    placeholder="Contoh: QSC DCM-10D / DCM-30D"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe DCM</label>
                  <input
                    type="text"
                    value={formData.soundSystem.tipeDcm}
                    onChange={(e) => handleSoundChange('tipeDcm', e.target.value)}
                    placeholder="Contoh: Digital Cinema Monitor / Crossover"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Crossover & Tipe Crossover</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.soundSystem.crossover}
                      onChange={(e) => handleSoundChange('crossover', e.target.value)}
                      placeholder="Crossover..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={formData.soundSystem.tipeCrossover}
                      onChange={(e) => handleSoundChange('tipeCrossover', e.target.value)}
                      placeholder="Tipe Crossover..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Monitor Sound (Booth Monitor)</label>
                  <input
                    type="text"
                    value={formData.soundSystem.monitorSound}
                    onChange={(e) => handleSoundChange('monitorSound', e.target.value)}
                    placeholder="Contoh: QSC DPM-100"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Merek & Tipe Monitor Sound</label>
                  <input
                    type="text"
                    value={formData.soundSystem.merekTipeMonitorSound}
                    onChange={(e) => handleSoundChange('merekTipeMonitorSound', e.target.value)}
                    placeholder="Contoh: QSC Audio Booth Reference"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Main Speaker Depan Kiri</label>
                  <input
                    type="text"
                    value={formData.soundSystem.mainSpeakerDepanKiri}
                    onChange={(e) => handleSoundChange('mainSpeakerDepanKiri', e.target.value)}
                    placeholder="Contoh: QSC SC-423C (Left)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Main Speaker Depan Kanan</label>
                  <input
                    type="text"
                    value={formData.soundSystem.mainSpeakerDepanKanan}
                    onChange={(e) => handleSoundChange('mainSpeakerDepanKanan', e.target.value)}
                    placeholder="Contoh: QSC SC-423C (Right)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Center Speaker</label>
                  <input
                    type="text"
                    value={formData.soundSystem.centerSpeaker}
                    onChange={(e) => handleSoundChange('centerSpeaker', e.target.value)}
                    placeholder="Contoh: QSC SC-423C (Center)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Top Speaker (Atas / Ceiling)</label>
                  <input
                    type="text"
                    value={formData.soundSystem.topSpeaker}
                    onChange={(e) => handleSoundChange('topSpeaker', e.target.value)}
                    placeholder="Contoh: QSC SR-1030 (Overhead)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Surround Speaker Kiri</label>
                  <input
                    type="text"
                    value={formData.soundSystem.surroundSpeakerKiri}
                    onChange={(e) => handleSoundChange('surroundSpeakerKiri', e.target.value)}
                    placeholder="Contoh: QSC SR-8200 Left (6 Unit)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Surround Speaker Kanan</label>
                  <input
                    type="text"
                    value={formData.soundSystem.surroundSpeakerKanan}
                    onChange={(e) => handleSoundChange('surroundSpeakerKanan', e.target.value)}
                    placeholder="Contoh: QSC SR-8200 Right (6 Unit)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Back Surround Kiri</label>
                  <input
                    type="text"
                    value={formData.soundSystem.backSurroundKiri}
                    onChange={(e) => handleSoundChange('backSurroundKiri', e.target.value)}
                    placeholder="Contoh: QSC SR-8200 Rear Left (2 Unit)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Back Surround Kanan</label>
                  <input
                    type="text"
                    value={formData.soundSystem.backSurroundKanan}
                    onChange={(e) => handleSoundChange('backSurroundKanan', e.target.value)}
                    placeholder="Contoh: QSC SR-8200 Rear Right (2 Unit)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Subwoofer</label>
                  <input
                    type="text"
                    value={formData.soundSystem.subwoofer}
                    onChange={(e) => handleSoundChange('subwoofer', e.target.value)}
                    placeholder="Contoh: QSC SB-7218 Dual 18-inch Subwoofer (2 Unit)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Keterangan Tambahan Sound</label>
                <textarea
                  rows={2}
                  value={formData.soundSystem.keteranganTambahan}
                  onChange={(e) => handleSoundChange('keteranganTambahan', e.target.value)}
                  placeholder="Informasi power amplifier, tuning EQ, atau catatan audio..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: FASILITAS STUDIO */}
          {activeTab === 'fasilitas' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Jumlah Bangku (Seat Capacity)</label>
                  <input
                    type="text"
                    value={formData.fasilitas.jumlahBangku}
                    onChange={(e) => handleFasilitasChange('jumlahBangku', e.target.value)}
                    placeholder="Contoh: 184 Seats (Row A-K)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Bangku</label>
                  <input
                    type="text"
                    value={formData.fasilitas.tipeBangku}
                    onChange={(e) => handleFasilitasChange('tipeBangku', e.target.value)}
                    placeholder="Contoh: Ferco Seating Recliner / Deluxe Rocker"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Jenis Lantai</label>
                  <input
                    type="text"
                    value={formData.fasilitas.jenisLantai}
                    onChange={(e) => handleFasilitasChange('jenisLantai', e.target.value)}
                    placeholder="Contoh: Carpet Tile Acoustic Heavy Duty"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Jenis Dinding</label>
                  <input
                    type="text"
                    value={formData.fasilitas.jenisDinding}
                    onChange={(e) => handleFasilitasChange('jenisDinding', e.target.value)}
                    placeholder="Contoh: Fabric Wrapped Acoustic Panel"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Jenis Plafon</label>
                  <input
                    type="text"
                    value={formData.fasilitas.jenisPlafon}
                    onChange={(e) => handleFasilitasChange('jenisPlafon', e.target.value)}
                    placeholder="Contoh: Acoustic Ceiling Board Mineral Fiber"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Studio</label>
                  <input
                    type="text"
                    value={formData.fasilitas.tipeStudio}
                    onChange={(e) => handleFasilitasChange('tipeStudio', e.target.value)}
                    placeholder="Contoh: Cinema XXI Deluxe / The Premiere"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Fasilitas Tambahan</label>
                  <input
                    type="text"
                    value={formData.fasilitas.fasilitasTambahan}
                    onChange={(e) => handleFasilitasChange('fasilitasTambahan', e.target.value)}
                    placeholder="Contoh: LED Step Light, Exit Signage Emergency, Blanket Service"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Keterangan Fasilitas</label>
                  <textarea
                    rows={2}
                    value={formData.fasilitas.keterangan}
                    onChange={(e) => handleFasilitasChange('keterangan', e.target.value)}
                    placeholder="Catatan kondisi fisik ruangan, kebersihan, atau perbaikan terakhir..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CATATAN TAMBAHAN */}
          {activeTab === 'catatan' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">
                  Catatan Umum / Instruksi Khusus Studio
                </label>
                <textarea
                  rows={6}
                  value={formData.catatanTambahan}
                  onChange={(e) => setFormData((prev) => prev ? { ...prev, catatanTambahan: e.target.value } : prev)}
                  placeholder="Tuliskan catatan teknis, tanggal kalibrasi terakhir, riwayat pengecekan sound alignment, atau informasi penting lainnya..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
