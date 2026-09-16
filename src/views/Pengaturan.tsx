/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import db from '../db/localDb';

import { SystemBranding } from '../types';

interface PengaturanProps {
  branding?: SystemBranding;
  onUpdateBranding?: (branding: SystemBranding) => void;
  onImportSuccess: () => void;
}

export default function Pengaturan({ onImportSuccess }: PengaturanProps) {
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // --- DATABASE EXPORT ---
  const handleDownloadBackup = () => {
    const backupJson = db.exportBackupData();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NSR014_Cinema_XXI_Lippo_Mall_Puri_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- DATABASE RESTORE ---
  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = db.importRestoreData(content);
      if (success) {
        setRestoreStatus({
          type: 'success',
          msg: 'Database berhasil di-restore! Semua data telah sinkron.'
        });
        onImportSuccess();
      } else {
        setRestoreStatus({
          type: 'error',
          msg: 'Format file backup tidak valid. Pastikan file berupa JSON backup resmi.'
        });
      }
      setTimeout(() => setRestoreStatus(null), 6000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto" id="settings-tab-view">
      
      {/* Tab intro */}
      <div className="bg-[#0d1322]/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              Manajemen Database
            </h2>
            <p className="text-sm md:text-base text-slate-200 mt-1 font-sans font-medium">
              Lakukan pencadangan (backup) dan pemulihan (restore) data sistem secara aman dan terstruktur.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Database Backup Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-700 border border-blue-200">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight font-sans">
                  Backup Database
                </h3>
                <span className="text-xs font-mono font-bold text-slate-500">EXPORTS: DATA_BACKUP.JSON</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-800 font-medium leading-relaxed">
              Unduh salinan arsip cadangan resmi dari database sistem. Seluruh area, equipment, PR engineering, order barang, riwayat pemeliharaan, dan data operasional akan diekspor dalam format file <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-xs border border-slate-300">.json</code>.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-800 font-semibold leading-normal">
                Disarankan melakukan backup secara berkala sebelum melakukan perubahan data berskala besar.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm md:text-base py-4 shadow-md transition-all active:scale-[0.99] cursor-pointer"
            id="btn-backup-download"
          >
            <Download className="w-5 h-5 text-cyan-400" /> Download Backup Database JSON
          </button>
        </div>

        {/* Database Restore Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 border border-emerald-200">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight font-sans">
                  Restore Database
                </h3>
                <span className="text-xs font-mono font-bold text-slate-500">IMPORTS: DATA_RESTORE.JSON</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-800 font-medium leading-relaxed">
              Pulihkan database ke kondisi sebelumnya dengan mengunggah file backup <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold text-xs border border-slate-300">.json</code> resmi. Tindakan ini akan <strong className="text-rose-700 font-black">mengganti seluruh database aktif</strong> secara instan.
            </p>

            {restoreStatus && (
              <div className={`p-4 rounded-xl border text-sm leading-normal font-bold flex items-center gap-2 ${
                restoreStatus.type === 'success'
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                  : 'bg-rose-100 text-rose-950 border-rose-300'
              }`}>
                {restoreStatus.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
                )}
                <span>{restoreStatus.msg}</span>
              </div>
            )}
          </div>

          <label className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-sm md:text-base py-4 shadow-md transition-all active:scale-[0.99] cursor-pointer text-center">
            <Upload className="w-5 h-5 text-white" /> Upload &amp; Restore Database JSON
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreUpload}
              className="hidden"
              id="restore-file-input"
            />
          </label>
        </div>

      </div>
    </div>
  );
}

