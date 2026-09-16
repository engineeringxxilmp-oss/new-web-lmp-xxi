/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import DocumentHeader from './DocumentHeader';
import { UploadedImage } from './ImageUploader';
import {
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Edit3,
  Crop
} from 'lucide-react';
import { sanitizeAndFormatPastedContent } from '../../lib/pasteSanitizer';
import ImageCropperModal from './ImageCropperModal';

interface DocumentEditorProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  htmlContent: string;
  onContentChange: (html: string) => void;
  images: UploadedImage[];
  onRemoveImage: (id: string) => void;
  onUpdateImage: (img: UploadedImage) => void;
  onReorderImages?: (newImages: UploadedImage[]) => void;
  onOpenImageModal?: () => void;
}

export default function DocumentEditor({
  editorRef,
  htmlContent,
  onContentChange,
  images,
  onRemoveImage,
  onUpdateImage,
  onReorderImages,
  onOpenImageModal
}: DocumentEditorProps) {
  const isUpdatingRef = useRef(false);
  const [croppingImg, setCroppingImg] = React.useState<UploadedImage | null>(null);

  // Sync initial content to contentEditable
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [htmlContent, editorRef]);

  const handleInput = () => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onContentChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  };

  // Intercept paste events to strip background colors, dark mode text, MS Word tags, and auto-format tables
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');

    const cleanHtml = sanitizeAndFormatPastedContent(htmlData, textData);

    if (cleanHtml) {
      document.execCommand('insertHTML', false, cleanHtml);
      if (editorRef.current) {
        isUpdatingRef.current = true;
        onContentChange(editorRef.current.innerHTML);
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    }
  };

  // Helper to change image size by delta (-10 or +10)
  const handleResizeDelta = (img: UploadedImage, delta: number) => {
    const current = img.widthPercent || 75;
    const next = Math.max(20, Math.min(100, current + delta));
    onUpdateImage({ ...img, widthPercent: next });
  };

  // Helper to reorder images
  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;

    const newArr = [...images];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    if (onReorderImages) {
      onReorderImages(newArr);
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-4 px-2 md:px-0 gap-8">
      
      {/* 
        ========================================================================
        HALAMAN 1: KERTAS A4 DOKUMEN UTAMA
        ========================================================================
        Standard A4 Dimensions: Width 210mm (~794px @ 96DPI), Min Height 297mm (~1123px)
        Fixed Margins: Top: 2.5cm, Bottom: 2.5cm, Left: 3cm, Right: 3cm
      */}
      <div
        id="a4-document-paper"
        className="
          bg-white text-slate-900 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-sm relative box-border overflow-hidden
          w-[210mm] max-w-full min-h-[297mm]
          pt-0 pb-[2cm] pl-[3cm] pr-[3cm]
          font-sans text-xs md:text-sm leading-relaxed transition-all
        "
        style={{
          boxSizing: 'border-box'
        }}
      >
        {/* HEADER DOKUMEN (PERMANENT FIXED TEMPLATE) */}
        <DocumentHeader />

        {/* EDITOR DOKUMEN (RICH TEXT CONTENT) */}
        <div
          ref={editorRef}
          contentEditable
          spellCheck={false}
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          className="
            min-h-[500px] outline-hidden focus:ring-0 cursor-text prose prose-sm max-w-none text-slate-900 leading-normal
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table[border='1']_th]:border [&_table[border='1']_th]:border-slate-400 [&_th]:p-2 [&_th]:bg-slate-100 [&_th]:font-bold [&_table[border='1']_td]:border [&_table[border='1']_td]:border-slate-300 [&_td]:p-2
            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2
          "
          id="rich-text-editor-body"
        />
      </div>


      {/* 
        ========================================================================
        PEMBATAS HALAMAN / PAGE BREAK INDICATOR (HANYA DITAMPILKAN DI EDITOR)
        ========================================================================
      */}
      {images.length > 0 && (
        <div className="w-[210mm] max-w-full no-print my-2 flex flex-col items-center">
          <div className="w-full flex items-center justify-between gap-4 border-t-2 border-dashed border-cyan-500/40 pt-4 pb-2">
            <div className="flex items-center gap-2 bg-cyan-950/80 border border-cyan-500/50 px-3 py-1.5 rounded-full text-cyan-300 font-mono text-xs font-bold shadow-md">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span>HALAMAN 2 — LAMPIRAN DOKUMENTASI FOTO / GAMBAR ({images.length} GAMBAR)</span>
            </div>

            {onOpenImageModal && (
              <button
                type="button"
                onClick={onOpenImageModal}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>+ Kelola / Tambah Gambar</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-mono text-center mt-1">
            Gunakan tombol pengatur di setiap gambar di bawah untuk menggeser posisi (kiri, tengah, kanan), memperbesar/memperkecil, mengubah keterangan, atau mengubah urutan.
          </p>
        </div>
      )}


      {/* 
        ========================================================================
        HALAMAN 2: KERTAS A4 DOKUMENTASI GAMBAR (TERPISAH SEBAGAI HALAMAN DEDIKASI)
        ========================================================================
      */}
      {images.length > 0 && (
        <div
          id="a4-images-paper"
          className="
            bg-white text-slate-900 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-sm relative box-border
            w-[210mm] max-w-full min-h-[297mm]
            pt-[2.5cm] pb-[2.5cm] pl-[3cm] pr-[3cm]
            font-sans text-xs md:text-sm leading-relaxed transition-all
          "
          style={{
            boxSizing: 'border-box'
          }}
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

          {/* Daftar Gambar Lampiran (Flex Wrap Grid) */}
          <div className="flex flex-wrap items-start justify-center gap-4 min-h-[600px]" id="document-images-container">
            {images.map((img, index) => {
              const align = img.align || 'center';
              const widthPct = img.widthPercent || 48;

              // Compute flex grid width
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
                  className="relative group border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col items-center text-center shadow-xs transition-all box-border"
                  style={itemStyle}
                >
                  {/* Gambar Utama */}
                  <div className="w-full flex justify-center bg-white p-1 overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.caption || `Lampiran ${index + 1}`}
                      className="max-h-[260px] w-auto h-auto object-contain rounded"
                    />
                  </div>

                  {/* Keterangan Gambar (Hanya Tampil Jika User Memasukkan Keterangan) */}
                  {img.caption && img.caption.trim() !== '' && (
                    <div className="w-full mt-2">
                      <p className="text-xs font-semibold text-slate-800 italic">
                        {img.caption}
                      </p>
                    </div>
                  )}

                  {/* 
                    ===================================================================
                    TOOLBAR EDIT GAMBAR INTERAKTIF (HANYA MUNCUL SAAT EDIT, HIDDEN PRINT)
                    ===================================================================
                  */}
                  <div className="no-print mt-3 pt-2.5 border-t border-slate-300 w-full flex flex-col gap-2 bg-slate-100/90 p-2 rounded-md border border-slate-300">
                    
                    {/* Row 1: Alignment (Geser Kiri/Tengah/Kanan) & Resize controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      
                      {/* Alignment Controls (Geser Posisi) */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-300 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-1 font-mono">Posisi:</span>
                        <button
                          type="button"
                          onClick={() => onUpdateImage({ ...img, align: 'left' })}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            align === 'left' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Geser Rata Kiri"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateImage({ ...img, align: 'center' })}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            align === 'center' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Geser Rata Tengah"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateImage({ ...img, align: 'right' })}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            align === 'right' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Geser Rata Kanan"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Resize Controls (Perbesar / Perkecil) */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-300 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-1 font-mono">Ukuran:</span>
                        
                        <button
                          type="button"
                          onClick={() => handleResizeDelta(img, -10)}
                          className="p-1 rounded text-slate-700 hover:bg-slate-200 cursor-pointer font-bold"
                          title="Perkecil (-10%)"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>

                        <span className="font-mono text-[11px] font-extrabold text-cyan-700 px-1.5 py-0.5 bg-cyan-50 rounded border border-cyan-200">
                          {widthPct}%
                        </span>

                        <button
                          type="button"
                          onClick={() => handleResizeDelta(img, 10)}
                          className="p-1 rounded text-slate-700 hover:bg-slate-200 cursor-pointer font-bold"
                          title="Perbesar (+10%)"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick preset buttons */}
                        <div className="hidden sm:flex items-center gap-1 ml-1 border-l border-slate-300 pl-1">
                          {[
                            { label: '33%', val: 33 },
                            { label: '48%', val: 48 },
                            { label: '75%', val: 75 },
                            { label: '100%', val: 100 }
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => onUpdateImage({ ...img, widthPercent: preset.val })}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                                widthPct === preset.val
                                  ? 'bg-cyan-600 text-white'
                                  : 'text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reorder, Crop & Delete */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-300 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setCroppingImg(img)}
                          className="px-2 py-0.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Potong / Crop Gambar Ini"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>Crop</span>
                        </button>

                        <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />

                        <button
                          type="button"
                          onClick={() => handleMoveImage(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                          title="Pindah Ke Atas"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(index, 'down')}
                          disabled={index === images.length - 1}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                          title="Pindah Ke Bawah"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />

                        <button
                          type="button"
                          onClick={() => onRemoveImage(img.id)}
                          className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                          title="Hapus Gambar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>

                    {/* Row 2: Direct Caption Editor Input */}
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300">
                      <Edit3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <input
                        type="text"
                        value={img.caption || ''}
                        onChange={(e) => onUpdateImage({ ...img, caption: e.target.value })}
                        placeholder="Ketik keterangan gambar di sini..."
                        className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-hidden"
                      />
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Image Cropper Modal */}
      {croppingImg && (
        <ImageCropperModal
          imageSrc={croppingImg.url}
          isOpen={!!croppingImg}
          onClose={() => setCroppingImg(null)}
          onCropComplete={(croppedUrl) => {
            onUpdateImage({ ...croppingImg, url: croppedUrl });
            setCroppingImg(null);
          }}
        />
      )}

    </div>
  );
}
