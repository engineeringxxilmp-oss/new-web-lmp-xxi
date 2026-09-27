/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg'
}: ModalProps) {
  const widthClasses = {
    sm: 'max-w-xl',
    md: 'max-w-3xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    '3xl': 'max-w-[92vw]',
    '4xl': 'max-w-[96vw]',
    '5xl': 'max-w-[98vw]',
    full: 'max-w-[99vw] w-[99vw]'
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto my-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={onClose}
            id="modal-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className={`relative w-full ${widthClasses[maxWidth]} my-auto overflow-hidden rounded-2xl bg-slate-900 text-slate-100 shadow-[0_0_60px_rgba(251,191,36,0.25)] border border-amber-500/50 z-10 flex flex-col ${
              maxWidth === 'full'
                ? 'h-[98vh] max-h-[98vh]'
                : 'max-h-[92vh] sm:max-h-[90vh]'
            }`}
            id="modal-card"
          >
            {/* Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0 z-20 shrink-0">
              <div className="flex items-center gap-3 text-amber-400 font-mono font-bold text-base sm:text-lg">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-inner">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24] block" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-wide" id="modal-title">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    Lippo Mall Puri XXI — Cinema Engineering System
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors border border-transparent hover:border-slate-700 active:scale-95"
                id="modal-close-btn"
                title="Tutup Modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content (Scrollable if needed) */}
            <div className={`flex-1 overflow-y-auto ${maxWidth === 'full' ? 'p-2 sm:p-4 flex flex-col' : 'p-6 sm:p-8'}`} id="modal-content">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
