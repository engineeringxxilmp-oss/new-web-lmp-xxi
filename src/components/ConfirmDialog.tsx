/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

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
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onClose}
            id="confirm-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0a0f1d] p-6 sm:p-7 shadow-[0_0_35px_rgba(244,63,94,0.2)] border border-rose-500/30 text-slate-100 z-10"
            id="confirm-dialog-card"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-rose-400 transition-colors rounded-xl p-1.5 hover:bg-rose-950/40 cursor-pointer"
              id="confirm-close-btn"
              title="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-2xl bg-rose-500/15 border border-rose-500/30 p-3 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-sans" id="confirm-title">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed font-sans" id="confirm-msg">
                  {message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors cursor-pointer"
                id="confirm-cancel-btn"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all cursor-pointer border border-rose-400/30"
                id="confirm-action-btn"
              >
                Ya, Hapus
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
