/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import {
  ReportHistoryItem,
  HistoryCategory
} from '../types';
import {
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Trash2,
  Edit,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  ClipboardList,
  Calendar,
  Building,
  Wrench,
  UserCheck,
  RotateCcw,
  Sparkles,
  Info,
  Eye
} from 'lucide-react';

interface ReportHistoryViewProps {
  reportHistories: ReportHistoryItem[];
  onSave: (item: ReportHistoryItem) => void;
  onDelete: (id: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const STUDIOS = [
  'ALL STUDIOS',
  'STUDIO 1',
  'STUDIO 2',
  'STUDIO 3',
  'STUDIO 4',
  'STUDIO 5',
  'STUDIO 6',
  'STUDIO 7',
  'STUDIO 8',
  'PREM 1',
  'PREM 2',
  'LOBBY / AREA'
];

const CATEGORIES: HistoryCategory[] = [
  'PROJECTOR',
  'SERVER',
  'SOUND SYSTEM',
  'LAIN-LAIN'
];

export default function ReportHistoryView({
  reportHistories,
  onSave,
  onDelete,
  onShowToast
}: ReportHistoryViewProps) {
  // Filters
  const [selectedStudio, setSelectedStudio] = useState<string>('STUDIO 1');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // View Mode: 'dark' (Modern Dark Cyber Theme) or 'paper' (Paper Form Preview)
  const [viewMode, setViewMode] = useState<'dark' | 'paper'>('dark');
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const isExportingRef = useRef<boolean>(false);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReportHistoryItem | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    tanggal: string;
    studio: string;
    kategori: HistoryCategory;
    unitPart: string;
    keterangan: string;
    parafTeknisi: string;
    parafTeamlead: string;
    parafManager: string;
  }>({
    tanggal: new Date().toISOString().split('T')[0],
    studio: 'STUDIO 1',
    kategori: 'PROJECTOR',
    unitPart: '',
    keterangan: '',
    parafTeknisi: 'Ngatemin (Pak Min)',
    parafTeamlead: 'Andri (Pasbro)',
    parafManager: 'Manager XXI'
  });

  // Filtered List
  const filteredList = useMemo(() => {
    return reportHistories.filter((item) => {
      // Studio filter
      if (selectedStudio !== 'ALL STUDIOS' && item.studio !== selectedStudio) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'ALL' && item.kategori !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchUnit = item.unitPart?.toLowerCase().includes(q);
        const matchKet = item.keterangan?.toLowerCase().includes(q);
        const matchTeknisi = item.parafTeknisi?.toLowerCase().includes(q);
        const matchStudio = item.studio?.toLowerCase().includes(q);
        if (!matchUnit && !matchKet && !matchTeknisi && !matchStudio) {
          return false;
        }
      }
      // Date Range Filter
      if (startDate && item.tanggal < startDate) return false;
      if (endDate && item.tanggal > endDate) return false;

      return true;
    });
  }, [reportHistories, selectedStudio, selectedCategory, searchQuery, startDate, endDate]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredList.length;
    const proj = filteredList.filter((i) => i.kategori === 'PROJECTOR').length;
    const server = filteredList.filter((i) => i.kategori === 'SERVER').length;
    const sound = filteredList.filter((i) => i.kategori === 'SOUND SYSTEM').length;
    const lain = filteredList.filter((i) => i.kategori === 'LAIN-LAIN').length;
    return { total, proj, server, sound, lain };
  }, [filteredList]);

  // Handle Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      studio: selectedStudio === 'ALL STUDIOS' ? 'STUDIO 1' : selectedStudio,
      kategori: 'PROJECTOR',
      unitPart: '',
      keterangan: '',
      parafTeknisi: 'Ngatemin (Pak Min)',
      parafTeamlead: 'Andri (Pasbro)',
      parafManager: 'Manager XXI'
    });
    setIsModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (item: ReportHistoryItem) => {
    setEditingItem(item);
    setFormData({
      tanggal: item.tanggal || new Date().toISOString().split('T')[0],
      studio: item.studio || 'STUDIO 1',
      kategori: item.kategori || 'PROJECTOR',
      unitPart: item.unitPart || '',
      keterangan: item.keterangan || '',
      parafTeknisi: item.parafTeknisi || 'Ngatemin (Pak Min)',
      parafTeamlead: item.parafTeamlead || 'Andri (Pasbro)',
      parafManager: item.parafManager || 'Manager XXI'
    });
    setIsModalOpen(true);
  };

  // Handle Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitPart.trim() || !formData.keterangan.trim()) {
      if (onShowToast) onShowToast('Mohon lengkapi Nama Unit/Part dan Keterangan!', 'warning');
      return;
    }

    const newItem: ReportHistoryItem = {
      id: editingItem ? editingItem.id : `rh-${Date.now()}`,
      no: editingItem ? editingItem.no : filteredList.length + 1,
      tanggal: formData.tanggal,
      studio: formData.studio,
      kategori: formData.kategori,
      unitPart: formData.unitPart.trim(),
      keterangan: formData.keterangan.trim(),
      parafTeknisi: formData.parafTeknisi.trim() || 'Ngatemin (Pak Min)',
      parafTeamlead: formData.parafTeamlead.trim() || 'Andri (Pasbro)',
      parafManager: formData.parafManager.trim() || 'Manager XXI'
    };

    onSave(newItem);
    setIsModalOpen(false);
    if (onShowToast) {
      onShowToast(
        editingItem ? 'Data history berhasil diperbarui!' : 'Data history baru berhasil ditambahkan!',
        'success'
      );
    }
  };

  // Handle Delete
  const handleDeleteItem = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data riwayat pergantian unit ini?')) {
      onDelete(id);
      if (onShowToast) onShowToast('Data history berhasil dihapus.', 'info');
    }
  };

  // Handle Export PDF & Cetak Form
  const handleExportPDF = () => {
    if (isExportingRef.current) return;
    try {
      isExportingRef.current = true;
      setIsExportingPDF(true);
      if (onShowToast) onShowToast('Sedang membuat file PDF Laporan XXI...', 'info');

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
      const marginX = 10;

      // 1. Header Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('LIPPO MALL PURI XXI 2025 – 2026', pageWidth / 2, 11, { align: 'center' });

      // Subheader Box
      const boxY = 14;
      const boxHeight = 8;
      const boxWidth = pageWidth - (marginX * 2);
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, boxY, boxWidth, boxHeight, 1, 1, 'FD');

      // Subheader Text
      doc.setFontSize(8.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('FORM HISTORY PERGANTIAN UNIT / SPAREPART BIOSKOP : LMP ( LIPPO MALL PURI XXI )', marginX + 3, boxY + 5.2);
      
      const studioText = `STUDIO : ${selectedStudio === 'ALL STUDIOS' || selectedStudio === 'ALL' ? 'SEMUA STUDIO' : selectedStudio.toUpperCase()}`;
      doc.setTextColor(15, 23, 42);
      doc.text(studioText, pageWidth - marginX - 3, boxY + 5.2, { align: 'right' });

      // 2. Table Header Structure
      const tableHead = [
        [
          { content: 'NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'HARI & TANGGAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'UNIT / PART YANG DIGANTI', colSpan: 4, styles: { halign: 'center', valign: 'middle' } },
          { content: 'PARAF TEKNISI', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'PARAF TEAMLEAD', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'PARAF MANAGER', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'KETERANGAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        ],
        [
          { content: 'PROJECTOR', styles: { halign: 'center', valign: 'middle', fontSize: 6.8 } },
          { content: 'SERVER', styles: { halign: 'center', valign: 'middle', fontSize: 6.8 } },
          { content: 'SOUND SYSTEM', styles: { halign: 'center', valign: 'middle', fontSize: 6.5 } },
          { content: 'LAIN - LAIN', styles: { halign: 'center', valign: 'middle', fontSize: 6.8 } },
        ]
      ];

      // 3. Table Body Rows
      const tableBody = filteredList.length > 0 
        ? filteredList.map((item, idx) => {
            const kat = (item.kategori || '').toUpperCase();
            return [
              String(idx + 1),
              String(item.tanggal || '-'),
              kat.includes('PROJECTOR') ? 'X' : '-',
              kat.includes('SERVER') ? 'X' : '-',
              kat.includes('SOUND') ? 'X' : '-',
              (!kat.includes('PROJECTOR') && !kat.includes('SERVER') && !kat.includes('SOUND')) ? 'X' : '-',
              String(item.parafTeknisi || 'OK'),
              String(item.parafTeamlead || 'OK'),
              String(item.parafManager || 'OK'),
              `${item.unitPart ? `[${item.unitPart}] ` : ''}${item.keterangan || ''}`
            ];
          })
        : [[
            { content: 'Belum ada data history pergantian unit/sparepart.', colSpan: 10, styles: { halign: 'center', fontStyle: 'italic' } }
          ]];

      // 4. Render Table
      // @ts-ignore
      autoTable(doc, {
        startY: 24.5,
        margin: { left: marginX, right: marginX },
        head: tableHead as any,
        body: tableBody as any,
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2,
          lineColor: [148, 163, 184],
          lineWidth: 0.25,
          textColor: [15, 23, 42],
          valign: 'middle'
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.2,
          cellPadding: { top: 2.2, bottom: 2.2, left: 0.3, right: 0.3 },
          halign: 'center',
          valign: 'middle'
        },
        didParseCell: (data) => {
          if (data.section === 'head') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.halign = 'center';
            data.cell.styles.valign = 'middle';
            data.cell.styles.textColor = [255, 255, 255];
          }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 35, halign: 'center', fontStyle: 'italic', fontSize: 7.2 },
          7: { cellWidth: 30, halign: 'center', fontStyle: 'italic', fontSize: 7.2 },
          8: { cellWidth: 28, halign: 'center', fontStyle: 'italic', fontSize: 7.2 },
          9: { cellWidth: 'auto', halign: 'left' }
        },
        theme: 'grid'
      });

      // 5. Footer Contacts
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : 175;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text('INFORMASI KONTAK TEKNISI AREA ( MTE ) : NGATEMIN ( PAK MIN ) - HP : 081584051998 | EMAIL : ngateminxxi@gmail.com', marginX, finalY);
      doc.text('INFORMASI KONTAK CHIKO AREA : ANDRI ( PASBRO ) - HP : 0895611985949 | EMAIL : andri21cineplex@gmail.com', marginX, finalY + 4);

      const studioLabel = selectedStudio.replace(/\s+/g, '_');
      const fileName = `Report_History_LMP_XXI_${studioLabel}_${new Date().toISOString().slice(0, 10)}.pdf`;

      // EXACTLY ONE DOWNLOAD TRIGGER
      doc.save(fileName);

      if (onShowToast) onShowToast('✅ File PDF berhasil di-download!', 'success');
    } catch (error) {
      console.error('PDF Export failed:', error);
      if (onShowToast) onShowToast('Membuka window cetak / PDF browser...', 'warning');
      setViewMode('paper');
      setTimeout(() => window.print(), 100);
    } finally {
      setIsExportingPDF(false);
      setTimeout(() => {
        isExportingRef.current = false;
      }, 1000);
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      if (onShowToast) onShowToast('Tidak ada data untuk diexport.', 'warning');
      return;
    }

    const headers = ['No', 'Tanggal', 'Studio', 'Kategori', 'Unit/Part', 'Keterangan', 'Teknisi', 'Teamlead', 'Manager'];
    const rows = filteredList.map((item, idx) => [
      idx + 1,
      item.tanggal,
      item.studio,
      item.kategori,
      `"${(item.unitPart || '').replace(/"/g, '""')}"`,
      `"${(item.keterangan || '').replace(/"/g, '""')}"`,
      `"${(item.parafTeknisi || '').replace(/"/g, '""')}"`,
      `"${(item.parafTeamlead || '').replace(/"/g, '""')}"`,
      `"${(item.parafManager || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `REPORT_HISTORY_PERGANTIAN_UNIT_${selectedStudio.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) onShowToast('Data berhasil diexport ke CSV!', 'success');
  };

  // Format Date display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Printable CSS Rules (Only visible during window.print()) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-form, #printable-report-form * {
            visibility: visible;
          }
          #printable-report-form {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            color: #000 !important;
            background: #fff !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
            color: #000 !important;
          }
          th {
            background-color: #f0f0f0 !important;
            text-align: center !important;
          }
        }
      `}</style>

      {/* Screen Header Banner */}
      <div className="no-print p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-amber-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(251,191,36,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold tracking-widest uppercase mb-1">
              <ClipboardList className="w-4 h-4" />
              <span>DOKUMEN HISTORI TEKNISI BIOSKOP</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase font-sans flex items-center gap-2">
              FORM HISTORY PERGANTIAN UNIT / SPAREPART
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-mono mt-1">
              CINEMA XXI • LIPPO MALL PURI (NSR014) — Log Pencatatan Pekerjaan & Penggantian Suku Cadang Studio
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                onClick={() => setViewMode('dark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'dark'
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📊 Digital UI
              </button>
              <button
                onClick={() => setViewMode('paper')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'paper'
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📄 Form Asli
              </button>
            </div>

            {/* Direct Preview Button */}
            <button
              onClick={() => setViewMode(viewMode === 'paper' ? 'dark' : 'paper')}
              className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-lg ${
                viewMode === 'paper'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              }`}
              id="btn-preview-history"
              title="Klik untuk melihat pratinjau Form Cetak Fisik sebelum dicetak/export PDF"
            >
              <Eye className="w-4 h-4 text-cyan-200" />
              <span>{viewMode === 'paper' ? 'TUTUP PREVIEW' : '👁️ PREVIEW FORM'}</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs font-mono flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.4)] active:scale-95 transition-all cursor-pointer"
              id="btn-add-history"
            >
              <Plus className="w-4 h-4" />
              <span>+ TAMBAH HISTORY</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white border border-rose-400/50 text-xs font-mono font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              id="btn-print-history"
              title="Export Laporan Pergantian Unit ke PDF (Form Asli Lippo Mall Puri XXI)"
            >
              <Download className={`w-4 h-4 text-rose-100 ${isExportingPDF ? 'animate-bounce' : ''}`} />
              <span>{isExportingPDF ? 'PROSES PDF...' : 'EXPORT PDF'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              id="btn-export-history"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>EXPORT CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 text-center">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Record</p>
            <p className="text-xl font-black text-amber-300 font-mono mt-0.5">{stats.total}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-center">
            <p className="text-[10px] font-mono font-bold text-cyan-400 uppercase">Projector</p>
            <p className="text-xl font-black text-cyan-300 font-mono mt-0.5">{stats.proj}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 text-center">
            <p className="text-[10px] font-mono font-bold text-rose-400 uppercase">Server</p>
            <p className="text-xl font-black text-rose-300 font-mono mt-0.5">{stats.server}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-center">
            <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Sound System</p>
            <p className="text-xl font-black text-emerald-300 font-mono mt-0.5">{stats.sound}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] font-mono font-bold text-purple-400 uppercase">Lain-Lain</p>
            <p className="text-xl font-black text-purple-300 font-mono mt-0.5">{stats.lain}</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="no-print p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md space-y-4">
        {/* Studio Tabs horizontal scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase shrink-0 flex items-center gap-1 mr-1">
            <Building className="w-3.5 h-3.5" /> STUDIO:
          </span>
          {STUDIOS.map((std) => {
            const isActive = selectedStudio === std;
            return (
              <button
                key={std}
                onClick={() => setSelectedStudio(std)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black shrink-0 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300'
                }`}
              >
                {std}
              </button>
            );
          })}
        </div>

        {/* Secondary filters: Category, Search, Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
              Kategori Equipment
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
            >
              <option value="ALL">SEMUA KATEGORI</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
              Pencarian Kata Kunci
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari part, keterangan, teknisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* End Date & Reset */}
          <div>
            <label className="block text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
              Sampai Tanggal
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
              />
              {(searchQuery || selectedCategory !== 'ALL' || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 cursor-pointer"
                  title="Reset Filter"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DIGITAL DARK THEME UI VIEW */}
      {viewMode === 'dark' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
            <div>
              <h2 className="text-lg font-black text-amber-300 font-mono uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                RIWAYAT PERGANTIAN UNIT — {selectedStudio === 'ALL STUDIOS' ? 'SEMUA STUDIO' : selectedStudio}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Pencatatan pergantian suku cadang dan perbaikan peralatan bioskop
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-500/40 font-bold self-start sm:self-auto">
              {filteredList.length} Record Ditemukan
            </span>
          </div>

          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-mono bg-slate-950/50 rounded-xl border border-slate-800">
              <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">Belum ada catatan riwayat untuk {selectedStudio}.</p>
              <p className="text-xs text-slate-500 mt-1">Klik "+ TAMBAH HISTORY" diatas untuk mencatat pekerjaan baru.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 text-amber-400 font-bold border-b border-slate-800">
                    <th className="p-3 w-12 text-center">NO</th>
                    <th className="p-3 w-28">TANGGAL</th>
                    <th className="p-3 w-28">STUDIO</th>
                    <th className="p-3 w-36">KATEGORI</th>
                    <th className="p-3 min-w-[180px]">UNIT / PART</th>
                    <th className="p-3 min-w-[220px]">KETERANGAN</th>
                    <th className="p-3 w-32">TEKNISI</th>
                    <th className="p-3 w-32">TIMLEAD</th>
                    <th className="p-3 w-32">MANAGER</th>
                    <th className="p-3 w-20 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredList.map((item, idx) => {
                    // Category badge color
                    let badgeBg = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
                    if (item.kategori === 'PROJECTOR') badgeBg = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
                    if (item.kategori === 'SERVER') badgeBg = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                    if (item.kategori === 'SOUND SYSTEM') badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition-colors text-slate-200">
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 text-cyan-300 font-bold whitespace-nowrap">{formatDateDisplay(item.tanggal)}</td>
                        <td className="p-3 font-bold text-amber-300">{item.studio}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${badgeBg}`}>
                            {item.kategori}
                          </span>
                        </td>
                        <td className="p-3 font-black text-white">{item.unitPart}</td>
                        <td className="p-3 text-slate-300 uppercase leading-relaxed">{item.keterangan}</td>
                        <td className="p-3 text-slate-400 text-[11px] font-sans">{item.parafTeknisi || '-'}</td>
                        <td className="p-3 text-slate-400 text-[11px] font-sans">{item.parafTeamlead || '-'}</td>
                        <td className="p-3 text-slate-400 text-[11px] font-sans">{item.parafManager || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 transition-all cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                              title="Hapus Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Technical Footer Information */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs text-slate-400">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-amber-400 font-bold uppercase block mb-0.5">📞 Kontak MTE / Teknisi:</span>
              Ngatemin (Pak Min) — HP: <span className="text-white font-bold">081584051998</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-cyan-400 font-bold uppercase block mb-0.5">📞 Kontak Chiko / Timlead:</span>
              Andri (Pasbro) — HP: <span className="text-white font-bold">0895611985949</span>
            </div>
          </div>
        </div>
      )}

      {/* PAPER FORM PREVIEW MODE (or PRINT TARGET) */}
      {(viewMode === 'paper' || true) && (
        <div
          id="printable-report-form"
          className={`${
            viewMode === 'paper' ? 'block' : 'hidden'
          } p-6 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-2xl space-y-6 overflow-x-auto`}
        >
          {/* Paper Form Official Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center">
            <p className="text-sm font-black font-mono tracking-widest text-slate-700 uppercase">
              LIPPO MALL PURI XXI 2025 – 2026
            </p>
            <h2 className="text-lg sm:text-xl font-black font-sans tracking-tight text-slate-900 uppercase mt-1">
              FORM HISTORY PERGANTIAN UNIT / SPAREPART BIOSKOP : LMP ( LIPPO MALL PURI XXI )
            </h2>
            <div className="inline-block mt-2 px-4 py-1 rounded bg-slate-900 text-amber-300 font-mono font-black text-sm uppercase">
              STUDIO : {selectedStudio === 'ALL STUDIOS' ? 'SEMUA STUDIO' : selectedStudio}
            </div>
          </div>

          {/* Paper Form Table Structure */}
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono">
              <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold">Belum ada catatan riwayat pergantian unit untuk {selectedStudio}.</p>
              <p className="text-xs text-slate-400 mt-1">Klik tombol "+ TAMBAH RECORD HISTORY" diatas untuk mencatat pekerjaan baru.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse border border-slate-900 text-xs font-sans">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-black text-center font-mono">
                  <th className="border border-slate-900 p-2.5 w-12 text-center align-middle" rowSpan={2}>
                    NO
                  </th>
                  <th className="border border-slate-900 p-2.5 w-28 text-center align-middle" rowSpan={2}>
                    HARI & TANGGAL
                  </th>
                  <th className="border border-slate-900 p-2.5 text-center align-middle" colSpan={4}>
                    UNIT / PART YANG DIGANTI
                  </th>
                  <th className="border border-slate-900 p-2.5 w-24 text-center align-middle" rowSpan={2}>
                    PARAF TEKNISI
                  </th>
                  <th className="border border-slate-900 p-2.5 w-28 text-center align-middle" rowSpan={2}>
                    PARAF CHIKO/TIMLEAD
                  </th>
                  <th className="border border-slate-900 p-2.5 w-24 text-center align-middle" rowSpan={2}>
                    PARAF MANAGER
                  </th>
                  <th className="border border-slate-900 p-2.5 text-center align-middle min-w-[180px]" rowSpan={2}>
                    KETERANGAN
                  </th>
                  <th className="border border-slate-900 p-2.5 w-20 no-print text-center align-middle" rowSpan={2}>
                    AKSI
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-900 font-black text-center font-mono text-[10px]">
                  <th className="border border-slate-900 p-2 w-24 text-center align-middle">PROJECTOR</th>
                  <th className="border border-slate-900 p-2 w-24 text-center align-middle">SERVER</th>
                  <th className="border border-slate-900 p-2 w-24 text-center align-middle">SOUND SISTEM</th>
                  <th className="border border-slate-900 p-2 w-24 text-center align-middle">LAIN-LAIN</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const isProjector = item.kategori === 'PROJECTOR';
                  const isServer = item.kategori === 'SERVER';
                  const isSound = item.kategori === 'SOUND SYSTEM';
                  const isLain = item.kategori === 'LAIN-LAIN';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-900 text-slate-900">
                      <td className="border border-slate-900 p-2 text-center font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-900 p-2 text-center font-mono font-semibold">
                        {formatDateDisplay(item.tanggal)}
                      </td>

                      {/* PROJECTOR Column */}
                      <td className="border border-slate-900 p-2 text-center font-mono">
                        {isProjector ? (
                          <span className="font-bold text-slate-900 uppercase">{item.unitPart}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* SERVER Column */}
                      <td className="border border-slate-900 p-2 text-center font-mono">
                        {isServer ? (
                          <span className="font-bold text-slate-900 uppercase">{item.unitPart}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* SOUND SYSTEM Column */}
                      <td className="border border-slate-900 p-2 text-center font-mono">
                        {isSound ? (
                          <span className="font-bold text-slate-900 uppercase">{item.unitPart}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* LAIN-LAIN Column */}
                      <td className="border border-slate-900 p-2 text-center font-mono">
                        {isLain ? (
                          <span className="font-bold text-slate-900 uppercase">{item.unitPart}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* PARAF TEKNISI */}
                      <td className="border border-slate-900 p-2 text-center font-sans text-[11px] font-semibold">
                        {item.parafTeknisi || '-'}
                      </td>

                      {/* PARAF TEAMLEAD */}
                      <td className="border border-slate-900 p-2 text-center font-sans text-[11px] font-semibold">
                        {item.parafTeamlead || '-'}
                      </td>

                      {/* PARAF MANAGER */}
                      <td className="border border-slate-900 p-2 text-center font-sans text-[11px] font-semibold">
                        {item.parafManager || '-'}
                      </td>

                      {/* KETERANGAN */}
                      <td className="border border-slate-900 p-2 font-mono text-[11px] font-semibold uppercase">
                        {item.keterangan}
                        {selectedStudio === 'ALL STUDIOS' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[9px] font-bold">
                            [{item.studio}]
                          </span>
                        )}
                      </td>

                      {/* AKSI (NO PRINT) */}
                      <td className="border border-slate-900 p-2 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 rounded hover:bg-slate-200 text-amber-700 cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                            title="Hapus Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Official Footer Notes */}
          <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono font-semibold text-slate-800">
            <div className="p-2.5 rounded bg-slate-100 border border-slate-300">
              <p className="font-bold text-slate-900 uppercase">INFORMASI KONTAK TEKNISI AREA (MTE):</p>
              <p className="mt-0.5">NGATEMIN (PAK MIN) — HP: <span className="font-bold">081584051998</span></p>
            </div>
            <div className="p-2.5 rounded bg-slate-100 border border-slate-300">
              <p className="font-bold text-slate-900 uppercase">INFORMASI KONTAK CHIKO AREA:</p>
              <p className="mt-0.5">ANDRI (PASBRO) — HP: <span className="font-bold">0895611985949</span></p>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-2xl sm:max-w-3xl w-full p-6 sm:p-8 text-white shadow-[0_0_60px_rgba(251,191,36,0.25)] animate-scale-in my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3 text-amber-400 font-mono font-bold text-base sm:text-lg">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-inner">
                  <Wrench className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white text-base sm:text-lg font-black tracking-wide">
                    {editingItem ? 'EDIT RECORD HISTORY' : 'CATAT PERGANTIAN UNIT / SPAREPART'}
                  </h3>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    Lippo Mall Puri XXI — Form Pergantian Unit & Sparepart
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors border border-transparent hover:border-slate-700 active:scale-95"
                title="Tutup Dialog"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-6 mt-6 font-mono text-sm">
              {/* Row 1: Tanggal & Studio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider flex items-center justify-between">
                    <span>Hari / Tanggal <span className="text-rose-400 font-bold">*</span></span>
                    <span className="text-[11px] text-cyan-400 font-normal">Klik untuk kalender</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as any).showPicker?.();
                      } catch (_) {}
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-amber-400/80 text-white text-sm sm:text-base font-semibold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all cursor-pointer shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                    Lokasi / Studio <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <select
                    value={formData.studio}
                    onChange={(e) => setFormData({ ...formData, studio: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-amber-400/80 text-white text-sm sm:text-base font-semibold focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all cursor-pointer shadow-inner"
                  >
                    {STUDIOS.filter((s) => s !== 'ALL STUDIOS').map((s) => (
                      <option key={s} value={s} className="bg-slate-900 text-white py-2">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Kategori Equipment */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                  Kategori Equipment <span className="text-rose-400 font-bold">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CATEGORIES.map((cat) => {
                    const isSelected = formData.kategori === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setFormData({ ...formData, kategori: cat })}
                        className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-1 ring-amber-400'
                            : 'bg-slate-950 text-slate-400 border-slate-700/80 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'bg-slate-600'}`} />
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Nama Unit / Sparepart */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                  Nama Unit / Part Yang Diganti <span className="text-rose-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Barco SP 35B 4K / Flash Card IMS / Panel Lampu Dimer"
                  value={formData.unitPart}
                  onChange={(e) => setFormData({ ...formData, unitPart: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-amber-400/80 text-white text-sm sm:text-base font-medium placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all shadow-inner"
                />
                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">Pilihan Cepat:</span>
                  {[
                    'Barco SP 35B 4K',
                    'Flash Card IMS',
                    'Panel Lampu Dimer',
                    'Speaker Low 1030',
                    'Convergent + Scanplug',
                    'Lampu Xenon 4.5kW'
                  ].map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      onClick={() => setFormData({ ...formData, unitPart: chip })}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all active:scale-95 font-medium"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Keterangan */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-2 text-xs sm:text-sm tracking-wider">
                  Keterangan Pekerjaan / Alasan Replacement <span className="text-rose-400 font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: GANTI PROJ BARCO SP 35B 4K KARENA ERROR OPTIK"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-amber-400/80 text-white text-sm sm:text-base font-medium placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all leading-relaxed shadow-inner"
                />
              </div>

              {/* Row 5: Paraf Approval Section */}
              <div className="pt-4 border-t border-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Paraf / Verifikasi Petugas
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Otomatis terisi / dapat diedit
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2 tracking-wider">
                      Paraf Teknisi
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Teknisi"
                      value={formData.parafTeknisi}
                      onChange={(e) => setFormData({ ...formData, parafTeknisi: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-amber-400/80 text-white text-sm font-medium placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2 tracking-wider">
                      Paraf Timlead
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Timlead"
                      value={formData.parafTeamlead}
                      onChange={(e) => setFormData({ ...formData, parafTeamlead: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-amber-400/80 text-white text-sm font-medium placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2 tracking-wider">
                      Paraf Manager
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Manager"
                      value={formData.parafManager}
                      onChange={(e) => setFormData({ ...formData, parafManager: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 hover:border-amber-400/80 text-white text-sm font-medium placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer / Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm cursor-pointer transition-all border border-slate-700 active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(251,191,36,0.35)] active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{editingItem ? 'Simpan Perubahan' : 'Simpan History'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
