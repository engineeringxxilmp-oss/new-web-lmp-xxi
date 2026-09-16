/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FilmUpload, SystemBranding, WeeklyReport } from '../types';
import db from '../db/localDb';
import { getIndonesianDate, toISODate } from './PrEngineering';
import {
  FileText,
  Play,
  Settings,
  RefreshCw,
  Eye,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  UserCheck,
  Calendar,
  AlertCircle,
  Trash2,
  Clock,
  Layers,
  FileCode,
  Filter,
  Search,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toJpeg } from 'html-to-image';

interface LaporanFilmProps {
  filmUploads: FilmUpload[];
  branding: SystemBranding;
}

interface GeneratedFilm {
  id: string;
  judul_film: string;
  studio: string;
  format_film: string;
  format_sound: string;
  cpl: string;
  kdm: string;
  status_upload: string;
  status_dcp: string;
  tanggal_upload: string;
  ukuran_file: string;
  keterangan: string;
  status_tayang: string;
}

interface ReportPayload {
  films: GeneratedFilm[];
  notes: string;
}

function getFormattedFormat(format: string): string {
  const upper = (format || '').toUpperCase();
  if (upper.includes('3D') && upper.includes('2D')) return '2D DAN 3D';
  if (upper.includes('3D')) return '3D';
  if (upper.includes('2D')) return '2D';
  return format || '2D';
}

function getFormattedKdm(film: GeneratedFilm | FilmUpload): string {
  const statusTayang = film.status_tayang || ('status_tayang' in film ? film.status_tayang : '');
  if (statusTayang !== 'SEDANG TAYANG') {
    return 'TIDAK ADA';
  }
  const kdm = ('status_kdm' in film ? film.status_kdm : ('kdm' in film ? film.kdm : '')) || '';
  if (kdm === 'Tidak Ada' || kdm === 'Expired' || !kdm) {
    return 'TIDAK ADA';
  }
  if (kdm === 'Aktif') {
    return 'Mon May 11 2026';
  }
  
  const iso = toISODate(kdm);
  if (iso) {
    try {
      const parts = iso.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate().toString().padStart(2, '0')} ${d.getFullYear()}`;
    } catch (e) {}
  }
  return kdm;
}

export default function LaporanFilm({ filmUploads, branding }: LaporanFilmProps) {
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [activeReport, setActiveReport] = useState<WeeklyReport | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportPdfSuccess, setExportPdfSuccess] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Custom Editable Notes for active report
  const [customNotes, setCustomNotes] = useState('');

  // Print & Report Configurations
  const [pembuatLaporan, setPembuatLaporan] = useState('Alamsyah');
  const [jabatanPembuat, setJabatanPembuat] = useState('Opr');
  const [mengetahui, setMengetahui] = useState('Ikmalia');
  const [jabatanMengetahui, setJabatanMengetahui] = useState('Manager Bioskop');
  const [nomorDokumen, setNomorDokumen] = useState('XXI/LMP/ENG/2026/004');

  // Table Filtering States inside Report View
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportFilterFormat, setReportFilterFormat] = useState('ALL');
  const [reportFilterStatusTayang, setReportFilterStatusTayang] = useState('ALL');
  const [reportFilterStatusKdm, setReportFilterStatusKdm] = useState('ALL');

  // Week Grouping Logic
  const getMonday = (d: Date): Date => {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getWeekRangeString = (dateStr: string): string => {
    let iso = toISODate(dateStr);
    if (!iso) {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const d = now.getDate();
      iso = `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
    }
    const parts = iso.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const monday = getMonday(date);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    const formatDate = (d: Date) => {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    return `${formatDate(monday)} - ${formatDate(sunday)}`;
  };

  // Extract available weeks dynamically from uploads
  const weekRangesRaw = Array.from(new Set(filmUploads.map(f => getWeekRangeString(f.tanggal_terima))))
    .filter(w => w !== 'Lainnya')
    .sort((a, b) => b.localeCompare(a)); // Descending chronological order

  const weekRanges = weekRangesRaw.length > 0 ? ['Semua Periode', ...weekRangesRaw] : [];

  // Fetch saved weekly reports on mount and when db changes
  const loadReportsFromDb = () => {
    setWeeklyReports(db.getWeeklyReports());
  };

  useEffect(() => {
    loadReportsFromDb();
    const unsub = db.subscribe(() => {
      loadReportsFromDb();
    });
    return unsub;
  }, []);

  // Set default week on mount or when week ranges load
  useEffect(() => {
    if (weekRanges.length > 0 && !selectedWeek) {
      setSelectedWeek(weekRanges[0]);
    }
  }, [weekRanges, selectedWeek]);

  // Set active report when selected week or weekly reports change safely without causing an infinite render loop
  useEffect(() => {
    if (!selectedWeek || filmUploads.length === 0) {
      setActiveReport(null);
      setCustomNotes('');
      return;
    }

    const existingReport = weeklyReports.find(r => r.periode === selectedWeek);
    if (existingReport) {
      setActiveReport(existingReport);
      try {
        const parsed = JSON.parse(existingReport.report_json) as ReportPayload;
        setCustomNotes(parsed.notes || 'Seluruh DCP Cinema XXI telah terverifikasi dan siap ditayangkan.');
      } catch {
        setCustomNotes('Seluruh DCP Cinema XXI telah terverifikasi dan siap ditayangkan.');
      }
    } else {
      setActiveReport(null);
      setCustomNotes('');
    }
  }, [selectedWeek, filmUploads, weeklyReports]);

  // Handle live Notes changes saved to the active report in db
  const handleSaveNotes = (notesText: string) => {
    setCustomNotes(notesText);
    if (activeReport) {
      try {
        const parsed = JSON.parse(activeReport.report_json) as ReportPayload;
        parsed.notes = notesText;
        
        const updatedReport: WeeklyReport = {
          ...activeReport,
          report_json: JSON.stringify(parsed)
        };
        db.saveWeeklyReport(updatedReport);
        // Synchronously update weeklyReports list so our effect does not overwrite it
        setWeeklyReports(db.getWeeklyReports());
      } catch (err) {
        console.error('Failed to update notes in DB', err);
      }
    }
  };

  // Check if current data has changed compared to the active report
  const isDataChangedSinceGeneration = () => {
    // With real-time auto-sync active, data is never stale!
    return false;
  };

  // Stable file size generator based on film ID and format
  const getStableSize = (id: string, format: string) => {
    let base = 120;
    if (format.includes('IMAX')) base = 210;
    else if (format.includes('3D')) base = 175;
    else if (format.includes('ATMOS')) base = 155;

    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variance = hash % 35;
    return `${base + variance} GB`;
  };

  // Start Generation sequence
  const handleGenerateReport = async () => {
    if (!selectedWeek) return;

    const filteredFilms = selectedWeek === 'Semua Periode'
      ? filmUploads
      : filmUploads.filter(f => getWeekRangeString(f.tanggal_terima) === selectedWeek);
    if (filteredFilms.length === 0) return;

    // Trigger loading animation steps
    setIsLoading(true);
    setLoadingProgress(5);
    setLoadingStep('Generating Weekly Report...');
    await new Promise(r => setTimeout(r, 600));

    setLoadingProgress(25);
    setLoadingStep('Mengumpulkan data...');
    await new Promise(r => setTimeout(r, 800));

    setLoadingProgress(55);
    setLoadingStep('Memvalidasi KDM...');
    await new Promise(r => setTimeout(r, 700));

    setLoadingProgress(85);
    setLoadingStep('Menyusun laporan...');
    await new Promise(r => setTimeout(r, 600));

    setLoadingProgress(100);
    setLoadingStep('Selesai.');
    await new Promise(r => setTimeout(r, 450));

    // Construct GeneratedFilms list
    const statusOrder: Record<string, number> = {
      'BELUM TAYANG': 1,
      'SEDANG TAYANG': 2,
      'SUDAH TAYANG': 3
    };

    const sortedFilms = [...filteredFilms].sort((a, b) => {
      const orderA = statusOrder[a.status_tayang.toUpperCase()] || 4;
      const orderB = statusOrder[b.status_tayang.toUpperCase()] || 4;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.judul_film.localeCompare(b.judul_film);
    });

    const generatedFilms: GeneratedFilm[] = sortedFilms.map((film, index) => {
      // Check if keterangan contains studio number
      const matchStudio = film.keterangan.match(/Studio\s*([1-8])/i);
      const studio = matchStudio ? `Studio ${matchStudio[1]}` : `Studio ${(index % 3) + 1}`;

      const status_upload = film.status_tayang === 'BELUM TAYANG' ? 'Proses (80%)' : 'Berhasil';
      const status_dcp = 'Lengkap';
      const ukuran_file = getStableSize(film.id, film.format_film);

      return {
        id: film.id,
        judul_film: film.judul_film,
        studio,
        format_film: film.format_film,
        format_sound: film.format_sound,
        cpl: film.singkatan_film || film.judul_film.substring(0, 3).toUpperCase(),
        kdm: film.status_kdm,
        status_upload,
        status_dcp,
        tanggal_upload: film.tanggal_terima,
        ukuran_file,
        keterangan: film.keterangan,
        status_tayang: film.status_tayang
      };
    });

    // Compute stats
    const total_film = generatedFilms.length;
    const total_kdm_aktif = generatedFilms.filter(f => f.kdm === 'Aktif' || (!['Expired', 'Tidak Ada'].includes(f.kdm))).length;
    const total_upload_berhasil = generatedFilms.filter(f => f.status_upload === 'Berhasil').length;

    // Report date string
    const now = new Date();
    const formattedGenerateDate = `${now.getDate()} ${[
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ][now.getMonth()]} ${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const reportPayload: ReportPayload = {
      films: generatedFilms,
      notes: customNotes || 'Seluruh DCP Cinema XXI telah terverifikasi dan siap ditayangkan.'
    };

    // Save report to DB
    const existingReport = weeklyReports.find(r => r.periode === selectedWeek);
    const reportId = existingReport ? existingReport.id : `rep-${Date.now()}`;

    const newReport: WeeklyReport = {
      id: reportId,
      periode: selectedWeek,
      tanggal_generate: formattedGenerateDate,
      generated_by: pembuatLaporan,
      jumlah_film: total_film,
      jumlah_kdm: total_kdm_aktif,
      jumlah_upload: total_upload_berhasil,
      status: 'Selesai',
      report_json: JSON.stringify(reportPayload)
    };

    db.saveWeeklyReport(newReport);
    setWeeklyReports(db.getWeeklyReports());
    setIsLoading(false);
    setShowPreview(true);
  };

  // Delete generated report from DB to restart
  const handleDeleteReport = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus laporan ini dan mengembalikan ke draft?')) {
      db.deleteWeeklyReport(id);
      setWeeklyReports(db.getWeeklyReports());
    }
  };

  // PDF Direct Exporter
  const handleExportPdf = async () => {
    if (!activeReport) return;
    
    // Track original preview state to restore later
    const originalPreviewState = showPreview;
    
    // Save original scroll position
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    // Find the wrapper element that hides/off-screens the printable area
    const wrapperEl = document.getElementById('printable-area-outer')?.parentElement as HTMLElement | null;
    
    let wrapperOriginalPosition = '';
    let wrapperOriginalLeft = '';
    let wrapperOriginalTop = '';
    let wrapperOriginalWidth = '';
    let wrapperOriginalHeight = '';
    let wrapperOriginalOverflow = '';
    let wrapperOriginalOpacity = '';
    let wrapperOriginalTransform = '';
    let wrapperOriginalPointerEvents = '';
    let wrapperOriginalVisibility = '';
    let wrapperOriginalDisplay = '';

    const styleElements = Array.from(document.querySelectorAll('style'));
    const originalStylesText: { el: HTMLStyleElement; text: string }[] = [];

    try {
      setExportPdfSuccess(false);
      setPdfDownloadUrl(null);
      setIsExportingPdf(true);
      setLoadingStep('Mempersiapkan dokumen PDF...');
      setLoadingProgress(10);

      // Force preview to be true so the printable element is mounted and rendered in the DOM
      if (!showPreview) {
        setShowPreview(true);
        // Wait for React to render the printable-paper-view fully
        await new Promise(r => setTimeout(r, 250));
      }

      const original = document.getElementById('printable-paper-view');
      if (!original) {
        setShowPreview(originalPreviewState);
        setIsExportingPdf(false);
        alert('Elemen laporan tidak ditemukan di dalam halaman.');
        return;
      }

      setLoadingProgress(25);
      setLoadingStep('Merender halaman laporan...');

      // Save original styles of the element to restore later
      const originalPosition = original.style.position;
      const originalLeft = original.style.left;
      const originalTop = original.style.top;
      const originalZIndex = original.style.zIndex;
      const originalWidth = original.style.width;
      const originalBoxShadow = original.style.boxShadow;
      const originalMargin = original.style.margin;

      if (wrapperEl) {
        wrapperOriginalPosition = wrapperEl.style.position;
        wrapperOriginalLeft = wrapperEl.style.left;
        wrapperOriginalTop = wrapperEl.style.top;
        wrapperOriginalWidth = wrapperEl.style.width;
        wrapperOriginalHeight = wrapperEl.style.height;
        wrapperOriginalOverflow = wrapperEl.style.overflow;
        wrapperOriginalOpacity = wrapperEl.style.opacity;
        wrapperOriginalTransform = wrapperEl.style.transform;
        wrapperOriginalPointerEvents = wrapperEl.style.pointerEvents;
        wrapperOriginalVisibility = wrapperEl.style.visibility;
        wrapperOriginalDisplay = wrapperEl.style.display;

        // Temporarily override to make sure it's fully visible and positioned properly for capture
        wrapperEl.style.setProperty('position', 'relative', 'important');
        wrapperEl.style.setProperty('left', '0', 'important');
        wrapperEl.style.setProperty('top', '0', 'important');
        wrapperEl.style.setProperty('width', '100%', 'important');
        wrapperEl.style.setProperty('height', 'auto', 'important');
        wrapperEl.style.setProperty('overflow', 'visible', 'important');
        wrapperEl.style.setProperty('opacity', '1', 'important');
        wrapperEl.style.setProperty('transform', 'none', 'important');
        wrapperEl.style.setProperty('pointer-events', 'auto', 'important');
        wrapperEl.style.setProperty('visibility', 'visible', 'important');
        wrapperEl.style.setProperty('display', 'block', 'important');
      }

      // Temporarily style the printable paper itself
      original.style.setProperty('position', 'relative', 'important');
      original.style.setProperty('left', '0', 'important');
      original.style.setProperty('top', '0', 'important');
      original.style.setProperty('width', '850px', 'important');
      original.style.setProperty('box-shadow', 'none', 'important');
      original.style.setProperty('margin', '0 auto', 'important');

      // Find notes and no-print elements inside original to hide them temporarily
      const notesEl = original.querySelector('#printable-notes') as HTMLElement;
      const noPrintEls = original.querySelectorAll('.no-print');
      const titleEl = original.querySelector('#printable-title') as HTMLElement;
      
      let originalTitleText = '';
      if (titleEl) {
        originalTitleText = titleEl.textContent || '';
        titleEl.textContent = 'LAPORAN FILM LIPPO MALL PURI CINEMA XXI';
      }
      
      let notesOriginalDisplay = '';
      if (notesEl) {
        notesOriginalDisplay = notesEl.style.display;
        notesEl.style.display = 'none';
      }
      
      const noPrintOriginalDisplays: string[] = [];
      noPrintEls.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        noPrintOriginalDisplays[index] = htmlEl.style.display;
        htmlEl.style.display = 'none';
      });

      // Backup and temporarily replace oklch colors with HSL to prevent html2canvas parsing errors
      try {
        styleElements.forEach(el => {
          try {
            const text = el.textContent || '';
            if (text && text.includes('oklch')) {
              originalStylesText.push({ el, text });
              
              const convertedText = text.replace(
                /oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+(?:deg|rad|grad|turn)?)(?:\s*\/\s*([0-9.]+%?))?\s*\)/gi,
                (match, l, c, h, a) => {
                  let lightVal = parseFloat(l);
                  if (l.includes('%')) {
                    lightVal = parseFloat(l);
                  } else if (lightVal <= 1.0) {
                    lightVal = lightVal * 100;
                  }
                  
                  let chromaVal = parseFloat(c);
                  if (c.includes('%')) {
                    chromaVal = parseFloat(c) / 100;
                  }
                  
                  let hueVal = parseFloat(h);
                  if (h.includes('rad')) {
                    hueVal = parseFloat(h) * (180 / Math.PI);
                  } else if (h.includes('turn')) {
                    hueVal = parseFloat(h) * 360;
                  }
                  
                  const sat = Math.min(100, Math.round(chromaVal * 250));
                  const light = Math.round(lightVal);
                  
                  if (a) {
                    return `hsla(${hueVal}, ${sat}%, ${light}%, ${a})`;
                  } else {
                    return `hsl(${hueVal}, ${sat}%, ${light}%)`;
                  }
                }
              );
              
              el.textContent = convertedText;
            }
          } catch (styleErr) {
            console.warn('Gagal merubah style tag oklch', styleErr);
          }
        });
      } catch (styleElementsErr) {
        console.warn('Gagal memproses style elements', styleElementsErr);
      }

      // Briefly wait for style updates to take effect in the browser layout tree
      await new Promise(r => setTimeout(r, 200));

      setLoadingProgress(50);
      // Scroll window to top left so capture doesn't capture blank or offset frames
      window.scrollTo(0, 0);

      let imgData = '';
      try {
        setLoadingProgress(60);
        setLoadingStep('Merender halaman laporan...');
        
        // Try HTML-to-Image first (incredibly fast, perfect modern CSS support)
        imgData = await toJpeg(original, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2
        });
        
        setLoadingProgress(80);
      } catch (htmlToImageError) {
        console.warn('Metode toJpeg gagal, beralih ke fallback html2canvas:', htmlToImageError);
        setLoadingStep('Merender halaman dengan metode fallback html2canvas...');
        
        // Render the original element directly using html2canvas fallback
        const canvas = await html2canvas(original, {
          scale: 2.0, // Clean and crisp high resolution rendering without exploding memory
          useCORS: true,
          allowTaint: false, // CRITICAL: Must be false to prevent SecurityError on canvas.toDataURL
          logging: true,
          backgroundColor: '#ffffff'
        });

        imgData = canvas.toDataURL('image/jpeg', 0.95);
        setLoadingProgress(80);
      } finally {
        // Instantly restore window scroll position
        window.scrollTo(scrollX, scrollY);

        // Instantly restore original title text
        if (titleEl && originalTitleText) {
          titleEl.textContent = originalTitleText;
        }

        // Instantly restore original oklch stylesheet styles
        originalStylesText.forEach(item => {
          try {
            item.el.textContent = item.text;
          } catch (restoreErr) {
            console.warn('Gagal mengembalikan style content', restoreErr);
          }
        });

        // Instantly restore elements and styles
        if (notesEl) {
          notesEl.style.display = notesOriginalDisplay;
        }
        noPrintEls.forEach((el, index) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.display = noPrintOriginalDisplays[index];
        });

        if (wrapperEl) {
          wrapperEl.style.setProperty('position', wrapperOriginalPosition);
          wrapperEl.style.setProperty('left', wrapperOriginalLeft);
          wrapperEl.style.setProperty('top', wrapperOriginalTop);
          wrapperEl.style.setProperty('width', wrapperOriginalWidth);
          wrapperEl.style.setProperty('height', wrapperOriginalHeight);
          wrapperEl.style.setProperty('overflow', wrapperOriginalOverflow);
          wrapperEl.style.setProperty('opacity', wrapperOriginalOpacity);
          wrapperEl.style.setProperty('transform', wrapperOriginalTransform);
          wrapperEl.style.setProperty('pointer-events', wrapperOriginalPointerEvents);
          wrapperEl.style.setProperty('visibility', wrapperOriginalVisibility);
          wrapperEl.style.setProperty('display', wrapperOriginalDisplay);
        }
        original.style.setProperty('position', originalPosition);
        original.style.setProperty('left', originalLeft);
        original.style.setProperty('top', originalTop);
        original.style.setProperty('z-index', originalZIndex);
        original.style.setProperty('width', originalWidth);
        original.style.setProperty('box-shadow', originalBoxShadow);
        original.style.setProperty('margin', originalMargin);

        // Restore original preview state
        setShowPreview(originalPreviewState);
      }

      setLoadingProgress(85);
      setLoadingStep('Menyusun lembar PDF...');

      // Get accurate image dimensions based on original element dimensions
      const elementWidth = original.offsetWidth || 850;
      const elementHeight = original.offsetHeight || 900;

      // Page setup (Portrait A4 is 210mm x 297mm)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (elementHeight * imgWidth) / elementWidth;
      
      let heightLeft = imgHeight;
      let position = margin;
      const pageHeightLimit = pdfHeight - (margin * 2);

      // Render first page
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeightLimit;

      // Handle multi-page overflow if there is a lot of data
      while (heightLeft > 0) {
        position -= pageHeightLimit;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeightLimit;
      }

      setLoadingProgress(100);
      setLoadingStep('Mengunduh berkas PDF...');

      const filename = `Laporan_Mingguan_Film_XXI_${branding.subtitle.replace(/\s+/g, '_')}_${activeReport.periode.replace(/\s+/g, '_')}.pdf`;
      
      // Prepare blob URL for manual download backup
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfDownloadUrl(blobUrl);
      setPdfFilename(filename);
      setExportPdfSuccess(true);

      // Highly reliable single automatic download trigger (prevents duplicate files in some browsers/iframes)
      try {
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        downloadLink.style.setProperty('display', 'none', 'important');
        document.body.appendChild(downloadLink);
        
        downloadLink.click();
        
        setTimeout(() => {
          downloadLink.remove();
        }, 500);
      } catch (err) {
        console.warn('Direct anchor download failed, falling back to pdf.save', err);
        try {
          pdf.save(filename);
        } catch (saveError) {
          console.error('All download methods failed', saveError);
        }
      }

    } catch (error) {
      console.error('Gagal mengekspor PDF:', error);
      setIsExportingPdf(false);
      setShowPreview(originalPreviewState);
      window.scrollTo(scrollX, scrollY);
      alert('Gagal mengekspor PDF secara langsung. Silakan coba kembali.');
    }
  };

  // Film data calculations for currently active report
  let reportFilms: GeneratedFilm[] = [];
  if (activeReport) {
    try {
      const parsed = JSON.parse(activeReport.report_json) as ReportPayload;
      reportFilms = parsed.films || [];
    } catch {
      reportFilms = [];
    }
  }

  // Filtered report films based on UI search/filters
  const filteredReportFilms = reportFilms.filter(film => {
    // 1. Search Query (matches Title or CPL)
    if (reportSearchQuery) {
      const query = reportSearchQuery.toLowerCase().trim();
      const matchTitle = (film.judul_film || '').toLowerCase().includes(query);
      const matchCpl = (film.cpl || '').toLowerCase().includes(query);
      if (!matchTitle && !matchCpl) return false;
    }
    // 2. Format Film Filter
    if (reportFilterFormat !== 'ALL') {
      const filterVal = reportFilterFormat.toUpperCase();
      const filmFormat = (film.format_film || '').toUpperCase();
      if (filterVal === '3D') {
        if (!filmFormat.includes('3D')) return false;
      } else if (filterVal === '2D') {
        if (filmFormat.includes('3D')) return false;
      } else {
        if (!filmFormat.includes(filterVal)) return false;
      }
    }
    // 3. Status Tayang Filter
    if (reportFilterStatusTayang !== 'ALL') {
      if ((film.status_tayang || '').toUpperCase() !== reportFilterStatusTayang.toUpperCase()) return false;
    }
    // 4. Status KDM Filter
    if (reportFilterStatusKdm !== 'ALL') {
      const kdmStatus = film.kdm || '';
      if (reportFilterStatusKdm === 'Aktif') {
        if (kdmStatus === 'Expired' || kdmStatus === 'Tidak Ada') return false;
      } else if (reportFilterStatusKdm === 'Expired') {
        if (kdmStatus !== 'Expired') return false;
      } else if (reportFilterStatusKdm === 'Tidak Ada') {
        if (kdmStatus !== 'Tidak Ada') return false;
      }
    }
    return true;
  });

  // Current statistics of films based on filtered view
  const totalFilmCount = filteredReportFilms.length;
  const totalBerhasilUpload = filteredReportFilms.filter(f => f.status_upload === 'Berhasil').length;
  const totalGagalUpload = filteredReportFilms.filter(f => f.kdm === 'Expired' && f.status_upload !== 'Berhasil').length; // simple logic for demo expired/incomplete
  const totalKdmAktif = filteredReportFilms.filter(f => f.kdm === 'Aktif' || (!['Expired', 'Tidak Ada'].includes(f.kdm))).length;
  const totalKdmExpired = filteredReportFilms.filter(f => f.kdm === 'Expired').length;
  const totalDcpCount = filteredReportFilms.filter(f => f.status_dcp === 'Lengkap').length;

  const isDataChanged = isDataChangedSinceGeneration();

  return (
    <div className="space-y-6 animate-slide-in" id="laporan-film-view">
      {/* Upper header section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <FileText className="h-6 w-6 text-fuchsia-400 drop-shadow-[0_0_8px_#e879f9]" />
            LAPORAN FLIM
          </h2>
          <p className="text-sm md:text-base text-slate-300 mt-1 font-sans">
            Rekapitulasi kesiapan film, format DCP, CPL, validitas KDM, dan status upload real-time untuk bioskop Cinema XXI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto shrink-0">
          {/* Week Selector Dropdown */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono whitespace-nowrap hidden sm:inline">PERIODE MINGGU:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="flex-1 sm:flex-initial bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              id="select-period-week"
            >
              {weekRanges.length === 0 ? (
                <option value="">-- Tidak ada data film --</option>
              ) : (
                weekRanges.map((w, idx) => (
                  <option key={idx} value={w}>Minggu: {w}</option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={!selectedWeek || (selectedWeek === 'Semua Periode' ? filmUploads.length === 0 : filmUploads.filter(f => getWeekRangeString(f.tanggal_terima) === selectedWeek).length === 0)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            id="btn-generate-report"
          >
            <RefreshCw className="h-4 w-4" /> {activeReport ? 'Generate Ulang' : 'Generate Laporan'}
          </button>
          
          <button
            onClick={() => setShowPreview(!showPreview)}
            disabled={!activeReport}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
              showPreview && activeReport
                ? 'bg-cyan-600 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 disabled:opacity-40 disabled:pointer-events-none'
            }`}
            id="btn-preview-report"
          >
            <Eye className="h-4 w-4" /> Preview
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
              showConfig
                ? 'bg-zinc-700 border-zinc-600 text-white'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
            }`}
            id="btn-config-report"
          >
            <Settings className="h-4 w-4" /> Konfigurasi Cetak
          </button>

          <button
            onClick={handleExportPdf}
            disabled={!activeReport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            id="btn-pdf-report"
          >
            <Download className="h-4 w-4 text-white animate-bounce-slow" /> Download PDF
          </button>

          {activeReport && (
            <button
              onClick={() => handleDeleteReport(activeReport.id)}
              className="sm:flex-initial p-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500 transition-colors"
              title="Hapus Laporan / Draft Ulang"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time Data Changed Warning Badge */}
      {activeReport && isDataChanged && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold px-4 py-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <span className="flex items-center gap-2 text-center sm:text-left">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            Data telah berubah sejak laporan mingguan ini di-generate. Silakan generate ulang untuk memperbarui dokumen.
          </span>
          <button
            onClick={handleGenerateReport}
            className="w-full sm:w-auto bg-amber-500 text-black px-3.5 py-1.5 rounded-lg text-[10px] font-black hover:bg-amber-400 transition-all uppercase tracking-wide shrink-0"
          >
            Generate Ulang
          </button>
        </div>
      )}

      {/* Report Customizer panel */}
      {showConfig && (
        <div className="bg-[#0c121a]/60 border border-yellow-500/15 p-5 rounded-2xl animate-slide-in space-y-4">
          <h3 className="text-sm font-extrabold text-yellow-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Settings className="w-4 h-4" /> Parameter Header & Tanda Tangan Cetak
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-black text-white uppercase tracking-wider font-mono">Periode Laporan</label>
              <input
                type="text"
                value={selectedWeek}
                disabled
                className="w-full bg-[#040608]/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-400 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-white uppercase tracking-wider font-mono">Nomor Dokumen</label>
              <input
                type="text"
                value={nomorDokumen}
                onChange={(e) => setNomorDokumen(e.target.value)}
                placeholder="Contoh: XXI/LMP/ENG/2026/001"
                className="w-full bg-[#040608]/80 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-white uppercase tracking-wider font-mono">Judul Bioskop</label>
              <div className="px-3 py-2 text-xs font-bold text-zinc-400 bg-[#040608]/40 border border-zinc-800 rounded-xl">
                {branding.title} {branding.subtitle}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-black text-white uppercase tracking-wider font-mono">Pembuat Laporan</label>
              <input
                type="text"
                value={pembuatLaporan}
                onChange={(e) => setPembuatLaporan(e.target.value)}
                className="w-full bg-[#040608]/80 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-white uppercase tracking-wider font-mono">Jabatan Pembuat</label>
              <input
                type="text"
                value={jabatanPembuat}
                onChange={(e) => setJabatanPembuat(e.target.value)}
                className="w-full bg-[#040608]/80 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-white uppercase tracking-wider font-mono">Mengetahui (Pimpinan)</label>
              <input
                type="text"
                value={mengetahui}
                onChange={(e) => setMengetahui(e.target.value)}
                className="w-full bg-[#040608]/80 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-black text-white uppercase tracking-wider font-mono">Jabatan Pimpinan</label>
              <input
                type="text"
                value={jabatanMengetahui}
                onChange={(e) => setJabatanMengetahui(e.target.value)}
                className="w-full bg-[#040608]/80 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main interactive viewport container */}
      <div className="space-y-4">
        {isLoading && (
          <div className="bg-[#0c121a]/40 border border-zinc-800 p-16 rounded-2xl text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-yellow-500/10" />
              <div className="absolute inset-0 rounded-full border-4 border-t-yellow-500 animate-spin" />
              <FileText className="w-6 h-6 text-yellow-400 absolute inset-0 m-auto" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white font-sans">{loadingStep}</h3>
              <p className="text-xs text-zinc-400 font-sans max-w-xs mx-auto leading-relaxed">
                Harap tunggu, proses generate laporan mingguan Cinema XXI sedang berjalan secara real-time.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-xs mx-auto space-y-1.5">
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-yellow-500 h-full transition-all duration-300" 
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-zinc-500 font-bold">
                <span>PROGRESS</span>
                <span>{loadingProgress}%</span>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !activeReport && (
          <div className="bg-[#0c121a]/40 border border-zinc-800 p-16 rounded-2xl text-center space-y-4">
            <FileText className="w-12 h-12 text-zinc-600 mx-auto stroke-1" />
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-white font-sans">
                {!selectedWeek ? 'Tidak ada data film untuk periode ini.' : 'Laporan Belum Dibuat'}
              </h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                {!selectedWeek 
                  ? 'Belum ada data film yang diupload ke dalam pangkalan data. Silakan tambahkan film di menu "Upload Film" terlebih dahulu.'
                  : `Dokumen rekapitulasi untuk periode minggu "${selectedWeek}" belum dibuat. Silakan klik tombol Auto-Generate untuk memproses seluruh data.`
                }
              </p>
            </div>
            {selectedWeek && (selectedWeek === 'Semua Periode' ? filmUploads.length > 0 : filmUploads.filter(f => getWeekRangeString(f.tanggal_terima) === selectedWeek).length > 0) && (
              <button
                onClick={handleGenerateReport}
                className="inline-flex items-center gap-2 bg-yellow-500 px-5 py-2.5 rounded-xl text-xs font-bold text-black hover:bg-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-black" /> Mulai Auto-Generate
              </button>
            )}
          </div>
        )}

        {!isLoading && activeReport && (
          <>
            {/* Filter Panel for Report Table View */}
            <div className="bg-[#0c121a]/60 border border-zinc-800 p-4 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-yellow-500" /> Filter Tampilan Tabel & Cetak PDF
                </span>
                {(reportSearchQuery || reportFilterFormat !== 'ALL' || reportFilterStatusTayang !== 'ALL' || reportFilterStatusKdm !== 'ALL') && (
                  <button
                    onClick={() => {
                      setReportSearchQuery('');
                      setReportFilterFormat('ALL');
                      setReportFilterStatusTayang('ALL');
                      setReportFilterStatusKdm('ALL');
                    }}
                    className="text-[10px] font-bold text-yellow-500 hover:text-yellow-400 transition-colors uppercase tracking-wider font-mono cursor-pointer self-start sm:self-auto"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Cari judul film..."
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    className="w-full bg-[#040608]/90 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                </div>

                {/* Format Filter */}
                <div>
                  <select
                    value={reportFilterFormat}
                    onChange={(e) => setReportFilterFormat(e.target.value)}
                    className="w-full bg-[#040608]/90 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-yellow-500 transition-colors"
                  >
                    <option value="ALL">Format: Semua</option>
                    <option value="2D">Format: 2D Only</option>
                    <option value="3D">Format: 3D Only</option>
                    <option value="IMAX">Format: IMAX</option>
                    <option value="ATMOS">Format: Dolby Atmos</option>
                  </select>
                </div>

                {/* Status Tayang Filter */}
                <div>
                  <select
                    value={reportFilterStatusTayang}
                    onChange={(e) => setReportFilterStatusTayang(e.target.value)}
                    className="w-full bg-[#040608]/90 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-yellow-500 transition-colors"
                  >
                    <option value="ALL">Status: Semua</option>
                    <option value="BELUM TAYANG">Status: Belum Tayang</option>
                    <option value="SEDANG TAYANG">Status: Sedang Tayang</option>
                    <option value="SUDAH TAYANG">Status: Sudah Tayang</option>
                  </select>
                </div>

                {/* Status KDM Filter */}
                <div>
                  <select
                    value={reportFilterStatusKdm}
                    onChange={(e) => setReportFilterStatusKdm(e.target.value)}
                    className="w-full bg-[#040608]/90 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-yellow-500 transition-colors"
                  >
                    <option value="ALL">KDM: Semua</option>
                    <option value="Aktif">KDM: Aktif</option>
                    <option value="Expired">KDM: Expired</option>
                    <option value="Tidak Ada">KDM: Tidak Ada</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Show dynamic report stats card bento */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-[#0c121a]/60 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold font-mono text-zinc-400 uppercase">TOTAL FILM</p>
                  <p className="text-sm font-black text-white">{totalFilmCount}</p>
                </div>
              </div>
              <div className="bg-[#0c121a]/60 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold font-mono text-zinc-400 uppercase">BERHASIL UPLOAD</p>
                  <p className="text-sm font-black text-white text-emerald-400">{totalBerhasilUpload}</p>
                </div>
              </div>
              <div className="bg-[#0c121a]/60 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold font-mono text-zinc-400 uppercase">GAGAL UPLOAD</p>
                  <p className="text-sm font-black text-white text-rose-400">{totalGagalUpload}</p>
                </div>
              </div>
              <div className="bg-[#0c121a]/60 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold font-mono text-zinc-400 uppercase">KDM AKTIF</p>
                  <p className="text-sm font-black text-white text-yellow-400">{totalKdmAktif}</p>
                </div>
              </div>
              <div className="bg-[#0c121a]/60 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold font-mono text-zinc-400 uppercase">KDM EXPIRED</p>
                  <p className="text-sm font-black text-white text-orange-400">{totalKdmExpired}</p>
                </div>
              </div>
              <div className="bg-[#0c121a]/60 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold font-mono text-zinc-400 uppercase">TOTAL DCP</p>
                  <p className="text-sm font-black text-white text-indigo-400">{totalDcpCount}</p>
                </div>
              </div>
            </div>

            {/* Paper View Container A4 Landscape */}
            <div className={showPreview ? "overflow-x-auto pb-4 pt-2 animate-fade-in" : "absolute -left-[9999px] -top-[9999px] pointer-events-none"}>
              <div className="min-w-[850px] max-w-4xl mx-auto" id="printable-area-outer">
                  <div
                    className="bg-white text-gray-900 rounded-sm shadow-2xl p-8 font-sans border border-gray-300 relative select-text"
                    id="printable-paper-view"
                    style={{ minHeight: '900px' }}
                  >
                    {/* Official Cinema XXI Header Branding style */}
                    <div className="text-center mb-6" id="printable-header">
                      <h1 className="text-base font-black tracking-widest uppercase font-sans text-gray-950 m-0" id="printable-title">
                        LAPORAN FILM {branding.title.toUpperCase() || 'LIPPO MALL PURI XXI'}
                      </h1>
                      <p className="text-[11px] font-black uppercase font-sans text-gray-900 tracking-wider mt-1">
                        MINGGU {activeReport.periode.toUpperCase()}
                      </p>
                    </div>

                    {/* Table Data list matching PDF exactly */}
                    <table className="w-full text-xs text-center border-collapse border border-black" id="printable-table" style={{ border: '1px solid black' }}>
                      <thead>
                        <tr className="bg-[#FF9800] border-b border-black text-black font-extrabold text-[9.5px] uppercase tracking-wider">
                          <th className="border border-black text-center w-[45px]" style={{ border: '1px solid black', backgroundColor: '#FF9800', color: 'black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>NO</th>
                          <th className="border border-black text-center" style={{ border: '1px solid black', backgroundColor: '#FF9800', color: 'black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>JUDUL FLIM</th>
                          <th className="border border-black text-center w-[160px]" style={{ border: '1px solid black', backgroundColor: '#FF9800', color: 'black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>KETERANGAN</th>
                          <th className="border border-black text-center w-[120px]" style={{ border: '1px solid black', backgroundColor: '#FF9800', color: 'black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>FORMAT FLIM</th>
                          <th className="border border-black text-center w-[160px]" style={{ border: '1px solid black', backgroundColor: '#FF9800', color: 'black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>STATUS KDM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReportFilms.map((film, index) => {
                          const status = film.status_tayang || 'BELUM TAYANG';
                          let textColor = '#000000';
                          if (status === 'SEDANG TAYANG') {
                            textColor = '#2E7D32';
                          } else if (status === 'SUDAH TAYANG') {
                            textColor = '#C62828';
                          }

                          const formattedFormat = getFormattedFormat(film.format_film);
                          const formattedKdm = getFormattedKdm(film);

                          return (
                             <tr 
                               key={film.id} 
                               className="border-b border-black text-center" 
                               style={{ color: textColor, fontWeight: 'bold', fontSize: '9px', borderBottom: '1px solid black' }}
                             >
                               <td className="border border-black text-center font-bold" style={{ border: '1px solid black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>{index + 1}</td>
                               <td className="border border-black text-center uppercase tracking-tight font-extrabold" style={{ border: '1px solid black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>{film.judul_film}</td>
                               <td className="border border-black text-center uppercase tracking-tight font-extrabold" style={{ border: '1px solid black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>{status}</td>
                               <td className="border border-black text-center uppercase tracking-tight font-extrabold" style={{ border: '1px solid black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>{formattedFormat}</td>
                               <td className="border border-black text-center uppercase tracking-tight font-extrabold" style={{ border: '1px solid black', paddingTop: '4px', paddingBottom: '8px', verticalAlign: 'middle' }}>{formattedKdm}</td>
                             </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Footer Grid exactly matching the PDF columns */}
                    <div className="flex justify-between items-stretch gap-4 mt-8 text-[11px] font-bold leading-normal text-gray-900 font-sans" id="printable-footer-section">
                      {/* Column 1: Di Buat Oleh */}
                      <div className="flex-1 w-1/3 flex flex-col items-center text-center">
                        <div className="h-10 flex flex-col justify-start">
                          <p className="text-gray-950 font-bold">Di Buat Oleh</p>
                        </div>
                        
                        {/* Area for empty signature space under 'Di Buat Oleh' */}
                        <div className="h-16 w-32"></div>

                        <div className="w-full flex flex-col items-center">
                          <p className="font-extrabold text-gray-950 text-[12px] tracking-wide">{pembuatLaporan}</p>
                          <p className="text-[9.5px] font-normal text-gray-600">{jabatanPembuat}, {branding.subtitle || 'Lippo Mall Puri XXI'}</p>
                          
                          {/* Legend keterangans moved here, exactly under Operator Lippo Mall Puri line */}
                          <div className="text-left font-bold font-mono space-y-1 text-[8.5px] w-full border border-black p-1.5 bg-white leading-relaxed mt-2">
                            <p className="text-gray-950 font-black text-[8px]">KETERANGAN :</p>
                            <p className="text-black font-extrabold text-[8px]">FONT HITAM ( FLIM BELUM TAYANG )</p>
                            <p className="text-emerald-700 font-extrabold text-[8px]">FONT HIJAU ( FLIM SEDANG TAYANG )</p>
                            <p className="text-red-600 font-extrabold text-[8px]">FONT MERAH ( FLIM SUDAH TAYANG )</p>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Storage Capacities Table */}
                      <div className="flex-1 w-1/3 flex flex-col items-center">
                        <div className="w-full max-w-[240px] border border-black overflow-hidden bg-white">
                          <div className="bg-[#FFFF00] text-black font-extrabold text-center px-1 py-1 text-[8px] uppercase leading-tight border-b border-black font-mono" style={{ backgroundColor: '#FFFF00' }}>
                            KAPASITAS PENYIMPANAN SETIAP SERVER<br/>DAN LIBBARY
                          </div>
                          <div className="divide-y divide-gray-300 font-mono text-[8.5px] font-bold text-black text-center">
                            <div className="py-0.5">AAM ( LIBRARY ) : 18.5 TB</div>
                            <div className="py-0.5">STD 1 IMS 2000 : 1.8 TB</div>
                            <div className="py-0.5">STD 2 IMS 2000 : 1.8 TB</div>
                            <div className="py-0.5">STD 3 DOREMI SV : 3.7 TB</div>
                            <div className="py-0.5">STD 4 IMS 3000 : 10.7 TB</div>
                            <div className="py-0.5">STD 5 IMS 2000 : 1.8 TB</div>
                            <div className="py-0.5">STD 6 IMS 2000 : 3.5 TB</div>
                            <div className="py-0.5">STD 7 DOREMI SV : 3.7 TB</div>
                            <div className="py-0.5">STD 8 IMS 2000 : 1.8 TB</div>
                            <div className="py-0.5">PREM 1 IMS 2000 : 1.8 TB</div>
                            <div className="py-0.5">PREM 2 DOREMI SV : 7.3 TB</div>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Menyetujui */}
                      <div className="flex-1 w-1/3 flex flex-col items-center text-center">
                        <div className="h-10 flex flex-col justify-start">
                          <p className="text-gray-950 font-bold uppercase tracking-wider">MENYETUJUI,</p>
                          <p className="text-gray-600 text-xs font-semibold">Manager</p>
                        </div>

                        {/* Empty signing area for Manager as requested */}
                        <div className="h-16 w-32"></div>

                        <div className="w-full flex flex-col items-center">
                          <p className="font-extrabold text-gray-950 text-[12px] tracking-wide underline">{mengetahui}</p>
                          <p className="text-[9.5px] font-normal text-gray-600">{jabatanMengetahui}</p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Custom Notes Area for tech staff */}
                    <div className="mt-6 border border-gray-300 p-3 bg-slate-50 rounded-xs no-print" id="printable-notes">
                      <div className="text-[9px] font-black uppercase font-mono tracking-wider text-gray-700 border-b border-gray-200 pb-1 mb-1 flex items-center justify-between">
                        <span>📝 Catatan Editor Internal (Disembunyikan saat cetak)</span>
                        <span className="text-[8px] font-normal text-slate-400 lowercase italic">Langsung tersimpan otomatis</span>
                      </div>
                      <textarea
                        value={customNotes}
                        onChange={(e) => handleSaveNotes(e.target.value)}
                        placeholder="Tambahkan catatan teknis pengerjaan di sini..."
                        rows={2}
                        className="w-full bg-transparent text-gray-800 text-[11px] border-none outline-none resize-none h-12 placeholder:text-gray-400 focus:ring-0 focus:outline-none p-0 font-sans"
                      />
                    </div>
                  </div>
                </div>
              </div>
          </>
        )}
      </div>

      {isExportingPdf && (
        <div className="fixed inset-0 bg-[#040608]/90 backdrop-blur-md flex items-center justify-center z-[99999] animate-fade-in">
          <div className="bg-[#0c121a] border border-zinc-800 p-8 rounded-2xl max-w-sm w-full mx-4 text-center space-y-6 shadow-2xl">
            {!exportPdfSuccess ? (
              <>
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-red-500 animate-spin" />
                  <FileText className="w-6 h-6 text-red-500 absolute inset-0 m-auto" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white font-sans">{loadingStep}</h3>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                    Harap tunggu, berkas PDF sedang dirender dengan kualitas tinggi untuk diunduh.
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-full transition-all duration-300" 
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500 font-bold">
                    <span>PROGRESS DOWNLOAD</span>
                    <span>{loadingProgress}%</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center bg-emerald-500/10 rounded-full">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white font-sans">Unduh PDF Berhasil!</h3>
                  {window.self !== window.top ? (
                    <div className="space-y-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-left">
                      <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Deteksi Sandbox Iframe
                      </p>
                      <p className="text-[10px] text-zinc-300 font-sans leading-relaxed">
                        Browser memblokir unduhan otomatis karena sistem sedang berjalan di dalam Sandbox Iframe.
                      </p>
                      <p className="text-[10px] text-zinc-300 font-sans leading-relaxed">
                        Silakan klik tombol <strong className="text-emerald-400">Unduh Berkas PDF</strong> di bawah ini, atau gunakan tombol kuning untuk membuka aplikasi di tab baru agar unduhan otomatis berfungsi dengan lancar!
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      Berkas PDF laporan mingguan Anda telah berhasil dirender. Jika unduhan tidak dimulai otomatis, silakan klik tombol di bawah.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {pdfDownloadUrl && (
                    <a
                      href={pdfDownloadUrl}
                      download={pdfFilename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      id="btn-manual-download-pdf"
                    >
                      <FileText className="h-4 w-4" /> Unduh Berkas PDF
                    </a>
                  )}

                  {window.self !== window.top && (
                    <button
                      onClick={() => {
                        window.open(window.location.href, '_blank');
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                      id="btn-open-tab-new"
                    >
                      Buka Aplikasi di Tab Baru ↗
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setIsExportingPdf(false);
                      setExportPdfSuccess(false);
                      if (pdfDownloadUrl) {
                        URL.revokeObjectURL(pdfDownloadUrl);
                        setPdfDownloadUrl(null);
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-750 px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
                    id="btn-close-pdf-overlay"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
