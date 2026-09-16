/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Area, Equipment, EquipmentStatus } from '../types';
import { Plus, Edit2, Trash2, Map, List, Check, Wrench, Minus, Info, CheckCircle, AlertCircle, XCircle, FileText, Download, CheckSquare, Square, Loader2, Sparkles, Printer, Eye } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toJpeg } from 'html-to-image';

interface MasterAreaProps {
  areas: Area[];
  onSave: (area: Area) => void;
  onDelete: (id: string) => void;
  equipment: Equipment[];
  onSaveEquipment: (eq: Equipment) => void;
  onDeleteEquipment: (id: string) => void;
}

export default function MasterArea({
  areas,
  onSave,
  onDelete,
  equipment,
  onSaveEquipment,
  onDeleteEquipment
}: MasterAreaProps) {
  // Area states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [error, setError] = useState('');

  // Selected Area for managing its equipment
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  // Equipment states
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [isEqConfirmOpen, setIsEqConfirmOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);
  const [deletingEqId, setDeletingEqId] = useState<string | null>(null);

  // Equipment form states
  const [eqName, setEqName] = useState('');
  const [eqQuantity, setEqQuantity] = useState(1);
  const [eqStatus, setEqStatus] = useState<EquipmentStatus>('Normal');
  const [eqKeterangan, setEqKeterangan] = useState('');
  const [eqErrors, setEqErrors] = useState<Record<string, string>>({});

  // Export PDF States & Ref
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'all' | 'custom'>('all');
  const [selectedExportAreaIds, setSelectedExportAreaIds] = useState<string[]>([]);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Custom Signature (TTD) States
  const [signer1Title, setSigner1Title] = useState('Dibuat Oleh,');
  const [signer1Name, setSigner1Name] = useState('Teknisi XXI');
  const [signer1Role, setSigner1Role] = useState('Teknisi Engineering');

  const [signer2Title, setSigner2Title] = useState('Disetujui Oleh,');
  const [signer2Name, setSigner2Name] = useState('Chief Engineer');
  const [signer2Role, setSigner2Role] = useState('Chief Engineering XXI');

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  // Auto-select first area on mount / area updates
  useEffect(() => {
    if (areas.length > 0) {
      if (!selectedAreaId || !areas.find((a) => a.id === selectedAreaId)) {
        setSelectedAreaId(areas[0].id);
      }
    } else {
      setSelectedAreaId(null);
    }
  }, [areas, selectedAreaId]);

  // Export PDF Handlers
  const openExportModal = (initialAreaId?: string) => {
    if (initialAreaId) {
      setExportMode('custom');
      setSelectedExportAreaIds([initialAreaId]);
    } else {
      setExportMode('all');
      setSelectedExportAreaIds(areas.map((a) => a.id));
    }
    setIsExportModalOpen(true);
  };

  const toggleSelectAllExport = () => {
    if (selectedExportAreaIds.length === areas.length) {
      setSelectedExportAreaIds([]);
    } else {
      setSelectedExportAreaIds(areas.map((a) => a.id));
    }
  };

  const toggleAreaExport = (id: string) => {
    setSelectedExportAreaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const exportAreasToRender = exportMode === 'all'
    ? areas
    : areas.filter((a) => selectedExportAreaIds.includes(a.id));

  const exportEquipmentToRender = equipment.filter((eq) =>
    exportAreasToRender.some((a) => a.id === eq.areaId)
  );
  const totalNormal = exportEquipmentToRender.filter((e) => e.status === 'Normal').length;
  const totalMaintenance = exportEquipmentToRender.filter((e) => e.status === 'Maintenance').length;
  const totalRusak = exportEquipmentToRender.filter((e) => e.status === 'Rusak').length;

  // Smart Pagination Algorithm: Distributes areas, summary & signatures into page sheets cleanly
  const paginatedExportPages = useMemo(() => {
    if (exportAreasToRender.length === 0) {
      return [{
        pageIndex: 0,
        areas: [],
        hasSummary: includeSummary,
        hasSignatures: includeSignatures
      }];
    }

    const PAGE_HEIGHT = 880; // Maximum content height in pixels for 800px width page
    const pages: Array<{
      pageIndex: number;
      areas: Area[];
      hasSummary: boolean;
      hasSignatures: boolean;
    }> = [];

    let currentPageAreas: Area[] = [];
    let currentHeight = 170; // Header on page 1 takes ~170px
    let currentPageIndex = 0;

    for (let i = 0; i < exportAreasToRender.length; i++) {
      const area = exportAreasToRender[i];
      const eqCount = equipment.filter((e) => e.areaId === area.id).length;
      // Formula: base overhead (110px) + equipment rows (32px each)
      const cardHeight = 110 + eqCount * 32;

      if (currentPageAreas.length > 0 && currentHeight + cardHeight > PAGE_HEIGHT) {
        pages.push({
          pageIndex: currentPageIndex,
          areas: currentPageAreas,
          hasSummary: false,
          hasSignatures: false,
        });

        currentPageIndex++;
        currentPageAreas = [area];
        currentHeight = 65 + cardHeight; // Mini header on page 2+ takes ~65px
      } else {
        currentPageAreas.push(area);
        currentHeight += cardHeight + 16;
      }
    }

    const summaryHeight = includeSummary ? 120 : 0;
    const signatureHeight = includeSignatures ? 150 : 0;

    if (currentHeight + summaryHeight + signatureHeight <= PAGE_HEIGHT) {
      pages.push({
        pageIndex: currentPageIndex,
        areas: currentPageAreas,
        hasSummary: includeSummary,
        hasSignatures: includeSignatures,
      });
    } else if (currentHeight + summaryHeight <= PAGE_HEIGHT) {
      pages.push({
        pageIndex: currentPageIndex,
        areas: currentPageAreas,
        hasSummary: includeSummary,
        hasSignatures: false,
      });
      pages.push({
        pageIndex: currentPageIndex + 1,
        areas: [],
        hasSummary: false,
        hasSignatures: includeSignatures,
      });
    } else {
      pages.push({
        pageIndex: currentPageIndex,
        areas: currentPageAreas,
        hasSummary: false,
        hasSignatures: false,
      });
      pages.push({
        pageIndex: currentPageIndex + 1,
        areas: [],
        hasSummary: includeSummary,
        hasSignatures: includeSignatures,
      });
    }

    return pages;
  }, [exportAreasToRender, equipment, includeSummary, includeSignatures]);

  const handleDownloadPdf = async (targetAreasParam?: Area[]) => {
    const targetAreas = targetAreasParam || exportAreasToRender;

    if (targetAreas.length === 0) {
      alert('Pilih minimal satu area untuk di-export ke PDF.');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgress('Mengekstrak templat dokumen...');

    const wrapper = pdfWrapperRef.current;
    let originalPosition = '';
    let originalLeft = '';
    let originalTop = '';
    let originalZIndex = '';
    let originalOpacity = '';
    let originalVisibility = '';

    try {
      if (wrapper) {
        originalPosition = wrapper.style.position;
        originalLeft = wrapper.style.left;
        originalTop = wrapper.style.top;
        originalZIndex = wrapper.style.zIndex;
        originalOpacity = wrapper.style.opacity;
        originalVisibility = wrapper.style.visibility;

        wrapper.style.setProperty('position', 'fixed', 'important');
        wrapper.style.setProperty('top', '0px', 'important');
        wrapper.style.setProperty('left', '0px', 'important');
        wrapper.style.setProperty('z-index', '99999', 'important');
        wrapper.style.setProperty('opacity', '1', 'important');
        wrapper.style.setProperty('visibility', 'visible', 'important');
        wrapper.style.setProperty('background-color', '#ffffff', 'important');
      }

      await new Promise((resolve) => setTimeout(resolve, 350));

      const pageElements = wrapper?.querySelectorAll('.pdf-page-sheet');
      if (!pageElements || pageElements.length === 0) {
        throw new Error('Elemen templat PDF tidak ditemukan.');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgWidth = pdfWidth - margin * 2;
      const maxImgHeight = pdfHeight - margin * 2;

      for (let i = 0; i < pageElements.length; i++) {
        setPdfProgress(`Mengonversi lembar ${i + 1} dari ${pageElements.length}...`);
        const pageEl = pageElements[i] as HTMLElement;

        let imgData = '';
        let nativeWidth = pageEl.offsetWidth || 800;
        let nativeHeight = pageEl.offsetHeight || 1120;

        try {
          imgData = await toJpeg(pageEl, {
            quality: 0.98,
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            cacheBust: true
          });
        } catch (primaryErr) {
          console.warn('toJpeg failed, falling back to html2canvas:', primaryErr);
          const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
          });
          imgData = canvas.toDataURL('image/jpeg', 0.95);
          nativeWidth = canvas.width;
          nativeHeight = canvas.height;
        }

        const calculatedHeight = (nativeHeight * imgWidth) / nativeWidth;
        const finalImgHeight = Math.min(calculatedHeight, maxImgHeight);

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, finalImgHeight);
      }

      setPdfProgress('Mengunduh file PDF...');
      const today = new Date().toISOString().split('T')[0];
      const areaLabel = targetAreas.length === areas.length
        ? 'Semua_Area'
        : targetAreas.length === 1
        ? targetAreas[0].name.replace(/\s+/g, '_')
        : `${targetAreas.length}_Area`;
      const filename = `Laporan_Master_Area_${areaLabel}_XXI_${today}.pdf`;

      // Trigger single download via jsPDF
      pdf.save(filename);

      setIsExportModalOpen(false);
      setIsPreviewModalOpen(false);
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      alert('Gagal mengunduh PDF: ' + (err.message || err));
    } finally {
      if (wrapper) {
        wrapper.style.position = originalPosition;
        wrapper.style.left = originalLeft;
        wrapper.style.top = originalTop;
        wrapper.style.zIndex = originalZIndex;
        wrapper.style.opacity = originalOpacity;
        wrapper.style.visibility = originalVisibility;
      }
      setIsGeneratingPdf(false);
      setPdfProgress('');
    }
  };

  // Area Action Handlers
  const openAddModal = () => {
    setEditingArea(null);
    setName('');
    setKeterangan('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (area: Area) => {
    setEditingArea(area);
    setName(area.name);
    setKeterangan(area.keterangan || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama Area tidak boleh kosong.');
      return;
    }

    const areaPayload: Area = {
      id: editingArea ? editingArea.id : `area-${Date.now()}`,
      name: name.trim(),
      keterangan: keterangan.trim()
    };

    onSave(areaPayload);
    setIsModalOpen(false);
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

  // Equipment Action Handlers
  const openAddEqModal = () => {
    if (!selectedAreaId) return;
    setEditingEq(null);
    setEqName('');
    setEqQuantity(1);
    setEqStatus('Normal');
    setEqKeterangan('');
    setEqErrors({});
    setIsEqModalOpen(true);
  };

  const openEditEqModal = (eq: Equipment) => {
    setEditingEq(eq);
    setEqName(eq.name);
    setEqQuantity(eq.quantity);
    setEqStatus(eq.status);
    setEqKeterangan(eq.keterangan);
    setEqErrors({});
    setIsEqModalOpen(true);
  };

  const handleEqSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!eqName.trim()) {
      newErrors.name = 'Nama Equipment wajib diisi.';
    }
    if (eqQuantity < 1) {
      newErrors.quantity = 'Quantity minimal 1.';
    }

    if (Object.keys(newErrors).length > 0) {
      setEqErrors(newErrors);
      return;
    }

    if (!selectedAreaId) return;

    const eqPayload: Equipment = {
      id: editingEq ? editingEq.id : `eq-${Date.now()}`,
      name: eqName.trim(),
      areaId: selectedAreaId,
      quantity: Number(eqQuantity),
      status: eqStatus,
      keterangan: eqKeterangan.trim()
    };

    onSaveEquipment(eqPayload);
    setIsEqModalOpen(false);
  };

  const triggerDeleteEq = (id: string) => {
    setDeletingEqId(id);
    setIsEqConfirmOpen(true);
  };

  const confirmDeleteEq = () => {
    if (deletingEqId) {
      onDeleteEquipment(deletingEqId);
      setDeletingEqId(null);
    }
  };

  // Large modern status pill badges (Green = Normal, Yellow = Perbaikan / Maintenance, Red = Rusak)
  const renderStatusBadge = (s: EquipmentStatus) => {
    const configs: Record<string, { bg: string; label: string; dot: string }> = {
      Normal: { bg: 'bg-emerald-100 border-emerald-300 text-emerald-950', label: 'NORMAL', dot: 'bg-emerald-600' },
      NORMAL: { bg: 'bg-emerald-100 border-emerald-300 text-emerald-950', label: 'NORMAL', dot: 'bg-emerald-600' },
      Maintenance: { bg: 'bg-amber-100 border-amber-300 text-amber-950', label: 'PERBAIKAN', dot: 'bg-amber-600' },
      Perbaikan: { bg: 'bg-amber-100 border-amber-300 text-amber-950', label: 'PERBAIKAN', dot: 'bg-amber-600' },
      PERBAIKAN: { bg: 'bg-amber-100 border-amber-300 text-amber-950', label: 'PERBAIKAN', dot: 'bg-amber-600' },
      Rusak: { bg: 'bg-rose-100 border-rose-300 text-rose-950', label: 'RUSAK', dot: 'bg-rose-600' },
      RUSAK: { bg: 'bg-rose-100 border-rose-300 text-rose-950', label: 'RUSAK', dot: 'bg-rose-600' }
    };
    const c = configs[s] || configs.Normal;
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs md:text-sm font-extrabold border ${c.bg}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-slide-in" id="master-area-tab-view">
      {/* Intro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            <Map className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
            Master Area &amp; Equipment
          </h2>
          <p className="text-sm md:text-base text-slate-300 mt-1 font-sans">
            Kelola zona spasial CINEMA XXI LIPPO MALL PURI dan tambahkan daftar equipment yang berada di masing-masing area tersebut.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => openExportModal()}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:via-purple-500 hover:to-cyan-400 px-5.5 py-3.5 text-sm md:text-base font-black text-white border border-fuchsia-300/60 active:scale-95 transition-all shadow-[0_0_22px_rgba(217,70,239,0.55)] cursor-pointer tracking-wide"
            id="btn-export-pdf-area"
            title="Export Rekap Area & Equipment ke PDF"
          >
            <FileText className="h-5 w-5 text-cyan-200 shrink-0 drop-shadow-[0_0_6px_#00f0ff]" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:via-teal-300 hover:to-cyan-300 px-6 py-3.5 text-sm md:text-base font-black text-slate-950 active:scale-95 transition-all shadow-[0_0_22px_rgba(16,185,129,0.65)] cursor-pointer shrink-0 border border-emerald-200/80 tracking-wide"
            id="btn-add-area"
          >
            <Plus className="h-5.5 w-5.5 stroke-[3]" /> Tambah Area Baru
          </button>
        </div>
      </div>

      {/* Full-Width Layout: Area Selector Bar & Equipment Detail */}
      <div className="space-y-6">
        {/* Top: Full-Width Pilihan Area Selector Bar */}
        <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 shadow-[0_0_20px_rgba(0,0,0,0.5)] p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
            <div className="flex items-center gap-3 text-white">
              <Map className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
              <div>
                <h3 className="font-black text-base uppercase tracking-wider font-mono text-cyan-300 flex items-center gap-2">
                  Pilihan Area / Zona XXI ({areas.length})
                </h3>
                <p className="text-xs text-slate-300 font-medium">Klik salah satu area di bawah untuk langsung melihat &amp; mengelola equipment-nya.</p>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-200 text-sm md:text-base font-extrabold px-5 py-2.5 transition-all cursor-pointer shadow-md active:scale-95 self-start sm:self-auto"
            >
              <Plus className="h-5 w-5 text-cyan-400 stroke-[2.5]" /> Tambah Area
            </button>
          </div>

          {areas.length === 0 ? (
            <div className="p-10 text-center text-slate-300 bg-slate-900/60 rounded-xl border border-dashed border-slate-700">
              <List className="h-8 w-8 mx-auto stroke-2 mb-2 text-cyan-400 animate-pulse" />
              <p className="text-sm font-bold text-slate-200">Belum ada area terdaftar.</p>
              <button
                onClick={openAddModal}
                className="mt-2 text-xs font-bold text-cyan-400 hover:underline cursor-pointer"
              >
                + Tambah area pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" id="area-list-container">
              {areas.map((area, idx) => {
                const areaEq = equipment.filter((eq) => eq.areaId === area.id);
                const isSelected = selectedAreaId === area.id;

                return (
                  <div
                    key={area.id}
                    onClick={() => setSelectedAreaId(area.id)}
                    className={`relative group rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/90 text-white border-cyan-400 shadow-[0_0_18px_rgba(0,240,255,0.35)] ring-2 ring-cyan-500/50'
                        : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 border-slate-800 shadow-xs'
                    }`}
                    id={`area-item-${area.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-12">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? 'bg-cyan-400 text-slate-950 font-mono shadow-[0_0_10px_#00f0ff]' : 'bg-slate-800 text-slate-300 font-mono'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`font-black text-base md:text-lg truncate font-sans ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                          {area.name}
                        </h4>
                        <p className={`text-xs md:text-sm font-mono font-bold mt-0.5 ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}>
                          {areaEq.length} Equipment
                        </p>
                      </div>
                    </div>

                    {/* Quick Edit/Delete buttons */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditModal(area)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected ? 'text-cyan-200 hover:bg-slate-800 hover:text-cyan-300' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
                        }`}
                        title="Ubah Nama Area"
                        id={`btn-edit-area-${area.id}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => triggerDelete(area.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected ? 'text-rose-400 hover:bg-rose-950/60 hover:text-rose-300' : 'text-rose-400 hover:bg-rose-950/60'
                        }`}
                        title="Hapus Area"
                        id={`btn-delete-area-${area.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom: Full-Width Detail Equipment Table */}
        <div>
          {selectedAreaId ? (() => {
            const activeArea = areas.find((a) => a.id === selectedAreaId);
            const activeAreaEq = equipment.filter((eq) => eq.areaId === selectedAreaId);

            if (!activeArea) {
              return (
                <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-16 text-center text-slate-300">
                  <List className="h-12 w-12 stroke-2 mb-4 text-cyan-400 mx-auto" />
                  <p className="text-base font-bold text-slate-200">Pilih area dari pilihan area di atas.</p>
                </div>
              );
            }

            return (
              <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] space-y-4">
                <div className="px-6 py-5 border-b border-cyan-500/20 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <Wrench className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" />
                      <h3 className="font-black text-base md:text-lg text-white font-sans tracking-tight">
                        Equipment di {activeArea.name}
                      </h3>
                    </div>
                    <p className="text-xs md:text-sm text-slate-300 font-medium mt-1">
                      {activeArea.keterangan ? (
                        <span className="flex items-center gap-1.5 text-slate-200">
                          <Info className="h-4 w-4 text-cyan-400 shrink-0 inline" /> {activeArea.keterangan}
                        </span>
                      ) : (
                        'Daftar inventori barang teknik khusus untuk area ini.'
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => openExportModal(activeArea.id)}
                      className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 text-xs md:text-sm font-black text-white border border-amber-200/60 px-4 py-2.5 transition-all cursor-pointer active:scale-95 shadow-[0_0_18px_rgba(249,115,22,0.55)] tracking-wide"
                      title={`Export hanya ${activeArea.name} ke PDF`}
                    >
                      <FileText className="h-4 w-4 text-amber-100 shrink-0 drop-shadow-[0_0_5px_#fef08a]" />
                      <span>Export Area Ini (PDF)</span>
                    </button>
                    <button
                      onClick={openAddEqModal}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-sm md:text-base font-black text-white px-5 py-2.5 transition-all shadow-[0_0_20px_rgba(168,85,247,0.6)] cursor-pointer active:scale-95 shrink-0 border border-purple-200/60 tracking-wide"
                      id="btn-add-eq-area"
                    >
                      <Plus className="h-4.5 w-4.5 stroke-[3]" /> Tambah Equipment
                    </button>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  {activeAreaEq.length === 0 ? (
                    <div className="p-16 text-center text-slate-300 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
                      <Wrench className="h-12 w-12 mx-auto stroke-2 mb-3 text-cyan-400" />
                      <p className="text-base font-black font-sans text-white">Belum ada equipment di area {activeArea.name}.</p>
                      <p className="text-xs md:text-sm text-slate-300 font-medium mt-1.5 max-w-sm mx-auto leading-relaxed">
                        Anda dapat mendaftarkan AC, Speaker, Projector, Exhaust Fan, dll.
                      </p>
                      <button
                        onClick={openAddEqModal}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-cyan-400 hover:underline cursor-pointer"
                      >
                        Tambah Equipment Pertama di Area Ini
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900/80 text-sm md:text-base font-black text-cyan-300 uppercase tracking-widest font-mono border-b border-slate-800">
                            <th className="px-5 py-4">Nama Equipment</th>
                            <th className="px-5 py-4 text-center">Qty</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Keterangan</th>
                            <th className="px-5 py-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-base">
                          {activeAreaEq.map((eq) => (
                            <tr key={eq.id} className="hover:bg-slate-800/50 transition-colors">
                              <td className="px-5 py-4.5 font-black text-white font-sans text-base md:text-lg">{eq.name}</td>
                              <td className="px-5 py-4.5 text-center font-mono font-black text-emerald-300 text-lg md:text-xl">{eq.quantity}</td>
                              <td className="px-5 py-4.5">{renderStatusBadge(eq.status)}</td>
                              <td className="px-5 py-4.5 max-w-xs">
                                <p className="text-base text-slate-200 font-bold line-clamp-2 leading-relaxed" title={eq.keterangan}>
                                  {eq.keterangan ? (
                                    eq.keterangan
                                  ) : (
                                    <span className="italic text-slate-500 font-medium">Tidak ada keterangan</span>
                                  )}
                                </p>
                              </td>
                              <td className="px-5 py-4.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditEqModal(eq)}
                                    className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                                    title="Ubah Equipment"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => triggerDeleteEq(eq.id)}
                                    className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                                    title="Hapus Equipment"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : (
            <div className="bg-[#0a0f1d]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-16 text-center text-slate-300 h-full flex flex-col justify-center items-center">
              <Map className="h-12 w-12 stroke-2 mb-4 text-cyan-400" />
              <p className="text-base font-bold text-slate-200">Silakan pilih atau tambah area untuk mengelola equipment di dalamnya.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL AREA ADD/EDIT --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingArea ? '📝 Ubah Nama Area' : '➕ Tambah Area Baru'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveSubmit} className="space-y-5 font-sans" id="form-area">
          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
              Nama Area <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Contoh: Studio 4, Cafe Lounge, Lobby Utama..."
              className="w-full h-12 md:h-13 rounded-xl border-2 border-slate-700 px-4 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all placeholder:text-slate-500"
              id="input-area-name"
              autoFocus
            />
            {error && (
              <p className="text-sm font-semibold text-rose-400 mt-1" id="area-form-error">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
              Keterangan / Catatan Area <span className="text-slate-400 font-normal font-sans text-xs">(Opsional)</span>
            </label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Area publik lantai 2, khusus akses teknisi..."
              rows={3}
              className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all placeholder:text-slate-500 resize-none"
              id="input-area-keterangan"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-5 py-2.5 text-sm md:text-base font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/50 px-6 py-2.5 text-sm md:text-base font-black text-white active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
              id="btn-save-area"
            >
              <Check className="h-4 w-4 stroke-[2.5]" /> Simpan Area
            </button>
          </div>
        </form>
      </Modal>

      {/* --- CONFIRM DIALOG AREA DELETE --- */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Master Area"
        message="Yakin ingin menghapus data ini? Hapus area tidak menghapus equipment secara otomatis tetapi akan memutus tautan area."
      />

      {/* --- MODAL EQUIPMENT ADD/EDIT --- */}
      <Modal
        isOpen={isEqModalOpen}
        onClose={() => setIsEqModalOpen(false)}
        title={editingEq ? '🔧 Ubah Data Equipment' : '➕ Tambah Equipment Baru'}
        maxWidth="4xl"
      >
        <form onSubmit={handleEqSaveSubmit} className="space-y-5 font-sans" id="form-equipment-area">
          {/* Top small reminder message */}
          <div className="text-xs md:text-sm text-cyan-200 bg-cyan-950/60 px-3.5 py-2.5 rounded-xl border border-cyan-500/30 flex items-center gap-2 leading-none">
            <Info className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="font-semibold">Mohon isi data equipment bioskop dengan lengkap.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Side: Nama & Status */}
            <div className="space-y-4">
              {/* Nama Equipment */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
                    Nama Equipment <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-xs text-cyan-400 font-mono font-bold">WAJIB</span>
                </div>
                <input
                  type="text"
                  value={eqName}
                  onChange={(e) => {
                    setEqName(e.target.value);
                    setEqErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Contoh: AC Standing, Projector, Speaker..."
                  className="w-full h-12 md:h-13 rounded-xl border-2 border-slate-700 px-4 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-400/20"
                  autoFocus
                />
                {eqErrors.name && (
                  <p className="text-sm font-semibold text-rose-400 mt-0.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    {eqErrors.name}
                  </p>
                )}
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono block">
                  Status Operasional
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Normal - Hijau Neon */}
                  <button
                    type="button"
                    onClick={() => setEqStatus('Normal')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer select-none ${
                      eqStatus === 'Normal'
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 font-black shadow-[0_0_20px_rgba(16,185,129,0.6)] ring-1 ring-emerald-400/50 scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-emerald-500/60 hover:text-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    }`}
                  >
                    <CheckCircle className={`h-6 w-6 mb-1 transition-transform ${
                      eqStatus === 'Normal'
                        ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)] scale-110'
                        : 'text-slate-500'
                    }`} />
                    <span className="text-xs uppercase tracking-wider font-black font-mono">NORMAL</span>
                  </button>

                  {/* Perbaikan - Oren/Kuning Neon */}
                  <button
                    type="button"
                    onClick={() => setEqStatus('Perbaikan')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer select-none ${
                      eqStatus === 'Perbaikan' || eqStatus === 'Maintenance'
                        ? 'bg-amber-950/90 border-amber-400 text-amber-300 font-black shadow-[0_0_20px_rgba(245,158,11,0.6)] ring-1 ring-amber-400/50 scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-amber-500/60 hover:text-amber-400 hover:shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                    }`}
                  >
                    <AlertCircle className={`h-6 w-6 mb-1 transition-transform ${
                      eqStatus === 'Perbaikan' || eqStatus === 'Maintenance'
                        ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)] scale-110'
                        : 'text-slate-500'
                    }`} />
                    <span className="text-xs uppercase tracking-wider font-black font-mono">PERBAIKAN</span>
                  </button>

                  {/* Rusak - Merah Neon */}
                  <button
                    type="button"
                    onClick={() => setEqStatus('Rusak')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer select-none ${
                      eqStatus === 'Rusak'
                        ? 'bg-rose-950/90 border-rose-400 text-rose-300 font-black shadow-[0_0_20px_rgba(244,63,94,0.6)] ring-1 ring-rose-400/50 scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-rose-500/60 hover:text-rose-400 hover:shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                    }`}
                  >
                    <XCircle className={`h-6 w-6 mb-1 transition-transform ${
                      eqStatus === 'Rusak'
                        ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.9)] scale-110'
                        : 'text-slate-500'
                    }`} />
                    <span className="text-xs uppercase tracking-wider font-black font-mono">RUSAK</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side: Quantity & Keterangan */}
            <div className="space-y-4">
              {/* Quantity Stepper */}
              <div className="space-y-1.5">
                <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono block">
                  Jumlah / Quantity
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = Math.max(1, eqQuantity - 1);
                      setEqQuantity(nextVal);
                      setEqErrors((prev) => ({ ...prev, quantity: '' }));
                    }}
                    className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 text-cyan-300 hover:bg-slate-700 hover:border-cyan-500/50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    <Minus className="h-5 w-5 stroke-[2.5]" />
                  </button>
                  
                  <input
                    type="number"
                    min="1"
                    value={eqQuantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEqQuantity(val);
                      setEqErrors((prev) => ({ ...prev, quantity: '' }));
                    }}
                    className="h-12 w-28 rounded-xl border-2 border-slate-700 text-center text-lg font-black font-mono focus:border-cyan-400 focus:outline-hidden transition-colors bg-slate-900/90 text-emerald-300 focus:ring-2 focus:ring-cyan-400/20"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = eqQuantity + 1;
                      setEqQuantity(nextVal);
                      setEqErrors((prev) => ({ ...prev, quantity: '' }));
                    }}
                    className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 text-cyan-300 hover:bg-slate-700 hover:border-cyan-500/50 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                  </button>
                </div>
                {eqErrors.quantity && (
                  <p className="text-sm font-semibold text-rose-400 mt-0.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    {eqErrors.quantity}
                  </p>
                )}
              </div>

              {/* Keterangan */}
              <div className="space-y-1.5">
                <label className="text-base md:text-lg font-black text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
                  Keterangan Tambahan <span className="text-slate-400 font-normal font-sans text-xs">(Opsional)</span>
                </label>
                <textarea
                  value={eqKeterangan}
                  onChange={(e) => setEqKeterangan(e.target.value)}
                  placeholder="Merk, tipe, serial number atau catatan kondisi..."
                  rows={2.5}
                  className="w-full rounded-xl border-2 border-slate-700 px-4 py-3 text-base md:text-lg font-bold text-white bg-slate-900/90 focus:border-cyan-400 focus:outline-hidden transition-all placeholder:text-slate-500 resize-none focus:ring-2 focus:ring-cyan-400/20"
                  id="input-eq-keterangan"
                />
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
            <button
              type="button"
              onClick={() => setIsEqModalOpen(false)}
              className="rounded-xl px-5 py-2.5 text-sm md:text-base font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/50 px-6 py-2.5 text-sm md:text-base font-black text-white active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
            >
              <Check className="h-4 w-4 stroke-[2.5]" /> Simpan Equipment
            </button>
          </div>
        </form>
      </Modal>

      {/* --- CONFIRM DIALOG EQUIPMENT DELETE --- */}
      <ConfirmDialog
        isOpen={isEqConfirmOpen}
        onClose={() => setIsEqConfirmOpen(false)}
        onConfirm={confirmDeleteEq}
        title="Hapus Equipment"
        message="Yakin ingin menghapus equipment ini? Tindakan ini tidak dapat dibatalkan."
      />

      {/* --- MODAL EXPORT PDF MASTER AREA --- */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="📄 Export Master Area & Equipment ke PDF"
        maxWidth="full"
      >
        <div className="space-y-3 font-sans text-slate-100" id="modal-export-pdf-area">
          {/* Banner Instructions */}
          <div className="bg-cyan-950/70 border border-cyan-500/40 p-3.5 sm:p-4 rounded-xl text-cyan-200 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-extrabold text-cyan-300 flex items-center gap-2 font-mono text-sm sm:text-base md:text-lg">
                <Sparkles className="h-5 w-5 text-cyan-400 shrink-0" />
                <span>Cetak Laporan Inventaris Resmi XXI (Format PDF)</span>
              </p>
              <p className="leading-snug text-xs sm:text-sm md:text-base text-cyan-200/90 font-medium">
                Pilih area yang ingin Anda jadikan dokumen PDF atau unduh seluruh area sekaligus dalam satu berkas laporan terstruktur.
              </p>
            </div>
          </div>

          {/* 2-Column Wide Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Left Column: Mode Selection & Area List */}
            <div className="lg:col-span-6 space-y-3">
              {/* Export Mode Selection Cards */}
              <div className="space-y-1.5">
                <label className="text-sm sm:text-base font-black uppercase tracking-wider font-mono text-cyan-400 block">
                  1. Mode Cetak PDF:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option A: Semua Area */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportMode('all');
                      setSelectedExportAreaIds(areas.map((a) => a.id));
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      exportMode === 'all'
                        ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                          <List className="h-5 w-5 text-cyan-400" />
                          <span>Semua Area</span>
                        </span>
                        {exportMode === 'all' && (
                          <CheckCircle className="h-5 w-5 text-cyan-400" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-snug font-medium">
                        Export seluruh <strong className="text-white">{areas.length} area</strong> ({equipment.length} eq).
                      </p>
                    </div>
                  </button>

                  {/* Option B: Pilih Area Tertentu */}
                  <button
                    type="button"
                    onClick={() => setExportMode('custom')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      exportMode === 'custom'
                        ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                          <CheckSquare className="h-5 w-5 text-cyan-400" />
                          <span>Pilih Area Spesifik</span>
                        </span>
                        {exportMode === 'custom' && (
                          <CheckCircle className="h-5 w-5 text-cyan-400" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-snug font-medium">
                        Pilih satu/beberapa area tertentu saja.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Area Checkboxes List if Custom Mode is Active */}
              {exportMode === 'custom' && (
                <div className="space-y-2 bg-slate-900/90 border border-slate-700 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs sm:text-sm font-black font-mono text-slate-200 uppercase">
                      Daftar Area ({selectedExportAreaIds.length}/{areas.length}):
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAllExport}
                      className="text-xs sm:text-sm font-bold text-cyan-400 hover:underline cursor-pointer font-mono"
                    >
                      {selectedExportAreaIds.length === areas.length ? 'Reset All' : 'Pilih Semua'}
                    </button>
                  </div>

                  {areas.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-1">Belum ada area terdaftar.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                      {areas.map((area) => {
                        const areaEqCount = equipment.filter((eq) => eq.areaId === area.id).length;
                        const isChecked = selectedExportAreaIds.includes(area.id);

                        return (
                          <label
                            key={area.id}
                            onClick={() => toggleAreaExport(area.id)}
                            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer select-none transition-all ${
                              isChecked
                                ? 'bg-cyan-950/70 border-cyan-500/60 text-white'
                                : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-1">
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-cyan-400 shrink-0" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-500 shrink-0" />
                              )}
                              <span className="text-xs sm:text-sm font-bold truncate">{area.name}</span>
                            </div>
                            <span className="text-xs font-mono font-extrabold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 shrink-0">
                              {areaEqCount} eq
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Options & Signature Configuration */}
            <div className="lg:col-span-6 space-y-3">
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-3">
                <span className="text-sm sm:text-base font-black uppercase tracking-wider font-mono text-cyan-400 block border-b border-slate-800 pb-1.5">
                  2. Pengaturan Dokumen &amp; Tanda Tangan (TTD):
                </span>

                <div className="flex flex-wrap items-center gap-5 text-sm text-slate-100">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSummary}
                      onChange={(e) => setIncludeSummary(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
                    />
                    <span className="font-bold text-sm sm:text-base">Sertakan Ringkasan Rekapitulasi</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSignatures}
                      onChange={(e) => setIncludeSignatures(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
                    />
                    <span className="font-bold text-sm sm:text-base">Sertakan Kolom TTD</span>
                  </label>
                </div>

                {includeSignatures && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                    {/* Signer 1 (Left / Pembuat) */}
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-2">
                      <span className="text-xs sm:text-sm font-black text-amber-400 font-mono block border-b border-slate-800/80 pb-1">
                        ✍️ TTD Kiri (Pembuat)
                      </span>
                      <div className="grid grid-cols-1 gap-1.5 text-xs sm:text-sm">
                        <div>
                          <label className="text-xs text-slate-300 block font-mono font-medium">Judul TTD:</label>
                          <input
                            type="text"
                            value={signer1Title}
                            onChange={(e) => setSigner1Title(e.target.value)}
                            placeholder="Dibuat Oleh,"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 block font-mono font-medium">Nama Lengkap:</label>
                          <input
                            type="text"
                            value={signer1Name}
                            onChange={(e) => setSigner1Name(e.target.value)}
                            placeholder="Nama Pembuat"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-extrabold text-amber-300"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 block font-mono font-medium">Jabatan:</label>
                          <input
                            type="text"
                            value={signer1Role}
                            onChange={(e) => setSigner1Role(e.target.value)}
                            placeholder="Jabatan Pembuat"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Signer 2 (Right / Penyetuju) */}
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-2">
                      <span className="text-xs sm:text-sm font-black text-amber-400 font-mono block border-b border-slate-800/80 pb-1">
                        ✍️ TTD Kanan (Penyetuju)
                      </span>
                      <div className="grid grid-cols-1 gap-1.5 text-xs sm:text-sm">
                        <div>
                          <label className="text-xs text-slate-300 block font-mono font-medium">Judul TTD:</label>
                          <input
                            type="text"
                            value={signer2Title}
                            onChange={(e) => setSigner2Title(e.target.value)}
                            placeholder="Disetujui Oleh,"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 block font-mono font-medium">Nama Lengkap:</label>
                          <input
                            type="text"
                            value={signer2Name}
                            onChange={(e) => setSigner2Name(e.target.value)}
                            placeholder="Nama Penyetuju"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-extrabold text-amber-300"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-300 block font-mono font-medium">Jabatan:</label>
                          <input
                            type="text"
                            value={signer2Role}
                            onChange={(e) => setSigner2Role(e.target.value)}
                            placeholder="Jabatan Penyetuju"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PDF Summary Preview Info Box */}
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs sm:text-sm font-mono">
                <div>
                  <span className="text-slate-400 block text-xs font-bold uppercase">DOKUMEN AKAN BERISI:</span>
                  <span className="font-extrabold text-emerald-400 text-sm sm:text-base">
                    {exportAreasToRender.length} Area &bull; {exportEquipmentToRender.length} Equipment
                  </span>
                </div>
                <div className="text-right text-xs sm:text-sm text-slate-300 space-y-0.5">
                  <span className="text-emerald-400 font-bold">Normal: {totalNormal}</span> &bull;{' '}
                  <span className="text-amber-400 font-bold">Maint: {totalMaintenance}</span> &bull;{' '}
                  <span className="text-rose-400 font-bold">Rusak: {totalRusak}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons (Spans Full Width at Bottom) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setExportMode('all');
                handleDownloadPdf(areas);
              }}
              disabled={isGeneratingPdf || areas.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 text-xs sm:text-sm md:text-base font-black cursor-pointer transition-all disabled:opacity-50"
              title="Download PDF semua area secara instan"
            >
              <Printer className="h-5 w-5 text-emerald-400" />
              <span>Download Semua Area</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                disabled={isGeneratingPdf || exportAreasToRender.length === 0}
                className="flex items-center justify-center gap-2 px-4.5 py-2.5 sm:py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm md:text-base font-black shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer transition-all disabled:opacity-50"
                title="Lihat pratinjau dokumen sebelum diunduh"
              >
                <Eye className="h-5 w-5 text-slate-950 stroke-[2.5]" />
                <span>Preview PDF Dulu</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPdf()}
                disabled={isGeneratingPdf || exportAreasToRender.length === 0}
                className="flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm sm:text-base md:text-lg font-black shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer transition-all disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                    <span>{pdfProgress || 'Memproses PDF...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 text-white" />
                    <span>Download PDF ({exportAreasToRender.length} Area)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* --- MODAL PREVIEW DOKUMEN A4 PDF --- */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="👁️ Pratinjau Dokumen A4 - Laporan Master Area & Equipment XXI"
        maxWidth="full"
      >
        <div className="flex flex-col flex-1 h-full min-h-0 space-y-3 font-sans text-slate-100">
          {/* Header Action Controls */}
          <div className="bg-slate-900 border border-slate-700 p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm shrink-0">
            <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs sm:text-sm md:text-base">
              <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
              <span>Pratinjau Lembar A4 ({exportAreasToRender.length} Area &bull; {exportEquipmentToRender.length} Equipment)</span>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 cursor-pointer transition-all text-xs sm:text-sm"
              >
                Kembali ke Modal
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf()}
                disabled={isGeneratingPdf || exportAreasToRender.length === 0}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer transition-all disabled:opacity-50 text-xs sm:text-sm md:text-base"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>{pdfProgress || 'Memproses...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-white" />
                    <span>Download PDF Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Multi-Page Document Preview */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 sm:p-5 md:p-6 flex-1 min-h-[82vh] h-full overflow-y-auto space-y-8 flex flex-col items-center w-full shadow-inner">
            {paginatedExportPages.map((page, pageIdx) => (
              <div
                key={`preview-page-${pageIdx}`}
                className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl transition-all"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  padding: '36px',
                  borderRadius: '10px',
                  boxShadow: '0 25px 35px -5px rgba(0,0,0,0.7), 0 0 30px rgba(0,240,255,0.15)',
                  fontFamily: 'Arial, sans-serif',
                  minHeight: '1080px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Page Indicator Tag */}
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-300 text-xs font-mono font-bold text-slate-500">
                    <span>📄 LEMBAR A4 &bull; HALAMAN {pageIdx + 1} DARI {paginatedExportPages.length}</span>
                    <span className="text-amber-600 font-black">CINEMA XXI ENGINEERING</span>
                  </div>

                  {/* Header Kop Surat XXI */}
                  {pageIdx === 0 ? (
                    <div style={{ borderBottom: '4px solid #f59e0b', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ backgroundColor: '#0f172a', color: '#f59e0b', fontWeight: '900', padding: '4px 12px', borderRadius: '4px', fontSize: '18px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                            CINEMA XXI
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'monospace', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px' }}>
                            LIPPO MALL PURI
                          </span>
                        </div>
                        <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginTop: '8px', letterSpacing: '-0.5px', margin: '8px 0 0 0' }}>
                          LAPORAN INVENTARIS MASTER AREA &amp; EQUIPMENT
                        </h1>
                        <p style={{ fontSize: '12px', color: '#475569', fontWeight: '500', marginTop: '2px', margin: '2px 0 0 0' }}>
                          Departemen Engineering &amp; Maintenance &mdash; Cinema XXI Lippo Mall Puri
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>
                        <p style={{ fontWeight: '900', color: '#0f172a', margin: 0 }}>TANGGAL CETAK:</p>
                        <p style={{ marginTop: '2px', margin: 0 }}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                          Filter: {exportAreasToRender.length === areas.length ? 'Semua Area' : `${exportAreasToRender.length} Area Terpilih`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ backgroundColor: '#0f172a', color: '#f59e0b', fontWeight: '900', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
                          CINEMA XXI
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                          LAPORAN MASTER AREA &amp; EQUIPMENT (SAMBUNGAN)
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: '#475569' }}>
                        Halaman {pageIdx + 1} dari {paginatedExportPages.length}
                      </span>
                    </div>
                  )}

                  {/* Area Cards for this page */}
                  {page.areas.map((area) => {
                    const globalIdx = exportAreasToRender.findIndex((a) => a.id === area.id);
                    const areaEq = equipment.filter((eq) => eq.areaId === area.id);
                    return (
                      <div key={area.id} style={{ marginBottom: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '10px' }}>
                          <div>
                            <h3 style={{ fontWeight: '900', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                              <span style={{ backgroundColor: '#0f172a', color: '#f59e0b', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: '700' }}>
                                {globalIdx + 1}
                              </span>
                              AREA: {area.name.toUpperCase()}
                            </h3>
                            {area.keterangan && (
                              <p style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', marginTop: '2px', margin: 0 }}>{area.keterangan}</p>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', color: '#0f172a', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px' }}>
                            Total: {areaEq.length} Equipment
                          </span>
                        </div>

                        {areaEq.length === 0 ? (
                          <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center', color: '#64748b', fontSize: '11px', fontStyle: 'italic', boxSizing: 'border-box' }}>
                            Belum ada equipment terdaftar di area ini.
                          </div>
                        ) : (
                          <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse', border: '1px solid #cbd5e1', tableLayout: 'fixed', boxSizing: 'border-box' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#e2e8f0', color: '#0f172a', fontWeight: '900', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                                <th style={{ border: '1px solid #cbd5e1', padding: '6px 4px', width: '6%', textAlign: 'center', boxSizing: 'border-box' }}>No</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', width: '36%', textAlign: 'left', boxSizing: 'border-box' }}>Nama Equipment</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '6px 4px', width: '8%', textAlign: 'center', boxSizing: 'border-box' }}>Qty</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '6px 4px', width: '18%', textAlign: 'center', boxSizing: 'border-box' }}>Status</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', width: '32%', textAlign: 'left', boxSizing: 'border-box' }}>Keterangan / Catatan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {areaEq.map((eq, eqIdx) => (
                                <tr key={eq.id} style={{ backgroundColor: eqIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700', color: '#334155', boxSizing: 'border-box' }}>{eqIdx + 1}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: '700', color: '#0f172a', boxSizing: 'border-box' }}>{eq.name}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a', boxSizing: 'border-box' }}>{eq.quantity}</td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 4px', textAlign: 'center', boxSizing: 'border-box' }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '100%',
                                      maxWidth: '105px',
                                      padding: '2.5px 6px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: '800',
                                      textAlign: 'center',
                                      boxSizing: 'border-box',
                                      backgroundColor: eq.status === 'Normal' ? '#d1fae5' : eq.status === 'Maintenance' ? '#fef3c7' : '#ffe4e6',
                                      color: eq.status === 'Normal' ? '#065f46' : eq.status === 'Maintenance' ? '#92400e' : '#9f1239',
                                      border: `1px solid ${eq.status === 'Normal' ? '#6ee7b7' : eq.status === 'Maintenance' ? '#fcd34d' : '#fda4af'}`
                                    }}>
                                      {eq.status === 'Normal' ? 'Normal [OK]' : eq.status === 'Maintenance' ? 'Maintenance' : 'Rusak [Rsk]'}
                                    </span>
                                  </td>
                                  <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', color: '#334155', boxSizing: 'border-box' }}>
                                    {eq.keterangan || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}

                  {/* Summary Box */}
                  {page.hasSummary && (
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 14px', backgroundColor: '#f1f5f9', marginTop: '16px', boxSizing: 'border-box' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: '900', fontFamily: 'monospace', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', marginTop: 0 }}>
                        RINGKASAN REKAPITULASI INVENTARIS
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center', fontSize: '11px', fontFamily: 'monospace' }}>
                        <div style={{ backgroundColor: '#ffffff', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                          <span style={{ display: 'block', fontSize: '9px', color: '#64748b', fontWeight: '700', marginBottom: '2px' }}>TOTAL AREA</span>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>{exportAreasToRender.length}</span>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                          <span style={{ display: 'block', fontSize: '9px', color: '#64748b', fontWeight: '700', marginBottom: '2px' }}>NORMAL [OK]</span>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: '#047857' }}>{totalNormal}</span>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                          <span style={{ display: 'block', fontSize: '9px', color: '#64748b', fontWeight: '700', marginBottom: '2px' }}>MAINTENANCE</span>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: '#b45309' }}>{totalMaintenance}</span>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                          <span style={{ display: 'block', fontSize: '9px', color: '#64748b', fontWeight: '700', marginBottom: '2px' }}>RUSAK</span>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: '#b91c1c' }}>{totalRusak}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signatures */}
                  {page.hasSignatures && (
                    <div style={{ paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px' }}>
                      <div style={{ textAlign: 'center', width: '200px' }}>
                        <p style={{ fontWeight: '700', color: '#334155', margin: 0 }}>{signer1Title || 'Dibuat Oleh,'}</p>
                        <div style={{ borderBottom: '1px solid #64748b', width: '150px', margin: '40px auto 8px auto' }}></div>
                        <p style={{ fontWeight: '900', color: '#0f172a', margin: 0 }}>{signer1Name || 'Teknisi XXI'}</p>
                        {signer1Role && (
                          <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0', fontWeight: '600' }}>{signer1Role}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'center', width: '200px' }}>
                        <p style={{ fontWeight: '700', color: '#334155', margin: 0 }}>{signer2Title || 'Disetujui Oleh,'}</p>
                        <div style={{ borderBottom: '1px solid #64748b', width: '150px', margin: '40px auto 8px auto' }}></div>
                        <p style={{ fontWeight: '900', color: '#0f172a', margin: 0 }}>{signer2Name || 'Chief Engineer'}</p>
                        {signer2Role && (
                          <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0', fontWeight: '600' }}>{signer2Role}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ paddingTop: '12px', marginTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '10px', color: '#64748b', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Dokumen Resmi Cinema XXI Lippo Mall Puri &bull; Engineering App</span>
                  <span>Halaman {pageIdx + 1} dari {paginatedExportPages.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* --- HIDDEN PRINTABLE A4 PDF TEMPLATE CONTAINER --- */}
      <div ref={pdfWrapperRef} className="fixed top-0 -left-[9999px] pointer-events-none opacity-100 z-[-100]">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {paginatedExportPages.map((page, pageIdx) => (
            <div
              key={`pdf-page-${pageIdx}`}
              className="pdf-page-sheet"
              style={{
                width: '800px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: '32px',
                fontFamily: 'Arial, sans-serif',
                minHeight: '1120px',
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Header Kop Surat XXI */}
                {pageIdx === 0 ? (
                  <div style={{ borderBottom: '4px solid #f59e0b', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ backgroundColor: '#0f172a', color: '#f59e0b', fontWeight: '900', padding: '4px 12px', borderRadius: '4px', fontSize: '18px', fontFamily: 'monospace', letterSpacing: '1px' }}>
                          CINEMA XXI
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'monospace', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px' }}>
                          LIPPO MALL PURI
                        </span>
                      </div>
                      <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginTop: '8px', letterSpacing: '-0.5px', margin: '8px 0 0 0' }}>
                        LAPORAN INVENTARIS MASTER AREA &amp; EQUIPMENT
                      </h1>
                      <p style={{ fontSize: '12px', color: '#475569', fontWeight: '500', marginTop: '2px', margin: '2px 0 0 0' }}>
                        Departemen Engineering &amp; Maintenance &mdash; Cinema XXI Lippo Mall Puri
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>
                      <p style={{ fontWeight: '900', color: '#0f172a', margin: 0 }}>TANGGAL CETAK:</p>
                      <p style={{ marginTop: '2px', margin: 0 }}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                        Filter: {exportAreasToRender.length === areas.length ? 'Semua Area' : `${exportAreasToRender.length} Area Terpilih`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#0f172a', color: '#f59e0b', fontWeight: '900', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
                        CINEMA XXI
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                        LAPORAN MASTER AREA &amp; EQUIPMENT (SAMBUNGAN)
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: '#475569' }}>
                      Halaman {pageIdx + 1} dari {paginatedExportPages.length}
                    </span>
                  </div>
                )}

                {/* Area Cards for this page */}
                {page.areas.map((area) => {
                  const globalIdx = exportAreasToRender.findIndex((a) => a.id === area.id);
                  const areaEq = equipment.filter((eq) => eq.areaId === area.id);
                  return (
                    <div key={area.id} style={{ marginBottom: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '10px' }}>
                        <div>
                          <h3 style={{ fontWeight: '900', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <span style={{ backgroundColor: '#0f172a', color: '#f59e0b', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: '700' }}>
                              {globalIdx + 1}
                            </span>
                            AREA: {area.name.toUpperCase()}
                          </h3>
                          {area.keterangan && (
                            <p style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', marginTop: '2px', margin: 0 }}>{area.keterangan}</p>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', color: '#0f172a', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px' }}>
                          Total: {areaEq.length} Equipment
                        </span>
                      </div>

                      {areaEq.length === 0 ? (
                        <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center', color: '#64748b', fontSize: '11px', fontStyle: 'italic', boxSizing: 'border-box' }}>
                          Belum ada equipment terdaftar di area ini.
                        </div>
                      ) : (
                        <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse', border: '1px solid #cbd5e1', tableLayout: 'fixed', boxSizing: 'border-box' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#e2e8f0', color: '#0f172a', fontWeight: '900', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                              <th style={{ border: '1px solid #cbd5e1', padding: '6px 4px', width: '6%', textAlign: 'center', boxSizing: 'border-box' }}>No</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', width: '36%', textAlign: 'left', boxSizing: 'border-box' }}>Nama Equipment</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '6px 4px', width: '8%', textAlign: 'center', boxSizing: 'border-box' }}>Qty</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '6px 4px', width: '18%', textAlign: 'center', boxSizing: 'border-box' }}>Status</th>
                              <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', width: '32%', textAlign: 'left', boxSizing: 'border-box' }}>Keterangan / Catatan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {areaEq.map((eq, eqIdx) => (
                              <tr key={eq.id} style={{ backgroundColor: eqIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700', color: '#334155', boxSizing: 'border-box' }}>{eqIdx + 1}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: '700', color: '#0f172a', boxSizing: 'border-box' }}>{eq.name}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px 4px', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a', boxSizing: 'border-box' }}>{eq.quantity}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px 4px', textAlign: 'center', boxSizing: 'border-box' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    maxWidth: '105px',
                                    padding: '2.5px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    textAlign: 'center',
                                    boxSizing: 'border-box',
                                    backgroundColor: eq.status === 'Normal' ? '#d1fae5' : eq.status === 'Maintenance' ? '#fef3c7' : '#ffe4e6',
                                    color: eq.status === 'Normal' ? '#065f46' : eq.status === 'Maintenance' ? '#92400e' : '#9f1239',
                                    border: `1px solid ${eq.status === 'Normal' ? '#6ee7b7' : eq.status === 'Maintenance' ? '#fcd34d' : '#fda4af'}`
                                  }}>
                                    {eq.status === 'Normal' ? 'Normal [OK]' : eq.status === 'Maintenance' ? 'Maintenance' : 'Rusak [Rsk]'}
                                  </span>
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', color: '#334155', boxSizing: 'border-box' }}>
                                  {eq.keterangan || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}

                {/* Summary Box */}
                {page.hasSummary && (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 14px', backgroundColor: '#f1f5f9', marginTop: '16px', boxSizing: 'border-box' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: '900', fontFamily: 'monospace', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', marginTop: 0 }}>
                      RINGKASAN REKAPITULASI INVENTARIS
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center', fontSize: '11px', fontFamily: 'monospace' }}>
                      <div style={{ backgroundColor: '#ffffff', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                        <span style={{ display: 'block', fontSize: '9px', color: '#64748b', fontWeight: '700', marginBottom: '2px' }}>TOTAL AREA</span>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>{exportAreasToRender.length}</span>
                      </div>
                      <div style={{ backgroundColor: '#ffffff', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                        <span style={{ display: 'block', fontSize: '9px', color: '#64748b', fontWeight: '700', marginBottom: '2px' }}>NORMAL [OK]</span>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#047857' }}>{totalNormal}</span>
                      </div>
                      <div style={{ backgroundColor: '#ffffff', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                        <span style={{ display: 'block', fontSize: '9px', color: '#64748b', fontWeight: '700', marginBottom: '2px' }}>MAINTENANCE</span>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#b45309' }}>{totalMaintenance}</span>
                      </div>
                      <div style={{ backgroundColor: '#ffffff', padding: '8px 4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                        <span style={{ display: 'block', fontSize: '9px', color: '#64748b', fontWeight: '700', marginBottom: '2px' }}>RUSAK</span>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#b91c1c' }}>{totalRusak}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Signatures */}
                {page.hasSignatures && (
                  <div style={{ paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px' }}>
                    <div style={{ textAlign: 'center', width: '200px' }}>
                      <p style={{ fontWeight: '700', color: '#334155', margin: 0 }}>{signer1Title || 'Dibuat Oleh,'}</p>
                      <div style={{ borderBottom: '1px solid #64748b', width: '150px', margin: '40px auto 8px auto' }}></div>
                      <p style={{ fontWeight: '900', color: '#0f172a', margin: 0 }}>{signer1Name || 'Teknisi XXI'}</p>
                      {signer1Role && (
                        <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0', fontWeight: '600' }}>{signer1Role}</p>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', width: '200px' }}>
                      <p style={{ fontWeight: '700', color: '#334155', margin: 0 }}>{signer2Title || 'Disetujui Oleh,'}</p>
                      <div style={{ borderBottom: '1px solid #64748b', width: '150px', margin: '40px auto 8px auto' }}></div>
                      <p style={{ fontWeight: '900', color: '#0f172a', margin: 0 }}>{signer2Name || 'Chief Engineer'}</p>
                      {signer2Role && (
                        <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0', fontWeight: '600' }}>{signer2Role}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ paddingTop: '12px', marginTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '10px', color: '#64748b', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Dokumen Resmi Cinema XXI Lippo Mall Puri &bull; Engineering App</span>
                <span>Halaman {pageIdx + 1} dari {paginatedExportPages.length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
