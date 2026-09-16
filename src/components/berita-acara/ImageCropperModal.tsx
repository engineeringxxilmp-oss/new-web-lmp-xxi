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
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-[#0d1322] border border-cyan-500/50 rounded-2xl w-full max-w-2xl p-4 md:p-6 text-white shadow-[0_0_40px_rgba(0,240,255,0.25)] flex flex-col space-y-4 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-cyan-400" />
            <h3 className="font-extrabold text-sm md:text-base text-cyan-300 font-mono tracking-wider uppercase">
              POTONG / CROP GAMBAR
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Stage Area */}
        <div className="relative w-full h-[320px] md:h-[380px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
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
        <div className="space-y-3 bg-[#070c1a] p-3 rounded-xl border border-slate-800 text-xs font-mono">
          
          {/* Aspect Ratio Selector */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-slate-400 font-bold">Rasio Potong:</span>
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
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer transition-all ${
                    aspect === item.value
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders: Zoom & Rotation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <ZoomIn className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-400 min-w-12">Zoom:</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.05}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-slate-300 w-8 text-right font-bold">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-400 min-w-12">Rotasi:</span>
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                +90° ({rotation}°)
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={isProcessing}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-mono font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isProcessing ? 'Memotong...' : 'Terapkan Hasil Potong'}
          </button>
        </div>

      </div>
    </div>
  );
}
