/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FilmUpload, FormatFilm, FormatSound } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Film,
  Volume2,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Layers,
  Sparkles,
  Database,
  SlidersHorizontal
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const ALL_FORMAT_COMBINATION = '2D Scoop + 2D Flat + 3D Scoop + 3D Flat';
const FORMAT_OPTIONS = [
  { label: '2D Scoop', value: '2D Scoop' },
  { label: '2D Flat', value: '2D Flat' },
  { label: '3D Scoop', value: '3D Scoop' },
  { label: '3D Flat', value: '3D Flat' },
  { label: 'Semua Format', value: ALL_FORMAT_COMBINATION, isShortcut: true }
];

const ALL_SOUND_COMBINATION = '5.1 + 7.1 + Atmos';
const SOUND_OPTIONS = [
  { label: '5.1', value: '5.1' },
  { label: '7.1', value: '7.1' },
  { label: 'Atmos', value: 'Atmos' },
  { label: 'Semua Sound', value: ALL_SOUND_COMBINATION, isShortcut: true }
];

export interface ParsedCplResult {
  judulFilm: string;
  singkatanFilm: string;
  formatFilm: FormatFilm;
  formatSound: FormatSound;
}

/**
 * Intelligent Auto Parser for PH / AAM CPL strings.
 * Examples:
 * AvengEndgamEnc_FTR-2D-InfV_S_EN-IND_ID_71_4K_MRV_20260903_WDS_SMPTE_VF
 * DCI / PH conventions: <TitleShort>_<Type>-<Format>-<Version>_<AspectRatio>_<Language>_<Territory>_<Audio>_<Resolution>_<Studio>_<Date>_<Facility>_<Standard>_<Package>
 */
export function parseCplContent(content: string): ParsedCplResult {
  if (!content || !content.trim()) {
    return { judulFilm: '', singkatanFilm: '', formatFilm: '2D Flat', formatSound: '5.1' };
  }

  const raw = content.trim();
  // Find standard DCI content type marker: _FTR, _TLR, _TSR, _ADV, _POL, _PRO, _SHR, _EPS, or _2D, _3D
  const match = raw.match(/^(.+?)(?:_(?:FTR|TLR|TSR|ADV|POL|PRO|SHR|EPS|DCP)[-_]|_(?:2D|3D)[-_])/i);
  const titlePart = match ? match[1] : (raw.split('_')[0] || raw);

  // 1. Detect Sound
  // Rule: Atmos / IAB -> Atmos; 7.1 / 71 -> 7.1; 5.1 / 51 -> 5.1
  let sound: FormatSound = '5.1';
  const upper = raw.toUpperCase();
  if (
    upper.includes('ATMOS') ||
    upper.includes('_IAB') ||
    upper.includes('-IAB') ||
    upper.includes('_DA') ||
    upper.includes('-DA')
  ) {
    sound = 'Atmos';
  } else if (
    upper.includes('_71') ||
    upper.includes('-71') ||
    upper.includes('7.1') ||
    upper.includes('_7-1')
  ) {
    sound = '7.1';
  } else if (
    upper.includes('_51') ||
    upper.includes('-51') ||
    upper.includes('5.1') ||
    upper.includes('_5-1')
  ) {
    sound = '5.1';
  }

  // 2. Detect Format Layar
  const is3D = upper.includes('3D') || upper.includes('FTR-3D');
  const isScoop =
    upper.includes('_S_') ||
    upper.includes('-S_') ||
    upper.includes('SCOPE') ||
    upper.includes('SCOOP') ||
    upper.includes('-S-') ||
    upper.includes('S-239');
  const isFlat =
    upper.includes('_F_') ||
    upper.includes('-F_') ||
    upper.includes('FLAT') ||
    upper.includes('-F-') ||
    upper.includes('F-185');

  let format: FormatFilm = '2D Flat';
  if (is3D && isScoop) format = '3D Scoop';
  else if (is3D && isFlat) format = '3D Flat';
  else if (is3D) format = '3D Scoop';
  else if (isScoop) format = '2D Scoop';
  else if (isFlat) format = '2D Flat';
  else if (upper.includes('2D')) format = '2D Flat';

  // 3. Singkatan: take leading alphanumeric
  const singkatan = titlePart.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16).toUpperCase();

  // 4. Judul Film: Clean technical metadata and format to readable title
  let cleanedTitle = titlePart
    .replace(/^([a-zA-Z0-9]+)Enc$/i, '$1')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Special common dictionary expansions if present
  if (/aveng.*endgam/i.test(cleanedTitle)) {
    cleanedTitle = 'Avengers Endgame';
  } else if (/aveng/i.test(cleanedTitle) && !cleanedTitle.toLowerCase().includes('avengers')) {
    cleanedTitle = cleanedTitle.replace(/aveng\b/i, 'Avengers');
  }

  return {
    judulFilm: cleanedTitle || titlePart,
    singkatanFilm: singkatan,
    formatFilm: format,
    formatSound: sound
  };
}

interface FilmUploadProps {
  filmUploads: FilmUpload[];
  onSave: (film: FilmUpload) => void;
  onDelete: (id: string) => void;
}

export default function FilmUploadView({ filmUploads, onSave, onDelete }: FilmUploadProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState<FilmUpload | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('2026');
  const [filterFormat, setFilterFormat] = useState<string>('ALL');
  const [filterSound, setFilterSound] = useState<string>('ALL');
  const [customYears, setCustomYears] = useState<string[]>(['2026', '2027', '2028']);
  const [newYearInput, setNewYearInput] = useState('');
  const [showAddYearInput, setShowAddYearInput] = useState(false);

  // Auto Parser paste state
  const [rawCplInput, setRawCplInput] = useState('');
  const [parseNotice, setParseNotice] = useState<string | null>(null);

  // Form states - Strictly 6 Fields as specified
  const [tanggalTerima, setTanggalTerima] = useState('');
  const [tanggalAmbil, setTanggalAmbil] = useState('');
  const [judulFilm, setJudulFilm] = useState('');
  const [singkatanFilm, setSingkatanFilm] = useState('');
  const [formatFilm, setFormatFilm] = useState<FormatFilm>('2D Flat');
  const [formatSound, setFormatSound] = useState<FormatSound>('5.1');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getTodayFormatted = (targetYear?: string) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const today = new Date();
    const day = today.getDate();
    const month = months[today.getMonth()];
    const yr = targetYear && targetYear !== 'ALL' ? targetYear : '2026';
    return `${day} ${month} ${yr}`;
  };

  // Extract available years for annual master selector (Focus on 2026, 2027, 2028 + any recorded years)
  const availableYears = useMemo(() => {
    const years = new Set<string>(customYears);
    years.add('2026');
    years.add('2027');
    years.add('2028');
    filmUploads.forEach((f) => {
      if (f.tahun) years.add(f.tahun);
      const match = (f.tanggal_terima || '').match(/\b(20\d{2})\b/);
      if (match) years.add(match[1]);
      if (f.created_at) {
        const y = new Date(f.created_at).getFullYear();
        if (y && !isNaN(y)) years.add(String(y));
      }
    });
    // Sort chronologically
    return Array.from(years).sort((a, b) => a.localeCompare(b));
  }, [filmUploads, customYears]);

  const handleAddCustomYear = () => {
    const yr = newYearInput.trim();
    if (/^20\d{2}$/.test(yr)) {
      if (!customYears.includes(yr)) {
        setCustomYears((prev) => [...prev, yr]);
      }
      setFilterYear(yr);
      setNewYearInput('');
      setShowAddYearInput(false);
    }
  };

  const openAddForm = () => {
    setEditingFilm(null);
    setRawCplInput('');
    setParseNotice(null);
    const activeYr = filterYear !== 'ALL' ? filterYear : '2026';
    setTanggalTerima(getTodayFormatted(activeYr));
    setTanggalAmbil(getTodayFormatted(activeYr));
    setJudulFilm('');
    setSingkatanFilm('');
    setFormatFilm('2D Flat');
    setFormatSound('5.1');
    setErrors({});
    setIsFormOpen(true);
    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const openEditForm = (film: FilmUpload) => {
    setEditingFilm(film);
    setRawCplInput('');
    setParseNotice(null);
    setTanggalTerima(film.tanggal_terima);
    setTanggalAmbil(film.tanggal_ambil);
    setJudulFilm(film.judul_film);
    setSingkatanFilm(film.singkatan_film);
    setFormatFilm(film.format_film);
    setFormatSound(film.format_sound);
    setErrors({});
    setIsFormOpen(true);
    setTimeout(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleRunAutoParser = (rawText: string) => {
    if (!rawText.trim()) return;
    const parsed = parseCplContent(rawText);
    setJudulFilm(parsed.judulFilm);
    setSingkatanFilm(parsed.singkatanFilm);
    setFormatFilm(parsed.formatFilm);
    setFormatSound(parsed.formatSound);
    setParseNotice(`Berhasil diekstrak: ${parsed.judulFilm} (${parsed.singkatanFilm}) | ${parsed.formatFilm} | ${parsed.formatSound}`);
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

    const targetYear = editingFilm?.tahun || (filterYear !== 'ALL' ? filterYear : '2026');

    const filmPayload: FilmUpload = {
      id: editingFilm ? editingFilm.id : `film-${Date.now()}`,
      tanggal_terima: tanggalTerima.trim(),
      tanggal_ambil: tanggalAmbil.trim(),
      judul_film: judulFilm.trim(),
      singkatan_film: singkatanFilm.trim().toUpperCase(),
      format_film: formatFilm,
      format_sound: formatSound,
      status_tayang: editingFilm?.status_tayang || 'BELUM TAYANG',
      status_kdm: editingFilm?.status_kdm || 'Aktif',
      keterangan: editingFilm?.keterangan || '',
      tahun: targetYear,
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

  // Filtered films list
  const filteredFilms = useMemo(() => {
    return filmUploads.filter((film) => {
      // 1. Filter Year - Data antar tahun tidak boleh tercampur
      if (filterYear !== 'ALL') {
        if (film.tahun) {
          if (film.tahun !== filterYear) return false;
        } else {
          const matchesDate = (film.tanggal_terima || '').includes(filterYear);
          const matchesCreated = film.created_at && film.created_at.startsWith(filterYear);
          if (!matchesDate && !matchesCreated) return false;
        }
      }

      // 2. Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (film.judul_film || '').toLowerCase().includes(q);
        const matchesShort = (film.singkatan_film || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesShort) return false;
      }

      // 3. Filter Format
      if (filterFormat !== 'ALL' && film.format_film !== filterFormat) {
        return false;
      }

      // 4. Filter Sound
      if (filterSound !== 'ALL' && film.format_sound !== filterSound) {
        return false;
      }

      return true;
    });
  }, [filmUploads, filterYear, searchQuery, filterFormat, filterSound]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Database className="w-3.5 h-3.5" />
              Bagian 1 • Database Master
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              MASTER FILM TAHUNAN
              <span className="text-sm font-bold px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-mono">
                {filterYear === 'ALL' ? 'Semua Riwayat' : `Tahun ${filterYear}`}
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Arsip permanen database film Cinema XXI. Film yang telah tayang atau diambil dari server tetap tersimpan utuh sebagai data historis tahunan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Tambah Film ke Master
            </button>
          </div>
        </div>

        {/* Year Selector Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Pilih Master Tahun:
            </span>
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => setFilterYear(yr)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                  filterYear === yr
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.03]'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                }`}
              >
                MASTER {yr}
              </button>
            ))}
            
            {showAddYearInput ? (
              <div className="flex items-center gap-1.5 bg-slate-950 border border-amber-500/50 rounded-lg px-2 py-1">
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="2029"
                  maxLength={4}
                  className="w-16 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomYear}
                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddYearInput(false)}
                  className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddYearInput(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-dashed border-amber-500/40 transition cursor-pointer"
                title="Tambah Tahun Baru (Contoh: 2029)"
              >
                + Tahun Baru
              </button>
            )}

            <button
              onClick={() => setFilterYear('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                filterYear === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
              }`}
            >
              SEMUA RIWAYAT ({filmUploads.length})
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Total Film Tersimpan: <strong className="text-white font-bold">{filteredFilms.length}</strong> judul
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Judul Film atau Singkatan di Master..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Format Filter */}
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Semua Format Layar</option>
            <option value="2D Scoop">2D Scoop</option>
            <option value="2D Flat">2D Flat</option>
            <option value="3D Scoop">3D Scoop</option>
            <option value="3D Flat">3D Flat</option>
          </select>

          {/* Sound Filter */}
          <select
            value={filterSound}
            onChange={(e) => setFilterSound(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Semua Sound</option>
            <option value="5.1">5.1</option>
            <option value="7.1">7.1</option>
            <option value="Atmos">Atmos</option>
          </select>

          {(searchQuery || filterFormat !== 'ALL' || filterSound !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterFormat('ALL');
                setFilterSound('ALL');
              }}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Reset Filter"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table Master Film - Strictly 6 Fields as specified */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              DAFTAR MASTER FILM {filterYear === 'ALL' ? 'SEMUA PERIODE' : filterYear}
            </h2>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {filteredFilms.length} Film Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4 w-36">Tanggal Terima</th>
                <th className="py-3.5 px-4 w-36">Tanggal Ambil</th>
                <th className="py-3.5 px-4 min-w-[220px]">Judul Film</th>
                <th className="py-3.5 px-4 w-36">Singkatan</th>
                <th className="py-3.5 px-4 w-44">Format Layar</th>
                <th className="py-3.5 px-4 w-32">Sound</th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredFilms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Film className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-60" />
                    <p className="font-semibold text-slate-400">Belum ada data master film untuk filter ini</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Klik tombol &ldquo;Tambah Film ke Master&rdquo; untuk menambahkan judul baru.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFilms.map((film, index) => (
                  <tr
                    key={film.id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    <td className="py-3 px-4 text-center text-xs font-mono text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-300 whitespace-nowrap">
                      {film.tanggal_terima}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-300 whitespace-nowrap">
                      {film.tanggal_ambil}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white group-hover:text-amber-300 transition">
                        {film.judul_film}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                        {film.singkatan_film || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-bold bg-slate-950 border-cyan-400/40 text-cyan-300">
                        {film.format_film}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-bold ${
                        film.format_sound.includes('Atmos')
                          ? 'bg-fuchsia-950/80 border-fuchsia-500/40 text-fuchsia-300'
                          : film.format_sound.includes('7.1')
                          ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300'
                          : 'bg-slate-950 border-slate-600 text-slate-300'
                      }`}>
                        {film.format_sound}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditForm(film)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition cursor-pointer"
                          title="Edit 6 Field Master Film"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => triggerDelete(film.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 hover:text-rose-200 transition cursor-pointer"
                          title="Hapus dari Master"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form: Tambah / Edit Master Film (Strictly 6 Fields) */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingFilm ? 'Edit Master Film' : 'Tambah Film ke Master Film'}
        maxWidth="lg"
      >
        <div ref={formCardRef} className="space-y-6">
          {/* Auto Parser Box */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Auto Parser (Paste Nama Content dari PH / AAM)
              </label>
              <span className="text-[10px] text-slate-400">Otomatis ekstrak Judul, Singkatan, Format & Sound</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={rawCplInput}
                onChange={(e) => setRawCplInput(e.target.value)}
                placeholder="Contoh: AvengEndgamEnc_FTR-2D-InfV_S_EN-IND_ID_71_4K_MRV_20260903_WDS_SMPTE_VF"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => handleRunAutoParser(rawCplInput)}
                className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ekstrak Data
              </button>
            </div>
            {parseNotice && (
              <p className="text-[11px] text-emerald-400 font-mono mt-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {parseNotice}
              </p>
            )}
          </div>

          <form onSubmit={handleSaveSubmit} className="space-y-4">
            {/* Field 1 & 2: Tanggal Terima & Tanggal Ambil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  1. Tanggal Terima <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={tanggalTerima}
                  onChange={(e) => setTanggalTerima(e.target.value)}
                  placeholder="Contoh: 15 September 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                {errors.tanggalTerima && (
                  <p className="text-rose-400 text-xs mt-1">{errors.tanggalTerima}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  2. Tanggal Ambil <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={tanggalAmbil}
                  onChange={(e) => setTanggalAmbil(e.target.value)}
                  placeholder="Contoh: 15 September 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                {errors.tanggalAmbil && (
                  <p className="text-rose-400 text-xs mt-1">{errors.tanggalAmbil}</p>
                )}
              </div>
            </div>

            {/* Field 3: Judul Film */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                3. Judul Film <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={judulFilm}
                onChange={(e) => setJudulFilm(e.target.value)}
                placeholder="Contoh: Avengers Endgame"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
              />
              {errors.judulFilm && (
                <p className="text-rose-400 text-xs mt-1">{errors.judulFilm}</p>
              )}
            </div>

            {/* Field 4: Singkatan */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                4. Singkatan Film <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={singkatanFilm}
                onChange={(e) => setSingkatanFilm(e.target.value.toUpperCase())}
                placeholder="Contoh: AVENGENDGAMENC atau AVG"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-amber-500 uppercase"
              />
              {errors.singkatanFilm && (
                <p className="text-rose-400 text-xs mt-1">{errors.singkatanFilm}</p>
              )}
            </div>

            {/* Field 5: Format Layar */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                5. Format Layar <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormatFilm(opt.value as FormatFilm)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition cursor-pointer text-left ${
                      formatFilm === opt.value
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 6: Sound */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                6. Sound <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SOUND_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormatSound(opt.value as FormatSound)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition cursor-pointer text-left ${
                      formatSound === opt.value
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                {editingFilm ? 'Simpan Perubahan Master' : 'Tambahkan ke Master Film'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Film dari Master?"
        message="Apakah Anda yakin ingin menghapus data film ini dari Master Film Tahunan? Tindakan ini tidak dapat dibatalkan."
      />
    </div>
  );
}
