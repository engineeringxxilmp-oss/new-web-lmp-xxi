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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0c1427] border border-cyan-500/40 rounded-2xl w-full max-w-3xl shadow-[0_0_50px_rgba(0,240,255,0.2)] text-white overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#070c1a] border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950 rounded-xl border border-cyan-500/30 text-cyan-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Tempel & Rapikan Isi Berita Acara
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                  Auto Sanitizer XXI
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Salin teks dari Word, Excel, atau WhatsApp, lalu tempel di sini. Sistem akan otomatis membersihkan background hitam & merapikan tabel.
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
        <div className="p-4 overflow-y-auto space-y-4 flex-1 font-sans text-xs">
          
          {/* Quick Paste Button Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#070d1e] p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Tempelkan (Paste) Teks atau Tabel di Kolom Bawah:</span>
            </span>

            <button
              onClick={handlePasteClipboard}
              className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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
              className="w-full bg-[#070c1a] border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-white font-mono text-xs focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* Detection Info */}
          {isTableDetected && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-2.5 flex items-center gap-2 text-emerald-300 font-mono text-[11px]">
              <Table className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                <strong>Tabel Terdeteksi!</strong> Teks bertabulasi dari Excel akan dikonversi menjadi tabel standar Berita Acara XXI.
              </span>
            </div>
          )}

          {/* Live Clean Preview Box */}
          {inputText.trim() && (
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold flex items-center gap-1.5 text-[11px]">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>HASIL HASIL RAPI PADA DOKUMEN A4:</span>
              </label>

              <div className="bg-white text-slate-900 p-4 rounded-xl border border-slate-300 max-h-48 overflow-y-auto font-sans leading-relaxed text-xs shadow-inner">
                <div dangerouslySetInnerHTML={{ __html: cleanPreviewHtml }} />
              </div>
            </div>
          )}

          {/* Insertion Mode Option */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium select-none">
              <input
                type="radio"
                name="insertMode"
                checked={!isReplaceAll}
                onChange={() => setIsReplaceAll(false)}
                className="accent-cyan-400"
              />
              <span>Sisipkan di posisi teks/kursor aktif</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-amber-300 font-medium select-none">
              <input
                type="radio"
                name="insertMode"
                checked={isReplaceAll}
                onChange={() => setIsReplaceAll(true)}
                className="accent-amber-400"
              />
              <span>Ganti seluruh isi dokumen saat ini</span>
            </label>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-[#070c1a] border-t border-slate-800 p-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer"
            type="button"
          >
            Batal
          </button>

          <button
            onClick={handleApply}
            disabled={!inputText.trim()}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-xl border border-cyan-400/40 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
