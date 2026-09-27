/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal untuk Mengatur Penandatangan (TTD) Berita Acara
 * Mendukung layout dinamis 3, 4, dan 5 orang secara fleksibel.
 * Seluruh kolom diatur presisi dengan lebar sama, jarak sama, dan center alignment.
 */

import React, { useState, useEffect } from 'react';
import { FileSignature, X, Plus, Trash2, CheckCircle2, UserPlus, ArrowUp, ArrowDown, Users } from 'lucide-react';
import {
  SigneeItem,
  PRESET_3_SIGNEES,
  PRESET_4_SIGNEES,
  PRESET_5_SIGNEES,
  generateSignaturesHtml,
  parseSignaturesFromHtml
} from './signatureUtils';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocumentHtml: string;
  onApplySignatures: (newSignaturesHtml: string) => void;
}

export default function SignatureModal({
  isOpen,
  onClose,
  currentDocumentHtml,
  onApplySignatures
}: SignatureModalProps) {
  const [signees, setSignees] = useState<SigneeItem[]>(PRESET_3_SIGNEES);

  // Parse current signature table or dynamic container from HTML if available
  useEffect(() => {
    if (!isOpen) return;

    if (currentDocumentHtml) {
      const parsed = parseSignaturesFromHtml(currentDocumentHtml);
      if (parsed && parsed.length > 0) {
        setSignees(parsed);
        return;
      }
    }

    // Default fallback: 3 orang standar XXI
    setSignees(PRESET_3_SIGNEES);
  }, [isOpen, currentDocumentHtml]);

  if (!isOpen) return null;

  const handleAddSignee = () => {
    const newId = `sig-${Date.now()}`;
    setSignees([
      ...signees,
      {
        id: newId,
        header: 'Mengetahui,',
        name: '',
        role: 'Jabatan Baru'
      }
    ]);
  };

  const handleRemoveSignee = (id: string) => {
    if (signees.length <= 1) {
      alert('Minimal harus ada 1 penandatangan.');
      return;
    }
    setSignees(signees.filter((item) => item.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= signees.length) return;

    const newArr = [...signees];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setSignees(newArr);
  };

  const handleChange = (id: string, field: keyof SigneeItem, value: string) => {
    setSignees(
      signees.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSetPreset = (presetCount: 3 | 4 | 5) => {
    if (presetCount === 3) {
      setSignees(PRESET_3_SIGNEES);
    } else if (presetCount === 4) {
      setSignees(PRESET_4_SIGNEES);
    } else if (presetCount === 5) {
      setSignees(PRESET_5_SIGNEES);
    }
  };

  const handleApply = () => {
    if (signees.length === 0) return;
    const html = generateSignaturesHtml(signees);
    onApplySignatures(html);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl w-full max-w-2xl shadow-[0_0_60px_rgba(251,191,36,0.25)] text-white overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-950 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl border border-amber-500/40 text-amber-400">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2">
                Atur Penandatangan Berita Acara
                <span className="text-[10px] bg-slate-900 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30">
                  {signees.length} Orang
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Pilih format 3, 4, atau 5 TTD. Kolom otomatis simetris, sama lebar, dan berada tepat di tengah halaman.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 font-mono text-xs">
          
          {/* Quick Preset Selector for 3, 4, and 5 TTD */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-slate-300">
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Preset Cepat:</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSetPreset(3)}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                  signees.length === 3
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                3 TTD (Standar)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(4)}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                  signees.length === 4
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                4 TTD
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset(5)}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                  signees.length === 5
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                5 TTD
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-300 font-bold text-xs uppercase tracking-wider">
              Daftar Kolom Tanda Tangan ({signees.length} Kolom):
            </span>

            <button
              onClick={handleAddSignee}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              type="button"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Penandatangan</span>
            </button>
          </div>

          {/* Signees List */}
          <div className="space-y-3">
            {signees.map((item, index) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 hover:border-amber-400/50 p-3.5 rounded-xl flex flex-col md:flex-row items-stretch md:items-center gap-3 transition-colors"
              >
                {/* Index / Reorder Buttons */}
                <div className="flex md:flex-col items-center justify-between md:justify-center gap-1 bg-slate-900 p-1.5 rounded-lg border border-slate-800 shrink-0">
                  <span className="font-mono text-amber-400 font-bold text-xs px-1">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 disabled:opacity-30 cursor-pointer"
                      title="Geser Kiri / Ke Atas"
                      type="button"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === signees.length - 1}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 disabled:opacity-30 cursor-pointer"
                      title="Geser Kanan / Ke Bawah"
                      type="button"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 flex-1">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">
                      Label Atas
                    </label>
                    <input
                      type="text"
                      value={item.header}
                      onChange={(e) => handleChange(item.id, 'header', e.target.value)}
                      placeholder="Mengetahui,"
                      className="w-full bg-slate-900 border border-slate-700/80 focus:border-amber-400 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">
                      Jabatan / Posisi
                    </label>
                    <input
                      type="text"
                      value={item.role}
                      onChange={(e) => handleChange(item.id, 'role', e.target.value)}
                      placeholder="e.g. Chief Engineering"
                      className="w-full bg-slate-900 border border-slate-700/80 focus:border-amber-400 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">
                      Nama (Opsional)
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                      placeholder="Kosongkan untuk titik-titik (....)"
                      className="w-full bg-slate-900 border border-slate-700/80 focus:border-amber-400 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                    />
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveSignee(item.id)}
                  disabled={signees.length <= 1}
                  className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded-lg transition-colors cursor-pointer disabled:opacity-30 shrink-0 self-end md:self-center"
                  title="Hapus Penandatangan Ini"
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={handleAddSignee}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-700 active:scale-95"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah TTD</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer border border-slate-700 active:scale-95"
              type="button"
            >
              Batal
            </button>

            <button
              onClick={handleApply}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black font-mono text-xs rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              type="button"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan Tanda Tangan ({signees.length} Kolom)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
