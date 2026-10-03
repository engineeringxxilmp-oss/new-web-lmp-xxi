/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProyektorData, PerangkatTambahanItem } from '../../types/studioProyektor';
import { X, Save, Projector, Server, Cpu, FileText, Plus, Trash2 } from 'lucide-react';

interface EditProyektorModalProps {
  isOpen: boolean;
  onClose: () => void;
  proyektor: ProyektorData | null;
  onSave: (updated: ProyektorData) => void;
}

export default function EditProyektorModal({
  isOpen,
  onClose,
  proyektor,
  onSave
}: EditProyektorModalProps) {
  const [activeTab, setActiveTab] = useState<'proyektor' | 'server' | 'perangkat' | 'catatan'>('proyektor');
  const [formData, setFormData] = useState<ProyektorData | null>(null);

  useEffect(() => {
    if (proyektor) {
      setFormData(JSON.parse(JSON.stringify(proyektor)));
      setActiveTab('proyektor');
    }
  }, [proyektor, isOpen]);

  if (!isOpen || !formData) return null;

  const handleProyektorChange = (field: keyof ProyektorData['proyektor'], value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        proyektor: {
          ...prev.proyektor,
          [field]: value
        }
      };
    });
  };

  const handleServerChange = (field: keyof ProyektorData['serverDanSistem'], value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        serverDanSistem: {
          ...prev.serverDanSistem,
          [field]: value
        }
      };
    });
  };

  const handlePerangkatChange = (field: keyof ProyektorData['perangkatRuangProyektor'], value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        perangkatRuangProyektor: {
          ...prev.perangkatRuangProyektor,
          [field]: value
        }
      };
    });
  };

  const handleAddPerangkatTambahan = () => {
    setFormData((prev) => {
      if (!prev) return prev;
      const list = prev.perangkatTambahan || [];
      return {
        ...prev,
        perangkatTambahan: [
          ...list,
          {
            id: `pt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            namaPerangkat: '',
            tipeModel: '',
            keterangan: ''
          }
        ]
      };
    });
  };

  const handleUpdatePerangkatTambahan = (id: string, field: keyof PerangkatTambahanItem, val: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const list = (prev.perangkatTambahan || []).map((item) => {
        if (item.id === id) {
          return { ...item, [field]: val };
        }
        return item;
      });
      return { ...prev, perangkatTambahan: list };
    });
  };

  const handleRemovePerangkatTambahan = (id: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const list = (prev.perangkatTambahan || []).filter((item) => item.id !== id);
      return { ...prev, perangkatTambahan: list };
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
              <Projector className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-sans flex items-center gap-2">
                <span>EDIT SPESIFIKASI:</span>
                <span className="text-cyan-400">{formData.name}</span>
              </h2>
              <p className="text-[11px] font-mono text-cyan-400">
                Ruang Proyektor {formData.studioRef} — Cinema XXI Lippo Mall Puri
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
            onClick={() => setActiveTab('proyektor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'proyektor'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Projector className="w-3.5 h-3.5" />
            <span>Spesifikasi Proyektor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('server')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'server'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Server &amp; IMS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('perangkat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'perangkat'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-400/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Perangkat Ruang Proyektor</span>
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
          {/* TAB 1: PROYEKTOR */}
          {activeTab === 'proyektor' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Merek Proyektor</label>
                  <input
                    type="text"
                    value={formData.proyektor.merekProyektor}
                    onChange={(e) => handleProyektorChange('merekProyektor', e.target.value)}
                    placeholder="Contoh: Barco / Christie / NEC"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Seri atau Model Proyektor</label>
                  <input
                    type="text"
                    value={formData.proyektor.seriModelProyektor}
                    onChange={(e) => handleProyektorChange('seriModelProyektor', e.target.value)}
                    placeholder="Contoh: Barco DP2K-20C / CP2220"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Teknologi Proyektor</label>
                  <input
                    type="text"
                    value={formData.proyektor.teknologiProyektor}
                    onChange={(e) => handleProyektorChange('teknologiProyektor', e.target.value)}
                    placeholder="Contoh: 3-chip DLP Cinema 0.98 inch"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Resolusi</label>
                  <input
                    type="text"
                    value={formData.proyektor.resolusi}
                    onChange={(e) => handleProyektorChange('resolusi', e.target.value)}
                    placeholder="Contoh: 2K (2048 x 1080) / 4K"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Lensa</label>
                  <input
                    type="text"
                    value={formData.proyektor.tipeLensa}
                    onChange={(e) => handleProyektorChange('tipeLensa', e.target.value)}
                    placeholder="Contoh: 1.45 - 2.10:1 Motorized Zoom Lens"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Merek Lensa</label>
                  <input
                    type="text"
                    value={formData.proyektor.merekLensa}
                    onChange={(e) => handleProyektorChange('merekLensa', e.target.value)}
                    placeholder="Contoh: Konica Minolta / Barco"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Nomor Seri Machine (SN Machine)</label>
                  <input
                    type="text"
                    value={formData.proyektor.snMachine}
                    onChange={(e) => handleProyektorChange('snMachine', e.target.value)}
                    placeholder="Contoh: SN-BC-20188492"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Lampu atau Laser</label>
                  <input
                    type="text"
                    value={formData.proyektor.tipeLampuLaser}
                    onChange={(e) => handleProyektorChange('tipeLampuLaser', e.target.value)}
                    placeholder="Contoh: Xenon Lamp / RGB Laser Phosphor"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Merek Lampu</label>
                  <input
                    type="text"
                    value={formData.proyektor.merekLampu}
                    onChange={(e) => handleProyektorChange('merekLampu', e.target.value)}
                    placeholder="Contoh: Ushio / Osram Cinema Xenon"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Lampu (Daya)</label>
                  <input
                    type="text"
                    value={formData.proyektor.tipeLampu}
                    onChange={(e) => handleProyektorChange('tipeLampu', e.target.value)}
                    placeholder="Contoh: UXL-30SC (3000 Watt)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Keterangan Tambahan Proyektor</label>
                <textarea
                  rows={2}
                  value={formData.proyektor.keteranganTambahan}
                  onChange={(e) => handleProyektorChange('keteranganTambahan', e.target.value)}
                  placeholder="Jam pemakaian lampu terakhir, tanggal penggantian, atau catatan optical alignment..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: SERVER & SISTEM */}
          {activeTab === 'server' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Merek Server</label>
                  <input
                    type="text"
                    value={formData.serverDanSistem.merekServer}
                    onChange={(e) => handleServerChange('merekServer', e.target.value)}
                    placeholder="Contoh: Doremi / GDC / Dolby"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Server</label>
                  <input
                    type="text"
                    value={formData.serverDanSistem.tipeServer}
                    onChange={(e) => handleServerChange('tipeServer', e.target.value)}
                    placeholder="Contoh: Doremi DCP-2K4 / ShowVault"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Nomor Seri Server (SN Server)</label>
                  <input
                    type="text"
                    value={formData.serverDanSistem.snServer}
                    onChange={(e) => handleServerChange('snServer', e.target.value)}
                    placeholder="Contoh: SN-SRV-2018894"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Jenis IMS</label>
                  <input
                    type="text"
                    value={formData.serverDanSistem.jenisIms}
                    onChange={(e) => handleServerChange('jenisIms', e.target.value)}
                    placeholder="Contoh: Integrated Media Block (IMB) / IMS3000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Model IMS</label>
                  <input
                    type="text"
                    value={formData.serverDanSistem.modelIms}
                    onChange={(e) => handleServerChange('modelIms', e.target.value)}
                    placeholder="Contoh: Dolby IMS3000 Gen 3"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Kapasitas Penyimpanan</label>
                  <input
                    type="text"
                    value={formData.serverDanSistem.kapasitasPenyimpanan}
                    onChange={(e) => handleServerChange('kapasitasPenyimpanan', e.target.value)}
                    placeholder="Contoh: 3 x 2TB RAID 5 (4TB Usable)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Keterangan Tambahan Server &amp; IMS</label>
                <textarea
                  rows={2}
                  value={formData.serverDanSistem.keteranganTambahan}
                  onChange={(e) => handleServerChange('keteranganTambahan', e.target.value)}
                  placeholder="Versi firmware, tanggal sertifikat KDM, atau riwayat hard drive replacement..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: PERANGKAT RUANG PROYEKTOR */}
          {activeTab === 'perangkat' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Panel Dimmer</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.panelDimmer}
                    onChange={(e) => handlePerangkatChange('panelDimmer', e.target.value)}
                    placeholder="Contoh: Helvar / LSC Dimmer 12 Channel"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Panel Dimmer</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.tipePanelDimmer}
                    onChange={(e) => handlePerangkatChange('tipePanelDimmer', e.target.value)}
                    placeholder="Contoh: Digital DMX Lighting Controller"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">PC Komunikator</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.pcKomunikator}
                    onChange={(e) => handlePerangkatChange('pcKomunikator', e.target.value)}
                    placeholder="Contoh: Barco Communicator Touch Panel PC"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe PC Komunikator</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.tipePcKomunikator}
                    onChange={(e) => handlePerangkatChange('tipePcKomunikator', e.target.value)}
                    placeholder="Contoh: All-in-One Touchscreen Windows 10"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">UPS</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.ups}
                    onChange={(e) => handlePerangkatChange('ups', e.target.value)}
                    placeholder="Contoh: APC Smart-UPS Online"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Merek dan Tipe UPS</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.merekTipeUps}
                    onChange={(e) => handlePerangkatChange('merekTipeUps', e.target.value)}
                    placeholder="Contoh: APC SRT3000XLI (3000VA / 2700W)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Power Supply</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.powerSupply}
                    onChange={(e) => handlePerangkatChange('powerSupply', e.target.value)}
                    placeholder="Contoh: MeanWell 24V / Barco SMPS Unit"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Power Supply</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.tipePowerSupply}
                    onChange={(e) => handlePerangkatChange('tipePowerSupply', e.target.value)}
                    placeholder="Contoh: Redundant Dual PSU"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Lampu LED</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.lampuLed}
                    onChange={(e) => handlePerangkatChange('lampuLed', e.target.value)}
                    placeholder="Contoh: LED Downlight Warm White 12W"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Tipe Lampu LED</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.tipeLampuLed}
                    onChange={(e) => handlePerangkatChange('tipeLampuLed', e.target.value)}
                    placeholder="Contoh: Dimmable Triac Driver"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Sound Ruang Proyektor</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.soundRuangProyektor}
                    onChange={(e) => handlePerangkatChange('soundRuangProyektor', e.target.value)}
                    placeholder="Contoh: Active Booth Monitor Speaker 5-inch"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Lampu LED Tangga</label>
                  <input
                    type="text"
                    value={formData.perangkatRuangProyektor.lampuLedTangga}
                    onChange={(e) => handlePerangkatChange('lampuLedTangga', e.target.value)}
                    placeholder="Contoh: Step Light Blue LED Strip 12V"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Keterangan Tambahan Perangkat</label>
                <textarea
                  rows={2}
                  value={formData.perangkatRuangProyektor.keteranganTambahan}
                  onChange={(e) => handlePerangkatChange('keteranganTambahan', e.target.value)}
                  placeholder="Kondisi AC booth, suhu ruangan, exhaust fan, atau kabel routing..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Perangkat Tambahan Dinamis */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    Perangkat Tambahan Khusus (Opsional)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPerangkatTambahan}
                    className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold flex items-center gap-1 hover:bg-cyan-900 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Perangkat</span>
                  </button>
                </div>

                {formData.perangkatTambahan && formData.perangkatTambahan.length > 0 ? (
                  <div className="space-y-2">
                    {formData.perangkatTambahan.map((pt, idx) => (
                      <div key={pt.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <input
                          type="text"
                          value={pt.namaPerangkat}
                          onChange={(e) => handleUpdatePerangkatTambahan(pt.id, 'namaPerangkat', e.target.value)}
                          placeholder="Nama Perangkat..."
                          className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={pt.tipeModel}
                          onChange={(e) => handleUpdatePerangkatTambahan(pt.id, 'tipeModel', e.target.value)}
                          placeholder="Tipe / Model..."
                          className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={pt.keterangan}
                          onChange={(e) => handleUpdatePerangkatTambahan(pt.id, 'keterangan', e.target.value)}
                          placeholder="Keterangan..."
                          className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePerangkatTambahan(pt.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer shrink-0"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-mono text-slate-500 italic">
                    Belum ada perangkat tambahan khusus. Klik tombol di atas untuk menambahkan.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CATATAN TAMBAHAN */}
          {activeTab === 'catatan' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">
                  Catatan Teknis Ruang Proyektor
                </label>
                <textarea
                  rows={6}
                  value={formData.catatanTambahan}
                  onChange={(e) => setFormData((prev) => prev ? { ...prev, catatanTambahan: e.target.value } : prev)}
                  placeholder="Catatan perawatan, riwayat maintenance berkala, nomor kontak vendor proyektor, atau konfigurasi IP network booth..."
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
