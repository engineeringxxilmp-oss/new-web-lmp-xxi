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
  FileEdit,
  Layers,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ListOrdered
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

export interface BatchBaItem {
  id: string;
  internalNo: string; // "BA 01", "BA 02", etc.
  namaBarang: string; // "Lampu Philips MR16"
  qty: string; // "10"
  satuan: string; // "pcs"
  htmlContent: string;
  images: UploadedImage[];
  kotaSign: string;
  tglSign: number;
  blnSign: string;
  thnSign: number;
  datePickerValue: string;
  createdAt: string;
  pdfFileName: string; // "Lampu Philips MR16.pdf"
  pdfBase64?: string;
}

// Convert Blob to Base64 data URL
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Convert Base64 data URL back to Blob
export const base64ToBlob = (dataUrl: string): Blob => {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
  const binaryString = atob(parts[1]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

// IndexedDB persistence for BA PDF Blobs so they survive page reloads and avoid 5MB localStorage limits
const IDB_NAME = 'xxi_ba_blobs_db';
const IDB_STORE = 'blobs';

const openBlobsIdb = (): Promise<IDBDatabase | null> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const saveBaBlobToIdb = async (id: string, blob: Blob): Promise<void> => {
  const idb = await openBlobsIdb();
  if (!idb) return;
  try {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, id);
  } catch (e) {
    console.warn('IDB put blob error:', e);
  }
};

const getBaBlobFromIdb = async (id: string): Promise<Blob | null> => {
  const idb = await openBlobsIdb();
  if (!idb) return null;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const getReq = tx.objectStore(IDB_STORE).get(id);
      getReq.onsuccess = () => resolve((getReq.result as Blob) || null);
      getReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const deleteBaBlobFromIdb = async (id: string): Promise<void> => {
  const idb = await openBlobsIdb();
  if (!idb) return;
  try {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
  } catch {}
};

// Clean filename for PDF attachment (strictly uses nama barang asli, e.g. "Lampu Philips MR16.pdf")
export const getCleanItemFileName = (namaBarang: string): string => {
  let clean = (namaBarang || 'Permintaan Barang')
    .replace(/[\\/:*?"<>|,;]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.toLowerCase().endsWith('.pdf')) {
    clean = clean.slice(0, -4).trim();
  }
  return `${clean}.pdf`;
};

// WhatsApp Batch Message Builder (combines real item names, qty & unit, strictly no BA 01/02)
export const buildWhatsAppBatchMessage = (items: BatchBaItem[], cinemaName: string): string => {
  const listText = items
    .map((item) => {
      const name = item.namaBarang.trim() || 'Barang Permintaan';
      const qtyPart = item.qty.trim()
        ? ` — ${item.qty.trim()}${item.satuan.trim() ? ' ' + item.satuan.trim() : ''}`
        : '';
      return `• ${name}${qtyPart}`;
    })
    .join('\n');

  return `Selamat siang Bapak/Ibu,

berikut kami kirimkan permintaan barang untuk kebutuhan operasional ${cinemaName}:

${listText}

Mohon untuk dilakukan approval.

Terima kasih.`;
};

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
  const [itemQty, setItemQty] = useState<string>('');
  const [itemSatuan, setItemSatuan] = useState<string>('pcs');

  // Batch Share BA Orderan States
  const [batchBaList, setBatchBaList] = useState<BatchBaItem[]>(() => {
    try {
      const saved = localStorage.getItem('xxi_ba_batch_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedBaIds, setSelectedBaIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('xxi_ba_batch_list');
      if (saved) {
        const parsed: BatchBaItem[] = JSON.parse(saved);
        return parsed.map((item) => item.id);
      }
      return [];
    } catch {
      return [];
    }
  });
  const [editingBaId, setEditingBaId] = useState<string | null>(null);
  const baBlobsRef = useRef<Map<string, Blob>>(new Map());

  // Next internal BA number (e.g. BA 01, BA 02, BA 03...)
  const nextInternalNo = `BA ${String(batchBaList.length + 1).padStart(2, '0')}`;

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

  // Save or Update BA in Batch Queue
  const handleSaveToBatch = async () => {
    const trimmedName = namaBarangOrdered.trim();
    if (!trimmedName) {
      if (onShowToast) {
        onShowToast('Silakan isi Nama Barang yang diorder terlebih dahulu sebelum menyimpan ke antrean!', 'warning');
      }
      return;
    }

    setIsExporting(true);
    if (onShowToast) {
      onShowToast('Menyimpan BA dan menyiapkan dokumen PDF...', 'info');
    }

    try {
      // 1. Generate PDF Blob using existing function (no modification to design/template)
      const blob = await generatePdfBlob();
      const cleanFileName = getCleanItemFileName(trimmedName);
      let pdfBase64: string | undefined;
      try {
        pdfBase64 = await blobToBase64(blob);
      } catch {}

      if (editingBaId) {
        // Updating existing BA in the batch
        baBlobsRef.current.set(editingBaId, blob);
        saveBaBlobToIdb(editingBaId, blob);
        if (typeof window !== 'undefined') {
          (window as any).__xxi_ba_blobs = (window as any).__xxi_ba_blobs || new Map();
          (window as any).__xxi_ba_blobs.set(editingBaId, blob);
        }

        setBatchBaList((prev) => {
          const updated = prev.map((item) => {
            if (item.id === editingBaId) {
              return {
                ...item,
                namaBarang: trimmedName,
                qty: itemQty.trim(),
                satuan: itemSatuan.trim(),
                htmlContent,
                images: [...images],
                kotaSign,
                tglSign,
                blnSign,
                thnSign,
                datePickerValue,
                pdfFileName: cleanFileName,
                pdfBase64: pdfBase64 || item.pdfBase64
              };
            }
            return item;
          });
          try {
            localStorage.setItem('xxi_ba_batch_list', JSON.stringify(updated));
          } catch {
            try {
              const fallbackList = updated.map(({ pdfBase64: _, ...rest }) => rest);
              localStorage.setItem('xxi_ba_batch_list', JSON.stringify(fallbackList));
            } catch {}
          }
          return updated;
        });

        if (onShowToast) {
          onShowToast(`Dokumen BA berhasil diperbarui!`, 'success');
        }
        setEditingBaId(null);
      } else {
        // Adding new BA to batch
        const newIndex = batchBaList.length + 1;
        const internalNo = `BA ${String(newIndex).padStart(2, '0')}`;
        const newId = `ba-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        baBlobsRef.current.set(newId, blob);
        saveBaBlobToIdb(newId, blob);
        if (typeof window !== 'undefined') {
          (window as any).__xxi_ba_blobs = (window as any).__xxi_ba_blobs || new Map();
          (window as any).__xxi_ba_blobs.set(newId, blob);
        }

        const newBaItem: BatchBaItem = {
          id: newId,
          internalNo,
          namaBarang: trimmedName,
          qty: itemQty.trim(),
          satuan: itemSatuan.trim(),
          htmlContent,
          images: [...images],
          kotaSign,
          tglSign,
          blnSign,
          thnSign,
          datePickerValue,
          createdAt: new Date().toISOString(),
          pdfFileName: cleanFileName,
          pdfBase64
        };

        setBatchBaList((prev) => {
          const updated = [...prev, newBaItem];
          try {
            localStorage.setItem('xxi_ba_batch_list', JSON.stringify(updated));
          } catch {
            try {
              const fallbackList = updated.map(({ pdfBase64: _, ...rest }) => rest);
              localStorage.setItem('xxi_ba_batch_list', JSON.stringify(fallbackList));
            } catch {}
          }
          return updated;
        });

        // Automatically select the new item for sharing
        setSelectedBaIds((prev) => [...prev, newId]);

        if (onShowToast) {
          onShowToast(`${internalNo} (${trimmedName}) berhasil disimpan ke antrean! Kertas dikosongkan untuk BA berikutnya.`, 'success');
        }

        // Reset paper to clean template for next BA (leaves logo & kop surat)
        setHtmlContent(DEFAULT_HTML_CONTENT);
        if (editorRef.current) {
          editorRef.current.innerHTML = DEFAULT_HTML_CONTENT;
        }
        setImages([]);
        setNamaBarangOrdered('');
        setItemQty('');
        setItemSatuan('pcs');
        localStorage.removeItem('xxi_berita_acara_draft');
        setLastSavedTime(null);
      }
    } catch (err: any) {
      console.error('Failed to save BA to batch:', err);
      if (onShowToast) {
        onShowToast(`Gagal menyimpan BA: ${err.message || 'Error'}`, 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Load a BA from batch into the editor paper
  const handleLoadBaFromBatch = (item: BatchBaItem) => {
    setEditingBaId(item.id);
    setNamaBarangOrdered(item.namaBarang);
    setItemQty(item.qty || '');
    setItemSatuan(item.satuan || 'pcs');
    setHtmlContent(item.htmlContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = item.htmlContent;
    }
    setImages(item.images || []);
    setKotaSign(item.kotaSign);
    setTglSign(item.tglSign);
    setBlnSign(item.blnSign);
    setThnSign(item.thnSign);
    setDatePickerValue(item.datePickerValue);

    // Scroll smoothly to editor
    const editorEl = document.getElementById('a4-document-paper');
    if (editorEl) {
      editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (onShowToast) {
      onShowToast(`${item.internalNo} (${item.namaBarang}) dimuat ke kertas untuk diedit.`, 'info');
    }
  };

  // Cancel editing an existing BA
  const handleCancelEdit = () => {
    setEditingBaId(null);
    setNamaBarangOrdered('');
    setItemQty('');
    setItemSatuan('pcs');
    setHtmlContent(DEFAULT_HTML_CONTENT);
    if (editorRef.current) {
      editorRef.current.innerHTML = DEFAULT_HTML_CONTENT;
    }
    setImages([]);
    if (onShowToast) {
      onShowToast('Batal edit. Kertas dikosongkan.', 'info');
    }
  };

  // Delete a BA from batch queue
  const handleDeleteBaFromBatch = (id: string) => {
    setBatchBaList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      // Renumber internalNo sequentially (BA 01, BA 02, etc.)
      const renumbered = updated.map((item, idx) => ({
        ...item,
        internalNo: `BA ${String(idx + 1).padStart(2, '0')}`
      }));
      try {
        localStorage.setItem('xxi_ba_batch_list', JSON.stringify(renumbered));
      } catch {}
      return renumbered;
    });
    setSelectedBaIds((prev) => prev.filter((itemId) => itemId !== id));
    baBlobsRef.current.delete(id);
    deleteBaBlobFromIdb(id);
    if (typeof window !== 'undefined' && (window as any).__xxi_ba_blobs) {
      (window as any).__xxi_ba_blobs.delete(id);
    }
    if (editingBaId === id) {
      handleCancelEdit();
    }
    if (onShowToast) {
      onShowToast('BA dihapus dari antrean.', 'info');
    }
  };

  // Toggle select all checkboxes
  const handleToggleSelectAll = () => {
    if (selectedBaIds.length === batchBaList.length) {
      setSelectedBaIds([]);
    } else {
      setSelectedBaIds(batchBaList.map((item) => item.id));
    }
  };

  // Toggle single item checkbox
  const handleToggleSelectOne = (id: string) => {
    setSelectedBaIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Helper to retrieve cached blob or render PDF blob on demand
  const getOrGenerateBaBlob = async (item: BatchBaItem): Promise<Blob> => {
    // 1. From component memory
    if (baBlobsRef.current.has(item.id)) {
      return baBlobsRef.current.get(item.id)!;
    }
    // 2. From window cache
    if (typeof window !== 'undefined' && (window as any).__xxi_ba_blobs?.has(item.id)) {
      const b = (window as any).__xxi_ba_blobs.get(item.id);
      baBlobsRef.current.set(item.id, b);
      return b;
    }
    // 3. From IndexedDB persistent storage
    const idbBlob = await getBaBlobFromIdb(item.id);
    if (idbBlob) {
      baBlobsRef.current.set(item.id, idbBlob);
      return idbBlob;
    }
    // 4. From stored base64 data
    if (item.pdfBase64) {
      try {
        const b = base64ToBlob(item.pdfBase64);
        baBlobsRef.current.set(item.id, b);
        saveBaBlobToIdb(item.id, b);
        return b;
      } catch (e) {
        console.warn('Failed converting stored base64 to blob:', e);
      }
    }
    // 5. From active editor if content matches
    if (editorRef.current && editorRef.current.innerHTML === item.htmlContent) {
      const blob = await generatePdfBlob();
      baBlobsRef.current.set(item.id, blob);
      saveBaBlobToIdb(item.id, blob);
      return blob;
    }
    // 6. Temporarily mount to render PDF
    setHtmlContent(item.htmlContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = item.htmlContent;
    }
    setImages(item.images || []);
    setKotaSign(item.kotaSign);
    setTglSign(item.tglSign);
    setBlnSign(item.blnSign);
    setThnSign(item.thnSign);
    await new Promise((r) => setTimeout(r, 200));
    const blob = await generatePdfBlob();
    baBlobsRef.current.set(item.id, blob);
    saveBaBlobToIdb(item.id, blob);
    return blob;
  };

  // Reset function strictly after successful share:
  // - Sent BAs disappear from the list
  // - Checkbox empty
  // - Counter 0
  // - Page returns to initial condition
  const handleResetAfterSuccessfulShare = (sharedIds: string[]) => {
    // 1. Remove shared BAs from batch list
    setBatchBaList((prev) => {
      const remaining = prev.filter((item) => !sharedIds.includes(item.id));
      const renumbered = remaining.map((item, idx) => ({
        ...item,
        internalNo: `BA ${String(idx + 1).padStart(2, '0')}`
      }));
      try {
        localStorage.setItem('xxi_ba_batch_list', JSON.stringify(renumbered));
      } catch {}
      return renumbered;
    });

    // 2. Clear selections
    setSelectedBaIds([]);

    // 3. Clear cached blobs for shared items
    sharedIds.forEach((id) => {
      baBlobsRef.current.delete(id);
      deleteBaBlobFromIdb(id);
      if (typeof window !== 'undefined' && (window as any).__xxi_ba_blobs) {
        (window as any).__xxi_ba_blobs.delete(id);
      }
    });

    // 4. Reset paper to clean template (leaves Logo & Kop Surat only)
    setHtmlContent(DEFAULT_HTML_CONTENT);
    if (editorRef.current) {
      editorRef.current.innerHTML = DEFAULT_HTML_CONTENT;
    }
    setImages([]);
    setNamaBarangOrdered('');
    setItemQty('');
    setItemSatuan('pcs');
    setEditingBaId(null);
    localStorage.removeItem('xxi_berita_acara_draft');
    setLastSavedTime(null);
  };

  // Share WhatsApp Handler (Batch & Single with PDF file attachments & safe fallback)
  const handleShareWhatsapp = async () => {
    if (isExporting) return;

    let itemsToShare: BatchBaItem[] = [];

    if (batchBaList.length > 0) {
      if (selectedBaIds.length === 0) {
        if (onShowToast) {
          onShowToast('Silakan centang minimal 1 BA di daftar untuk di-share ke WhatsApp.', 'warning');
        }
        return;
      }
      itemsToShare = batchBaList.filter((b) => selectedBaIds.includes(b.id));
    } else {
      // If batch list is empty, check if current editor has an item
      const currentName = namaBarangOrdered.trim();
      if (!currentName) {
        if (onShowToast) {
          onShowToast('Silakan isi Nama Barang atau simpan BA ke antrean terlebih dahulu!', 'warning');
        }
        return;
      }
      itemsToShare = [{
        id: 'current-single-ba',
        internalNo: 'BA 01',
        namaBarang: currentName,
        qty: itemQty.trim(),
        satuan: itemSatuan.trim(),
        htmlContent,
        images,
        kotaSign,
        tglSign,
        blnSign,
        thnSign,
        datePickerValue,
        createdAt: new Date().toISOString(),
        pdfFileName: getCleanItemFileName(currentName)
      }];
    }

    setIsExporting(true);
    if (onShowToast) {
      onShowToast(`Menyiapkan ${itemsToShare.length} file PDF Berita Acara...`, 'info');
    }

    try {
      // 1. Build Cinema Name & WhatsApp message text
      const branding = db.getBranding();
      let cinemaName = 'Cinema XXI Lippo Mall Puri';
      if (branding && (branding.title || branding.subtitle)) {
        const t = branding.title ? branding.title.trim() : 'Cinema XXI';
        const s = branding.subtitle ? branding.subtitle.trim() : '';
        cinemaName = `${t} ${s}`.trim();
      }
      const whatsappMessage = buildWhatsAppBatchMessage(itemsToShare, cinemaName);

      // 2. Prepare ALL PDF files using existing generatePdfBlob
      const pdfFiles: File[] = [];

      for (const item of itemsToShare) {
        let blob: Blob;
        if (item.id === 'current-single-ba') {
          blob = await generatePdfBlob();
        } else {
          blob = await getOrGenerateBaBlob(item);
        }

        const fileName = getCleanItemFileName(item.namaBarang);
        const file = new File([blob], fileName, {
          type: 'application/pdf',
          lastModified: Date.now()
        });
        pdfFiles.push(file);
      }

      // 3. Check file sharing ability using navigator.canShare({ files })
      const files = pdfFiles;
      let canShareFiles = false;
      try {
        canShareFiles =
          typeof navigator !== 'undefined' &&
          typeof navigator.canShare === 'function' &&
          Boolean(navigator.canShare({ files }));
      } catch (checkErr) {
        console.warn('navigator.canShare check encountered an issue:', checkErr);
        canShareFiles = false;
      }

      if (canShareFiles) {
        try {
          await navigator.share({
            text: whatsappMessage,
            files: pdfFiles
          });
          // Reset only on successful share!
          handleResetAfterSuccessfulShare(itemsToShare.map((i) => i.id));
          if (onShowToast) {
            onShowToast(`Berhasil membagikan ${pdfFiles.length} file PDF Berita Acara ke WhatsApp! Antrean BA di-reset.`, 'success');
          }
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            // User closed or canceled share sheet: DO NOT reset!
            if (onShowToast) {
              onShowToast('Pengiriman dibatalkan. Dokumen BA tetap tersimpan di antrean.', 'info');
            }
            return;
          }
          console.warn('Web Share API error:', shareErr);
          if (onShowToast) {
            onShowToast(`Gagal membagikan ke WhatsApp: ${shareErr.message || 'Error'}`, 'error');
          }
        }
      } else {
        if (onShowToast) {
          onShowToast(
            `Browser ini tidak mendukung pengiriman lampiran file PDF via Web Share API. Buka aplikasi di smartphone (Chrome Android / Safari iOS) atau buka tab baru untuk berbagi ${pdfFiles.length} file PDF langsung ke WhatsApp.`,
            'warning'
          );
        }
      }
    } catch (err: any) {
      console.error('Failed to share via WhatsApp:', err);
      if (onShowToast) {
        onShowToast(`Gagal menyiapkan dokumen: ${err.message || 'Error'}`, 'error');
      }
    } finally {
      setIsExporting(false);
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-slate-400 font-sans mb-1">Nama Barang / Permintaan:</label>
                  <input
                    type="text"
                    value={namaBarangOrdered}
                    onChange={(e) => setNamaBarangOrdered(e.target.value)}
                    placeholder="Contoh: Sensor Lampu Studio Barco & Sparepart"
                    className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-lg px-3.5 py-2 text-white font-sans text-sm h-10 focus:outline-hidden transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-sans mb-1">Jumlah / Qty:</label>
                    <input
                      type="text"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      placeholder="10"
                      className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white font-sans text-sm h-10 focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 font-sans mb-1">Satuan:</label>
                    <input
                      type="text"
                      value={itemSatuan}
                      onChange={(e) => setItemSatuan(e.target.value)}
                      placeholder="pcs"
                      className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white font-sans text-sm h-10 focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                <div className="bg-[#050914] px-3 py-2 h-10 rounded-lg border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                  <span className="text-slate-400 text-xs font-sans shrink-0 uppercase">NAMA FILE:</span>
                  <span className="text-cyan-200 font-bold text-xs truncate tracking-tight select-all uppercase">
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

      {/* ========================================================================= */}
      {/* BATCH SHARE BA ORDERAN PANEL                                              */}
      {/* ========================================================================= */}
      <div
        className="bg-[#0d1322]/95 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-4 sm:p-5 shadow-[0_4px_25px_rgba(0,240,255,0.08)] space-y-4"
        id="batch-share-ba-orderan-panel"
      >
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/90 border border-cyan-500/60 rounded-xl text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black font-sans text-white tracking-wide uppercase">
                  BATCH SHARE BA ORDERAN
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-cyan-950/80 text-cyan-300 border-cyan-500/50 font-bold">
                  {batchBaList.length} BA Tersimpan
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border bg-emerald-950/80 text-emerald-300 border-emerald-500/50 font-bold">
                  {selectedBaIds.length} BA Dipilih
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                Simpan beberapa BA terlebih dahulu, lalu pilih dengan checkbox dan kirim sekaligus ke WhatsApp dalam 1 pesan terpadu beserta seluruh lampiran PDF.
              </p>
            </div>
          </div>

          {/* Quick Share WhatsApp Button if items exist */}
          {batchBaList.length > 0 && (
            <button
              onClick={handleShareWhatsapp}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 shrink-0"
              id="btn-batch-share-whatsapp-top"
              type="button"
            >
              <Share2 className="w-4 h-4 text-emerald-200" />
              <span>Share WhatsApp ({selectedBaIds.length} BA)</span>
            </button>
          )}
        </div>

        {/* Input Bar: Nama Barang, Qty, Satuan & Tombol Simpan ke Antrean */}
        <div className="bg-[#070d1e] border border-cyan-500/30 rounded-xl p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs font-mono">
              <Package className="w-4 h-4 text-cyan-400" />
              <span>{editingBaId ? 'EDIT DOKUMEN DALAM ANTREAN:' : 'INPUT BA UNTUK ANTREAN BATCH:'}</span>
            </div>
            {editingBaId && (
              <span className="text-xs font-mono text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                Sedang mengedit item yang dipilih
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-5">
              <label className="block text-[11px] text-slate-300 font-sans mb-1 font-medium">
                Nama Barang / Permintaan:
              </label>
              <input
                type="text"
                value={namaBarangOrdered}
                onChange={(e) => setNamaBarangOrdered(e.target.value)}
                placeholder="Contoh: Lampu Philips MR16"
                className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white font-sans text-sm h-10 focus:outline-hidden transition-colors"
                id="input-batch-nama-barang"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-300 font-sans mb-1 font-medium">
                Jumlah (Qty):
              </label>
              <input
                type="text"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                placeholder="10"
                className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white font-sans text-sm h-10 focus:outline-hidden transition-colors"
                id="input-batch-qty"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-300 font-sans mb-1 font-medium">
                Satuan:
              </label>
              <input
                type="text"
                value={itemSatuan}
                onChange={(e) => setItemSatuan(e.target.value)}
                placeholder="pcs"
                className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white font-sans text-sm h-10 focus:outline-hidden transition-colors"
                id="input-batch-satuan"
              />
            </div>

            <div className="sm:col-span-3 flex gap-2">
              {editingBaId ? (
                <>
                  <button
                    onClick={handleSaveToBatch}
                    disabled={isExporting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer h-10 active:scale-95 disabled:opacity-50"
                    id="btn-update-batch-item"
                    type="button"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Update BA</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer h-10 active:scale-95"
                    id="btn-cancel-batch-edit"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSaveToBatch}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-mono text-xs font-bold transition-all cursor-pointer h-10 shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 disabled:opacity-50"
                  id="btn-save-to-batch"
                  type="button"
                >
                  <Plus className="w-4 h-4 text-cyan-200" />
                  <span>+ Simpan ({nextInternalNo})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List of Saved BAs with Checkboxes */}
        {batchBaList.length > 0 ? (
          <div className="space-y-2">
            {/* List Toolbar / Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-lg cursor-pointer transition-all active:scale-95 font-bold"
                  type="button"
                  id="btn-toggle-select-all"
                >
                  {selectedBaIds.length === batchBaList.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Batalkan Semua</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pilih Semua</span>
                    </>
                  )}
                </button>
                <span className="text-slate-400">
                  {selectedBaIds.length} dari {batchBaList.length} terpilih
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
                *File PDF otomatis dinamai sesuai nama barang asli saat dikirim
              </span>
            </div>

            {/* List Table / Cards */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {batchBaList.map((item) => {
                const isSelected = selectedBaIds.includes(item.id);
                const isCurrentlyEditing = editingBaId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#0a152e] border-cyan-500/60 shadow-[0_0_12px_rgba(0,240,255,0.12)]'
                        : 'bg-[#050a17] border-slate-800/80 opacity-70 hover:opacity-100'
                    } ${isCurrentlyEditing ? 'ring-2 ring-amber-400/80' : ''}`}
                  >
                    {/* Left: Checkbox + Internal No Badge + Real Item Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleSelectOne(item.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                            : 'bg-slate-900 border-slate-700 text-transparent hover:border-slate-500'
                        }`}
                        type="button"
                        id={`chk-${item.id}`}
                        aria-label={`Pilih ${item.internalNo}`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      {/* Internal BA Badge: BA 01, BA 02, etc. */}
                      <span className="px-2.5 py-1 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-black shrink-0 tracking-wider">
                        {item.internalNo}
                      </span>

                      {/* Item Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm font-sans truncate">
                            {item.namaBarang}
                          </span>
                          {item.qty && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {item.qty} {item.satuan || ''}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                          <span className="text-slate-500">File PDF:</span>
                          <span className="text-cyan-300 font-semibold">{item.pdfFileName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions (Lihat/Edit & Hapus) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleLoadBaFromBatch(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer active:scale-95"
                        type="button"
                        id={`btn-edit-${item.id}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Lihat / Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteBaFromBatch(item.id)}
                        className="p-1.5 bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/50 rounded-lg text-xs transition-all cursor-pointer active:scale-95"
                        type="button"
                        id={`btn-delete-${item.id}`}
                        title="Hapus dari antrean"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#050a17] border border-slate-800 text-center space-y-1 text-slate-400">
            <p className="text-xs font-sans">
              Belum ada Berita Acara yang disimpan ke antrean batch.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Isi nama barang di atas & edit kertas di bawah, lalu klik <strong className="text-cyan-400">+ Simpan (BA 01)</strong> untuk mulai mengumpulkan batch.
            </p>
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
          {/* Simpan ke Antrean BA Button */}
          <button
            onClick={handleSaveToBatch}
            disabled={isExporting}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 disabled:opacity-50"
            id="btn-bottom-save-batch"
            type="button"
          >
            <Plus className="w-4 h-4 text-cyan-200" />
            <span>{editingBaId ? 'Update BA' : `+ Antrean (${nextInternalNo})`}</span>
          </button>

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
            <span>Share WhatsApp {selectedBaIds.length > 0 ? `(${selectedBaIds.length} BA)` : ''}</span>
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
