/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FilmUpload, FormatFilm, FormatSound, StatusTayang } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  FileDown,
  FileUp,
  HelpCircle,
  Film,
  Volume2,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Upload
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getIndonesianDate, toISODate } from './PrEngineering';

interface FilmUploadProps {
  filmUploads: FilmUpload[];
  onSave: (film: FilmUpload) => void;
  onDelete: (id: string) => void;
}

export default function FilmUploadView({ filmUploads, onSave, onDelete }: FilmUploadProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState<FilmUpload | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFormat, setFilterFormat] = useState<string>('ALL');
  const [filterSound, setFilterSound] = useState<string>('ALL');
  const [filterStatusTayang, setFilterStatusTayang] = useState<string>('ALL');
  const [filterStatusKdm, setFilterStatusKdm] = useState<string>('ALL');

  // Form states
  const [tanggalTerima, setTanggalTerima] = useState('');
  const [tanggalAmbil, setTanggalAmbil] = useState('');
  const [judulFilm, setJudulFilm] = useState('');
  const [singkatanFilm, setSingkatanFilm] = useState('');
  const [formatFilm, setFormatFilm] = useState<FormatFilm>('2D FLAT');
  const [formatSound, setFormatSound] = useState<FormatSound>('5.1');
  const [statusTayang, setStatusTayang] = useState<StatusTayang>('BELUM TAYANG');
  const [statusKdm, setStatusKdm] = useState('Aktif');
  const [customKdmDate, setCustomKdmDate] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Import State
  const [importCsvText, setImportCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAddForm = () => {
    setEditingFilm(null);
    setTanggalTerima(getTodayFormatted());
    setTanggalAmbil(getTodayFormatted());
    setJudulFilm('');
    setSingkatanFilm('');
    setFormatFilm('2D FLAT');
    setFormatSound('5.1');
    setStatusTayang('BELUM TAYANG');
    setStatusKdm('Aktif');
    setCustomKdmDate('');
    setKeterangan('');
    setErrors({});
    setIsFormOpen(true);
    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const openEditForm = (film: FilmUpload) => {
    setEditingFilm(film);
    setTanggalTerima(film.tanggal_terima);
    setTanggalAmbil(film.tanggal_ambil);
    setJudulFilm(film.judul_film);
    setSingkatanFilm(film.singkatan_film);
    setFormatFilm(film.format_film);
    setFormatSound(film.format_sound);
    setStatusTayang(film.status_tayang);
    
    // Parse status KDM
    if (['Aktif', 'Expired', 'Tidak Ada'].includes(film.status_kdm)) {
      setStatusKdm(film.status_kdm);
      setCustomKdmDate('');
    } else {
      setStatusKdm('Tanggal Expired');
      setCustomKdmDate(film.status_kdm);
    }
    
    setKeterangan(film.keterangan);
    setErrors({});
    setIsFormOpen(true);
    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const getTodayFormatted = () => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const today = new Date();
    const day = today.getDate();
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!judulFilm.trim()) newErrors.judulFilm = 'Judul film wajib diisi.';
    if (!singkatanFilm.trim()) newErrors.singkatanFilm = 'Singkatan film wajib diisi.';
    if (!tanggalTerima.trim()) newErrors.tanggalTerima = 'Tanggal terima wajib diisi.';
    if (!tanggalAmbil.trim()) newErrors.tanggalAmbil = 'Tanggal ambil wajib diisi.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalKdm = statusKdm === 'Tanggal Expired' ? (customKdmDate.trim() || 'Tanggal Expired') : statusKdm;

    const filmPayload: FilmUpload = {
      id: editingFilm ? editingFilm.id : `film-${Date.now()}`,
      tanggal_terima: tanggalTerima.trim(),
      tanggal_ambil: tanggalAmbil.trim(),
      judul_film: judulFilm.trim(),
      singkatan_film: singkatanFilm.trim().toUpperCase(),
      format_film: formatFilm,
      format_sound: formatSound,
      status_tayang: statusTayang,
      status_kdm: finalKdm,
      keterangan: keterangan.trim(),
      created_at: editingFilm ? editingFilm.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSave(filmPayload);
    setIsFormOpen(false);
  };

  const triggerDelete = (id: string) => {
    setDeletingId(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      onDelete(deletingId);
      setDeletingId(null);
    }
  };

  // Badge render configurations
  const renderFormatFilmBadge = (f: FormatFilm) => {
    const classes: Record<FormatFilm, string> = {
      '2D FLAT': 'bg-slate-900 border-cyan-400 text-cyan-300',
      '2D SCOPE': 'bg-slate-900 border-blue-400 text-blue-300',
      '3D': 'bg-slate-900 border-purple-400 text-purple-300',
      'IMAX': 'bg-slate-900 border-amber-400 text-amber-300',
      'ATMOS': 'bg-slate-900 border-pink-400 text-pink-300'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-mono font-black tracking-tight ${classes[f] || 'bg-slate-100 text-slate-900'}`}>
        {f}
      </span>
    );
  };

  const renderFormatSoundBadge = (s: FormatSound) => {
    const classes: Record<FormatSound, string> = {
      '5.1': 'bg-slate-900 border-slate-400 text-white',
      '7.1': 'bg-slate-900 border-indigo-400 text-indigo-200',
      '7.1 ATMOS': 'bg-slate-900 border-fuchsia-400 text-fuchsia-200'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-mono font-black tracking-tight ${classes[s] || 'bg-slate-100 text-slate-900'}`}>
        {s}
      </span>
    );
  };

  const renderStatusTayangBadge = (s: StatusTayang) => {
    const configs = {
      'BELUM TAYANG': { bg: 'bg-blue-950/80 border-blue-500/40 text-blue-300', dot: 'bg-blue-400' },
      'SEDANG TAYANG': { bg: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300', dot: 'bg-emerald-400' },
      'SUDAH TAYANG': { bg: 'bg-rose-950/80 border-rose-500/40 text-rose-300', dot: 'bg-rose-400' }
    };
    const c = configs[s] || { bg: 'bg-slate-900 border-slate-700 text-slate-300', dot: 'bg-slate-400' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm font-black border uppercase tracking-wider ${c.bg}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot} animate-pulse shadow-[0_0_8px_currentColor]`} />
        {s}
      </span>
    );
  };

  const renderStatusKdmBadge = (kdm: string) => {
    if (kdm === 'Aktif') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs md:text-sm font-black">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Aktif
        </span>
      );
    } else if (kdm === 'Expired') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs md:text-sm font-black">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Expired
        </span>
      );
    } else if (kdm === 'Tidak Ada') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-400 text-xs md:text-sm font-bold">
          Tidak Ada
        </span>
      );
    } else {
      // Dynamic Expired Date
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs md:text-sm font-black" title={kdm}>
          <Calendar className="w-3.5 h-3.5 text-amber-400" /> {kdm}
        </span>
      );
    }
  };

  // Filter Logic
  const filteredFilms = filmUploads.filter((film) => {
    const matchesSearch =
      film.judul_film.toLowerCase().includes(searchQuery.toLowerCase()) ||
      film.singkatan_film.toLowerCase().includes(searchQuery.toLowerCase()) ||
      film.keterangan.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFormat = filterFormat === 'ALL' || film.format_film === filterFormat;
    const matchesSound = filterSound === 'ALL' || film.format_sound === filterSound;
    const matchesTayang = filterStatusTayang === 'ALL' || film.status_tayang === filterStatusTayang;
    
    let matchesKdm = true;
    if (filterStatusKdm !== 'ALL') {
      if (filterStatusKdm === 'Aktif') matchesKdm = film.status_kdm === 'Aktif';
      else if (filterStatusKdm === 'Expired') matchesKdm = film.status_kdm === 'Expired';
      else if (filterStatusKdm === 'Tidak Ada') matchesKdm = film.status_kdm === 'Tidak Ada';
      else if (filterStatusKdm === 'Tanggal Expired') {
        matchesKdm = !['Aktif', 'Expired', 'Tidak Ada'].includes(film.status_kdm);
      }
    }

    return matchesSearch && matchesFormat && matchesSound && matchesTayang && matchesKdm;
  });

  const handleRefresh = () => {
    setSearchQuery('');
    setFilterFormat('ALL');
    setFilterSound('ALL');
    setFilterStatusTayang('ALL');
    setFilterStatusKdm('ALL');
  };

  // Export to CSV/Excel
  const handleExportExcel = () => {
    // Generate CSV content
    const headers = [
      'ID',
      'Tanggal Terima',
      'Tanggal Ambil',
      'Judul Film',
      'Singkatan Film',
      'Format Film',
      'Format Sound',
      'Status Tayang',
      'Status KDM',
      'Keterangan'
    ];
    
    const rows = filteredFilms.map((film) => [
      film.id,
      `"${film.tanggal_terima.replace(/"/g, '""')}"`,
      `"${film.tanggal_ambil.replace(/"/g, '""')}"`,
      `"${film.judul_film.replace(/"/g, '""')}"`,
      `"${film.singkatan_film.replace(/"/g, '""')}"`,
      film.format_film,
      film.format_sound,
      film.status_tayang,
      `"${film.status_kdm.replace(/"/g, '""')}"`,
      `"${film.keterangan.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_Upload_Film_XXI_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process manual text or file upload CSV import
  const handleImportCSVSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    if (!importCsvText.trim()) {
      setImportError('Silakan masukkan data CSV atau pilih file.');
      return;
    }

    try {
      const lines = importCsvText.split('\n');
      if (lines.length < 2) {
        throw new Error('Data CSV minimal harus memiliki 1 header dan 1 baris data.');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      
      const filmTitleIdx = headers.indexOf('judul film') !== -1 ? headers.indexOf('judul film') : headers.indexOf('judul_film');
      const singkatanIdx = headers.indexOf('singkatan film') !== -1 ? headers.indexOf('singkatan film') : headers.indexOf('singkatan_film');
      const tglTerimaIdx = headers.indexOf('tanggal terima') !== -1 ? headers.indexOf('tanggal terima') : headers.indexOf('tanggal_terima');
      const tglAmbilIdx = headers.indexOf('tanggal ambil') !== -1 ? headers.indexOf('tanggal ambil') : headers.indexOf('tanggal_ambil');
      
      if (filmTitleIdx === -1 || singkatanIdx === -1) {
        throw new Error('Kolom "Judul Film" dan "Singkatan Film" wajib ada dalam CSV.');
      }

      const formatFilmIdx = headers.indexOf('format_film') !== -1 ? headers.indexOf('format_film') : headers.indexOf('format film');
      const formatSoundIdx = headers.indexOf('format_sound') !== -1 ? headers.indexOf('format_sound') : headers.indexOf('format sound');
      const statusTayangIdx = headers.indexOf('status_tayang') !== -1 ? headers.indexOf('status_tayang') : headers.indexOf('status tayang');
      const statusKdmIdx = headers.indexOf('status_kdm') !== -1 ? headers.indexOf('status_kdm') : headers.indexOf('status kdm');
      const keteranganIdx = headers.indexOf('keterangan') !== -1 ? headers.indexOf('keterangan') : -1;

      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Custom split to handle comma inside quotes
        const values: string[] = [];
        let insideQuotes = false;
        let currentVal = '';
        for (let charIdx = 0; charIdx < line.length; charIdx++) {
          const char = line[charIdx];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
            currentVal = '';
          } else {
            currentVal += char;
          }
        }
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

        const judul = values[filmTitleIdx];
        const singkatan = values[singkatanIdx];
        
        if (!judul || !singkatan) continue;

        const dateTerima = tglTerimaIdx !== -1 && values[tglTerimaIdx] ? values[tglTerimaIdx] : getTodayFormatted();
        const dateAmbil = tglAmbilIdx !== -1 && values[tglAmbilIdx] ? values[tglAmbilIdx] : getTodayFormatted();

        // Validating values
        let fFilm: FormatFilm = '2D FLAT';
        const rawFFilm = formatFilmIdx !== -1 ? values[formatFilmIdx]?.toUpperCase() : '';
        if (['2D FLAT', '2D SCOPE', '3D', 'IMAX', 'ATMOS'].includes(rawFFilm)) {
          fFilm = rawFFilm as FormatFilm;
        }

        let fSound: FormatSound = '5.1';
        const rawFSound = formatSoundIdx !== -1 ? values[formatSoundIdx]?.toUpperCase() : '';
        if (['5.1', '7.1', '7.1 ATMOS'].includes(rawFSound)) {
          fSound = rawFSound as FormatSound;
        }

        let sTayang: StatusTayang = 'BELUM TAYANG';
        const rawSTayang = statusTayangIdx !== -1 ? values[statusTayangIdx]?.toUpperCase() : '';
        if (['BELUM TAYANG', 'SEDANG TAYANG', 'SUDAH TAYANG'].includes(rawSTayang)) {
          sTayang = rawSTayang as StatusTayang;
        }

        const sKdm = statusKdmIdx !== -1 && values[statusKdmIdx] ? values[statusKdmIdx] : 'Aktif';
        const ket = keteranganIdx !== -1 && values[keteranganIdx] ? values[keteranganIdx] : '';

        const newFilm: FilmUpload = {
          id: `film-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          tanggal_terima: dateTerima,
          tanggal_ambil: dateAmbil,
          judul_film: judul,
          singkatan_film: singkatan.toUpperCase(),
          format_film: fFilm,
          format_sound: fSound,
          status_tayang: sTayang,
          status_kdm: sKdm,
          keterangan: ket,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        onSave(newFilm);
        importedCount++;
      }

      setIsImportOpen(false);
      setImportCsvText('');
    } catch (err: any) {
      setImportError(`Gagal memproses CSV: ${err.message || 'Format tidak valid'}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportCsvText(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-slide-in" id="film-upload-tab-view">
      {/* Upper header segment */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <Film className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
            UPLOAD FLIM
          </h2>
          <p className="text-sm md:text-base text-slate-300 mt-1 font-sans">
            Monitoring pengadaan Digital Cinema Package (DCP), KDM, status lisensi, dan kesiapan tayang Studio XXI.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
            id="btn-import-film"
          >
            <FileUp className="h-4 w-4 text-slate-500" /> Import CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
            id="btn-export-film"
          >
            <FileDown className="h-4 w-4 text-slate-500" /> Export Excel
          </button>
          <button
            onClick={openAddForm}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 px-6 py-3 text-sm sm:text-base font-bold text-white active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
            id="btn-add-film"
          >
            <Plus className="h-5 w-5" /> {isFormOpen && !editingFilm ? 'Form Terbuka' : 'Tambah Film'}
          </button>
        </div>
      </div>

      {/* Inline Form Card (Form Tambah / Edit Film - Langsung di Halaman Utama) */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            ref={formCardRef}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-[#0a0f1d] border-2 border-cyan-500/40 p-5 sm:p-7 rounded-2xl shadow-[0_0_35px_rgba(0,240,255,0.15)] space-y-6"
            id="inline-film-form-card"
          >
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff] animate-pulse" />
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase tracking-wider font-mono">
                  {editingFilm ? '✏️ EDIT DATA FILM / DCP' : '➕ TAMBAH DCP FILM BARU'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingFilm(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <X className="h-4 w-4" /> TUTUP FORM
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-5" id="film-form">
              {/* Judul & Singkatan */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-1.5">
                  <label className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1">
                    JUDUL FILM <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={judulFilm}
                    onChange={(e) => {
                      setJudulFilm(e.target.value);
                      setErrors({ ...errors, judulFilm: '' });
                    }}
                    placeholder="Contoh: DEADPOOL & WOLVERINE"
                    className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm sm:text-base font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  {errors.judulFilm && <p className="text-xs font-semibold text-rose-400 mt-0.5">{errors.judulFilm}</p>}
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1">
                    SINGKATAN FILM <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={singkatanFilm}
                    onChange={(e) => {
                      setSingkatanFilm(e.target.value);
                      setErrors({ ...errors, singkatanFilm: '' });
                    }}
                    placeholder="Contoh: D&W"
                    className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm sm:text-base font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-600 uppercase"
                  />
                  {errors.singkatanFilm && <p className="text-xs font-semibold text-rose-400 mt-0.5">{errors.singkatanFilm}</p>}
                </div>
              </div>

              {/* Tanggal Terima & Ambil */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1">
                    TANGGAL TERIMA <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={toISODate(tanggalTerima)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setTanggalTerima(getIndonesianDate(val));
                      } else {
                        setTanggalTerima('');
                      }
                      setErrors({ ...errors, tanggalTerima: '' });
                    }}
                    className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm sm:text-base font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all"
                  />
                  {errors.tanggalTerima && <p className="text-xs font-semibold text-rose-400 mt-0.5">{errors.tanggalTerima}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1">
                    TANGGAL AMBIL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={toISODate(tanggalAmbil)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setTanggalAmbil(getIndonesianDate(val));
                      } else {
                        setTanggalAmbil('');
                      }
                      setErrors({ ...errors, tanggalAmbil: '' });
                    }}
                    className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm sm:text-base font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all"
                  />
                  {errors.tanggalAmbil && <p className="text-xs font-semibold text-rose-400 mt-0.5">{errors.tanggalAmbil}</p>}
                </div>
              </div>

              {/* Formats & Sounds */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1">
                    FORMAT FILM
                  </label>
                  <select
                    value={formatFilm}
                    onChange={(e) => setFormatFilm(e.target.value as FormatFilm)}
                    className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm sm:text-base font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all uppercase"
                  >
                    <option value="2D FLAT">2D FLAT</option>
                    <option value="2D SCOPE">2D SCOPE</option>
                    <option value="3D">3D</option>
                    <option value="IMAX">IMAX</option>
                    <option value="ATMOS">ATMOS</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1">
                    FORMAT SOUND
                  </label>
                  <select
                    value={formatSound}
                    onChange={(e) => setFormatSound(e.target.value as FormatSound)}
                    className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm sm:text-base font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all uppercase"
                  >
                    <option value="5.1">5.1</option>
                    <option value="7.1">7.1</option>
                    <option value="7.1 ATMOS">7.1 ATMOS</option>
                  </select>
                </div>
              </div>

              {/* Status Tayang & Status KDM */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1">
                    STATUS TAYANG
                  </label>
                  <select
                    value={statusTayang}
                    onChange={(e) => setStatusTayang(e.target.value as StatusTayang)}
                    className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm sm:text-base font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all uppercase"
                  >
                    <option value="BELUM TAYANG">BELUM TAYANG</option>
                    <option value="SEDANG TAYANG">SEDANG TAYANG</option>
                    <option value="SUDAH TAYANG">SUDAH TAYANG</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1">
                    STATUS KDM
                  </label>
                  <div className="flex flex-col gap-2">
                    <select
                      value={statusKdm === 'Tidak Ada' || statusKdm === 'Aktif' || statusKdm === 'Expired' ? statusKdm : 'Tanggal Expired'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStatusKdm(val);
                        if (val !== 'Tanggal Expired') {
                          setCustomKdmDate('');
                        } else {
                          setCustomKdmDate(getTodayFormatted());
                        }
                      }}
                      className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm sm:text-base font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all uppercase"
                    >
                      <option value="Tidak Ada">TIDAK ADA</option>
                      <option value="Aktif">AKTIF</option>
                      <option value="Expired">EXPIRED</option>
                      <option value="Tanggal Expired">TANGGAL EXPIRED</option>
                    </select>
                    
                    {(statusKdm === 'Tanggal Expired' || !['Tidak Ada', 'Aktif', 'Expired'].includes(statusKdm)) && (
                      <input
                        type="date"
                        value={toISODate(customKdmDate)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setCustomKdmDate(getIndonesianDate(val));
                          } else {
                            setCustomKdmDate('');
                          }
                        }}
                        className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm sm:text-base font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1">
                  KETERANGAN TAMBAHAN
                </label>
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: DCP disalurkan via drive, KDM terlampir aktif s/d tanggal tayang selesai."
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-sm font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingFilm(null);
                  }}
                  className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-6 py-2.5 text-xs sm:text-sm font-black text-white bg-cyan-600 hover:bg-cyan-500 transition-colors cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  SIMPAN DATA FILM
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive filter & search bento */}
      <div className="bg-[#0c121a]/60 border border-cyan-500/15 p-4 rounded-2xl shadow-[0_0_25px_rgba(0,229,255,0.02)] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-4 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              placeholder="Cari judul film, singkatan, keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#040608]/80 border-2 border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Filter Format Film */}
          <div className="md:col-span-2">
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="w-full bg-[#040608]/80 border-2 border-zinc-800 rounded-xl py-2 px-3 text-xs font-bold text-zinc-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">Format Film (Semua)</option>
              <option value="2D FLAT">2D FLAT</option>
              <option value="2D SCOPE">2D SCOPE</option>
              <option value="3D">3D</option>
              <option value="IMAX">IMAX</option>
              <option value="ATMOS">ATMOS</option>
            </select>
          </div>

          {/* Filter Sound */}
          <div className="md:col-span-2">
            <select
              value={filterSound}
              onChange={(e) => setFilterSound(e.target.value)}
              className="w-full bg-[#040608]/80 border-2 border-zinc-800 rounded-xl py-2 px-3 text-xs font-bold text-zinc-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">Format Sound (Semua)</option>
              <option value="5.1">5.1</option>
              <option value="7.1">7.1</option>
              <option value="7.1 ATMOS">7.1 ATMOS</option>
            </select>
          </div>

          {/* Filter Status Tayang */}
          <div className="md:col-span-2">
            <select
              value={filterStatusTayang}
              onChange={(e) => setFilterStatusTayang(e.target.value)}
              className="w-full bg-[#040608]/80 border-2 border-zinc-800 rounded-xl py-2 px-3 text-xs font-bold text-zinc-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">Status Tayang (Semua)</option>
              <option value="BELUM TAYANG">BELUM TAYANG</option>
              <option value="SEDANG TAYANG">SEDANG TAYANG</option>
              <option value="SUDAH TAYANG">SUDAH TAYANG</option>
            </select>
          </div>

          {/* Filter Status KDM */}
          <div className="md:col-span-2 flex gap-2">
            <select
              value={filterStatusKdm}
              onChange={(e) => setFilterStatusKdm(e.target.value)}
              className="flex-1 bg-[#040608]/80 border-2 border-zinc-800 rounded-xl py-2 px-3 text-xs font-bold text-zinc-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="ALL">KDM (Semua)</option>
              <option value="Tidak Ada">Tidak Ada</option>
              <option value="Aktif">Aktif</option>
              <option value="Expired">Expired</option>
              <option value="Tanggal Expired">Tanggal Expired</option>
            </select>

            <button
              onClick={handleRefresh}
              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-colors cursor-pointer"
              title="Reset Filter / Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main modern table wrapper */}
      <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Film className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
            <span className="font-extrabold text-base tracking-tight text-white">Database Film DCP ({filteredFilms.length} dari {filmUploads.length})</span>
          </div>
          <div className="flex gap-4 text-xs font-mono font-extrabold text-cyan-300">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> BELUM TAYANG</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> SEDANG TAYANG</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> SUDAH TAYANG</span>
          </div>
        </div>

        {filteredFilms.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <HelpCircle className="h-10 w-10 mx-auto stroke-2 mb-2 text-slate-500" />
            <p className="text-base font-bold text-slate-300">Tidak ada data film yang sesuai filter pencarian.</p>
            <button
              onClick={openAddForm}
              className="mt-3 text-sm font-black text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
            >
              Tambah film baru sekarang
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-slate-800" id="film-mobile-list">
              {filteredFilms.map((film) => (
                <div key={film.id} className="p-4 space-y-3 bg-slate-900/40 hover:bg-slate-800/40 transition-colors" id={`film-card-mobile-${film.id}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-black text-white text-base font-sans">{film.judul_film}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-xs font-black bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                          {film.singkatan_film}
                        </span>
                        <span className="text-xs font-mono text-slate-400">Terima: <span className="font-bold text-slate-200">{film.tanggal_terima}</span></span>
                      </div>
                    </div>
                    {renderStatusTayangBadge(film.status_tayang)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {renderFormatFilmBadge(film.format_film)}
                    {renderFormatSoundBadge(film.format_sound)}
                    <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-700">KDM: {renderStatusKdmBadge(film.status_kdm)}</span>
                  </div>

                  {film.keterangan && (
                    <p className="text-xs font-medium text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      {film.keterangan}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">Ambil: {film.tanggal_ambil}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditForm(film)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900/80 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        id={`btn-edit-film-m-${film.id}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Ubah
                      </button>
                      <button
                        onClick={() => triggerDelete(film.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/80 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        id={`btn-delete-film-m-${film.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse" id="film-table">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-xs md:text-sm font-black text-cyan-300 uppercase tracking-wider font-mono">
                    <th className="px-5 py-4">Tgl Terima</th>
                    <th className="px-5 py-4">Tgl Ambil</th>
                    <th className="px-5 py-4">Judul Film</th>
                    <th className="px-4 py-4 text-center">Singkatan</th>
                    <th className="px-4 py-4 text-center">Format</th>
                    <th className="px-4 py-4 text-center">Sound</th>
                    <th className="px-5 py-4 text-center">Status Tayang</th>
                    <th className="px-5 py-4 text-center">Status KDM</th>
                    <th className="px-5 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredFilms.map((film) => (
                    <tr key={film.id} className="hover:bg-slate-800/40 transition-colors" id={`film-row-${film.id}`}>
                      <td className="px-5 py-4 text-xs md:text-sm font-black font-mono text-slate-300">
                        {film.tanggal_terima}
                      </td>
                      <td className="px-5 py-4 text-xs md:text-sm font-black font-mono text-slate-300">
                        {film.tanggal_ambil}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-black text-white text-base md:text-lg font-sans tracking-tight">{film.judul_film}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono text-xs md:text-sm font-black bg-cyan-950/80 text-cyan-300 px-2.5 py-1 rounded border border-cyan-500/30">
                          {film.singkatan_film}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {renderFormatFilmBadge(film.format_film)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {renderFormatSoundBadge(film.format_sound)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {renderStatusTayangBadge(film.status_tayang)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {renderStatusKdmBadge(film.status_kdm)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditForm(film)}
                            className="p-2 rounded-xl text-cyan-300 hover:bg-cyan-950/80 hover:text-white transition-colors cursor-pointer border border-transparent hover:border-cyan-500/30"
                            title="Ubah"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerDelete(film.id)}
                            className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/80 hover:text-rose-200 transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Import CSV Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Data Film dari CSV"
        maxWidth="lg"
      >
        <form onSubmit={handleImportCSVSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-xs text-cyan-200 leading-relaxed font-sans">
            <p className="font-bold mb-1 text-cyan-300">Format Header CSV yang Didukung:</p>
            <p className="font-mono font-bold bg-slate-900/90 text-cyan-300 p-2 rounded border border-cyan-500/30">
              Judul Film, Singkatan Film, Tanggal Terima, Tanggal Ambil, Format Film, Format Sound, Status Tayang, Status KDM, Keterangan
            </p>
            <p className="mt-2 text-slate-300">Format Film, Format Sound, dan Status Tayang akan dikonversi menjadi Badge otomatis.</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Tempel Data CSV di Sini</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Pilih File CSV...
              </button>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <textarea
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="Judul Film, Singkatan Film, Tanggal Terima, Tanggal Ambil, Format Film, Format Sound, Status Tayang, Status KDM, Keterangan&#10;Kung Fu Panda 4,KFP4,01 Juli 2026,02 Juli 2026,2D FLAT,5.1,SEDANG TAYANG,Aktif,Film anak-anak populer"
              rows={8}
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-2.5 text-xs font-mono font-bold text-white bg-slate-950 focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500"
            />
          </div>

          {importError && (
            <p className="text-xs font-semibold text-rose-400">{importError}</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(0,240,255,0.3)] border border-cyan-400/30 transition-all cursor-pointer"
            >
              Proses Import CSV
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Data Film"
        message="Apakah Anda yakin ingin menghapus data film DCP ini secara permanen dari database?"
      />
    </div>
  );
}
