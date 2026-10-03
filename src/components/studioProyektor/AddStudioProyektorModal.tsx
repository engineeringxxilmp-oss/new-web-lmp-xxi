/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Film, Projector } from 'lucide-react';
import { StudioData, ProyektorData } from '../../types/studioProyektor';
import { createBlankStudio, createBlankProyektor } from '../../services/studioProyektorDb';

interface AddStudioProyektorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'studio' | 'proyektor';
  existingStudiosCount: number;
  existingProyektorsCount: number;
  onAddStudio: (item: StudioData) => void;
  onAddProyektor: (item: ProyektorData) => void;
}

export default function AddStudioProyektorModal({
  isOpen,
  onClose,
  defaultCategory = 'studio',
  existingStudiosCount,
  existingProyektorsCount,
  onAddStudio,
  onAddProyektor
}: AddStudioProyektorModalProps) {
  const [category, setCategory] = useState<'studio' | 'proyektor'>(defaultCategory);
  const [name, setName] = useState('');
  const [studioType, setStudioType] = useState<'Regular' | 'Premiere'>('Regular');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim();
    if (!finalName) return;

    if (category === 'studio') {
      const newStudio = createBlankStudio(finalName, existingStudiosCount);
      newStudio.studioType = studioType;
      onAddStudio(newStudio);
    } else {
      const newProyektor = createBlankProyektor(finalName, existingProyektorsCount);
      onAddProyektor(newProyektor);
    }

    setName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0b1222] border-2 border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              <Plus className="w-4 h-4" />
            </span>
            <h3 className="text-base font-black text-white font-sans">Tambah Ruangan Baru</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-mono text-cyan-300 mb-1.5 font-bold">Pilih Kategori Ruangan</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCategory('studio');
                  setName(`Studio ${existingStudiosCount + 1}`);
                }}
                className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  category === 'studio'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Area Studio</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('proyektor');
                  setName(`Proyektor Studio ${existingProyektorsCount + 1}`);
                }}
                className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  category === 'proyektor'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Projector className="w-3.5 h-3.5" />
                <span>Area Proyektor</span>
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">
              Nama {category === 'studio' ? 'Studio' : 'Ruang Proyektor'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={category === 'studio' ? 'Contoh: Studio 9 / IMAX' : 'Contoh: Proyektor Studio 9'}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Studio Type Selector (if studio) */}
          {category === 'studio' && (
            <div>
              <label className="block text-xs font-mono text-cyan-300 mb-1 font-bold">Kelas Studio</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStudioType('Regular')}
                  className={`py-1.5 px-3 rounded-xl font-mono text-xs transition cursor-pointer ${
                    studioType === 'Regular'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Cinema XXI Deluxe
                </button>
                <button
                  type="button"
                  onClick={() => setStudioType('Premiere')}
                  className={`py-1.5 px-3 rounded-xl font-mono text-xs transition cursor-pointer ${
                    studioType === 'Premiere'
                      ? 'bg-amber-950 text-amber-300 border border-amber-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  The Premiere XXI
                </button>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambahkan Data</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
