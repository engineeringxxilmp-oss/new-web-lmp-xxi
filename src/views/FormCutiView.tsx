/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormCutiData, JenisCutiType, SystemBranding } from '../types';
import { UserSession } from './Login';
import { firestoreDb } from '../db/firestoreDb';
import { getIndonesianDate } from './PrEngineering';
import CutiPdfLivePreview from '../components/CutiPdfLivePreview';
import {
  loadMasterPdfFromIndexedDB,
  fetchMasterPdfFromServer,
  saveMasterPdfToIndexedDB,
  uploadMasterPdfToServer,
  generateFinalPdfWithMasterTemplate,
  getOrLoadMasterPdfBytes,
  cloneUint8Array
} from '../utils/cutiPdfEngine';
import {
  Calendar,
  FileText,
  Eye,
  Download,
  Printer,
  Share2,
  Mail,
  Save,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Briefcase,
  IdCard,
  Building,
  CheckSquare,
  Square,
  ZoomIn,
  ZoomOut,
  X,
  ExternalLink,
  MessageCircle,
  FileCheck,
  Search,
  AlertCircle,
  Paperclip,
  Send,
  Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FormCutiProps {
  branding?: SystemBranding;
  currentUser?: UserSession | null;
  onShowToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const JENIS_CUTI_OPTIONS: { id: JenisCutiType; label: string; defaultAlasan: string }[] = [
  {
    id: 'Cuti Tahunan',
    label: 'Cuti Tahunan',
    defaultAlasan: 'Cuti Tahunan Karyawan'
  },
  {
    id: 'Menikah',
    label: 'Menikah',
    defaultAlasan: 'Melangsungkan Pernikahan Karyawan'
  },
  {
    id: 'Menikahkan Anak',
    label: 'Menikahkan Anak',
    defaultAlasan: 'Menikahkan Anak Kandung'
  },
  {
    id: 'Khitanan Anak',
    label: 'Khitanan Anak',
    defaultAlasan: 'Melaksanakan Khitanan Anak Kandung'
  },
  {
    id: 'Baptisan Anak',
    label: 'Baptisan Anak',
    defaultAlasan: 'Melaksanakan Baptisan Anak Kandung'
  },
  {
    id: 'Istri Melahirkan / Keguguran',
    label: 'Istri Melahirkan / Keguguran',
    defaultAlasan: 'Mendampingi Istri Melahirkan / Keguguran'
  },
  {
    id: 'Suami/Istri, Orangtua/Mertua atau Menantu Meninggal',
    label: 'Suami/Istri, Orangtua/Mertua atau Menantu Meninggal',
    defaultAlasan: 'Suami / Istri / Orang Tua / Mertua / Menantu Meninggal Dunia'
  },
  {
    id: 'Anggota keluarga dalam 1 rumah meninggal dunia',
    label: 'Anggota keluarga dalam 1 rumah meninggal dunia',
    defaultAlasan: 'Anggota Keluarga Dalam 1 Rumah Meninggal Dunia'
  }
];

const DRAFT_STORAGE_KEY = 'xxi_form_cuti_current_draft';

// Helper to format ISO date YYYY-MM-DD to Indonesian date
export const formatIndoDate = (isoStr?: string): string => {
  if (!isoStr || isoStr.trim() === '') return '';
  return getIndonesianDate(isoStr);
};

// Calculate business days between two dates
export const calculateDaysDifference = (startStr: string, endStr: string): number => {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
};

// Add 1 day to date string
export const getNextDateString = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Create empty pristine blank form
export const createEmptyFormData = (): FormCutiData => ({
  id: `cuti-${Date.now()}`,
  nama: '',
  divisi: '',
  jabatan: '',
  nik: '',
  noHp: '',
  tanggalMulai: '',
  tanggalSelesai: '',
  jumlahHari: 0,
  tanggalKembali: '',
  jenisCuti: '',
  alasanCuti: '',
  penggantiNama: '',
  penggantiNoHp: '',
  diajukanOlehNama: '',
  diajukanOlehJabatan: '',
  diajukanOlehTanggal: '',
  disetujuiOlehNama: '',
  disetujuiOlehJabatan: '',
  disetujuiOlehTanggal: '',
  mengetahuiNama: '',
  mengetahuiJabatan: '',
  mengetahuiTanggal: '',
  hcHakCutiTahun: '',
  hcHakCutiHari: '',
  hcCutiTelahDiambil: '',
  hcCutiAkanDiambil: '',
  hcIzin: '',
  hcAlpa: '',
  hcSakit: '',
  hcSisaCuti: '',
  hcStatusVerifikasi: '',
  hcCatatan: '',
  hcParafNama: '',
  hcParafTanggal: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Standard official file naming: Form Cuti - [Nama Pegawai] - [Tanggal].pdf
export const getCutiPdfFileName = (data: FormCutiData): string => {
  const cleanName = (data.nama || 'Pegawai').trim().replace(/[/\\?%*:|"<>]/g, '_');
  const dateStr = data.tanggalMulai || new Date().toISOString().split('T')[0];
  return `Form Cuti - ${cleanName} - ${dateStr}.pdf`;
};

// Helper to check if form has any meaningful user input
export const hasContent = (data: FormCutiData | null | undefined): boolean => {
  if (!data) return false;
  return Boolean(
    (data.nama && data.nama.trim() !== '') ||
    (data.tanggalMulai && data.tanggalMulai.trim() !== '') ||
    (data.jenisCuti && data.jenisCuti.trim() !== '') ||
    (data.divisi && data.divisi.trim() !== '') ||
    (data.nik && data.nik.trim() !== '') ||
    (data.penggantiNama && data.penggantiNama.trim() !== '') ||
    (data.alasanCuti && data.alasanCuti.trim() !== '') ||
    (data.hcHakCutiHari && String(data.hcHakCutiHari).trim() !== '') ||
    (data.hcStatusVerifikasi && data.hcStatusVerifikasi.trim() !== '')
  );
};

export default function FormCutiView({ branding, currentUser, onShowToast }: FormCutiProps) {
  // Requirement 4: Kondisi awal form cuti harus 100% KOSONG saat pertama kali dibuka.
  // Input Form Data: data yang sedang diketik pengguna di panel input digital
  const [formData, setFormData] = useState<FormCutiData>(() => createEmptyFormData());

  // Dokumen Sementara: data yang sudah DITERAPKAN ke preview PDF (Requirement 5 & 10)
  const [appliedDocData, setAppliedDocData] = useState<FormCutiData>(() => createEmptyFormData());

  // History list from firestoreDb
  const [historyList, setHistoryList] = useState<FormCutiData[]>(() => firestoreDb.getFormCutiList());

  // Search in History
  const [historySearch, setHistorySearch] = useState('');

  // UI state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTabSub, setActiveTabSub] = useState<'editor' | 'history'>('editor');
  const [mobileEditorTab, setMobileEditorTab] = useState<'form' | 'preview'>('form');
  
  // Selected item to view in modal
  const [modalItemData, setModalItemData] = useState<FormCutiData | null>(null);

  // Master PDF template bytes state
  const [masterPdfBytes, setMasterPdfBytes] = useState<Uint8Array | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(true);

  // Email Modal State (Requirement 11)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('human.capital@21cineplex.com');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailPdfBlob, setEmailPdfBlob] = useState<Blob | null>(null);
  const [emailPdfBase64, setEmailPdfBase64] = useState<string>('');
  const [isGeneratingEmailPdf, setIsGeneratingEmailPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  // Load master PDF template on mount
  useEffect(() => {
    let isMounted = true;
    async function initMasterPdf() {
      try {
        setIsPdfLoading(true);
        const bytes = await getOrLoadMasterPdfBytes();
        if (bytes && isMounted) {
          setMasterPdfBytes(cloneUint8Array(bytes));
        }
      } catch (err) {
        console.warn('Error loading master PDF template:', err);
      } finally {
        if (isMounted) setIsPdfLoading(false);
      }
    }
    initMasterPdf();
    return () => {
      isMounted = false;
    };
  }, []);

  // Upload or replace master PDF template handler
  const handleUploadTemplate = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const safeCopy = cloneUint8Array(bytes);
      setMasterPdfBytes(safeCopy);
      await saveMasterPdfToIndexedDB(cloneUint8Array(bytes));
      await uploadMasterPdfToServer(cloneUint8Array(bytes));
      if (onShowToast) onShowToast('File template PDF master asli berhasil dimuat dan disimpan!', 'success');
    } catch (err: any) {
      console.error('Error uploading master PDF:', err);
      if (onShowToast) onShowToast('Gagal memuat file PDF: ' + err.message, 'error');
    }
  };

  const handleReloadTemplate = useCallback((fresh: Uint8Array) => {
    setMasterPdfBytes(fresh);
  }, []);

  // Subscribe to firestoreDb updates
  useEffect(() => {
    const unsubscribe = firestoreDb.subscribe(() => {
      setHistoryList([...firestoreDb.getFormCutiList()]);
    });
    return () => unsubscribe();
  }, []);

  // Recalculate duration when dates change
  const handleStartDateChange = (val: string) => {
    const diff = calculateDaysDifference(val, formData.tanggalSelesai);
    const nextDate = formData.tanggalSelesai ? getNextDateString(formData.tanggalSelesai) : getNextDateString(val);
    setFormData((prev) => ({
      ...prev,
      tanggalMulai: val,
      jumlahHari: diff,
      tanggalKembali: prev.tanggalKembali || nextDate,
      hcCutiAkanDiambil: diff > 0 ? String(diff) : '',
      diajukanOlehTanggal: prev.diajukanOlehTanggal || val
    }));
  };

  const handleEndDateChange = (val: string) => {
    const diff = calculateDaysDifference(formData.tanggalMulai, val);
    const nextDate = getNextDateString(val);
    setFormData((prev) => ({
      ...prev,
      tanggalSelesai: val,
      jumlahHari: diff,
      tanggalKembali: nextDate,
      hcCutiAkanDiambil: diff > 0 ? String(diff) : ''
    }));
  };

  // Change Jenis Cuti & auto-fill Alasan Cuti (Requirement 4 & 5)
  const handleJenisCutiChange = (jenis: JenisCutiType) => {
    const isSame = formData.jenisCuti === jenis;
    if (isSame) {
      setFormData((prev) => ({
        ...prev,
        jenisCuti: '',
        alasanCuti: ''
      }));
    } else {
      const selectedOption = JENIS_CUTI_OPTIONS.find((opt) => opt.id === jenis);
      setFormData((prev) => ({
        ...prev,
        jenisCuti: jenis,
        alasanCuti: selectedOption ? selectedOption.defaultAlasan : ''
      }));
    }
  };

  // TOMBOL BARU — TERAPKAN (Requirement 5):
  // 1. Memvalidasi data input.
  // 2. Memindahkan seluruh data input ke posisi masing-masing pada dokumen PDF (appliedDocData).
  // 3. Preview PDF langsung diperbarui.
  // 4. Setelah berhasil diterapkan, seluruh kolom pada panel input digital dikosongkan kembali.
  // 5. Data yang telah diterapkan tetap tampil pada preview PDF meskipun panel input digital sudah kosong.
  const handleTerapkan = () => {
    if (!hasContent(formData)) {
      if (onShowToast) onShowToast('Silakan isi data pengajuan cuti pada form sebelum menekan TERAPKAN.', 'warning');
      return;
    }

    const duration = formData.jumlahHari > 0
      ? formData.jumlahHari
      : calculateDaysDifference(formData.tanggalMulai, formData.tanggalSelesai);

    const applied: FormCutiData = {
      ...formData,
      id: formData.id || `cuti-${Date.now()}`,
      jumlahHari: duration,
      diajukanOlehTanggal: formData.diajukanOlehTanggal || formData.tanggalMulai,
      updatedAt: new Date().toISOString()
    };

    // Terapkan ke state dokumen sementara preview
    setAppliedDocData(applied);

    // Kosongkan panel input digital agar siap untuk pengisian selanjutnya
    setFormData(createEmptyFormData());

    // Di perangkat mobile, otomatis alihkan ke pratinjau dokumen A4 agar user langsung melihat hasilnya
    setMobileEditorTab('preview');

    if (onShowToast) onShowToast('Data formulir berhasil DITERAPKAN ke pratinjau dokumen PDF!', 'success');
  };

  // TOMBOL RESET FORM (Requirement 7):
  const handleResetForm = () => {
    const hasActiveData = hasContent(formData) || hasContent(appliedDocData);
    if (hasActiveData) {
      const confirmed = window.confirm(
        'Apakah Anda yakin ingin mengosongkan seluruh panel input dan pratinjau dokumen? Data pengajuan yang belum disimpan akan hilang.'
      );
      if (!confirmed) return;
    }

    setFormData(createEmptyFormData());
    setAppliedDocData(createEmptyFormData());
    if (onShowToast) onShowToast('Formulir dan preview berhasil dikosongkan.', 'info');
  };

  // TOMBOL SIMPAN — SIMPAN KE RIWAYAT CUTI (Requirement 6):
  // 1. Simpan data dokumen yang sedang tampil ke Riwayat Cuti.
  // 2. Konfirmasi penyimpanan berhasil.
  // 3. Kosongkan seluruh data pada panel input DAN dokumen sementara.
  // 4. Preview kembali ke template master kosong, siap untuk dokumen baru.
  // 5. Jika gagal: JANGAN kosongkan form atau dokumen sementara!
  const handleSave = async () => {
    // Tentukan data yang akan disimpan: prioritaskan data yang sudah DITERAPKAN, fallback ke formData jika belum sempat tekan terapkan
    const targetData = hasContent(appliedDocData) ? appliedDocData : formData;

    if (!hasContent(targetData)) {
      if (onShowToast) onShowToast('Tidak ada data formulir yang dapat disimpan. Silakan isi form dan tekan TERAPKAN terlebih dahulu.', 'warning');
      return;
    }

    if (!targetData.nama || !targetData.nama.trim()) {
      if (onShowToast) onShowToast('Harap isi Nama Lengkap Pegawai.', 'warning');
      return;
    }
    if (!targetData.tanggalMulai) {
      if (onShowToast) onShowToast('Harap pilih Tanggal Mulai Cuti.', 'warning');
      return;
    }
    if (!targetData.tanggalSelesai) {
      if (onShowToast) onShowToast('Harap pilih Tanggal Selesai Cuti.', 'warning');
      return;
    }
    if (!targetData.jenisCuti) {
      if (onShowToast) onShowToast('Harap pilih Jenis Cuti.', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      const duration = targetData.jumlahHari > 0
        ? targetData.jumlahHari
        : calculateDaysDifference(targetData.tanggalMulai, targetData.tanggalSelesai);

      const docToSave: FormCutiData = {
        ...targetData,
        id: targetData.id || `cuti-${Date.now()}`,
        jumlahHari: duration,
        diajukanOlehTanggal: targetData.diajukanOlehTanggal || targetData.tanggalMulai,
        updatedAt: new Date().toISOString()
      };

      await firestoreDb.saveFormCuti(docToSave);

      // Setelah konfirmasi penyimpanan berhasil:
      // Kosongkan seluruh data pada panel input dan dokumen sementara
      setFormData(createEmptyFormData());
      setAppliedDocData(createEmptyFormData());

      setHistoryList([...firestoreDb.getFormCutiList()]);
      if (onShowToast) onShowToast('Form Cuti Berhasil Disimpan ke Riwayat Cuti!', 'success');
    } catch (err) {
      console.error('Error saving form cuti:', err);
      // PENTING (Requirement 6): Jika gagal, jangan mengosongkan panel input maupun dokumen sementara!
      if (onShowToast) onShowToast('Gagal menyimpan formulir cuti. Silakan coba kembali.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Load from history into editor and preview
  const handleLoadItem = (item: FormCutiData) => {
    setFormData({ ...item });
    setAppliedDocData({ ...item });
    setActiveTabSub('editor');
    if (onShowToast) onShowToast(`Formulir cuti atas nama ${item.nama} dimuat ke editor dan preview.`, 'info');
  };

  // Open modal preview for a specific item
  const handleOpenItemPreview = (item: FormCutiData) => {
    setModalItemData(item);
    setIsPreviewModalOpen(true);
  };

  // Delete from history
  const handleDeleteItem = async (id: string, nama: string) => {
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus arsip formulir cuti atas nama ${nama || 'Pegawai'}?`);
    if (!confirmed) return;

    try {
      await firestoreDb.deleteFormCuti(id);
      setHistoryList([...firestoreDb.getFormCutiList()]);
      if (onShowToast) onShowToast('Data riwayat cuti berhasil dihapus.', 'info');
    } catch (err) {
      console.error('Error deleting form cuti:', err);
      if (onShowToast) onShowToast('Gagal menghapus riwayat cuti.', 'error');
    }
  };

  // Print A4 Document
  const handlePrint = async () => {
    try {
      const result = await generatePdfBlob(modalItemData || formData);
      if (result) {
        const blobUrl = URL.createObjectURL(result.blob);
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.src = blobUrl;
        document.body.appendChild(printFrame);
        printFrame.onload = () => {
          setTimeout(() => {
            try {
              printFrame.contentWindow?.focus();
              printFrame.contentWindow?.print();
            } catch (_) {}
          }, 300);
        };
        return;
      }
    } catch (_) {}
    window.print();
  };

  /**
   * Helper: Generate Canvas & PDF
   * Standard A4 dimensions: 210mm x 297mm
   * Uses the authentic master PDF template bytes directly
   */
  const generatePdfBlob = async (customData?: FormCutiData): Promise<{ blob: Blob; base64: string; fileName: string } | null> => {
    const dataToExport = customData || modalItemData || (hasContent(appliedDocData) ? appliedDocData : (hasContent(formData) ? formData : createEmptyFormData()));

    let templateBytes = masterPdfBytes;
    if (!templateBytes || templateBytes.byteLength < 2000) {
      templateBytes = await getOrLoadMasterPdfBytes();
      if (templateBytes) {
        setMasterPdfBytes(cloneUint8Array(templateBytes));
      }
    }

    if (!templateBytes || templateBytes.byteLength < 2000) {
      const fetched = await fetchMasterPdfFromServer();
      if (fetched) {
        templateBytes = fetched;
        setMasterPdfBytes(cloneUint8Array(fetched));
      }
    }

    if (!templateBytes || templateBytes.byteLength < 200) {
      throw new Error('File master PDF (Form Cuti master pdf.pdf) tidak ditemukan.');
    }

    return await generateFinalPdfWithMasterTemplate(
      templateBytes,
      dataToExport,
      formatIndoDate
    );
  };

  // DOWNLOAD PDF (Requirement 10)
  const handleExportPdf = async (customData?: FormCutiData): Promise<Blob | null> => {
    const dataToExport = customData || modalItemData || (hasContent(appliedDocData) ? appliedDocData : (hasContent(formData) ? formData : createEmptyFormData()));
    try {
      setIsExporting(true);
      if (onShowToast) onShowToast('Menyiapkan dokumen PDF A4 resmi...', 'info');

      const result = await generatePdfBlob(dataToExport);
      if (!result) throw new Error('Target paper element tidak ditemukan.');

      // Trigger standard browser download
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(result.blob);
      downloadLink.download = result.fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      if (onShowToast) onShowToast(`PDF "${result.fileName}" berhasil diunduh!`, 'success');
      return result.blob;
    } catch (err: any) {
      console.error('Export PDF error:', err);
      if (onShowToast) onShowToast('Gagal membuat PDF. Silakan coba kembali.', 'error');
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  // OPEN EMAIL MODAL (Requirement 11)
  const handleOpenEmailModal = async () => {
    const activeData = modalItemData || (hasContent(appliedDocData) ? appliedDocData : (hasContent(formData) ? formData : createEmptyFormData()));
    const fileName = getCutiPdfFileName(activeData);
    const defaultSubj = `Form Cuti - ${activeData.nama || 'Pegawai'} - ${activeData.tanggalMulai || new Date().toISOString().split('T')[0]}`;
    
    setEmailSubject(defaultSubj);
    setEmailErrorMsg(null);
    setEmailBody(
      `Yth. Human Capital / Management,\n\n` +
      `Bersama email ini saya mengajukan permohonan cuti resmi:\n` +
      `• Nama Pegawai : ${activeData.nama || '-'}\n` +
      `• NIK          : ${activeData.nik || '-'}\n` +
      `• Divisi       : ${activeData.divisi || '-'}\n` +
      `• Jabatan      : ${activeData.jabatan || '-'}\n` +
      `• Periode      : ${formatIndoDate(activeData.tanggalMulai) || '-'} s/d ${formatIndoDate(activeData.tanggalSelesai) || '-'} (${activeData.jumlahHari || 0} Hari Kerja)\n` +
      `• Masuk Kerja  : ${formatIndoDate(activeData.tanggalKembali) || '-'}\n` +
      `• Jenis Cuti   : ${activeData.jenisCuti || '-'}\n` +
      `• Alasan Cuti  : ${activeData.alasanCuti || '-'}\n` +
      `• Pengganti    : ${activeData.penggantiNama || '-'} (${activeData.penggantiNoHp || '-'})\n\n` +
      `Dokumen resmi Formulir Permohonan Cuti A4 telah dilampirkan sebagai attachment file PDF (${fileName}).\n\n` +
      `Mohon kiranya dapat ditindaklanjuti dan disetujui. Terima kasih.\n\n` +
      `Hormat saya,\n` +
      `${activeData.nama || 'Pemohon'}`
    );

    setIsEmailModalOpen(true);

    // Pre-generate PDF attachment
    try {
      setIsGeneratingEmailPdf(true);
      const res = await generatePdfBlob(activeData);
      if (res) {
        setEmailPdfBlob(res.blob);
        setEmailPdfBase64(res.base64);
      }
    } catch (e) {
      console.warn('Pre-generate email PDF error:', e);
    } finally {
      setIsGeneratingEmailPdf(false);
    }
  };

  // SEND EMAIL ACTION (Requirement 11)
  const handleSendEmailSubmit = async () => {
    setEmailErrorMsg(null);
    if (!emailTo.trim()) {
      setEmailErrorMsg('Harap masukkan alamat email tujuan.');
      return;
    }
    if (!emailSubject.trim()) {
      setEmailErrorMsg('Harap masukkan subjek email.');
      return;
    }

    const activeData = modalItemData || formData;
    const fileName = getCutiPdfFileName(activeData);

    try {
      setIsSendingEmail(true);

      // Ensure PDF is ready
      let base64ToSend = emailPdfBase64;
      if (!base64ToSend) {
        const res = await generatePdfBlob(activeData);
        if (res) {
          base64ToSend = res.base64;
          setEmailPdfBlob(res.blob);
          setEmailPdfBase64(res.base64);
        }
      }

      // Call Backend API
      const resp = await fetch('/api/send-cuti-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: emailSubject.trim(),
          body: emailBody,
          pdfBase64: base64ToSend,
          fileName
        })
      });

      const json = await resp.json();

      if (!resp.ok || !json.success) {
        // As strictly required: jika pengiriman gagal, tampilkan error dan JANGAN menganggap berhasil!
        const errMsg = json.error || 'Pengiriman email gagal melalui server.';
        setEmailErrorMsg(errMsg);
        if (onShowToast) onShowToast(`Pengiriman email gagal: ${errMsg}`, 'error');
        return;
      }

      if (onShowToast) onShowToast(json.message || 'Email Form Cuti berhasil dikirim beserta attachment PDF!', 'success');
      setIsEmailModalOpen(false);
    } catch (err: any) {
      const errMsg = err.message || 'Koneksi ke server email gagal.';
      setEmailErrorMsg(errMsg);
      if (onShowToast) onShowToast(`Gagal mengirim email: ${errMsg}`, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // EMAIL FALLBACK: Download PDF + Trigger mailto client
  const handleEmailFallbackMailto = async () => {
    const activeData = modalItemData || formData;
    await handleExportPdf(activeData);

    const subjectEncoded = encodeURIComponent(emailSubject);
    const bodyEncoded = encodeURIComponent(
      emailBody +
      `\n\n[CATATAN: File dokumen PDF (${getCutiPdfFileName(activeData)}) telah diunduh otomatis ke perangkat Anda. Silakan lampirkan file tersebut pada email ini.]`
    );

    window.location.href = `mailto:${encodeURIComponent(emailTo)}?subject=${subjectEncoded}&body=${bodyEncoded}`;
    if (onShowToast) onShowToast('Membuka aplikasi email client dengan PDF yang telah diunduh.', 'info');
  };

  // SHARE WHATSAPP ACTION (Requirement 12)
  const handleShareWhatsApp = async () => {
    const activeData = modalItemData || (hasContent(appliedDocData) ? appliedDocData : (hasContent(formData) ? formData : createEmptyFormData()));
    const fileName = getCutiPdfFileName(activeData);

    const waText =
      `*FORMULIR PERMOHONAN CUTI*\n` +
      `*CINEMA XXI GROUP*\n` +
      `──────────────────────────\n` +
      `*I. DATA PEGAWAI*\n` +
      `• Nama     : ${activeData.nama || '-'}\n` +
      `• NIK      : ${activeData.nik || '-'}\n` +
      `• Divisi   : ${activeData.divisi || '-'}\n` +
      `• Jabatan  : ${activeData.jabatan || '-'}\n` +
      `• No. HP   : ${activeData.noHp || '-'}\n\n` +
      `*II. RENCANA CUTI*\n` +
      `• Periode  : ${formatIndoDate(activeData.tanggalMulai) || '-'} s/d ${formatIndoDate(activeData.tanggalSelesai) || '-'}\n` +
      `• Durasi   : *${activeData.jumlahHari || 0} Hari Kerja*\n` +
      `• Masuk Kembali: *${formatIndoDate(activeData.tanggalKembali) || '-'}*\n\n` +
      `*III. JENIS & ALASAN CUTI*\n` +
      `• Jenis    : ${activeData.jenisCuti || '-'}\n` +
      `• Alasan   : ${activeData.alasanCuti || '-'}\n\n` +
      `*IV. PEJABAT PENGGANTI*\n` +
      `• Nama     : ${activeData.penggantiNama || '-'}\n` +
      `• No. HP   : ${activeData.penggantiNoHp || '-'}\n\n` +
      `*V. PERSETUJUAN*\n` +
      `• Diajukan : ${activeData.diajukanOlehNama || '-'} (${activeData.diajukanOlehJabatan || '-'})\n` +
      `• Disetujui: ${activeData.disetujuiOlehNama || '-'} (${activeData.disetujuiOlehJabatan || '-'})\n` +
      `• Mengetahui: ${activeData.mengetahuiNama || '-'} (${activeData.mengetahuiJabatan || '-'})\n` +
      `──────────────────────────\n` +
      `📄 Dokumen PDF: ${fileName}`;

    try {
      if (onShowToast) onShowToast('Menyiapkan file PDF untuk dibagikan ke WhatsApp...', 'info');
      const pdfRes = await generatePdfBlob(activeData);
      if (!pdfRes) throw new Error('Gagal membuat file PDF.');

      const pdfFile = new File([pdfRes.blob], fileName, { type: 'application/pdf' });

      // Check if browser Web Share API supports file attachments directly (Mobile/Android/iOS Chrome/Safari)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `Formulir Cuti - ${activeData.nama || 'Pegawai'}`,
            text: waText
          });
          if (onShowToast) onShowToast('Form Cuti dan lampiran PDF berhasil dibagikan!', 'success');
          return;
        } catch (shareErr: any) {
          // If user aborted/cancelled the native share, don't show error
          if (shareErr.name === 'AbortError') return;
          console.warn('Native share failed, falling back:', shareErr);
        }
      }

      // Safe Fallback (Desktop / non-file share browser):
      // 1. Download the PDF directly so user has it ready
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(pdfRes.blob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // 2. Open WhatsApp Web / App with formatted message
      const encodedWa = encodeURIComponent(waText);
      window.open(`https://api.whatsapp.com/send?text=${encodedWa}`, '_blank');

      if (onShowToast) {
        onShowToast(
          `File PDF "${fileName}" telah diunduh otomatis. Silakan lampirkan file ke chat WhatsApp.`,
          'info'
        );
      }
    } catch (err: any) {
      console.error('Share WhatsApp error:', err);
      if (onShowToast) onShowToast('Gagal membagikan ke WhatsApp.', 'error');
    }
  };

  // Filter history
  const filteredHistory = historyList.filter((item) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      item.nama?.toLowerCase().includes(q) ||
      item.nik?.toLowerCase().includes(q) ||
      item.divisi?.toLowerCase().includes(q) ||
      item.jabatan?.toLowerCase().includes(q) ||
      item.jenisCuti?.toLowerCase().includes(q) ||
      item.tanggalMulai?.includes(q)
    );
  });

  /* =========================================================================
   * MASTER A4 PAPER TEMPLATE (100% PERSIS DENGAN DOKUMEN ASLI GAMBAR 2)
   * - A4 portrait (210mm x 297mm)
   * - Kop Trio Logo: Cinema XXI (kiri), the Premiere (tengah), Cinema 21 (kanan)
   * - Judul Dokumen: FORMULIR PERMOHONAN CUTI (underlined)
   * - I. DATA PEGAWAI: Tabel 3 baris (Nama, NIK, Divisi, NO. HP, Jabatan/Posisi)
   * - II. RENCANA CUTI : [tanggalMulai] s/d [tanggalSelesai] ( [jumlahHari] Hari Cuti )
   * - III. BEKERJA KEMBALI : Tanggal [tanggalKembali]
   * - IV. JENIS CUTI YANG DIAMBIL ( (3 kolom checkbox tanpa border kotak)
   * - V. ALASAN CUTI: Kotak tabel dengan alasan cuti
   * - VI. Pejabat Pengganti Selama Cuti: Tabel Nama & No. HP
   * - VII. Signatures: 3 kolom (Diajukan Oleh, Disetujui Oleh, Mengetahui) dengan garis bawah nama
   * - Garis putus-putus: - - - - - - - - - - - - - - - - - - - - - - - - - -
   * - DIISI OLEH HUMAN CAPITAL (centered, underlined)
   * - 1. DATA CUTI: Tabel 6 baris (Hak Cuti, Cuti diambil, Izin, Alpa, Sakit, Sisa Cuti)
   * - 2. HASIL VERIFIKASI DATA CUTI KARYAWAN ( * ) : Dapat Diproses / Tidak Dapat Diproses
   * - HC Database & Tanda Tangan
   * ========================================================================= */
  const renderA4Paper = () => null;

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-10" id="form-cuti-main-view">
      
      {/* HEADER COMMAND BAR & 4 PRIMARY WORKFLOW BUTTONS (Requirement 9, 10, 11, 12, 13) */}
      <div className="bg-[#0b1329]/90 backdrop-blur-md border border-cyan-500/30 p-4 sm:p-5 rounded-2xl shadow-[0_4px_25px_rgba(0,240,255,0.08)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/10 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)] shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider uppercase">MODUL HR & PERSONALIA</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono">STANDAR A4 RESMI</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">FORMULIR PERMOHONAN CUTI</h1>
            <p className="text-xs text-slate-400">Template Master A4 Cinema XXI Group • Input Digital • Export PDF • Kirim Email • WhatsApp</p>
          </div>
        </div>

        {/* WORKFLOW BUTTONS (Requirement 5, 9, 10, 11, 12, 13: [TERAPKAN] [PREVIEW] [DOWNLOAD PDF] [KIRIM EMAIL] [SHARE WHATSAPP] [SIMPAN]) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* 0. TOMBOL BARU — TERAPKAN (Requirement 5) */}
          <button
            onClick={handleTerapkan}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black font-mono tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(52,211,153,0.35)] transition-all cursor-pointer active:scale-95"
            id="btn-workflow-terapkan"
            title="Terapkan data input ke preview dokumen PDF"
          >
            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
            <span>TERAPKAN</span>
          </button>

          {/* 1. TOMBOL PREVIEW (Requirement 9) */}
          <button
            onClick={() => {
              setModalItemData(null);
              setIsPreviewModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold font-mono tracking-wider flex items-center gap-2 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer active:scale-95"
            id="btn-workflow-preview"
          >
            <Eye className="w-4 h-4 text-cyan-200" />
            <span>PREVIEW</span>
          </button>

          {/* 2. TOMBOL DOWNLOAD PDF (Requirement 10) */}
          <button
            onClick={() => handleExportPdf()}
            disabled={isExporting}
            className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono tracking-wider flex items-center gap-2 border border-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            id="btn-workflow-download-pdf"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'MEMPROSES...' : 'DOWNLOAD PDF'}</span>
          </button>

          {/* 3. TOMBOL KIRIM EMAIL (Requirement 11) */}
          <button
            onClick={handleOpenEmailModal}
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono tracking-wider flex items-center gap-2 border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all cursor-pointer active:scale-95"
            id="btn-workflow-kirim-email"
          >
            <Mail className="w-4 h-4" />
            <span>KIRIM EMAIL</span>
          </button>

          {/* 4. TOMBOL SHARE WHATSAPP (Requirement 12) */}
          <button
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono tracking-wider flex items-center gap-2 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95"
            id="btn-workflow-share-whatsapp"
          >
            <MessageCircle className="w-4 h-4" />
            <span>SHARE WHATSAPP</span>
          </button>

          {/* TOMBOL SIMPAN KE DATABASE */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white text-xs font-bold font-mono tracking-wider flex items-center gap-2 border border-slate-600 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Simpan formulir ke riwayat arsip"
            id="btn-workflow-simpan"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>{isSaving ? 'MENYIMPAN...' : 'SIMPAN'}</span>
          </button>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION: EDITOR VS HISTORY */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTabSub('editor')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTabSub === 'editor'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>FORM INPUT & PREVIEW</span>
          </button>

          <button
            onClick={() => setActiveTabSub('history')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTabSub === 'history'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>RIWAYAT CUTI ({historyList.length})</span>
          </button>
        </div>

        {/* Quick Reset Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetForm}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs text-slate-300 hover:text-white font-mono flex items-center gap-1.5 cursor-pointer transition-all"
            title="Kosongkan formulir"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset Form</span>
          </button>
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}
      {activeTabSub === 'history' ? (
        /* ================= HISTORY LIST TAB ================= */
        <div className="bg-[#0b1329]/80 backdrop-blur-md border border-cyan-500/20 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>DAFTAR RIWAYAT PERMOHONAN CUTI</span>
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Semua permohonan cuti yang telah disimpan tersimpan permanen di database.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Cari nama, NIK, jenis cuti..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-white font-sans text-xs focus:outline-hidden focus:border-cyan-400"
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-mono text-xs border border-dashed border-slate-700 rounded-xl space-y-3">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-medium">
                {historySearch ? 'Tidak ada riwayat cuti yang cocok dengan pencarian.' : 'Belum ada formulir cuti yang disimpan.'}
              </p>
              <button
                onClick={() => setActiveTabSub('editor')}
                className="px-4 py-2 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono hover:bg-cyan-900 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Pengajuan Cuti Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs font-sans text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/95 text-cyan-300 border-b border-cyan-500/30 font-mono text-[11px]">
                    <th className="p-3">TGL DIBUAT</th>
                    <th className="p-3">NAMA PEGAWAI</th>
                    <th className="p-3">NIK</th>
                    <th className="p-3">DIVISI & JABATAN</th>
                    <th className="p-3">PERIODE CUTI</th>
                    <th className="p-3">JENIS CUTI</th>
                    <th className="p-3">DURASI</th>
                    <th className="p-3 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-cyan-950/20 transition-all">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="p-3 font-bold text-white uppercase">
                        {item.nama || '-'}
                      </td>
                      <td className="p-3 text-slate-300">
                        {item.nik || '-'}
                      </td>
                      <td className="p-3 text-slate-300">
                        {item.divisi || '-'} {item.jabatan ? `• ${item.jabatan}` : ''}
                      </td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">
                        {formatIndoDate(item.tanggalMulai)} s/d {formatIndoDate(item.tanggalSelesai)}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-[10px]">
                          {item.jenisCuti || '-'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-cyan-300">
                        {item.jumlahHari || 0} Hari
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenItemPreview(item)}
                          className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-500/40 hover:bg-blue-900 transition-all cursor-pointer text-[11px]"
                          title="Lihat Pratinjau Dokumen A4"
                        >
                          Lihat
                        </button>
                        <button
                          onClick={() => handleLoadItem(item)}
                          className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900 transition-all cursor-pointer text-[11px]"
                          title="Buka dan Edit Formulir"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setModalItemData(item);
                            setTimeout(() => handleExportPdf(item), 100);
                          }}
                          className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-500/40 hover:bg-rose-900 transition-all cursor-pointer text-[11px]"
                          title="Unduh PDF"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.nama)}
                          className="px-2 py-1 rounded bg-red-950/80 text-red-400 border border-red-500/40 hover:bg-red-900 transition-all cursor-pointer"
                          title="Hapus dari riwayat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ================= EDITOR & LIVE SPLIT VIEW ================= */
        <div className="space-y-4">
          {/* MOBILE VIEW TOGGLE SWITCHER (Form Input vs Paper Document) */}
          <div className="flex xl:hidden w-full bg-[#0a1122]/95 p-1 rounded-xl border border-cyan-500/30 shadow-md">
            <button
              type="button"
              onClick={() => setMobileEditorTab('form')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mobileEditorTab === 'form'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Formulir Input</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileEditorTab('preview')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mobileEditorTab === 'preview'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Pratinjau Kertas A4</span>
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: DIGITAL INPUT PANELS (XL: 5 COLUMNS) */}
            <div className={`xl:col-span-5 space-y-4 ${mobileEditorTab === 'preview' ? 'hidden xl:block' : 'block'}`}>
            
            {/* CARD 1: DATA PEGAWAI (Requirement 2) */}
            <div className="bg-[#0b1329]/85 backdrop-blur-md border border-cyan-500/25 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold border-b border-cyan-500/20 pb-2">
                <User className="w-4 h-4 text-cyan-300" />
                <span>I. DATA PEGAWAI (INPUT MANUAL)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        nama: val,
                        diajukanOlehNama: p.diajukanOlehNama === p.nama ? val : (p.diajukanOlehNama || val)
                      }));
                    }}
                    placeholder="Ketik nama lengkap..."
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-white font-sans text-xs focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">NIK (Nomor Induk Karyawan)</label>
                  <input
                    type="text"
                    value={formData.nik}
                    onChange={(e) => setFormData((p) => ({ ...p, nik: e.target.value }))}
                    placeholder="Contoh: 123456"
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Nomor Handphone (No. HP) *</label>
                  <input
                    type="text"
                    value={formData.noHp}
                    onChange={(e) => setFormData((p) => ({ ...p, noHp: e.target.value }))}
                    placeholder="Contoh: 0812xxxxxxxx"
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Divisi</label>
                  <input
                    type="text"
                    value={formData.divisi}
                    onChange={(e) => setFormData((p) => ({ ...p, divisi: e.target.value }))}
                    placeholder="Contoh: Operasional / Teknik"
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-sans text-xs focus:outline-hidden focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Jabatan / Posisi</label>
                  <input
                    type="text"
                    value={formData.jabatan}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((p) => ({
                        ...p,
                        jabatan: val,
                        diajukanOlehJabatan: p.diajukanOlehJabatan === p.jabatan ? val : (p.diajukanOlehJabatan || val)
                      }));
                    }}
                    placeholder="Contoh: Teknisi / Staff"
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-sans text-xs focus:outline-hidden focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: RENCANA CUTI & BEKERJA KEMBALI (Requirement 3) */}
            <div className="bg-[#0b1329]/85 backdrop-blur-md border border-cyan-500/25 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
                  <Calendar className="w-4 h-4 text-cyan-300" />
                  <span>II. RENCANA CUTI & III. BEKERJA KEMBALI</span>
                </div>
                {formData.jumlahHari > 0 && (
                  <div className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold">
                    {formData.jumlahHari} HARI KERJA
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Tanggal Mulai Cuti *</label>
                  <input
                    type="date"
                    value={formData.tanggalMulai}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Tanggal Selesai Cuti *</label>
                  <input
                    type="date"
                    value={formData.tanggalSelesai}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Masuk Bekerja Kembali Pada Tanggal *</label>
                  <input
                    type="date"
                    value={formData.tanggalKembali}
                    onChange={(e) => setFormData((p) => ({ ...p, tanggalKembali: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-sans">
                    Otomatis dihitung H+1 setelah tanggal selesai cuti, namun dapat disesuaikan manual.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 3: JENIS CUTI & ALASAN CUTI (Requirement 4 & 5) */}
            <div className="bg-[#0b1329]/85 backdrop-blur-md border border-cyan-500/25 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
                  <CheckSquare className="w-4 h-4 text-cyan-300" />
                  <span>IV. JENIS CUTI & V. ALASAN CUTI</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Pilih salah satu</span>
              </div>

              {/* 8 Checkbox options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {JENIS_CUTI_OPTIONS.map((opt) => {
                  const isChecked = formData.jenisCuti === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleJenisCutiChange(opt.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                        isChecked ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-slate-600 bg-slate-800'
                      }`}>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-black stroke-[3]" />}
                      </div>
                      <span className="text-[11px] font-sans leading-snug">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* V. ALASAN CUTI */}
              <div className="pt-2">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  V. Alasan Cuti (Otomatis terisi mengikuti jenis cuti, dapat diedit)
                </label>
                <textarea
                  rows={2}
                  value={formData.alasanCuti}
                  onChange={(e) => setFormData((p) => ({ ...p, alasanCuti: e.target.value }))}
                  placeholder="Ketik keterangan atau rincian alasan cuti..."
                  className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-sans text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>
            </div>

            {/* CARD 4: PEJABAT PENGGANTI (Requirement 6) */}
            <div className="bg-[#0b1329]/85 backdrop-blur-md border border-cyan-500/25 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold border-b border-cyan-500/20 pb-2">
                <User className="w-4 h-4 text-cyan-300" />
                <span>VI. PEJABAT PENGGANTI SELAMA CUTI</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Nama Pejabat Pengganti</label>
                  <input
                    type="text"
                    value={formData.penggantiNama}
                    onChange={(e) => setFormData((p) => ({ ...p, penggantiNama: e.target.value }))}
                    placeholder="Nama Pengganti..."
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-sans text-xs focus:outline-hidden focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">No. HP Pengganti</label>
                  <input
                    type="text"
                    value={formData.penggantiNoHp}
                    onChange={(e) => setFormData((p) => ({ ...p, penggantiNoHp: e.target.value }))}
                    placeholder="08xxxxxxxxxx"
                    className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* CARD 5: PARAF DAN PERSETUJUAN (Requirement 7) */}
            <div className="bg-[#0b1329]/85 backdrop-blur-md border border-cyan-500/25 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
                  <Briefcase className="w-4 h-4 text-cyan-300" />
                  <span>VII. PARAF DAN PERSETUJUAN (MANUAL BEBAS)</span>
                </div>
                <span className="text-[10px] text-amber-300 font-mono">Bebas ketik Jabatan</span>
              </div>

              {/* 3 Columns Signees Input */}
              <div className="space-y-3 text-xs">
                {/* 1. Diajukan Oleh */}
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <span className="font-mono text-cyan-400 font-bold text-[11px] block">1. DIAJUKAN OLEH</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Nama</label>
                      <input
                        type="text"
                        value={formData.diajukanOlehNama}
                        onChange={(e) => setFormData((p) => ({ ...p, diajukanOlehNama: e.target.value }))}
                        placeholder="Nama Pemohon"
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Jabatan (Bebas)</label>
                      <input
                        type="text"
                        value={formData.diajukanOlehJabatan}
                        onChange={(e) => setFormData((p) => ({ ...p, diajukanOlehJabatan: e.target.value }))}
                        placeholder="Leadership, Staff, dll."
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Disetujui Oleh */}
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <span className="font-mono text-amber-400 font-bold text-[11px] block">2. DISETUJUI OLEH</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Nama</label>
                      <input
                        type="text"
                        value={formData.disetujuiOlehNama}
                        onChange={(e) => setFormData((p) => ({ ...p, disetujuiOlehNama: e.target.value }))}
                        placeholder="Nama Atasan"
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Jabatan (Bebas)</label>
                      <input
                        type="text"
                        value={formData.disetujuiOlehJabatan}
                        onChange={(e) => setFormData((p) => ({ ...p, disetujuiOlehJabatan: e.target.value }))}
                        placeholder="Supervisor, Manager, dll."
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Mengetahui */}
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <span className="font-mono text-emerald-400 font-bold text-[11px] block">3. MENGETAHUI</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Nama</label>
                      <input
                        type="text"
                        value={formData.mengetahuiNama}
                        onChange={(e) => setFormData((p) => ({ ...p, mengetahuiNama: e.target.value }))}
                        placeholder="Nama Pimpinan"
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Jabatan (Bebas)</label>
                      <input
                        type="text"
                        value={formData.mengetahuiJabatan}
                        onChange={(e) => setFormData((p) => ({ ...p, mengetahuiJabatan: e.target.value }))}
                        placeholder="Area Manager, dll."
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>



            {/* TOMBOL BARU — TERAPKAN (Requirement 5) */}
            <div className="bg-gradient-to-r from-emerald-950/80 to-cyan-950/80 border border-emerald-500/40 p-4 rounded-2xl shadow-xl flex flex-col gap-2">
              <div className="text-[11px] font-mono text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>TERAPKAN DATA KE DOKUMEN</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Pindahkan data input ke posisi masing-masing pada dokumen PDF. Setelah diterapkan, kolom formulir ini dikosongkan agar siap digunakan untuk pengisian berikutnya.
              </p>
              <button
                type="button"
                onClick={handleTerapkan}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.35)] transition-all cursor-pointer active:scale-98"
                id="btn-terapkan-form-cuti-bottom"
              >
                <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                <span>TERAPKAN KE PREVIEW PDF</span>
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: LIVE A4 PAPER PREVIEW (XL: 7 COLUMNS) */}
          <div className={`xl:col-span-7 space-y-3 ${mobileEditorTab === 'form' ? 'hidden xl:block' : 'block'}`}>
            <div className="flex items-center justify-between px-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  DOKUMEN RESMI FORMULIR CUTI (A4)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileEditorTab('form')}
                  className="xl:hidden px-2.5 py-1.5 rounded-xl bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  ← Edit Form
                </button>
                <button
                  onClick={() => {
                    setModalItemData(null);
                    setIsPreviewModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-cyan-300 text-xs font-mono hover:bg-slate-800 hover:border-cyan-500/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Lihat Pratinjau Layar Penuh"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Layar Penuh</span>
                </button>
              </div>
            </div>

            {/* Realistic Workspace Desk Preview Container */}
            <div className="bg-gradient-to-b from-[#0b1220] via-[#080d18] to-[#04070e] p-2 sm:p-6 rounded-2xl border border-slate-800/80 shadow-[inset_0_2px_12px_rgba(0,0,0,0.7)] overflow-x-auto flex justify-center items-start min-h-[500px]">
              {masterPdfBytes ? (
                <div className="w-full flex justify-center min-w-0">
                  <CutiPdfLivePreview
                    masterPdfBytes={masterPdfBytes}
                    formData={appliedDocData}
                    formatIndoDate={formatIndoDate}
                    onUploadTemplate={handleUploadTemplate}
                    onReloadTemplate={handleReloadTemplate}
                    scale={1.0}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-16 text-center text-cyan-300 font-mono text-xs gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <span>Memuat Dokumen PDF Master Asli (Form Cuti master pdf.pdf)...</span>
                </div>
              )}
            </div>
          </div>

        </div>
        </div>
      )}

      {/* FULLSCREEN / DEDICATED PREVIEW MODAL (Requirement 9) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-fade-in">
          
          {/* Modal Top Control Bar */}
          <div className="bg-[#0b1329] border-b border-cyan-500/30 px-4 sm:px-6 py-3 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-950 border border-cyan-400/60 flex items-center justify-center text-cyan-300">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold font-mono text-white">PRATINJAU KERTAS FORMULIR CUTI (A4)</h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  {modalItemData ? `Dokumen riwayat: ${modalItemData.nama || 'Pegawai'}` : 'Master Template A4 Formulir Permohonan Cuti'}
                </p>
              </div>
            </div>

            {/* Zoom & Action Controls */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs font-mono text-slate-300 gap-1.5">
                <button
                  onClick={() => setPreviewZoom((z) => Math.max(50, z - 10))}
                  className="p-1 hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-bold text-cyan-400">{previewZoom}%</span>
                <button
                  onClick={() => setPreviewZoom((z) => Math.min(150, z + 10))}
                  className="p-1 hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewZoom(100)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer ml-1"
                >
                  Reset
                </button>
              </div>

              {/* DOWNLOAD PDF */}
              <button
                onClick={() => handleExportPdf(modalItemData || formData)}
                disabled={isExporting}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD PDF</span>
              </button>

              {/* KIRIM EMAIL */}
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setTimeout(() => handleOpenEmailModal(), 150);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
              >
                <Mail className="w-4 h-4" />
                <span>KIRIM EMAIL</span>
              </button>

              {/* SHARE WHATSAPP */}
              <button
                onClick={() => handleShareWhatsApp()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>SHARE WHATSAPP</span>
              </button>

              {/* CETAK */}
              <button
                onClick={handlePrint}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                title="Cetak langsung (Ctrl+P)"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>CETAK</span>
              </button>

              {/* CLOSE */}
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setModalItemData(null);
                }}
                className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500 flex items-center justify-center cursor-pointer transition-all ml-2"
                title="Tutup Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Canvas Body */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-[#0a0f1d]">
            {masterPdfBytes ? (
              <div className="my-4 flex flex-col items-center">
                <CutiPdfLivePreview
                  masterPdfBytes={masterPdfBytes}
                  formData={modalItemData || (hasContent(appliedDocData) ? appliedDocData : formData)}
                  formatIndoDate={formatIndoDate}
                  onUploadTemplate={handleUploadTemplate}
                  onReloadTemplate={handleReloadTemplate}
                  scale={previewZoom / 100}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 text-center text-cyan-300 font-mono text-xs gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                <span>Memuat Dokumen PDF Master Asli...</span>
              </div>
            )}
          </div>

          {/* Modal Bottom Status Bar */}
          <div className="bg-[#0b1329] border-t border-cyan-500/20 px-6 py-2 text-[11px] font-mono text-slate-400 flex justify-between items-center shrink-0">
            <span>Ukuran Kertas: A4 Portrait (210mm x 297mm) • Master Template Formulir Permohonan Cuti</span>
            <span className="text-cyan-400 font-bold">Tekan Esc atau tombol silang untuk kembali</span>
          </div>

        </div>
      )}

      {/* DEDICATED EMAIL MODAL WITH PDF ATTACHMENT (Requirement 11) */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c152e] border border-cyan-500/40 rounded-2xl max-w-lg w-full shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-[#080d1d] px-5 py-4 border-b border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-400/50 flex items-center justify-center text-blue-300">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-white">KIRIM EMAIL FORM CUTI</h3>
                  <p className="text-[11px] text-slate-400">PDF Formulir Cuti otomatis disertakan sebagai lampiran</p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5 text-xs">
              
              {/* Attachment Badge */}
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="block text-[11px] font-mono font-bold text-white truncate">
                      {getCutiPdfFileName(modalItemData || formData)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {isGeneratingEmailPdf ? 'Menyiapkan PDF...' : '✓ Lampiran PDF A4 Siap Dikirim'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportPdf(modalItemData || formData)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-mono cursor-pointer shrink-0"
                >
                  Unduh
                </button>
              </div>

              {/* Email To Input */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Alamat Email Tujuan *
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="contoh: human.capital@21cineplex.com"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Subjek Email *
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subjek email..."
                  className="w-full h-10 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-sans text-xs focus:outline-hidden focus:border-cyan-400"
                />
              </div>

              {/* Body Textarea */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Pesan / Email Body
                </label>
                <textarea
                  rows={4}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono text-[11px] focus:outline-hidden focus:border-cyan-400 leading-relaxed"
                />
              </div>

              {/* Error Message Box if sending fails (Requirement 11: tampilkan error, jangan anggap berhasil) */}
              {emailErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Pengiriman Email Belum Berhasil</span>
                      <span>{emailErrorMsg}</span>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-rose-500/30">
                    <button
                      type="button"
                      onClick={handleEmailFallbackMailto}
                      className="px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-white text-[10px] font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF & Buka Aplikasi Email (mailto)</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-[#080d1d] px-5 py-3 border-t border-cyan-500/20 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSendEmailSubmit}
                disabled={isSendingEmail || isGeneratingEmailPdf}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>MENGIRIM EMAIL...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>KIRIM EMAIL SEKARANG</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
