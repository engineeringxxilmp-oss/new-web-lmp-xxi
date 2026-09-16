/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FilmUpload, SystemBranding } from '../types';
import {
  Film,
  Clapperboard,
  FileSpreadsheet,
  Layers,
  Upload,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Tv
} from 'lucide-react';
import FilmUploadView from './FilmUploadView';
import LaporanFilm from './LaporanFilm';

interface RapotFilmProps {
  filmUploads: FilmUpload[];
  onSaveFilmUpload: (film: FilmUpload) => void;
  onDeleteFilmUpload: (id: string) => void;
  branding: SystemBranding;
  defaultSubTab?: 'upload' | 'laporan';
}

export default function RapotFilm({
  filmUploads,
  onSaveFilmUpload,
  onDeleteFilmUpload,
  branding,
  defaultSubTab = 'upload'
}: RapotFilmProps) {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'laporan'>(defaultSubTab);

  // Quick summary counts
  const totalFilm = filmUploads.length;
  const sedangTayangCount = filmUploads.filter((f) => f.status_tayang === 'SEDANG TAYANG').length;
  const kdmAktifCount = filmUploads.filter((f) => f.status_kdm === 'Aktif').length;
  const belumTayangCount = filmUploads.filter((f) => f.status_tayang === 'BELUM TAYANG').length;

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
              Pusat terintegrasi untuk pendataan Digital Cinema Package (DCP), status tayang studio, pemantauan masa aktif lisensi KDM, dan penyusunan laporan mingguan film.
            </p>
          </div>

          {/* Sub-Tab Navigation Switcher */}
          <div
            className="flex items-center gap-2 p-1.5 bg-[#080d1a] rounded-2xl border border-cyan-500/30 w-full sm:w-auto shadow-inner"
            id="rapot-film-subtab-switcher"
          >
            <button
              onClick={() => setActiveSubTab('upload')}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm font-black transition-all cursor-pointer flex-1 sm:flex-initial ${
                activeSubTab === 'upload'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] border border-cyan-400/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              id="subtab-upload-film"
              type="button"
            >
              <Upload className="h-4 w-4" />
              <span>UPLOAD FLIM</span>
            </button>

            <button
              onClick={() => setActiveSubTab('laporan')}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm font-black transition-all cursor-pointer flex-1 sm:flex-initial ${
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
          </div>
        </div>

        {/* Operational Statistics Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-cyan-500/20">
          <div className="bg-[#080d1a]/80 p-3.5 rounded-xl border border-cyan-500/25">
            <p className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">Total Judul Film</p>
            <p className="text-2xl font-black text-cyan-300 font-mono mt-0.5">{totalFilm}</p>
          </div>
          <div className="bg-[#080d1a]/80 p-3.5 rounded-xl border border-emerald-500/25">
            <p className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Sedang Tayang</p>
            <p className="text-2xl font-black text-emerald-300 font-mono mt-0.5">{sedangTayangCount}</p>
          </div>
          <div className="bg-[#080d1a]/80 p-3.5 rounded-xl border border-blue-500/25">
            <p className="text-[11px] font-mono font-bold text-blue-400 uppercase tracking-wider">KDM Aktif</p>
            <p className="text-2xl font-black text-blue-300 font-mono mt-0.5">{kdmAktifCount}</p>
          </div>
          <div className="bg-[#080d1a]/80 p-3.5 rounded-xl border border-amber-500/25">
            <p className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">Segera / Belum Tayang</p>
            <p className="text-2xl font-black text-amber-300 font-mono mt-0.5">{belumTayangCount}</p>
          </div>
        </div>
      </div>

      {/* Render Subtab Content */}
      {activeSubTab === 'upload' ? (
        <div className="animate-fade-in" id="content-upload-flim">
          <FilmUploadView
            filmUploads={filmUploads}
            onSave={onSaveFilmUpload}
            onDelete={onDeleteFilmUpload}
          />
        </div>
      ) : (
        <div className="animate-fade-in" id="content-laporan-flim">
          <LaporanFilm
            filmUploads={filmUploads}
            branding={branding}
          />
        </div>
      )}
    </div>
  );
}
