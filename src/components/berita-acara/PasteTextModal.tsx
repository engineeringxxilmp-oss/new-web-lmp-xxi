/**
 * Modal untuk Menempelkan Teks / Tabel dari Word, Excel, WhatsApp, atau Catatan
 * dengan pembersihan otomatis (Auto Sanitizer) agar rapi & sesuai standar XXI.
 */

import React, { useState } from 'react';
import { ClipboardCheck, X, Sparkles, Table, FileText, CheckCircle2 } from 'lucide-react';
import { sanitizeAndFormatPastedContent, convertTsvToTable } from '../../lib/pasteSanitizer';

interface PasteTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertContent: (cleanHtml: string, isReplaceAll: boolean) => void;
}

export default function PasteTextModal({
  isOpen,
  onClose,
  onInsertContent
}: PasteTextModalProps) {
  const [inputText, setInputText] = useState('');
  const [isReplaceAll, setIsReplaceAll] = useState(false);

  if (!isOpen) return null;

  const cleanPreviewHtml = sanitizeAndFormatPastedContent('', inputText);
  const isTableDetected = inputText.includes('\t');

  const handleApply = () => {
    if (!inputText.trim()) return;
    onInsertContent(cleanPreviewHtml, isReplaceAll);
    setInputText('');
    onClose();
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
      }
    } catch (err) {
      console.warn('Cannot read clipboard via API:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl w-full max-w-3xl shadow-[0_0_60px_rgba(251,191,36,0.25)] text-white overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-950 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl border border-amber-500/40 text-amber-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2">
                Tempel Teks Berita Acara
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Salin teks dari Word, Excel, atau WhatsApp, lalu tempel di sini untuk dimasukkan ke editor.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 font-mono text-xs">
          
          {/* Quick Paste Button Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Tempelkan (Paste) Teks atau Tabel di Kolom Bawah:</span>
            </span>

            <button
              onClick={handlePasteClipboard}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              type="button"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Tempel dari Clipboard</span>
            </button>
          </div>

          {/* Textarea Input */}
          <div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tempelkan isi Berita Acara atau tabel barang dari Excel/Word/WhatsApp di sini..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-amber-400/80 text-white text-xs font-mono placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all leading-relaxed shadow-inner"
            />
          </div>

          {/* Detection Info */}
          {isTableDetected && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2 text-emerald-300 font-mono text-xs">
              <Table className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                <strong>Tabel Terdeteksi!</strong> Teks bertabulasi dari Excel akan dikonversi menjadi tabel standar Berita Acara XXI.
              </span>
            </div>
          )}

          {/* Live Clean Preview Box */}
          {inputText.trim() && (
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>PREVIEW TEKS BERSIH:</span>
              </label>

              <div className="bg-white text-slate-900 p-4 rounded-xl border border-slate-300 max-h-48 overflow-y-auto font-sans leading-relaxed text-xs shadow-inner">
                <div dangerouslySetInnerHTML={{ __html: cleanPreviewHtml }} />
              </div>
            </div>
          )}

          {/* Insertion Mode Option */}
          <div className="flex items-center gap-5 pt-3 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium select-none">
              <input
                type="radio"
                name="insertMode"
                checked={!isReplaceAll}
                onChange={() => setIsReplaceAll(false)}
                className="accent-amber-400 h-4 w-4 cursor-pointer"
              />
              <span>Sisipkan di posisi teks/kursor aktif</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-amber-400 font-medium select-none">
              <input
                type="radio"
                name="insertMode"
                checked={isReplaceAll}
                onChange={() => setIsReplaceAll(true)}
                className="accent-amber-400 h-4 w-4 cursor-pointer"
              />
              <span>Ganti seluruh isi dokumen saat ini</span>
            </label>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer border border-slate-700 active:scale-95"
            type="button"
          >
            Batal
          </button>

          <button
            onClick={handleApply}
            disabled={!inputText.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black font-mono text-xs rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95"
            type="button"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Terapkan ke Dokumen</span>
          </button>
        </div>

      </div>
    </div>
  );
}
