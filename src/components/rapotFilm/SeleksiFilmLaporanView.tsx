/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { FilmUpload } from '../../types';
import {
  runOcrSpaceScreenshotScanner,
  OcrSpaceScanResult,
  ScanStats,
  DebugRowInfo
} from '../../lib/ocrSpaceScanner';
import {
  SmartGroupedFilm,
  VisualLock
} from '../../lib/smartFilmScanner';
import {
  CheckSquare,
  Square,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ScanLine,
  Upload,
  Image as ImageIcon,
  Eye,
  X,
  Sparkles,
  RefreshCw,
  Layers,
  ChevronDown,
  Info,
  Lock,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

interface UploadedScreenshotItem {
  id: string;
  name: string;
  dataUrl: string;
  objectUrl?: string;
  originalFile?: File;
  sizeFormatted: string;
  width?: number;
  height?: number;
  index?: number;
}

export interface ImportToLaporanResult {
  success: boolean;
  message?: string;
  addedCount?: number;
  duplicateCount?: number;
}

interface SeleksiFilmLaporanViewProps {
  masterFilms: FilmUpload[];
  onImportToLaporan: (selectedFilms: FilmUpload[]) => void | Promise<ImportToLaporanResult | boolean | void>;
}

export default function SeleksiFilmLaporanView({
  masterFilms,
  onImportToLaporan
}: SeleksiFilmLaporanViewProps) {
  // Primary Tabs: 'scanner' (SCAN SCREENSHOT AAM / SERVER) | 'manual' (PILIH MANUAL)
  const [activeMethod, setActiveMethod] = useState<'scanner' | 'manual'>('scanner');

  // =========================================================================
  // METHOD 1: SCAN SCREENSHOT AAM / SERVER STATE
  // =========================================================================
  const [uploadedScreenshots, setUploadedScreenshots] = useState<UploadedScreenshotItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scanProgressPercent, setScanProgressPercent] = useState(0);
  const [scanProgressStep, setScanProgressStep] = useState('');
  const [scannedResults, setScannedResults] = useState<SmartGroupedFilm[]>([]);
  const [excludedNonFilmCount, setExcludedNonFilmCount] = useState(0);
  const [scanStats, setScanStats] = useState<ScanStats | null>(null);
  const [debugRows, setDebugRows] = useState<DebugRowInfo[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugFilter, setDebugFilter] = useState<'ALL' | 'LOCKED' | 'REVIEW' | 'NO_LOCK' | 'MATCHED' | 'NEEDS_MATCH'>('ALL');
  const [previewImage, setPreviewImage] = useState<UploadedScreenshotItem | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [showLocksOverlay, setShowLocksOverlay] = useState(true);
  const [detectedLocksMap, setDetectedLocksMap] = useState<Record<number, VisualLock[]>>({});
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // =========================================================================
  // METHOD 2: PILIH MANUAL STATE
  // =========================================================================
  const [manualSearch, setManualSearch] = useState('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Record<string, boolean>>({});

  // Master Film Lookup Map for manual linking
  const masterFilmMap = useMemo(() => {
    const map = new Map<string, FilmUpload>();
    masterFilms.forEach((film) => {
      map.set(film.id, film);
    });
    return map;
  }, [masterFilms]);

  // =========================================================================
  // SCREENSHOT UPLOAD & DRAG/DROP HANDLERS
  // =========================================================================
  const handleFilesAdded = (files: FileList | File[]) => {
    const validImageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

    if (validImageFiles.length === 0) {
      alert('Pilih file gambar screenshot yang valid (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const currentCount = uploadedScreenshots.length;
    const readPromises = validImageFiles.map((file, fIdx) => {
      return new Promise<UploadedScreenshotItem>((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const reader = new FileReader();
        const sizeKb = Math.round(file.size / 1024);
        const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

        reader.onload = (e) => {
          const dataUrl = (e.target?.result as string) || objectUrl;
          const img = new Image();
          img.onload = () => {
            resolve({
              id: `ss-${Date.now()}-${fIdx}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              dataUrl,
              objectUrl,
              originalFile: file,
              sizeFormatted,
              width: img.naturalWidth || img.width,
              height: img.naturalHeight || img.height,
              index: currentCount + fIdx + 1
            });
          };
          img.onerror = () => {
            resolve({
              id: `ss-${Date.now()}-${fIdx}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              dataUrl,
              objectUrl,
              originalFile: file,
              sizeFormatted,
              width: 0,
              height: 0,
              index: currentCount + fIdx + 1
            });
          };
          img.src = dataUrl;
        };

        reader.onerror = () => {
          resolve({
            id: `ss-${Date.now()}-${fIdx}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            dataUrl: objectUrl,
            objectUrl,
            sizeFormatted,
            width: 0,
            height: 0,
            index: currentCount + fIdx + 1
          });
        };

        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then((newItems) => {
      setUploadedScreenshots((prev) => [...prev, ...newItems]);
      setStatusNotice(`${newItems.length} screenshot berhasil ditambahkan. Siap untuk di-scan via OCR.space.`);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveScreenshot = (id: string) => {
    setUploadedScreenshots((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllScreenshots = () => {
    setUploadedScreenshots([]);
    setScannedResults([]);
    setScanStats(null);
    setDebugRows([]);
    setDetectedLocksMap({});
    setStatusNotice('Daftar screenshot telah dibersihkan.');
  };

  // =========================================================================
  // RUN SCANNER: OCR.SPACE ENGINE + VISUAL LOCK + CONTENT COLUMN
  // =========================================================================
  const handleStartScan = async () => {
    if (uploadedScreenshots.length === 0) {
      alert('Silakan upload minimal satu screenshot AAM / Server terlebih dahulu.');
      return;
    }

    setIsScanning(true);
    setScannedResults([]);
    setDebugRows([]);
    setScanStats(null);
    setScanProgressPercent(5);
    setScanProgressStep('MEMPERSIAPKAN OCR.SPACE SCANNER DARI ORIGINAL IMAGE...');

    try {
      const urls = uploadedScreenshots.map((item) => item.dataUrl || item.objectUrl || '');
      const scanResult = await runOcrSpaceScreenshotScanner(
        urls,
        masterFilms,
        (percent, stepText) => {
          setScanProgressPercent(percent);
          setScanProgressStep(stepText);
        }
      );

      setScannedResults(scanResult.films);
      setExcludedNonFilmCount(scanResult.excludedCount);
      setScanStats(scanResult.stats);
      setDebugRows(scanResult.debugRows);
      if (scanResult.detectedLocksByScreenshot) {
        setDetectedLocksMap(scanResult.detectedLocksByScreenshot);
      }

      const matchedCount = scanResult.films.filter((r) => r.matchedFilm !== null).length;
      const needMatchCount = scanResult.films.length - matchedCount;

      const rawCount = scanResult.stats.rawCandidateCount || scanResult.films.length;
      const uniqueCount = scanResult.stats.uniqueFilmCount || scanResult.films.length;
      const mergedCount = scanResult.stats.duplicateMergedCount || 0;

      let msg = `[OCR.space] Scan selesai: ${rawCount} raw content terdeteksi → ${uniqueCount} film unik`;
      if (mergedCount > 0) {
        msg += ` (${mergedCount} duplikat Master Film digabungkan)`;
      }
      msg += ` • ${scanResult.stats.matchedMasterCount} Cocok Master Film.`;
      if (scanResult.stats.ignoredNoLockCount > 0) {
        msg += ` (${scanResult.stats.ignoredNoLockCount} baris tanpa LOCK diabaikan)`;
      }
      setStatusNotice(msg);
    } catch (err: any) {
      console.error('Scan error:', err);
      alert('Terjadi kendala saat memproses scanner: ' + (err?.message || 'Gagal membaca gambar'));
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle single result checkbox
  const handleToggleResultCheck = (id: string) => {
    setScannedResults((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item))
    );
  };

  // Select All scanned results
  const handleSelectAllResults = () => {
    setScannedResults((prev) => prev.map((item) => ({ ...item, isChecked: true })));
  };

  // Deselect All scanned results
  const handleDeselectAllResults = () => {
    setScannedResults((prev) => prev.map((item) => ({ ...item, isChecked: false })));
  };

  // Clear scanned results
  const handleClearScannedResults = () => {
    setScannedResults([]);
    setExcludedNonFilmCount(0);
    setStatusNotice('Hasil scan telah dibersihkan.');
  };

  // Remove single scanned item
  const handleRemoveSingleResult = (id: string) => {
    setScannedResults((prev) => prev.filter((item) => item.id !== id));
  };

  // Manual matching override for an unmatched candidate (Requirement 9: Deduplication applies if matched to same Master)
  const handleManualMapResult = (resultId: string, targetMasterId: string) => {
    if (targetMasterId === 'NEW_FILM') {
      setScannedResults((prev) =>
        prev.map((item) => {
          if (item.id !== resultId) return item;
          return {
            ...item,
            matchedFilm: null,
            needsManualMatch: false,
            confidence: 'medium'
          };
        })
      );
      return;
    }

    const master = masterFilmMap.get(targetMasterId);
    if (!master) return;

    setScannedResults((prev) => {
      // Periksa apakah sudah ada film lain yang di-match ke Master Film yang sama
      const existingSameMaster = prev.find(
        (item) => item.id !== resultId && item.matchedFilm?.id === targetMasterId
      );

      if (existingSameMaster) {
        const currentItem = prev.find((item) => item.id === resultId);
        const combinedVariants = [...existingSameMaster.variants];
        if (currentItem) {
          currentItem.variants.forEach((v) => {
            if (!combinedVariants.some((cv) => cv.rawTitle === v.rawTitle)) {
              combinedVariants.push(v);
            }
          });
        }

        // Gabungkan source rows
        const combinedSourceRows = [...(existingSameMaster.sourceRows || [])];
        if (currentItem?.sourceRows) {
          combinedSourceRows.push(...currentItem.sourceRows);
        } else if (currentItem) {
          combinedSourceRows.push({
            rawContentName: currentItem.rawContentName || currentItem.canonicalTitle,
            screenshotIndex: 1,
            formatSound: currentItem.formatSound,
            formatFilm: currentItem.formatFilm
          });
        }

        // Hapus item saat ini dan tambahkan occurrence ke existingSameMaster
        return prev
          .filter((item) => item.id !== resultId)
          .map((item) => {
            if (item.id === existingSameMaster.id) {
              return {
                ...item,
                occurrenceCount: (item.occurrenceCount || 1) + (currentItem?.occurrenceCount || 1),
                sourceRows: combinedSourceRows,
                variants: combinedVariants,
                variantCount: combinedVariants.length
              };
            }
            return item;
          });
      }

      // Jika belum ada film dengan master ini, perbarui datanya
      return prev.map((item) => {
        if (item.id !== resultId) return item;
        return {
          ...item,
          canonicalTitle: master.judul_film.toUpperCase(),
          singkatan: master.singkatan_film?.toUpperCase(),
          formatFilm: master.format_film || item.formatFilm,
          formatSound: master.format_sound || item.formatSound,
          matchedFilm: master,
          needsManualMatch: false,
          confidence: 'high',
          isChecked: true
        };
      });
    });
  };

  // Import checked scanned results to Laporan Film (1 Film = 1 Import Row)
  const handleImportScannedToLaporan = async () => {
    if (isImporting) return;

    const checkedItems = scannedResults.filter((r) => r.isChecked);
    if (checkedItems.length === 0) {
      setStatusNotice('⚠️ Belum ada film yang dipilih.');
      return;
    }

    setIsImporting(true);
    setStatusNotice('Sedang meng-import ke Laporan Film...');

    // Requirement 3: Deduplication guarantee at import time (FINAL UNIQUE FILM RESULT)
    // 1 Film unik = 1 import row (menggunakan canonical title yang sudah di-dedup)
    const uniqueFilmsMap = new Map<string, FilmUpload>();

    checkedItems.forEach((item) => {
      let film: FilmUpload;
      if (item.matchedFilm) {
        film = {
          ...item.matchedFilm,
          id: item.matchedFilm.id,
          judul_film: item.matchedFilm.judul_film.toUpperCase().trim(),
          singkatan_film: (item.matchedFilm.singkatan_film || item.singkatan || '').toUpperCase().trim(),
          format_film: item.matchedFilm.format_film || item.formatFilm || '2D Flat',
          format_sound: item.matchedFilm.format_sound || item.formatSound || '5.1',
          status_tayang: item.matchedFilm.status_tayang || 'BELUM TAYANG',
          status_kdm: item.matchedFilm.status_kdm || 'Aktif',
          keterangan: item.matchedFilm.keterangan || 'Diimpor dari Scan Screenshot Server AAM 🔒'
        };
      } else {
        const title = item.canonicalTitle.toUpperCase().trim();
        film = {
          id: `film-scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          tanggal_terima: new Date().toISOString().split('T')[0],
          tanggal_ambil: '',
          judul_film: title,
          singkatan_film: (item.singkatan || title.substring(0, 3)).toUpperCase(),
          format_film: item.formatFilm || '2D Flat',
          format_sound: item.formatSound || '5.1',
          status_tayang: 'BELUM TAYANG',
          status_kdm: 'Aktif',
          keterangan: 'Diimpor dari Scan Screenshot Server AAM 🔒',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      const key = (film.judul_film || '').toUpperCase().trim();
      if (!uniqueFilmsMap.has(key)) {
        uniqueFilmsMap.set(key, film);
      }
    });

    const finalFilmsToImport = Array.from(uniqueFilmsMap.values());

    try {
      const res = await onImportToLaporan(finalFilmsToImport);
      const isSuccess = typeof res === 'boolean' ? res : (typeof res === 'object' && res ? res.success !== false : true);

      if (isSuccess) {
        console.log('[IMPORT] RESET TEMPORARY STATE');
        // RESET SELECTION: Hanya setelah import berhasil, reset hasil scan & screenshot
        setScannedResults([]);
        setUploadedScreenshots([]);
        setExcludedNonFilmCount(0);
        setScanStats(null);
        setDebugRows([]);
        const successMsg = (typeof res === 'object' && res?.message)
          ? res.message
          : `${finalFilmsToImport.length} film unik berhasil di-import ke Laporan Film.`;
        setStatusNotice(`✓ ${successMsg}`);
      } else {
        // JIKA IMPORT GAGAL: SCAN RESULT TETAP ADA, SCREENSHOT TETAP ADA, USER BISA RETRY
        const errMsg = (typeof res === 'object' && res?.message)
          ? res.message
          : 'Gagal meng-import ke Laporan Film. Data scan tetap tersimpan, silakan coba lagi.';
        setStatusNotice(`⚠️ ${errMsg}`);
      }
    } catch (err: any) {
      console.error('[IMPORT KE LAPORAN FILM FAILED]', err);
      // JIKA IMPORT GAGAL: SCAN RESULT TETAP ADA, SCREENSHOT TETAP ADA, USER BISA RETRY
      setStatusNotice(`⚠️ Gagal meng-import film: ${err?.message || 'Terjadi kesalahan sistem'}. Data scan tetap tersimpan, silakan coba lagi.`);
    } finally {
      setIsImporting(false);
    }
  };

  // Import from Manual Selection
  const handleImportManual = async () => {
    if (isImporting) return;

    const selectedFilms = masterFilms
      .filter((f) => manualSelectedIds[f.id])
      .map((f) => ({
        ...f,
        judul_film: (f.judul_film || '').toUpperCase().trim(),
        singkatan_film: (f.singkatan_film || '').toUpperCase().trim(),
        format_film: f.format_film || '2D Flat',
        format_sound: f.format_sound || '5.1',
        status_tayang: f.status_tayang || 'BELUM TAYANG',
        status_kdm: f.status_kdm || 'Aktif',
        keterangan: f.keterangan || 'Diimpor manual ke Laporan Film'
      }));

    if (selectedFilms.length === 0) {
      setStatusNotice('⚠️ Belum ada film yang dipilih.');
      return;
    }

    setIsImporting(true);
    setStatusNotice('Sedang meng-import ke Laporan Film...');

    try {
      const res = await onImportToLaporan(selectedFilms);
      const isSuccess = typeof res === 'boolean' ? res : (typeof res === 'object' && res ? res.success !== false : true);

      if (isSuccess) {
        console.log('[IMPORT] RESET TEMPORARY STATE');
        // RESET MANUAL SELECTION
        setManualSelectedIds({});
        const successMsg = (typeof res === 'object' && res?.message)
          ? res.message
          : `${selectedFilms.length} film berhasil di-import ke Laporan Film. Seleksi manual telah direset.`;
        setStatusNotice(`✓ ${successMsg}`);
      } else {
        const errMsg = (typeof res === 'object' && res?.message)
          ? res.message
          : 'Gagal meng-import ke Laporan Film. Silakan coba lagi.';
        setStatusNotice(`⚠️ ${errMsg}`);
      }
    } catch (err: any) {
      console.error('[IMPORT KE LAPORAN FILM FAILED]', err);
      setStatusNotice(`⚠️ Gagal meng-import film: ${err?.message || 'Terjadi kesalahan sistem'}. Silakan coba lagi.`);
    } finally {
      setIsImporting(false);
    }
  };

  // =========================================================================
  // METHOD 2: PILIH MANUAL HANDLERS
  // =========================================================================
  const filteredMasterFilms = useMemo(() => {
    if (!manualSearch.trim()) return masterFilms;
    const q = manualSearch.toLowerCase().trim();
    return masterFilms.filter(
      (film) =>
        (film.judul_film || '').toLowerCase().includes(q) ||
        (film.singkatan_film || '').toLowerCase().includes(q) ||
        (film.format_film || '').toLowerCase().includes(q) ||
        (film.format_sound || '').toLowerCase().includes(q)
    );
  }, [masterFilms, manualSearch]);

  const selectedManualCount = useMemo(() => {
    return Object.values(manualSelectedIds).filter(Boolean).length;
  }, [manualSelectedIds]);

  const handleToggleManualFilm = (filmId: string) => {
    setManualSelectedIds((prev) => ({
      ...prev,
      [filmId]: !prev[filmId]
    }));
  };

  const handleSelectAllManual = () => {
    const next: Record<string, boolean> = { ...manualSelectedIds };
    filteredMasterFilms.forEach((f) => {
      next[f.id] = true;
    });
    setManualSelectedIds(next);
  };

  const handleDeselectAllManual = () => {
    const next: Record<string, boolean> = { ...manualSelectedIds };
    filteredMasterFilms.forEach((f) => {
      delete next[f.id];
    });
    setManualSelectedIds(next);
  };

  const scannedCheckedCount = scannedResults.filter((r) => r.isChecked).length;
  const matchedScannedCount = scannedResults.filter((r) => r.matchedFilm !== null).length;
  const needReviewScannedCount = scannedResults.length - matchedScannedCount;

  return (
    <div className="space-y-6 animate-slide-in" id="seleksi-film-laporan-view">
      {/* Upper Navigation & Method Switcher */}
      <div className="bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/40 uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-cyan-400" />
                AUTOMATED CONTENT DETECTION
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              <ScanLine className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
              SELEKSI LAPORAN FILM
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-sans">
              Deteksi otomatis film tersedia pada Server / AAM / Library melalui <strong>Screenshot AAM (Visual Lock 🔒 + Browser OCR)</strong> atau gunakan <strong>PILIH MANUAL</strong> dari Master Film.
            </p>
          </div>

          {/* TWO PRIMARY METHODS: [SCAN SCREENSHOT AAM / SERVER] (Primary) & [PILIH MANUAL] (Fallback) */}
          <div
            className="flex items-center gap-2 p-1.5 bg-[#080d1a] rounded-2xl border border-cyan-500/30 w-full sm:w-auto shadow-inner"
            id="method-switcher"
          >
            <button
              type="button"
              onClick={() => setActiveMethod('scanner')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeMethod === 'scanner'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] border border-cyan-400/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              id="tab-scan-screenshot"
            >
              <ScanLine className="w-4 h-4 text-cyan-300" />
              <span>SCAN SCREENSHOT AAM / SERVER</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMethod('manual')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeMethod === 'manual'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-400/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              id="tab-pilih-manual"
            >
              <CheckSquare className="w-4 h-4" />
              <span>PILIH MANUAL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Status Notice Banner */}
      {statusNotice && (
        <div
          className={`text-xs font-mono rounded-xl p-3.5 flex items-center justify-between gap-3 animate-fade-in shadow-md ${
            statusNotice.includes('Belum ada') || statusNotice.includes('Gagal') || statusNotice.includes('⚠️')
              ? 'text-amber-200 bg-amber-950/80 border border-amber-500/40'
              : 'text-emerald-300 bg-emerald-950/80 border border-emerald-500/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusNotice.includes('Belum ada') || statusNotice.includes('Gagal') || statusNotice.includes('⚠️') ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-semibold">{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-[11px] text-slate-300 hover:text-white font-mono px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* METHOD 1: SCAN SCREENSHOT AAM / SERVER (METODE UTAMA) */}
      {/* ===================================================================== */}
      {activeMethod === 'scanner' && (
        <div className="space-y-6 animate-fade-in" id="scanner-main-section">
          {/* Upload Area / Drag & Drop Container */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  UPLOAD SCREENSHOT AAM / SERVER / LIBRARY
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload satu atau beberapa tangkapan layar (screenshot) dari aplikasi resmi Server Cinema XXI.
                </p>
              </div>

              {uploadedScreenshots.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllScreenshots}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Semua Screenshot
                </button>
              )}
            </div>

            {/* WARNING SCANNER */}
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-200 shadow-md">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-amber-300 font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>⚠️ PENTING: KETENTUAN SCANNER AAM</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Scanner hanya memproses content yang terdeteksi memiliki <strong>LOCK 🔒</strong>. Content seperti <strong>LSF, LDR, Trailer, Promo</strong>, dan materi non-film lainnya otomatis diabaikan. Pastikan memeriksa hasil scan sebelum klik <strong>Import ke Laporan Film</strong>.
                </p>
              </div>
            </div>

            {/* TWO-COLUMN RESPONSIVE LAYOUT: Kolom Kiri (Controls & Upload), Kolom Kanan (Daftar & Preview Screenshot) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* KOLOM KIRI (5 Cols on LG): Drag & Drop, Upload Button, Scan Button, Progress */}
              <div className="lg:col-span-5 space-y-4">
                {/* Drag & Drop Zone (Compact) */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                    isDragging
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                      : 'border-slate-700/80 hover:border-cyan-500/60 hover:bg-slate-800/40 bg-slate-950/50'
                  }`}
                  id="screenshot-dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesAdded(e.target.files);
                      }
                    }}
                  />

                  <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      Tarik &amp; lepas screenshot, atau{' '}
                      <span className="text-cyan-400 underline decoration-cyan-400/50">klik untuk pilih file</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Mendukung multi-screenshot PNG, JPG, JPEG, WEBP
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span className="flex items-center gap-1 text-amber-300">
                      <Lock className="w-3 h-3 text-amber-400" />
                      Visual Lock 🔒
                    </span>
                    <span>•</span>
                    <span className="text-cyan-300">OCR Kolom Content</span>
                    <span>•</span>
                    <span className="text-emerald-300">Dedup &amp; Matching</span>
                  </div>
                </div>

                {/* Scan Action Button */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleStartScan}
                    disabled={uploadedScreenshots.length === 0 || isScanning}
                    className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm font-mono shadow-[0_0_20px_rgba(0,240,255,0.4)] transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2.5 scale-100 hover:scale-[1.01]"
                    id="btn-mulai-scan-screenshot"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>MEMPROSES SCREENSHOT...</span>
                      </>
                    ) : (
                      <>
                        <ScanLine className="w-4 h-4 text-slate-950" />
                        <span>SCAN SCREENSHOT AAM / SERVER {uploadedScreenshots.length > 0 ? `(${uploadedScreenshots.length})` : ''}</span>
                      </>
                    )}
                  </button>

                  <div className="text-[11px] text-slate-400 font-mono flex items-start gap-1.5 px-1">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Sistem hanya mendeteksi row berikon 🔒 dan mengisolasi nama film unik.
                    </span>
                  </div>

                  {/* Scan Progress Bar (Requirement B: Animated gradient, glow, clear percent & status) */}
                  {isScanning && (
                    <div className="bg-slate-950 border border-cyan-500/50 rounded-xl p-3.5 space-y-2.5 animate-fade-in shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-cyan-500/30">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-cyan-300 font-bold flex items-center gap-2 truncate max-w-[230px]">
                          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                          <span className="tracking-wide uppercase">{scanProgressStep}</span>
                        </span>
                        <span className="text-white font-black text-sm drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">
                          {scanProgressPercent}%
                        </span>
                      </div>
                      <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 rounded-full transition-all duration-300 relative shadow-[0_0_15px_rgba(0,240,255,0.8)] animate-pulse"
                          style={{ width: `${scanProgressPercent}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] rounded-full" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>SCANNING PROGRESS</span>
                        <span className="text-cyan-400 font-semibold">{scanProgressPercent === 100 ? 'SELESAI ✓' : 'MEMPROSES OCR...'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* KOLOM KANAN (7 Cols on LG): Screenshot yang sudah berhasil di-upload, thumbnail preview LEBIH BESAR, tombol hapus X */}
              <div className="lg:col-span-7 bg-slate-950/80 border border-cyan-500/20 rounded-xl p-4 min-h-[260px] flex flex-col justify-between space-y-3 shadow-lg">
                <div className="flex items-center justify-between text-xs font-mono text-slate-300 border-b border-slate-800 pb-2.5">
                  <span className="font-bold flex items-center gap-2 text-cyan-300 text-sm">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    SCREENSHOT TERSIMPAN ({uploadedScreenshots.length})
                  </span>
                  <span className="text-xs text-slate-400">
                    {uploadedScreenshots.length > 0 ? 'Klik thumbnail untuk fullscreen preview' : 'Belum ada screenshot'}
                  </span>
                </div>

                {uploadedScreenshots.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-500 font-mono text-xs">
                    <ImageIcon className="w-10 h-10 mb-2.5 opacity-30 text-cyan-400" />
                    <p className="text-sm font-semibold text-slate-400">Screenshot yang Anda upload akan muncul di area ini.</p>
                    <p className="text-xs text-slate-500 mt-1">Gunakan drag &amp; drop atau tombol pilih file di kolom kiri.</p>
                  </div>
                ) : uploadedScreenshots.length === 1 ? (
                  /* Single Screenshot Display - optimal large preview */
                  <div className="py-1">
                    <div className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-500/70 rounded-xl overflow-hidden transition shadow-xl">
                      <div
                        onClick={() => {
                          setPreviewImage(uploadedScreenshots[0]);
                          setPreviewZoom(1);
                        }}
                        className="w-full h-56 sm:h-64 overflow-hidden bg-[#070b14] cursor-pointer flex items-center justify-center relative p-2 border-b border-slate-800"
                      >
                        <img
                          src={uploadedScreenshots[0].objectUrl || uploadedScreenshots[0].dataUrl}
                          alt={uploadedScreenshots[0].name}
                          className="max-w-full max-h-full object-contain group-hover:scale-[1.02] transition duration-200 rounded"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center backdrop-blur-[1px]">
                          <span className="px-3.5 py-1.5 rounded-lg bg-slate-900/95 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/50 flex items-center gap-1.5 shadow-2xl">
                            <Eye className="w-4 h-4" />
                            Klik untuk Fullscreen Preview
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 flex items-center justify-between text-xs font-mono text-slate-200 bg-slate-950 border-t border-slate-800">
                        <span className="truncate max-w-xs font-bold text-white" title={uploadedScreenshots[0].name}>
                          #{uploadedScreenshots[0].index || 1} {uploadedScreenshots[0].name} ({uploadedScreenshots[0].sizeFormatted})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImage(uploadedScreenshots[0]);
                              setPreviewZoom(1);
                            }}
                            className="p-1.5 rounded-lg hover:bg-cyan-950 hover:text-cyan-400 text-slate-400 transition"
                            title="Fullscreen preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveScreenshot(uploadedScreenshots[0].id)}
                            className="p-1.5 rounded-lg hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition"
                            title="Hapus screenshot ini"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Multiple Screenshots Display - Large Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto max-h-[420px] pr-1">
                    {uploadedScreenshots.map((item, idx) => (
                      <div
                        key={item.id}
                        className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-xl overflow-hidden transition shadow-md"
                      >
                        <div
                          onClick={() => {
                            setPreviewImage(item);
                            setPreviewZoom(1);
                          }}
                          className="h-36 sm:h-40 w-full overflow-hidden bg-[#070b14] cursor-pointer flex items-center justify-center relative p-2 border-b border-slate-800"
                        >
                          <img
                            src={item.objectUrl || item.dataUrl}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-200 rounded"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-cyan-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center backdrop-blur-[1px]">
                            <span className="px-2.5 py-1 rounded bg-slate-900/90 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40 flex items-center gap-1 shadow-lg">
                              <Eye className="w-3.5 h-3.5" />
                              Fullscreen
                            </span>
                          </div>
                        </div>

                        <div className="p-2 flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-950">
                          <span className="truncate max-w-[150px] font-semibold" title={item.name}>
                            #{item.index || idx + 1} {item.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewImage(item);
                                setPreviewZoom(1);
                              }}
                              className="p-1 rounded hover:bg-cyan-950 hover:text-cyan-400 text-slate-400 transition"
                              title="Fullscreen preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveScreenshot(item.id)}
                              className="p-1 rounded hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition"
                              title="Hapus screenshot ini"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* HASIL SCAN SCREENSHOT SECTION */}
          {/* ================================================================= */}
          {scannedResults.length > 0 && (
            <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 shadow-xl space-y-5 animate-slide-in">
              {/* Summary Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/40 uppercase">
                      HASIL SCAN BERHASIL ({scannedResults.length} FILM UNIK)
                    </span>
                    {scanStats && scanStats.duplicateMergedCount !== undefined && scanStats.duplicateMergedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 font-mono text-[11px] border border-blue-500/30">
                        ⚡ {scanStats.duplicateMergedCount} Duplikat Digabung ({scanStats.rawCandidateCount} raw → {scannedResults.length} unik)
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 font-mono text-[11px] border border-cyan-500/30">
                      ✓ {matchedScannedCount} Cocok Master Film
                    </span>
                    {needReviewScannedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 font-mono text-[11px] border border-amber-500/30">
                        ⚠ {needReviewScannedCount} Perlu Review
                      </span>
                    )}
                    {excludedNonFilmCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[11px] border border-slate-700">
                        {excludedNonFilmCount} content non-film diabaikan
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-white font-mono flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-cyan-400" />
                    REVIEW DAFTAR FILM HASIL SCAN
                  </h3>
                </div>

                {/* Control Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {debugRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowDebugPanel(!showDebugPanel)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
                        showDebugPanel
                          ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                          : 'bg-purple-950/80 text-purple-300 border border-purple-500/40 hover:bg-purple-900/60'
                      }`}
                      id="btn-toggle-debug"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>DEBUG LOG ({debugRows.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSelectAllResults}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono transition cursor-pointer"
                    id="btn-pilih-semua-scan"
                  >
                    PILIH SEMUA
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllResults}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono transition cursor-pointer"
                    id="btn-lepas-semua-scan"
                  >
                    LEPAS SEMUA
                  </button>
                  <button
                    type="button"
                    onClick={handleClearScannedResults}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-xs font-bold font-mono transition cursor-pointer"
                    id="btn-hapus-hasil-scan"
                  >
                    HAPUS HASIL
                  </button>
                  <button
                    type="button"
                    onClick={handleImportScannedToLaporan}
                    disabled={isImporting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)] transition cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
                    id="btn-import-scan-laporan"
                    title={scannedCheckedCount === 0 ? 'Pilih minimal satu film' : `Import ${scannedCheckedCount} film ke Laporan Film`}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>MENGIMPORT KE LAPORAN FILM...</span>
                      </>
                    ) : (
                      <>
                        <span>IMPORT KE LAPORAN FILM ({scannedCheckedCount})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ============================================================= */}
              {/* STATISTIK HASIL SCAN OCR.SPACE (REQUIREMENT 8) */}
              {/* ============================================================= */}
              {scanStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 p-4 rounded-xl bg-[#090e1c] border border-cyan-500/30 shadow-inner">
                  {/* 1. TOTAL ROW */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700/60">
                    <div className="text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      TOTAL ROW
                    </div>
                    <div className="text-xl font-mono font-black text-white mt-1">
                      {scanStats.totalRowCount}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">Baris tabel OCR</div>
                  </div>

                  {/* 2. LOCK DETECTED */}
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30">
                    <div className="text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      LOCK DETECTED
                    </div>
                    <div className="text-xl font-mono font-black text-amber-200 mt-1">
                      {scanStats.lockDetectedCount}
                    </div>
                    <div className="text-[10px] text-amber-400/80 font-mono">Row bergembok 🔒</div>
                  </div>

                  {/* 3. LOCK REVIEW */}
                  <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-500/30">
                    <div className="text-[10px] font-mono text-yellow-300 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-yellow-400" />
                      LOCK REVIEW
                    </div>
                    <div className="text-xl font-mono font-black text-yellow-200 mt-1">
                      {scanStats.lockReviewCount}
                    </div>
                    <div className="text-[10px] text-yellow-400/80 font-mono">Perlu review ⚠️</div>
                  </div>

                  {/* 4. NO LOCK */}
                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30">
                    <div className="text-[10px] font-mono text-rose-300 font-bold flex items-center gap-1">
                      <X className="w-3 h-3 text-rose-400" />
                      NO LOCK
                    </div>
                    <div className="text-xl font-mono font-black text-rose-200 mt-1">
                      {scanStats.ignoredNoLockCount}
                    </div>
                    <div className="text-[10px] text-rose-400/80 font-mono">Diabaikan tanpa 🔒</div>
                  </div>

                  {/* 5. CONTENT TERBACA */}
                  <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                    <div className="text-[10px] font-mono text-cyan-300 font-bold flex items-center gap-1">
                      <ScanLine className="w-3 h-3 text-cyan-400" />
                      CONTENT TERBACA
                    </div>
                    <div className="text-xl font-mono font-black text-cyan-200 mt-1">
                      {scanStats.ocrContentReadCount}
                    </div>
                    <div className="text-[10px] text-cyan-400/80 font-mono">Teks CPL diekstraksi</div>
                  </div>

                  {/* 6. MASTER MATCH */}
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                    <div className="text-[10px] font-mono text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      MASTER MATCH
                    </div>
                    <div className="text-xl font-mono font-black text-emerald-200 mt-1">
                      {scanStats.matchedMasterCount}
                    </div>
                    <div className="text-[10px] text-emerald-400/80 font-mono">Validasi Master Film</div>
                  </div>

                  {/* 7. PERLU DICOCOKKAN */}
                  <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-500/30">
                    <div className="text-[10px] font-mono text-purple-300 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-purple-400" />
                      PERLU DICOCOKKAN
                    </div>
                    <div className="text-xl font-mono font-black text-purple-200 mt-1">
                      {scanStats.needsMatchCount}
                    </div>
                    <div className="text-[10px] text-purple-400/80 font-mono">Review manual operator</div>
                  </div>
                </div>
              )}

              {/* Deduplication Metric Info (Requirement 11) */}
              {scanStats && scanStats.duplicateMergedCount !== undefined && scanStats.duplicateMergedCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-blue-950/40 border border-blue-500/35 text-xs font-mono shadow-inner animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-slate-200">
                      <strong className="text-cyan-300">DEDUPLICATION SELESAI:</strong> Dari <strong>{scanStats.rawCandidateCount}</strong> raw content terdeteksi, <strong>{scanStats.duplicateMergedCount}</strong> duplikat Master Film disatukan menjadi <strong>{scanStats.uniqueFilmCount} film unik</strong>.
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-blue-900/80 text-blue-300 font-bold text-[11px] border border-blue-400/40 shrink-0">
                    1 Film = 1 Import Row ✓
                  </span>
                </div>
              )}

              {/* ============================================================= */}
              {/* DEBUG INSPECTION PANEL (REQUIREMENT 7 & 13) */}
              {/* ============================================================= */}
              {showDebugPanel && debugRows.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/40 space-y-3 font-mono text-xs animate-fade-in shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <span className="font-bold text-purple-300 flex items-center gap-2 text-sm">
                        <Layers className="w-4 h-4 text-purple-400" />
                        DEBUG INSPECTION LOG — VISUAL LOCK & OCR.SPACE
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-cyan-300 mt-1 font-mono flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40">
                          OCR SOURCE: {scanStats?.ocrSource || 'ORIGINAL UPLOADED IMAGE'}
                        </span>
                        {scanStats?.originalImageWidth ? (
                          <span className="text-slate-400">
                            Dimensi Asli: {scanStats.originalImageWidth} x {scanStats.originalImageHeight} px
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Status deteksi row, preview thumbnail crop area lock, icon gembok 🔒, dan koordinat content ROI dari original image.
                      </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {([
                        { key: 'ALL', label: 'SEMUA ROW' },
                        { key: 'LOCKED', label: 'LOCK 🔒' },
                        { key: 'REVIEW', label: 'REVIEW LOCK ⚠️' },
                        { key: 'NO_LOCK', label: 'NO LOCK ❌' },
                        { key: 'MATCHED', label: 'MATCHED ✓' },
                        { key: 'NEEDS_MATCH', label: 'PERLU MATCH ❓' }
                      ] as const).map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDebugFilter(key)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                            debugFilter === key
                              ? 'bg-purple-600 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-auto space-y-2 pr-1 divide-y divide-slate-800/60">
                    {debugRows
                      .filter((r) => {
                        if (debugFilter === 'LOCKED') return r.lockStatus === 'LOCK';
                        if (debugFilter === 'REVIEW') return r.lockStatus === 'REVIEW_LOCK' || r.status === 'REVIEW LOCK';
                        if (debugFilter === 'NO_LOCK') return r.lockStatus === 'NO_LOCK' || !r.hasLock || r.status.startsWith('IGNORED — NO LOCK');
                        if (debugFilter === 'MATCHED') return r.status === 'MATCHED';
                        if (debugFilter === 'NEEDS_MATCH') return r.status === 'PERLU DICOCOKKAN';
                        return true;
                      })
                      .map((r, idx) => (
                        <div key={idx} className="pt-2 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                          {/* Visual Lock Thumbnail Crop (Requirement 7) */}
                          {r.lockCropUrl && (
                            <div className="shrink-0 flex flex-col items-center">
                              <img
                                src={r.lockCropUrl}
                                alt={`Lock Crop Row ${r.rowNumber}`}
                                className="w-16 h-10 object-contain rounded bg-black/90 border border-slate-700/80 shadow"
                                title={`Thumbnail Area Lock Row ${r.rowNumber}`}
                              />
                              <span className="text-[9px] font-mono text-slate-500 mt-0.5">Crop ROI</span>
                            </div>
                          )}

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                                ROW {String(r.rowNumber).padStart(2, '0')}
                              </span>

                              {/* Status Badge: LOCK / REVIEW_LOCK / NO_LOCK (Requirement 7) */}
                              {r.lockStatus === 'LOCK' ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                                  LOCK 🔒 ({r.lockConfidence || 0}%)
                                </span>
                              ) : r.lockStatus === 'REVIEW_LOCK' ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-500/40 flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5 text-yellow-400" />
                                  REVIEW LOCK ⚠️ ({r.lockConfidence || 0}%)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30">
                                  NO LOCK ❌ ({r.lockConfidence || 0}%)
                                </span>
                              )}

                              {/* Checkbox indicator (Requirement 7) */}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                r.hasCheckbox
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-slate-900 text-slate-500'
                              }`}>
                                Checkbox: {r.hasCheckbox ? '✓ Ya' : 'Tidak'}
                              </span>

                              <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                r.status === 'MATCHED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                  : r.status === 'REVIEW LOCK'
                                  ? 'bg-yellow-950 text-yellow-300 border border-yellow-500/40'
                                  : r.status === 'PERLU DICOCOKKAN'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {r.status}
                              </span>
                            </div>

                            {/* Requirement 9: Debug Row Y, Lock ROI, Content ROI */}
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                              <span>ROW Y: {r.rowY ?? r.lockY ?? '-'}px</span>
                              <span>•</span>
                              <span>
                                LOCK ROI: [x:{r.lockRoi?.x ?? r.lockX ?? '-'}, y:{r.lockRoi?.y ?? '-'}, {r.lockRoi?.width ?? 24}x{r.lockRoi?.height ?? '-'}]
                              </span>
                              <span>•</span>
                              <span>
                                CONTENT ROI: [x:{r.contentRoi?.x ?? '-'}, y:{r.contentRoi?.y ?? '-'}, {r.contentRoi?.width ?? '-'}x{r.contentRoi?.height ?? '-'}]
                              </span>
                            </div>

                            <div className="text-slate-200 font-mono text-xs break-all">
                              <strong className="text-cyan-400">OCR RAW:</strong> {r.ocrText}
                            </div>

                            {r.selectedOcrText && (
                              <div className="text-emerald-300 font-mono text-xs break-all bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/30">
                                <strong className="text-emerald-400">OCR TEXT YANG DIPILIH:</strong> {r.selectedOcrText}
                              </div>
                            )}

                            {r.masterFilmMatch && (
                              <div className="text-emerald-300 text-xs">
                                <strong>MATCH:</strong> {r.masterFilmMatch}
                              </div>
                            )}

                            {r.reason && (
                              <div className="text-[11px] text-slate-400 italic">
                                Alasan: {r.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Scanned Items Table / List */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/70 overflow-hidden divide-y divide-slate-800/80">
                {scannedResults.map((item, idx) => {
                  const isMatched = item.matchedFilm !== null;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleResultCheck(item.id)}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition cursor-pointer select-none ${
                        item.isChecked
                          ? 'bg-cyan-950/25 hover:bg-cyan-950/35 border-l-4 border-l-cyan-400'
                          : 'hover:bg-slate-900/60 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleResultCheck(item.id);
                          }}
                          className="mt-0.5 sm:mt-0 text-cyan-400 hover:text-cyan-300 shrink-0 cursor-pointer"
                        >
                          {item.isChecked ? (
                            <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-950" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600" />
                          )}
                        </button>

                        {/* Visual Lock Thumbnail Crop (Requirement 7) */}
                        {item.lockCropUrl && (
                          <div className="shrink-0 flex flex-col items-center">
                            <img
                              src={item.lockCropUrl}
                              alt="Lock ROI"
                              className="w-14 h-9 object-contain rounded bg-black/80 border border-slate-700/80 shadow"
                              title={`Visual Lock ROI (Confidence: ${item.lockConfidence || 0}%)`}
                            />
                            <span className="text-[9px] font-mono text-slate-500 mt-0.5">Crop ROI</span>
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          {/* Title & Lock badge (Requirement 4: Typography dinaikkan 1 level) */}
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-black text-white text-base sm:text-lg tracking-tight">
                              {item.canonicalTitle}
                            </span>

                            {/* Status Badge: LOCK / REVIEW_LOCK (Requirement 7) */}
                            {item.lockStatus === 'REVIEW_LOCK' ? (
                              <span className="px-2 py-0.5 rounded-md bg-yellow-950/90 text-yellow-300 font-mono text-xs font-black border border-yellow-500/50 flex items-center gap-1 shrink-0">
                                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                                REVIEW LOCK ⚠️ ({item.lockConfidence || 0}%)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 font-mono text-xs font-black border border-amber-500/50 flex items-center gap-1 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                TERKUNCI &amp; GEMBOK 🔒 ({item.lockConfidence || 0}%)
                              </span>
                            )}

                            {/* Checkbox indicator (Requirement 7) */}
                            {item.hasCheckbox && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono text-xs border border-cyan-500/40 flex items-center gap-1 shrink-0">
                                Checkbox: ✓
                              </span>
                            )}

                            {item.singkatan && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-mono text-xs font-bold border border-slate-700 shrink-0">
                                {item.singkatan}
                              </span>
                            )}

                            {/* Requirement 6: Tampilkan Jumlah Occurrence */}
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border flex items-center gap-1.5 shrink-0 ${
                              (item.occurrenceCount || 1) > 1
                                ? 'bg-blue-950 text-blue-200 border-blue-500/60 shadow-[0_0_10px_rgba(59,130,246,0.35)]'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              <Layers className="w-3 h-3 text-blue-400" />
                              DUPLIKAT TERDETEKSI ({item.occurrenceCount || 1} content)
                            </span>

                            {isMatched ? (
                              <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/50 flex items-center gap-1 shrink-0">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                ✓ COCOK MASTER FILM
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-md bg-amber-950/90 text-amber-300 font-mono text-xs font-bold border border-amber-500/50 flex items-center gap-1 shrink-0">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                ⚠ PERLU DICOCOKKAN
                              </span>
                            )}
                          </div>

                          {/* Technical metadata */}
                          <div className="text-xs sm:text-sm text-slate-300 font-mono mt-1.5 flex items-center gap-2 flex-wrap">
                            <span className="text-cyan-300 font-bold">{item.formatFilm}</span>
                            <span>•</span>
                            <span className="text-slate-200">{item.formatSound}</span>
                            {item.variants && item.variants.length > 1 && (
                              <>
                                <span>•</span>
                                <span className="text-purple-300 font-bold bg-purple-950/70 px-2 py-0.5 rounded border border-purple-500/40">
                                  {item.variants.length} Versi Teknis Terdeteksi ({item.variants.map((v) => v.techTag || v.formatSound || 'CPL').filter(Boolean).join(', ')})
                                </span>
                              </>
                            )}
                          </div>

                          {/* Raw CPL Details */}
                          {item.sourceRows && item.sourceRows.length > 1 ? (
                            <div className="mt-3 p-3.5 rounded-xl bg-[#080d1a] border border-blue-500/40 shadow-inner space-y-2">
                              <div className="flex items-center justify-between text-xs sm:text-sm font-mono font-bold text-blue-300 mb-1">
                                <span className="flex items-center gap-1.5">
                                  <Lock className="w-4 h-4 text-amber-400" />
                                  RAW CPL ({item.sourceRows.length} Terdeteksi):
                                </span>
                                <span className="text-xs text-blue-400 font-normal">Duplikat Tergabung ({item.occurrenceCount} Content)</span>
                              </div>
                              <div className="space-y-1.5">
                                {item.sourceRows.map((sr, sIdx) => (
                                  <div key={sIdx} className="text-xs sm:text-sm font-mono font-bold text-slate-100 leading-relaxed break-all select-all tracking-wide bg-black/70 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                                    <span>{sr.rawContentName}</span>
                                    <span className="text-xs text-slate-400 shrink-0 font-normal">Screenshot #{sr.screenshotIndex}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : item.rawContentName ? (
                            <div className="mt-3 p-3.5 rounded-xl bg-[#080d1a] border border-cyan-500/40 shadow-inner">
                              <div className="flex items-center justify-between text-xs sm:text-sm font-mono font-bold text-cyan-400 mb-1.5">
                                <span className="flex items-center gap-1.5">
                                  <Lock className="w-4 h-4 text-amber-400" />
                                  RAW CPL:
                                </span>
                                <span className="text-xs text-slate-400 font-normal">Bukti Pembacaan Kolom AAM</span>
                              </div>
                              <div className="text-xs sm:text-sm font-mono font-bold text-slate-100 leading-relaxed break-all select-all tracking-wide bg-black/70 p-2.5 rounded-lg border border-slate-800">
                                {item.rawContentName}
                              </div>
                            </div>
                          ) : null}

                          {/* Manual Match Selector if Unmatched */}
                          {!isMatched && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-3 flex items-center gap-2 flex-wrap"
                            >
                              <span className="text-xs font-mono font-bold text-amber-300">
                                Cocokkan dengan Master:
                              </span>
                              <select
                                onChange={(e) => handleManualMapResult(item.id, e.target.value)}
                                className="bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  -- Pilih Judul Master Film --
                                </option>
                                <option value="NEW_FILM">
                                  Tetapkan sebagai Film Baru (Tanpa Master)
                                </option>
                                {masterFilms.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.judul_film.toUpperCase()} ({m.singkatan_film || '-'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="shrink-0 flex items-center gap-3">
                        <span
                          className={`text-xs font-mono px-3 py-1.5 rounded-lg font-black tracking-wide ${
                            item.isChecked
                              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                              : 'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}
                        >
                          {item.isChecked ? 'DIPILIH ✓' : 'DIABAIKAN'}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSingleResult(item.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition"
                          title="Hapus item ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-400">
                <span>
                  Total {scannedResults.length} film terdeteksi dari screenshot • {scannedCheckedCount} dipilih untuk di-import
                </span>

                <button
                  type="button"
                  onClick={handleImportScannedToLaporan}
                  disabled={isImporting}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)] transition cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-1.5"
                  title={scannedCheckedCount === 0 ? 'Pilih minimal satu film' : `Import ${scannedCheckedCount} film ke Laporan Film`}
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>MENGIMPORT KE LAPORAN FILM...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>IMPORT KE LAPORAN FILM ({scannedCheckedCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* METHOD 2: PILIH MANUAL (FALLBACK) */}
      {/* ===================================================================== */}
      {activeMethod === 'manual' && (
        <div className="space-y-4 animate-fade-in" id="manual-picker-section">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  DAFTAR MASTER FILM TAHUNAN ({masterFilms.length} Film)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Centang film dari Master Film untuk dimasukkan ke Laporan Film.
                </p>
              </div>

              {/* Action Buttons for Manual Selection */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllManual}
                  disabled={filteredMasterFilms.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono transition cursor-pointer disabled:opacity-40"
                  id="btn-manual-pilih-semua"
                >
                  PILIH SEMUA
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllManual}
                  disabled={selectedManualCount === 0}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono transition cursor-pointer disabled:opacity-40"
                  id="btn-manual-lepas-semua"
                >
                  LEPAS SEMUA
                </button>
                <button
                  type="button"
                  onClick={handleImportManual}
                  disabled={isImporting}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)] transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                  id="btn-manual-import-laporan"
                  title={selectedManualCount === 0 ? 'Pilih minimal satu film' : `Import ${selectedManualCount} film ke Laporan Film`}
                >
                  {isImporting ? 'MENGIMPORT...' : `IMPORT KE LAPORAN FILM (${selectedManualCount})`}
                </button>
              </div>
            </div>

            {/* Search Input Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Cari judul film, format, sound, atau singkatan..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
              />
              {manualSearch && (
                <button
                  type="button"
                  onClick={() => setManualSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Master Film Table / Checklist View */}
            <div className="border border-slate-800 rounded-xl bg-slate-950/70 overflow-hidden">
              <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-800/80">
                {filteredMasterFilms.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs">
                    Tidak ada film di Master Film yang cocok dengan pencarian &ldquo;{manualSearch}&rdquo;.
                  </div>
                ) : (
                  filteredMasterFilms.map((film) => {
                    const isChecked = Boolean(manualSelectedIds[film.id]);
                    return (
                      <div
                        key={film.id}
                        onClick={() => handleToggleManualFilm(film.id)}
                        className={`p-3.5 flex items-center justify-between transition cursor-pointer select-none ${
                          isChecked
                            ? 'bg-cyan-950/30 hover:bg-cyan-950/40 border-l-4 border-l-cyan-400'
                            : 'hover:bg-slate-900/60 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleManualFilm(film.id);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 shrink-0"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-950" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-600" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                              <span className={isChecked ? 'text-cyan-200' : 'text-slate-200'}>
                                {(film.judul_film || '').toUpperCase()}
                              </span>
                              {film.singkatan_film && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                                  {(film.singkatan_film || '').toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="text-slate-300">{film.format_film || '2D Flat'}</span>
                              <span>•</span>
                              <span>{film.format_sound || '5.1'}</span>
                              <span>•</span>
                              <span className={film.status_kdm === 'Expired' ? 'text-rose-400' : 'text-emerald-400'}>
                                KDM: {film.status_kdm || 'Aktif'}
                              </span>
                              <span>•</span>
                              <span className="text-amber-400">
                                {film.status_tayang || 'BELUM TAYANG'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          <span
                            className={`text-[10px] font-mono px-2 py-1 rounded-md font-bold ${
                              isChecked
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-900 text-slate-500 border border-slate-800'
                            }`}
                          >
                            {isChecked ? 'DIPILIH ✓' : 'KLIK PILIH'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Counter Bar */}
            <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-400">
              <span>Menampilkan {filteredMasterFilms.length} dari {masterFilms.length} film</span>
              <span className="text-cyan-300 font-bold">{selectedManualCount} film dipilih</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULLSCREEN / LARGE SCREEN SCREENSHOT PREVIEW MODAL (Requirement 3) */}
      {/* ===================================================================== */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-fade-in select-none"
          onClick={() => {
            setPreviewImage(null);
            setPreviewZoom(1);
          }}
        >
          {/* Header Bar */}
          <div
            className="flex items-center justify-between bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 mb-2 shrink-0 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                <ImageIcon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm sm:text-base text-white font-bold truncate max-w-xs sm:max-w-xl">
                    {previewImage.name}
                  </span>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-500/40">
                    {previewImage.sizeFormatted}
                  </span>
                  {previewImage.width && previewImage.height && (
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded hidden sm:inline">
                      {previewImage.width} × {previewImage.height} px
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls & Close Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-cyan-300 font-bold px-2 min-w-[50px] text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(1)}
                  className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-white transition hidden sm:inline-block"
                  title="Reset Zoom (100%)"
                >
                  100%
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewImage(null);
                  setPreviewZoom(1);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
                title="Tutup preview fullscreen"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">TUTUP / CLOSE</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Body: Maximum Viewport Screen Presence */}
          <div
            className="flex-1 w-full h-full overflow-auto rounded-xl bg-[#03060c] border border-slate-800/80 flex items-center justify-center p-2 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="transition-transform duration-150 ease-out origin-center max-w-full max-h-full flex items-center justify-center"
              style={{ transform: `scale(${previewZoom})` }}
            >
              <img
                src={previewImage.objectUrl || previewImage.dataUrl}
                alt={previewImage.name}
                className="max-w-[95vw] max-h-[84vh] w-auto h-auto object-contain rounded shadow-2xl border border-slate-800"
                onError={(e) => {
                  if (previewImage.dataUrl && e.currentTarget.src !== previewImage.dataUrl) {
                    e.currentTarget.src = previewImage.dataUrl;
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
