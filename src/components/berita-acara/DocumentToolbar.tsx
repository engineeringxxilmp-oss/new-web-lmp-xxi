/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Minus,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  Calendar,
  Check,
  X
} from 'lucide-react';

export interface DocumentToolbarProps {
  onExecCommand: (command: string, value?: string) => void;
  onSetFontSize?: (sizePx: string) => void;
  onStepFontSize?: (delta: number) => void;
  onAddImageClick: () => void;
  onInsertTableClick: () => void;
  onOpenPasteModal?: () => void;
  onCleanFormatting?: () => void;
  onOpenSignatureModal?: () => void;
  onApplySignaturePreset?: (presetType: 'standard_3' | 'simple_2' | 'full_4') => void;
  onApplyDateAtasTtd?: () => void;
  variant?: 'desktop' | 'mobile' | 'auto';
  className?: string;
}

export default function DocumentToolbar({
  onExecCommand,
  onSetFontSize,
  onStepFontSize,
  onAddImageClick,
  onInsertTableClick,
  onOpenPasteModal,
  onCleanFormatting,
  onOpenSignatureModal,
  onApplySignaturePreset,
  onApplyDateAtasTtd,
  variant = 'auto',
  className = ''
}: DocumentToolbarProps) {
  const [selectedFontSize, setSelectedFontSize] = useState<string>('16px');
  const [isCustomSizeOpen, setIsCustomSizeOpen] = useState<boolean>(false);
  const [customSizeInput, setCustomSizeInput] = useState<string>('16');
  const [isTtdMenuOpen, setIsTtdMenuOpen] = useState<boolean>(false);
  const ttdMenuRef = useRef<HTMLDivElement>(null);
  const ttdTriggerRef = useRef<HTMLDivElement>(null);
  const customSizeRef = useRef<HTMLDivElement>(null);
  const customSizeTriggerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);
  const [ttdMenuCoords, setTtdMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [customSizeCoords, setCustomSizeCoords] = useState<{ top: number; left: number } | null>(null);

  const FONT_SIZE_OPTIONS = [
    { label: '12', val: '12px' },
    { label: '14', val: '14px' },
    { label: '16 (Normal)', val: '16px' },
    { label: '18', val: '18px' },
    { label: '20 (Judul)', val: '20px' },
    { label: '24 (Besar)', val: '24px' },
    { label: '28', val: '28px' },
    { label: '32', val: '32px' },
    { label: 'Custom...', val: 'custom' }
  ];

  const checkScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && scrollContainerRef.current) {
      if (scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        ttdMenuRef.current &&
        !ttdMenuRef.current.contains(e.target as Node) &&
        ttdTriggerRef.current &&
        !ttdTriggerRef.current.contains(e.target as Node)
      ) {
        setIsTtdMenuOpen(false);
      }
      if (
        customSizeRef.current &&
        !customSizeRef.current.contains(e.target as Node) &&
        customSizeTriggerRef.current &&
        !customSizeTriggerRef.current.contains(e.target as Node)
      ) {
        setIsCustomSizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update floating positions on scroll or resize
  useEffect(() => {
    const updatePositions = () => {
      if (isTtdMenuOpen && ttdTriggerRef.current) {
        const rect = ttdTriggerRef.current.getBoundingClientRect();
        const left = Math.max(8, Math.min(window.innerWidth - 270, rect.left));
        setTtdMenuCoords({ top: rect.bottom + 6, left });
      }
      if (isCustomSizeOpen && customSizeTriggerRef.current) {
        const rect = customSizeTriggerRef.current.getBoundingClientRect();
        const left = Math.max(8, Math.min(window.innerWidth - 210, rect.left));
        setCustomSizeCoords({ top: rect.bottom + 6, left });
      }
    };
    window.addEventListener('scroll', updatePositions, true);
    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('scroll', updatePositions, true);
      window.removeEventListener('resize', updatePositions);
    };
  }, [isTtdMenuOpen, isCustomSizeOpen]);

  const handleSelectFontSize = (val: string) => {
    if (val === 'custom') {
      if (customSizeTriggerRef.current) {
        const rect = customSizeTriggerRef.current.getBoundingClientRect();
        const left = Math.max(8, Math.min(window.innerWidth - 210, rect.left));
        setCustomSizeCoords({ top: rect.bottom + 6, left });
      }
      setIsCustomSizeOpen(true);
      return;
    }
    setSelectedFontSize(val);
    if (onSetFontSize) {
      onSetFontSize(val);
    }
  };

  const handleApplyCustomSize = () => {
    const parsed = parseInt(customSizeInput.trim(), 10);
    if (!isNaN(parsed) && parsed >= 8 && parsed <= 72) {
      const pxVal = `${parsed}px`;
      setSelectedFontSize(pxVal);
      if (onSetFontSize) {
        onSetFontSize(pxVal);
      }
    }
    setIsCustomSizeOpen(false);
  };

  const toggleTtdMenu = () => {
    if (!isTtdMenuOpen && ttdTriggerRef.current) {
      const rect = ttdTriggerRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - 270, rect.left));
      setTtdMenuCoords({ top: rect.bottom + 6, left });
    }
    setIsTtdMenuOpen((prev) => !prev);
  };

  const isMobileExplicit = variant === 'mobile';

  return (
    <div
      className={`relative w-full md:w-fit md:max-w-full bg-[#0a0f1d]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-1 md:p-1.5 text-white shadow-[0_4px_25px_rgba(0,0,0,0.7)] transition-all ${className}`}
      id={isMobileExplicit ? 'document-editor-mobile-toolbar' : 'document-editor-toolbar'}
    >
      <div className="flex items-center gap-1 w-full max-w-full">
        {/* Tombol Geser Toolbar ke Kiri (Desktop) */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleScrollLeft}
          disabled={!canScrollLeft}
          className={`hidden md:flex items-center justify-center h-7 w-6 rounded-md bg-[#070c1a] border shrink-0 cursor-pointer transition-colors shadow-sm active:scale-95 ${
            canScrollLeft
              ? 'text-cyan-300 border-cyan-500/40 hover:bg-cyan-950 hover:border-cyan-300'
              : 'text-slate-600 border-slate-800 opacity-40 cursor-not-allowed'
          }`}
          title="Geser Toolbar ke Kiri (←)"
          aria-label="Geser Toolbar ke Kiri"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* 
          Jalur Toolbar Satu Baris Horizontal:
          - overflow-x: auto, overflow-y: hidden, whitespace-nowrap
          - Tombol tidak boleh shrink (shrink-0)
          - Tidak wrap ke baris kedua
          - Dilengkapi scrollbar halus rapi dan tombol geser desktop
        */}
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth py-0.5 px-0.5 max-w-full custom-toolbar-scrollbar touch-pan-x flex-1 min-w-0"
          id="toolbar-scroll-container"
        >
        
        {/* ========================================================================= */}
        {/* GROUP A: TEXT FORMATTING TOOLS                                            */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap" id="toolbar-group-formatting">
          {/* 1. UNDO / REDO */}
          <div className="flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800 shrink-0">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('undo')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Undo (Ctrl+Z)"
              type="button"
            >
              <Undo className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('redo')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Redo (Ctrl+Y)"
              type="button"
            >
              <Redo className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>

          <div className="h-4 sm:h-5 w-[1px] bg-slate-800 shrink-0 mx-0.5" />

          {/* 2. BOLD / ITALIC / UNDERLINE */}
          <div className="flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800 shrink-0">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('bold')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer font-bold h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Tebal (Bold Ctrl+B)"
              type="button"
            >
              <Bold className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('italic')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer italic h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Miring (Italic Ctrl+I)"
              type="button"
            >
              <Italic className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('underline')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer underline h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Garis Bawah (Underline Ctrl+U)"
              type="button"
            >
              <Underline className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>

          <div className="h-4 sm:h-5 w-[1px] bg-slate-800 shrink-0 mx-0.5" />

          {/* 3. UKURAN TEKS (Langsung setelah B / I / U) */}
          <div 
            ref={customSizeTriggerRef} 
            className="relative flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800 gap-0.5 shrink-0" 
            id="toolbar-font-size-group"
          >
            {/* Quick Step Down A- */}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onStepFontSize && onStepFontSize(-1)}
              className="p-1.5 md:px-1.5 md:py-1 rounded-md hover:bg-cyan-950 text-cyan-300 hover:text-cyan-200 active:bg-cyan-900 transition-colors cursor-pointer font-mono font-bold text-xs flex items-center justify-center h-7 md:h-7.5"
              title="Perkecil Ukuran Teks (-1px)"
              type="button"
            >
              <Minus className="w-3 h-3 text-cyan-400" />
            </button>

            {/* Select Dropdown */}
            <select
              onMouseDown={(e) => e.stopPropagation()}
              value={selectedFontSize}
              onChange={(e) => handleSelectFontSize(e.target.value)}
              className="bg-[#0b1329] border border-slate-700 focus:border-cyan-400 text-cyan-300 rounded px-1.5 py-0.5 text-xs font-mono cursor-pointer focus:outline-hidden h-7 md:h-7.5 min-w-[68px] max-w-[95px] truncate"
              title="Pilih Ukuran Teks (12, 14, 16, 18, 20, 24, 28, 32, Custom)"
            >
              {FONT_SIZE_OPTIONS.map((opt) => (
                <option key={opt.val} value={opt.val} className="bg-[#0b1329] text-white">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Quick Step Up A+ */}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onStepFontSize && onStepFontSize(1)}
              className="p-1.5 md:px-1.5 md:py-1 rounded-md hover:bg-cyan-950 text-cyan-300 hover:text-cyan-200 active:bg-cyan-900 transition-colors cursor-pointer font-mono font-bold text-xs flex items-center justify-center h-7 md:h-7.5"
              title="Perbesar Ukuran Teks (+1px)"
              type="button"
            >
              <Plus className="w-3 h-3 text-cyan-400" />
            </button>
          </div>

          <div className="h-4 sm:h-5 w-[1px] bg-slate-800 shrink-0 mx-0.5" />

          {/* 4. ALIGN: LEFT, CENTER, RIGHT */}
          <div className="flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800 shrink-0">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('justifyLeft')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Rata Kiri"
              type="button"
            >
              <AlignLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('justifyCenter')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Rata Tengah (Center)"
              type="button"
            >
              <AlignCenter className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('justifyRight')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Rata Kanan"
              type="button"
            >
              <AlignRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>

          <div className="h-4 sm:h-5 w-[1px] bg-slate-800 shrink-0 mx-0.5" />

          {/* 5. LIST: BULLET & NUMBERING */}
          <div className="flex items-center bg-[#070c1a] rounded-lg p-0.5 border border-slate-800 shrink-0">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('insertUnorderedList')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Bullet List"
              type="button"
            >
              <List className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onExecCommand('insertOrderedList')}
              className="p-1.5 md:p-1.5 rounded-md hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 transition-colors cursor-pointer h-7 md:h-7.5 w-7 md:w-7.5 flex items-center justify-center"
              title="Nomor (Numbered List)"
              type="button"
            >
              <ListOrdered className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        {/* Separator between Group A & Group B */}
        <div className="h-4 sm:h-5 w-[1px] bg-slate-700 shrink-0 mx-0.5" />

        {/* ========================================================================= */}
        {/* GROUP B: INSERTION & ACTIONS (TTD, TABEL, TEMPEL, RAPIKAN, GAMBAR)       */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap" id="toolbar-group-actions">
          {/* 6. FITUR TTD (TOMBOL LANGSUNG & DROPDOWN/POPOVER TTD) */}
          <div ref={ttdTriggerRef} className="relative inline-flex items-center shrink-0">
            {/* Main TTD Button */}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={onOpenSignatureModal}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 active:bg-cyan-800 border border-cyan-500/40 rounded-l-lg text-xs font-mono font-bold transition-colors cursor-pointer h-7 md:h-7.5"
              title="Buka panel TTD (Atur orang & kolom tanda tangan)"
              type="button"
            >
              <FileSignature className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400" />
              <span>TTD</span>
            </button>

            {/* Dropdown Chevron Trigger */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={toggleTtdMenu}
              className="px-1.5 py-1 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 active:bg-cyan-800 border-y border-r border-cyan-500/40 rounded-r-lg text-xs transition-colors cursor-pointer h-7 md:h-7.5 flex items-center justify-center"
              title="Pilihan Format & Preset TTD Cepat"
              type="button"
            >
              <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform duration-150 ${isTtdMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="h-4 sm:h-5 w-[1px] bg-slate-800 shrink-0 mx-0.5" />

          {/* 7. SISIPKAN TABEL */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onInsertTableClick}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#070c1a] hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 active:bg-cyan-900 border border-slate-800 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 h-7 md:h-7.5"
            title="Sisipkan Tabel Barang"
            type="button"
          >
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tabel</span>
          </button>

          <div className="h-4 sm:h-5 w-[1px] bg-slate-800 shrink-0 mx-0.5" />

          {/* 8. TEMPEL DOKUMEN */}
          {onOpenPasteModal && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={onOpenPasteModal}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 active:bg-emerald-800 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer shrink-0 h-7 md:h-7.5"
              title="Tempel teks / tabel Excel dari Clipboard"
              type="button"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tempel</span>
            </button>
          )}

          <div className="h-4 sm:h-5 w-[1px] bg-slate-800 shrink-0 mx-0.5" />

          {/* 9. RAPIKAN FORMAT */}
          {onCleanFormatting && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={onCleanFormatting}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 active:bg-amber-800 border border-amber-500/40 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer shrink-0 h-7 md:h-7.5"
              title="Bersihkan background hitam & styling asing"
              type="button"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Rapikan</span>
            </button>
          )}

          <div className="h-4 sm:h-5 w-[1px] bg-slate-800 shrink-0 mx-0.5" />

          {/* 10. TAMBAH GAMBAR */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onAddImageClick}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 active:to-blue-700 text-white font-mono text-xs font-bold rounded-lg border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all cursor-pointer shrink-0 h-7 md:h-7.5"
            title="Tambah Foto / Lampiran Fisik"
            type="button"
          >
            <ImagePlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>+ Gambar</span>
          </button>
        </div>
      </div>

        {/* Tombol Geser Toolbar ke Kanan (Desktop) */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleScrollRight}
          disabled={!canScrollRight}
          className={`hidden md:flex items-center justify-center h-7 w-6 rounded-md bg-[#070c1a] border shrink-0 cursor-pointer transition-colors shadow-sm active:scale-95 ${
            canScrollRight
              ? 'text-cyan-300 border-cyan-500/40 hover:bg-cyan-950 hover:border-cyan-300'
              : 'text-slate-600 border-slate-800 opacity-40 cursor-not-allowed'
          }`}
          title="Geser Toolbar ke Kanan (→)"
          aria-label="Geser Toolbar ke Kanan"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Popovers (Custom Size & TTD) positioned outside scroll container */}
      {isCustomSizeOpen && customSizeCoords && (
        <div
          ref={customSizeRef}
          style={{ top: `${customSizeCoords.top}px`, left: `${customSizeCoords.left}px` }}
          className="fixed z-[9999] bg-[#0d1424] border border-cyan-500/50 rounded-xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] w-48 space-y-2 text-white"
        >
          <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
            <span>Ukuran Custom (px):</span>
            <button
              onClick={() => setIsCustomSizeOpen(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="8"
              max="72"
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyCustomSize();
              }}
              className="w-full bg-[#070b16] border border-slate-700 focus:border-cyan-400 text-white rounded px-2 py-1 text-xs font-mono focus:outline-hidden"
              placeholder="Contoh: 15"
              autoFocus
            />
            <button
              onClick={handleApplyCustomSize}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold font-mono transition-colors cursor-pointer"
              type="button"
            >
              Set
            </button>
          </div>
          <div className="text-[10px] text-slate-400">
            Pilih ukuran antara 8px s/d 72px
          </div>
        </div>
      )}

      {isTtdMenuOpen && ttdMenuCoords && (
        <div
          ref={ttdMenuRef}
          style={{ top: `${ttdMenuCoords.top}px`, left: `${ttdMenuCoords.left}px` }}
          className="fixed z-[9999] w-64 bg-[#0c1427] border border-cyan-500/50 rounded-xl p-2 shadow-[0_10px_35px_rgba(0,0,0,0.8)] space-y-1 text-white"
        >
          <div className="px-2 py-1 text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
            <span>Pilihan Tanda Tangan:</span>
            <span className="text-[9px] bg-cyan-950 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/30">1-Click</span>
          </div>

          {/* 1. Modal Lengkap */}
          <button
            onClick={() => {
              setIsTtdMenuOpen(false);
              onOpenSignatureModal?.();
            }}
            className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-cyan-950/80 hover:text-cyan-300 transition-colors text-xs cursor-pointer group"
            type="button"
          >
            <Settings className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white group-hover:text-cyan-300">Atur TTD Lengkap...</div>
              <div className="text-[10px] text-slate-400">Edit nama, jabatan, tambah/hapus orang</div>
            </div>
          </button>

          <div className="h-px bg-slate-800/80 my-1" />

          {/* 2. Preset 3 Kolom XXI */}
          {onApplySignaturePreset && (
            <button
              onClick={() => {
                setIsTtdMenuOpen(false);
                onApplySignaturePreset('standard_3');
              }}
              className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-cyan-950/80 hover:text-cyan-300 transition-colors text-xs cursor-pointer group"
              type="button"
            >
              <FileSignature className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white group-hover:text-cyan-300">3 Kolom Standar XXI</div>
                <div className="text-[10px] text-slate-400">Teknisi | Chief Eng | Cinema Manager</div>
              </div>
            </button>
          )}

          {/* 3. Preset 2 Kolom Sederhana */}
          {onApplySignaturePreset && (
            <button
              onClick={() => {
                setIsTtdMenuOpen(false);
                onApplySignaturePreset('simple_2');
              }}
              className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-cyan-950/80 hover:text-cyan-300 transition-colors text-xs cursor-pointer group"
              type="button"
            >
              <FileSignature className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white group-hover:text-cyan-300">2 Kolom Sederhana</div>
                <div className="text-[10px] text-slate-400">Dibuat Oleh | Disetujui Oleh</div>
              </div>
            </button>
          )}

          {/* 4. Preset 4 Kolom Lengkap */}
          {onApplySignaturePreset && (
            <button
              onClick={() => {
                setIsTtdMenuOpen(false);
                onApplySignaturePreset('full_4');
              }}
              className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-cyan-950/80 hover:text-cyan-300 transition-colors text-xs cursor-pointer group"
              type="button"
            >
              <FileSignature className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white group-hover:text-cyan-300">4 Kolom Lengkap</div>
                <div className="text-[10px] text-slate-400">Teknisi | Chief | Manager | Regional</div>
              </div>
            </button>
          )}

          {/* 5. Update Tanggal di Atas TTD */}
          {onApplyDateAtasTtd && (
            <>
              <div className="h-px bg-slate-800/80 my-1" />
              <button
                onClick={() => {
                  setIsTtdMenuOpen(false);
                  onApplyDateAtasTtd();
                }}
                className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-amber-950/60 hover:text-amber-300 transition-colors text-xs cursor-pointer group"
                type="button"
              >
                <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white group-hover:text-amber-300">Sinkronkan Tanggal di Atas TTD</div>
                  <div className="text-[10px] text-slate-400">Update kota & tanggal hari ini di atas TTD</div>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
