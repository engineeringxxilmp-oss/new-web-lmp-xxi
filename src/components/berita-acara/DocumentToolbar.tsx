/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  ImagePlus,
  Table,
  ClipboardCheck,
  Sparkles,
  FileSignature,
  Type,
  Minus,
  Plus
} from 'lucide-react';

interface DocumentToolbarProps {
  onExecCommand: (command: string, value?: string) => void;
  onSetFontSize?: (sizePx: string) => void;
  onStepFontSize?: (delta: number) => void;
  onAddImageClick: () => void;
  onInsertTableClick: () => void;
  onOpenPasteModal?: () => void;
  onCleanFormatting?: () => void;
  onOpenSignatureModal?: () => void;
}

export default function DocumentToolbar({
  onExecCommand,
  onSetFontSize,
  onStepFontSize,
  onAddImageClick,
  onInsertTableClick,
  onOpenPasteModal,
  onCleanFormatting,
  onOpenSignatureModal
}: DocumentToolbarProps) {
  const [selectedFontSize, setSelectedFontSize] = useState<string>('13px');

  const FONT_SIZE_OPTIONS = [
    { label: '9px (Sangat Kecil)', val: '9px' },
    { label: '10px (Kecil)', val: '10px' },
    { label: '11px (Kecil A4)', val: '11px' },
    { label: '12px (Sedang)', val: '12px' },
    { label: '13px (Standar XXI)', val: '13px' },
    { label: '14px (Sedang-Besar)', val: '14px' },
    { label: '15px (Sedang-Besar)', val: '15px' },
    { label: '16px (Subjudul)', val: '16px' },
    { label: '17px (Auto Paste XXI)', val: '17px' },
    { label: '18px (Besar)', val: '18px' },
    { label: '20px (Judul)', val: '20px' },
    { label: '24px (Judul Utama)', val: '24px' },
    { label: '28px (Sangat Besar)', val: '28px' },
    { label: '32px (Ekstra Besar)', val: '32px' }
  ];

  const handleSelectFontSizeChange = (val: string) => {
    setSelectedFontSize(val);
    if (onSetFontSize) {
      onSetFontSize(val);
    }
  };
  return (
    <div
      className="sticky top-0 z-30 bg-[#0d1322]/95 backdrop-blur-md border border-cyan-500/30 rounded-xl p-2 md:p-3 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-wrap items-center justify-between gap-2 transition-all"
      id="document-editor-toolbar"
    >
      {/* Text Formatting Group */}
      <div className="flex flex-wrap items-center gap-1">
        
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => onExecCommand('undo')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
            type="button"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExecCommand('redo')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
            type="button"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 my-auto mx-1" />

        {/* Font Style: Bold, Italic, Underline */}
        <div className="flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => onExecCommand('bold')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer font-bold"
            title="Cetak Tebal (Bold Ctrl+B)"
            type="button"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExecCommand('italic')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer italic"
            title="Cetak Miring (Italic Ctrl+I)"
            type="button"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExecCommand('underline')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer underline"
            title="Garis Bawah (Underline Ctrl+U)"
            type="button"
          >
            <Underline className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 my-auto mx-1" />

        {/* Font Size Group: Perkecil (A-), Selector, Perbesar (A+) */}
        <div className="flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800 gap-0.5" id="toolbar-font-size-group">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onStepFontSize && onStepFontSize(-1)}
            className="px-1.5 py-1 rounded-md hover:bg-cyan-950 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer font-mono font-bold text-xs flex items-center gap-0.5"
            title="Perkecil Ukuran Teks Pilihan (-1px)"
            type="button"
          >
            <Type className="w-3 h-3 text-cyan-400" />
            <span>-</span>
          </button>

          <select
            onMouseDown={(e) => e.stopPropagation()}
            value={selectedFontSize}
            onChange={(e) => handleSelectFontSizeChange(e.target.value)}
            className="bg-[#0b1329] border border-slate-700 focus:border-cyan-400 text-cyan-300 rounded px-1 py-0.5 text-xs font-mono cursor-pointer focus:outline-hidden"
            title="Pilih Ukuran Teks Pilihan (Font Size)"
          >
            {FONT_SIZE_OPTIONS.map((opt) => (
              <option key={opt.val} value={opt.val} className="bg-[#0b1329] text-white">
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onStepFontSize && onStepFontSize(1)}
            className="px-1.5 py-1 rounded-md hover:bg-cyan-950 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer font-mono font-bold text-xs flex items-center gap-0.5"
            title="Perbesar Ukuran Teks Pilihan (+1px)"
            type="button"
          >
            <Type className="w-3.5 h-3.5 text-cyan-400" />
            <span>+</span>
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 my-auto mx-1" />

        {/* Alignment: Left, Center, Right */}
        <div className="flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => onExecCommand('justifyLeft')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Rata Kiri"
            type="button"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExecCommand('justifyCenter')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Rata Tengah"
            type="button"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExecCommand('justifyRight')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Rata Kanan"
            type="button"
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 my-auto mx-1" />

        {/* Lists: Unordered, Ordered */}
        <div className="flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => onExecCommand('insertUnorderedList')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Bullet List"
            type="button"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onExecCommand('insertOrderedList')}
            className="p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Number List"
            type="button"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 my-auto mx-1" />

        {/* Insert Table */}
        <button
          onClick={onInsertTableClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#070c1a] hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-800 rounded-lg text-xs font-mono transition-colors cursor-pointer"
          title="Sisipkan Tabel Barang"
          type="button"
        >
          <Table className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Tabel</span>
        </button>

        {/* Atur Tanda Tangan (Signature Manager) */}
        {onOpenSignatureModal && (
          <button
            onClick={onOpenSignatureModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#070c1a] hover:bg-cyan-950 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-mono transition-colors cursor-pointer"
            title="Atur orang & posisi tanda tangan (Tambah/Hapus/Ubah TTD)"
            type="button"
          >
            <FileSignature className="w-4 h-4 text-cyan-400" />
            <span>Atur TTD</span>
          </button>
        )}

        {/* Tempel & Rapikan Modal Launcher */}
        {onOpenPasteModal && (
          <button
            onClick={onOpenPasteModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer"
            title="Tempel teks / tabel Excel dari Clipboard dengan pembersihan otomatis"
            type="button"
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
            <span>Tempel & Rapikan</span>
          </button>
        )}

        {/* Rapikan Format (Clean Formatting) */}
        {onCleanFormatting && (
          <button
            onClick={onCleanFormatting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer"
            title="Bersihkan background hitam & format dokumen secara menyeluruh"
            type="button"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Bersihkan Format</span>
          </button>
        )}
      </div>

      {/* Action Button: + Tambah Gambar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAddImageClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-lg border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all cursor-pointer active:scale-95"
          type="button"
          id="btn-tambah-gambar"
        >
          <ImagePlus className="w-4 h-4" />
          <span>+ Tambah Gambar</span>
        </button>
      </div>
    </div>
  );
}
