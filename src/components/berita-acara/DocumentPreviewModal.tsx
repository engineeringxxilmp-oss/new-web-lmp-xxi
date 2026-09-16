/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, Download, Share2 } from 'lucide-react';
import DocumentHeader from './DocumentHeader';
import { UploadedImage } from './ImageUploader';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  images: UploadedImage[];
  onExportPdf: () => void;
  onShareWhatsapp: () => void;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  htmlContent,
  images,
  onExportPdf,
  onShareWhatsapp
}: DocumentPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-2 md:p-6 overflow-y-auto">
      
      {/* Top Modal Controls Header */}
      <div className="w-full max-w-5xl bg-[#0d1322] border border-cyan-500/40 rounded-2xl p-4 text-white shadow-[0_0_25px_rgba(0,0,0,0.8)] flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-extrabold text-sm md:text-base text-cyan-300 font-mono tracking-wider uppercase">
            PREVIEW HASIL DOKUMEN (UKURAN CETAK A4)
          </h3>
          <p className="text-xs text-slate-400 font-sans">
            Tampilan presisi Berita Acara Permintaan Barang sesuai hasil cetak PDF
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
            title="Cetak langsung ke printer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Cetak / Print</span>
          </button>

          <button
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(52,211,153,0.3)]"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={onShareWhatsapp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.4)]"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden md:inline">Share WhatsApp</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* A4 Paper Preview Box Area */}
      <div className="w-full flex-1 flex flex-col items-center overflow-y-auto py-4 custom-scrollbar gap-8">
        
        {/* PAGE 1: DOKUMEN UTAMA */}
        <div
          className="
            bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-xs relative box-border overflow-hidden
            w-[210mm] max-w-full min-h-[297mm]
            pt-0 pb-[2cm] pl-[3cm] pr-[3cm]
            font-sans text-xs md:text-sm leading-normal shrink-0
          "
          style={{ boxSizing: 'border-box' }}
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

        {/* PAGE 2: LAMPIRAN DOKUMENTASI GAMBAR (SEPARATE PAGE) */}
        {images.length > 0 && (
          <div
            className="
              bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-xs relative box-border
              w-[210mm] max-w-full min-h-[297mm]
              pt-[2.5cm] pb-[2.5cm] pl-[3cm] pr-[3cm]
              font-sans text-xs md:text-sm leading-normal shrink-0
            "
            style={{ boxSizing: 'border-box' }}
          >
            {/* Header Halaman Lampiran */}
            <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
              <h3 className="font-bold text-sm md:text-base uppercase tracking-wider text-slate-900">
                LAMPIRAN DOKUMENTASI & FOTO BARANG
              </h3>
              <p className="text-xs font-medium text-slate-600 uppercase tracking-widest mt-0.5">
                BERITA ACARA PERMINTAAN PERBAIKAN / PEMELIHARAAN SARANA & PRASARANA
              </p>
              <div className="w-full h-[1px] bg-slate-400 mt-2" />
            </div>

            <div className="flex flex-wrap items-start justify-center gap-4 min-h-[600px]">
              {images.map((img, index) => {
                const align = img.align || 'center';
                const widthPct = img.widthPercent || 48;

                let itemStyle: React.CSSProperties = { width: '100%', flex: '0 0 100%' };
                if (widthPct >= 95) {
                  itemStyle = { width: '100%', flex: '0 0 100%' };
                } else if (widthPct >= 45 && widthPct <= 55) {
                  itemStyle = { width: 'calc(50% - 8px)', flex: '0 0 calc(50% - 8px)' };
                } else if (widthPct >= 30 && widthPct <= 35) {
                  itemStyle = { width: 'calc(33.333% - 11px)', flex: '0 0 calc(33.333% - 11px)' };
                } else if (widthPct >= 20 && widthPct <= 28) {
                  itemStyle = { width: 'calc(25% - 12px)', flex: '0 0 calc(25% - 12px)' };
                } else {
                  itemStyle = { width: `calc(${widthPct}% - 8px)`, flex: `0 0 calc(${widthPct}% - 8px)` };
                }

                return (
                  <div
                    key={img.id}
                    className="border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col items-center text-center shadow-2xs box-border"
                    style={itemStyle}
                  >
                    <div className="w-full flex justify-center bg-white p-1 overflow-hidden">
                      <img
                        src={img.url}
                        alt={img.caption || `Foto Lampiran ${index + 1}`}
                        className="max-h-[260px] w-auto h-auto object-contain rounded"
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
        )}

      </div>

    </div>
  );
}
