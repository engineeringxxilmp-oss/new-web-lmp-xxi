/**
 * Modal untuk Mengatur Penandatangan (TTD) Berita Acara
 * Mendukung penambahan, penghapusan, pengubahan nama/jabatan,
 * dan penyelarasan otomatis dengan header "Mengetahui,".
 */

import React, { useState, useEffect } from 'react';
import { FileSignature, X, Plus, Trash2, CheckCircle2, UserPlus, ArrowUp, ArrowDown } from 'lucide-react';

export interface SigneeItem {
  id: string;
  header: string; // e.g. "Mengetahui,"
  name: string;   // e.g. "...................................." or "Budi Santoso"
  role: string;   // e.g. "Teknisi Engineering", "Chief Engineering", "Manager Cinema XXI"
}

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocumentHtml: string;
  onApplySignatures: (newSignaturesHtml: string) => void;
}

const DEFAULT_SIGNEES: SigneeItem[] = [
  { id: '1', header: 'Mengetahui,', name: '....................................', role: 'Teknisi Engineering' },
  { id: '2', header: 'Mengetahui,', name: '....................................', role: 'Chief Engineering' },
  { id: '3', header: 'Mengetahui,', name: '....................................', role: 'Manager Cinema XXI' }
];

export default function SignatureModal({
  isOpen,
  onClose,
  currentDocumentHtml,
  onApplySignatures
}: SignatureModalProps) {
  const [signees, setSignees] = useState<SigneeItem[]>(DEFAULT_SIGNEES);

  // Parse current signature table from HTML if available
  useEffect(() => {
    if (!isOpen) return;

    if (currentDocumentHtml) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentDocumentHtml, 'text/html');
        // Find table that has signature lines or Mengetahui/Dibuat/Diperiksa/Disetujui
        const tables = doc.querySelectorAll('table');
        let foundSigTable: HTMLTableElement | null = null;

        tables.forEach((table) => {
          const text = table.textContent || '';
          if (
            text.includes('Mengetahui') ||
            text.includes('Dibuat Oleh') ||
            text.includes('Teknisi Engineering') ||
            text.includes('Chief Engineering') ||
            text.includes('Manager Cinema')
          ) {
            foundSigTable = table as HTMLTableElement;
          }
        });

        if (foundSigTable) {
          const cells = (foundSigTable as HTMLTableElement).querySelectorAll('td');
          if (cells.length > 0) {
            const parsedSignees: SigneeItem[] = [];
            cells.forEach((cell, idx) => {
              const paragraphs = cell.querySelectorAll('p');
              let header = 'Mengetahui,';
              let name = '....................................';
              let role = 'Jabatan / Posisi';

              if (paragraphs.length >= 2) {
                header = paragraphs[0].textContent?.trim() || 'Mengetahui,';
                const p2 = paragraphs[1];
                const innerHtml = p2.innerHTML || '';
                // Split by <br> or line breaks
                const parts = innerHtml.split(/<br\s*\/?>/i);
                if (parts.length >= 2) {
                  const tmpDiv = document.createElement('div');
                  tmpDiv.innerHTML = parts[0];
                  name = tmpDiv.textContent?.replace(/[()]/g, '').trim() || '....................................';

                  tmpDiv.innerHTML = parts[1];
                  role = tmpDiv.textContent?.trim() || 'Jabatan / Posisi';
                } else {
                  role = p2.textContent?.trim() || 'Jabatan / Posisi';
                }
              } else {
                const lines = cell.textContent?.split('\n').map((l) => l.trim()).filter(Boolean) || [];
                if (lines.length > 0) header = lines[0];
                if (lines.length > 1) role = lines[lines.length - 1];
              }

              // Standardize header to "Mengetahui," if it was "Dibuat Oleh", "Diperiksa Oleh", etc.
              if (
                header.includes('Dibuat') ||
                header.includes('Diperiksa') ||
                header.includes('Disetujui')
              ) {
                header = 'Mengetahui,';
              }

              parsedSignees.push({
                id: `parsed-${idx}-${Date.now()}`,
                header: header || 'Mengetahui,',
                name: name || '....................................',
                role: role || 'Jabatan / Posisi'
              });
            });

            if (parsedSignees.length > 0) {
              setSignees(parsedSignees);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Could not parse signatures from document HTML:', err);
      }
    }

    // Default fallback
    setSignees(DEFAULT_SIGNEES);
  }, [isOpen, currentDocumentHtml]);

  if (!isOpen) return null;

  const handleAddSignee = () => {
    const newId = `sig-${Date.now()}`;
    setSignees([
      ...signees,
      {
        id: newId,
        header: 'Mengetahui,',
        name: '....................................',
        role: 'Jabatan Baru'
      }
    ]);
  };

  const handleRemoveSignee = (id: string) => {
    if (signees.length <= 1) {
      alert('Minimal harus ada 1 penandatangan.');
      return;
    }
    setSignees(signees.filter((item) => item.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= signees.length) return;

    const newArr = [...signees];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setSignees(newArr);
  };

  const handleChange = (id: string, field: keyof SigneeItem, value: string) => {
    setSignees(
      signees.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleApply = () => {
    if (signees.length === 0) return;

    const widthPercent = Math.floor(100 / signees.length);

    let html = `<table border="0" style="width: 100%; border: none; margin-top: 35px; text-align: center;">\n  <tbody>\n    <tr>\n`;

    signees.forEach((item) => {
      const displayName = item.name.trim() || '....................................';
      const formattedName = displayName.startsWith('(') ? displayName : `( ${displayName} )`;

      html += `      <td style="width: ${widthPercent}%; border: none; vertical-align: top;">\n`;
      html += `        <p><strong>${item.header || 'Mengetahui,'}</strong></p>\n`;
      html += `        <br><br><br>\n`;
      html += `        <p><u>${formattedName}</u><br>${item.role || ''}</p>\n`;
      html += `      </td>\n`;
    });

    html += `    </tr>\n  </tbody>\n</table>`;

    onApplySignatures(html);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0c1427] border border-cyan-500/40 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] text-white overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-[#070c1a] border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950 rounded-xl border border-cyan-500/30 text-cyan-400">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Atur Penandatangan Berita Acara
                <span className="text-[10px] bg-cyan-950 text-cyan-300 font-mono px-2 py-0.5 rounded border border-cyan-500/30">
                  {signees.length} Orang
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tambah, hapus, atau ubah posisi & jabatan orang yang bertanda tangan. Semua kolom menggunakan header standar <strong className="text-cyan-300">"Mengetahui,"</strong>.
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
        <div className="p-4 overflow-y-auto space-y-3 flex-1 font-sans text-xs">
          
          <div className="flex items-center justify-between gap-2 bg-[#070d1e] p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-300 font-medium text-xs">
              Daftar Kolom Tanda Tangan:
            </span>

            <button
              onClick={handleAddSignee}
              className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              type="button"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Penandatangan</span>
            </button>
          </div>

          {/* Signees List */}
          <div className="space-y-3">
            {signees.map((item, index) => (
              <div
                key={item.id}
                className="bg-[#070c1a] border border-slate-800 hover:border-slate-700 p-3 rounded-xl flex flex-col md:flex-row items-stretch md:items-center gap-3 transition-colors"
              >
                {/* Index / Reorder Buttons */}
                <div className="flex md:flex-col items-center justify-between md:justify-center gap-1 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800 shrink-0">
                  <span className="font-mono text-cyan-400 font-bold text-xs px-1">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-300 disabled:opacity-30 cursor-pointer"
                      title="Geser Kiri / Ke Atas"
                      type="button"
                    >
                      <ArrowUp className="w-3.5 h-3.5 md:hidden" />
                      <ArrowUp className="w-3.5 h-3.5 hidden md:block" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === signees.length - 1}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-300 disabled:opacity-30 cursor-pointer"
                      title="Geser Kanan / Ke Bawah"
                      type="button"
                    >
                      <ArrowDown className="w-3.5 h-3.5 md:hidden" />
                      <ArrowDown className="w-3.5 h-3.5 hidden md:block" />
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      Label Atas
                    </label>
                    <input
                      type="text"
                      value={item.header}
                      onChange={(e) => handleChange(item.id, 'header', e.target.value)}
                      placeholder="Mengetahui,"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      Jabatan / Posisi
                    </label>
                    <input
                      type="text"
                      value={item.role}
                      onChange={(e) => handleChange(item.id, 'role', e.target.value)}
                      placeholder="e.g. Chief Engineering"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">
                      Nama (Opsional)
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleChange(item.id, 'name', e.target.value)}
                      placeholder="...................................."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveSignee(item.id)}
                  disabled={signees.length <= 1}
                  className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded-lg transition-colors cursor-pointer disabled:opacity-30 shrink-0 self-end md:self-center"
                  title="Hapus Penandatangan Ini"
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-[#070c1a] border-t border-slate-800 p-4 flex items-center justify-between gap-3">
          <button
            onClick={handleAddSignee}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah TTD</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer"
              type="button"
            >
              Batal
            </button>

            <button
              onClick={handleApply}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-xl border border-cyan-400/40 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer flex items-center gap-2"
              type="button"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan Tanda Tangan</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
