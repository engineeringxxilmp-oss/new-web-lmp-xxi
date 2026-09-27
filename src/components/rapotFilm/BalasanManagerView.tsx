/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BalasanManagerItem, FilmUpload } from '../../types';
import { getIndonesianDate } from '../../views/PrEngineering';
import {
  FileCheck2,
  Upload,
  FileText,
  Image as ImageIcon,
  Eye,
  Trash2,
  CheckCircle2,
  Download,
  Plus,
  Search,
  Check,
  X,
  UploadCloud,
  UserCheck,
  CalendarDays,
  FileMinus,
  FileCheck,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  FolderDown
} from 'lucide-react';
import jsPDF from 'jspdf';

const STORAGE_KEY = 'xxi_balasan_manager';
const RIWAYAT_PENGHAPUSAN_KEY = 'xxi_riwayat_penghapusan';

export interface RiwayatPenghapusanItem {
  id: string;
  tanggalHapus: string;
  judulFilm: string;
  periode: string;
  disposisiOleh: string;
  catatan: string;
}

export default function BalasanManagerView() {
  const [items, setItems] = useState<BalasanManagerItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Pastikan sampel dummy 'bls-01' tidak pernah muncul otomatis
          return parsed.filter((item) => item.id !== 'bls-01');
        }
      }
    } catch (_) {}
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<BalasanManagerItem | null>(null);
  const [deleteTargetItem, setDeleteTargetItem] = useState<BalasanManagerItem | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Form & Scan states
  const [periode, setPeriode] = useState(`Laporan Film (${getIndonesianDate()})`);
  const [catatanManager, setCatatanManager] = useState('');
  const [status, setStatus] = useState<'Sudah Dibalas' | 'Menunggu Balasan'>('Sudah Dibalas');
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [namaManager, setNamaManager] = useState('Ikmalia');
  const [tanggalKeputusan, setTanggalKeputusan] = useState(getIndonesianDate());

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Interactive review checklist
  const [detectedHapusList, setDetectedHapusList] = useState<{ title: string; checked: boolean }[]>([]);
  const [detectedPertahankanList, setDetectedPertahankanList] = useState<string[]>([]);
  const [manualFilmInput, setManualFilmInput] = useState('');

  // Drive sync state
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const saveItems = (updated: BalasanManagerItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSyncStatus('Tersimpan & Sinkron');
      setTimeout(() => setSyncStatus(null), 2500);
    } catch (e) {
      console.error('Storage error:', e);
    }
  };

  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const item = items.find((i) => i.id === id);
    if (item) {
      setDeleteTargetItem(item);
    }
  };

  const confirmDelete = () => {
    if (!deleteTargetItem) return;
    const targetId = deleteTargetItem.id;
    const updated = items.filter((it) => it.id !== targetId);
    setItems(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSyncStatus('Arsip Balasan Manager berhasil dihapus.');
      setTimeout(() => setSyncStatus(null), 2500);
    } catch (e) {
      console.error('Storage error:', e);
    }
    if (previewItem?.id === targetId) {
      setPreviewItem(null);
    }
    setDeleteTargetItem(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image') && !file.type.includes('pdf')) {
      setUploadError('Hanya file Gambar (JPG/PNG/WebP) atau Dokumen PDF yang didukung.');
      return;
    }

    setUploadError('');
    setFileObject(file);
    const ext = file.name.split('.').pop() || (file.type.includes('pdf') ? 'pdf' : 'jpg');
    const cleanPeriod = periode.trim().replace(/[^a-zA-Z0-9\s-]/g, '') || 'Minggu_Ini';
    const autoFormattedName = `Balasan Manager - Laporan Film ${cleanPeriod}.${ext}`;
    setFileName(autoFormattedName);
    setFileType(file.type.includes('pdf') ? 'pdf' : 'image');

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      setFileBase64(result || '');
    };
    reader.readAsDataURL(file);
  };

  // Call Gemini Vision backend scanner for handwritten strikes / crosses ❌ / dispositions
  const handleScanBalasan = async () => {
    if (!fileBase64) {
      setUploadError('Silakan pilih file gambar atau PDF disposisi manager terlebih dahulu.');
      return;
    }

    setIsScanning(true);
    setScanFeedback('Menganalisis coretan, tanda silang ❌, dan disposisi tertulis Manager...');

    // Gather known film titles from selected films or master films
    let knownFilms: string[] = [];
    try {
      const sel = localStorage.getItem('xxi_selected_laporan_films');
      if (sel) {
        const parsed = JSON.parse(sel);
        if (Array.isArray(parsed)) {
          knownFilms = parsed.map((p: any) => p.judul_film || p.rawTitle || '');
        }
      }
    } catch (_) {}

    try {
      const res = await fetch('/api/scan-balasan-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: fileBase64,
          knownFilms: knownFilms.filter(Boolean)
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        const r = data.result;
        const hapusArr: string[] = Array.isArray(r.filmDihapus) ? r.filmDihapus : [];
        const pertahankanArr: string[] = Array.isArray(r.filmDipertahankan) ? r.filmDipertahankan : [];

        setDetectedHapusList(hapusArr.map(t => ({ title: t, checked: true })));
        setDetectedPertahankanList(pertahankanArr);

        if (r.catatanManager) {
          setCatatanManager(r.catatanManager);
        }
        if (r.disposisiOleh) {
          setNamaManager(r.disposisiOleh);
        }

        setScanFeedback(`Berhasil mendeteksi ${hapusArr.length} film diinstruksikan dihapus, ${pertahankanArr.length} film dipertahankan.`);
      } else {
        setScanFeedback(data.message || 'Tidak ada coretan atau tanda silang yang terdeteksi secara otomatis.');
      }
    } catch (err: any) {
      setScanFeedback('Gagal memindai: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleHapusItem = (index: number) => {
    setDetectedHapusList(prev =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleAddManualFilm = () => {
    if (!manualFilmInput.trim()) return;
    setDetectedHapusList(prev => [...prev, { title: manualFilmInput.trim(), checked: true }]);
    setManualFilmInput('');
  };

  const handleRemoveHapusItem = (index: number) => {
    setDetectedHapusList(prev => prev.filter((_, i) => i !== index));
  };

  // IMPORTANT HARD RULE:
  // "MASTER FILM ADALAH HISTORY. JANGAN otomatis menghapus film dari Master Film.
  // Penghapusan hanya berupa:
  // - status / log bahwa film telah dihapus dari server studio
  // - film tidak lagi masuk ke Laporan Film berikutnya
  // - Master Film tetap menyimpan data film tersebut."
  const handleProsesPenghapusan = () => {
    const filmsToHapus = detectedHapusList.filter(f => f.checked).map(f => f.title);
    if (filmsToHapus.length === 0) {
      alert('Pilih minimal satu judul film yang akan diproses penghapusannya.');
      return;
    }

    const konfirmasi = confirm(
      `Apakah Anda yakin ingin memproses penghapusan ${filmsToHapus.length} film dari server studio?\n\n` +
      `Film: ${filmsToHapus.join(', ')}\n\n` +
      `CATATAN: Master Film Tahunan tetap utuh sebagai arsip riwayat historis Cinema XXI.`
    );
    if (!konfirmasi) return;

    // 1. Remove from next Laporan Film selection list (xxi_selected_laporan_films)
    try {
      const savedSel = localStorage.getItem('xxi_selected_laporan_films');
      if (savedSel) {
        const parsed: FilmUpload[] = JSON.parse(savedSel);
        if (Array.isArray(parsed)) {
          const remaining = parsed.filter(film => {
            const matchHapus = filmsToHapus.some(h =>
              film.judul_film.toLowerCase().includes(h.toLowerCase()) ||
              h.toLowerCase().includes(film.judul_film.toLowerCase())
            );
            return !matchHapus;
          });
          localStorage.setItem('xxi_selected_laporan_films', JSON.stringify(remaining));
        }
      }
    } catch (e) {
      console.error('Failed to update selected laporan films:', e);
    }

    // 2. Append to log riwayat penghapusan (xxi_riwayat_penghapusan)
    try {
      const existingLogs: RiwayatPenghapusanItem[] = JSON.parse(
        localStorage.getItem(RIWAYAT_PENGHAPUSAN_KEY) || '[]'
      );
      const newLogs: RiwayatPenghapusanItem[] = filmsToHapus.map(title => ({
        id: `del-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tanggalHapus: getIndonesianDate(),
        judulFilm: title,
        periode,
        disposisiOleh: namaManager || 'Ikmalia',
        catatan: catatanManager || 'Dihapus berdasarkan disposisi Manager Cinema XXI'
      }));
      localStorage.setItem(RIWAYAT_PENGHAPUSAN_KEY, JSON.stringify([...newLogs, ...existingLogs]));
    } catch (e) {
      console.error('Failed to append deletion logs:', e);
    }

    // 3. Save as BalasanManagerItem
    const filmDihapusStr = filmsToHapus.join(', ');
    const filmDipertahankanStr = detectedPertahankanList.join(', ');

    const newItem: BalasanManagerItem = {
      id: `bls-${Date.now()}`,
      periode: periode.trim() || `Laporan Film (${getIndonesianDate()})`,
      tanggalUpload: getIndonesianDate(),
      fileName: fileName.trim() || `Balasan_Manager_${Date.now()}.pdf`,
      fileType,
      fileData: fileBase64,
      status: 'Sudah Dibalas',
      catatanManager: catatanManager.trim(),
      namaManager: namaManager.trim() || 'Ikmalia',
      tanggalKeputusan: tanggalKeputusan.trim() || getIndonesianDate(),
      filmDihapus: filmDihapusStr,
      filmDipertahankan: filmDipertahankanStr
    };

    saveItems([newItem, ...items]);
    setIsUploadModalOpen(false);

    alert(
      `PENGHAPUSAN BERHASIL DIPROSES!\n\n` +
      `✓ ${filmsToHapus.length} film ditandai telah dihapus dari server studio.\n` +
      `✓ Film tidak akan muncul pada Laporan Film periode berikutnya.\n` +
      `✓ Master Film Tahunan tetap utuh dan terlindungi sebagai arsip historis.`
    );
  };

  // Generate formal PDF Rekap Penghapusan Film
  const handleDownloadRekapPdf = (item: BalasanManagerItem) => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Header Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CINEMA XXI - REKAP DISPOSISI PENGHAPUSAN FILM', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${item.periode}`, 105, 27, { align: 'center' });
    doc.text(`Tanggal Keputusan: ${item.tanggalKeputusan || item.tanggalUpload}`, 105, 32, { align: 'center' });
    doc.text(`Disposisi Oleh: ${item.namaManager || 'Ikmalia'} (Cinema Manager)`, 105, 37, { align: 'center' });

    doc.line(15, 42, 195, 42);

    let currentY = 50;

    // Section 1: Film Dihapus
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(180, 0, 0);
    doc.text('DAFTAR FILM YANG DIINSTRUKSIKAN DIHAPUS DARI SERVER STUDIO:', 15, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const hapusList = (item.filmDihapus || '-').split(',').map(s => s.trim()).filter(Boolean);
    hapusList.forEach((film, idx) => {
      doc.text(`${idx + 1}. [ DIHAPUS ❌ ]  ${film}`, 20, currentY);
      currentY += 6;
    });

    currentY += 5;

    // Section 2: Film Dipertahankan
    if (item.filmDipertahankan) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 130, 50);
      doc.text('DAFTAR FILM YANG TETAP DIPERTAHANKAN / DILANJUTKAN:', 15, currentY);
      currentY += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      const pertahankanList = item.filmDipertahankan.split(',').map(s => s.trim()).filter(Boolean);
      pertahankanList.forEach((film, idx) => {
        doc.text(`${idx + 1}. [ DIPERTAHANKAN ✓ ]  ${film}`, 20, currentY);
        currentY += 6;
      });
      currentY += 5;
    }

    // Section 3: Catatan Manager
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('CATATAN / ARAHAN KHUSUS CINEMA MANAGER:', 15, currentY);
    currentY += 7;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    const splitNotes = doc.splitTextToSize(item.catatanManager || 'Tidak ada catatan tambahan.', 175);
    doc.text(splitNotes, 15, currentY);
    currentY += splitNotes.length * 6 + 15;

    // Signature Area
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text('Mengetahui & Menyetujui,', 140, currentY);
    currentY += 6;
    doc.text('Cinema Manager', 140, currentY);
    currentY += 20;
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${item.namaManager || 'Ikmalia'} )`, 140, currentY);

    // Save PDF
    const cleanPeriod = item.periode.replace(/\s*(?:[-–—]|s\/d|sd|sampai)\s*/i, ' s-d ').replace(/[^a-zA-Z0-9\s-]/g, '');
    const filename = `Rekap Penghapusan Film - ${cleanPeriod}.pdf`;
    doc.save(filename);
  };

  // Upload to Google Drive using existing backend
  const handleSyncToDrive = async (item: BalasanManagerItem) => {
    try {
      setSyncingId(item.id);
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const actionDateFolder = `${dd}-${mm}-${yyyy}`;
      const categoryPath = `Balasan Manager/${actionDateFolder}`;
      const cleanPeriod = item.periode.replace(/\s*(?:[-–—]|s\/d|sd|sampai)\s*/i, ' s-d ').replace(/[^a-zA-Z0-9\s-]/g, '');
      const uploadName = `Balasan Manager - Laporan Film ${cleanPeriod}`;

      // Use uploaded file base64 or create PDF
      let fileDataToSend = item.fileData;
      let mime = item.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';

      if (!fileDataToSend) {
        // Create jsPDF on the fly
        const doc = new jsPDF();
        doc.text(`Balasan Manager - ${item.periode}`, 15, 20);
        doc.text(`Catatan: ${item.catatanManager}`, 15, 30);
        fileDataToSend = doc.output('datauristring');
        mime = 'application/pdf';
      }

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName,
          category: categoryPath,
          fileData: fileDataToSend,
          mimeType: mime,
          size: '1.2 MB'
        })
      });
      const data = await res.json();
      if (data.success) {
        const updated = items.map((i) =>
          i.id === item.id ? { ...i, driveSynced: true, driveLink: data.driveLink || '#' } : i
        );
        saveItems(updated);
        alert(`Berhasil diarsipkan ke Google Drive!\nFolder: ${categoryPath}\nFile: ${uploadName}.pdf`);
      } else {
        alert('Gagal sinkron ke Google Drive: ' + (data.message || 'Terjadi kesalahan'));
      }
    } catch (err: any) {
      alert('Error mengunggah ke Google Drive: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = (id: string) => {
    handleDeleteItem(id);
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.periode.toLowerCase().includes(q) ||
      item.fileName.toLowerCase().includes(q) ||
      (item.catatanManager && item.catatanManager.toLowerCase().includes(q)) ||
      (item.filmDihapus && item.filmDihapus.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6" id="balasan-manager-view">
      {/* Top Banner */}
      <div className="bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40 uppercase tracking-widest">
                DISPOSISI &amp; WORKFLOW PENGHAPUSAN
              </span>
              {syncStatus && (
                <span className="text-[10px] font-mono text-cyan-400 animate-pulse">
                  ● {syncStatus}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              <FileCheck2 className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_8px_#34d399]" />
              BALASAN MANAGER
            </h2>
            <p className="text-sm text-slate-300 mt-1 font-sans">
              Scan balasan WhatsApp / PDF disposisi Manager dengan AI Scanner (deteksi coretan tangan &amp; tanda silang ❌), review checklist, proses penghapusan film dari server, dan cetak PDF rekap penghapusan.
            </p>
          </div>

          <button
            onClick={() => {
              setDetectedHapusList([]);
              setDetectedPertahankanList([]);
              setScanFeedback(null);
              setIsUploadModalOpen(true);
            }}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono font-bold text-xs md:text-sm flex items-center gap-2 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 transition-all cursor-pointer active:scale-95"
            id="btn-open-upload-balasan"
          >
            <Upload className="w-4 h-4" />
            <span>UNGGAH &amp; SCAN BALASAN</span>
          </button>
        </div>

        {/* Search */}
        <div className="mt-5 pt-4 border-t border-cyan-500/20 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari periode, nama file, film dihapus, catatan..."
              className="w-full bg-[#080d1a] border border-cyan-500/30 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            Total {filteredItems.length} Dokumen Balasan
          </span>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="balasan-list-container">
        {filteredItems.length === 0 ? (
          <div className="col-span-2 bg-[#0a0f1d]/80 rounded-2xl border border-cyan-500/20 p-12 text-center text-slate-400">
            <FileCheck2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-base font-bold text-slate-300">Belum ada dokumen balasan manager.</p>
            <p className="text-xs text-slate-500 mt-1">
              Klik tombol &ldquo;Unggah &amp; Scan Balasan&rdquo; untuk memindai dokumen balasan WhatsApp bertanda silang ❌ atau coretan tangan.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isPdf = item.fileType === 'pdf';
            const isReplied = item.status === 'Sudah Dibalas';

            return (
              <div
                key={item.id}
                className="bg-[#0a0f1d]/90 rounded-2xl border border-cyan-500/25 p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/60 transition-all flex flex-col justify-between"
                id={`balasan-item-${item.id}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-center shrink-0 ${
                          isPdf
                            ? 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                            : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                        }`}
                      >
                        {isPdf ? <FileText className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                      </div>
                      <div>
                        <span className="text-xs font-mono font-bold text-cyan-400">{item.tanggalUpload}</span>
                        <h3 className="text-base font-black text-white tracking-wide font-sans">{item.periode}</h3>
                        <span className="text-[11px] font-mono text-slate-400 truncate block max-w-xs">
                          {item.fileName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                          isReplied
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                            : 'bg-amber-950/90 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                        }`}
                      >
                        {item.status}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Manager and Decision Meta */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                      {item.namaManager || 'Ikmalia (Manager)'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                      {item.tanggalKeputusan || item.tanggalUpload}
                    </span>
                  </div>

                  {/* Film Dihapus & Dipertahankan Summary Tags */}
                  {(item.filmDihapus || item.filmDipertahankan) && (
                    <div className="mt-3 space-y-2 text-xs font-mono">
                      {item.filmDihapus && (
                        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                          <FileMinus className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[10px] uppercase text-rose-400 block tracking-wider">
                              Instruksi Penghapusan Server:
                            </span>
                            <span className="font-bold">{item.filmDihapus}</span>
                          </div>
                        </div>
                      )}
                      {item.filmDipertahankan && (
                        <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[10px] uppercase text-emerald-400 block tracking-wider">
                              Dipertahankan / Dilanjutkan:
                            </span>
                            <span className="font-bold">{item.filmDipertahankan}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Disposisi Notes */}
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                      Catatan / Disposisi Cinema Manager:
                    </span>
                    {item.catatanManager || <span className="italic text-slate-500">Tidak ada catatan tambahan.</span>}
                  </div>
                </div>

                {/* Actions: Download Rekap PDF, Google Drive Sync, View Document */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadRekapPdf(item)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
                      title="Download PDF Rekap Penghapusan Film"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF Rekap</span>
                    </button>

                    <button
                      onClick={() => handleSyncToDrive(item)}
                      disabled={syncingId === item.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                      title="Unggah ke Google Drive (Balasan Manager/Bulan Tahun)"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{syncingId === item.id ? 'Mengunggah...' : 'Arsip Drive'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat File</span>
                    </button>

                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-500/40 transition cursor-pointer"
                      title="Hapus Dokumen Balasan Manager"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload & AI Scanner Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0d1322] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 text-white shadow-[0_0_50px_rgba(0,240,255,0.25)] animate-scale-in my-8">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold text-sm">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>UNGGAH &amp; SCAN DISPOSISI BALASAN MANAGER</span>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 font-mono text-sm">
              {/* Periode */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1 text-xs">
                  Periode Laporan Film
                </label>
                <input
                  type="text"
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  placeholder="Contoh: Laporan Film Minggu 38 (21 - 27 September 2026)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:border-cyan-400 focus:outline-none text-xs"
                />
              </div>

              {/* File Upload Box */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1 text-xs">
                  Pilih Foto Tangkapan Layar / PDF WhatsApp Balasan Manager <span className="text-rose-400">*</span>
                </label>
                <div className="p-4 rounded-xl bg-slate-950 border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 transition-colors text-center cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-7 h-7 text-cyan-400 mx-auto mb-1.5" />
                  <p className="text-xs text-white font-bold">
                    {fileName ? `File Terpilih: ${fileName}` : 'Klik atau Tarik Foto / PDF Disposisi ke Sini'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mendukung coretan tangan, tanda silang ❌, centang ✓, atau teks balasan WhatsApp
                  </p>
                </div>
                {uploadError && <p className="text-xs text-rose-400 mt-1 font-bold">{uploadError}</p>}
              </div>

              {/* AI Scanner Trigger Button */}
              {fileBase64 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Scanner Disposisi Manager (Gemini AI Vision)
                    </span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Otomatis mendeteksi judul film yang dicoret/silang ❌ dan teks disposisi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleScanBalasan}
                    disabled={isScanning}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Sedang Memindai...' : 'Mulai Pindai Disposisi'}</span>
                  </button>
                </div>
              )}

              {scanFeedback && (
                <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-xs font-sans">
                  {scanFeedback}
                </div>
              )}

              {/* Review Section: Film Ditandai Dihapus (dengan Checkbox) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5 tracking-wider">
                    <FileMinus className="w-4 h-4" />
                    FILM DITANDAI DIHAPUS DARI SERVER (CHECKLIST)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Centang film yang disetujui untuk dihapus
                  </span>
                </div>

                {detectedHapusList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada film yang terdeteksi untuk dihapus. Klik &ldquo;Mulai Pindai Disposisi&rdquo; di atas atau tambahkan secara manual di bawah.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {detectedHapusList.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => handleToggleHapusItem(idx)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-500 cursor-pointer"
                          />
                          <span className={`font-bold ${item.checked ? 'text-rose-200' : 'text-slate-500 line-through'}`}>
                            {item.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveHapusItem(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual Add Film to delete list */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <input
                    type="text"
                    value={manualFilmInput}
                    onChange={(e) => setManualFilmInput(e.target.value)}
                    placeholder="Tambah judul film dihapus manual..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddManualFilm();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddManualFilm}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </div>
              </div>

              {/* Film Dipertahankan Badges */}
              {detectedPertahankanList.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Film Yang Dipertahankan / Tayang Lanjut:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedPertahankanList.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
                      >
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Manager Details & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1 text-xs">
                    Nama Cinema Manager
                  </label>
                  <input
                    type="text"
                    value={namaManager}
                    onChange={(e) => setNamaManager(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1 text-xs">
                    Tanggal Keputusan
                  </label>
                  <input
                    type="text"
                    value={tanggalKeputusan}
                    onChange={(e) => setTanggalKeputusan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1 text-xs">
                  Catatan / Arahan Disposisi Manager
                </label>
                <textarea
                  rows={2}
                  value={catatanManager}
                  onChange={(e) => setCatatanManager(e.target.value)}
                  placeholder="Ketik catatan atau arahan teknis dari Cinema Manager..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-sans focus:border-cyan-400 focus:outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>

                <div className="w-full sm:w-auto flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleProsesPenghapusan}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:from-rose-500 hover:to-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>PROSES PENGHAPUSAN FILM</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Previewer Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0d1322] border border-cyan-500/40 rounded-2xl max-w-4xl w-full p-6 text-white shadow-[0_0_60px_rgba(0,240,255,0.3)] animate-scale-in flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 shrink-0">
              <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold text-sm">
                <Eye className="w-5 h-5 text-cyan-400" />
                <span>LIHAT DOKUMEN: {previewItem.fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadRekapPdf(previewItem)}
                  className="p-2 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Download Rekap PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Rekap</span>
                </button>
                <button
                  onClick={() => handleDeleteItem(previewItem.id)}
                  className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Hapus Dokumen Balasan Ini"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus</span>
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content Viewport */}
            <div className="flex-1 overflow-auto my-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[350px]">
              {previewItem.fileData ? (
                previewItem.fileType === 'pdf' ? (
                  <iframe
                    src={previewItem.fileData}
                    title={previewItem.fileName}
                    className="w-full h-full min-h-[500px] rounded-xl"
                  />
                ) : (
                  <img
                    src={previewItem.fileData}
                    alt={previewItem.fileName}
                    className="max-h-[70vh] max-w-full object-contain rounded-lg p-2"
                  />
                )
              ) : (
                <div className="p-8 text-center text-slate-500 font-mono text-sm">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                  <p className="text-white font-bold">Dokumen Contoh / Belum Ada File Base64</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Dokumen ini merupakan arsip disposisi dari Manager Cinema XXI.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Meta */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0 text-xs font-mono">
              <span className="text-slate-400">Periode: <strong className="text-white">{previewItem.periode}</strong></span>
              <span className="text-emerald-300 font-bold">Status: {previewItem.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {deleteTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0d1322] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-[0_0_40px_rgba(244,63,94,0.3)] animate-scale-in space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black font-mono">HAPUS DOKUMEN BALASAN</h3>
                <p className="text-xs text-slate-400">Tindakan ini permanen dan menghapus arsip yang dipilih.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
              <div><span className="text-slate-500">File:</span> <strong className="text-white">{deleteTargetItem.fileName}</strong></div>
              <div><span className="text-slate-500">Periode:</span> <span className="text-slate-200">{deleteTargetItem.periode}</span></div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Apakah Anda yakin ingin menghapus arsip Balasan Manager ini? Data Laporan Film dan Master Film tidak akan terpengaruh.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono transition cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black font-mono shadow-[0_0_15px_rgba(244,63,94,0.4)] transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>HAPUS SEKARANG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
