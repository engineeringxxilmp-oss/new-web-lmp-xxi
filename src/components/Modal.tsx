/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto my-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm"
            onClick={onClose}
            id="modal-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className={`relative w-full ${widthClasses[maxWidth]} my-auto overflow-hidden rounded-2xl bg-[#0a0f1d]/95 backdrop-blur-2xl text-slate-100 shadow-[0_0_60px_rgba(0,240,255,0.25)] border border-cyan-500/40 z-10 flex flex-col ${
              maxWidth === 'full'
                ? 'h-[98vh] max-h-[98vh]'
                : 'max-h-[92vh] sm:max-h-[90vh]'
            }`}
            id="modal-card"
          >
            {/* Header */}
            <div className="px-5 sm:px-7 py-3.5 border-b border-cyan-500/30 flex items-center justify-between bg-[#0f172a]/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#00f0ff] animate-pulse" />
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white font-sans tracking-tight drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]" id="modal-title">
                  {title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-slate-300 hover:text-cyan-300 transition-colors rounded-xl p-2 hover:bg-cyan-950/80 cursor-pointer border border-transparent hover:border-cyan-500/30"
                id="modal-close-btn"
                title="Tutup Modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content (Scrollable if needed) */}
            <div className={`flex-1 overflow-y-auto ${maxWidth === 'full' ? 'p-2 sm:p-4 flex flex-col' : 'p-4 sm:p-6 md:p-7'}`} id="modal-content">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
