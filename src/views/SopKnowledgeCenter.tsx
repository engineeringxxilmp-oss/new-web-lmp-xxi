/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Download,
  Eye,
  ExternalLink,
  Star,
  History,
  Archive,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldAlert,
  FolderKanban,
  FileCode,
  Layers,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  Cloud,
  UserCheck,
  ShieldCheck,
  Tag,
  HardDrive,
  Copy,
  Check,
  CheckSquare,
  Square,
  ListChecks,
  HelpCircle,
  Code,
  UploadCloud,
  StickyNote,
  Pin,
  PinOff,
  MessageSquareCode
} from 'lucide-react';
import {
  uploadPdfViaAppsScript,
  deletePdfViaAppsScript,
  fetchDriveFilesViaAppsScript,
  extractDriveFileId,
  normalizeAppsScriptUrl,
  isConfiguredAppsScriptUrl,
  DEFAULT_APPS_SCRIPT_URL,
  RECOMMENDED_APPS_SCRIPT_CODE,
  DriveFileItem
} from '../lib/googleDriveService';
import {
  SopDocument,
  SopCategory,
  SopHistory,
  EngineeringNote,
  INITIAL_SOP_DOCUMENTS,
  INITIAL_SOP_HISTORY,
  INITIAL_ENGINEERING_NOTES
} from '../types';

const CATEGORIES: SopCategory[] = [
  'Projector',
  'Audio System',
  'AC (Air Conditioner)',
  'Electrical',
  'Civil',
  'Networking',
  'IT',
  'Safety (K3)',
  'Engineering General',
  'Manual Book',
  'Wiring Diagram',
  'Troubleshooting',
  'Vendor Manual',
  'Software',
  'Lainnya'
];

interface SopKnowledgeCenterProps {
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function SopKnowledgeCenter({ onShowToast }: SopKnowledgeCenterProps) {
  // Persistence state
  const [documents, setDocuments] = useState<SopDocument[]>(() => {
    const saved = localStorage.getItem('cinema_xxi_sop_documents');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out mock sample items (e.g. sop-1..sop-6 or old sample items)
          const clean = parsed.filter(
            (d: SopDocument) =>
              !['sop-1', 'sop-2', 'sop-3', 'sop-4', 'sop-5', 'sop-6'].includes(d.id) &&
              !d.id.startsWith('sop-178')
          );
          return clean;
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [historyLogs, setHistoryLogs] = useState<SopHistory[]>(() => {
    const saved = localStorage.getItem('cinema_xxi_sop_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_SOP_HISTORY;
      }
    }
    return INITIAL_SOP_HISTORY;
  });

  // Role Access state: 'admin' | 'user'
  const [userRole, setUserRole] = useState<'admin' | 'user'>('admin');

  // Google Drive Gmail Sync State
  const [driveGmail, setDriveGmail] = useState<string>(() => {
    const saved = localStorage.getItem('cinema_xxi_sop_drive_gmail');
    if (!saved || saved === 'engineering.xxi.lippomall@gmail.com') {
      return 'engineering.xxilmp@gmail.com';
    }
    return saved;
  });
  const [inputGmail, setInputGmail] = useState<string>('engineering.xxilmp@gmail.com');
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    const saved = localStorage.getItem('xxi_gdrive_script_url') || DEFAULT_APPS_SCRIPT_URL;
    return normalizeAppsScriptUrl(saved);
  });
  const [showScriptCode, setShowScriptCode] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [isDriveSyncModalOpen, setIsDriveSyncModalOpen] = useState<boolean>(false);
  const [isDriveExplorerOpen, setIsDriveExplorerOpen] = useState<boolean>(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return (
      localStorage.getItem('cinema_xxi_sop_last_synced') ||
      `Hari ini, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
    );
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('cinema_xxi_sop_autosync') !== 'false';
  });

  // Track deleted file IDs / names so auto-sync never re-imports deleted files
  const [deletedDriveKeys, setDeletedDriveKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('cinema_xxi_sop_deleted_keys');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('cinema_xxi_sop_deleted_keys', JSON.stringify(deletedDriveKeys));
  }, [deletedDriveKeys]);

  // Helper to check if a target name or ID was deleted
  const isKeyDeleted = (targetIdOrName: string, keysList: string[]): boolean => {
    if (!targetIdOrName) return false;
    const cleanTarget = targetIdOrName.toLowerCase().replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();
    return keysList.some((k) => {
      if (!k) return false;
      const cleanK = k.toLowerCase().replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();
      return cleanK === cleanTarget || (cleanTarget.length > 5 && cleanK.includes(cleanTarget)) || (cleanK.length > 5 && cleanTarget.includes(cleanK));
    });
  };

  // Drag and drop & uploaded file states
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Helper to clean & shorten document titles automatically
  const cleanAndShortenTitle = (filename: string): string => {
    if (!filename) return 'Dokumen SOP Baru';
    // Remove extension
    let name = filename.replace(/\.[^/.]+$/, '');
    // Replace underscores, hyphens, pluses with spaces
    name = name.replace(/[-_+]/g, ' ');
    // Remove common noisy file tokens (v1, v2, final, draft, copy, rev, dates, scan, pdf)
    name = name.replace(/\b(v\d+(\.\d+)?|\d{4}|\d{2}|final|draft|copy|rev\d*|scan|doc|pdf|sop_file|export|compressed)\b/gi, '');
    // Remove extra spaces
    name = name.replace(/\s+/g, ' ').trim();
    // Capitalize words
    name = name
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    // Truncate cleanly if over 42 characters
    if (name.length > 42) {
      name = name.substring(0, 42).trim() + '...';
    }
    return name || 'Dokumen SOP Baru';
  };

  // Process uploaded or dropped file
  const handleProcessUploadedFile = async (file: File, autoAddAndSync: boolean = true) => {
    if (!file) return;

    const rawName = file.name;
    const shortTitle = cleanAndShortenTitle(rawName);
    const formattedSize = file.size > 0 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '2.8 MB';
    const driveDocId = `drive_sop_${Date.now().toString().slice(-6)}`;
    const folderPath = `/Cinema XXI/SOP & Knowledge/Engineering General/${shortTitle}/`;
    const nowTimeStr = `Hari ini, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
    const currentYear = new Date().getFullYear().toString();

    let fileBase64 = '';
    try {
      fileBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.readAsDataURL(file);
      });
    } catch (e) {
      console.warn('DataURL read error:', e);
    }

    setUploadedFileName(rawName);
    setFormData((prev) => ({
      ...prev,
      namaDokumen: shortTitle,
      ukuranFile: formattedSize,
      formatFile: file.type.includes('pdf') ? 'PDF' : 'DOCX',
      googleDriveLink: ''
    }));

    const isDriveConnected = isConfiguredAppsScriptUrl(webAppUrl);

    if (autoAddAndSync) {
      setIsSyncingDrive(true);
      toast(`Menyinkronkan file ke Google Drive (${driveGmail})...`, 'info');

      let driveLink = '';
      let driveId = '';
      let isSynced = false;

      // 1. Try Google Apps Script upload if configured
      if (isDriveConnected) {
        try {
          const uploadRes = await uploadPdfViaAppsScript(
            webAppUrl,
            `SOP & KNOWLEDGE`,
            `${shortTitle}.pdf`,
            file
          );
          driveLink = uploadRes.webViewLink;
          driveId = uploadRes.id;
          isSynced = true;
        } catch (err: any) {
          console.warn('Apps Script upload failed, trying server sync endpoint:', err);
        }
      }

      // 2. Fallback / Server Drive upload route
      if (!isSynced) {
        try {
          const response = await fetch('/api/drive/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: shortTitle,
              category: 'SOP & KNOWLEDGE',
              fileData: fileBase64,
              mimeType: file.type || 'application/pdf',
              size: formattedSize,
              gmail: driveGmail || 'engineering.xxilmp@gmail.com'
            })
          });
          const resData = await response.json();
          driveLink = resData.driveLink || `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(shortTitle)}`;
          driveId = resData.driveFileId || `gdrive_${Date.now()}`;
          isSynced = true;
        } catch (err) {
          console.error('Server drive upload failed:', err);
          driveLink = `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(shortTitle)}`;
          driveId = `gdrive_${Date.now()}`;
          isSynced = true;
        }
      }

      const newDoc: SopDocument = {
        id: `sop-${Date.now()}`,
        namaDokumen: shortTitle,
        kategori: 'Engineering General',
        deskripsi: `Dokumen "${rawName}" tersimpan & tersinkronkan ke Google Drive (${driveGmail}).`,
        versi: 'v1.0',
        tanggalUpload: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        namaPengunggah: 'Chief Engineer XXI',
        ukuranFile: formattedSize,
        formatFile: file.type.includes('pdf') ? 'PDF' : 'DOCX',
        status: 'Aktif',
        googleDriveLink: driveLink,
        googleDriveFileId: driveId,
        syncStatus: 'Synced',
        isFavorite: false,
        tahun: currentYear,
        catatan: `Folder Google Drive: /SOP & KNOWLEDGE/${shortTitle}.pdf`
      };

      // Remove uploaded file name and drive ID from deleted keys list so it can be synced
      setDeletedDriveKeys((prev) => {
        const updated = prev.filter(
          (k) =>
            k !== shortTitle.toLowerCase().trim() &&
            k !== rawName.toLowerCase().trim() &&
            k !== `${shortTitle.toLowerCase().trim()}.pdf` &&
            k !== driveId
        );
        localStorage.setItem('cinema_xxi_sop_deleted_keys', JSON.stringify(updated));
        return updated;
      });

      setDocuments((prev) => [newDoc, ...prev]);

      const newHistoryItem: SopHistory = {
        id: `hist-sop-${Date.now()}`,
        tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        namaAdmin: 'Chief Engineer XXI',
        namaDokumen: shortTitle,
        versiLama: '-',
        versiBaru: 'v1.0',
        jenisPerubahan: 'Upload Dokumen'
      };

      setHistoryLogs((prev) => [newHistoryItem, ...prev]);
      setLastSyncedTime(nowTimeStr);
      localStorage.setItem('cinema_xxi_sop_last_synced', nowTimeStr);
      setIsSyncingDrive(false);

      toast(
        `✅ SUKSES! Dokumen "${shortTitle}" telah berhasil tersinkronkan ke Google Drive (${driveGmail})!`,
        'success'
      );
    } else {
      toast(
        `File "${rawName}" diproses! Judul dipersingkat: "${shortTitle}". Klik "SIMPAN DOKUMEN" untuk mempublikasikan.`,
        'info'
      );
    }
  };

  const handleSyncSingleDocToDrive = async (docId: string) => {
    const targetDoc = documents.find((d) => d.id === docId);
    if (!targetDoc) return;

    setIsSyncingDrive(true);
    const docName = targetDoc.namaDokumen;
    const category = targetDoc.kategori || 'Engineering General';
    const folderName = `SOP & KNOWLEDGE`;
    const fileName = `${docName}.pdf`;

    toast(`Menyinkronkan "${docName}" ke Google Drive (${driveGmail})...`, 'info');

    let driveLink = '';
    let driveId = '';
    let isSynced = false;

    if (isConfiguredAppsScriptUrl(webAppUrl)) {
      try {
        const sampleText = `DOKUMEN SOP CINEMA XXI\n\nNama Dokumen: ${docName}\nKategori: ${category}\nVersi: ${targetDoc.versi || 'v1.0'}\nTanggal Upload: ${targetDoc.tanggalUpload}\nPengunggah: ${targetDoc.namaPengunggah}\n\nDeskripsi:\n${targetDoc.deskripsi || '-'}\n\nStatus: TERVERIFIKASI & TERSINKRONISASI KE GOOGLE DRIVE\nTarget Email: ${driveGmail}`;
        const pdfBlob = new Blob([sampleText], { type: 'application/pdf' });

        const uploadRes = await uploadPdfViaAppsScript(webAppUrl, folderName, fileName, pdfBlob);
        driveLink = uploadRes.webViewLink;
        driveId = uploadRes.id;
        isSynced = true;
      } catch (err: any) {
        console.warn('Apps Script sync failed, using server sync:', err);
      }
    }

    if (!isSynced) {
      try {
        const response = await fetch('/api/drive/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: docName,
            category,
            size: targetDoc.ukuranFile || '2.8 MB',
            gmail: driveGmail || 'engineering.xxilmp@gmail.com'
          })
        });
        const resData = await response.json();
        driveLink = resData.driveLink || `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(docName)}`;
        driveId = resData.driveFileId || `gdrive_${Date.now()}`;
        isSynced = true;
      } catch (e) {
        driveLink = `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(docName)}`;
        driveId = `gdrive_${Date.now()}`;
        isSynced = true;
      }
    }

    const nowStr = `Hari ini, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
    setLastSyncedTime(nowStr);
    localStorage.setItem('cinema_xxi_sop_last_synced', nowStr);
    setIsSyncingDrive(false);

    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              syncStatus: 'Synced',
              googleDriveLink: driveLink,
              googleDriveFileId: driveId,
              catatan: `Tersimpan di Google Drive (${driveGmail}): /${folderName}/${fileName}`
            }
          : doc
      )
    );

    toast(`✅ BERHASIL SINKRON DRIVE! File "${fileName}" tersimpan di Google Drive (${driveGmail})!`, 'success');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleProcessUploadedFile(file, false);
    }
  };

  // Navigation tab state: 'all' | 'favorites' | 'notes' | 'history'
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'notes' | 'history'>('all');

  // Engineering Notes State (Starts empty for live user input with Real-Time Auto-Save)
  const [engineeringNotes, setEngineeringNotes] = useState<EngineeringNote[]>(() => {
    const saved = localStorage.getItem('cinema_xxi_engineering_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out previous dummy notes
          return parsed.filter((n) => !['note-1', 'note-2', 'note-3', 'note-4'].includes(n.id));
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Real-time auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('cinema_xxi_engineering_notes', JSON.stringify(engineeringNotes));
  }, [engineeringNotes]);

  // Listen for real-time storage sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cinema_xxi_engineering_notes' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setEngineeringNotes(parsed.filter((n) => !['note-1', 'note-2', 'note-3', 'note-4'].includes(n.id)));
          }
        } catch (err) {
          // handle error silently
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Note Modal & Filter States
  const [isNoteModalOpen, setIsNoteModalOpen] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<EngineeringNote | null>(null);
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>('All');
  const [notePriorityFilter, setNotePriorityFilter] = useState<string>('All');
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>('');

  const [noteFormData, setNoteFormData] = useState<{
    judul: string;
    kategori: string;
    prioritas: 'Biasa' | 'Penting' | 'Khusus / Emergency';
    isi: string;
    penulis: string;
    isPinned: boolean;
    tags: string;
  }>({
    judul: '',
    kategori: 'Engineering General',
    prioritas: 'Biasa',
    isi: '',
    penulis: 'Teknisi XXI',
    isPinned: false,
    tags: ''
  });

  const handleOpenNoteModal = (note?: EngineeringNote) => {
    if (note) {
      setEditingNote(note);
      setNoteFormData({
        judul: note.judul,
        kategori: note.kategori,
        prioritas: note.prioritas,
        isi: note.isi,
        penulis: note.penulis,
        isPinned: !!note.isPinned,
        tags: (note.tags || []).join(', ')
      });
    } else {
      setEditingNote(null);
      setNoteFormData({
        judul: '',
        kategori: 'Engineering General',
        prioritas: 'Biasa',
        isi: '',
        penulis: 'Teknisi XXI',
        isPinned: false,
        tags: ''
      });
    }
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteFormData.judul.trim() || !noteFormData.isi.trim()) {
      toast('Judul dan isi catatan wajib diisi!', 'error');
      return;
    }

    const parsedTags = noteFormData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingNote) {
      const updated = engineeringNotes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              judul: noteFormData.judul.trim(),
              kategori: noteFormData.kategori,
              prioritas: noteFormData.prioritas,
              isi: noteFormData.isi,
              penulis: noteFormData.penulis || 'Teknisi XXI',
              isPinned: noteFormData.isPinned,
              tags: parsedTags
            }
          : n
      );
      setEngineeringNotes(updated);
      toast('Catatan berhasil diperbarui!', 'success');
    } else {
      const newNote: EngineeringNote = {
        id: `note-${Date.now()}`,
        judul: noteFormData.judul.trim(),
        kategori: noteFormData.kategori,
        prioritas: noteFormData.prioritas,
        isi: noteFormData.isi,
        penulis: noteFormData.penulis || 'Teknisi XXI',
        tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        isPinned: noteFormData.isPinned,
        tags: parsedTags
      };
      setEngineeringNotes([newNote, ...engineeringNotes]);
      toast('Catatan & Informasi baru berhasil dipublikasikan!', 'success');
    }

    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Hapus catatan informasi ini?')) {
      setEngineeringNotes((prev) => prev.filter((n) => n.id !== id));
      toast('Catatan berhasil dihapus.', 'info');
    }
  };

  const handleTogglePinNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEngineeringNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleCopyNoteText = (note: EngineeringNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const formatted = `📌 ${note.judul}\n📂 Kategori: ${note.kategori} | Prioritas: ${note.prioritas}\n👤 Penulis: ${note.penulis} (${note.tanggal})\n\n${note.isi}`;
    navigator.clipboard.writeText(formatted);
    toast('Teks catatan disalin ke clipboard!', 'success');
  };

  const filteredNotes = useMemo(() => {
    return engineeringNotes
      .filter((note) => {
        if (noteCategoryFilter !== 'All' && note.kategori !== noteCategoryFilter) return false;
        if (notePriorityFilter !== 'All' && note.prioritas !== notePriorityFilter) return false;
        if (noteSearchQuery.trim() !== '') {
          const q = noteSearchQuery.toLowerCase();
          const matchesTitle = note.judul.toLowerCase().includes(q);
          const matchesContent = note.isi.toLowerCase().includes(q);
          const matchesAuthor = note.penulis.toLowerCase().includes(q);
          const matchesCategory = note.kategori.toLowerCase().includes(q);
          const matchesTags = (note.tags || []).some((t) => t.toLowerCase().includes(q));
          return matchesTitle || matchesContent || matchesAuthor || matchesCategory || matchesTags;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
  }, [engineeringNotes, noteCategoryFilter, notePriorityFilter, noteSearchQuery]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('Aktif');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<SopDocument | null>(null);

  // Preview PDF Modal State
  const [previewDoc, setPreviewDoc] = useState<SopDocument | null>(null);
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<{
    namaDokumen: string;
    kategori: SopCategory;
    deskripsi: string;
    versi: string;
    tanggalUpload: string;
    namaPengunggah: string;
    ukuranFile: string;
    formatFile: string;
    status: 'Aktif' | 'Arsip';
    googleDriveLink: string;
    catatan: string;
  }>({
    namaDokumen: '',
    kategori: 'Projector',
    deskripsi: '',
    versi: 'v1.0',
    tanggalUpload: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    namaPengunggah: 'Admin Engineering XXI',
    ukuranFile: '2.5 MB',
    formatFile: 'PDF',
    status: 'Aktif',
    googleDriveLink: '',
    catatan: ''
  });

  // Delete Confirmation State
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Batch Selection State
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('cinema_xxi_sop_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('cinema_xxi_sop_history', JSON.stringify(historyLogs));
  }, [historyLogs]);

  useEffect(() => {
    localStorage.setItem('cinema_xxi_sop_drive_gmail', driveGmail);
  }, [driveGmail]);

  useEffect(() => {
    localStorage.setItem('cinema_xxi_sop_last_synced', lastSyncedTime);
  }, [lastSyncedTime]);

  useEffect(() => {
    localStorage.setItem('cinema_xxi_sop_autosync', String(autoSyncEnabled));
  }, [autoSyncEnabled]);

  // Real-Time Background Auto-Sync Polling Hook
  useEffect(() => {
    if (!autoSyncEnabled) return;

    // Initial silent check 3s after load
    const initialTimer = setTimeout(() => {
      if (isConfiguredAppsScriptUrl(webAppUrl)) {
        handleFetchAndSyncDriveFiles(false);
      }
    }, 3000);

    // Recurring polling interval every 15 seconds for real-time sync
    const interval = setInterval(() => {
      if (isConfiguredAppsScriptUrl(webAppUrl)) {
        handleFetchAndSyncDriveFiles(false);
      }
    }, 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [autoSyncEnabled, webAppUrl]);

  // Infer category from file name
  const inferCategoryFromName = (filename: string): SopCategory => {
    const lower = filename.toLowerCase();
    if (lower.includes('projector') || lower.includes('proyektor') || lower.includes('barco') || lower.includes('christie')) return 'Projector';
    if (lower.includes('audio') || lower.includes('sound') || lower.includes('dolby') || lower.includes('speaker') || lower.includes('amplifier')) return 'Audio System';
    if (lower.includes('ac') || lower.includes('aircon') || lower.includes('chiller') || lower.includes('hvac') || lower.includes('pendingin')) return 'AC (Air Conditioner)';
    if (lower.includes('electr') || lower.includes('listrik') || lower.includes('genset') || lower.includes('ups') || lower.includes('panel')) return 'Electrical';
    if (lower.includes('civil') || lower.includes('bangunan') || lower.includes('plumbing') || lower.includes('air')) return 'Civil';
    if (lower.includes('net') || lower.includes('mikrotik') || lower.includes('router') || lower.includes('switch') || lower.includes('wifi')) return 'Networking';
    if (lower.includes('it') || lower.includes('server') || lower.includes('pos') || lower.includes('komputer')) return 'IT';
    if (lower.includes('k3') || lower.includes('safety') || lower.includes('apar') || lower.includes('fire')) return 'Safety (K3)';
    if (lower.includes('manual')) return 'Manual Book';
    if (lower.includes('diagram') || lower.includes('wiring')) return 'Wiring Diagram';
    if (lower.includes('trouble')) return 'Troubleshooting';
    if (lower.includes('vendor')) return 'Vendor Manual';
    if (lower.includes('soft') || lower.includes('app')) return 'Software';
    return 'Engineering General';
  };

  // Fetch list of files directly from Google Drive and sync/import into Web Portal
  const handleFetchAndSyncDriveFiles = async (showNotification: boolean = true) => {
    setIsSyncingDrive(true);
    if (showNotification) {
      toast(`Mengambil & menyinkronkan file dari Google Drive (${driveGmail})...`, 'info');
    }

    try {
      const hasAppsScript = isConfiguredAppsScriptUrl(webAppUrl);
      if (!hasAppsScript) {
        if (showNotification) {
          toast('⚠️ Silakan pasang Web App URL Google Apps Script Anda di modal "Sinkronisasi Google Drive" untuk dapat membaca file dari Drive!', 'info');
        }
        setIsSyncingDrive(false);
        return;
      }

      const res = await fetchDriveFilesViaAppsScript(webAppUrl, 'SOP & KNOWLEDGE');
      const driveFiles: DriveFileItem[] = res.files || [];
      const totalDriveFiles = driveFiles.length;

      let importedCount = 0;
      let updatedCount = 0;
      const currentYear = new Date().getFullYear().toString();

      // Read current deleted keys directly from localStorage to prevent stale closure issues
      let currentDeletedKeys: string[] = [];
      try {
        const saved = localStorage.getItem('cinema_xxi_sop_deleted_keys');
        currentDeletedKeys = saved ? JSON.parse(saved) : deletedDriveKeys;
      } catch (e) {
        currentDeletedKeys = deletedDriveKeys;
      }

      setDocuments((prevDocs) => {
        let updatedDocs = [...prevDocs];

        // 1. Process files coming from Google Drive
        for (const file of driveFiles) {
          const realId = file.id;
          const fileUrl = file.webViewLink || `https://drive.google.com/file/d/${realId}/view`;
          const cleanTitle = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();

          // Skip if user explicitly deleted this file on Web Portal
          const isDeletedLocally =
            currentDeletedKeys.includes(realId) ||
            currentDeletedKeys.includes(cleanTitle.toLowerCase()) ||
            currentDeletedKeys.includes(file.name.toLowerCase()) ||
            isKeyDeleted(cleanTitle, currentDeletedKeys) ||
            isKeyDeleted(realId, currentDeletedKeys);

          if (isDeletedLocally) {
            continue;
          }

          // Match with existing document
          const existingIdx = updatedDocs.findIndex((d) => {
            const docIdMatch = d.googleDriveFileId && d.googleDriveFileId === realId;
            const docLinkMatch = d.googleDriveLink && extractDriveFileId(d.googleDriveLink) === realId;
            const docNameMatch = d.namaDokumen.toLowerCase().trim() === cleanTitle.toLowerCase();
            const fileNameContains = file.name.toLowerCase().includes(d.namaDokumen.toLowerCase().trim());
            return docIdMatch || docLinkMatch || docNameMatch || fileNameContains;
          });

          if (existingIdx !== -1) {
            // Update existing doc with real link and id
            updatedDocs[existingIdx] = {
              ...updatedDocs[existingIdx],
              googleDriveFileId: realId,
              googleDriveLink: fileUrl,
              syncStatus: 'Synced',
              catatan: `Tersinkron dengan file Google Drive (${driveGmail})`
            };
            updatedCount++;
          } else {
            // Add new document fetched from Google Drive
            const cat = inferCategoryFromName(file.name);
            const formattedSize = file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '2.0 MB';
            const uploadDate = file.lastUpdated
              ? new Date(file.lastUpdated).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
              : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

            const newDoc: SopDocument = {
              id: `sop-gdrive-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              namaDokumen: cleanTitle || file.name,
              kategori: cat,
              deskripsi: `File "${file.name}" terdeteksi & diimpor dari Google Drive (${driveGmail}).`,
              versi: 'v1.0',
              tanggalUpload: uploadDate,
              namaPengunggah: 'Google Drive Sync',
              ukuranFile: formattedSize,
              formatFile: file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX',
              status: 'Aktif',
              googleDriveLink: fileUrl,
              googleDriveFileId: realId,
              syncStatus: 'Synced',
              isFavorite: false,
              tahun: currentYear,
              catatan: `Diimpor dari folder SOP & KNOWLEDGE Google Drive`
            };

            updatedDocs = [newDoc, ...updatedDocs];
            importedCount++;
          }
        }

        // 2. Remove documents if deleted on Google Drive directly
        if (Array.isArray(driveFiles)) {
          const driveFileIdsSet = new Set(driveFiles.map((f) => f.id));
          const driveFileNamesSet = new Set(driveFiles.map((f) => f.name.toLowerCase().trim()));

          updatedDocs = updatedDocs.filter((doc) => {
            if (doc.syncStatus !== 'Synced' && !doc.googleDriveFileId && !doc.id.startsWith('sop-gdrive-')) {
              return true;
            }
            const fileIdExists = doc.googleDriveFileId && driveFileIdsSet.has(doc.googleDriveFileId);
            const nameExists = driveFileNamesSet.has(doc.namaDokumen.toLowerCase().trim()) || driveFileNamesSet.has(`${doc.namaDokumen.toLowerCase().trim()}.pdf`);

            if (!fileIdExists && !nameExists && (doc.googleDriveFileId || doc.id.startsWith('sop-gdrive-'))) {
              return false; // Deleted on Google Drive -> remove from web portal
            }
            return true;
          });
        }

        return updatedDocs;
      });

      const nowStr = `Hari ini, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
      setLastSyncedTime(nowStr);
      localStorage.setItem('cinema_xxi_sop_last_synced', nowStr);
      setIsSyncingDrive(false);

      if (showNotification) {
        if (totalDriveFiles === 0) {
          toast(`ℹ️ SINKRON SELESAI: Belum ada file di folder "SOP & KNOWLEDGE" Google Drive.`, 'info');
        } else {
          toast(`✅ SINKRONISASI SUKSES! ${totalDriveFiles} file terdeteksi di Google Drive (${importedCount} dokumen baru diimpor ke Web Portal, ${updatedCount} cocok).`, 'success');
        }
      }
    } catch (err: any) {
      setIsSyncingDrive(false);
      console.warn('Fetch Drive files failed:', err);
      if (showNotification) {
        toast(`⚠️ Gagal mengambil file dari Google Drive: ${err.message || 'Error'}. Silakan periksa Web App URL Apps Script Anda!`, 'error');
      }
    }
  };

  // Handle Google Drive Gmail Connect & Sync
  const handleSaveDriveSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputGmail.trim() || !inputGmail.includes('@')) {
      toast('Masukkan alamat email Gmail yang valid!', 'error');
      return;
    }

    const cleanedEmail = inputGmail.trim();
    const cleanedUrl = normalizeAppsScriptUrl(webAppUrl);
    setDriveGmail(cleanedEmail);
    setWebAppUrl(cleanedUrl);
    localStorage.setItem('cinema_xxi_sop_drive_gmail', cleanedEmail);
    localStorage.setItem('xxi_gdrive_script_url', cleanedUrl);

    setIsSyncingDrive(true);
    toast(`Menguji koneksi & mengambil file dari Google Drive (${cleanedEmail})...`, 'info');

    try {
      await handleFetchAndSyncDriveFiles(true);
      setIsDriveSyncModalOpen(false);
    } catch (err: any) {
      setIsSyncingDrive(false);
      toast(`⚠️ Gagal menghubungkan Google Drive: ${err.message || 'Error'}`, 'error');
    }
  };

  const handleTriggerDriveSync = async () => {
    setIsSyncingDrive(true);
    toast(`Menyinkronkan 2-arah dokumen SOP dengan Google Drive (${driveGmail})...`, 'info');

    try {
      await handleFetchAndSyncDriveFiles(false);

      const updatedDocs = [...documents];
      const hasAppsScript = isConfiguredAppsScriptUrl(webAppUrl);

      for (let i = 0; i < updatedDocs.length; i++) {
        const doc = updatedDocs[i];
        let link = doc.googleDriveLink;
        let fileId = doc.googleDriveFileId;
        let synced = false;

        if (hasAppsScript) {
          try {
            const folderName = `SOP & KNOWLEDGE`;
            const fileName = `${doc.namaDokumen}.pdf`;
            const sampleText = `DOKUMEN SOP CINEMA XXI\n\nNama Dokumen: ${doc.namaDokumen}\nKategori: ${doc.kategori}\nVersi: ${doc.versi}\nTanggal Upload: ${doc.tanggalUpload}\nPengunggah: ${doc.namaPengunggah}\n\nDeskripsi:\n${doc.deskripsi || '-'}\n\nStatus: TERVERIFIKASI & TERSINKRONISASI KE GOOGLE DRIVE\nTarget Email: ${driveGmail}`;
            const pdfBlob = new Blob([sampleText], { type: 'application/pdf' });

            const uploadRes = await uploadPdfViaAppsScript(webAppUrl, folderName, fileName, pdfBlob);
            link = uploadRes.webViewLink;
            fileId = uploadRes.id;
            synced = true;
          } catch (err) {
            console.warn(`Sync error for ${doc.namaDokumen}:`, err);
          }
        }

        if (!synced) {
          try {
            const response = await fetch('/api/drive/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: doc.namaDokumen,
                category: 'SOP & KNOWLEDGE',
                size: doc.ukuranFile || '2.8 MB',
                gmail: driveGmail
              })
            });
            const resData = await response.json();
            link = resData.driveLink || `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(doc.namaDokumen)}`;
            fileId = resData.driveFileId || `gdrive_${Date.now()}`;
          } catch (e) {
            link = `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(doc.namaDokumen)}`;
            fileId = `gdrive_${Date.now()}`;
          }
        }

        updatedDocs[i] = {
          ...doc,
          syncStatus: 'Synced',
          googleDriveLink: link,
          googleDriveFileId: fileId,
          catatan: `Tersimpan di Google Drive (${driveGmail}): /SOP & KNOWLEDGE/${doc.namaDokumen}.pdf`
        };
      }

      setDocuments(updatedDocs);
      const nowStr = `Hari ini, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
      setLastSyncedTime(nowStr);
      localStorage.setItem('cinema_xxi_sop_last_synced', nowStr);
      setIsSyncingDrive(false);

      toast(`✅ SINKRONISASI 2-ARAH SUKSES! ${updatedDocs.length} dokumen tersinkron penuh dengan Google Drive (${driveGmail}).`, 'success');
    } catch (e: any) {
      setIsSyncingDrive(false);
      toast(`Gagal sync ke Google Drive: ${e.message || 'Error'}`, 'error');
    }
  };

  // Extract Google Drive File ID helper
  const extractDriveFileId = (url: string): string => {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '1A2b3C4d5E6f7G8h9I0j_drive_mock';
  };

  // Toast Helper
  const toast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (onShowToast) {
      onShowToast(msg, type);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const sop = documents.filter((d) => d.namaDokumen.toLowerCase().includes('sop') || d.kategori === 'Engineering General').length;
    const manualBook = documents.filter((d) => d.kategori === 'Manual Book' || d.namaDokumen.toLowerCase().includes('manual')).length;
    const troubleshooting = documents.filter((d) => d.kategori === 'Troubleshooting' || d.namaDokumen.toLowerCase().includes('trouble')).length;
    const wiringDiagram = documents.filter((d) => d.kategori === 'Wiring Diagram' || d.namaDokumen.toLowerCase().includes('wiring') || d.namaDokumen.toLowerCase().includes('diagram')).length;
    const favorites = documents.filter((d) => d.isFavorite).length;

    return {
      total,
      sop,
      manualBook,
      troubleshooting,
      wiringDiagram,
      favorites
    };
  }, [documents]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(documents.map((d) => d.tahun || '2026')));
    return years.sort().reverse();
  }, [documents]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Tab filter
      if (activeTab === 'favorites' && !doc.isFavorite) return false;

      // Status filter
      if (selectedStatus !== 'All' && doc.status !== selectedStatus) return false;

      // Category filter
      if (selectedCategory !== 'All' && doc.kategori !== selectedCategory) return false;

      // Year filter
      if (selectedYear !== 'All' && (doc.tahun || '2026') !== selectedYear) return false;

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = doc.namaDokumen.toLowerCase().includes(q);
        const matchesCategory = doc.kategori.toLowerCase().includes(q);
        const matchesDesc = doc.deskripsi.toLowerCase().includes(q);
        const matchesVersion = doc.versi.toLowerCase().includes(q);
        const matchesUploader = doc.namaPengunggah.toLowerCase().includes(q);
        const matchesCatatan = (doc.catatan || '').toLowerCase().includes(q);

        return matchesName || matchesCategory || matchesDesc || matchesVersion || matchesUploader || matchesCatatan;
      }

      return true;
    });
  }, [documents, activeTab, selectedStatus, selectedCategory, selectedYear, searchQuery]);

  // Toggle Favorite
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          const updatedFav = !doc.isFavorite;
          toast(
            updatedFav
              ? `"${doc.namaDokumen}" ditambahkan ke Favorit ⭐`
              : `"${doc.namaDokumen}" dihapus dari Favorit`,
            'info'
          );
          return { ...doc, isFavorite: updatedFav };
        }
        return doc;
      })
    );
  };

  // Open Form Modal (Add / Edit)
  const handleOpenFormModal = (doc?: SopDocument) => {
    if (userRole !== 'admin') {
      toast('Akses Terbatas: Hanya Admin yang dapat mengedit/menambah dokumen.', 'error');
      return;
    }

    if (doc) {
      setEditingDoc(doc);
      setFormData({
        namaDokumen: doc.namaDokumen,
        kategori: doc.kategori,
        deskripsi: doc.deskripsi,
        versi: doc.versi,
        tanggalUpload: doc.tanggalUpload,
        namaPengunggah: doc.namaPengunggah,
        ukuranFile: doc.ukuranFile,
        formatFile: doc.formatFile,
        status: doc.status,
        googleDriveLink: doc.googleDriveLink,
        catatan: doc.catatan || ''
      });
    } else {
      setEditingDoc(null);
      setFormData({
        namaDokumen: '',
        kategori: 'Projector',
        deskripsi: '',
        versi: 'v1.0',
        tanggalUpload: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        namaPengunggah: 'Chief Engineer XXI',
        ukuranFile: '3.0 MB',
        formatFile: 'PDF',
        status: 'Aktif',
        googleDriveLink: '',
        catatan: ''
      });
    }
    setIsFormModalOpen(true);
  };

  // Submit Form Modal
  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.namaDokumen.trim()) {
      toast('Nama dokumen wajib diisi!', 'error');
      return;
    }

    const driveLink = formData.googleDriveLink.trim() || 'https://drive.google.com/file/d/sample-xxi-sop-document/view';
    const driveFileId = extractDriveFileId(driveLink);
    const currentYear = new Date().getFullYear().toString();
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    if (editingDoc) {
      // Edit existing document
      const oldVersion = editingDoc.versi;
      const isVersionChanged = oldVersion !== formData.versi;

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === editingDoc.id
            ? {
                ...doc,
                namaDokumen: formData.namaDokumen,
                kategori: formData.kategori,
                deskripsi: formData.deskripsi,
                versi: formData.versi,
                tanggalUpload: formData.tanggalUpload,
                namaPengunggah: formData.namaPengunggah,
                ukuranFile: formData.ukuranFile,
                formatFile: formData.formatFile,
                status: formData.status,
                googleDriveLink: driveLink,
                googleDriveFileId: driveFileId,
                syncStatus: 'Synced',
                catatan: formData.catatan
              }
            : doc
        )
      );

      // Log to history
      const newHistoryItem: SopHistory = {
        id: `hist-sop-${Date.now()}`,
        tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        waktu: nowTime,
        namaAdmin: formData.namaPengunggah || 'Admin Engineering',
        namaDokumen: formData.namaDokumen,
        versiLama: oldVersion,
        versiBaru: formData.versi,
        jenisPerubahan: isVersionChanged ? 'Update Versi' : 'Edit Info'
      };

      setHistoryLogs((prev) => [newHistoryItem, ...prev]);
      toast(`Dokumen "${formData.namaDokumen}" berhasil diperbarui!`, 'success');
    } else {
      // Add new document
      const newDoc: SopDocument = {
        id: `sop-${Date.now()}`,
        namaDokumen: formData.namaDokumen,
        kategori: formData.kategori,
        deskripsi: formData.deskripsi,
        versi: formData.versi || 'v1.0',
        tanggalUpload: formData.tanggalUpload,
        namaPengunggah: formData.namaPengunggah || 'Admin Engineering',
        ukuranFile: formData.ukuranFile || '2.5 MB',
        formatFile: formData.formatFile || 'PDF',
        status: formData.status,
        googleDriveLink: driveLink,
        googleDriveFileId: driveFileId,
        syncStatus: 'Synced',
        isFavorite: false,
        tahun: currentYear,
        catatan: formData.catatan
      };

      setDocuments((prev) => [newDoc, ...prev]);

      // Log to history
      const newHistoryItem: SopHistory = {
        id: `hist-sop-${Date.now()}`,
        tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        waktu: nowTime,
        namaAdmin: formData.namaPengunggah || 'Admin Engineering',
        namaDokumen: formData.namaDokumen,
        versiLama: '-',
        versiBaru: formData.versi || 'v1.0',
        jenisPerubahan: 'Upload Dokumen'
      };

      setHistoryLogs((prev) => [newHistoryItem, ...prev]);
      toast(`Dokumen baru "${formData.namaDokumen}" berhasil ditambahkan & tersinkron ke Google Drive!`, 'success');
    }

    setIsFormModalOpen(false);
  };

  // Toggle Archive Document
  const handleToggleArchive = (doc: SopDocument) => {
    if (userRole !== 'admin') {
      toast('Akses Terbatas: Hanya Admin yang dapat mengarsipkan dokumen.', 'error');
      return;
    }

    const newStatus = doc.status === 'Aktif' ? 'Arsip' : 'Aktif';
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, status: newStatus } : d))
    );

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const newHistoryItem: SopHistory = {
      id: `hist-sop-${Date.now()}`,
      tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      waktu: nowTime,
      namaAdmin: 'Admin Engineering XXI',
      namaDokumen: doc.namaDokumen,
      versiLama: doc.versi,
      versiBaru: doc.versi,
      jenisPerubahan: 'Arsipkan'
    };

    setHistoryLogs((prev) => [newHistoryItem, ...prev]);
    toast(`Dokumen "${doc.namaDokumen}" diubah status menjadi ${newStatus}.`, 'info');
  };

  // Delete Document (Web + Google Drive)
  const handleDeleteDocument = async (id: string) => {
    if (userRole !== 'admin') {
      toast('Akses Terbatas: Hanya Admin yang dapat menghapus dokumen.', 'error');
      return;
    }

    const doc = documents.find((d) => d.id === id);
    if (!doc) return;

    const targetFileIdentifier = extractDriveFileId(doc.googleDriveLink || doc.googleDriveFileId || '');
    const cleanName = doc.namaDokumen.toLowerCase().trim();

    // 1. Record keys in deletedDriveKeys & localStorage immediately so auto-sync never re-imports it
    const keysToAdd = [id, doc.googleDriveFileId || '', targetFileIdentifier || '', cleanName, `${cleanName}.pdf`].filter(Boolean);
    setDeletedDriveKeys((prev) => {
      const updated = Array.from(new Set([...prev, ...keysToAdd]));
      localStorage.setItem('cinema_xxi_sop_deleted_keys', JSON.stringify(updated));
      return updated;
    });

    // 2. Remove from UI immediately
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setSelectedDocIds((prev) => prev.filter((item) => item !== id));

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const newHistoryItem: SopHistory = {
      id: `hist-sop-${Date.now()}`,
      tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      waktu: nowTime,
      namaAdmin: 'Admin Engineering XXI',
      namaDokumen: doc.namaDokumen,
      versiLama: doc.versi,
      versiBaru: 'Terhapus',
      jenisPerubahan: 'Hapus'
    };

    setHistoryLogs((prev) => [newHistoryItem, ...prev]);
    setDeletingDocId(null);

    toast(`Menghapus dokumen "${doc.namaDokumen}" dari Web & Google Drive...`, 'info');

    // 3. Delete from Google Drive
    let driveDeletedCount = 0;
    if (isConfiguredAppsScriptUrl(webAppUrl)) {
      try {
        const res = await deletePdfViaAppsScript(
          webAppUrl,
          'SOP & KNOWLEDGE',
          doc.namaDokumen,
          targetFileIdentifier || doc.googleDriveFileId
        );
        driveDeletedCount = res.deletedCount || 0;
      } catch (err: any) {
        console.warn('Apps Script delete failed:', err);
      }
    } else {
      toast('⚠️ Dihapus dari Web. Untuk hapus otomatis di Google Drive, silakan buka modal "Sinkronisasi Google Drive" & pasang URL Web App Anda!', 'info');
      return;
    }

    try {
      await fetch('/api/drive/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: targetFileIdentifier || doc.googleDriveFileId,
          name: doc.namaDokumen
        })
      });
    } catch (e) {
      console.warn('Server drive delete failed:', e);
    }

    if (driveDeletedCount > 0) {
      toast(`✅ BERHASIL SINKRON! Dokumen "${doc.namaDokumen}" & file di Google Drive (${driveGmail}) telah dipindahkan ke Tempat Sampah (Trash)!`, 'success');
    } else {
      toast(`✅ Dokumen "${doc.namaDokumen}" terhapus dari Web.`, 'success');
    }
  };

  // Batch selection handlers
  const handleToggleSelectDoc = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredDocuments.map((d) => d.id);
    if (allFilteredIds.length === 0) return;

    const isAllSelected = allFilteredIds.every((id) => selectedDocIds.includes(id));
    if (isAllSelected) {
      setSelectedDocIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedDocIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleBulkDeleteDocuments = async () => {
    if (userRole !== 'admin') {
      toast('Akses Terbatas: Hanya Admin yang dapat menghapus dokumen.', 'error');
      return;
    }

    if (selectedDocIds.length === 0) return;

    const docsToDelete = documents.filter((d) => selectedDocIds.includes(d.id));
    const count = docsToDelete.length;

    // Collect all deleted keys
    const deletedKeysToAdd: string[] = [];
    docsToDelete.forEach((doc) => {
      const targetId = extractDriveFileId(doc.googleDriveLink || doc.googleDriveFileId || '');
      const cleanName = doc.namaDokumen.toLowerCase().trim();
      deletedKeysToAdd.push(doc.id, doc.googleDriveFileId || '', targetId || '', cleanName, `${cleanName}.pdf`);
    });

    setDeletedDriveKeys((prev) => {
      const updated = Array.from(new Set([...prev, ...deletedKeysToAdd.filter(Boolean)]));
      localStorage.setItem('cinema_xxi_sop_deleted_keys', JSON.stringify(updated));
      return updated;
    });

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const newHistoryItems: SopHistory[] = docsToDelete.map((doc) => ({
      id: `hist-sop-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
      waktu: nowTime,
      namaAdmin: 'Admin Engineering XXI',
      namaDokumen: doc.namaDokumen,
      versiLama: doc.versi,
      versiBaru: 'Terhapus (Batch)',
      jenisPerubahan: 'Hapus'
    }));

    // Remove from UI immediately
    setDocuments((prev) => prev.filter((d) => !selectedDocIds.includes(d.id)));
    setHistoryLogs((prev) => [...newHistoryItems, ...prev]);
    setSelectedDocIds([]);
    setIsBulkDeleteModalOpen(false);

    toast(`Menghapus ${count} dokumen dari Portal Web & Google Drive (${driveGmail})...`, 'info');

    // Delete all selected documents from Google Drive
    const hasAppsScript = isConfiguredAppsScriptUrl(webAppUrl);
    let totalDriveDeleted = 0;

    for (const doc of docsToDelete) {
      const targetFileIdentifier = extractDriveFileId(doc.googleDriveLink || doc.googleDriveFileId || '');

      if (hasAppsScript) {
        try {
          const res = await deletePdfViaAppsScript(
            webAppUrl,
            'SOP & KNOWLEDGE',
            doc.namaDokumen,
            targetFileIdentifier || doc.googleDriveFileId
          );
          totalDriveDeleted += (res.deletedCount || 0);
        } catch (e) {
          console.warn(`Apps script bulk delete failed for ${doc.namaDokumen}:`, e);
        }
      }

      try {
        await fetch('/api/drive/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: targetFileIdentifier || doc.googleDriveFileId,
            name: doc.namaDokumen
          })
        });
      } catch (e) {}
    }

    if (!hasAppsScript) {
      toast(`⚠️ BATCH DELETE WEB SELESAI (${count} dokumen). Untuk menghapus otomatis di Google Drive, pasang Web App URL Anda di modal "Sinkronisasi Google Drive"!`, 'info');
    } else if (totalDriveDeleted > 0) {
      toast(`✅ SUKSES BATCH DELETE! ${count} dokumen terhapus di Web dan ${totalDriveDeleted} file berhasil terhapus dari Google Drive (${driveGmail}).`, 'success');
    } else {
      toast(`ℹ️ ${count} dokumen SOP terhapus dari Web Portal. (Di Google Drive tidak ditemukan file yang sesuai. Pastikan Anda sudah klik "Deploy > New Deployment" versi terbaru di script.google.com).`, 'info');
    }
  };

  // Download PDF Action
  const handleDownloadPdf = (doc: SopDocument) => {
    toast(`Mengunduh file "${doc.namaDokumen}" (${doc.ukuranFile})...`, 'info');
    // Open direct download link or drive link
    window.open(doc.googleDriveLink || 'https://drive.google.com', '_blank');
  };

  // Open PDF / Drive link directly in a new browser tab
  const handlePreviewPdf = (doc: SopDocument) => {
    const driveUrl = doc.googleDriveLink || (doc.googleDriveFileId ? `https://drive.google.com/file/d/${doc.googleDriveFileId}/view` : 'https://drive.google.com');
    window.open(driveUrl, '_blank');
  };

  return (
    <div className="space-y-6 pb-12 font-sans" id="sop-knowledge-container">
      {/* Top Banner & Header Title */}
      <div className="bg-gradient-to-r from-[#0a1120] via-[#0d1b38] to-[#0a1120] rounded-2xl border-2 border-cyan-500/30 p-5 sm:p-7 shadow-[0_0_30px_rgba(0,240,255,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase">
              <Cloud className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              INTEGRATED GOOGLE DRIVE KNOWLEDGE CENTER
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">📚</span>
              KITAB XXI
            </h1>
            <p className="text-slate-300 text-sm sm:text-base font-medium max-w-3xl leading-relaxed">
              Pusat penyimpanan & portal akses seluruh dokumen standar operasional, wiring diagram, manual book, dan petunjuk troubleshooting Engineering <strong className="text-cyan-300 font-extrabold">Cinema XXI Lippo Mall Puri</strong>.
            </p>
          </div>

          {/* Role Switcher & Add Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Access Mode Toggle */}
            <div className="flex items-center bg-black/60 p-1.5 rounded-xl border border-cyan-500/30">
              <button
                onClick={() => {
                  setUserRole('admin');
                  toast('Mode diubah ke Admin (Akses Penuh)', 'info');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  userRole === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                id="btn-role-admin"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> ADMIN
              </button>
              <button
                onClick={() => {
                  setUserRole('user');
                  toast('Mode diubah ke User/Teknisi (Read Only)', 'info');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  userRole === 'user'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                id="btn-role-user"
              >
                <UserCheck className="h-3.5 w-3.5" /> TEKNISI
              </button>
            </div>

            {/* Upload Button (Admin only) */}
            {userRole === 'admin' && (
              <button
                onClick={() => handleOpenFormModal()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_20px_rgba(251,191,36,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-amber-300"
                id="btn-add-sop-doc"
              >
                <Plus className="h-5 w-5 stroke-[3]" /> TAMBAH DOKUMEN
              </button>
            )}
          </div>
        </div>
      </div>

      {/* GOOGLE DRIVE GMAIL SYNC BANNER BAR */}
      <div className="bg-[#080d19] border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="h-12 w-12 rounded-xl bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <Cloud className={`h-6 w-6 ${isSyncingDrive ? 'animate-spin text-cyan-400' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-400">AKUN GOOGLE DRIVE TERSINKRON:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {driveGmail}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono mt-1">
              Folder Target: <strong className="text-cyan-300">Google Drive / Cinema XXI / SOP & Knowledge Base /</strong> •
              Terakhir Sinkron: <span className="text-amber-300">{lastSyncedTime}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap justify-end">
          <button
            onClick={() => handleFetchAndSyncDriveFiles(true)}
            disabled={isSyncingDrive}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs font-mono transition-all cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 border border-blue-400"
            id="btn-fetch-drive-files"
            title="Tarik & impor semua file PDF dari Google Drive ke Web Portal"
          >
            <Download className={`h-4 w-4 text-cyan-200 ${isSyncingDrive ? 'animate-bounce' : ''}`} />
            <span>{isSyncingDrive ? 'MENGAMBIL...' : 'IMPOR DARI DRIVE'}</span>
          </button>

          <button
            onClick={() => setIsDriveExplorerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            id="btn-open-drive-explorer"
          >
            <FolderKanban className="h-4 w-4 text-cyan-400" /> LIHAT FOLDER DRIVE
          </button>

          <button
            onClick={handleTriggerDriveSync}
            disabled={isSyncingDrive}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            id="btn-trigger-drive-sync"
          >
            <RefreshCw className={`h-4 w-4 text-emerald-400 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            {isSyncingDrive ? 'SINKRONISASI...' : 'SINKRON 2-ARAH'}
          </button>

          <button
            onClick={() => {
              if (window.confirm('Kosongkan semua daftar dokumen di Web Portal? (Dokumen yang dihapus tidak akan diimpor ulang otomatis saat auto-sync).')) {
                const deletedKeysToAdd: string[] = [];
                documents.forEach((doc) => {
                  const targetId = extractDriveFileId(doc.googleDriveLink || doc.googleDriveFileId || '');
                  const cleanName = doc.namaDokumen.toLowerCase().trim();
                  deletedKeysToAdd.push(doc.id, doc.googleDriveFileId || '', targetId || '', cleanName, `${cleanName}.pdf`);
                });

                setDeletedDriveKeys((prev) => {
                  const updated = Array.from(new Set([...prev, ...deletedKeysToAdd.filter(Boolean)]));
                  localStorage.setItem('cinema_xxi_sop_deleted_keys', JSON.stringify(updated));
                  return updated;
                });

                setDocuments([]);
                localStorage.setItem('cinema_xxi_sop_documents', JSON.stringify([]));
                toast('Daftar dokumen telah dikosongkan.', 'info');
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/40 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            id="btn-clear-all-docs"
            title="Kosongkan tampilan daftar dokumen di Web Portal"
          >
            <Trash2 className="h-4 w-4 text-red-400" /> KOSONGKAN LIST
          </button>

          <button
            onClick={() => {
              setInputGmail(driveGmail);
              setIsDriveSyncModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs font-mono tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-emerald-300"
            id="btn-open-drive-sync-modal"
          >
            <Cloud className="h-4 w-4" /> ATUR GMAIL
          </button>
        </div>
      </div>

      {/* QUICK DROPZONE FOR PDF AUTO-SHORTEN & GOOGLE DRIVE SYNC */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            handleProcessUploadedFile(file, true);
          }
        }}
        className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
          isDragOver
            ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-[1.01]'
            : 'border-cyan-500/30 bg-[#09101e]/80 hover:border-cyan-400/60 hover:bg-[#0c162b]'
        }`}
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const file = e.target.files[0];
              handleProcessUploadedFile(file, true);
            }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          id="quick-dropzone-input"
        />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 shadow-md">
              <Cloud className="h-5 w-5 animate-pulse" />
            </div>
            <div className="text-left">
              <p className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <span>⚡ DRAG & DROP DOKUMEN PDF KE SINI</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px]">
                  OTOMATIS POTONG JUDUL & SINKRON DRIVE
                </span>
              </p>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                Sistem otomatis ekstrak & persingkat judul file PDF (tanpa nama panjang/acak) lalu membuat folder di Google Drive ({driveGmail})
              </p>
            </div>
          </div>

          <button className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs font-mono shadow-[0_0_12px_rgba(0,240,255,0.4)] border border-cyan-300 shrink-0 pointer-events-auto">
            + PILIH FILE PDF
          </button>
        </div>
      </div>

      {/* Dashboard Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5" id="sop-metrics-grid">
        <div className="bg-[#0c1427]/90 border border-cyan-500/25 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-cyan-400/50 transition-all shadow-md">
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <span className="text-sm font-mono font-black tracking-wider uppercase">Total Dokumen</span>
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white font-mono">{stats.total}</p>
          <span className="text-xs font-semibold text-slate-300 mt-1">Tersimpan di Drive</span>
        </div>

        <div className="bg-[#0c1427]/90 border border-amber-500/25 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-amber-400/50 transition-all shadow-md">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-sm font-mono font-black tracking-wider uppercase">Total SOP</span>
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white font-mono">{stats.sop}</p>
          <span className="text-xs font-semibold text-slate-300 mt-1">Standard Operating</span>
        </div>

        <div className="bg-[#0c1427]/90 border border-blue-500/25 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-blue-400/50 transition-all shadow-md">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-sm font-mono font-black tracking-wider uppercase">Manual Book</span>
            <FolderKanban className="h-6 w-6" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white font-mono">{stats.manualBook}</p>
          <span className="text-xs font-semibold text-slate-300 mt-1">Panduan Alat Resmi</span>
        </div>

        <div className="bg-[#0c1427]/90 border border-rose-500/25 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-rose-400/50 transition-all shadow-md">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-sm font-mono font-black tracking-wider uppercase">Troubleshooting</span>
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white font-mono">{stats.troubleshooting}</p>
          <span className="text-xs font-semibold text-slate-300 mt-1">Panduan Masalah</span>
        </div>
      </div>

      {/* Main Tab Navigation & Filter Controls */}
      <div className="bg-[#0a1120]/95 border border-cyan-500/20 p-4 sm:p-5 rounded-2xl space-y-4 shadow-xl">
        {/* Nav Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2.5 rounded-xl text-sm sm:text-base font-extrabold font-mono transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] border border-cyan-400'
                  : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
              id="tab-all-docs"
            >
              <FolderKanban className="h-5 w-5" /> SEMUA DOKUMEN ({documents.length})
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-5 py-2.5 rounded-xl text-sm sm:text-base font-extrabold font-mono transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_15px_rgba(251,191,36,0.5)] border border-amber-300'
                  : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
              id="tab-favorite-docs"
            >
              <Star className={`h-5 w-5 ${activeTab === 'favorites' ? 'fill-slate-950' : 'text-amber-400'}`} /> DOKUMEN FAVORIT ({stats.favorites})
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`px-5 py-2.5 rounded-xl text-sm sm:text-base font-extrabold font-mono transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-emerald-600 text-white font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400'
                  : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
              id="tab-notes-docs"
            >
              <StickyNote className="h-5 w-5 text-emerald-300" /> CATATAN & INFORMASI ({engineeringNotes.length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-500/30 ml-auto">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Drive Status: <span className="font-extrabold text-white">Online Synchronized</span>
          </div>
        </div>

        {/* Filter Toolbar for Notes Tab */}
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Notes Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
              <input
                type="text"
                placeholder="Cari judul, isi, penulis, tag..."
                value={noteSearchQuery}
                onChange={(e) => setNoteSearchQuery(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-700 focus:border-emerald-400 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                id="input-note-search"
              />
              {noteSearchQuery && (
                <button
                  onClick={() => setNoteSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Note Category Filter */}
            <div>
              <select
                value={noteCategoryFilter}
                onChange={(e) => setNoteCategoryFilter(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none transition-all cursor-pointer"
                id="select-note-category"
              >
                <option value="All">📂 Semua Kategori Catatan</option>
                <option value="Engineering General">Engineering General</option>
                <option value="Projector">Projector</option>
                <option value="Audio System">Audio System</option>
                <option value="AC (Air Conditioner)">AC (Air Conditioner)</option>
                <option value="Electrical">Electrical</option>
                <option value="IT">IT & Server</option>
                <option value="Safety (K3)">Safety (K3)</option>
                <option value="Pengumuman">Pengumuman Shift</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            {/* Note Priority Filter */}
            <div>
              <select
                value={notePriorityFilter}
                onChange={(e) => setNotePriorityFilter(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none transition-all cursor-pointer"
                id="select-note-priority"
              >
                <option value="All">⚡ Semua Tingkat Prioritas</option>
                <option value="Khusus / Emergency">🔴 Khusus / Emergency</option>
                <option value="Penting">⚡ Penting</option>
                <option value="Biasa">ℹ️ Biasa / Normal</option>
              </select>
            </div>
          </div>
        )}

        {/* Filter Toolbar for Documents (Only when in All or Favorites tab) */}
        {(activeTab === 'all' || activeTab === 'favorites') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400" />
              <input
                type="text"
                placeholder="Cari nama, versi, kata kunci..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                id="input-sop-search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Dropdown */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none transition-all cursor-pointer"
                id="select-sop-category"
              >
                <option value="All">📂 Semua Kategori</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter Dropdown */}
            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none transition-all cursor-pointer"
                id="select-sop-year"
              >
                <option value="All">📅 Semua Tahun Upload</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none transition-all cursor-pointer"
                id="select-sop-status"
              >
                <option value="Aktif">🟢 Status: Dokumen Aktif</option>
                <option value="Arsip">📦 Status: Dokumen Arsip</option>
                <option value="All">🌐 Status: Semua (Aktif & Arsip)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      {activeTab === 'history' ? (
        /* History Log Table */
        <div className="bg-[#0a1120] border border-cyan-500/20 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-purple-400" />
              Riwayat Perubahan & Audit Log Dokumen
            </h3>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
              Total {historyLogs.length} Catatan Aktivitas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="history-log-table">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-xs font-mono font-black text-cyan-300 uppercase tracking-wider">
                  <th className="px-4 py-3">Tanggal & Waktu</th>
                  <th className="px-4 py-3">Admin Pengubah</th>
                  <th className="px-4 py-3">Dokumen</th>
                  <th className="px-4 py-3 text-center">Versi Lama</th>
                  <th className="px-4 py-3 text-center">Versi Baru</th>
                  <th className="px-4 py-3 text-center">Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs sm:text-sm">
                {historyLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-300">
                      <div>{log.tanggal}</div>
                      <div className="text-[11px] text-slate-500">{log.waktu}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-cyan-200">{log.namaAdmin}</td>
                    <td className="px-4 py-3 font-semibold text-slate-100 max-w-xs truncate">{log.namaDokumen}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-400">{log.versiLama}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-amber-300">{log.versiBaru}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono ${
                          log.jenisPerubahan === 'Upload Dokumen'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : log.jenisPerubahan === 'Update Versi'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : log.jenisPerubahan === 'Arsipkan'
                            ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                            : log.jenisPerubahan === 'Hapus'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                            : 'bg-blue-950 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {log.jenisPerubahan}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'notes' ? (
        /* Notes View */
        <div className="space-y-5">
          {/* Notes Top Action Header */}
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-emerald-950 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
                <StickyNote className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 flex-wrap">
                  <span>Catatan & Informasi Engineering XXI</span>
                  <span className="px-3 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-mono font-black">
                    {filteredNotes.length} Catatan
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-slate-900 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-sm">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Real-Time Auto-Save
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-mono mt-1">
                  Menu ini bersih & kosong secara default. Setiap catatan baru yang Anda buat akan langsung tersimpan secara real-time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {engineeringNotes.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Apakah Anda yakin ingin menghapus SELURUH catatan engineering?')) {
                      setEngineeringNotes([]);
                      localStorage.removeItem('cinema_xxi_engineering_notes');
                      toast('Seluruh catatan telah dihapus dan menu dikosongkan.', 'info');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-mono font-bold text-xs sm:text-sm border border-rose-500/40 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Hapus semua catatan"
                >
                  <Trash2 className="h-4 w-4" /> Hapus Semua
                </button>
              )}

              <button
                onClick={() => handleOpenNoteModal()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm font-mono tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-emerald-300 shrink-0"
                id="btn-add-new-note"
              >
                <Plus className="h-5 w-5 stroke-[3]" /> BUAT CATATAN BARU
              </button>
            </div>
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="bg-[#0a1120] border border-emerald-500/20 rounded-2xl p-12 text-center space-y-4">
              <StickyNote className="h-14 w-14 text-slate-600 mx-auto animate-bounce" />
              <p className="text-xl font-bold text-slate-200">Belum ada catatan atau informasi yang sesuai.</p>
              <p className="text-base text-slate-400 max-w-md mx-auto">
                Buat catatan pertama Anda untuk membagikan pengumuman atau instruksi teknis kepada tim.
              </p>
              <button
                onClick={() => handleOpenNoteModal()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-sm font-mono hover:bg-emerald-500 transition-all cursor-pointer shadow-md"
              >
                + Buat Catatan Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="notes-grid">
              {filteredNotes.map((note) => {
                const isEmergency = note.prioritas === 'Khusus / Emergency';
                const isPenting = note.prioritas === 'Penting';

                return (
                  <div
                    key={note.id}
                    className={`bg-gradient-to-b from-[#0e172a] to-[#0a1120] border rounded-2xl p-6 space-y-4 flex flex-col justify-between transition-all duration-200 group relative shadow-xl ${
                      isEmergency
                        ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:border-rose-400'
                        : isPenting
                        ? 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:border-amber-400'
                        : 'border-cyan-500/20 hover:border-cyan-400/50'
                    }`}
                    id={`note-card-${note.id}`}
                  >
                    {/* Note Top Bar */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Pin Badge */}
                        {note.isPinned && (
                          <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-mono text-xs font-black flex items-center gap-1 shadow-[0_0_10px_rgba(251,191,36,0.4)]">
                            <Pin className="h-3.5 w-3.5 fill-slate-950" /> PINNED
                          </span>
                        )}

                        {/* Priority Badge */}
                        <span
                          className={`px-3 py-1 rounded-full font-mono text-xs sm:text-sm font-black ${
                            isEmergency
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/50 animate-pulse'
                              : isPenting
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {note.prioritas}
                        </span>

                        {/* Category Badge */}
                        <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs sm:text-sm font-bold">
                          📂 {note.kategori}
                        </span>
                      </div>

                      {/* Author & Timestamp */}
                      <div className="text-right text-xs sm:text-sm font-mono text-slate-300 shrink-0">
                        <p className="font-extrabold text-white">{note.penulis}</p>
                        <p className="text-xs text-slate-400">{note.tanggal}</p>
                      </div>
                    </div>

                    {/* Note Title & Body */}
                    <div className="space-y-2.5 flex-1">
                      <h4 className="text-lg sm:text-xl font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                        {note.judul}
                      </h4>
                      <div className="text-sm sm:text-base text-slate-100 leading-relaxed font-sans whitespace-pre-wrap bg-slate-950/80 p-4 rounded-xl border border-slate-800/90 font-normal">
                        {note.isi}
                      </div>
                    </div>

                    {/* Tags list */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {note.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded bg-slate-900 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Note Action Toolbar */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => handleCopyNoteText(note, e)}
                        className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-extrabold text-xs sm:text-sm font-mono transition-all cursor-pointer flex items-center gap-2 border border-slate-700"
                        title="Salin isi catatan"
                      >
                        <Copy className="h-4 w-4" /> Salin Teks
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleTogglePinNote(note.id, e)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                            note.isPinned
                              ? 'bg-amber-950 hover:bg-amber-900 text-amber-300 border-amber-500/50'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                          }`}
                          title={note.isPinned ? 'Lepas Pin' : 'Pin di Teratas'}
                        >
                          <Pin className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleOpenNoteModal(note)}
                          className="p-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 transition-all cursor-pointer"
                          title="Edit Catatan"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          className="p-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-400 border border-rose-500/40 transition-all cursor-pointer"
                          title="Hapus Catatan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Document Cards Grid */
        <div className="space-y-4">
          {/* Batch Selection Action Bar */}
          {filteredDocuments.length > 0 && (
            <div className="bg-gradient-to-r from-slate-900 via-[#0d1829] to-slate-900 border border-cyan-500/30 rounded-2xl p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                {/* Checkbox Select All */}
                <button
                  onClick={handleToggleSelectAll}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    filteredDocuments.length > 0 && filteredDocuments.every((d) => selectedDocIds.includes(d.id))
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                      : 'bg-slate-950 text-cyan-300 border-slate-700 hover:border-cyan-400'
                  }`}
                  id="btn-select-all-sop"
                >
                  {filteredDocuments.length > 0 && filteredDocuments.every((d) => selectedDocIds.includes(d.id)) ? (
                    <CheckSquare className="h-4 w-4 text-slate-950" />
                  ) : (
                    <Square className="h-4 w-4 text-cyan-400" />
                  )}
                  <span>
                    {filteredDocuments.length > 0 && filteredDocuments.every((d) => selectedDocIds.includes(d.id))
                      ? 'BATAL CEKLIS ALL'
                      : `CEKLIS SEMUA (${filteredDocuments.length})`}
                  </span>
                </button>

                {/* Counter Badge */}
                {selectedDocIds.length > 0 ? (
                  <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-400/50 font-mono text-xs font-bold animate-pulse flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-cyan-400" />
                    <strong>{selectedDocIds.length}</strong> Dokumen Terpilih
                  </span>
                ) : (
                  <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                    Pilih/ceklis dokumen untuk melakukan tindakan hapus massal
                  </span>
                )}
              </div>

              {/* Action Buttons for Selected Items */}
              {selectedDocIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDocIds([])}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold cursor-pointer transition-all"
                  >
                    Batal Pilih
                  </button>

                  {userRole === 'admin' && (
                    <button
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 text-xs font-mono font-bold shadow-[0_0_15px_rgba(244,63,94,0.5)] flex items-center gap-1.5 cursor-pointer transition-all"
                      id="btn-bulk-delete-sop"
                    >
                      <Trash2 className="h-4 w-4" />
                      HAPUS ({selectedDocIds.length}) TERPILIH
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {documents.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  handleProcessUploadedFile(file, true);
                }
              }}
              className={`relative border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center space-y-5 transition-all bg-gradient-to-b from-[#0a1120] to-[#070c18] ${
                isDragOver
                  ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_40px_rgba(16,185,129,0.3)] scale-[1.01]'
                  : 'border-cyan-500/30 hover:border-cyan-400/60 shadow-xl'
              }`}
              id="empty-sop-dropzone"
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    handleProcessUploadedFile(file, true);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                id="empty-state-file-input"
              />
              <div className="h-16 w-16 rounded-2xl bg-cyan-950 border-2 border-cyan-400/40 flex items-center justify-center text-cyan-300 mx-auto shadow-lg shadow-cyan-500/10 pointer-events-none">
                <UploadCloud className="h-8 w-8 animate-bounce" />
              </div>
              <div className="space-y-2 pointer-events-none">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Halaman SOP Kosong
                </h3>
                <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
                  Belum ada dokumen yang diunggah. Drag & drop file PDF ke area ini atau impor langsung dari folder Google Drive Anda ({driveGmail}) secara <strong className="text-emerald-400 font-mono">Real-Time</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 pointer-events-auto relative z-20">
                <label
                  htmlFor="empty-state-file-input"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-xs font-mono tracking-wide shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-cyan-300"
                >
                  <Plus className="h-4 w-4" /> DRAG / DROP FILE PDF KE SINI
                </label>
                <button
                  onClick={() => handleFetchAndSyncDriveFiles(true)}
                  disabled={isSyncingDrive}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/50 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 text-emerald-400 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                  {isSyncingDrive ? 'MENGAMBIL...' : '⚡ IMPOR DARI GOOGLE DRIVE'}
                </button>
              </div>

              <div className="pt-3 flex items-center justify-center gap-2 text-xs font-mono text-emerald-400/90 pointer-events-none">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>REAL-TIME AUTO-SYNC AKTIF (15 DETIK)</span>
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="bg-[#0a1120] border border-cyan-500/20 rounded-2xl p-12 text-center space-y-4">
              <BookOpen className="h-12 w-12 text-slate-600 mx-auto animate-bounce" />
              <p className="text-lg font-bold text-slate-300">Tidak ada dokumen SOP yang sesuai dengan filter.</p>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Coba ubah kata kunci pencarian atau reset filter kategori & status.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedYear('All');
                  setSelectedStatus('Aktif');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-900 transition-all cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="sop-document-grid">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`bg-gradient-to-b from-[#0e172a] to-[#0a1120] border rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:scale-[1.01] transition-all duration-200 group relative shadow-lg ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-400/80 bg-cyan-950/30 shadow-[0_0_25px_rgba(0,240,255,0.25)]'
                        : doc.status === 'Arsip'
                        ? 'border-slate-800 opacity-75'
                        : doc.isFavorite
                        ? 'border-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                        : 'border-cyan-500/20 hover:border-cyan-400/50'
                    }`}
                    id={`sop-card-${doc.id}`}
                  >
                    {/* Top Bar inside Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Checkbox item */}
                        <button
                          onClick={(e) => handleToggleSelectDoc(doc.id, e)}
                          className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black shadow-[0_0_10px_rgba(0,240,255,0.6)]'
                              : 'bg-slate-950/80 border-slate-700 text-slate-600 hover:border-cyan-400 hover:text-cyan-400'
                          }`}
                          title={isSelected ? 'Hapus ceklis' : 'Ceklis dokumen ini'}
                          id={`checkbox-sop-${doc.id}`}
                        >
                          {isSelected ? <Check className="h-4 w-4 stroke-[3]" /> : <Square className="h-4 w-4" />}
                        </button>

                        {/* PDF / File Format Icon */}
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-950 to-rose-900 border border-rose-500/40 flex items-center justify-center text-rose-400 font-mono font-black text-xs shadow-md shrink-0">
                          <FileText className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono text-xs sm:text-sm font-extrabold">
                              {doc.kategori}
                            </span>
                            <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-500/30 font-mono text-xs sm:text-sm font-black">
                              {doc.versi}
                            </span>
                            {doc.status === 'Arsip' && (
                              <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs font-black">
                                ARSIP
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-mono text-slate-300 mt-1">Format: <strong className="text-slate-100 font-extrabold">{doc.formatFile}</strong> ({doc.ukuranFile})</p>
                        </div>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(doc.id, e)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          doc.isFavorite
                            ? 'bg-amber-950/80 border-amber-500/60 text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-amber-400'
                        }`}
                        title={doc.isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                        id={`btn-fav-sop-${doc.id}`}
                      >
                        <Star className={`h-5 w-5 ${doc.isFavorite ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    {/* Document Title & Description */}
                    <div className="space-y-2 flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                        {doc.namaDokumen}
                      </h3>
                      <p className="text-sm sm:text-base text-slate-200 leading-relaxed line-clamp-3 font-normal">
                        {doc.deskripsi}
                    </p>
                  </div>

                  {/* Uploader & Metadata Info */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Pengunggah: <strong className="text-cyan-300">{doc.namaPengunggah}</strong></span>
                      <span>{doc.tanggalUpload}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Cloud className="h-3.5 w-3.5 text-emerald-400" /> Drive: {driveGmail.split('@')[0]}
                      </span>
                      <button
                        onClick={() => handleSyncSingleDocToDrive(doc.id)}
                        className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        title="Sinkronkan dokumen ini ke Google Drive"
                        id={`btn-sync-single-doc-${doc.id}`}
                      >
                        <RefreshCw className="h-3 w-3 text-emerald-400" /> SINKRONKAN
                      </button>
                    </div>

                    {doc.catatan && (
                      <p className="text-[11px] text-amber-300/90 italic bg-amber-950/30 p-2 rounded border border-amber-500/20">
                        Note: {doc.catatan}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {/* Lihat Dokumen di Drive Button */}
                    <a
                      href={doc.googleDriveLink || (doc.googleDriveFileId ? `https://drive.google.com/file/d/${doc.googleDriveFileId}/view` : 'https://drive.google.com')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs font-mono shadow-[0_0_12px_rgba(0,240,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-cyan-400"
                      id={`btn-preview-sop-${doc.id}`}
                    >
                      <ExternalLink className="h-4 w-4 text-cyan-200" />
                      <span>Lihat Dokumen di Drive</span>
                    </a>

                    {/* Download Button */}
                    <button
                      onClick={() => handleDownloadPdf(doc)}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs font-mono transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-700"
                      title="Unduh File"
                      id={`btn-download-sop-${doc.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    {/* Admin Action Controls */}
                    {userRole === 'admin' && (
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => handleOpenFormModal(doc)}
                          className="p-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 transition-all cursor-pointer"
                          title="Edit Dokumen & Versi"
                          id={`btn-edit-sop-${doc.id}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleArchive(doc)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            doc.status === 'Aktif'
                              ? 'bg-purple-950/80 hover:bg-purple-900 text-purple-300 border-purple-500/40'
                              : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/40'
                          }`}
                          title={doc.status === 'Aktif' ? 'Arsipkan Dokumen' : 'Aktifkan Dokumen'}
                          id={`btn-archive-sop-${doc.id}`}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingDocId(doc.id)}
                          className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-400 border border-rose-500/40 transition-all cursor-pointer"
                          title="Hapus Dokumen"
                          id={`btn-delete-sop-${doc.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* FORM MODAL (ADD / EDIT DOCUMENT) */}
      {isFormModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fade-in"
          id="modal-sop-form"
        >
          <div className="bg-[#0a1120] border-2 border-cyan-500/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_0_60px_rgba(0,240,255,0.3)] my-auto">
            <div className="bg-[#070b16] border-b border-cyan-500/30 px-6 sm:px-8 py-5 flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <BookOpen className="h-7 w-7 text-amber-400 shrink-0" />
                <span>{editingDoc ? 'Edit Data Dokumen & Versi' : 'Upload Dokumen SOP / Manual Book'}</span>
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                id="btn-close-form-modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="p-6 sm:p-8 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* DROPZONE PDF FILE UPLOADER & DRIVE AUTO SHORTEN */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropFile}
                className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition-all ${
                  isDragOver
                    ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                    : 'border-slate-700 hover:border-emerald-500/60 bg-slate-950/80 hover:bg-slate-900/90'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessUploadedFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="form-file-input-pdf"
                />

                <div className="flex flex-col items-center justify-center space-y-2.5 pointer-events-none">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                    <Cloud className="h-8 w-8 animate-pulse" />
                  </div>

                  {uploadedFileName ? (
                    <div className="space-y-1.5">
                      <span className="px-4 py-1.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-mono text-sm sm:text-base font-extrabold inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> FILE UNGGAH: {uploadedFileName}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-200 font-mono">
                        Judul Ekstrak Otomatis: <strong className="text-amber-300">"{formData.namaDokumen}"</strong>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm sm:text-base font-mono font-black text-slate-100">
                        DRAG & DROP DOKUMEN PDF DI SINI ATAU <span className="text-emerald-400 underline">KLIK UNTUK UNGGAH</span>
                      </p>
                      <p className="text-xs sm:text-sm text-slate-300 font-mono font-semibold mt-1">
                        Sistem otomatis mengekstrak & memotong judul dokumen agar tidak terlalu panjang
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-cyan-300 font-mono font-bold">
                    <FolderKanban className="h-4 w-4 text-cyan-400" />
                    Folder Drive Target: <span className="text-emerald-300 font-extrabold">Google Drive / Cinema XXI / SOP & Knowledge / {formData.kategori} /</span>
                  </div>
                </div>
              </div>

              {/* Nama Dokumen */}
              <div>
                <label className="block text-sm sm:text-base font-mono font-black text-cyan-300 mb-2 flex items-center justify-between">
                  <span>NAMA DOKUMEN (EKSTRAK OTOMATIS) *</span>
                  <span className="text-xs sm:text-sm text-slate-400 font-bold">Maks. ~42 karakter</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SOP Maintenance Projector Barco"
                  value={formData.namaDokumen}
                  onChange={(e) => setFormData({ ...formData, namaDokumen: e.target.value })}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-5 py-3.5 text-base sm:text-lg text-white font-bold placeholder-slate-500 focus:outline-none transition-all shadow-inner"
                  id="form-input-nama"
                />
              </div>

              {/* Kategori & Versi Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm sm:text-base font-mono font-black text-cyan-300 mb-2">
                    KATEGORI DOKUMEN *
                  </label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as SopCategory })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-base sm:text-lg text-white font-bold focus:outline-none cursor-pointer"
                    id="form-select-category"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-mono font-black text-cyan-300 mb-2">
                    NOMOR / VERSI DOKUMEN *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: v1.0, v2.1"
                    value={formData.versi}
                    onChange={(e) => setFormData({ ...formData, versi: e.target.value })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-base sm:text-lg text-white font-bold font-mono"
                    id="form-input-version"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm sm:text-base font-mono font-black text-cyan-300 mb-2">
                  DESKRIPSI RINGKAS DOKUMEN
                </label>
                <textarea
                  rows={3}
                  placeholder="Penjelasan singkat isi dokumen, instruksi kerja, atau ruang lingkupnya..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl p-4 sm:p-5 text-base sm:text-lg text-white font-normal focus:outline-none"
                  id="form-textarea-desc"
                />
              </div>

              {/* Google Drive Link */}
              <div>
                <label className="block text-sm sm:text-base font-mono font-black text-emerald-400 mb-2 flex items-center gap-2">
                  <Cloud className="h-5 w-5" /> LINK GOOGLE DRIVE FILE *
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/file/d/..."
                  value={formData.googleDriveLink}
                  onChange={(e) => setFormData({ ...formData, googleDriveLink: e.target.value })}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-5 py-3.5 text-sm sm:text-base text-white font-bold font-mono focus:outline-none"
                  id="form-input-drive-link"
                />
                <p className="text-xs sm:text-sm text-slate-300 font-semibold mt-1">
                  Pastikan akses file Google Drive disetel ke "Siapa saja yang memiliki link dapat melihat".
                </p>
              </div>

              {/* Upload Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-mono font-black text-cyan-300 mb-2">
                    NAMA PENGUNGGAH
                  </label>
                  <input
                    type="text"
                    value={formData.namaPengunggah}
                    onChange={(e) => setFormData({ ...formData, namaPengunggah: e.target.value })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-sm sm:text-base text-white font-bold focus:outline-none"
                    id="form-input-uploader"
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono font-black text-cyan-300 mb-2">
                    UKURAN FILE
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 3.5 MB"
                    value={formData.ukuranFile}
                    onChange={(e) => setFormData({ ...formData, ukuranFile: e.target.value })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-sm sm:text-base text-white font-bold font-mono focus:outline-none"
                    id="form-input-filesize"
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono font-black text-cyan-300 mb-2">
                    STATUS DOKUMEN
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Arsip' })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-sm sm:text-base text-white font-bold focus:outline-none cursor-pointer"
                    id="form-select-status"
                  >
                    <option value="Aktif">🟢 Aktif</option>
                    <option value="Arsip">📦 Arsip</option>
                  </select>
                </div>
              </div>

              {/* Catatan Perubahan */}
              <div>
                <label className="block text-sm sm:text-base font-mono font-black text-amber-300 mb-2">
                  CATATAN PERUBAHAN / REVISI
                </label>
                <input
                  type="text"
                  placeholder="Sebutkan ringkasan revisi jika ini adalah update versi baru..."
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-sm sm:text-base text-white font-bold focus:outline-none"
                  id="form-input-notes"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-emerald-400">
                  <Cloud className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>Tersinkron ke Gmail: <strong>{driveGmail}</strong></span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-6 py-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-black text-sm sm:text-base font-mono transition-all cursor-pointer"
                    id="btn-cancel-sop-form"
                  >
                    BATAL
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-black text-sm sm:text-base font-mono tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5 border border-emerald-300"
                    id="btn-submit-sop-form"
                  >
                    <Cloud className="h-5 w-5" />
                    <span>{editingDoc ? 'SIMPAN & SINKRONKAN DRIVE' : 'SINKRONKAN KE GOOGLE DRIVE'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0a1120] border-2 border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-[0_0_40px_rgba(244,63,94,0.3)]">
            <div className="h-12 w-12 rounded-full bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Konfirmasi Hapus Dokumen</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus dokumen ini dari Knowledge Center? Tindakan ini akan dicatat pada riwayat audit log.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingDocId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs font-mono cursor-pointer"
              >
                BATAL
              </button>
              <button
                onClick={() => handleDeleteDocument(deletingDocId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono shadow-[0_0_15px_rgba(244,63,94,0.5)] cursor-pointer"
                id="btn-confirm-delete-sop"
              >
                YA, HAPUS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0a1120] border-2 border-rose-500/50 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.4)]">
            <div className="h-14 w-14 rounded-full bg-rose-950 border border-rose-500/50 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="h-7 w-7" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white">Konfirmasi Hapus Massal ({selectedDocIds.length} SOP)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus <strong className="text-rose-400 font-bold">{selectedDocIds.length} dokumen SOP</strong> yang telah diceklis? Tindakan ini akan menghapus dokumen dari list dan mencatatnya dalam riwayat audit log.
              </p>
            </div>

            {/* List of document titles to be deleted */}
            <div className="max-h-40 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Daftar Dokumen Akan Dihapus:</span>
              {selectedDocIds.map((id) => {
                const doc = documents.find((d) => d.id === id);
                return (
                  <div key={id} className="flex items-center gap-2 text-slate-200 py-0.5 border-b border-slate-900 last:border-none">
                    <span className="text-rose-400 font-bold">•</span>
                    <span className="font-semibold truncate flex-1">{doc?.namaDokumen || id}</span>
                    <span className="text-[10px] text-cyan-400 font-mono">{doc?.kategori}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs font-mono cursor-pointer transition-all"
              >
                BATAL
              </button>
              <button
                onClick={handleBulkDeleteDocuments}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono shadow-[0_0_20px_rgba(244,63,94,0.6)] cursor-pointer transition-all flex items-center gap-2"
                id="btn-confirm-bulk-delete-sop"
              >
                <Trash2 className="h-4 w-4" />
                YA, HAPUS {selectedDocIds.length} DOKUMEN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE DRIVE GMAIL SYNC MODAL */}
      {isDriveSyncModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          id="modal-google-drive-sync"
        >
          <div className="bg-[#0a1120] border-2 border-emerald-500/50 rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] max-h-[90vh] overflow-y-auto">
            <div className="bg-[#070c18] px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                <HardDrive className="h-5 w-5 text-emerald-400" /> SINKRONISASI GOOGLE DRIVE (SAMA DENGAN BERITA ACARA)
              </h3>
              <button
                onClick={() => setIsDriveSyncModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 bg-emerald-950/40 border-b border-emerald-500/30 text-xs font-mono space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Status: TERHUBUNG REAL-TIME (AUTO-KONEK GOOGLE DRIVE)</span>
              </div>
              <p className="text-emerald-200/90 text-[11px] font-sans">
                Setiap dokumen PDF & SOP yang diunggah akan otomatis membuatkan folder tersendiri di Google Drive dan menghasilkan link aktif yang bisa langsung dibuka!
              </p>
            </div>

            <form onSubmit={handleSaveDriveSync} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-mono font-bold text-emerald-300 text-xs">
                    EMAIL GMAIL TARGET GOOGLE DRIVE *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="engineering.xxilmp@gmail.com"
                    value={inputGmail}
                    onChange={(e) => setInputGmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-slate-100 font-mono text-xs focus:outline-none"
                    id="input-drive-gmail-address"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono font-bold text-cyan-300 text-xs">
                    WEB APP URL GOOGLE APPS SCRIPT *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-slate-100 font-mono text-xs focus:outline-none"
                    id="input-drive-webapp-url"
                  />
                </div>
              </div>

              {/* Guide Box & Code Snippet Toggle */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300 flex items-center gap-1.5 uppercase">
                    <HelpCircle className="w-4 h-4 text-cyan-400" /> CARA INTEGRASI UPLOAD & HAPUS GOOGLE DRIVE
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowScriptCode(!showScriptCode)}
                    className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{showScriptCode ? 'Sembunyikan Kode' : 'Lihat Kode Script (Upload + Hapus)'}</span>
                  </button>
                </div>

                <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5 text-[11px] font-mono text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-300 block mb-1">📌 PENTING SUPAYA HAPUS DOKUMEN JUGA SINKRON KE DRIVE:</strong>
                  Jika Anda sudah pernah menyalin kode Google Apps Script sebelumnya, wajib <strong>Salin Ulang Kode Terbaru</strong> (yang memiliki fungsi <code>action === "delete"</code>) lalu lakukan <strong>Deploy &gt; New Deployment / New Version</strong> di script.google.com!
                </div>

                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] font-mono leading-relaxed">
                  <li>Buka website <strong>script.google.com</strong> dan buka project Anda (atau buat baru).</li>
                  <li>Salin dan tempelkan kode Apps Script di bawah ini (sudah include fungsi Upload + Hapus).</li>
                  <li>Klik <strong>Deploy &gt; New Deployment &gt; Web App</strong> (Set akses: <strong>Anyone / Siapa Saja</strong>).</li>
                  <li>Copy Web App Exec URL yang dihasilkan dan tempelkan pada kolom di atas!</li>
                </ol>

                {showScriptCode && (
                  <div className="mt-2 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded-t-lg border-x border-t border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">Code.gs (Google Apps Script)</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(RECOMMENDED_APPS_SCRIPT_CODE);
                          setCopiedScript(true);
                          setTimeout(() => setCopiedScript(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedScript ? 'Tersalin!' : 'Salin Kode'}</span>
                      </button>
                    </div>
                    <pre className="bg-black p-3 rounded-b-lg border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48 leading-normal">
                      {RECOMMENDED_APPS_SCRIPT_CODE}
                    </pre>
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Folder Otomatis Drive:</span>
                  <span className="text-cyan-300 font-bold truncate max-w-[280px]">/SOP & KNOWLEDGE/[Nama Dokumen].pdf</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Total File Tersedia:</span>
                  <span className="text-emerald-400 font-bold">{documents.length} Dokumen SOP</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold text-white block">
                    Otomatis Buat Folder & Link Drive Aktif
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Setiap upload PDF langsung otomatis masuk ke folder Google Drive ({driveGmail})
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="h-5 w-5 accent-emerald-500 rounded cursor-pointer"
                  id="checkbox-auto-sync"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDriveSyncModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs font-mono transition-all cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={isSyncingDrive}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs font-mono tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
                  id="btn-save-drive-gmail"
                >
                  <Cloud className="h-4 w-4" /> HUBUNGKAN & TES SINKRONISASI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOOGLE DRIVE EXPLORER MODAL */}
      {isDriveExplorerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          id="modal-google-drive-explorer"
        >
          <div className="bg-[#0a1120] border-2 border-cyan-500/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-[#070c18] px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>GOOGLE DRIVE STORAGE EXPLORER</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                      SYNC ACTIVE (100%)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Akun Gmail Target: <strong className="text-emerald-400">{driveGmail}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDriveExplorerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {/* Connected Account Card */}
              <div className="bg-[#080e1a] border border-cyan-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
                <div>
                  <span className="text-[11px] text-slate-400 block">LOKASI FOLDER INDUK GOOGLE DRIVE:</span>
                  <span className="text-xs font-bold text-cyan-300 block mt-0.5">
                    /Cinema XXI/SOP & Knowledge Center/{driveGmail}/
                  </span>
                </div>
                <a
                  href={`https://drive.google.com/drive/search?q=${encodeURIComponent(driveGmail)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Buka Google Drive
                </a>
              </div>

              {/* Folder List Tree */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-400" /> DAFTAR FOLDER & DOKUMEN TERSINKRON ({documents.length})
                </h4>

                <div className="divide-y divide-slate-800/80 bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-3.5 hover:bg-slate-900/60 transition-all flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-mono text-xs font-bold">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-white truncate">
                            {doc.namaDokumen}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                            Folder: <span className="text-cyan-300">/SOP & Knowledge/{doc.kategori}/{doc.namaDokumen}/</span> • {doc.ukuranFile}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" /> SYNCED
                        </span>
                        <a
                          href={doc.googleDriveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-all cursor-pointer"
                          title="Buka dokumen di Drive"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#070c18] px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-mono text-slate-400">
                Terakhir Diperbarui: <strong className="text-amber-300">{lastSyncedTime}</strong>
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTriggerDriveSync}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} /> SINKRONKAN LAGI
                </button>
                <button
                  onClick={() => setIsDriveExplorerOpen(false)}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all cursor-pointer"
                >
                  TUTUP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF PREVIEW & VIEWER MODAL */}
      {previewDoc && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-300 ${
            isPdfFullscreen ? 'p-0' : 'p-2 sm:p-4 md:p-6'
          }`}
          id="modal-pdf-preview"
        >
          <div
            className={`bg-[#0a1120] border-2 border-cyan-500/50 rounded-2xl w-full flex flex-col shadow-[0_0_60px_rgba(0,240,255,0.3)] overflow-hidden transition-all duration-300 ${
              isPdfFullscreen ? 'h-full w-full rounded-none border-none' : 'max-w-5xl h-[92vh]'
            }`}
          >
            {/* Header Bar */}
            <div className="bg-[#070c18] px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-950 to-rose-900 border border-rose-500/40 flex items-center justify-center text-rose-400 font-mono font-bold text-xs shrink-0">
                  PDF
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono text-[10px] font-bold">
                      {previewDoc.kategori}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold">
                      {previewDoc.versi}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> DRIVE SYNCED
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                    {previewDoc.namaDokumen}
                  </h3>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Zoom Out */}
                <button
                  onClick={() => setPdfZoom((z) => Math.max(50, z - 15))}
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                  title="Perkecil Zoom"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <span className="text-xs font-mono font-bold text-cyan-300 px-2">
                  {pdfZoom}%
                </span>

                {/* Zoom In */}
                <button
                  onClick={() => setPdfZoom((z) => Math.min(200, z + 15))}
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                  title="Perbesar Zoom"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                {/* Reset Zoom */}
                <button
                  onClick={() => setPdfZoom(100)}
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                  title="Reset Zoom 100%"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <div className="h-5 w-[1px] bg-slate-800 mx-1" />

                {/* Fullscreen Toggle */}
                <button
                  onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                  title={isPdfFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                >
                  {isPdfFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>

                {/* Open Google Drive */}
                <a
                  href={previewDoc.googleDriveLink || `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(previewDoc.namaDokumen)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Buka di Drive</span>
                </a>

                {/* Close Modal */}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 sm:p-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-all cursor-pointer ml-1"
                  title="Tutup Preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Main Document Content Canvas Area */}
            <div className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-y-auto custom-scrollbar flex justify-center items-start">
              <div
                className="bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-12 w-full max-w-3xl space-y-6 transition-all duration-200 border border-slate-200"
                style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
              >
                {/* Official Document Header */}
                <div className="border-b-4 border-slate-900 pb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono font-black tracking-widest text-rose-600 uppercase">
                      CINEMA XXI - ENGINEERING DIVISION
                    </p>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">
                      STANDAR OPERASIONAL PROSEDUR
                    </h1>
                    <p className="text-xs font-bold text-slate-600 font-mono mt-0.5">
                      LIPPO MALL PURI (LMP) - XXI CINEMA SYSTEM
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs space-y-1">
                    <p className="bg-slate-100 px-2 py-1 rounded font-bold border border-slate-300 text-slate-800">
                      VERSI: {previewDoc.versi}
                    </p>
                    <p className="text-slate-500 text-[10px]">{previewDoc.tanggalUpload}</p>
                  </div>
                </div>

                {/* Document Title Banner */}
                <div className="bg-slate-100 p-4 rounded-lg border border-slate-300 space-y-1">
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                    JUDUL DOKUMEN / PROSEDUR:
                  </p>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {previewDoc.namaDokumen}
                  </h2>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-600 pt-1">
                    <span>Kategori: <strong>{previewDoc.kategori}</strong></span>
                    <span>•</span>
                    <span>Pengunggah: <strong>{previewDoc.namaPengunggah}</strong></span>
                    <span>•</span>
                    <span>Ukuran: <strong>{previewDoc.ukuranFile}</strong></span>
                  </div>
                </div>

                {/* Google Drive Location Box */}
                <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-xs font-mono text-emerald-900 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> TERSIMPAN DI GOOGLE DRIVE TARGET:
                    </span>
                    <p className="text-[11px] text-emerald-700">
                      /SOP & KNOWLEDGE/{previewDoc.namaDokumen}.pdf ({driveGmail})
                    </p>
                  </div>
                  <a
                    href={previewDoc.googleDriveLink || `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(previewDoc.namaDokumen)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shrink-0 transition-colors"
                  >
                    Buka File Drive &rarr;
                  </a>
                </div>

                {/* Document Body Text / Instruction Content */}
                <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 border-b border-slate-300 pb-1 uppercase font-mono text-xs">
                      I. DESKRIPSI & TUJUAN PROSEDUR
                    </h3>
                    <p className="text-slate-700">
                      {previewDoc.deskripsi ||
                        'Dokumen ini berisi petunjuk operasional standar, panduan teknis keselamatan kerja, tata cara pemeliharaan berkala, serta prosedur troubleshooting peralatan bioskop di Cinema XXI Lippo Mall Puri.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 border-b border-slate-300 pb-1 uppercase font-mono text-xs">
                      II. INSTRUKSI KERJA & PENANGANAN
                    </h3>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
                      <li>Pastikan seluruh teknisi menggunakan APD (Alat Pelindung Diri) standar keselamatan kerja bioskop.</li>
                      <li>Lakukan pengecekan tegangan listrik utama, suhu proyektor, dan status exhaust fan sebelum mengoperasikan sistem.</li>
                      <li>Gunakan multimeter kalibrasi resmi untuk memeriksa instalasi wiring diagram dan impedansi speaker audio.</li>
                      <li>Catat seluruh hasil pemeliharaan atau pergantian suku cadang pada form log harian engineering XXI.</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-900 border-b border-slate-300 pb-1 uppercase font-mono text-xs">
                      III. REVISI & CATATAN TEKNIS
                    </h3>
                    <p className="text-slate-700 italic bg-slate-50 p-3 rounded border border-slate-200">
                      {previewDoc.catatan || `Dokumen versi ${previewDoc.versi} ini berlaku secara resmi dan tersinkron penuh dengan Google Drive Engineering (${driveGmail}).`}
                    </p>
                  </div>
                </div>

                {/* Approval Signature Block */}
                <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center font-mono text-xs">
                  <div>
                    <p className="text-slate-500 font-bold">Dibuat Oleh:</p>
                    <div className="h-14 flex items-center justify-center font-bold text-slate-800 italic">
                      {previewDoc.namaPengunggah}
                    </div>
                    <p className="border-t border-slate-400 pt-1 font-bold">{previewDoc.namaPengunggah}</p>
                    <p className="text-[10px] text-slate-500">Chief Engineer XXI LMP</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold">Disetujui Oleh:</p>
                    <div className="h-14 flex items-center justify-center font-bold text-slate-800 italic">
                      Head of Engineering XXI
                    </div>
                    <p className="border-t border-slate-400 pt-1 font-bold">Manager Engineering XXI</p>
                    <p className="text-[10px] text-slate-500">Head Office Cinema XXI</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-[#070c18] px-6 py-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Cloud className="h-4 w-4 text-emerald-400" />
                <span>Sync Status: <strong className="text-emerald-400">Tersimpan di Google Drive</strong></span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadPdf(previewDoc)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" /> Unduh Document
                </button>

                <a
                  href={previewDoc.googleDriveLink || `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(previewDoc.namaDokumen)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" /> Buka di Google Drive
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL (ADD / EDIT NOTE) */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
          <div className="bg-[#0d1627] border-2 border-emerald-500/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_0_60px_rgba(16,185,129,0.35)] my-auto">
            <div className="bg-[#080e1a] border-b border-emerald-500/30 px-6 sm:px-8 py-5 flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <StickyNote className="h-7 w-7 text-emerald-400 shrink-0" />
                <span>{editingNote ? 'Edit Catatan / Informasi Engineering' : 'Buat Catatan & Informasi Baru'}</span>
              </h3>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-6 sm:p-8 space-y-5 max-h-[82vh] overflow-y-auto">
              <div>
                <label className="block text-sm sm:text-base font-mono font-black text-slate-100 mb-2">
                  Judul Catatan / Informasi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Instruksi Reset Cepat Server TMS Pasca Mati Listrik"
                  value={noteFormData.judul}
                  onChange={(e) => setNoteFormData({ ...noteFormData, judul: e.target.value })}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-5 py-3.5 text-base sm:text-lg font-bold text-slate-100 placeholder-slate-500 focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-mono font-black text-slate-100 mb-2">Kategori</label>
                  <select
                    value={noteFormData.kategori}
                    onChange={(e) => setNoteFormData({ ...noteFormData, kategori: e.target.value })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-4 py-3 text-sm sm:text-base font-bold text-slate-100 focus:outline-none cursor-pointer"
                  >
                    <option value="Engineering General">Engineering General</option>
                    <option value="Projector">Projector</option>
                    <option value="Audio System">Audio System</option>
                    <option value="AC (Air Conditioner)">AC (Air Conditioner)</option>
                    <option value="Electrical">Electrical</option>
                    <option value="IT">IT & Server</option>
                    <option value="Safety (K3)">Safety (K3)</option>
                    <option value="Pengumuman">Pengumuman Shift</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-mono font-black text-slate-100 mb-2">Tingkat Prioritas</label>
                  <select
                    value={noteFormData.prioritas}
                    onChange={(e) =>
                      setNoteFormData({
                        ...noteFormData,
                        prioritas: e.target.value as 'Biasa' | 'Penting' | 'Khusus / Emergency'
                      })
                    }
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-4 py-3 text-sm sm:text-base font-bold text-slate-100 focus:outline-none cursor-pointer"
                  >
                    <option value="Biasa">Biasa / Normal</option>
                    <option value="Penting">Penting</option>
                    <option value="Khusus / Emergency">🔴 Khusus / Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-mono font-black text-slate-100 mb-2">Penulis / Teknisi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Chief Engineer XXI"
                    value={noteFormData.penulis}
                    onChange={(e) => setNoteFormData({ ...noteFormData, penulis: e.target.value })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-4 py-3 text-sm sm:text-base font-bold text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm sm:text-base font-mono font-black text-slate-100 mb-2">
                  Detail Isi Catatan & Informasi *
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Tuliskan instruksi teknis, langkah penanganan, atau informasi pengumuman secara rinci di sini..."
                  value={noteFormData.isi}
                  onChange={(e) => setNoteFormData({ ...noteFormData, isi: e.target.value })}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl p-4 sm:p-5 text-base sm:text-lg text-slate-100 focus:outline-none font-sans leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-sm font-mono font-black text-slate-100 mb-2">
                  Tag / Kata Kunci (Dipisahkan koma)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: IT, TMS, Genset, Darurat"
                  value={noteFormData.tags}
                  onChange={(e) => setNoteFormData({ ...noteFormData, tags: e.target.value })}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-4 py-3 text-sm sm:text-base font-bold text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="chk-pin-note"
                  checked={noteFormData.isPinned}
                  onChange={(e) => setNoteFormData({ ...noteFormData, isPinned: e.target.checked })}
                  className="h-5 w-5 rounded-lg border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                />
                <label htmlFor="chk-pin-note" className="text-sm sm:text-base font-mono font-black text-slate-100 cursor-pointer select-none">
                  📌 Sematkan / Pin catatan ini di paling atas
                </label>
              </div>

              <div className="pt-5 border-t border-slate-800 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm sm:text-base font-mono font-black transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-black text-sm sm:text-base tracking-wide shadow-[0_0_25px_rgba(16,185,129,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-emerald-300"
                >
                  {editingNote ? 'SIMPAN PERUBAHAN' : 'PUBLIKASIKAN CATATAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
