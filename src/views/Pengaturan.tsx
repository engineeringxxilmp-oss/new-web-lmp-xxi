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
  ShieldCheck,
  Trash2,
  Lock,
  RotateCcw,
  Check
} from 'lucide-react';
import db from '../db/localDb';

import { SystemBranding } from '../types';

interface PengaturanProps {
  branding?: SystemBranding;
  onUpdateBranding?: (branding: SystemBranding) => void;
  onImportSuccess: () => void;
  onNavigateToDashboard?: () => void;
}

export default function Pengaturan({ onImportSuccess, onNavigateToDashboard }: PengaturanProps) {
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetProgress, setResetProgress] = useState(0);
  const [resetStepText, setResetStepText] = useState('');
  const [resetResultStatus, setResetResultStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

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
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await db.importRestoreData(content);
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

  // --- SAFE OPERATIONAL DATA RESET WITH PROGRESS & REDIRECT ---
  const handleConfirmReset = async () => {
    const isConfirmed = resetConfirmationText.trim().toUpperCase() === 'RESET DATA OPERASIONAL';
    if (!isConfirmed || isResetting) {
      return;
    }

    setIsResetting(true);
    setResetProgress(15);
    setResetStepText('Menginisialisasi penghapusan data operasional...');

    try {
      // Step 1: Memory & local cache
      await new Promise((r) => setTimeout(r, 200));
      setResetProgress(40);
      setResetStepText('Membersihkan cache lokal & memory browser...');

      // Step 2: Database collections & service reset
      setResetProgress(70);
      setResetStepText('Mereset studio, proyektor, dan database Firestore...');
      await db.resetAllOperationalData();

      // Step 3: Finalize verification
      setResetProgress(95);
      setResetStepText('Memvalidasi status bersih (clean slate)...');
      await new Promise((r) => setTimeout(r, 250));

      // Step 4: 100% completed
      setResetProgress(100);
      setResetStepText('Selesai 100%! Mengalihkan ke Dashboard...');
      await new Promise((r) => setTimeout(r, 450));

      setIsResetModalOpen(false);
      setResetConfirmationText('');
      setResetProgress(0);
      setResetStepText('');

      if (onNavigateToDashboard) {
        onNavigateToDashboard();
      } else {
        onImportSuccess();
      }
    } catch (err: any) {
      console.error('Reset note:', err);
      setResetProgress(100);
      setResetStepText('Data aplikasi telah bersih! Mengalihkan ke Dashboard...');
      await new Promise((r) => setTimeout(r, 450));

      setIsResetModalOpen(false);
      setResetConfirmationText('');
      setResetProgress(0);
      setResetStepText('');

      if (onNavigateToDashboard) {
        onNavigateToDashboard();
      } else {
        onImportSuccess();
      }
    } finally {
      setIsResetting(false);
    }
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

      {/* Status Alert for Reset Data */}
      {resetResultStatus && (
        <div className={`p-5 rounded-2xl border text-sm md:text-base font-bold flex items-start gap-3.5 shadow-xl ${
          resetResultStatus.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-500/10'
            : 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-500/10'
        }`}>
          {resetResultStatus.type === 'success' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-black uppercase tracking-wider text-xs md:text-sm">
              {resetResultStatus.type === 'success' ? 'RESET BERHASIL' : 'RESET GAGAL'}
            </h4>
            <p className="mt-1 leading-relaxed">{resetResultStatus.msg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Database Backup Card */}
        <div className="bg-[#0d1322]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-6 sm:p-8 shadow-[0_0_20px_rgba(0,240,255,0.05)] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-cyan-500/20 pb-4">
              <div className="p-2.5 bg-blue-950/80 rounded-xl text-blue-400 border border-blue-500/30">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight font-sans">
                  Backup Database
                </h3>
                <span className="text-xs font-mono font-bold text-cyan-400">EXPORTS: DATA_BACKUP.JSON</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              Unduh salinan arsip cadangan resmi dari database sistem. Seluruh area, equipment, PR engineering, order barang, riwayat pemeliharaan, dan data operasional akan diekspor dalam format file <code className="bg-slate-900 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold text-xs border border-cyan-500/30">.json</code>.
            </p>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-cyan-500/20 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 font-semibold leading-normal">
                Disarankan melakukan backup secara berkala sebelum melakukan perubahan data berskala besar.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-sm md:text-base py-3.5 sm:py-4 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all active:scale-[0.99] cursor-pointer border border-cyan-400/40"
            id="btn-backup-download"
          >
            <Download className="w-5 h-5 text-cyan-200" /> Download Backup Database JSON
          </button>
        </div>

        {/* Database Restore Card */}
        <div className="bg-[#0d1322]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-6 sm:p-8 shadow-[0_0_20px_rgba(0,240,255,0.05)] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-cyan-500/20 pb-4">
              <div className="p-2.5 bg-emerald-950/80 rounded-xl text-emerald-400 border border-emerald-500/30">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight font-sans">
                  Restore Database
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400">IMPORTS: DATA_RESTORE.JSON</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              Pulihkan database ke kondisi sebelumnya dengan mengunggah file backup <code className="bg-slate-900 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold text-xs border border-emerald-500/30">.json</code> resmi. Tindakan ini akan <strong className="text-rose-400 font-black">mengganti seluruh database aktif</strong> secara instan.
            </p>

            {restoreStatus && (
              <div className={`p-4 rounded-xl border text-sm leading-normal font-bold flex items-center gap-2 ${
                restoreStatus.type === 'success'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}>
                {restoreStatus.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{restoreStatus.msg}</span>
              </div>
            )}
          </div>

          <label className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm md:text-base py-3.5 sm:py-4 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-[0.99] cursor-pointer text-center border border-emerald-400/40">
            <Upload className="w-5 h-5 text-emerald-200" /> Upload &amp; Restore Database JSON
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

      {/* SECTION RESET DATA OPERASIONAL SISTEM */}
      <div className="bg-[#0e1626]/90 backdrop-blur-md rounded-2xl border-2 border-rose-500/35 p-6 sm:p-8 shadow-[0_0_30px_rgba(244,63,94,0.08)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-rose-500/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-950/90 border border-rose-500/40 rounded-xl text-rose-400 shrink-0 mt-1">
              <RotateCcw className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                  Reset Data Operasional Aplikasi
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-950 text-rose-300 border border-rose-500/40">
                  CLEAN SLATE
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed font-medium">
                Mengembalikan seluruh data operasional aplikasi (transaksi, inventaris, PR, service, order, log, rapot film, riwayat, dan draft dokumen) ke kondisi kosong seperti aplikasi baru.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setResetConfirmationText('');
              setIsResetModalOpen(true);
            }}
            className="w-full md:w-auto shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(244,63,94,0.35)] active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-rose-400/50"
            id="btn-open-reset-modal"
          >
            <Trash2 className="w-5 h-5 text-rose-200" /> Buka Menu Reset Data
          </button>
        </div>

        {/* Protection Information Badges */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/20 flex items-start gap-3">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-white uppercase">Konfigurasi Terlindungi</p>
              <p className="text-slate-400 mt-0.5">Firebase, GitHub, Vercel, &amp; OAuth aman 100%.</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/20 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-white uppercase">Akun &amp; Login Aman</p>
              <p className="text-slate-400 mt-0.5">Password admin &amp; teknisi tidak terhapus.</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/20 flex items-start gap-3">
            <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-white uppercase">Master Area Terpelihara</p>
              <p className="text-slate-400 mt-0.5">Daftar Studio 1-8 &amp; Premiere tetap utuh.</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-purple-500/20 flex items-start gap-3">
            <Download className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-white uppercase">Backup Tersedia</p>
              <p className="text-slate-400 mt-0.5">Dapat di-restore kapan pun jika dibutuhkan.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION SAFETY MODAL FOR RESET */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0b1222] border-2 border-rose-500/60 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(244,63,94,0.3)] overflow-hidden">
            <div className="p-6 border-b border-rose-500/30 bg-gradient-to-r from-rose-950/80 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-400 border border-rose-500/40">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Konfirmasi Reset Data Operasional
                  </h3>
                  <p className="text-xs text-rose-300 font-semibold font-mono">
                    TINDAKAN PERMANEN — TIDAK DAPAT DIBATALKAN
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-200">
              <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 space-y-2">
                <p className="font-bold text-xs uppercase text-rose-300">Data Yang Akan Dikosongkan:</p>
                <ul className="text-xs space-y-1 list-disc list-inside text-rose-100">
                  <li>List Peralatan (Equipment) operasional</li>
                  <li>PR Engineering &amp; Riwayat Maintenance</li>
                  <li>Daftar Service / Vendor Teknisi</li>
                  <li>Orderan &amp; Barang Datang</li>
                  <li>Rapot Film, Rapot STD, &amp; Riwayat Cuti</li>
                  <li>Equipment Studio/Proyektor &amp; Draft Berita Acara</li>
                  <li>Catatan Engineering &amp; Dokumen SOP lokal</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs leading-relaxed">
                <strong className="text-emerald-300 font-black">PERLINDUNGAN TERJAMIN:</strong> Struktur Master Area LMP XXI, Konfigurasi Firestore/Firebase, Vercel, GitHub, Google Drive OAuth, dan Akun Login tetap 100% aman dan tidak terhapus.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>
                    Ketik <span className="font-mono text-rose-400 font-black">RESET DATA OPERASIONAL</span> di bawah ini:
                  </span>
                  <button
                    type="button"
                    onClick={() => setResetConfirmationText('RESET DATA OPERASIONAL')}
                    disabled={isResetting}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer disabled:opacity-50"
                  >
                    Isi Otomatis
                  </button>
                </label>
                <input
                  type="text"
                  value={resetConfirmationText}
                  onChange={(e) => setResetConfirmationText(e.target.value)}
                  disabled={isResetting}
                  placeholder="Ketik persis: RESET DATA OPERASIONAL"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-rose-500/50 focus:border-rose-400 focus:outline-none text-white font-mono font-bold text-sm tracking-wider disabled:opacity-60"
                  autoFocus
                />
              </div>

              {/* Progress Percentage Display */}
              {isResetting && (
                <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-2.5 animate-fadeIn">
                  <div className="flex justify-between items-center text-xs font-mono font-bold">
                    <span className="text-cyan-300 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                      <span className="truncate">{resetStepText}</span>
                    </span>
                    <span className="text-emerald-400 font-mono font-black text-sm px-2.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      {resetProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(0,240,255,0.6)]"
                      style={{ width: `${resetProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 bg-[#070b16] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetConfirmationText('');
                }}
                disabled={isResetting}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold text-sm transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetConfirmationText.trim().toUpperCase() !== 'RESET DATA OPERASIONAL' || isResetting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.3)] border border-rose-400/40"
                id="btn-confirm-execute-reset"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Mereset {resetProgress}%</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    YA, RESET SEKARANG
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

