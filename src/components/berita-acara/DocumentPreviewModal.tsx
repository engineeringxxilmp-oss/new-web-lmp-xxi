/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Share2, Plus, Eye, Save, CloudUpload, Loader2 } from 'lucide-react';
import DocumentHeader from './DocumentHeader';
import { UploadedImage, chunkImagesIntoPages } from './ImageUploader';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  images: UploadedImage[];
  onExportPdf: () => void;
  onShareWhatsapp: () => void;
  onSaveToBatch?: () => void;
  onSaveDraftLocal?: () => void;
  onSaveDraftAndSyncDrive?: () => void;
  editingBaId?: string | null;
  nextInternalNo?: string;
  isExporting?: boolean;
  isSyncingDrive?: boolean;
  selectedBaCount?: number;
  isSharePdfReady?: boolean;
}

const A4_BASE_WIDTH = 794; // 210mm standar A4 pada 96 DPI
const A4_BASE_HEIGHT = 1123; // 297mm standar A4 pada 96 DPI

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  htmlContent,
  images,
  onExportPdf,
  onShareWhatsapp,
  onSaveToBatch,
  onSaveDraftLocal,
  onSaveDraftAndSyncDrive,
  editingBaId,
  nextInternalNo,
  isExporting,
  isSyncingDrive,
  selectedBaCount,
  isSharePdfReady
}: DocumentPreviewModalProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const imagePages = useMemo(() => chunkImagesIntoPages(images), [images]);

  // Inisialisasi scale awal secara presisi agar tidak ada kedipan / layout shift
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const margin = vw < 440 ? 20 : vw < 768 ? 32 : 48;
      const avail = Math.min(A4_BASE_WIDTH, Math.max(280, vw - margin));
      return avail < A4_BASE_WIDTH ? avail / A4_BASE_WIDTH : 1;
    }
    return 1;
  });

  const [scaledWidth, setScaledWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const margin = vw < 440 ? 20 : vw < 768 ? 32 : 48;
      return Math.min(A4_BASE_WIDTH, Math.max(280, vw - margin));
    }
    return A4_BASE_WIDTH;
  });

  const [page1ScaledHeight, setPage1ScaledHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const margin = vw < 440 ? 20 : vw < 768 ? 32 : 48;
      const avail = Math.min(A4_BASE_WIDTH, Math.max(280, vw - margin));
      const s = avail < A4_BASE_WIDTH ? avail / A4_BASE_WIDTH : 1;
      return Math.round(A4_BASE_HEIGHT * s);
    }
    return A4_BASE_HEIGHT;
  });

  const [page2ScaledHeight, setPage2ScaledHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const margin = vw < 440 ? 20 : vw < 768 ? 32 : 48;
      const avail = Math.min(A4_BASE_WIDTH, Math.max(280, vw - margin));
      const s = avail < A4_BASE_WIDTH ? avail / A4_BASE_WIDTH : 1;
      return Math.round(A4_BASE_HEIGHT * s);
    }
    return A4_BASE_HEIGHT;
  });

  // Fungsi perhitungan kalkulasi scaling proporsional & presisi
  const updateScaleAndDimensions = useCallback(() => {
    if (!isOpen) return;

    // 1. Tentukan available width dari container atau viewport
    let containerWidth = A4_BASE_WIDTH;
    if (previewContainerRef.current) {
      containerWidth = previewContainerRef.current.clientWidth;
    }
    if (!containerWidth && typeof window !== 'undefined') {
      containerWidth = window.innerWidth;
    }

    // Margin kiri-kanan proporsional agar kertas tampak anggun di tengah layar HP
    const margin = containerWidth < 440 ? 16 : containerWidth < 768 ? 28 : 40;
    const availableWidth = Math.min(A4_BASE_WIDTH, Math.max(260, containerWidth - margin));

    const newScale = availableWidth < A4_BASE_WIDTH ? availableWidth / A4_BASE_WIDTH : 1;
    const newScaledWidth = Math.round(A4_BASE_WIDTH * newScale);

    setScale(newScale);
    setScaledWidth(newScaledWidth);

    // 2. Ukur tinggi visual aktual dokumen utama (Page 1)
    if (page1Ref.current) {
      const p1Natural = Math.max(A4_BASE_HEIGHT, page1Ref.current.scrollHeight, page1Ref.current.offsetHeight);
      setPage1ScaledHeight(Math.round(p1Natural * newScale));
    } else {
      setPage1ScaledHeight(Math.round(A4_BASE_HEIGHT * newScale));
    }

    // 3. Ukur tinggi visual aktual lampiran gambar (Page 2) jika ada
    if (page2Ref.current) {
      const p2Natural = Math.max(A4_BASE_HEIGHT, page2Ref.current.scrollHeight, page2Ref.current.offsetHeight);
      setPage2ScaledHeight(Math.round(p2Natural * newScale));
    } else {
      setPage2ScaledHeight(Math.round(A4_BASE_HEIGHT * newScale));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Kalkulasi awal
    updateScaleAndDimensions();

    // Timer fallback untuk memastikan semua gambar & font selesai dirender
    const timer1 = setTimeout(updateScaleAndDimensions, 100);
    const timer2 = setTimeout(updateScaleAndDimensions, 350);

    // ResizeObserver untuk memantau perubahan ukuran layar / orientasi secara instan
    const ro = new ResizeObserver(() => {
      updateScaleAndDimensions();
    });

    if (previewContainerRef.current) {
      ro.observe(previewContainerRef.current);
    }
    if (page1Ref.current) {
      ro.observe(page1Ref.current);
    }
    if (page2Ref.current) {
      ro.observe(page2Ref.current);
    }

    window.addEventListener('resize', updateScaleAndDimensions);
    window.addEventListener('orientationchange', updateScaleAndDimensions);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      ro.disconnect();
      window.removeEventListener('resize', updateScaleAndDimensions);
      window.removeEventListener('orientationchange', updateScaleAndDimensions);
    };
  }, [isOpen, htmlContent, images, updateScaleAndDimensions]);

  // Focus Preview Mode Effect: Mengunci scroll background dan mengaktifkan class focus mode
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('document-preview-focus-mode');
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('document-preview-focus-mode');
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] bg-[#070b16] sm:bg-black/95 sm:backdrop-blur-md flex flex-col items-center justify-start p-0 sm:p-4 md:p-6 overflow-hidden w-screen h-screen"
      id="document-preview-modal-root"
    >
      {/* 
        SCOPED CSS UNTUK PREVIEW DOKUMEN:
        Memastikan elemen header kop surat pada kertas A4 (794px) selalu menggunakan koordinat desktop A4 yang presisi
        tanpa terdistorsi oleh media query layar HP.
      */}
      <style>{`
        #a4-preview-page1 #permanent-document-header {
          margin-top: -32px !important;
        }
        #a4-preview-page1 #permanent-document-header img {
          margin-top: -12px !important;
          width: 100% !important;
          height: auto !important;
          display: block !important;
        }
        #a4-preview-page1 #permanent-document-header h1 {
          font-size: 30px !important;
          margin-top: -100px !important;
          line-height: 1.1 !important;
          font-family: Playfair Display, serif !important;
          font-weight: 900 !important;
          color: #b8860b !important;
          letter-spacing: 0.025em !important;
          text-transform: uppercase !important;
        }
        #a4-preview-page1 #permanent-document-header p {
          font-size: 12px !important;
          margin-top: 4px !important;
          line-height: 1.25 !important;
        }
      `}</style>

      {/* 
        [MOBILE TOOLBAR] 
        Khusus Mobile (sm:hidden) - Struktur Sesuai Target:
        ┌──────────────────────────────┐
        │ Preview Dokumen       X      │
        │ [Export PDF] [WA]            │
        └──────────────────────────────┘
      */}
      <div 
        className="sm:hidden w-full bg-[#0d1322] border-b border-cyan-500/40 px-3 py-2 text-white shadow-xl shrink-0 flex flex-col gap-2 z-20"
        id="mobile-preview-toolbar"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-xs text-cyan-300 font-mono tracking-wider uppercase">
              Preview Hasil Dokumen
            </h3>
            {scale < 1 && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 rounded-full shrink-0">
                Fit {Math.round(scale * 100)}%
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95"
            title="Tutup Preview"
            id="btn-close-preview-mobile"
          >
            <X className="w-5 h-5 text-slate-200" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportPdf}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(52,211,153,0.3)] active:scale-95 disabled:opacity-50 min-h-[38px]"
            title="Download PDF A4"
            id="btn-export-pdf-mobile"
          >
            <Download className="w-4 h-4 text-emerald-100 shrink-0" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={onShareWhatsapp}
            disabled={isExporting || isSharePdfReady === false}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 min-h-[38px]"
            title={isSharePdfReady === false ? "Menyiapkan PDF..." : "Bagikan ke WhatsApp"}
            id="btn-share-wa-mobile"
          >
            {isSharePdfReady === false ? (
              <Loader2 className="w-4 h-4 text-emerald-100 shrink-0 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 text-emerald-100 shrink-0" />
            )}
            <span>{isSharePdfReady === false ? 'Siap...' : 'WA'}</span>
          </button>
        </div>
      </div>

      {/* 
        [DESKTOP TOOLBAR]
        Tampil pada Tablet & Desktop (hidden sm:flex)
      */}
      <div className="hidden sm:flex w-full max-w-5xl bg-[#0d1322] border border-cyan-500/40 rounded-2xl p-2.5 sm:p-4 text-white shadow-[0_0_25px_rgba(0,0,0,0.8)] items-center justify-between gap-2 mb-2 sm:mb-4 shrink-0 mx-auto">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="font-extrabold text-xs sm:text-sm md:text-base text-cyan-300 font-mono tracking-wider uppercase">
                PREVIEW HASIL DOKUMEN (UKURAN CETAK A4)
              </h3>
              {scale < 1 && (
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-mono bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 rounded-full shrink-0">
                  Fit {Math.round(scale * 100)}%
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-sans mt-0.5 hidden xs:block">
              Tampilan presisi Berita Acara Permintaan Barang sesuai hasil cetak PDF
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 ml-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
            title="Cetak langsung ke printer"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            <span>Cetak</span>
          </button>

          <button
            onClick={onExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(52,211,153,0.3)] active:scale-95 disabled:opacity-50"
            title="Download PDF A4"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={onShareWhatsapp}
            disabled={isExporting || isSharePdfReady === false}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50"
            title={isSharePdfReady === false ? "Menyiapkan PDF..." : "Bagikan ke WhatsApp"}
          >
            {isSharePdfReady === false ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-emerald-200" />
            ) : (
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            <span>{isSharePdfReady === false ? 'Menyiapkan PDF...' : 'Share WhatsApp'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-0.5"
            title="Tutup Preview"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* 
        A4 Paper Preview Scrollable Area:
        - overflow-y-auto: Scroll vertikal lancar
        - overflow-x-hidden: Tanpa horizontal scroll
      */}
      <div 
        ref={previewContainerRef}
        className="w-full flex-1 flex flex-col items-center overflow-y-auto overflow-x-hidden px-1 sm:px-2 md:px-4 pt-1 sm:pt-2 custom-scrollbar gap-6 sm:gap-8"
        id="document-preview-scroll-area"
      >
        
        {/* 
          [AREA PREVIEW] - HALAMAN 1: DOKUMEN UTAMA
          Container khusus .preview-container:
          - width: 100%
          - overflow-x: hidden
          - overflow-y: visible
          - display: flex
          - justify-content: center
        */}
        <div className="preview-container w-full overflow-x-hidden overflow-y-visible flex flex-col items-center justify-center shrink-0 my-1">
          <div
            className="relative flex justify-center items-start shrink-0 mx-auto transition-[width,height] duration-75"
            style={{
              width: `${scaledWidth}px`,
              height: `${page1ScaledHeight}px`,
              maxWidth: '100%',
            }}
          >
            <div
              ref={page1Ref}
              id="a4-preview-page1"
              className="
                bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-xs box-border overflow-hidden
                font-sans text-xs md:text-sm leading-normal shrink-0 select-none
              "
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${A4_BASE_WIDTH}px`,
                minHeight: `${A4_BASE_HEIGHT}px`,
                paddingTop: '0px',
                paddingBottom: '2cm',
                paddingLeft: '3cm',
                paddingRight: '3cm',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                boxSizing: 'border-box',
              }}
            >
              {/* Header Fixed Template */}
              <DocumentHeader />

              {/* Document Rendered Content */}
              <div
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                className="
                  prose prose-sm max-w-none text-slate-900 leading-normal min-h-[500px]
                  [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table[border='1']_th]:border [&_table[border='1']_th]:border-slate-400 [&_th]:p-2 [&_th]:bg-slate-100 [&_th]:font-bold [&_table[border='1']_td]:border [&_table[border='1']_td]:border-slate-300 [&_td]:p-2
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2
                "
              />
            </div>
          </div>
        </div>

        {/* 
          [AREA PREVIEW] - HALAMAN LAMPIRAN GAMBAR (JIKA ADA)
          Setiap halaman lampiran menggunakan ukuran standar A4 portrait (794px x 1123px)
          tanpa stretching / gepeng
        */}
        {imagePages.length > 0 && imagePages.map((pageImages, pIndex) => (
          <div key={pIndex} className="preview-container w-full overflow-x-hidden overflow-y-visible flex flex-col items-center justify-center shrink-0 my-1">
            <div
              className="relative flex justify-center items-start shrink-0 mx-auto transition-[width,height] duration-75"
              style={{
                width: `${scaledWidth}px`,
                height: `${Math.round(A4_BASE_HEIGHT * scale)}px`,
                maxWidth: '100%',
              }}
            >
              <div
                ref={pIndex === 0 ? page2Ref : undefined}
                id={`a4-preview-page-${pIndex + 2}`}
                className="
                  bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-xs box-border overflow-hidden
                  font-sans text-xs md:text-sm leading-normal shrink-0 select-none
                "
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${A4_BASE_WIDTH}px`,
                  height: `${A4_BASE_HEIGHT}px`,
                  minHeight: `${A4_BASE_HEIGHT}px`,
                  maxHeight: `${A4_BASE_HEIGHT}px`,
                  paddingTop: '2.5cm',
                  paddingBottom: '2.5cm',
                  paddingLeft: '3cm',
                  paddingRight: '3cm',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  boxSizing: 'border-box',
                }}
              >
                {/* Header Halaman Lampiran */}
                <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
                  <h3 className="font-bold text-sm md:text-base uppercase tracking-wider text-slate-900">
                    LAMPIRAN DOKUMENTASI & FOTO BARANG {imagePages.length > 1 ? `(${pIndex + 1}/${imagePages.length})` : ''}
                  </h3>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-widest mt-0.5">
                    BERITA ACARA PERMINTAAN PERBAIKAN / PEMELIHARAAN SARANA & PRASARANA
                  </p>
                </div>

                <div className="flex flex-wrap items-start justify-center gap-4">
                  {pageImages.map((img, index) => {
                    const widthPct = img.widthPercent || 48;

                    let itemStyle: React.CSSProperties = { width: '100%', flex: '0 0 100%' };
                    if (widthPct >= 90) {
                      itemStyle = { width: '100%', flex: '0 0 100%' };
                    } else if (widthPct >= 40 && widthPct < 90) {
                      itemStyle = { width: 'calc(50% - 8px)', flex: '0 0 calc(50% - 8px)' };
                    } else if (widthPct >= 28 && widthPct < 40) {
                      itemStyle = { width: 'calc(33.333% - 11px)', flex: '0 0 calc(33.333% - 11px)' };
                    } else {
                      itemStyle = { width: 'calc(25% - 12px)', flex: '0 0 calc(25% - 12px)' };
                    }

                    return (
                      <div
                        key={img.id}
                        className="border-0 p-1 bg-transparent flex flex-col items-center text-center box-border"
                        style={itemStyle}
                      >
                        <div className="w-full flex justify-center bg-transparent p-0 overflow-hidden">
                          <img
                            src={img.url}
                            alt={img.caption || `Foto Lampiran ${index + 1}`}
                            className="max-h-[250px] max-w-full w-auto h-auto object-contain block mx-auto"
                          />
                        </div>
                        {img.caption && img.caption.trim() !== '' && (
                          <p className="mt-2 text-xs font-semibold text-slate-800 italic">
                            {img.caption}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 
          [CONTROL ACTIONS]
          Ditempatkan SETELAH KERTAS A4 secara normal dalam document flow:
          - Layout grid 2 kolom di mobile, flex wrap di desktop
          - Tidak overlay atau menutupi A4
        */}
        <div 
          className="w-full max-w-[794px] mx-auto bg-[#0d1322]/95 border border-cyan-500/30 rounded-2xl p-3 sm:p-4 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)] mt-4 shrink-0"
          id="preview-bottom-control-actions"
        >
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2.5 w-full">
            {onSaveToBatch && (
              <button
                onClick={onSaveToBatch}
                disabled={isExporting}
                className="col-span-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.4)] active:scale-95 disabled:opacity-50 min-h-[44px]"
                type="button"
              >
                <Plus className="w-4 h-4 text-cyan-200 shrink-0" />
                <span className="truncate">{editingBaId ? 'Update BA' : `+ Antrean (${nextInternalNo || '01'})`}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="col-span-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer hover:border-cyan-400 active:scale-95 shadow-xs min-h-[44px]"
              type="button"
            >
              <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Tutup Preview</span>
            </button>

            <button
              onClick={onExportPdf}
              disabled={isExporting}
              className="col-span-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(59,130,246,0.4)] active:scale-95 disabled:opacity-50 min-h-[44px]"
              type="button"
            >
              <Download className="w-4 h-4 text-blue-200 shrink-0" />
              <span>{isExporting ? 'Memproses...' : 'Export PDF'}</span>
            </button>

            {onSaveDraftLocal && (
              <button
                onClick={onSaveDraftLocal}
                className="col-span-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer active:scale-95 min-h-[44px]"
                type="button"
              >
                <Save className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Simpan Draft</span>
              </button>
            )}

            <button
              onClick={onShareWhatsapp}
              disabled={isExporting || isSharePdfReady === false}
              className="col-span-2 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 min-h-[44px]"
              type="button"
            >
              {isSharePdfReady === false ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-200 shrink-0" />
                  <span className="text-center">Menyiapkan PDF...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span className="text-center">Share WhatsApp + Siapkan Pesan {selectedBaCount && selectedBaCount > 0 ? `(${selectedBaCount} BA)` : ''}</span>
                </>
              )}
            </button>

            {onSaveDraftAndSyncDrive && (
              <button
                onClick={onSaveDraftAndSyncDrive}
                disabled={isSyncingDrive}
                className="col-span-2 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400 rounded-xl font-mono text-xs font-extrabold transition-all cursor-pointer shadow-[0_0_18px_rgba(6,182,212,0.5)] active:scale-95 disabled:opacity-50 min-h-[44px]"
                type="button"
              >
                <CloudUpload className="w-4 h-4 text-cyan-200 shrink-0" />
                <span>{isSyncingDrive ? 'Syncing Drive...' : 'Simpan & Sync Google Drive'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 
          [SPACER UNTUK SCROLLING BAWAH DI MOBILE]
          Memberikan ruang aman yang nyaman agar seluruh konten dan tombol paling bawah
          dapat di-scroll tuntas dan nyaman ditekan.
        */}
        <div 
          className="w-full shrink-0 h-8 md:h-4"
          style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}
          id="preview-bottom-nav-safe-spacer"
        />

      </div>

    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
