/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  Crop,
  Eye
} from 'lucide-react';
import { sanitizeAndFormatPastedContent } from '../../lib/pasteSanitizer';
import ImageCropperModal from './ImageCropperModal';

const A4_BASE_WIDTH = 794; // 210mm @ 96DPI
const A4_BASE_HEIGHT = 1123; // 297mm @ 96DPI

interface DocumentEditorProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  htmlContent: string;
  onContentChange: (html: string) => void;
  images: UploadedImage[];
  onRemoveImage: (id: string) => void;
  onUpdateImage: (img: UploadedImage) => void;
  onReorderImages?: (newImages: UploadedImage[]) => void;
  onOpenImageModal?: () => void;
  onOpenPreview?: () => void;
  mobileToolbarSlot?: React.ReactNode;
  toolbarSlot?: React.ReactNode;
}

export default function DocumentEditor({
  editorRef,
  htmlContent,
  onContentChange,
  images,
  onRemoveImage,
  onUpdateImage,
  onReorderImages,
  onOpenImageModal,
  onOpenPreview,
  mobileToolbarSlot,
  toolbarSlot
}: DocumentEditorProps) {
  const isUpdatingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const paper1Ref = useRef<HTMLDivElement | null>(null);
  const paper2Ref = useRef<HTMLDivElement | null>(null);

  const [croppingImg, setCroppingImg] = useState<UploadedImage | null>(null);

  // Responsive scale and dimensions calculation for inline mobile preview
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const margin = vw < 440 ? 24 : vw < 768 ? 32 : 48;
      const avail = Math.min(A4_BASE_WIDTH, Math.max(260, vw - margin));
      return avail < A4_BASE_WIDTH ? avail / A4_BASE_WIDTH : 1;
    }
    return 1;
  });

  const [scaledWidth, setScaledWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const margin = vw < 440 ? 24 : vw < 768 ? 32 : 48;
      return Math.min(A4_BASE_WIDTH, Math.max(260, vw - margin));
    }
    return A4_BASE_WIDTH;
  });

  const [page1ScaledHeight, setPage1ScaledHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const margin = vw < 440 ? 24 : vw < 768 ? 32 : 48;
      const avail = Math.min(A4_BASE_WIDTH, Math.max(260, vw - margin));
      const s = avail < A4_BASE_WIDTH ? avail / A4_BASE_WIDTH : 1;
      return Math.round(A4_BASE_HEIGHT * s);
    }
    return A4_BASE_HEIGHT;
  });

  const [page2ScaledHeight, setPage2ScaledHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const margin = vw < 440 ? 24 : vw < 768 ? 32 : 48;
      const avail = Math.min(A4_BASE_WIDTH, Math.max(260, vw - margin));
      const s = avail < A4_BASE_WIDTH ? avail / A4_BASE_WIDTH : 1;
      return Math.round(A4_BASE_HEIGHT * s);
    }
    return A4_BASE_HEIGHT;
  });

  const updateScaleAndDimensions = useCallback(() => {
    let containerWidth = A4_BASE_WIDTH;
    if (containerRef.current) {
      containerWidth = containerRef.current.clientWidth;
    }
    if (!containerWidth && typeof window !== 'undefined') {
      containerWidth = window.innerWidth;
    }

    const horizontalMargin = containerWidth < 440 ? 24 : containerWidth < 768 ? 32 : 48;
    const availableWidth = Math.min(A4_BASE_WIDTH, Math.max(260, containerWidth - horizontalMargin));

    const newScale = availableWidth < A4_BASE_WIDTH ? availableWidth / A4_BASE_WIDTH : 1;
    const newScaledWidth = Math.round(A4_BASE_WIDTH * newScale);

    setScale(newScale);
    setScaledWidth(newScaledWidth);

    if (paper1Ref.current) {
      const p1Natural = Math.max(A4_BASE_HEIGHT, paper1Ref.current.scrollHeight, paper1Ref.current.offsetHeight);
      setPage1ScaledHeight(Math.round(p1Natural * newScale));
    } else {
      setPage1ScaledHeight(Math.round(A4_BASE_HEIGHT * newScale));
    }

    if (paper2Ref.current) {
      const p2Natural = Math.max(A4_BASE_HEIGHT, paper2Ref.current.scrollHeight, paper2Ref.current.offsetHeight);
      setPage2ScaledHeight(Math.round(p2Natural * newScale));
    } else {
      setPage2ScaledHeight(Math.round(A4_BASE_HEIGHT * newScale));
    }
  }, []);

  useEffect(() => {
    updateScaleAndDimensions();

    const t1 = setTimeout(updateScaleAndDimensions, 100);
    const t2 = setTimeout(updateScaleAndDimensions, 350);

    const ro = new ResizeObserver(() => {
      updateScaleAndDimensions();
    });

    if (containerRef.current) ro.observe(containerRef.current);
    if (paper1Ref.current) ro.observe(paper1Ref.current);
    if (paper2Ref.current) ro.observe(paper2Ref.current);

    window.addEventListener('resize', updateScaleAndDimensions);
    window.addEventListener('orientationchange', updateScaleAndDimensions);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener('resize', updateScaleAndDimensions);
      window.removeEventListener('orientationchange', updateScaleAndDimensions);
    };
  }, [updateScaleAndDimensions, htmlContent, images.length]);

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
      }, 50);
    }
  };

  // Robust paste handler: cleans formatting and inserts via Range API with native fallback
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    try {
      const htmlData = e.clipboardData?.getData('text/html') || '';
      const textData = e.clipboardData?.getData('text/plain') || '';

      if (!htmlData && !textData) {
        // No clipboard data in event; let native browser paste proceed
        return;
      }

      const cleanHtml = sanitizeAndFormatPastedContent(htmlData, textData);

      if (cleanHtml) {
        e.preventDefault();
        let inserted = false;

        // 1. If editor is empty or user selected all content, replace directly to maintain clean DOM structure
        const isEditorEmpty =
          !editorRef.current?.textContent?.trim() ||
          editorRef.current?.innerHTML.trim() === '<p><br></p>' ||
          editorRef.current?.innerHTML.trim() === '<br>';

        const selection = window.getSelection();
        const isAllSelected = Boolean(
          selection &&
            !selection.isCollapsed &&
            editorRef.current &&
            editorRef.current.textContent &&
            selection.toString().trim().length > 0 &&
            selection.toString().trim() === editorRef.current.textContent.trim()
        );

        if ((isEditorEmpty || isAllSelected) && editorRef.current) {
          editorRef.current.innerHTML = cleanHtml;
          if (selection) {
            const r = document.createRange();
            r.selectNodeContents(editorRef.current);
            r.collapse(false);
            selection.removeAllRanges();
            selection.addRange(r);
          }
          inserted = true;
        } else {
          // 2. Prefer modern DOM Range insertion for snippets inside non-empty documents
          let range: Range | null = null;
          if (selection && selection.rangeCount > 0) {
            const currentRange = selection.getRangeAt(0);
            if (editorRef.current && editorRef.current.contains(currentRange.commonAncestorContainer)) {
              range = currentRange;
            }
          }

          // If cursor was not inside editor, target the end of editor
          if (!range && editorRef.current) {
            range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }

          if (range) {
            range.deleteContents();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cleanHtml;
            const fragment = document.createDocumentFragment();
            let node: ChildNode | null;
            let lastNode: ChildNode | null = null;
            while ((node = tempDiv.firstChild)) {
              lastNode = fragment.appendChild(node);
            }
            range.insertNode(fragment);
            if (lastNode && selection) {
              range.setStartAfter(lastNode);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
            inserted = true;
          }

          // Fallback to execCommand if Range insertion was unavailable
          if (!inserted) {
            inserted = document.execCommand('insertHTML', false, cleanHtml);
          }
        }

        // 3. Notify parent of updated HTML
        if (editorRef.current) {
          isUpdatingRef.current = true;
          onContentChange(editorRef.current.innerHTML);
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 50);
        }
      }
    } catch (err) {
      console.warn('Paste handling exception, allowing native browser paste:', err);
      // Do not preventDefault on error so native browser paste still works!
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
    <div 
      ref={containerRef}
      className="w-full flex flex-col items-center py-4 px-2 md:px-0 gap-8"
      id="document-editor-container"
    >
      {/* 
        ========================================================================
        STICKY EDITING TOOLBAR (HP, TABLET & DESKTOP)
        Positioned directly above the document paper, sticks on scroll
        ========================================================================
      */}
      {(toolbarSlot || mobileToolbarSlot) && (
        <div 
          className="w-full max-w-[794px] sticky top-[46px] md:top-[56px] z-25 px-1 -mt-2 mb-1 flex justify-start items-center"
          id="editor-sticky-toolbar-wrapper"
        >
          {toolbarSlot || mobileToolbarSlot}
        </div>
      )}
      
      {/* 
        ========================================================================
        HALAMAN 1: KERTAS A4 DOKUMEN UTAMA
        ========================================================================
        Standard A4 Dimensions: Width 210mm (~794px @ 96DPI), Min Height 297mm (~1123px)
        Fixed Margins: Top: 2.5cm, Bottom: 2.5cm, Left: 3cm, Right: 3cm
      */}
      <div 
        className="w-full flex flex-col items-center justify-center overflow-x-hidden"
        id="inline-a4-page1-container"
      >
        {/* Mobile Header indicator above the inline A4 thumbnail */}
        {scale < 1 && (
          <div className="w-full max-w-[420px] flex items-center justify-between px-1 mb-2 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-cyan-300 uppercase tracking-wider text-[11px]">
                Preview Dokumen A4
              </span>
              <span className="px-1.5 py-0.5 text-[9px] bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 rounded-full">
                Fit {Math.round(scale * 100)}%
              </span>
            </div>
            {onOpenPreview && (
              <button
                type="button"
                onClick={onOpenPreview}
                className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
                id="btn-open-preview-from-inline-header"
                title="Buka Preview Dokumen Layar Penuh"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Buka Preview</span>
              </button>
            )}
          </div>
        )}

        {/* Responsive wrapper maintaining exact A4 proportions without horizontal overflow */}
        <div
          className="relative flex justify-center items-start mx-auto transition-[width,height] duration-75"
          style={{
            width: scale < 1 ? `${scaledWidth}px` : '794px',
            height: scale < 1 ? `${page1ScaledHeight}px` : 'auto',
            maxWidth: '100%',
          }}
        >
          <div
            ref={paper1Ref}
            id="a4-document-paper"
            onClick={(e) => {
              // Direct tap on paper focuses editor and positions caret at the end
              if (editorRef.current && (e.target === paper1Ref.current || e.target === e.currentTarget)) {
                editorRef.current.focus();
                const sel = window.getSelection();
                if (sel) {
                  const range = document.createRange();
                  range.selectNodeContents(editorRef.current);
                  range.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
              }
            }}
            className={`
              bg-white text-slate-900 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-sm box-border overflow-hidden
              font-sans text-xs md:text-sm leading-relaxed transition-all cursor-text
              ${scale >= 1 ? 'w-[210mm] max-w-full min-h-[297mm]' : ''}
            `}
            style={{
              position: scale < 1 ? 'absolute' : 'relative',
              top: 0,
              left: 0,
              width: `${A4_BASE_WIDTH}px`,
              minHeight: `${A4_BASE_HEIGHT}px`,
              paddingTop: '0px',
              paddingBottom: '2cm',
              paddingLeft: '3cm',
              paddingRight: '3cm',
              transform: scale < 1 ? `scale(${scale})` : 'none',
              transformOrigin: 'top left',
              boxSizing: 'border-box',
              touchAction: 'manipulation',
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
              onCompositionEnd={handleInput}
              onKeyUp={handleInput}
              onBlur={handleInput}
              tabIndex={0}
              data-placeholder="Ketuk di sini untuk mulai mengetik atau tempel (paste) teks Berita Acara..."
              className="
                w-full min-h-[650px] outline-hidden focus:ring-0 cursor-text prose prose-sm max-w-none text-slate-900 leading-normal select-text
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table[border='1']_th]:border [&_table[border='1']_th]:border-slate-400 [&_th]:p-2 [&_th]:bg-slate-100 [&_th]:font-bold [&_table[border='1']_td]:border [&_table[border='1']_td]:border-slate-300 [&_td]:p-2
                [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2
                empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:italic empty:before:pointer-events-none
              "
              style={{
                userSelect: 'text',
                WebkitUserSelect: 'text',
                touchAction: 'manipulation',
              }}
              id="rich-text-editor-body"
            />
          </div>
        </div>
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
          className="w-full flex flex-col items-center justify-center overflow-x-hidden"
          id="inline-a4-page2-container"
        >
          <div
            className="relative flex justify-center items-start mx-auto transition-[width,height] duration-75"
            style={{
              width: scale < 1 ? `${scaledWidth}px` : '794px',
              height: scale < 1 ? `${page2ScaledHeight}px` : 'auto',
              maxWidth: '100%',
            }}
          >
            <div
              ref={paper2Ref}
              id="a4-images-paper"
              className={`
                bg-white text-slate-900 shadow-[0_10px_40px_rgba(0,0,0,0.6)] rounded-sm box-border
                font-sans text-xs md:text-sm leading-relaxed transition-all
                ${scale >= 1 ? 'w-[210mm] max-w-full min-h-[297mm]' : ''}
              `}
              style={{
                position: scale < 1 ? 'absolute' : 'relative',
                top: 0,
                left: 0,
                width: `${A4_BASE_WIDTH}px`,
                minHeight: `${A4_BASE_HEIGHT}px`,
                paddingTop: '2.5cm',
                paddingBottom: '2.5cm',
                paddingLeft: '3cm',
                paddingRight: '3cm',
                transform: scale < 1 ? `scale(${scale})` : 'none',
                transformOrigin: 'top left',
                boxSizing: 'border-box',
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
                      className="relative group border-0 p-1 bg-transparent flex flex-col items-center text-center transition-all box-border"
                      style={itemStyle}
                    >
                      {/* Gambar Utama (Tampil langsung tanpa border / kotak) */}
                      <div className="w-full flex justify-center bg-transparent p-0 overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.caption || `Lampiran ${index + 1}`}
                          className="max-h-[260px] max-w-full w-auto h-auto object-contain block mx-auto"
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

                      {/* Toolbar Edit Gambar Interaktif */}
                      <div className="no-print mt-3 pt-2.5 border-t border-slate-300 w-full flex flex-col gap-2 bg-slate-100/90 p-2 rounded-md border border-slate-300">
                        {/* Row 1: Alignment & Resize controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          {/* Alignment Controls */}
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

                          {/* Resize Controls */}
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
