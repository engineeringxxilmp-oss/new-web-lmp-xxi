/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Hapus',
  message = 'Yakin ingin menghapus data ini?'
}: ConfirmDialogProps) {
  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={onClose}
            id="confirm-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-900 p-6 sm:p-7 shadow-[0_0_60px_rgba(244,63,94,0.25)] border-2 border-rose-500/50 text-slate-100 z-10 my-auto"
            id="confirm-dialog-card"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-rose-300 transition-colors rounded-xl p-1.5 hover:bg-slate-800 cursor-pointer"
              id="confirm-close-btn"
              title="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-2xl bg-rose-500/15 border border-rose-500/40 p-3 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono tracking-wide uppercase" id="confirm-title">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed font-sans" id="confirm-msg">
                  {message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-7 flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all cursor-pointer active:scale-95"
                id="confirm-cancel-btn"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer border border-rose-400/40 active:scale-95"
                id="confirm-action-btn"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(dialogContent, document.body);
}
