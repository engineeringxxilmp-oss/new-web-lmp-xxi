/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { Crop, ZoomIn, RotateCw, Check, X, RefreshCw } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('Cropped canvas 2D context tidak tersedia.');
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return croppedCanvas.toDataURL('image/jpeg', 0.95);
}

export default function ImageCropperModal({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined); // undefined = free
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(croppedImage);
      onClose();
    } catch (e) {
      console.error('Error cropping image:', e);
      alert('Gagal memotong gambar.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl w-full max-w-2xl text-white shadow-[0_0_60px_rgba(251,191,36,0.25)] flex flex-col my-auto overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-950 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Crop className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm md:text-base text-amber-400 font-mono tracking-wider uppercase">
              POTONG / CROP GAMBAR
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Crop Stage Area */}
          <div className="relative w-full h-[320px] md:h-[380px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaChange}
              objectFit="contain"
            />
          </div>

          {/* Controls Bar */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono">
            
            {/* Aspect Ratio Selector */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Rasio Potong:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: 'Bebas (Free)', value: undefined },
                  { label: '1:1 (Persegi)', value: 1 },
                  { label: '4:3 (Standar)', value: 4 / 3 },
                  { label: '3:4 (Potret)', value: 3 / 4 },
                  { label: '16:9 (Wide)', value: 16 / 9 },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAspect(item.value)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      aspect === item.value
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Zoom & Rotation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-400 min-w-12 text-[11px] font-bold">Zoom:</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.05}
                  aria-label="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="text-amber-400 w-9 text-right font-bold">{Math.round(zoom * 100)}%</span>
              </div>

              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-400 min-w-12 text-[11px] font-bold">Rotasi:</span>
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-amber-400 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  +90° ({rotation}°)
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-mono font-black text-xs rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.35)] flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            {isProcessing ? 'Memotong...' : 'Terapkan Hasil Potong'}
          </button>
        </div>

      </div>
    </div>
  );
}
