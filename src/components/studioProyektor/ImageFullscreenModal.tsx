/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';

interface ImageFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  subtitle?: string;
}

export default function ImageFullscreenModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle
}: ImageFullscreenModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initX: 0, initY: 0 });

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(3.5, z + 0.25));
      else if (e.key === '-' || e.key === '_') setZoom((z) => Math.max(0.5, z - 0.25));
      else if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); setRotation(0); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="h-14 px-4 sm:px-6 bg-[#080d1a]/95 border-b border-cyan-500/30 flex items-center justify-between shrink-0 z-10 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 pr-4">
          <p className="text-white font-mono font-bold text-sm sm:text-base truncate">{title}</p>
          {subtitle && (
            <p className="text-cyan-400 font-mono text-xs truncate mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-cyan-300 font-bold px-2 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setRotation(0); }}
              className={`px-2.5 py-0.5 rounded text-xs font-mono transition cursor-pointer ${
                zoom === 1 && rotation === 0
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Reset Zoom"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              title="Putar 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
            <span>Tutup</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        className="flex-1 w-full min-h-0 relative overflow-hidden flex items-center justify-center p-4 cursor-default"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY, initX: pan.x, initY: pan.y });
        }}
        onMouseMove={(e) => {
          if (!isDragging) return;
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          setPan({ x: dragStart.initX + dx, y: dragStart.initY + dy });
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        style={{
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.08) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px'
        }}
      >
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out select-none"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            draggable={false}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl select-none pointer-events-none"
          />
        </div>

        {/* Floating Help Badge */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1 rounded-full text-[11px] font-mono text-slate-300 shadow-xl">
            <span className="text-cyan-400 font-semibold">+ / - Zoom</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-300 font-semibold">Drag Geser</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-300">Esc Tutup</span>
          </div>
        </div>
      </div>
    </div>
  );
}
