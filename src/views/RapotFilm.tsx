/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FilmUpload, SystemBranding, WeeklyReport } from '../types';
import db from '../db/localDb';
import { getIndonesianDate } from './PrEngineering';
import { getWeekRangeString } from './LaporanFilm';
import {
  Film,
  Clapperboard,
  CheckSquare,
  FileCheck2,
  Lock,
  Database
} from 'lucide-react';
import FilmUploadView from './FilmUploadView';
import SeleksiFilmLaporanView from '../components/rapotFilm/SeleksiFilmLaporanView';
import LaporanFilm from './LaporanFilm';
import BalasanManagerView from '../components/rapotFilm/BalasanManagerView';

export type RapotFilmSubTab = 'master' | 'seleksi' | 'laporan' | 'balasan' | 'upload';

interface RapotFilmProps {
  filmUploads: FilmUpload[];
  onSaveFilmUpload: (film: FilmUpload) => void;
  onDeleteFilmUpload: (id: string) => void;
  branding: SystemBranding;
  defaultSubTab?: RapotFilmSubTab;
}

export default function RapotFilm({
  filmUploads,
  onSaveFilmUpload,
  onDeleteFilmUpload,
  branding,
  defaultSubTab = 'master'
}: RapotFilmProps) {
  const [activeSubTab, setActiveSubTab] = useState<RapotFilmSubTab>(
    defaultSubTab === 'upload' ? 'master' : defaultSubTab
  );
  const [importSuccessNotice, setImportSuccessNotice] = useState<string | null>(null);

  // Quick summary counts
  const totalFilm = filmUploads.length;
  const sedangTayangCount = filmUploads.filter((f) => f.status_tayang === 'SEDANG TAYANG').length;
  const kdmAktifCount = filmUploads.filter((f) => f.status_kdm === 'Aktif').length;
  const belumTayangCount = filmUploads.filter((f) => f.status_tayang === 'BELUM TAYANG').length;

  const handleImportToLaporan = async (selected: FilmUpload[]): Promise<{
    success: boolean;
    message: string;
    addedCount: number;
    duplicateCount: number;
  }> => {
    console.log('[IMPORT] START');
    console.log('[IMPORT] SELECTED FILMS', selected);

    if (!selected || selected.length === 0) {
      console.warn('[IMPORT] No films selected');
      return {
        success: false,
        message: 'Belum ada film yang dipilih.',
        addedCount: 0,
        duplicateCount: 0
      };
    }

    console.log('[IMPORT] VALIDATION COMPLETE');

    // 1. Ensure all items have UPPERCASE judul_film and valid IDs
    const upperSelected = selected.map((s, idx) => ({
      ...s,
      id: s.id || `film-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      judul_film: (s.judul_film || '').toUpperCase().trim(),
      singkatan_film: (s.singkatan_film || '').toUpperCase().trim(),
      status_tayang: s.status_tayang || 'BELUM TAYANG',
      status_kdm: s.status_kdm || 'Aktif',
      format_film: s.format_film || '2D Flat',
      format_sound: s.format_sound || '5.1'
    }));

    // 2. Save to WeeklyReport in database (Firestore / localDb)
    const currentPeriod = getWeekRangeString(getIndonesianDate());
    const existingReports = db.getWeeklyReports();
    const existingReport = existingReports.find((r) => r.periode === currentPeriod);

    // Get any existing films from report to prevent data loss upon incremental imports
    // IMPORTANT: Filter out any legacy auto-dumps of unimported master films
    let currentFilmsList: any[] = [];
    if (existingReport) {
      try {
        const parsed = JSON.parse(existingReport.report_json);
        if (Array.isArray(parsed.films)) {
          const isLegacyMasterDump =
            (parsed.films.length === 34 && parsed.films.every((f: any) => f.id?.startsWith('flm-'))) ||
            (parsed.films.length <= 4 && parsed.films.every((f: any) => f.id?.startsWith('film-')) && !parsed.is_imported);
          if (!isLegacyMasterDump) {
            currentFilmsList = [...parsed.films];
          }
        }
      } catch (_) {}
    }

    // Merge new selected films with existing films (Prevent duplicate films in Laporan Film)
    const mergedFilms = [...currentFilmsList];
    let newlyAddedCount = 0;
    let duplicateCount = 0;

    upperSelected.forEach((film) => {
      const targetTitle = (film.judul_film || '').toUpperCase().trim();
      if (!targetTitle) return;

      const existingIndex = mergedFilms.findIndex(
        (ex) => (ex.judul_film || '').toUpperCase().trim() === targetTitle
      );

      if (existingIndex > -1) {
        // Film sudah ada di Laporan Film -> update info jika ada data baru tanpa menduplikasi row
        duplicateCount++;
        mergedFilms[existingIndex] = {
          ...mergedFilms[existingIndex],
          format_film: film.format_film || mergedFilms[existingIndex].format_film,
          format_sound: film.format_sound || mergedFilms[existingIndex].format_sound,
          cpl: film.singkatan_film || mergedFilms[existingIndex].cpl || targetTitle.substring(0, 3).toUpperCase(),
          kdm: film.status_kdm || mergedFilms[existingIndex].kdm || 'Aktif',
          keterangan: film.keterangan || mergedFilms[existingIndex].keterangan || ''
        };
      } else {
        // Film baru -> Tambahkan sebagai row unik baru
        newlyAddedCount++;
        let studio = `Studio ${(mergedFilms.length % 3) + 1}`;
        const matchStudio = film.keterangan ? film.keterangan.match(/Studio\s*([1-8]|Premiere\s*[1-2])/i) : null;
        if (matchStudio) studio = matchStudio[0];

        let base = 120;
        const fmt = (film.format_film || '').toUpperCase();
        if (fmt.includes('IMAX')) base = 210;
        else if (fmt.includes('3D')) base = 175;
        else if (fmt.includes('ATMOS')) base = 155;
        const hash = (film.id || targetTitle).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const ukuran_file = `${base + (hash % 35)} GB`;

        mergedFilms.push({
          id: film.id || `film-imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          judul_film: targetTitle,
          studio,
          format_film: film.format_film || '2D Flat',
          format_sound: film.format_sound || '5.1',
          cpl: film.singkatan_film || targetTitle.substring(0, 3).toUpperCase(),
          kdm: film.status_kdm || 'Aktif',
          status_upload: 'Berhasil',
          status_dcp: 'Lengkap',
          tanggal_upload: film.tanggal_terima || new Date().toISOString().split('T')[0],
          ukuran_file,
          keterangan: film.keterangan || 'Diimpor dari Scan Screenshot Server AAM 🔒',
          status_tayang: film.status_tayang || 'BELUM TAYANG'
        });
      }
    });

    const now = new Date();
    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const formattedDate = `${now.getDate()} ${monthsIndo[now.getMonth()]} ${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    let notes = 'Seluruh DCP Cinema XXI telah terverifikasi dan siap ditayangkan.';
    if (existingReport) {
      try {
        const parsed = JSON.parse(existingReport.report_json);
        if (parsed.notes) notes = parsed.notes;
      } catch (_) {}
    }

    const reportPayload = {
      films: mergedFilms,
      notes,
      is_imported: true,
      imported_at: new Date().toISOString()
    };

    const newReport: WeeklyReport = {
      id: existingReport ? existingReport.id : `wr-${Date.now()}`,
      periode: currentPeriod,
      tanggal_generate: formattedDate,
      generated_by: existingReport?.generated_by || 'Chief Projectionist',
      jumlah_film: mergedFilms.length,
      jumlah_kdm: mergedFilms.filter((f) => f.kdm === 'Aktif' || !['Expired', 'Tidak Ada', 'Tidak Aktif', 'TIDAK AKTIF'].includes(f.kdm)).length,
      jumlah_upload: mergedFilms.length,
      status: 'Selesai',
      report_json: JSON.stringify(reportPayload)
    };

    console.log('[IMPORT] START FIRESTORE WRITE');
    try {
      await db.saveWeeklyReport(newReport);
      console.log('[IMPORT] FIRESTORE WRITE COMPLETE');
    } catch (e) {
      console.error('[IMPORT KE LAPORAN FILM FAILED]', e);
      return {
        success: false,
        message: 'Gagal menyimpan ke database Firestore Laporan Film.',
        addedCount: 0,
        duplicateCount: 0
      };
    }

    // Save to local storage for quick cross-component recovery
    try {
      localStorage.setItem('xxi_selected_laporan_films', JSON.stringify(mergedFilms));
      localStorage.setItem('xxi_has_imported_to_laporan', 'true');
    } catch (_) {}

    console.log('[IMPORT] DATA AVAILABLE FOR LAPORAN FILM');

    // Formulate feedback message
    let feedbackMsg = '';
    if (newlyAddedCount > 0 && duplicateCount === 0) {
      feedbackMsg = `${newlyAddedCount} film berhasil di-import ke Laporan Film.`;
    } else if (newlyAddedCount > 0 && duplicateCount > 0) {
      feedbackMsg = `${newlyAddedCount} film baru ditambahkan, ${duplicateCount} film sudah ada di Laporan Film.`;
    } else if (newlyAddedCount === 0 && duplicateCount > 0) {
      feedbackMsg = `0 film baru ditambahkan, ${duplicateCount} film sudah ada di Laporan Film (data diperbarui).`;
    } else {
      feedbackMsg = `0 film di-import ke Laporan Film.`;
    }

    // 4. Set feedback message (User tetap berada di halaman Seleksi Film Laporan)
    setImportSuccessNotice(feedbackMsg);
    console.log('[IMPORT] FINISH');
    return {
      success: true,
      message: feedbackMsg,
      addedCount: newlyAddedCount,
      duplicateCount
    };
  };

  return (
    <div className="space-y-6" id="rapot-film-root-view">
      {/* Top Banner Navigation & Summary Header */}
      <div className="bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-fuchsia-950/80 text-fuchsia-300 font-mono text-[11px] font-bold border border-fuchsia-500/40 uppercase tracking-widest">
                CINEMA XXI DIGITAL DCP &amp; REPORTING
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              <Film className="h-7 w-7 text-fuchsia-400 drop-shadow-[0_0_8px_#e879f9]" />
              RAPOT FLIM
            </h2>
            <p className="text-sm md:text-base text-slate-200 mt-1.5 font-sans font-medium max-w-3xl">
              Sistem terpadu Digital Cinema Package (DCP) Cinema XXI: Master Film Tahunan (pangkalan data), Seleksi Film Laporan (Pilih Manual &amp; Tempel Daftar Film dari Server/Library), Laporan Film mingguan (status tayang manual &amp; KDM), dan Balasan Manager (deteksi disposisi coretan ❌).
            </p>
          </div>

          {/* Sub-Tab Navigation Switcher - 4 Bagian Utama */}
          <div
            className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#080d1a] rounded-2xl border border-cyan-500/30 w-full lg:w-auto shadow-inner"
            id="rapot-film-subtab-switcher"
          >
            <button
              onClick={() => setActiveSubTab('master')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-mono text-xs md:text-sm font-black transition-all cursor-pointer ${
                activeSubTab === 'master'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] border border-cyan-400/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              id="subtab-master-film"
              type="button"
            >
              <Database className="h-4 w-4" />
              <span>MASTER FILM TAHUNAN</span>
            </button>

            <button
              onClick={() => setActiveSubTab('seleksi')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-mono text-xs md:text-sm font-black transition-all cursor-pointer ${
                activeSubTab === 'seleksi'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              id="subtab-seleksi-film"
              type="button"
            >
              <CheckSquare className="h-4 w-4" />
              <span>SELEKSI FILM LAPORAN</span>
            </button>

            <button
              onClick={() => setActiveSubTab('laporan')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-mono text-xs md:text-sm font-black transition-all cursor-pointer ${
                activeSubTab === 'laporan'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)] border border-fuchsia-400/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              id="subtab-laporan-film"
              type="button"
            >
              <Clapperboard className="h-4 w-4" />
              <span>LAPORAN FLIM</span>
            </button>

            <button
              onClick={() => setActiveSubTab('balasan')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-mono text-xs md:text-sm font-black transition-all cursor-pointer ${
                activeSubTab === 'balasan'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              id="subtab-balasan-manager"
              type="button"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>BALASAN MANAGER</span>
            </button>
          </div>
        </div>

        {/* Operational Statistics Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-cyan-500/20">
          <div className="bg-[#080d1a]/90 p-4 md:p-5 rounded-2xl border border-cyan-500/30 flex flex-col items-center justify-center text-center shadow-lg shadow-cyan-950/20 transition-all hover:border-cyan-400/50">
            <p className="text-xs sm:text-sm font-mono font-bold text-cyan-400 uppercase tracking-wider">Total Master Film</p>
            <p className="text-3xl sm:text-4xl font-black text-cyan-300 font-mono mt-1.5">{totalFilm}</p>
          </div>
          <div className="bg-[#080d1a]/90 p-4 md:p-5 rounded-2xl border border-emerald-500/30 flex flex-col items-center justify-center text-center shadow-lg shadow-emerald-950/20 transition-all hover:border-emerald-400/50">
            <p className="text-xs sm:text-sm font-mono font-bold text-emerald-400 uppercase tracking-wider">Sedang Tayang</p>
            <p className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono mt-1.5">{sedangTayangCount}</p>
          </div>
          <div className="bg-[#080d1a]/90 p-4 md:p-5 rounded-2xl border border-blue-500/30 flex flex-col items-center justify-center text-center shadow-lg shadow-blue-950/20 transition-all hover:border-blue-400/50">
            <p className="text-xs sm:text-sm font-mono font-bold text-blue-400 uppercase tracking-wider">KDM Aktif</p>
            <p className="text-3xl sm:text-4xl font-black text-blue-300 font-mono mt-1.5">{kdmAktifCount}</p>
          </div>
          <div className="bg-[#080d1a]/90 p-4 md:p-5 rounded-2xl border border-amber-500/30 flex flex-col items-center justify-center text-center shadow-lg shadow-amber-950/20 transition-all hover:border-amber-400/50">
            <p className="text-xs sm:text-sm font-mono font-bold text-amber-400 uppercase tracking-wider">Segera / Belum Tayang</p>
            <p className="text-3xl sm:text-4xl font-black text-amber-300 font-mono mt-1.5">{belumTayangCount}</p>
          </div>
        </div>
      </div>

      {/* Render Subtab Content */}
      {activeSubTab === 'master' && (
        <div className="animate-fade-in" id="content-master-film">
          <FilmUploadView
            filmUploads={filmUploads}
            onSave={onSaveFilmUpload}
            onDelete={onDeleteFilmUpload}
          />
        </div>
      )}

      {activeSubTab === 'seleksi' && (
        <div className="animate-fade-in" id="content-seleksi-film">
          <SeleksiFilmLaporanView
            masterFilms={filmUploads}
            onImportToLaporan={handleImportToLaporan}
          />
        </div>
      )}

      {activeSubTab === 'laporan' && (
        <div className="animate-fade-in" id="content-laporan-flim">
          <LaporanFilm
            filmUploads={filmUploads}
            branding={branding}
            importNotice={importSuccessNotice}
            onClearImportNotice={() => setImportSuccessNotice(null)}
          />
        </div>
      )}

      {activeSubTab === 'balasan' && (
        <div className="animate-fade-in" id="content-balasan-manager">
          <BalasanManagerView />
        </div>
      )}
    </div>
  );
}
