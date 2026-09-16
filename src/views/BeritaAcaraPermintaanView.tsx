/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';
import {
  FileText,
  Eye,
  Download,
  Share2,
  Save,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  CloudUpload,
  HardDrive,
  ExternalLink,
  X,
  Package,
  FolderCheck,
  Copy,
  Check,
  HelpCircle,
  Zap,
  Calendar,
  Type,
  ZoomIn,
  ZoomOut,
  Edit3,
  ChevronDown,
  ChevronUp,
  FileEdit
} from 'lucide-react';

import db from '../db/localDb';
import { BeritaAcaraDraft } from '../types';
import DocumentToolbar from '../components/berita-acara/DocumentToolbar';
import DocumentEditor from '../components/berita-acara/DocumentEditor';
import ImageUploader, { UploadedImage } from '../components/berita-acara/ImageUploader';
import DocumentPreviewModal from '../components/berita-acara/DocumentPreviewModal';
import PasteTextModal from '../components/berita-acara/PasteTextModal';
import SignatureModal from '../components/berita-acara/SignatureModal';
import { cleanDocumentHtml } from '../lib/pasteSanitizer';
import {
  formatDateDDMMYYYY,
  getMonthlyFolderName,
  uploadPdfViaAppsScript,
  normalizeAppsScriptUrl,
  RECOMMENDED_APPS_SCRIPT_CODE,
  DEFAULT_APPS_SCRIPT_URL,
  DriveFileUploadResult
} from '../lib/googleDriveService';

const DEFAULT_HTML_CONTENT = `<p><br></p>`;

interface BeritaAcaraPermintaanViewProps {
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function BeritaAcaraPermintaanView({ onShowToast }: BeritaAcaraPermintaanViewProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Core Document States
  const [htmlContent, setHtmlContent] = useState<string>(DEFAULT_HTML_CONTENT);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [namaBarangOrdered, setNamaBarangOrdered] = useState<string>('');

  // Modals & Loaders
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);

  // Google Apps Script Web App URL state
  const [webAppUrl, setWebAppUrl] = useState<string>('');
  const [lastDriveResult, setLastDriveResult] = useState<DriveFileUploadResult | null>(null);

  // Edit Dokumen Toggle Menu State (Default: false / Sembunyi)
  const [isEditModeOpen, setIsEditModeOpen] = useState<boolean>(false);

  // Date States for "Atas TTD"
  const MONTH_NAMES_INDO = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const initialDateObj = new Date();
  const [kotaSign, setKotaSign] = useState<string>('Jakarta');
  const [tglSign, setTglSign] = useState<number>(initialDateObj.getDate());
  const [blnSign, setBlnSign] = useState<string>(MONTH_NAMES_INDO[initialDateObj.getMonth()]);
  const [thnSign, setThnSign] = useState<number>(initialDateObj.getFullYear());
  const [datePickerValue, setDatePickerValue] = useState<string>(
    initialDateObj.toISOString().split('T')[0]
  );

  // Apply or update Date Line right ABOVE Signatures (Atas TTD)
  const handleApplyDateAtasTtd = (explicitDateText?: string) => {
    const formattedDateStr =
      explicitDateText ||
      `${kotaSign.trim() ? kotaSign.trim() + ', ' : ''}${tglSign} ${blnSign} ${thnSign}`;

    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentHtml, 'text/html');

      // Look for existing date paragraph (#doc-date-line or matching date text)
      let dateEl = doc.querySelector('#doc-date-line') || doc.querySelector('.doc-date-line');

      if (!dateEl) {
        const paragraphs = Array.from(doc.querySelectorAll('p'));
        for (const p of paragraphs) {
          const text = (p.textContent || '').trim();
          if (
            (text.includes('Jakarta,') ||
              text.includes('Tangerang,') ||
              /^[A-Za-z\s\.-]+,\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}/.test(text) ||
              /^\d{1,2}\s+[A-Za-z]+\s+\d{4}/.test(text)) &&
            !text.includes('Mengetahui') &&
            !text.includes('Dibuat')
          ) {
            dateEl = p;
            break;
          }
        }
      }

      if (dateEl) {
        dateEl.id = 'doc-date-line';
        dateEl.setAttribute('style', 'text-align: right; margin-top: 25px; margin-bottom: 12px; font-weight: normal;');
        dateEl.innerHTML = formattedDateStr;
      } else {
        // Find signature table or insert near bottom
        const tables = doc.querySelectorAll('table');
        let targetTable: HTMLTableElement | null = null;
        tables.forEach((t) => {
          const text = t.textContent || '';
          if (
            text.includes('Mengetahui') ||
            text.includes('Dibuat') ||
            text.includes('Teknisi') ||
            text.includes('Chief') ||
            text.includes('Manager')
          ) {
            targetTable = t as HTMLTableElement;
          }
        });

        const newP = doc.createElement('p');
        newP.id = 'doc-date-line';
        newP.setAttribute('style', 'text-align: right; margin-top: 25px; margin-bottom: 12px; font-weight: normal;');
        newP.innerHTML = formattedDateStr;

        if (targetTable && targetTable.parentNode) {
          targetTable.parentNode.insertBefore(newP, targetTable);
        } else {
          doc.body.appendChild(newP);
        }
      }

      const updated = doc.body.innerHTML;
      setHtmlContent(updated);
      editorRef.current.innerHTML = updated;
    }
  };

  // Quick Calendar Picker Change Handler
  const handleDatePickerChange = (valStr: string) => {
    setDatePickerValue(valStr);
    if (!valStr) return;
    const d = new Date(valStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = MONTH_NAMES_INDO[d.getMonth()];
      const year = d.getFullYear();
      setTglSign(day);
      setBlnSign(month);
      setThnSign(year);

      const formatted = `${kotaSign.trim() ? kotaSign.trim() + ', ' : ''}${day} ${month} ${year}`;
      handleApplyDateAtasTtd(formatted);
    }
  };

  // Kota / Location Change Handler
  const handleKotaChange = (newKota: string) => {
    setKotaSign(newKota);
    const formatted = `${newKota.trim() ? newKota.trim() + ', ' : ''}${tglSign} ${blnSign} ${thnSign}`;
    handleApplyDateAtasTtd(formatted);
  };

  // Apply Dynamic Signatures
  const handleApplySignatures = (newSignaturesHtml: string) => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;

      const parser = new DOMParser();
      const doc = parser.parseFromString(currentHtml, 'text/html');
      const tables = doc.querySelectorAll('table');
      let targetTable: HTMLTableElement | null = null;

      tables.forEach((table) => {
        const text = table.textContent || '';
        if (
          text.includes('Mengetahui') ||
          text.includes('Dibuat Oleh') ||
          text.includes('Diperiksa Oleh') ||
          text.includes('Disetujui Oleh') ||
          text.includes('Teknisi Engineering') ||
          text.includes('Chief Engineering') ||
          text.includes('Manager Cinema')
        ) {
          targetTable = table as HTMLTableElement;
        }
      });

      if (targetTable) {
        (targetTable as HTMLTableElement).outerHTML = newSignaturesHtml;
        const updated = doc.body.innerHTML;
        setHtmlContent(updated);
        editorRef.current.innerHTML = updated;
      } else {
        const updated = currentHtml + '<br>' + newSignaturesHtml;
        setHtmlContent(updated);
        editorRef.current.innerHTML = updated;
      }

      if (onShowToast) {
        onShowToast('Kolom Tanda Tangan berhasil diperbarui!', 'success');
      }

      // Re-ensure Date line above TTD table
      setTimeout(() => {
        handleApplyDateAtasTtd();
      }, 50);
    }
  };

  // Paste & Clean Content Handler
  const handleInsertPastedContent = (cleanHtml: string, isReplaceAll: boolean) => {
    if (isReplaceAll) {
      setHtmlContent(cleanHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = cleanHtml;
      }
    } else {
      document.execCommand('insertHTML', false, cleanHtml);
      if (editorRef.current) {
        setHtmlContent(editorRef.current.innerHTML);
      }
    }
    if (onShowToast) {
      onShowToast('Isi Berita Acara berhasil dirapikan & dimasukkan ke dokumen!', 'success');
    }
  };

  // Clean whole document formatting
  const handleCleanDocumentFormatting = () => {
    if (editorRef.current) {
      const cleaned = cleanDocumentHtml(editorRef.current.innerHTML);
      setHtmlContent(cleaned);
      editorRef.current.innerHTML = cleaned;
      if (onShowToast) {
        onShowToast('Format & warna background dokumen berhasil dibersihkan!', 'success');
      }
    }
  };

  // Load saved draft & Google Apps Script URL (Default: Clean document with Logo & Kop Surat + Persistent Real-Time Google Drive Auto-Connect)
  useEffect(() => {
    // Default: Clean document space (only Logo and Kop Surat displayed)
    setHtmlContent('<p><br></p>');
    setImages([]);

    // Real-Time Google Drive Auto-Connect: Always ensure URL exists upon opening app
    const savedUrl = localStorage.getItem('xxi_gdrive_script_url') || DEFAULT_APPS_SCRIPT_URL;
    const cleanUrl = normalizeAppsScriptUrl(savedUrl);
    setWebAppUrl(cleanUrl);
    localStorage.setItem('xxi_gdrive_script_url', cleanUrl);
  }, []);

  // Auto-save draft whenever htmlContent or images change (debounced 1s)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (htmlContent && htmlContent !== DEFAULT_HTML_CONTENT) {
        const draft: BeritaAcaraDraft = {
          id: 'draft-berita-acara-prm',
          nomorDokumen: 'BA/PRM/LMP-XXI/2026/07/014',
          tanggal: new Date().toISOString(),
          pemohon: 'Engineering Lippo Mall Puri',
          departemen: 'Engineering',
          htmlContent,
          images,
          updatedAt: new Date().toISOString()
        };
        db.saveBeritaAcaraDraft(draft);
        setLastSavedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [htmlContent, images]);

  // File naming format: `berita acara_tgl_bln_thun_ barang yang di order`
  const dateFormatted = formatDateDDMMYYYY(new Date());
  const formattedFileName = `berita acara_${dateFormatted}_ ${namaBarangOrdered.trim() || 'barang_permintaan'}`;
  const folderNamePerMonth = getMonthlyFolderName(new Date());

  // Ref to hold last saved user selection inside editor
  const lastSavedRangeRef = useRef<Range | null>(null);

  // Auto-save user selection whenever text is highlighted in editor
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
          lastSavedRangeRef.current = range.cloneRange();
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Rich Text ExecCommand Handler
  const handleExecCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  // Font Size Handlers for Rich Text Editor (STRICTLY FOR SELECTED TEXT ONLY)
  const handleSetFontSize = (sizePx: string) => {
    if (!editorRef.current) return;

    const sel = window.getSelection();
    let rangeToUse: Range | null = null;

    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const r = sel.getRangeAt(0);
      if (editorRef.current.contains(r.commonAncestorContainer)) {
        rangeToUse = r;
      }
    } else if (
      lastSavedRangeRef.current &&
      editorRef.current.contains(lastSavedRangeRef.current.commonAncestorContainer)
    ) {
      rangeToUse = lastSavedRangeRef.current;
    }

    if (!rangeToUse) {
      if (onShowToast) {
        onShowToast('Silakan blok/sorot (highlight) teks yang ingin diubah ukurannya terlebih dahulu!', 'warning');
      }
      return;
    }

    // Restore selection to the highlighted range
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(rangeToUse);
    }

    // Apply font size ONLY to the selected text range
    document.execCommand('fontSize', false, '7');

    // Convert font[size="7"] strictly inside editorRef to span style="font-size: sizePx"
    const fontTags = editorRef.current.querySelectorAll('font[size="7"]');
    fontTags.forEach((fontEl) => {
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      span.innerHTML = fontEl.innerHTML;
      fontEl.parentNode?.replaceChild(span, fontEl);
    });

    setHtmlContent(editorRef.current.innerHTML);
    if (onShowToast) {
      onShowToast(`Ukuran teks yang disorot berhasil diubah ke ${sizePx}`, 'success');
    }
  };

  const handleStepFontSize = (delta: number) => {
    if (!editorRef.current) return;

    const sel = window.getSelection();
    let rangeToUse: Range | null = null;

    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const r = sel.getRangeAt(0);
      if (editorRef.current.contains(r.commonAncestorContainer)) {
        rangeToUse = r;
      }
    } else if (
      lastSavedRangeRef.current &&
      editorRef.current.contains(lastSavedRangeRef.current.commonAncestorContainer)
    ) {
      rangeToUse = lastSavedRangeRef.current;
    }

    if (!rangeToUse) {
      if (onShowToast) {
        onShowToast('Silakan blok/sorot (highlight) teks yang ingin diperbesar/perkecil terlebih dahulu!', 'warning');
      }
      return;
    }

    // Find font size of the selected element
    const parentNode = rangeToUse.commonAncestorContainer.nodeType === 1
      ? (rangeToUse.commonAncestorContainer as HTMLElement)
      : rangeToUse.commonAncestorContainer.parentElement;

    let currentPx = 13;
    if (parentNode) {
      const style = window.getComputedStyle(parentNode);
      currentPx = parseInt(style.fontSize) || 13;
    }

    const nextPx = Math.max(8, Math.min(72, currentPx + delta)) + 'px';
    handleSetFontSize(nextPx);
  };

  // Set Global Document Font Size (Optional - only when user explicitly wants to resize entire document)
  const handleSetGlobalDocumentFontSize = (sizePx: string) => {
    if (!editorRef.current) return;
    const elements = editorRef.current.querySelectorAll('p, td, th, li, span');
    elements.forEach((el) => {
      (el as HTMLElement).style.fontSize = sizePx;
    });
    setHtmlContent(editorRef.current.innerHTML);
    if (onShowToast) {
      onShowToast(`Seluruh teks di dalam dokumen berhasil disesuaikan ke ${sizePx}`, 'info');
    }
  };

  // Insert Table helper
  const handleInsertTable = () => {
    const tableHtml = `
      <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="width: 40px; text-align: center; border: 1px solid #94a3b8; padding: 6px;">No</th>
            <th style="text-align: left; border: 1px solid #94a3b8; padding: 6px;">Nama Barang</th>
            <th style="width: 70px; text-align: center; border: 1px solid #94a3b8; padding: 6px;">Qty</th>
            <th style="width: 80px; text-align: center; border: 1px solid #94a3b8; padding: 6px;">Satuan</th>
            <th style="text-align: left; border: 1px solid #94a3b8; padding: 6px;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">Barang Baru...</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">1</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">Pcs</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">Permintaan baru</td>
          </tr>
        </tbody>
      </table>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  // Image Management
  const handleAddImage = (img: UploadedImage) => {
    setImages((prev) => [...prev, img]);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateImage = (updatedImg: UploadedImage) => {
    setImages((prev) =>
      prev.map((item) => (item.id === updatedImg.id ? updatedImg : item))
    );
  };

  const handleReorderImages = (newImages: UploadedImage[]) => {
    setImages(newImages);
  };

  // Save Draft Locally
  const handleSaveDraftLocal = (): boolean => {
    const draft: BeritaAcaraDraft = {
      id: 'draft-berita-acara-prm',
      nomorDokumen: 'BA/PRM/LMP-XXI/2026/07/014',
      tanggal: new Date().toISOString(),
      pemohon: 'Engineering Lippo Mall Puri',
      departemen: 'Engineering',
      htmlContent,
      images,
      updatedAt: new Date().toISOString()
    };

    db.saveBeritaAcaraDraft(draft);
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(nowStr);
    return true;
  };

  // Helper to render an element to JPEG (hides .no-print controls)
  const renderPaperToImg = async (paperElement: HTMLElement): Promise<string> => {
    // Add export class to body so CSS hides all .no-print edit toolbars completely
    document.body.classList.add('is-exporting-pdf');

    try {
      try {
        return await toJpeg(paperElement, {
          quality: 0.98,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          cacheBust: true,
          filter: (node) => {
            if (node instanceof HTMLElement && node.classList.contains('no-print')) {
              return false;
            }
            return true;
          }
        });
      } catch (primaryErr) {
        console.warn('html-to-image failed, falling back to html2canvas:', primaryErr);

        const originalStylesText: { el: HTMLStyleElement; text: string }[] = [];
        const styleElements = document.querySelectorAll('style');
        styleElements.forEach((el) => {
          const text = el.textContent || '';
          if (text.includes('oklch')) {
            originalStylesText.push({ el, text });
            el.textContent = text.replace(/oklch\([^)]+\)/gi, '#000000');
          }
        });

        try {
          const canvas = await html2canvas(paperElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            ignoreElements: (element) => element.classList.contains('no-print')
          });
          return canvas.toDataURL('image/jpeg', 0.98);
        } finally {
          originalStylesText.forEach(({ el, text }) => {
            el.textContent = text;
          });
        }
      }
    } finally {
      document.body.classList.remove('is-exporting-pdf');
    }
  };

  // Generate PDF Blob Helper (Maintains exact aspect ratio without squashing / gepeng)
  const generatePdfBlob = async (): Promise<Blob> => {
    const docPaperElement = document.getElementById('a4-document-paper');
    if (!docPaperElement) throw new Error('Elemen dokumen tidak ditemukan.');

    const imagesPaperElement = document.getElementById('a4-images-paper');

    // Create A4 PDF Document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Page 1: Main Document
    const page1ImgData = await renderPaperToImg(docPaperElement);
    if (!page1ImgData) throw new Error('Gagal merender halaman dokumen utama.');

    pdf.addImage(page1ImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Page 2: Dedicated Images Attachment Paper (if images exist)
    if (imagesPaperElement) {
      const page2ImgData = await renderPaperToImg(imagesPaperElement);
      if (page2ImgData) {
        pdf.addPage();
        pdf.addImage(page2ImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }
    }

    return pdf.output('blob');
  };

  // Save Draft + Sync Google Drive Handler
  const handleSaveDraftAndSyncDrive = async () => {
    // 1. Save local draft first
    handleSaveDraftLocal();

    const rawUrl = webAppUrl.trim() || localStorage.getItem('xxi_gdrive_script_url') || '';
    const cleanUrl = normalizeAppsScriptUrl(rawUrl);

    // Ensure state & localStorage are synchronized with normalized URL
    if (cleanUrl) {
      setWebAppUrl(cleanUrl);
      localStorage.setItem('xxi_gdrive_script_url', cleanUrl);
    }

    // If no Google Apps Script URL saved yet, open setting modal
    if (!cleanUrl) {
      setIsDriveModalOpen(true);
      if (onShowToast) {
        onShowToast('Silakan pasang Web App URL Google Apps Script (Gratis 100%) untuk auto-sync Google Drive.', 'info');
      }
      return;
    }

    setIsSyncingDrive(true);
    if (onShowToast) onShowToast('Menyiapkan file PDF & menyinkronkan ke Google Drive...', 'info');

    try {
      // Generate PDF
      const pdfBlob = await generatePdfBlob();

      // Full File name format: `berita acara_tgl_bln_thun_ barang yang di order.pdf`
      const fullPdfFileName = `${formattedFileName}.pdf`;

      // Upload via Google Apps Script (Free, No OAuth error)
      const uploadResult = await uploadPdfViaAppsScript(cleanUrl, folderNamePerMonth, fullPdfFileName, pdfBlob);

      setLastDriveResult(uploadResult);
      setIsSyncingDrive(false);

      // Auto-reset paper document to clean state (Kop Surat & Logo only)
      setHtmlContent(DEFAULT_HTML_CONTENT);
      if (editorRef.current) {
        editorRef.current.innerHTML = DEFAULT_HTML_CONTENT;
      }
      setImages([]);
      localStorage.removeItem('xxi_berita_acara_draft');
      setLastSavedTime(null);

      if (onShowToast) {
        onShowToast(`Berhasil tersimpan di Google Drive! Dokumen otomatis di-reset ke tampilan Kop Surat & Logo.`, 'success');
      }
    } catch (err: any) {
      console.error('Drive Sync Error:', err);
      setIsSyncingDrive(false);
      setIsDriveModalOpen(true);

      const errMsg = err.message || '';
      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
        if (onShowToast) {
          onShowToast('Gagal koneksi: Pastikan saat Deploy Apps Script, opsi "Who has access" (Akses) diset ke "Anyone" (Siapa saja).', 'error');
        }
      } else {
        if (onShowToast) {
          onShowToast(`Gagal sync ke Google Drive: ${errMsg}`, 'error');
        }
      }
    }
  };

  // Save Web App URL
  const handleSaveWebAppUrl = (url: string) => {
    const clean = normalizeAppsScriptUrl(url.trim());
    setWebAppUrl(clean);
    if (clean) {
      localStorage.setItem('xxi_gdrive_script_url', clean);
      if (onShowToast) {
        onShowToast('Web App URL Google Drive tersimpan! Auto-sync aktif.', 'success');
      }
    }
  };

  // Copy Apps Script Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(RECOMMENDED_APPS_SCRIPT_CODE);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2500);
    if (onShowToast) onShowToast('Kode Google Apps Script berhasil disalin ke clipboard!', 'success');
  };

  // Reset to Default Template (Logo & Kop Surat Only)
  const handleResetTemplate = () => {
    if (confirm('Apakah Anda yakin ingin mengosongkan isi dokumen? Teks editan akan dihapus dan hanya menyisakan Logo & Kop Surat.')) {
      setHtmlContent(DEFAULT_HTML_CONTENT);
      if (editorRef.current) {
        editorRef.current.innerHTML = DEFAULT_HTML_CONTENT;
      }
      setImages([]);
      localStorage.removeItem('xxi_berita_acara_draft');
      setLastSavedTime(null);
      if (onShowToast) {
        onShowToast('Dokumen berhasil dibersihkan! Hanya Logo & Kop Surat yang ditampilkan.', 'info');
      }
    }
  };

  // Export PDF Handler
  const handleExportPdf = async () => {
    setIsExporting(true);
    if (onShowToast) onShowToast('Proses pembuatan PDF A4 sedang berjalan...', 'info');

    try {
      const blob = await generatePdfBlob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${formattedFileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 2000);

      if (onShowToast) {
        onShowToast('File PDF Berita Acara berhasil diunduh (A4 Margin Presisi)!', 'success');
      }
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      const confirmPrint = window.confirm(
        `Eksport PDF langsung mengalami kendala (${err.message || 'Error'}).\nApakah Anda ingin menggunakan Dialog Cetak Browser (Print to PDF)?`
      );
      if (confirmPrint) {
        window.print();
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Share WhatsApp Handler
  const handleShareWhatsapp = async () => {
    await handleExportPdf();

    const message = `Selamat siang Bapak/Ibu.

Berikut kami kirimkan Berita Acara Permintaan Barang: ${namaBarangOrdered}.

Mohon izin untuk dilakukan approval.

Terima kasih.`;

    const encodedText = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, '_blank');

    if (onShowToast) {
      onShowToast('WhatsApp telah dibuka! Silakan pilih kontak dan lampirkan file PDF yang baru saja terunduh.', 'success');
    }
  };

  return (
    <div className="space-y-6 pb-20 text-slate-100" id="berita-acara-permintaan-view">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-950/80 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/40 uppercase tracking-widest">
              DOKUMEN RESMI XXI
            </span>
            {lastSavedTime && (
              <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Draft Tersimpan: {lastSavedTime}</span>
              </span>
            )}

            {/* Free Real-Time Google Drive Auto-Connect Badge */}
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-emerald-950/90 hover:bg-emerald-900 px-3 py-1 rounded-md border border-emerald-500/50 cursor-pointer transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              title="Google Drive Terhubung Real-Time (Auto-Konek Aktif saat Buka Aplikasi). Klik untuk pengaturan."
              type="button"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <CloudUpload className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">Google Drive: Terhubung (Real-Time Auto-Konek)</span>
            </button>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <FileText className="h-6 w-6 text-amber-400 drop-shadow-[0_0_8px_#f59e0b] shrink-0" />
            <span>BA ORDERAN</span>
          </h2>
          <p className="text-sm md:text-base text-slate-200 mt-1.5 font-sans font-medium">
            Buat, edit, simpan draft, dan otolink otomatis ke Google Drive tanpa biaya &amp; tanpa kendala OAuth (Folder: <strong className="text-emerald-300">{folderNamePerMonth}</strong>).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetTemplate}
            className="flex items-center gap-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer active:scale-95"
            title="Reset ke template bawaan"
            type="button"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Reset Template</span>
          </button>
        </div>
      </div>

      {/* Menu Utama: EDIT DOKUMEN (Fitur Edit Tersembunyi Secara Default) */}
      <div className="bg-[#0b1329] border border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,240,255,0.12)] space-y-4">
        {/* Toggle Button / Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
              <FileEdit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-black font-sans text-white tracking-wide uppercase">
                  EDIT DOKUMEN
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                  isEditModeOpen 
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {isEditModeOpen ? 'Mode Edit Terbuka' : 'Fitur Sembunyi'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                {isEditModeOpen 
                  ? 'Klik tombol EDIT DOKUMEN untuk menutup menu pengeditan.' 
                  : 'Klik tombol EDIT DOKUMEN di kanan untuk membuka fitur pengeditan (Nama File, Tanggal/Lokasi, Ukuran Teks, Toolbar Format).'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditModeOpen(!isEditModeOpen)}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer shrink-0 ${
              isEditModeOpen
                ? 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border-cyan-400/60 shadow-[0_0_18px_rgba(0,240,255,0.25)] hover:border-cyan-300'
            }`}
            type="button"
          >
            <Edit3 className="w-4 h-4 text-cyan-300" />
            <span>EDIT DOKUMEN</span>
            {isEditModeOpen ? (
              <ChevronUp className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
            )}
          </button>
        </div>

        {/* Collapsible Edit Tools Container */}
        {isEditModeOpen && (
          <div className="space-y-4 pt-3 border-t border-cyan-500/20 animate-slide-in">
            {/* Item Order Summary Name Input & Drive Format Config Bar */}
            <div className="bg-[#070d1e] border border-cyan-500/30 rounded-xl p-3.5 md:p-4 text-sm font-mono space-y-3 shadow-[0_4px_20px_rgba(0,240,255,0.05)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Package className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                  <span>BARANG YANG DIORDER (UNTUK NAMA FILE DRIVE):</span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-1.5">
                  <FolderCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Folder Drive: <strong className="text-emerald-300 font-semibold">{folderNamePerMonth}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={namaBarangOrdered}
                    onChange={(e) => setNamaBarangOrdered(e.target.value)}
                    placeholder="Contoh: Sensor Lampu Studio Barco & Sparepart"
                    className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-lg px-3.5 py-2.5 text-white font-sans text-sm h-11 focus:outline-hidden transition-colors"
                  />
                </div>

                <div className="bg-[#050914] px-3.5 py-2.5 h-11 rounded-lg border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                  <span className="text-slate-400 text-xs font-sans shrink-0 uppercase">NAMA FILE:</span>
                  <span className="text-cyan-200 font-bold text-xs sm:text-sm truncate tracking-tight select-all uppercase">
                    {formattedFileName.toUpperCase()}.PDF
                  </span>
                </div>
              </div>
            </div>

            {/* Menu / Fitur Tanggal & Lokasi (1-Click Kalender) */}
            <div className="bg-[#070d1e] border border-cyan-500/30 rounded-xl p-3.5 md:p-4 text-sm font-mono space-y-3 shadow-[0_4px_20px_rgba(0,240,255,0.05)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Calendar className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                  <span>PENGATURAN TANGGAL & LOKASI DOKUMEN (KLIK KALENDER OTOMATIS):</span>
                </div>
                <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>1-Click Auto-Sync ke Atas TTD</span>
                </div>
              </div>

              {/* Inputs: Kota & Kalender Picker Only */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                {/* Kota / Lokasi */}
                <div>
                  <label className="block text-xs text-slate-200 mb-1.5 font-sans font-medium">
                    Kota / Tempat:
                  </label>
                  <input
                    type="text"
                    value={kotaSign}
                    onChange={(e) => handleKotaChange(e.target.value)}
                    placeholder="Contoh: Jakarta"
                    className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-lg px-3.5 py-2.5 text-white font-sans text-sm h-11 focus:outline-hidden transition-colors"
                  />
                </div>

                {/* Kalender Picker */}
                <div>
                  <label className="block text-xs text-cyan-300 mb-1.5 font-sans font-semibold flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>Klik Pilih Tanggal dari Kalender:</span>
                  </label>
                  <input
                    type="date"
                    value={datePickerValue}
                    onChange={(e) => handleDatePickerChange(e.target.value)}
                    className="w-full bg-[#0b1329] border border-cyan-500/50 focus:border-cyan-400 rounded-lg px-3.5 py-2.5 text-cyan-200 font-mono text-sm h-11 focus:outline-hidden cursor-pointer hover:border-cyan-400 transition-colors shadow-[0_0_10px_rgba(0,240,255,0.08)]"
                    title="Klik ikon kalender untuk memilih tanggal secara otomatis"
                  />
                </div>
              </div>

              {/* Live Result Badge & Manual Trigger Button */}
              <div className="bg-[#050914] p-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-slate-300 text-xs font-sans shrink-0">Hasil di Atas TTD:</span>
                  <span className="text-amber-300 font-bold tracking-wide font-sans text-sm bg-amber-950/60 px-3 py-1.5 rounded-md border border-amber-500/40">
                    {kotaSign.trim() ? `${kotaSign.trim()}, ` : ''}{tglSign} {blnSign} {thnSign}
                  </span>
                </div>

                <button
                  onClick={() => {
                    const formatted = `${kotaSign.trim() ? kotaSign.trim() + ', ' : ''}${tglSign} ${blnSign} ${thnSign}`;
                    handleApplyDateAtasTtd(formatted);
                    if (onShowToast) onShowToast('Tanggal di atas TTD berhasil diperbarui!', 'success');
                  }}
                  className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer hover:border-cyan-400 active:scale-95 h-10"
                  type="button"
                >
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>Terapkan / Update di Dokumen</span>
                </button>
              </div>
            </div>

            {/* Menu / Fitur Ukuran Teks (Khusus Teks Yang Dipilih/Disorot) */}
            <div className="bg-[#070d1e] border border-cyan-500/30 rounded-xl p-3.5 md:p-4 text-sm font-mono space-y-3 shadow-[0_4px_20px_rgba(0,240,255,0.05)]" id="menu-ukuran-teks-dokumen">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Type className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                  <span>PENGATUR UKURAN TEKS (KHUSUS TEKS YANG DISOROT / DIBLOK):</span>
                </div>
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Teks Lain Tidak Ikut Berubah</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Tombol Step A- & A+ untuk Teks Terpilih */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 text-xs font-sans">Ubah Teks Terpilih:</span>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleStepFontSize(-1)}
                    className="px-3.5 py-2 bg-[#0b1329] hover:bg-cyan-950 text-cyan-300 border border-slate-700 hover:border-cyan-400 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 h-10"
                    type="button"
                    title="Perkecil Ukuran Teks Yang Disorot (-1px)"
                  >
                    <ZoomOut className="w-4 h-4 text-cyan-400" />
                    <span>A- Perkecil (-1px)</span>
                  </button>

                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleStepFontSize(1)}
                    className="px-3.5 py-2 bg-[#0b1329] hover:bg-cyan-950 text-cyan-300 border border-slate-700 hover:border-cyan-400 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 h-10"
                    type="button"
                    title="Perbesar Ukuran Teks Yang Disorot (+1px)"
                  >
                    <ZoomIn className="w-4 h-4 text-cyan-400" />
                    <span>A+ Perbesar (+1px)</span>
                  </button>
                </div>

                {/* Preset Ukuran Langsung untuk Teks Terpilih */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-300 text-xs font-sans mr-1">Ukuran Instan Teks Terpilih:</span>
                  {[
                    { label: '10px', val: '10px' },
                    { label: '12px', val: '12px' },
                    { label: '14px', val: '14px' },
                    { label: '16px', val: '16px' },
                    { label: '17px (Auto Paste)', val: '17px' },
                    { label: '18px', val: '18px' },
                    { label: '24px', val: '24px' }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSetFontSize(preset.val)}
                      className={`px-3 py-1.5 ${preset.val === '17px' ? 'bg-cyan-950 text-cyan-200 border-cyan-500/70 font-bold' : 'bg-[#050914] text-cyan-300 border-slate-800'} hover:bg-cyan-900 hover:text-white border hover:border-cyan-400 rounded-lg text-xs font-mono transition-all cursor-pointer h-9 flex items-center justify-center`}
                      type="button"
                      title={`Set ukuran ${preset.val} untuk teks yang disorot`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-200 font-sans bg-[#050914] p-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                <span>
                  💡 <strong>Auto-Paste 17px Aktif:</strong> Setiap dokumen/teks yang anda <strong>Paste</strong> akan otomatis berukuran <strong>17px</strong> agar lebih besar & jelas, namun tetap <strong>100% bisa disorot dan diedit ukurannya (A-/A+)</strong> kapan saja.
                </span>

                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSetGlobalDocumentFontSize('13px')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-mono shrink-0 cursor-pointer h-8"
                  type="button"
                  title="Reset seluruh teks dokumen ke standar 13px"
                >
                  Reset Seluruh Dokumen (13px)
                </button>
              </div>
            </div>

            {/* Editor Toolbar Sticky */}
            <DocumentToolbar
              onExecCommand={handleExecCommand}
              onSetFontSize={handleSetFontSize}
              onStepFontSize={handleStepFontSize}
              onAddImageClick={() => setIsImageModalOpen(true)}
              onInsertTableClick={handleInsertTable}
              onOpenPasteModal={() => setIsPasteModalOpen(true)}
              onCleanFormatting={handleCleanDocumentFormatting}
              onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Main Document Editor Area (A4 Paper Box) */}
      <DocumentEditor
        editorRef={editorRef}
        htmlContent={htmlContent}
        onContentChange={setHtmlContent}
        images={images}
        onRemoveImage={handleRemoveImage}
        onUpdateImage={handleUpdateImage}
        onReorderImages={handleReorderImages}
        onOpenImageModal={() => setIsImageModalOpen(true)}
      />

      {/* Last Drive Result Notification Banner if available */}
      {lastDriveResult && (
        <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-xl p-3 text-xs font-mono flex items-center justify-between gap-3 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="truncate">
              Tersimpan di Google Drive (Folder <strong>{folderNamePerMonth}</strong>): <strong>{lastDriveResult.name}</strong>
            </span>
          </div>
          <a
            href={lastDriveResult.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shrink-0 transition-colors"
          >
            <span>Buka File Drive</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Action Button Panel (position directly below A4 document box & sticky when scrolling) */}
      <div
        className="sticky bottom-3 z-40 w-full max-w-[210mm] mx-auto bg-[#070b16]/90 border border-cyan-500/30 backdrop-blur-xl p-3 md:p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-wrap items-center justify-center sm:justify-between gap-3 rounded-2xl px-4 md:px-6 mt-4 mb-4"
        id="berita-acara-bottom-actions"
      >
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Margin Fixed A4: Top 2.5cm • Bottom 2.5cm • Left 3cm • Right 3cm</span>
        </div>

        {/* Core Request Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
          {/* Preview Button */}
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer hover:border-cyan-400 active:scale-95 shadow-xs"
            id="btn-preview-dokumen"
            type="button"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Preview</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95 disabled:opacity-50"
            id="btn-export-pdf"
            type="button"
          >
            <Download className="w-4 h-4 text-blue-200" />
            <span>{isExporting ? 'Memproses PDF...' : 'Export PDF'}</span>
          </button>

          {/* Share WhatsApp Button */}
          <button
            onClick={handleShareWhatsapp}
            disabled={isExporting}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50"
            id="btn-share-whatsapp"
            type="button"
          >
            <Share2 className="w-4 h-4 text-emerald-200" />
            <span>Share WhatsApp</span>
          </button>

          {/* Simpan Draft (Lokal) Button */}
          <button
            onClick={() => {
              handleSaveDraftLocal();
              handleExportPdf();
              if (onShowToast) onShowToast('Draft tersimpan di browser & file PDF diunduh.', 'success');
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer active:scale-95"
            id="btn-simpan-draft"
            type="button"
          >
            <Save className="w-4 h-4 text-amber-300" />
            <span>Simpan Draft</span>
          </button>

          {/* Simpan Draft & Sync Google Drive Button */}
          <button
            onClick={handleSaveDraftAndSyncDrive}
            disabled={isSyncingDrive}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400 rounded-xl font-mono text-xs font-extrabold transition-all cursor-pointer shadow-[0_0_18px_rgba(6,182,212,0.5)] active:scale-95 disabled:opacity-50"
            id="btn-simpan-draft-gdrive"
            type="button"
          >
            <CloudUpload className="w-4 h-4 text-cyan-200" />
            <span>{isSyncingDrive ? 'Syncing Drive...' : 'Simpan & Sync Google Drive'}</span>
          </button>
        </div>
      </div>

      {/* Image Uploader Modal */}
      <ImageUploader
        images={images}
        onAddImage={handleAddImage}
        onRemoveImage={handleRemoveImage}
        onUpdateImage={handleUpdateImage}
        onReorderImages={handleReorderImages}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
      />

      {/* Document Print Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        htmlContent={htmlContent}
        images={images}
        onExportPdf={handleExportPdf}
        onShareWhatsapp={handleShareWhatsapp}
      />

      {/* Google Drive Setup Modal (100% Gratis Apps Script Method) */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-cyan-500/40 rounded-2xl w-full max-w-2xl p-5 text-white shadow-[0_0_35px_rgba(0,0,0,0.9)] space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-cyan-400" />
                <h3 className="font-extrabold text-base text-cyan-300 font-mono tracking-wider uppercase">
                  SINKRONISASI GOOGLE DRIVE (100% GRATIS)
                </h3>
              </div>
              <button
                onClick={() => setIsDriveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-950/70 border border-emerald-500/50 p-3.5 rounded-xl text-xs text-emerald-100 font-sans space-y-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <div className="flex items-center gap-2 font-bold text-emerald-300 font-mono text-sm">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Status: TERHUBUNG REAL-TIME (AUTO-KONEK AKTIF)</span>
              </div>
              <p>
                Aplikasi ini otomatis terhubung ke <strong>Google Drive</strong> setiap kali dibuka. File PDF Berita Acara langsung tersimpan otomatis ke folder bulanan Google Drive tanpa perlu login ulang atau verifikasi OAuth.
              </p>
            </div>

            {/* 3 Steps Setup Guide */}
            <div className="space-y-3 font-sans text-xs">
              <div className="font-bold font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Cara Pemasangan 1 Menit:</span>
              </div>

              <div className="space-y-2 bg-[#070c1a] p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-start gap-2">
                  <span className="bg-cyan-900 text-cyan-200 font-mono font-bold px-2 py-0.5 rounded text-[11px] shrink-0">Langkah 1</span>
                  <span>
                    Buka <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-mono font-bold">script.google.com</a> dengan akun Google Drive Anda (misal: <code>engineering.xxilmp@gmail.com</code>) lalu klik <strong>"New project"</strong>.
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="bg-cyan-900 text-cyan-200 font-mono font-bold px-2 py-0.5 rounded text-[11px] shrink-0">Langkah 2</span>
                  <div className="space-y-1.5 flex-1">
                    <span>Hapussemua isi kode bawaan, lalu salin (copy) kode di bawah ini:</span>
                    <div className="relative bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto">
                      <pre>{RECOMMENDED_APPS_SCRIPT_CODE}</pre>
                      <button
                        onClick={handleCopyCode}
                        className="absolute top-2 right-2 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {isCopiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopiedCode ? 'Tersalin!' : 'Copy Kode Script'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="bg-cyan-900 text-cyan-200 font-mono font-bold px-2 py-0.5 rounded text-[11px] shrink-0">Langkah 3</span>
                  <span>
                    Klik tombol <strong>Deploy &gt; New deployment</strong> &gt; pilih type <strong>Web App</strong>. Set <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>. Klik <strong>Deploy</strong>, lalu salin <strong>Web App URL</strong>-nya ke kolom di bawah ini.
                  </span>
                </div>
              </div>
            </div>

            {/* Input Web App URL */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="block text-xs font-mono font-bold text-slate-200">
                Tempel Google Apps Script Web App URL Di Sini:
              </label>
              <input
                type="text"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(normalizeAppsScriptUrl(e.target.value))}
                onBlur={(e) => setWebAppUrl(normalizeAppsScriptUrl(e.target.value))}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsDriveModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  handleSaveWebAppUrl(webAppUrl);
                  setIsDriveModalOpen(false);
                  handleSaveDraftAndSyncDrive();
                }}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs rounded-lg shadow-[0_0_12px_rgba(0,240,255,0.4)] transition-all cursor-pointer"
              >
                Simpan & Sync Google Drive
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Paste & Auto Sanitizer Modal */}
      <PasteTextModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onInsertContent={handleInsertPastedContent}
      />

      {/* Dynamic Signature Manager Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        currentDocumentHtml={htmlContent}
        onApplySignatures={handleApplySignatures}
      />

    </div>
  );
}
