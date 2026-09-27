/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Trash2, AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown, Crop } from 'lucide-react';
import ImageCropperModal from './ImageCropperModal';

export interface UploadedImage {
  id: string;
  url: string;
  caption?: string;
  widthPercent?: number; // 25, 33, 50, 66, 75, 100
  align?: 'left' | 'center' | 'right';
}

/**
 * Membagi daftar gambar ke dalam halaman-halaman A4 lampiran secara proporsional.
 * Menghitung batas maksimum 2 baris foto per halaman A4 untuk menjaga aspect ratio
 * dan mencegah foto tertekan / gepeng.
 */
export function chunkImagesIntoPages(images: UploadedImage[]): UploadedImage[][] {
  if (!images || images.length === 0) return [];

  const pages: UploadedImage[][] = [];
  let currentPage: UploadedImage[] = [];
  let currentRowUsedWidth = 0;
  let totalRowsOnPage = 0;

  for (const img of images) {
    const rawPct = img.widthPercent || 48;
    let slotWidth = 50;
    if (rawPct >= 65) {
      slotWidth = 100;
    } else if (rawPct >= 40) {
      slotWidth = 50;
    } else if (rawPct >= 28) {
      slotWidth = 33.33;
    } else {
      slotWidth = 25;
    }

    const fitsOnCurrentRow = (currentRowUsedWidth + slotWidth) <= 102;

    if (fitsOnCurrentRow && totalRowsOnPage > 0) {
      currentRowUsedWidth += slotWidth;
      currentPage.push(img);
    } else {
      const wouldBeRowNumber = totalRowsOnPage + 1;
      if (wouldBeRowNumber > 2 && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [img];
        currentRowUsedWidth = slotWidth;
        totalRowsOnPage = 1;
      } else {
        currentPage.push(img);
        currentRowUsedWidth = slotWidth;
        totalRowsOnPage = wouldBeRowNumber;
      }
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onAddImage: (img: UploadedImage) => void;
  onRemoveImage: (id: string) => void;
  onUpdateImage: (img: UploadedImage) => void;
  onReorderImages?: (newImages: UploadedImage[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageUploader({
  images,
  onAddImage,
  onRemoveImage,
  onUpdateImage,
  onReorderImages,
  isOpen,
  onClose
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [captionInput, setCaptionInput] = useState('');
  const [widthInput, setWidthInput] = useState<number>(48);
  const [alignInput, setAlignInput] = useState<'left' | 'center' | 'right'>('center');
  const [croppingTarget, setCroppingTarget] = useState<UploadedImage | null>(null);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (url) {
        const newImg: UploadedImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          url,
          caption: captionInput.trim(),
          widthPercent: widthInput,
          align: alignInput
        };
        onAddImage(newImg);
        setCaptionInput('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl w-full max-w-xl text-white shadow-[0_0_60px_rgba(251,191,36,0.25)] my-auto overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-950 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-amber-400 font-mono tracking-wider uppercase">
              TAMBAH & KELOLA GAMBAR DOKUMEN
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3
              ${isDragging
                ? 'border-amber-400 bg-amber-950/40 scale-[1.01]'
                : 'border-slate-700 bg-slate-950 hover:border-amber-500/50 hover:bg-slate-900/60'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-3.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-300 font-mono">
                Klik atau Seret (Drag & Drop) File Gambar di sini
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Format yang didukung: PNG, JPG, JPEG, WEBP (Dokumentasi fisik / foto barang)
              </p>
            </div>
          </div>

          {/* Setting options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-slate-400 mb-1 font-bold text-[11px] uppercase tracking-wider">Ukuran (Lebar / Grid):</label>
              <div className="flex items-center gap-1">
                {[
                  { label: '25%', value: 25 },
                  { label: '33% (3 Kolom)', value: 33 },
                  { label: '48% (2 Kolom)', value: 48 },
                  { label: '100%', value: 100 }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setWidthInput(item.value)}
                    className={`flex-1 py-1 rounded-lg text-[9px] font-bold border cursor-pointer transition-all ${
                      widthInput === item.value
                        ? 'bg-amber-500 border-amber-400 text-slate-950 font-black'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold text-[11px] uppercase tracking-wider">Posisi (Rata):</label>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setAlignInput('left')}
                  className={`flex-1 py-1 flex justify-center items-center rounded text-[10px] font-bold border cursor-pointer transition-all ${
                    alignInput === 'left' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                  title="Rata Kiri"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setAlignInput('center')}
                  className={`flex-1 py-1 flex justify-center items-center rounded text-[10px] font-bold border cursor-pointer transition-all ${
                    alignInput === 'center' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                  title="Rata Tengah"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setAlignInput('right')}
                  className={`flex-1 py-1 flex justify-center items-center rounded text-[10px] font-bold border cursor-pointer transition-all ${
                    alignInput === 'right' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                  title="Rata Kanan"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold text-[11px] uppercase tracking-wider">Keterangan Foto (Caption):</label>
              <input
                type="text"
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                placeholder="Contoh: Lampiran Foto Alat Rusak..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Existing Uploaded Images List */}
          {images.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Daftar Gambar Terpasang ({images.length})
              </h4>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <img
                        src={img.url}
                        alt={img.caption}
                        className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0 bg-slate-900"
                      />
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={img.caption || ''}
                          onChange={(e) =>
                            onUpdateImage({ ...img, caption: e.target.value })
                          }
                          placeholder="Ubah keterangan..."
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-200 text-xs font-medium focus:border-amber-500 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                          <span>Lebar: {img.widthPercent || 75}%</span>
                          <span>•</span>
                          <span className="capitalize">Posisi: {img.align || 'center'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center justify-end gap-1.5 shrink-0 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
                      {/* Crop Button */}
                      <button
                        type="button"
                        onClick={() => setCroppingTarget(img)}
                        className="p-1 px-1.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-amber-400 hover:bg-slate-700 flex items-center gap-1 cursor-pointer font-bold transition-all"
                        title="Potong / Crop Gambar"
                      >
                        <Crop className="w-3 h-3" />
                        <span>Crop</span>
                      </button>

                      <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                      {/* Position / Align */}
                      <button
                        type="button"
                        onClick={() => onUpdateImage({ ...img, align: 'left' })}
                        className={`p-1 rounded text-[10px] cursor-pointer ${
                          (img.align || 'center') === 'left' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Rata Kiri"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateImage({ ...img, align: 'center' })}
                        className={`p-1 rounded text-[10px] cursor-pointer ${
                          (img.align || 'center') === 'center' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Rata Tengah"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateImage({ ...img, align: 'right' })}
                        className={`p-1 rounded text-[10px] cursor-pointer ${
                          (img.align || 'center') === 'right' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Rata Kanan"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                      {/* Size Selector */}
                      <select
                        value={img.widthPercent || 75}
                        onChange={(e) =>
                          onUpdateImage({ ...img, widthPercent: Number(e.target.value) })
                        }
                        className="bg-slate-800 text-slate-200 border border-slate-700 rounded text-[10px] px-1 py-0.5"
                      >
                        <option value={25}>25%</option>
                        <option value={33}>33%</option>
                        <option value={50}>50%</option>
                        <option value={66}>66%</option>
                        <option value={75}>75%</option>
                        <option value={100}>100%</option>
                      </select>

                      <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                      {/* Reorder Up / Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Geser Ke Atas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'down')}
                        disabled={idx === images.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Geser Ke Bawah"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                      <button
                        onClick={() => onRemoveImage(img.id)}
                        className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded transition-colors cursor-pointer"
                        title="Hapus Gambar"
                        type="button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono font-black text-xs rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all cursor-pointer active:scale-95"
          >
            Selesai
          </button>
        </div>

      </div>

      {/* Image Cropper Modal */}
      {croppingTarget && (
        <ImageCropperModal
          imageSrc={croppingTarget.url}
          isOpen={!!croppingTarget}
          onClose={() => setCroppingTarget(null)}
          onCropComplete={(croppedUrl) => {
            onUpdateImage({ ...croppingTarget, url: croppedUrl });
            setCroppingTarget(null);
          }}
        />
      )}
    </div>
  );
}
