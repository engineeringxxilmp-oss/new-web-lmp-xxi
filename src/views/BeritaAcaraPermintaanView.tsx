/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  ListOrdered,
  Loader2
} from 'lucide-react';

import db from '../db/localDb';
import { BeritaAcaraDraft } from '../types';
import DocumentToolbar from '../components/berita-acara/DocumentToolbar';
import DocumentEditor from '../components/berita-acara/DocumentEditor';
import ImageUploader, { UploadedImage, chunkImagesIntoPages } from '../components/berita-acara/ImageUploader';
import DocumentPreviewModal from '../components/berita-acara/DocumentPreviewModal';
import PasteTextModal from '../components/berita-acara/PasteTextModal';
import SignatureModal from '../components/berita-acara/SignatureModal';
import {
  generateSignaturesHtml,
  PRESET_2_SIGNEES,
  PRESET_3_SIGNEES,
  PRESET_4_SIGNEES,
  PRESET_5_SIGNEES
} from '../components/berita-acara/signatureUtils';
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

Catatan:
Mohon Bapak/Ibu untuk melakukan follow up dan menaikkan permintaan barang ini ke proses FPKB.

Mohon untuk dilakukan approval.

Terima kasih.`;
};

export const DEFAULT_HTML_CONTENT = '<p><br></p>';

interface BeritaAcaraPermintaanViewProps {
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  isMobileDocumentPreviewOpen?: boolean;
  setIsMobileDocumentPreviewOpen?: (isOpen: boolean) => void;
}

export default function BeritaAcaraPermintaanView({
  onShowToast,
  isMobileDocumentPreviewOpen,
  setIsMobileDocumentPreviewOpen,
}: BeritaAcaraPermintaanViewProps) {
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
  const [isBatchPanelExpanded, setIsBatchPanelExpanded] = useState<boolean>(false);
  const baBlobsRef = useRef<Map<string, Blob>>(new Map());
  const baFilesRef = useRef<Map<string, File>>(new Map());
  const [pdfReadyMap, setPdfReadyMap] = useState<Record<string, boolean>>({});

  // Batch vs Single readiness computations for WhatsApp share
  const isBatchMode = batchBaList.length > 0;
  const selectedCount = isBatchMode
    ? selectedBaIds.length
    : namaBarangOrdered.trim()
    ? 1
    : 0;

  const areSelectedPdfsReady = useMemo(() => {
    if (isBatchMode) {
      if (selectedBaIds.length === 0) return false;
      return selectedBaIds.every((id) => pdfReadyMap[id] && baFilesRef.current.has(id));
    }
    if (!namaBarangOrdered.trim()) return false;
    return Boolean(pdfReadyMap['current-single-ba'] && baFilesRef.current.has('current-single-ba'));
  }, [isBatchMode, selectedBaIds, pdfReadyMap, namaBarangOrdered]);

  const readySelectedCount = useMemo(() => {
    if (isBatchMode) {
      return selectedBaIds.filter((id) => pdfReadyMap[id] && baFilesRef.current.has(id)).length;
    }
    return pdfReadyMap['current-single-ba'] && baFilesRef.current.has('current-single-ba') ? 1 : 0;
  }, [isBatchMode, selectedBaIds, pdfReadyMap]);

  // Next internal BA number (e.g. BA 01, BA 02, BA 03...)
  const nextInternalNo = `BA ${String(batchBaList.length + 1).padStart(2, '0')}`;

  // Modals & Loaders
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [internalPreviewModalOpen, setInternalPreviewModalOpen] = useState<boolean>(false);

  // State sinkronisasi preview dokumen fullscreen mobile
  const isPreviewModalOpen = isMobileDocumentPreviewOpen !== undefined ? isMobileDocumentPreviewOpen : internalPreviewModalOpen;

  const handleOpenPreview = useCallback(() => {
    const liveEditor = document.getElementById('rich-text-editor-body');
    if (liveEditor) {
      setHtmlContent(liveEditor.innerHTML);
    }
    setInternalPreviewModalOpen(true);
    setIsMobileDocumentPreviewOpen?.(true);
  }, [setIsMobileDocumentPreviewOpen]);

  const handleClosePreview = useCallback(() => {
    setInternalPreviewModalOpen(false);
    setIsMobileDocumentPreviewOpen?.(false);
  }, [setIsMobileDocumentPreviewOpen]);
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
        // Find signature container (modern flexbox or legacy table) or insert near bottom
        let targetSig: HTMLElement | null = doc.querySelector(
          '.ba-signature-container, .signature-container, [data-signature-count], [data-signature-container]'
        );

        if (!targetSig) {
          const tables = doc.querySelectorAll('table');
          tables.forEach((t) => {
            const text = t.textContent || '';
            if (
              text.includes('Mengetahui') ||
              text.includes('Dibuat') ||
              text.includes('Teknisi') ||
              text.includes('Chief') ||
              text.includes('Manager')
            ) {
              targetSig = t as HTMLElement;
            }
          });
        }

        const newP = doc.createElement('p');
        newP.id = 'doc-date-line';
        newP.setAttribute('style', 'text-align: right; margin-top: 25px; margin-bottom: 12px; font-weight: normal;');
        newP.innerHTML = formattedDateStr;

        if (targetSig && targetSig.parentNode) {
          targetSig.parentNode.insertBefore(newP, targetSig);
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

  // Apply Dynamic Signatures (3, 4, 5 signees with responsive balanced flexbox)
  const handleApplySignatures = (newSignaturesHtml: string) => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;

      const parser = new DOMParser();
      const doc = parser.parseFromString(currentHtml, 'text/html');

      // 1. Search for existing signature container (.ba-signature-container, etc.)
      let targetEl: HTMLElement | null = doc.querySelector(
        '.ba-signature-container, .signature-container, [data-signature-count], [data-signature-container]'
      );

      // 2. Fallback: search for legacy signature table
      if (!targetEl) {
        const tables = doc.querySelectorAll('table');
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
            targetEl = table as HTMLElement;
          }
        });
      }

      if (targetEl) {
        targetEl.outerHTML = newSignaturesHtml;
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

      // Re-ensure Date line above TTD container
      setTimeout(() => {
        handleApplyDateAtasTtd();
      }, 50);
    }
  };

  // Apply Quick Preset Signatures using dynamic responsive generator
  const handleApplySignaturePreset = (preset: 'standard_3' | 'simple_2' | 'full_4' | 'full_5') => {
    let signees = PRESET_3_SIGNEES;
    if (preset === 'standard_3') {
      signees = PRESET_3_SIGNEES;
    } else if (preset === 'simple_2') {
      signees = PRESET_2_SIGNEES;
    } else if (preset === 'full_4') {
      signees = PRESET_4_SIGNEES;
    } else if (preset === 'full_5') {
      signees = PRESET_5_SIGNEES;
    }

    const html = generateSignaturesHtml(signees);
    handleApplySignatures(html);
  };

  // Paste & Clean Content Handler
  const handleInsertPastedContent = (cleanHtml: string, isReplaceAll: boolean) => {
    const isCurrentEmpty =
      !editorRef.current?.textContent?.trim() ||
      editorRef.current?.innerHTML.trim() === '<p><br></p>' ||
      editorRef.current?.innerHTML.trim() === '<br>';

    if (isReplaceAll || isCurrentEmpty) {
      setHtmlContent(cleanHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = cleanHtml;
      }
    } else {
      if (editorRef.current) {
        const sel = window.getSelection();
        let range: Range | null = null;
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0);
          if (editorRef.current.contains(r.commonAncestorContainer)) {
            range = r;
          }
        }
        if (range) {
          range.deleteContents();
          const temp = document.createElement('div');
          temp.innerHTML = cleanHtml;
          const frag = document.createDocumentFragment();
          let node: ChildNode | null;
          while ((node = temp.firstChild)) {
            frag.appendChild(node);
          }
          range.insertNode(frag);
        } else {
          editorRef.current.innerHTML += cleanHtml;
        }
        setHtmlContent(editorRef.current.innerHTML);
      }
    }
    if (onShowToast) {
      onShowToast('Teks berhasil ditempel ke editor.', 'success');
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

  // Load saved draft & Google Apps Script URL (Default: Clean empty document)
  useEffect(() => {
    // Check if saved draft exists and has content
    try {
      const savedDraft = localStorage.getItem('xxi_ba_draft_v2');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        // Do not load placeholder sample BA text if it was auto-saved in previous sessions
        const isSamplePlaceholder =
          parsed.htmlContent &&
          parsed.htmlContent.includes('Cinema XXI Lippo Mall Puri, bersama ini kami mengajukan permohonan');

        if (parsed.htmlContent && parsed.htmlContent !== '<p><br></p>' && !isSamplePlaceholder) {
          setHtmlContent(parsed.htmlContent);
          if (editorRef.current) {
            editorRef.current.innerHTML = parsed.htmlContent;
          }
          if (parsed.images) setImages(parsed.images);
        } else {
          setHtmlContent(DEFAULT_HTML_CONTENT);
          if (editorRef.current) {
            editorRef.current.innerHTML = DEFAULT_HTML_CONTENT;
          }
        }
      } else {
        setHtmlContent(DEFAULT_HTML_CONTENT);
        if (editorRef.current) {
          editorRef.current.innerHTML = DEFAULT_HTML_CONTENT;
        }
      }
    } catch {
      setHtmlContent(DEFAULT_HTML_CONTENT);
      if (editorRef.current) {
        editorRef.current.innerHTML = DEFAULT_HTML_CONTENT;
      }
    }

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

  // Auto-save user selection whenever text is highlighted or cursor moves in editor
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
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

  // Rich Text ExecCommand Handler with robust selection restoration & style alignment
  const handleExecCommand = (command: string, value: string = '') => {
    if (editorRef.current) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.focus();
      }
      const sel = window.getSelection();
      if (
        lastSavedRangeRef.current &&
        editorRef.current.contains(lastSavedRangeRef.current.commonAncestorContainer)
      ) {
        if (!sel || sel.rangeCount === 0 || !editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
          sel?.removeAllRanges();
          sel?.addRange(lastSavedRangeRef.current);
        }
      }

      // If command is alignment, also ensure any parent block in editor has textAlign updated cleanly
      if (['justifyLeft', 'justifyCenter', 'justifyRight'].includes(command)) {
        const alignVal = command === 'justifyCenter' ? 'center' : command === 'justifyRight' ? 'right' : 'left';
        document.execCommand(command, false, value);
        
        const currentSel = window.getSelection();
        if (currentSel && currentSel.rangeCount > 0) {
          let node: Node | null = currentSel.getRangeAt(0).commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
          while (node && node !== editorRef.current) {
            if (node instanceof HTMLElement) {
              const tag = node.tagName.toLowerCase();
              if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'li', 'td', 'th'].includes(tag)) {
                node.style.textAlign = alignVal;
                break;
              }
            }
            node = node.parentElement;
          }
        }
      } else {
        document.execCommand(command, false, value);
      }

      setHtmlContent(editorRef.current.innerHTML);
      const selAfter = window.getSelection();
      if (selAfter && selAfter.rangeCount > 0 && editorRef.current.contains(selAfter.getRangeAt(0).commonAncestorContainer)) {
        lastSavedRangeRef.current = selAfter.getRangeAt(0).cloneRange();
      }
    }
  };

  // Font Size Handlers for Rich Text Editor (STRICTLY FOR SELECTED TEXT OR NEXT TYPED TEXT)
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
      !lastSavedRangeRef.current.collapsed &&
      editorRef.current.contains(lastSavedRangeRef.current.commonAncestorContainer)
    ) {
      rangeToUse = lastSavedRangeRef.current;
    }

    // 1. Text is highlighted: apply font size ONLY to the selected text range
    if (rangeToUse && !rangeToUse.collapsed) {
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(rangeToUse);
      }

      document.execCommand('fontSize', false, '7');

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
      return;
    }

    // 2. Cursor is placed without selection (collapsed cursor):
    // Next typed characters will inherit this font size
    let collapsedRange: Range | null = null;
    if (
      sel &&
      sel.rangeCount > 0 &&
      sel.isCollapsed &&
      editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)
    ) {
      collapsedRange = sel.getRangeAt(0);
    } else if (
      lastSavedRangeRef.current &&
      editorRef.current.contains(lastSavedRangeRef.current.commonAncestorContainer)
    ) {
      collapsedRange = lastSavedRangeRef.current;
    }

    if (collapsedRange) {
      editorRef.current.focus();
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      const zwsp = document.createTextNode('\u200B');
      span.appendChild(zwsp);
      collapsedRange.insertNode(span);

      const newRange = document.createRange();
      newRange.setStart(span, 1);
      newRange.setEnd(span, 1);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      lastSavedRangeRef.current = newRange.cloneRange();
      setHtmlContent(editorRef.current.innerHTML);
      if (onShowToast) {
        onShowToast(`Ukuran teks berikutnya diatur ke ${sizePx}`, 'info');
      }
      return;
    }

    // 3. Fallback if editor not focused
    editorRef.current.focus();
    if (onShowToast) {
      onShowToast(`Ukuran ${sizePx} dipilih. Letakkan kursor atau sorot teks di editor.`, 'info');
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
    const liveEditor = document.getElementById('rich-text-editor-body');
    const contentToSave = liveEditor ? liveEditor.innerHTML : htmlContent;
    if (liveEditor && liveEditor.innerHTML !== htmlContent) {
      setHtmlContent(liveEditor.innerHTML);
    }
    const draft: BeritaAcaraDraft = {
      id: 'draft-berita-acara-prm',
      nomorDokumen: 'BA/PRM/LMP-XXI/2026/07/014',
      tanggal: new Date().toISOString(),
      pemohon: 'Engineering Lippo Mall Puri',
      departemen: 'Engineering',
      htmlContent: contentToSave,
      images,
      updatedAt: new Date().toISOString()
    };

    db.saveBeritaAcaraDraft(draft);
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(nowStr);
    return true;
  };

  // Helper to create a standalone fixed A4 Page DOM element for image attachments
  const createFixedImagesPageElement = (
    imgs: UploadedImage[],
    pageNum?: number,
    totalPages?: number
  ): HTMLElement => {
    const container = document.createElement('div');
    container.id = 'a4-images-paper-print';
    container.style.width = '794px';
    container.style.minWidth = '794px';
    container.style.maxWidth = '794px';
    container.style.height = '1123px';
    container.style.minHeight = '1123px';
    container.style.maxHeight = '1123px';
    container.style.boxSizing = 'border-box';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#0f172a';
    container.style.paddingTop = '94.5px'; // 2.5cm
    container.style.paddingBottom = '94.5px'; // 2.5cm
    container.style.paddingLeft = '113.4px'; // 3cm
    container.style.paddingRight = '113.4px'; // 3cm
    container.style.overflow = 'hidden';
    container.style.border = 'none';
    container.style.outline = 'none';
    container.style.boxShadow = 'none';
    container.style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';

    // Header Halaman Lampiran (single clean official border-b)
    const header = document.createElement('div');
    header.style.borderBottom = '2px solid #0f172a';
    header.style.paddingBottom = '12px';
    header.style.marginBottom = '24px';
    header.style.textAlign = 'center';

    const h3 = document.createElement('h3');
    h3.style.fontWeight = 'bold';
    h3.style.fontSize = '16px';
    h3.style.textTransform = 'uppercase';
    h3.style.letterSpacing = '0.05em';
    h3.style.color = '#0f172a';
    h3.textContent = totalPages && totalPages > 1 
      ? `LAMPIRAN DOKUMENTASI & FOTO BARANG (${pageNum}/${totalPages})`
      : 'LAMPIRAN DOKUMENTASI & FOTO BARANG';
    header.appendChild(h3);

    const p = document.createElement('p');
    p.style.fontSize = '12px';
    p.style.fontWeight = '500';
    p.style.color = '#475569';
    p.style.textTransform = 'uppercase';
    p.style.letterSpacing = '0.1em';
    p.style.marginTop = '2px';
    p.textContent = 'BERITA ACARA PERMINTAAN PERBAIKAN / PEMELIHARAAN SARANA & PRASARANA';
    header.appendChild(p);

    container.appendChild(header);

    // Grid Foto - strictly preserves aspect ratio with auto height/width, direct photo without border/frame
    const imgGrid = document.createElement('div');
    imgGrid.style.display = 'flex';
    imgGrid.style.flexWrap = 'wrap';
    imgGrid.style.alignItems = 'flex-start';
    imgGrid.style.justifyContent = 'center';
    imgGrid.style.gap = '16px';

    imgs.forEach((img, idx) => {
      const card = document.createElement('div');
      const widthPct = img.widthPercent || 48;
      if (widthPct >= 90) {
        card.style.width = '100%';
        card.style.flex = '0 0 100%';
      } else if (widthPct >= 40 && widthPct < 90) {
        card.style.width = 'calc(50% - 8px)';
        card.style.flex = '0 0 calc(50% - 8px)';
      } else if (widthPct >= 28 && widthPct < 40) {
        card.style.width = 'calc(33.333% - 11px)';
        card.style.flex = '0 0 calc(33.333% - 11px)';
      } else {
        card.style.width = 'calc(25% - 12px)';
        card.style.flex = '0 0 calc(25% - 12px)';
      }

      // No border, frame, or shadow around photo card
      card.style.border = 'none';
      card.style.outline = 'none';
      card.style.boxShadow = 'none';
      card.style.padding = '4px';
      card.style.backgroundColor = 'transparent';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'center';
      card.style.textAlign = 'center';
      card.style.boxSizing = 'border-box';

      const imgWrapper = document.createElement('div');
      imgWrapper.style.width = '100%';
      imgWrapper.style.display = 'flex';
      imgWrapper.style.justifyContent = 'center';
      imgWrapper.style.alignItems = 'center';
      imgWrapper.style.padding = '0';
      imgWrapper.style.overflow = 'hidden';

      const imageEl = document.createElement('img');
      imageEl.src = img.url;
      imageEl.alt = img.caption || `Lampiran ${idx + 1}`;
      imageEl.style.maxWidth = '100%';
      imageEl.style.maxHeight = '250px';
      imageEl.style.width = 'auto';
      imageEl.style.height = 'auto';
      imageEl.style.objectFit = 'contain';
      imageEl.style.display = 'block';
      imageEl.style.margin = '0 auto';
      imageEl.style.border = 'none';
      imageEl.style.outline = 'none';
      imageEl.style.boxShadow = 'none';
      imgWrapper.appendChild(imageEl);
      card.appendChild(imgWrapper);

      if (img.caption && img.caption.trim() !== '') {
        const capDiv = document.createElement('div');
        capDiv.style.width = '100%';
        capDiv.style.marginTop = '8px';
        const capP = document.createElement('p');
        capP.style.fontSize = '12px';
        capP.style.fontWeight = '600';
        capP.style.color = '#1e293b';
        capP.style.fontStyle = 'italic';
        capP.textContent = img.caption;
        capDiv.appendChild(capP);
        card.appendChild(capDiv);
      }

      imgGrid.appendChild(card);
    });

    container.appendChild(imgGrid);
    return container;
  };

  // Helper to render an element to JPEG with strictly FIXED A4 Desktop Dimensions (794px x 1123px)
  // This guarantees 100% preservation of A4 aspect ratio (210mm x 297mm) with 0 squashing (gepeng) or stretching
  const renderFixedA4PaperToImg = async (
    sourceDocElement: HTMLElement,
    options?: {
      overrideHtmlContent?: string;
      isImagesPage?: boolean;
    }
  ): Promise<{ imgData: string; width: number; height: number }> => {
    // 1. Clone source element so live screen DOM is never modified
    const clone = sourceDocElement.cloneNode(true) as HTMLElement;

    // 2. Remove all .no-print elements and reset any scaling transforms on clone
    clone.querySelectorAll('.no-print').forEach((el) => el.remove());
    clone.style.transform = 'none';

    if (!options?.isImagesPage) {
      // PAGE 1: DOKUMEN UTAMA
      // Enforce exact desktop A4 width (794px) and allow height to naturally include all signatures without clipping
      clone.style.width = '794px';
      clone.style.minWidth = '794px';
      clone.style.maxWidth = '794px';
      clone.style.minHeight = '1123px';
      clone.style.height = 'auto'; // allow natural expansion so signature and paraf are never clipped
      clone.style.maxHeight = 'none';
      clone.style.boxSizing = 'border-box';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#0f172a';
      clone.style.border = 'none';
      clone.style.outline = 'none';
      clone.style.boxShadow = 'none';
      clone.style.paddingTop = '0px';
      clone.style.paddingBottom = '75.6px'; // exact 2cm match with editor paper
      clone.style.paddingLeft = '113.4px'; // 3cm
      clone.style.paddingRight = '113.4px'; // 3cm
      clone.style.overflow = 'visible'; // never clip bottom elements!
      clone.style.position = 'relative';
      clone.style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';
      clone.style.fontSize = '14px';
      clone.style.lineHeight = '1.5';

      // Enforce exact desktop header positioning (never compressed by mobile media queries)
      const header = clone.querySelector('#permanent-document-header') as HTMLElement | null;
      if (header) {
        header.style.width = '100%';
        header.style.textAlign = 'center';
        header.style.borderBottom = '2px solid #000000';
        header.style.paddingBottom = '2px';
        header.style.marginBottom = '6px';
        header.style.marginTop = '-32px'; // Desktop -mt-8
        header.style.userSelect = 'none';
        header.style.pointerEvents = 'none';

        const logoImg = header.querySelector('img') as HTMLImageElement | null;
        if (logoImg) {
          logoImg.style.width = '100%';
          logoImg.style.height = 'auto';
          logoImg.style.display = 'block';
          logoImg.style.margin = '-12px auto 0 auto'; // Desktop -mt-3
          logoImg.style.objectFit = 'contain';
        }

        const h1 = header.querySelector('h1') as HTMLElement | null;
        if (h1) {
          h1.style.fontSize = '30px'; // Desktop text-3xl
          h1.style.marginTop = '-104px'; // Slightly elevated to be tighter, balanced, and closer to banner
          h1.style.fontFamily = 'Playfair Display, serif';
          h1.style.fontWeight = '900';
          h1.style.color = '#b8860b';
          h1.style.letterSpacing = '0.025em';
          h1.style.textTransform = 'uppercase';
          h1.style.textShadow = '0 1px 2px rgba(0,0,0,0.1)';
          h1.style.marginBottom = '0px';
        }

        const address = header.querySelector('p') as HTMLElement | null;
        if (address) {
          address.style.fontSize = '12px'; // Desktop text-xs
          address.style.marginTop = '2px';
          address.style.marginBottom = '2px';
          address.style.color = '#1e293b';
          address.style.fontFamily = 'Inter, sans-serif';
          address.style.lineHeight = '1.25';
          address.style.maxWidth = '42rem';
          address.style.margin = '2px auto 0 auto';
          address.style.padding = '0 16px';
          address.style.fontWeight = '500';
        }
      }

      // If override HTML content is provided (for batch items), apply it
      const editorBody = clone.querySelector('#rich-text-editor-body') as HTMLElement | null;
      if (editorBody) {
        editorBody.style.fontSize = '14px';
        editorBody.style.lineHeight = '1.5';
        editorBody.style.color = '#0f172a';
        editorBody.style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';
        editorBody.style.setProperty('min-height', 'auto', 'important');
        editorBody.style.outline = 'none';
        editorBody.removeAttribute('contenteditable');
        if (options?.overrideHtmlContent !== undefined) {
          editorBody.innerHTML = options.overrideHtmlContent;
        }
      }
    } else {
      // LAMPIRAN DOKUMENTASI FOTO: Strict A4 single page dimensions
      clone.style.width = '794px';
      clone.style.minWidth = '794px';
      clone.style.maxWidth = '794px';
      clone.style.height = '1123px';
      clone.style.minHeight = '1123px';
      clone.style.maxHeight = '1123px';
      clone.style.boxSizing = 'border-box';
      clone.style.backgroundColor = '#ffffff';
      clone.style.color = '#0f172a';
      clone.style.border = 'none';
      clone.style.outline = 'none';
      clone.style.boxShadow = 'none';
      clone.style.paddingTop = '94.5px'; // 2.5cm
      clone.style.paddingBottom = '94.5px'; // 2.5cm
      clone.style.paddingLeft = '113.4px'; // 3cm
      clone.style.paddingRight = '113.4px'; // 3cm
      clone.style.overflow = 'hidden';
      clone.style.position = 'relative';
      clone.style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';
      clone.style.fontSize = '14px';
    }

    // 3. Mount clone into hidden sandbox container
    const mountContainer = document.createElement('div');
    mountContainer.style.position = 'fixed';
    mountContainer.style.top = '0';
    mountContainer.style.left = '0';
    mountContainer.style.width = '794px';
    mountContainer.style.minWidth = '794px';
    mountContainer.style.maxWidth = '794px';
    mountContainer.style.zIndex = '-9999';
    mountContainer.style.overflow = 'hidden';
    mountContainer.style.pointerEvents = 'none';
    mountContainer.style.opacity = '1';
    mountContainer.style.border = 'none';
    mountContainer.style.outline = 'none';
    mountContainer.style.boxShadow = 'none';
    mountContainer.appendChild(clone);
    document.body.appendChild(mountContainer);

    try {
      // 4. Ensure document fonts and images inside clone are fully loaded
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font wait errors
        }
      }

      const imgs = Array.from(clone.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
            setTimeout(res, 400);
          });
        })
      );

      let renderHeight = 1123;

      if (options?.isImagesPage) {
        // Image attachment pages are strictly 1123px tall (A4 portrait)
        renderHeight = 1123;
        clone.style.height = '1123px';
        clone.style.minHeight = '1123px';
        clone.style.maxHeight = '1123px';
        mountContainer.style.height = '1123px';
      } else {
        // Measure exact bounding box and total document height including all bottom elements (signature, paraf, date)
        const docBoundingRect = clone.getBoundingClientRect();
        let maxContentBottom = 0;

        const allDescendants = Array.from(clone.querySelectorAll('*'));
        for (const el of allDescendants) {
          const rect = el.getBoundingClientRect();
          const bottomRel = rect.bottom - docBoundingRect.top;
          if (bottomRel > maxContentBottom) {
            maxContentBottom = Math.ceil(bottomRel);
          }
        }

        const naturalHeight = Math.max(
          clone.scrollHeight,
          clone.offsetHeight,
          Math.ceil(docBoundingRect.height),
          maxContentBottom
        );

        if (naturalHeight <= 1123) {
          // Fits within standard A4 single page: exactly 1123px to avoid ANY distortion
          renderHeight = 1123;
        } else {
          // Exceptionally long content: expand by exact integer multiples of 1123 so every page slice is exact A4
          const totalDocPages = Math.ceil(naturalHeight / 1123);
          renderHeight = totalDocPages * 1123;
        }

        clone.style.height = `${renderHeight}px`;
        clone.style.minHeight = `${renderHeight}px`;
        clone.style.maxHeight = `${renderHeight}px`;
        mountContainer.style.height = `${renderHeight}px`;
      }

      const pixelRatio = 2;
      const canvasWidth = 794 * pixelRatio;
      const canvasHeight = renderHeight * pixelRatio;

      let imgData: string;
      // 5. Render to high-resolution JPEG
      try {
        imgData = await toJpeg(clone, {
          quality: 0.98,
          backgroundColor: '#ffffff',
          pixelRatio,
          width: 794,
          height: renderHeight,
          canvasWidth,
          canvasHeight,
          cacheBust: true,
          filter: (node) => {
            if (node instanceof HTMLElement && node.classList.contains('no-print')) {
              return false;
            }
            return true;
          }
        });
      } catch (primaryErr) {
        console.warn('toJpeg failed on clone, falling back to html2canvas:', primaryErr);

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
          const canvas = await html2canvas(clone, {
            scale: 2,
            width: 794,
            height: renderHeight,
            windowWidth: 1440,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            ignoreElements: (element) => element.classList.contains('no-print')
          });
          imgData = canvas.toDataURL('image/jpeg', 0.98);
        } finally {
          originalStylesText.forEach(({ el, text }) => {
            el.textContent = text;
          });
        }
      }

      return {
        imgData,
        width: 794,
        height: renderHeight
      };
    } finally {
      mountContainer.remove();
    }
  };

  // Generate PDF Blob Helper (Maintains strictly fixed A4 aspect ratio & desktop dimensions without squashing / gepeng on mobile)
  const generatePdfBlob = async (overrideData?: {
    htmlContent?: string;
    images?: UploadedImage[];
  }): Promise<Blob> => {
    const docPaperElement = document.getElementById('a4-document-paper');
    if (!docPaperElement) throw new Error('Elemen dokumen tidak ditemukan.');

    const liveEditor = document.getElementById('rich-text-editor-body');
    const activeImages = overrideData?.images !== undefined ? overrideData.images : images;
    const activeHtmlContent = overrideData?.htmlContent !== undefined 
      ? overrideData.htmlContent 
      : (liveEditor ? liveEditor.innerHTML : htmlContent);

    // Create A4 PDF Document (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Page 1: Main Document (Always 794px desktop coordinates mapped to 210mm x 297mm A4)
    const page1Render = await renderFixedA4PaperToImg(docPaperElement, {
      overrideHtmlContent: activeHtmlContent
    });
    if (!page1Render || !page1Render.imgData) throw new Error('Gagal merender halaman dokumen utama.');

    if (page1Render.height <= 1123) {
      // Standard 1-page BA Document: fits exactly on Page 1 (210mm x 297mm)
      // Preserves 100% exact 210/297 aspect ratio without any vertical stretching or squashing
      pdf.addImage(page1Render.imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    } else {
      // Multi-page document: slice across pages with strictly 1123px (2246px @ 2x) per page
      const totalPages = Math.ceil(page1Render.height / 1123);
      const srcImg = new Image();
      await new Promise<void>((resolve) => {
        srcImg.onload = () => resolve();
        srcImg.onerror = () => resolve();
        srcImg.src = page1Render.imgData;
      });

      for (let p = 0; p < totalPages; p++) {
        if (p > 0) pdf.addPage();
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = 1588; // 794 * 2
        sliceCanvas.height = 2246; // 1123 * 2
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          const sy = p * 1123 * 2;
          const sHeight = Math.min(2246, (page1Render.height * 2) - sy);
          ctx.drawImage(srcImg, 0, sy, 1588, sHeight, 0, 0, 1588, sHeight);
          const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.98);
          pdf.addImage(sliceImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
      }
    }

    // Attachment Pages (chunked into pages of max 2 rows per A4 page to prevent distortion / squashing)
    if (activeImages && activeImages.length > 0) {
      const imagePages = chunkImagesIntoPages(activeImages);
      for (let pIdx = 0; pIdx < imagePages.length; pIdx++) {
        const pageImgs = imagePages[pIdx];
        const pageEl = createFixedImagesPageElement(pageImgs, pIdx + 1, imagePages.length);
        const pageRender = await renderFixedA4PaperToImg(pageEl, {
          isImagesPage: true
        });
        if (pageRender && pageRender.imgData) {
          pdf.addPage();
          pdf.addImage(pageRender.imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
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
      const liveEditor = document.getElementById('rich-text-editor-body');
      if (liveEditor && liveEditor.innerHTML !== htmlContent) {
        setHtmlContent(liveEditor.innerHTML);
      }
      const blob = await generatePdfBlob({
        htmlContent: liveEditor ? liveEditor.innerHTML : htmlContent
      });
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
      const file = new File([blob], cleanFileName, {
        type: 'application/pdf',
        lastModified: Date.now()
      });
      let pdfBase64: string | undefined;
      try {
        pdfBase64 = await blobToBase64(blob);
      } catch {}

      if (editingBaId) {
        // Updating existing BA in the batch
        baBlobsRef.current.set(editingBaId, blob);
        baFilesRef.current.set(editingBaId, file);
        saveBaBlobToIdb(editingBaId, blob);
        setPdfReadyMap((prev) => ({ ...prev, [editingBaId]: true }));
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
        baFilesRef.current.set(newId, file);
        saveBaBlobToIdb(newId, blob);
        setPdfReadyMap((prev) => ({ ...prev, [newId]: true }));
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
    baFilesRef.current.delete(id);
    setPdfReadyMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
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
    // 5. Generate fresh PDF using fixed A4 desktop layout
    const blob = await generatePdfBlob({
      htmlContent: item.htmlContent,
      images: item.images || []
    });
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

    // 3. Clear cached blobs and files for shared items
    sharedIds.forEach((id) => {
      baBlobsRef.current.delete(id);
      baFilesRef.current.delete(id);
      deleteBaBlobFromIdb(id);
      if (typeof window !== 'undefined' && (window as any).__xxi_ba_blobs) {
        (window as any).__xxi_ba_blobs.delete(id);
      }
    });

    setPdfReadyMap((prev) => {
      const copy = { ...prev };
      sharedIds.forEach((id) => delete copy[id]);
      return copy;
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

  // Background PDF preparation for all batch items so File objects are ALWAYS ready in memory
  // before the user clicks "Share WhatsApp", preserving the synchronous mobile user gesture.
  useEffect(() => {
    if (batchBaList.length === 0) return;
    let isCancelled = false;

    const prepareBatchPdfs = async () => {
      for (const item of batchBaList) {
        if (isCancelled) break;

        if (baFilesRef.current.has(item.id)) {
          setPdfReadyMap((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }));
          continue;
        }

        // Set pending status for this item
        setPdfReadyMap((prev) => ({ ...prev, [item.id]: false }));

        try {
          const blob = await getOrGenerateBaBlob(item);
          if (blob && !isCancelled) {
            const fileName = item.pdfFileName || getCleanItemFileName(item.namaBarang);
            const file = new File([blob], fileName, {
              type: 'application/pdf',
              lastModified: Date.now()
            });
            baBlobsRef.current.set(item.id, blob);
            baFilesRef.current.set(item.id, file);
            setPdfReadyMap((prev) => ({ ...prev, [item.id]: true }));
          }
        } catch (err) {
          console.warn(`Failed preparing PDF for batch item ${item.id}:`, err);
        }
      }
    };

    prepareBatchPdfs();

    return () => {
      isCancelled = true;
    };
  }, [batchBaList]);

  // Prepare single BA PDF in background when editor has an item and batch is empty
  useEffect(() => {
    const currentName = namaBarangOrdered.trim();
    if (!currentName || batchBaList.length > 0) {
      if (baFilesRef.current.has('current-single-ba')) {
        baFilesRef.current.delete('current-single-ba');
        baBlobsRef.current.delete('current-single-ba');
      }
      setPdfReadyMap((prev) => {
        if (!prev['current-single-ba']) return prev;
        const copy = { ...prev };
        delete copy['current-single-ba'];
        return copy;
      });
      return;
    }

    let isCancelled = false;
    setPdfReadyMap((prev) => ({ ...prev, 'current-single-ba': false }));

    const timer = setTimeout(async () => {
      try {
        const blob = await generatePdfBlob();
        if (isCancelled) return;
        const fileName = getCleanItemFileName(currentName);
        const file = new File([blob], fileName, {
          type: 'application/pdf',
          lastModified: Date.now()
        });
        baBlobsRef.current.set('current-single-ba', blob);
        baFilesRef.current.set('current-single-ba', file);
        setPdfReadyMap((prev) => ({ ...prev, 'current-single-ba': true }));
      } catch (e) {
        console.warn('Failed background preparing current single BA PDF:', e);
      }
    }, 1000);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    namaBarangOrdered,
    itemQty,
    itemSatuan,
    htmlContent,
    images,
    kotaSign,
    tglSign,
    blnSign,
    thnSign,
    batchBaList.length
  ]);

  // Share WhatsApp Handler (Batch & Single with PDF file attachments & safe fallback)
  // CRITICAL MOBILE USER GESTURE FIX:
  // Pre-prepared PDF File objects are pulled synchronously from baFilesRef.current.
  // navigator.share() is called synchronously in the user gesture event handler without any async delays!
  const handleShareWhatsapp = () => {
    if (isExporting) return;

    if (typeof navigator === 'undefined') {
      if (onShowToast) {
        onShowToast('Browser tidak mendukung Web Share API.', 'error');
      }
      return;
    }

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

    // 1. Gather all PRE-PREPARED PDF File objects synchronously from memory
    const pdfFiles: File[] = [];
    for (const item of itemsToShare) {
      const file = baFilesRef.current.get(item.id);
      if (file) {
        pdfFiles.push(file);
      }
    }

    // If some files are still preparing, alert user and return without losing gesture
    if (pdfFiles.length !== itemsToShare.length) {
      if (onShowToast) {
        onShowToast('Dokumen PDF masih sedang disiapkan, silakan tunggu sebentar...', 'warning');
      }
      return;
    }

    // 2. Synchronously build Cinema Name & WhatsApp message text
    const branding = db.getBranding();
    let cinemaName = 'CINEMA XXI LIPPO MALL PURI';
    if (branding && (branding.title || branding.subtitle)) {
      const t = branding.title ? branding.title.trim() : 'CINEMA XXI';
      const s = branding.subtitle ? branding.subtitle.trim() : '';
      cinemaName = `${t} ${s}`.trim().toUpperCase();
    }
    const whatsappMessage = buildWhatsAppBatchMessage(itemsToShare, cinemaName);

    // MANDATORY VALIDATION:
    // Ensure whatsappMessage contains required sections
    const hasCatatanHeader = whatsappMessage.includes('Catatan:');
    const hasCatatanBody = whatsappMessage.includes(
      'Mohon Bapak/Ibu untuk melakukan follow up dan menaikkan permintaan barang ini ke proses FPKB.'
    );
    const hasApproval = whatsappMessage.includes('Mohon untuk dilakukan approval.');
    const hasClosing = whatsappMessage.includes('Terima kasih.');

    if (!hasCatatanHeader || !hasCatatanBody || !hasApproval || !hasClosing) {
      const errorMsg = 'Validasi Pesan WhatsApp Gagal: Teks Catatan / Approval belum lengkap.';
      console.error(errorMsg, { whatsappMessage });
      if (onShowToast) {
        onShowToast(errorMsg, 'error');
      }
      return;
    }

    // 3. Synchronous clipboard copy fallback via textarea (execCommand)
    // NOTE: Avoids asynchronous navigator.clipboard.writeText which would consume user gesture
    try {
      const ta = document.createElement('textarea');
      ta.value = whatsappMessage;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (clipErr) {
      console.warn('Sync textarea copy fallback failed:', clipErr);
    }

    // 4. Synchronously check file sharing capability using navigator.canShare({ files })
    let canShareFiles = false;
    try {
      canShareFiles =
        typeof navigator.canShare === 'function' &&
        Boolean(navigator.canShare({ files: pdfFiles }));
    } catch (checkErr) {
      console.warn('navigator.canShare check encountered an issue:', checkErr);
      canShareFiles = false;
    }

    if (!canShareFiles) {
      if (onShowToast) {
        onShowToast(
          `Browser / perangkat ini tidak mendukung pengiriman lampiran file melalui Web Share API. Buka aplikasi di smartphone (Chrome Android / Safari iOS) untuk membagikan ${pdfFiles.length} file PDF langsung ke WhatsApp.`,
          'warning'
        );
      }
      // CRITICAL: DO NOT clear batch!
      return;
    }

    // 5. DIRECT synchronous invocation of navigator.share() right inside the user click gesture!
    navigator
      .share({
        text: whatsappMessage,
        files: pdfFiles
      })
      .then(() => {
        // Reset only on successful share!
        handleResetAfterSuccessfulShare(itemsToShare.map((i) => i.id));
        if (onShowToast) {
          onShowToast(
            `Berhasil membagikan ${pdfFiles.length} file PDF Berita Acara ke WhatsApp! Antrean BA di-reset.`,
            'success'
          );
        }
      })
      .catch((shareErr: any) => {
        if (
          shareErr &&
          (shareErr.name === 'AbortError' ||
            shareErr.message?.includes('AbortError') ||
            shareErr.message?.includes('canceled') ||
            shareErr.message?.includes('cancelled'))
        ) {
          // User closed or canceled share sheet: DO NOT reset batch!
          if (onShowToast) {
            onShowToast('Pengiriman dibatalkan. Dokumen BA tetap tersimpan di antrean.', 'info');
          }
          return;
        }
        console.warn('Web Share API error:', shareErr);
        if (onShowToast) {
          onShowToast(`Gagal membagikan ke WhatsApp: ${shareErr?.message || 'Error'}`, 'error');
        }
      });
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

      {/* ========================================================================= */}
      {/* BATCH SHARE BA ORDERAN PANEL (COMPACT & COLLAPSIBLE UNTUK DESKTOP & MOBILE)*/}
      {/* ========================================================================= */}
      <div
        className="w-full max-w-[794px] mx-auto bg-[#0d1322]/95 backdrop-blur-md rounded-xl border border-cyan-500/30 p-2 sm:p-2.5 shadow-[0_4px_20px_rgba(0,240,255,0.06)] transition-all mb-3"
        id="batch-share-ba-orderan-panel"
      >
        {/* Compact Collapsible Header */}
        <div 
          onClick={() => setIsBatchPanelExpanded(!isBatchPanelExpanded)}
          className="flex items-center justify-between gap-2 cursor-pointer select-none py-0.5 px-1 rounded-lg hover:bg-cyan-950/30 transition-colors"
          title={isBatchPanelExpanded ? 'Klik untuk ciutkan panel' : 'Klik untuk buka panel Batch Share'}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-cyan-950/90 border border-cyan-500/50 rounded-lg text-cyan-300 shadow-sm shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3 className="text-xs sm:text-sm font-bold font-sans text-white tracking-wide uppercase truncate">
                BATCH SHARE BA ORDERAN
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.2 rounded-full border bg-cyan-950/80 text-cyan-300 border-cyan-500/40 font-bold shrink-0">
                {batchBaList.length} Tersimpan
              </span>
              {batchBaList.length > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.2 rounded-full border bg-emerald-950/80 text-emerald-300 border-emerald-500/40 font-bold shrink-0">
                  {selectedBaIds.length} Dipilih
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {batchBaList.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareWhatsapp();
                }}
                disabled={isExporting || (selectedBaIds.length > 0 && !areSelectedPdfsReady)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/60 rounded-lg font-mono text-[11px] font-bold cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                id="btn-batch-share-whatsapp-top"
                type="button"
                title="Kirim semua BA yang dipilih via WhatsApp"
              >
                {!areSelectedPdfsReady && selectedBaIds.length > 0 ? (
                  <>
                    <Loader2 className="w-3 h-3 text-emerald-200 animate-spin" />
                    <span>PDF ({readySelectedCount}/{selectedBaIds.length})</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3 text-emerald-200" />
                    <span>Share WA ({selectedBaIds.length})</span>
                  </>
                )}
              </button>
            )}

            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono text-slate-400">
              <span className="hidden md:inline text-[11px]">
                {isBatchPanelExpanded ? 'Tutup' : 'Buka'}
              </span>
              {isBatchPanelExpanded ? (
                <ChevronUp className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
        </div>

        {/* Expandable Content Area */}
        {isBatchPanelExpanded && (
          <div className="space-y-2.5 pt-2 mt-1.5 border-t border-slate-800/80">
            {/* Input Bar: Nama Barang, Qty, Satuan & Tombol Simpan */}
            <div className="bg-[#070d1e] border border-cyan-500/30 rounded-lg p-2 sm:p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px] font-mono">
                  <Package className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{editingBaId ? 'EDIT DOKUMEN DALAM ANTREAN:' : 'INPUT BA UNTUK ANTREAN BATCH:'}</span>
                </div>
                {editingBaId && (
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                    Sedang mengedit item
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-[10px] text-slate-300 font-sans mb-0.5 font-medium">
                    Nama Barang / Permintaan:
                  </label>
                  <input
                    type="text"
                    value={namaBarangOrdered}
                    onChange={(e) => setNamaBarangOrdered(e.target.value)}
                    placeholder="Contoh: Lampu Philips MR16"
                    className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-md px-2.5 py-1 text-white font-sans text-xs h-8 focus:outline-hidden transition-colors"
                    id="input-batch-nama-barang"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-300 font-sans mb-0.5 font-medium">
                    Jumlah (Qty):
                  </label>
                  <input
                    type="text"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    placeholder="10"
                    className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-md px-2 py-1 text-white font-sans text-xs h-8 focus:outline-hidden transition-colors"
                    id="input-batch-qty"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-300 font-sans mb-0.5 font-medium">
                    Satuan:
                  </label>
                  <input
                    type="text"
                    value={itemSatuan}
                    onChange={(e) => setItemSatuan(e.target.value)}
                    placeholder="pcs"
                    className="w-full bg-[#0b1329] border border-slate-700 focus:border-cyan-400 rounded-md px-2 py-1 text-white font-sans text-xs h-8 focus:outline-hidden transition-colors"
                    id="input-batch-satuan"
                  />
                </div>

                <div className="sm:col-span-2 flex gap-1.5">
                  {editingBaId ? (
                    <>
                      <button
                        onClick={handleSaveToBatch}
                        disabled={isExporting}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-md font-mono text-xs font-bold transition-all cursor-pointer h-8 active:scale-95 disabled:opacity-50"
                        id="btn-update-batch-item"
                        type="button"
                      >
                        <Save className="w-3 h-3" />
                        <span>Update</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-md font-mono text-xs font-bold transition-all cursor-pointer h-8 active:scale-95"
                        id="btn-cancel-batch-edit"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleSaveToBatch}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-md font-mono text-xs font-bold transition-all cursor-pointer h-8 shadow-sm active:scale-95 disabled:opacity-50"
                      id="btn-save-to-batch"
                      type="button"
                    >
                      <Plus className="w-3.5 h-3.5 text-cyan-200" />
                      <span>+ Simpan ({nextInternalNo})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Saved BAs with Checkboxes */}
            {batchBaList.length > 0 ? (
              <div className="space-y-1.5">
                {/* List Toolbar / Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleSelectAll}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-md cursor-pointer transition-all active:scale-95 font-bold text-[11px]"
                      type="button"
                      id="btn-toggle-select-all"
                    >
                      {selectedBaIds.length === batchBaList.length ? (
                        <>
                          <CheckSquare className="w-3 h-3 text-cyan-400" />
                          <span>Batalkan Semua</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3 h-3 text-slate-400" />
                          <span>Pilih Semua</span>
                        </>
                      )}
                    </button>
                    <span className="text-slate-400">
                      {selectedBaIds.length} dari {batchBaList.length} terpilih
                    </span>
                  </div>

                  {/* Share button in list */}
                  <button
                    onClick={handleShareWhatsapp}
                    disabled={isExporting || (selectedBaIds.length > 0 && !areSelectedPdfsReady)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/60 rounded-md font-mono text-[11px] font-bold cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    id="btn-batch-share-whatsapp-list"
                    type="button"
                  >
                    {!areSelectedPdfsReady && selectedBaIds.length > 0 ? (
                      <>
                        <Loader2 className="w-3 h-3 text-emerald-200 animate-spin" />
                        <span>Menyiapkan PDF ({readySelectedCount}/{selectedBaIds.length})...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3 h-3 text-emerald-200" />
                        <span>Share WhatsApp ({selectedBaIds.length} BA)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* List Items (Max-height scrollable) */}
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-toolbar-scrollbar">
                  {batchBaList.map((item) => {
                    const isSelected = selectedBaIds.includes(item.id);
                    const isCurrentlyEditing = editingBaId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-[#0a152e] border-cyan-500/60 shadow-[0_0_8px_rgba(0,240,255,0.1)]'
                            : 'bg-[#050a17] border-slate-800/80 opacity-70 hover:opacity-100'
                        } ${isCurrentlyEditing ? 'ring-2 ring-amber-400/80' : ''}`}
                      >
                        {/* Left: Checkbox + Internal No Badge + Item Details */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleSelectOne(item.id)}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-sm'
                                : 'bg-slate-900 border-slate-700 text-transparent hover:border-slate-500'
                            }`}
                            type="button"
                            id={`chk-${item.id}`}
                            aria-label={`Pilih ${item.internalNo}`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-black shrink-0 tracking-wider">
                            {item.internalNo}
                          </span>

                          <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-xs font-sans truncate max-w-[180px] sm:max-w-xs">
                              {item.namaBarang}
                            </span>
                            {item.qty && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {item.qty} {item.satuan || ''}
                              </span>
                            )}
                            {pdfReadyMap[item.id] ? (
                              <span className="px-1 py-0.2 text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded font-mono">
                                ✓ PDF Siap
                              </span>
                            ) : (
                              <span className="px-1 py-0.2 text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/40 rounded font-mono flex items-center gap-1">
                                <Loader2 className="w-2 h-2 animate-spin" />
                                PDF...
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions (Lihat/Edit & Hapus) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              handleLoadBaFromBatch(item);
                              handleOpenPreview();
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-md text-[11px] font-mono font-medium transition-all cursor-pointer active:scale-95"
                            type="button"
                            id={`btn-edit-${item.id}`}
                            title="Lihat / Edit Berita Acara ini di Dokumen"
                          >
                            <Eye className="w-3 h-3 text-cyan-400" />
                            <span className="hidden sm:inline">Lihat / Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteBaFromBatch(item.id)}
                            className="p-1 bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/50 rounded-md text-xs transition-all cursor-pointer active:scale-95"
                            type="button"
                            id={`btn-delete-${item.id}`}
                            title="Hapus dari antrean"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-[#050a17] border border-slate-800 text-center text-slate-400">
                <p className="text-xs font-sans">
                  Belum ada Berita Acara di antrean batch. Isi nama barang lalu klik <strong className="text-cyan-400">+ Simpan ({nextInternalNo})</strong>.
                </p>
              </div>
            )}
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
        onOpenPreview={handleOpenPreview}
        toolbarSlot={
          <DocumentToolbar
            variant="auto"
            onExecCommand={handleExecCommand}
            onSetFontSize={handleSetFontSize}
            onStepFontSize={handleStepFontSize}
            onAddImageClick={() => setIsImageModalOpen(true)}
            onInsertTableClick={handleInsertTable}
            onOpenPasteModal={() => setIsPasteModalOpen(true)}
            onCleanFormatting={handleCleanDocumentFormatting}
            onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            onApplySignaturePreset={handleApplySignaturePreset}
            onApplyDateAtasTtd={() => handleApplyDateAtasTtd()}
          />
        }
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

      {/* Action Button Panel (position directly below A4 document box: normal flow on mobile, sticky on desktop) */}
      <div
        className="relative md:sticky md:bottom-3 z-20 md:z-40 w-full max-w-[210mm] mx-auto bg-[#070b16]/95 border border-cyan-500/30 backdrop-blur-xl p-3 md:p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] rounded-2xl px-3 sm:px-4 md:px-6 mt-6 mb-4"
        id="berita-acara-bottom-actions"
      >
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Margin Fixed A4: Top 2.5cm • Bottom 2.5cm • Left 3cm • Right 3cm</span>
        </div>

        {/* Core Request Buttons: Grid 2 kolom di mobile, Flex wrap di desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2.5 w-full">
          {/* Simpan ke Antrean BA Button */}
          <button
            onClick={handleSaveToBatch}
            disabled={isExporting}
            className="col-span-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 disabled:opacity-50 min-h-[44px]"
            id="btn-bottom-save-batch"
            type="button"
          >
            <Plus className="w-4 h-4 text-cyan-200 shrink-0" />
            <span className="truncate">{editingBaId ? 'Update BA' : `+ Antrean (${nextInternalNo})`}</span>
          </button>

          {/* Preview Button */}
          <button
            onClick={handleOpenPreview}
            className="col-span-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer hover:border-cyan-400 active:scale-95 shadow-xs min-h-[44px]"
            id="btn-preview-dokumen"
            type="button"
          >
            <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Preview</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="col-span-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95 disabled:opacity-50 min-h-[44px]"
            id="btn-export-pdf"
            type="button"
          >
            <Download className="w-4 h-4 text-blue-200 shrink-0" />
            <span>{isExporting ? 'Memproses...' : 'Export PDF'}</span>
          </button>

          {/* Simpan Draft (Lokal) Button */}
          <button
            onClick={() => {
              handleSaveDraftLocal();
              handleExportPdf();
              if (onShowToast) onShowToast('Draft tersimpan di browser & file PDF diunduh.', 'success');
            }}
            className="col-span-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer active:scale-95 min-h-[44px]"
            id="btn-simpan-draft"
            type="button"
          >
            <Save className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Simpan Draft</span>
          </button>

          {/* Share WhatsApp Button: Full width col-span-2 di HP */}
          <button
            onClick={handleShareWhatsapp}
            disabled={isExporting || (selectedCount > 0 && !areSelectedPdfsReady)}
            className="col-span-2 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 min-h-[44px]"
            id="btn-share-whatsapp"
            type="button"
          >
            {!areSelectedPdfsReady && selectedCount > 0 ? (
              <>
                <Loader2 className="w-4 h-4 text-emerald-200 animate-spin" />
                <span className="text-center">Menyiapkan PDF ({readySelectedCount}/{selectedCount})...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-emerald-200 shrink-0" />
                <span className="text-center">Share WhatsApp + Siapkan Pesan {selectedBaIds.length > 0 ? `(${selectedBaIds.length} BA)` : ''}</span>
              </>
            )}
          </button>

          {/* Simpan Draft & Sync Google Drive Button: Full width col-span-2 di HP */}
          <button
            onClick={handleSaveDraftAndSyncDrive}
            disabled={isSyncingDrive}
            className="col-span-2 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400 rounded-xl font-mono text-xs font-extrabold transition-all cursor-pointer shadow-[0_0_18px_rgba(6,182,212,0.5)] active:scale-95 disabled:opacity-50 min-h-[44px]"
            id="btn-simpan-draft-gdrive"
            type="button"
          >
            <CloudUpload className="w-4 h-4 text-cyan-200 shrink-0" />
            <span>{isSyncingDrive ? 'Syncing Drive...' : 'Simpan & Sync Google Drive'}</span>
          </button>
        </div>
      </div>

      {/* Spacer untuk Bottom Navigation Mobile agar konten terakhir tidak tertutup */}
      <div 
        className="w-full shrink-0 h-16 md:h-4"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
        id="berita-acara-bottom-nav-spacer"
      />

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
        onClose={handleClosePreview}
        htmlContent={htmlContent}
        images={images}
        onExportPdf={handleExportPdf}
        onShareWhatsapp={handleShareWhatsapp}
        onSaveToBatch={handleSaveToBatch}
        onSaveDraftLocal={() => {
          handleSaveDraftLocal();
          handleExportPdf();
          if (onShowToast) onShowToast('Draft tersimpan di browser & file PDF diunduh.', 'success');
        }}
        onSaveDraftAndSyncDrive={handleSaveDraftAndSyncDrive}
        editingBaId={editingBaId}
        nextInternalNo={nextInternalNo}
        isExporting={isExporting}
        isSyncingDrive={isSyncingDrive}
        selectedBaCount={selectedBaIds.length}
        isSharePdfReady={areSelectedPdfsReady}
      />

      {/* Google Drive Setup Modal (100% Gratis Apps Script Method) */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl w-full max-w-2xl text-white shadow-[0_0_60px_rgba(251,191,36,0.25)] flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="bg-slate-950 border-b border-amber-500/30 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-amber-400 font-mono tracking-wider uppercase">
                  SINKRONISASI GOOGLE DRIVE (100% GRATIS)
                </h3>
              </div>
              <button
                onClick={() => setIsDriveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-xl text-xs text-emerald-100 font-sans space-y-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
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
                <div className="font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>Cara Pemasangan 1 Menit:</span>
                </div>

                <div className="space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-start gap-2">
                    <span className="bg-amber-500 text-slate-950 font-mono font-black px-2 py-0.5 rounded text-[11px] shrink-0">Langkah 1</span>
                    <span className="text-slate-300">
                      Buka <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-mono font-bold">script.google.com</a> dengan akun Google Drive Anda (misal: <code>engineering.xxilmp@gmail.com</code>) lalu klik <strong>"New project"</strong>.
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="bg-amber-500 text-slate-950 font-mono font-black px-2 py-0.5 rounded text-[11px] shrink-0">Langkah 2</span>
                    <div className="space-y-1.5 flex-1">
                      <span className="text-slate-300">Hapus semua isi kode bawaan, lalu salin (copy) kode di bawah ini:</span>
                      <div className="relative bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto">
                        <pre>{RECOMMENDED_APPS_SCRIPT_CODE}</pre>
                        <button
                          onClick={handleCopyCode}
                          className="absolute top-2 right-2 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                        >
                          {isCopiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopiedCode ? 'Tersalin!' : 'Copy Kode Script'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="bg-amber-500 text-slate-950 font-mono font-black px-2 py-0.5 rounded text-[11px] shrink-0">Langkah 3</span>
                    <span className="text-slate-300">
                      Klik tombol <strong>Deploy &gt; New deployment</strong> &gt; pilih type <strong>Web App</strong>. Set <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>. Klik <strong>Deploy</strong>, lalu salin <strong>Web App URL</strong>-nya ke kolom di bawah ini.
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Web App URL */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Tempel Google Apps Script Web App URL Di Sini:
                </label>
                <input
                  type="text"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(normalizeAppsScriptUrl(e.target.value))}
                  onBlur={(e) => setWebAppUrl(normalizeAppsScriptUrl(e.target.value))}
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                />
              </div>
            </div>

            <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setIsDriveModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold rounded-xl transition-all cursor-pointer border border-slate-700 active:scale-95"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  handleSaveWebAppUrl(webAppUrl);
                  setIsDriveModalOpen(false);
                  handleSaveDraftAndSyncDrive();
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono font-black text-xs rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all cursor-pointer active:scale-95"
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
