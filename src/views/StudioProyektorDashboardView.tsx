/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Film,
  Projector,
  Plus,
  Edit,
  Trash2,
  Search,
  Download,
  Upload,
  Maximize2,
  ImageIcon,
  Save,
  X,
  Check,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Wrench,
  FileText,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import {
  StudioProyektorItem,
  EquipmentItem,
  StudioProyektorImage
} from '../types/studioProyektor';
import studioProyektorService from '../services/studioProyektorService';
import {
  exportStudioProyektorDashboardToPdf,
  ExportPdfScope
} from '../utils/exportStudioProyektorPdf';
import { compressImageFile } from '../utils/imageCompressor';

interface StudioProyektorDashboardViewProps {
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function StudioProyektorDashboardView({
  onShowToast
}: StudioProyektorDashboardViewProps) {
  // 1. Primary Category: 'studio' | 'proyektor'
  const [activeCategory, setActiveCategory] = useState<'studio' | 'proyektor'>('studio');

  // 2. Data state
  const [allItems, setAllItems] = useState<StudioProyektorItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // 3. Search query
  const [searchQuery, setSearchQuery] = useState('');

  // 4. Modals for Ruangan (Studio / Proyektor)
  const [isAddRuanganOpen, setIsAddRuanganOpen] = useState(false);
  const [newRuanganName, setNewRuanganName] = useState('');
  const [addRuanganError, setAddRuanganError] = useState<string | null>(null);
  const [isSavingRuangan, setIsSavingRuangan] = useState(false);

  const [isEditRuanganOpen, setIsEditRuanganOpen] = useState(false);
  const [editingRuanganId, setEditingRuanganId] = useState<string | null>(null);
  const [editingRuanganName, setEditingRuanganName] = useState('');
  const [editRuanganError, setEditRuanganError] = useState<string | null>(null);
  const [isSavingRename, setIsSavingRename] = useState(false);

  const [isDeleteRuanganOpen, setIsDeleteRuanganOpen] = useState(false);
  const [ruanganToDelete, setRuanganToDelete] = useState<StudioProyektorItem | null>(null);
  const [isDeletingRuangan, setIsDeletingRuangan] = useState(false);

  // 5. Equipment Modal state (Add / Edit)
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [equipmentForm, setEquipmentForm] = useState<{
    nama: string;
    merek: string;
    tipeModel: string;
    nomorSeri: string;
    spesifikasi: string;
    keterangan: string;
  }>({
    nama: '',
    merek: '',
    tipeModel: '',
    nomorSeri: '',
    spesifikasi: '',
    keterangan: ''
  });
  const [equipmentFormError, setEquipmentFormError] = useState<string | null>(null);
  const [isSavingEquipment, setIsSavingEquipment] = useState(false);

  // 6. Equipment Deletion states
  const [equipmentToDelete, setEquipmentToDelete] = useState<EquipmentItem | null>(null);
  const [isDeletingEquipment, setIsDeletingEquipment] = useState(false);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());
  const [isDeleteSelectedEquipmentOpen, setIsDeleteSelectedEquipmentOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [isDeleteAllEquipmentOpen, setIsDeleteAllEquipmentOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // 7. Staged Image state (Pratinjau sebelum Terapkan Gambar)
  const [stagedImage, setStagedImage] = useState<StudioProyektorImage | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeleteImageOpen, setIsDeleteImageOpen] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);

  // 8. Fullscreen image viewer
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; title: string } | null>(null);

  // 9. Catatan state
  const [catatanText, setCatatanText] = useState('');
  const [isSavingCatatan, setIsSavingCatatan] = useState(false);

  // 10. PDF Export Dialog state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportOption, setExportOption] = useState<'all' | 'all-studios' | 'all-proyektors' | 'single-studio' | 'single-proyektor'>('all');
  const [selectedExportStudioId, setSelectedExportStudioId] = useState<string>('');
  const [selectedExportProyektorId, setSelectedExportProyektorId] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  // 11. Mobile navigation view: 'list' | 'detail'
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to service updates
  useEffect(() => {
    const update = () => {
      const items = studioProyektorService.getItems();
      setAllItems(items);
    };
    update();
    const unsub = studioProyektorService.subscribe(update);
    return () => unsub();
  }, []);

  // Filter items by category
  const categoryItems = useMemo(() => {
    return allItems.filter((i) => i.category === activeCategory);
  }, [allItems, activeCategory]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return categoryItems;
    const q = searchQuery.toLowerCase().trim();
    return categoryItems.filter((i) => {
      const matchName = i.name.toLowerCase().includes(q);
      const matchEquipment = i.equipments.some((eq) =>
        (eq.nama || '').toLowerCase().includes(q) ||
        (eq.merek || '').toLowerCase().includes(q) ||
        (eq.tipeModel || '').toLowerCase().includes(q) ||
        (eq.nomorSeri || '').toLowerCase().includes(q) ||
        (eq.spesifikasi || '').toLowerCase().includes(q) ||
        (eq.keterangan || '').toLowerCase().includes(q)
      );
      return matchName || matchEquipment;
    });
  }, [categoryItems, searchQuery]);

  // Active selected item
  const selectedItem = useMemo(() => {
    if (selectedItemId) {
      const found = allItems.find((i) => i.id === selectedItemId);
      if (found && found.category === activeCategory) return found;
    }
    return filteredItems[0] || categoryItems[0] || null;
  }, [allItems, selectedItemId, filteredItems, categoryItems, activeCategory]);

  // Keep selectedItemId in sync
  useEffect(() => {
    if (selectedItem && selectedItem.id !== selectedItemId) {
      setSelectedItemId(selectedItem.id);
    }
  }, [selectedItem]);

  // Update Catatan draft when selected item changes
  useEffect(() => {
    setCatatanText(selectedItem?.catatan || '');
    setStagedImage(null);
    setSelectedEquipmentIds(new Set());
  }, [selectedItem?.id]);

  // Switch category
  const handleSelectCategory = (cat: 'studio' | 'proyektor') => {
    setActiveCategory(cat);
    setSearchQuery('');
    setStagedImage(null);
    setSelectedEquipmentIds(new Set());
    const firstOfCat = allItems.find((i) => i.category === cat);
    if (firstOfCat) {
      setSelectedItemId(firstOfCat.id);
    } else {
      setSelectedItemId('');
    }
    setMobileView('list');
  };

  // Helper to update item through service
  const updateItemEverywhere = async (updated: StudioProyektorItem, successMsg?: string) => {
    try {
      await studioProyektorService.saveItem(updated);
      if (successMsg) onShowToast?.(successMsg, 'success');
    } catch (err: any) {
      console.error(err);
      onShowToast?.(`Gagal menyimpan: ${err?.message || 'Kesalahan sistem'}`, 'error');
    }
  };

  // =========================================================================
  // CRUD RUANGAN (STUDIO / PROYEKTOR)
  // =========================================================================

  // Create new Ruangan
  const handleCreateRuangan = async () => {
    const trimmed = newRuanganName.trim();
    if (!trimmed) {
      setAddRuanganError('Nama tidak boleh kosong.');
      return;
    }

    setIsSavingRuangan(true);
    setAddRuanganError(null);

    try {
      const created = await studioProyektorService.createNewItem(trimmed, activeCategory);
      setNewRuanganName('');
      setIsAddRuanganOpen(false); // Form otomatis tertutup setelah berhasil
      setSelectedItemId(created.id);
      setMobileView('detail');
      onShowToast?.(`${created.name} berhasil ditambahkan!`, 'success');
    } catch (err: any) {
      console.error(err);
      setAddRuanganError(`Gagal menambahkan: ${err?.message || 'Kesalahan sistem'}`);
    } finally {
      setIsSavingRuangan(false);
    }
  };

  // Open Edit Name Modal
  const handleOpenEditName = (item: StudioProyektorItem) => {
    setEditingRuanganId(item.id);
    setEditingRuanganName(item.name);
    setEditRuanganError(null);
    setIsEditRuanganOpen(true);
  };

  // Save Renamed Ruangan
  const handleSaveRename = async () => {
    const trimmed = editingRuanganName.trim();
    if (!editingRuanganId || !trimmed) {
      setEditRuanganError('Nama tidak boleh kosong.');
      return;
    }
    const target = allItems.find((i) => i.id === editingRuanganId);
    if (!target) return;

    setIsSavingRename(true);
    setEditRuanganError(null);

    try {
      const updated: StudioProyektorItem = {
        ...target,
        name: trimmed
      };

      await studioProyektorService.saveItem(updated);
      setIsEditRuanganOpen(false); // Form otomatis tertutup setelah berhasil
      setEditingRuanganId(null);
      setEditingRuanganName('');
      onShowToast?.(`Nama berhasil diubah menjadi ${updated.name}!`, 'success');
    } catch (err: any) {
      console.error(err);
      setEditRuanganError(`Gagal mengubah nama: ${err?.message || 'Kesalahan sistem'}`);
    } finally {
      setIsSavingRename(false);
    }
  };

  // Confirm Delete Ruangan
  const handleConfirmDeleteRuangan = async () => {
    if (!ruanganToDelete) return;
    const targetId = ruanganToDelete.id;
    const targetName = ruanganToDelete.name;

    setIsDeletingRuangan(true);
    try {
      await studioProyektorService.deleteItem(targetId);
      setIsDeleteRuanganOpen(false);
      setRuanganToDelete(null);

      // Otomatis arahkan ke item tersisa pada kategori aktif
      const remainingInCat = allItems.filter((i) => i.id !== targetId && i.category === activeCategory);
      if (remainingInCat.length > 0) {
        setSelectedItemId(remainingInCat[0].id);
      } else {
        const anyRemaining = allItems.filter((i) => i.id !== targetId);
        if (anyRemaining.length > 0) {
          setSelectedItemId(anyRemaining[0].id);
          setActiveCategory(anyRemaining[0].category);
        } else {
          setSelectedItemId('');
        }
      }

      onShowToast?.(`Data ${targetName} berhasil dihapus.`, 'info');
      setMobileView('list');
    } catch (err: any) {
      console.error(err);
      onShowToast?.(`Gagal menghapus: ${err?.message || 'Kesalahan sistem'}`, 'error');
    } finally {
      setIsDeletingRuangan(false);
    }
  };

  // =========================================================================
  // CRUD EQUIPMENT
  // =========================================================================

  // Open Add Equipment Modal
  const handleOpenAddEquipment = () => {
    setEditingEquipmentId(null);
    setEquipmentForm({
      nama: '',
      merek: '',
      tipeModel: '',
      nomorSeri: '',
      spesifikasi: '',
      keterangan: ''
    });
    setEquipmentFormError(null);
    setIsEquipmentModalOpen(true);
  };

  // Open Edit Equipment Modal
  const handleOpenEditEquipment = (eq: EquipmentItem) => {
    setEditingEquipmentId(eq.id);
    setEquipmentForm({
      nama: eq.nama || '',
      merek: eq.merek || '',
      tipeModel: eq.tipeModel || '',
      nomorSeri: eq.nomorSeri || '',
      spesifikasi: eq.spesifikasi || '',
      keterangan: eq.keterangan || ''
    });
    setEquipmentFormError(null);
    setIsEquipmentModalOpen(true);
  };

  // Save Equipment (Add or Edit) with instant UI update and auto-close
  const handleSaveEquipment = async () => {
    if (!selectedItem) return;

    // 1. Validation
    if (!equipmentForm.nama.trim()) {
      setEquipmentFormError('Nama equipment wajib diisi.');
      return;
    }

    setIsSavingEquipment(true);
    setEquipmentFormError(null);

    try {
      let updatedList = [...selectedItem.equipments];

      if (editingEquipmentId) {
        // Edit existing
        updatedList = updatedList.map((eq) =>
          eq.id === editingEquipmentId
            ? {
                ...eq,
                nama: equipmentForm.nama.trim(),
                merek: equipmentForm.merek.trim(),
                tipeModel: equipmentForm.tipeModel.trim(),
                nomorSeri: equipmentForm.nomorSeri.trim(),
                spesifikasi: equipmentForm.spesifikasi.trim(),
                keterangan: equipmentForm.keterangan.trim()
              }
            : eq
        );
      } else {
        // Create new
        const newEq: EquipmentItem = {
          id: `eq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          nama: equipmentForm.nama.trim(),
          merek: equipmentForm.merek.trim(),
          tipeModel: equipmentForm.tipeModel.trim(),
          nomorSeri: equipmentForm.nomorSeri.trim(),
          spesifikasi: equipmentForm.spesifikasi.trim(),
          keterangan: equipmentForm.keterangan.trim()
        };
        updatedList.push(newEq);
      }

      const updatedItem: StudioProyektorItem = {
        ...selectedItem,
        equipments: updatedList
      };

      // 2. Persist to database & update local listeners
      await studioProyektorService.saveItem(updatedItem);

      // 3. Auto-close form on success & reset form inputs
      setIsEquipmentModalOpen(false);
      setEditingEquipmentId(null);
      setEquipmentForm({
        nama: '',
        merek: '',
        tipeModel: '',
        nomorSeri: '',
        spesifikasi: '',
        keterangan: ''
      });

      onShowToast?.(
        editingEquipmentId
          ? 'Perubahan equipment berhasil disimpan!'
          : `Equipment "${equipmentForm.nama.trim()}" berhasil ditambahkan!`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      setEquipmentFormError(`Gagal menyimpan: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSavingEquipment(false);
    }
  };

  // Delete Single Equipment
  const handleConfirmDeleteSingleEquipment = async () => {
    if (!selectedItem || !equipmentToDelete) return;
    const targetName = equipmentToDelete.nama;
    const updatedList = selectedItem.equipments.filter((eq) => eq.id !== equipmentToDelete.id);
    const updatedItem = { ...selectedItem, equipments: updatedList };

    setIsDeletingEquipment(true);
    try {
      // Remove from selection set if present
      setSelectedEquipmentIds((prev) => {
        const next = new Set(prev);
        next.delete(equipmentToDelete.id);
        return next;
      });

      await studioProyektorService.saveItem(updatedItem);
      setEquipmentToDelete(null);
      onShowToast?.(`Equipment "${targetName}" berhasil dihapus.`, 'info');
    } catch (err: any) {
      console.error(err);
      onShowToast?.(`Gagal menghapus equipment: ${err?.message}`, 'error');
    } finally {
      setIsDeletingEquipment(false);
    }
  };

  // =========================================================================
  // CHECKBOX SELECTION & BATCH DELETION
  // =========================================================================

  const allEquipmentsSelected = useMemo(() => {
    if (!selectedItem || selectedItem.equipments.length === 0) return false;
    return selectedItem.equipments.every((eq) => selectedEquipmentIds.has(eq.id));
  }, [selectedItem, selectedEquipmentIds]);

  const handleToggleSelectAll = () => {
    if (!selectedItem) return;
    if (allEquipmentsSelected) {
      setSelectedEquipmentIds(new Set());
    } else {
      setSelectedEquipmentIds(new Set(selectedItem.equipments.map((eq) => eq.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedEquipmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Delete Selected Equipments
  const handleConfirmDeleteSelected = async () => {
    if (!selectedItem || selectedEquipmentIds.size === 0) return;
    const count = selectedEquipmentIds.size;
    const updatedList = selectedItem.equipments.filter((eq) => !selectedEquipmentIds.has(eq.id));
    const updatedItem = { ...selectedItem, equipments: updatedList };

    setIsDeletingBatch(true);
    try {
      setSelectedEquipmentIds(new Set());
      setIsDeleteSelectedEquipmentOpen(false);
      await studioProyektorService.saveItem(updatedItem);
      onShowToast?.(`${count} equipment terpilih berhasil dihapus.`, 'info');
    } catch (err: any) {
      console.error(err);
      onShowToast?.(`Gagal menghapus terpilih: ${err?.message}`, 'error');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Delete All Equipments in this room
  const handleConfirmDeleteAll = async () => {
    if (!selectedItem) return;
    const updatedItem = { ...selectedItem, equipments: [] };

    setIsDeletingAll(true);
    try {
      setSelectedEquipmentIds(new Set());
      setIsDeleteAllEquipmentOpen(false);
      await studioProyektorService.saveItem(updatedItem);
      onShowToast?.(`Seluruh equipment pada ${selectedItem.name} telah dikosongkan.`, 'info');
    } catch (err: any) {
      console.error(err);
      onShowToast?.(`Gagal mengosongkan equipment: ${err?.message}`, 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  // =========================================================================
  // GAMBAR & FOTO RESPONSIF (KOMPRESI + PRATINJAU + TERAPKAN)
  // =========================================================================

  // Input Gambar (Pilih file -> kompres -> tampilkan pratinjau sebelum diterapkan)
  const handleInputImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItem) return;

    setIsUploadingImage(true);
    try {
      const compressed = await compressImageFile(file, 1280, 0.82);
      setStagedImage({
        id: `img-${Date.now()}`,
        dataUrl: compressed.dataUrl,
        name: compressed.name,
        sizeFormatted: compressed.sizeFormatted,
        uploadedAt: new Date().toISOString()
      });
      onShowToast?.('Pratinjau gambar siap. Klik "Terapkan Gambar" untuk menyimpan.', 'info');
    } catch (err: any) {
      console.error(err);
      onShowToast?.(`Gagal memproses gambar: ${err?.message}`, 'error');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Terapkan Gambar
  const handleApplyImage = async () => {
    if (!selectedItem || !stagedImage) return;
    const updatedItem = {
      ...selectedItem,
      image: stagedImage
    };
    await updateItemEverywhere(updatedItem, 'Gambar berhasil diterapkan dan disimpan!');
    setStagedImage(null);
  };

  // Hapus Gambar
  const handleConfirmDeleteImage = async () => {
    if (!selectedItem) return;
    const updatedItem = {
      ...selectedItem,
      image: null
    };
    setIsDeletingImage(true);
    try {
      await studioProyektorService.saveItem(updatedItem);
      setIsDeleteImageOpen(false);
      onShowToast?.('Gambar berhasil dihapus.', 'info');
    } catch (err: any) {
      console.error(err);
      onShowToast?.(`Gagal menghapus gambar: ${err?.message}`, 'error');
    } finally {
      setIsDeletingImage(false);
    }
  };

  // =========================================================================
  // CATATAN TEKNIS
  // =========================================================================
  const handleSaveCatatan = async () => {
    if (!selectedItem) return;
    if (catatanText === (selectedItem.catatan || '')) return;
    const updatedItem = {
      ...selectedItem,
      catatan: catatanText.trim()
    };
    setIsSavingCatatan(true);
    try {
      await studioProyektorService.saveItem(updatedItem);
      onShowToast?.('Catatan teknis berhasil disimpan!', 'success');
    } catch (err: any) {
      console.error(err);
      onShowToast?.(`Gagal menyimpan catatan: ${err?.message}`, 'error');
    } finally {
      setIsSavingCatatan(false);
    }
  };

  // =========================================================================
  // EXPORT PDF
  // =========================================================================
  const handleExecuteExportPdf = async () => {
    let scope: ExportPdfScope = { type: 'all' };

    if (exportOption === 'all') {
      scope = { type: 'all' };
    } else if (exportOption === 'all-studios') {
      scope = { type: 'all-studios' };
    } else if (exportOption === 'all-proyektors') {
      scope = { type: 'all-proyektors' };
    } else if (exportOption === 'single-studio') {
      if (!selectedExportStudioId) {
        onShowToast?.('Silakan pilih studio yang ingin diekspor.', 'error');
        return;
      }
      scope = { type: 'single-studio', itemId: selectedExportStudioId };
    } else if (exportOption === 'single-proyektor') {
      if (!selectedExportProyektorId) {
        onShowToast?.('Silakan pilih proyektor yang ingin diekspor.', 'error');
        return;
      }
      scope = { type: 'single-proyektor', itemId: selectedExportProyektorId };
    }

    try {
      setIsExportingPdf(true);
      await exportStudioProyektorDashboardToPdf(allItems, scope, (msg) => {
        setPdfProgress(msg);
      });
      setIsExportModalOpen(false);
      onShowToast?.('File PDF berhasil dibuat dan mulai diunduh!', 'success');
    } catch (err: any) {
      console.error(err);
      onShowToast?.(`Gagal mengekspor PDF: ${err?.message || 'Kesalahan sistem'}`, 'error');
    } finally {
      setIsExportingPdf(false);
      setPdfProgress('');
    }
  };

  const totalStudios = allItems.filter((i) => i.category === 'studio').length;
  const totalProyektors = allItems.filter((i) => i.category === 'proyektor').length;

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in" id="studio-proyektor-3panel-root">
      {/* ========================================================================= */}
      {/* TOP HEADER BANNER */}
      {/* ========================================================================= */}
      <div className="bg-[#0b1222]/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-cyan-500/30 shadow-[0_0_25px_rgba(0,240,255,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-3 py-1 rounded-md bg-cyan-950/90 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40 uppercase tracking-widest flex items-center gap-1.5">
              <Projector className="w-4 h-4 text-cyan-400" />
              DIGITAL TECHNICAL REFERENCE
            </span>
            <span className="px-2.5 py-1 rounded-md bg-amber-950/80 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
              CINEMA XXI LIPPO MALL PURI
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans flex items-center gap-2.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            STUDIO &amp; PROYEKTOR
          </h2>
          <p className="text-sm text-slate-300 font-sans mt-0.5">
            Data Spesifikasi Teknis Cinema XXI Lippo Mall Puri
          </p>
        </div>

        {/* Tombol Export PDF */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const studios = allItems.filter((i) => i.category === 'studio');
              const proyektors = allItems.filter((i) => i.category === 'proyektor');
              if (studios.length > 0) setSelectedExportStudioId(studios[0].id);
              if (proyektors.length > 0) setSelectedExportProyektorId(proyektors[0].id);
              setIsExportModalOpen(true);
            }}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-mono text-sm font-black transition-all flex items-center gap-2.5 shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer hover:scale-102 active:scale-98"
            id="btn-export-pdf"
          >
            <Download className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3-PANEL DASHBOARD GRID (PROPORSIONAL, PADAT, & RESPONSIF) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* ======================================================================= */}
        {/* PANEL 1 (KIRI) — KATEGORI: STUDIO / PROYEKTOR (lg:col-span-3 xl:col-span-2) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-3 xl:col-span-2 bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-4 sm:p-4.5 shadow-lg space-y-3.5">
          <div className="pb-2.5 border-b border-cyan-500/20">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block">
              PANEL 1 • KATEGORI
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white font-sans mt-0.5">Pilih Kategori</h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
            {/* Kategori 1: STUDIO */}
            <button
              type="button"
              onClick={() => handleSelectCategory('studio')}
              className={`w-full p-3 sm:p-4 rounded-xl transition-all cursor-pointer text-left flex items-center justify-between gap-3 border ${
                activeCategory === 'studio'
                  ? 'bg-gradient-to-r from-cyan-950 to-blue-950/90 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)] text-white scale-[1.01]'
                  : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/60'
              }`}
              id="category-btn-studio"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2.5 rounded-xl ${
                    activeCategory === 'studio'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_12px_#00f0ff]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Film className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm sm:text-base font-black text-white uppercase tracking-tight">
                    STUDIO
                  </p>
                  <p className="text-xs text-slate-400 hidden sm:block truncate">Layar &amp; Sound</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-black ${
                  activeCategory === 'studio'
                    ? 'bg-cyan-900 text-cyan-200 border border-cyan-400/50'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {totalStudios}
              </span>
            </button>

            {/* Kategori 2: PROYEKTOR */}
            <button
              type="button"
              onClick={() => handleSelectCategory('proyektor')}
              className={`w-full p-3 sm:p-4 rounded-xl transition-all cursor-pointer text-left flex items-center justify-between gap-3 border ${
                activeCategory === 'proyektor'
                  ? 'bg-gradient-to-r from-cyan-950 to-blue-950/90 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)] text-white scale-[1.01]'
                  : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/60'
              }`}
              id="category-btn-proyektor"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2.5 rounded-xl ${
                    activeCategory === 'proyektor'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_12px_#00f0ff]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Projector className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm sm:text-base font-black text-white uppercase tracking-tight">
                    PROYEKTOR
                  </p>
                  <p className="text-xs text-slate-400 hidden sm:block truncate">Mesin &amp; Booth</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-black ${
                  activeCategory === 'proyektor'
                    ? 'bg-cyan-900 text-cyan-200 border border-cyan-400/50'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {totalProyektors}
              </span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-1">
            <p className="font-bold text-cyan-300">💡 Fleksibel &amp; Mandiri:</p>
            <p>Tambah, ubah nama, dan hapus Studio atau Proyektor sesuai kebutuhan, lalu kelola equipment di panel detail.</p>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PANEL 2 (TENGAH) — DAFTAR STUDIO / PROYEKTOR (lg:col-span-4 xl:col-span-3) */}
        {/* ======================================================================= */}
        <div
          className={`lg:col-span-4 xl:col-span-3 bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-4 sm:p-5 shadow-lg space-y-3.5 ${
            mobileView === 'detail' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/20">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                PANEL 2 • DAFTAR
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white font-sans uppercase mt-0.5">
                {activeCategory === 'studio' ? 'Daftar Studio' : 'Daftar Proyektor'}
              </h3>
            </div>

            {/* Tombol + Tambah Ruangan */}
            <button
              type="button"
              onClick={() => {
                setNewRuanganName('');
                setAddRuanganError(null);
                setIsAddRuanganOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer hover:scale-102 active:scale-98"
              title={`Tambah ${activeCategory === 'studio' ? 'Studio' : 'Proyektor'} Baru`}
              id="btn-tambah-ruangan"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Tambah</span>
            </button>
          </div>

          {/* Kolom Pencarian */}
          <div className="relative">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari nama ${activeCategory} atau perangkat...`}
              className="w-full pl-9 pr-7 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Daftar Ruangan */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setMobileView('detail');
                    }}
                    className={`group p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2.5 border ${
                      isSelected
                        ? 'bg-cyan-950/85 border-cyan-400 text-white shadow-[0_0_14px_rgba(0,240,255,0.25)] scale-[1.01]'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {activeCategory === 'studio' ? (
                        <Film className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                      ) : (
                        <Projector className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                      )}
                      <span className="font-mono text-sm font-bold truncate text-slate-100">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                        {item.equipments.length} Eq
                      </span>

                      {/* Tombol Edit Nama */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditName(item);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                        title="Edit Nama"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Tombol Hapus Ruangan */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRuanganToDelete(item);
                          setIsDeleteRuanganOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Hapus Ruangan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-500 font-mono text-xs space-y-3">
                <p>Tidak ada data {activeCategory}.</p>
                <button
                  type="button"
                  onClick={() => {
                    setNewRuanganName('');
                    setAddRuanganError(null);
                    setIsAddRuanganOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold hover:bg-cyan-900 cursor-pointer"
                >
                  + Tambah {activeCategory === 'studio' ? 'Studio' : 'Proyektor'} Baru
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PANEL 3 (KANAN) — DETAIL DAN EQUIPMENT (lg:col-span-5 xl:col-span-7) */}
        {/* ======================================================================= */}
        <div
          className={`lg:col-span-5 xl:col-span-7 bg-[#0b1222]/90 backdrop-blur-md rounded-2xl border border-cyan-500/25 p-4 sm:p-6 shadow-lg space-y-5 ${
            mobileView === 'list' ? 'hidden lg:block' : 'block'
          }`}
        >
          {selectedItem ? (
            <>
              {/* Header Ruangan Terpilih */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-cyan-500/20">
                <div className="flex items-center gap-2.5">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                    title="Kembali ke Daftar"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40 uppercase">
                        DETAIL {selectedItem.category.toUpperCase()}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
                      {selectedItem.name.toUpperCase()}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Edit Nama Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditName(selectedItem)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-4 h-4 text-cyan-400" />
                    <span>Edit Nama</span>
                  </button>

                  {/* Hapus Ruangan Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setRuanganToDelete(selectedItem);
                      setIsDeleteRuanganOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Hapus</span>
                  </button>

                  {/* Tombol + Tambah Equipment */}
                  <button
                    type="button"
                    onClick={handleOpenAddEquipment}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs sm:text-sm font-black transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.35)] cursor-pointer hover:scale-102 active:scale-98"
                    id="btn-tambah-equipment"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>+ Tambah Equipment</span>
                  </button>
                </div>
              </div>

              {/* Section 1: Gambar & Foto Responsif (Opsional) */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-mono font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    Foto / Denah {selectedItem.category === 'studio' ? 'Studio' : 'Proyektor'} (Opsional)
                  </span>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleInputImage}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs sm:text-sm font-mono font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{selectedItem.image ? 'Ganti Gambar' : 'Input Gambar'}</span>
                        </>
                      )}
                    </button>

                    {selectedItem.image && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setFullscreenImage({
                              url: selectedItem.image!.dataUrl,
                              title: `${selectedItem.name} — ${selectedItem.image!.name}`
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition cursor-pointer hover:bg-cyan-900"
                          title="Lihat Fullscreen"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeleteImageOpen(true)}
                          className="p-1.5 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-500/40 text-xs font-mono transition cursor-pointer"
                          title="Hapus Gambar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Pratinjau Sebelum Diterapkan (Staged) */}
                {stagedImage && (
                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border-2 border-dashed border-cyan-400/80 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                      <span className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-cyan-400" />
                        Pratinjau Gambar Baru (Belum Diterapkan):
                      </span>
                      <span>{stagedImage.sizeFormatted}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-slate-950/80 p-3 rounded-lg border border-cyan-500/30">
                      <img
                        src={stagedImage.dataUrl}
                        alt={stagedImage.name}
                        className="max-h-40 max-w-full sm:max-w-[220px] object-contain rounded-lg border border-slate-700"
                      />
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <p className="text-xs sm:text-sm font-mono font-bold text-white truncate max-w-sm">{stagedImage.name}</p>
                        <p className="text-xs text-slate-300">
                          Klik <strong>Terapkan Gambar</strong> untuk menyimpan gambar ini ke dalam spesifikasi {selectedItem.name}.
                        </p>
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                          <button
                            type="button"
                            onClick={handleApplyImage}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                            <span>Terapkan Gambar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStagedImage(null)}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display Saved Image */}
                {selectedItem.image ? (
                  <div className="relative bg-slate-950 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center">
                    <img
                      src={selectedItem.image.dataUrl}
                      alt={selectedItem.image.name}
                      onClick={() =>
                        setFullscreenImage({
                          url: selectedItem.image!.dataUrl,
                          title: `${selectedItem.name} — ${selectedItem.image!.name}`
                        })
                      }
                      className="max-h-60 w-auto max-w-full object-contain rounded-lg cursor-pointer hover:scale-[1.01] transition"
                    />
                    <div className="w-full flex items-center justify-between pt-2 mt-2 border-t border-slate-800 text-xs font-mono text-slate-400">
                      <span className="truncate max-w-sm text-white font-bold">{selectedItem.image.name}</span>
                      <span>{selectedItem.image.sizeFormatted}</span>
                    </div>
                  </div>
                ) : (
                  !stagedImage && (
                    <div className="border border-dashed border-slate-800 rounded-xl p-5 text-center text-slate-500 font-mono text-xs sm:text-sm flex items-center justify-center gap-2">
                      <ImageIcon className="w-4 h-4 opacity-40 text-cyan-400" />
                      <span>Belum ada gambar (foto atau denah) yang terpasang</span>
                    </div>
                  )
                )}
              </div>

              {/* Section 2: Catatan Tambahan (Opsional) */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-mono font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Catatan Teknis Tambahan (Opsional)
                  </span>
                  {catatanText !== (selectedItem.catatan || '') && (
                    <button
                      type="button"
                      disabled={isSavingCatatan}
                      onClick={handleSaveCatatan}
                      className="px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold hover:bg-emerald-900 cursor-pointer flex items-center gap-1.5 transition"
                    >
                      {isSavingCatatan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Simpan Catatan</span>
                    </button>
                  )}
                </div>
                <textarea
                  value={catatanText}
                  onChange={(e) => setCatatanText(e.target.value)}
                  onBlur={handleSaveCatatan}
                  placeholder="Ketik catatan teknis, riwayat setting, atau informasi khusus di sini..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-white font-mono text-xs sm:text-sm focus:outline-none placeholder:text-slate-600"
                />
              </div>

              {/* Section 3: Daftar Equipment & Spesifikasi */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4.5 h-4.5 text-cyan-400" />
                    <h3 className="text-sm sm:text-base font-bold text-white font-sans uppercase">
                      Daftar Equipment &amp; Spesifikasi
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/40">
                      {selectedItem.equipments.length}
                    </span>
                  </div>

                  {/* Bulk Actions & Add Button */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedItem.equipments.length > 0 && (
                      <>
                        {/* Hapus yang Dipilih Button */}
                        <button
                          type="button"
                          disabled={selectedEquipmentIds.size === 0}
                          onClick={() => setIsDeleteSelectedEquipmentOpen(true)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                            selectedEquipmentIds.size > 0
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 hover:bg-rose-900 cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                              : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                          }`}
                          title="Hapus equipment yang dicentang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus yang Dipilih ({selectedEquipmentIds.size})</span>
                        </button>

                        {/* Hapus Semua Button */}
                        <button
                          type="button"
                          onClick={() => setIsDeleteAllEquipmentOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs font-mono font-bold transition cursor-pointer"
                          title="Kosongkan seluruh equipment di ruangan ini"
                        >
                          <span>Hapus Semua</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleOpenAddEquipment}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>+ Tambah Equipment</span>
                    </button>
                  </div>
                </div>

                {/* Table Equipment */}
                {selectedItem.equipments.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs sm:text-sm font-sans border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-cyan-300 font-mono uppercase text-xs border-b border-slate-800">
                          <th className="py-3 px-3 text-center w-10">
                            <button
                              type="button"
                              onClick={handleToggleSelectAll}
                              className="text-cyan-400 hover:text-cyan-200 cursor-pointer"
                              title={allEquipmentsSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                            >
                              {allEquipmentsSelected ? (
                                <CheckSquare className="w-4.5 h-4.5" />
                              ) : (
                                <Square className="w-4.5 h-4.5 opacity-70" />
                              )}
                            </button>
                          </th>
                          <th className="py-3 px-3 font-bold">Nama Equipment</th>
                          <th className="py-3 px-2.5 font-bold">Merek</th>
                          <th className="py-3 px-2.5 font-bold">Tipe / Model</th>
                          <th className="py-3 px-2.5 font-bold">Nomor Seri (SN)</th>
                          <th className="py-3 px-3 font-bold">Spesifikasi</th>
                          <th className="py-3 px-2.5 font-bold">Keterangan</th>
                          <th className="py-3 px-2.5 font-bold text-center w-20">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono text-slate-200">
                        {selectedItem.equipments.map((eq) => {
                          const isChecked = selectedEquipmentIds.has(eq.id);

                          return (
                            <tr
                              key={eq.id}
                              className={`transition ${
                                isChecked ? 'bg-cyan-950/40' : 'hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="py-3 px-3 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectOne(eq.id)}
                                  className="text-cyan-400 hover:text-cyan-200 cursor-pointer"
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4.5 h-4.5" />
                                  ) : (
                                    <Square className="w-4.5 h-4.5 opacity-50" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3 px-3 font-bold text-white text-sm align-middle">
                                {eq.nama || '—'}
                              </td>
                              <td className="py-3 px-2.5 text-slate-300 align-middle">
                                {eq.merek || '—'}
                              </td>
                              <td className="py-3 px-2.5 text-cyan-300 font-bold align-middle">
                                {eq.tipeModel || '—'}
                              </td>
                              <td className="py-3 px-2.5 text-amber-300 font-bold align-middle">
                                {eq.nomorSeri || '—'}
                              </td>
                              <td className="py-3 px-3 text-slate-300 whitespace-pre-wrap max-w-sm align-middle">
                                {eq.spesifikasi || '—'}
                              </td>
                              <td className="py-3 px-2.5 text-slate-400 align-middle">
                                {eq.keterangan || '—'}
                              </td>
                              <td className="py-3 px-2.5 text-center align-middle">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditEquipment(eq)}
                                    className="p-1.5 rounded-lg hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                                    title="Edit Equipment"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEquipmentToDelete(eq)}
                                    className="p-1.5 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                    title="Hapus Equipment"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 font-mono text-xs sm:text-sm space-y-2">
                    <p className="text-slate-300 font-bold text-sm">Belum ada equipment yang ditambahkan.</p>
                    <p className="text-xs text-slate-400">
                      Klik tombol <strong>+ Tambah Equipment</strong> di atas untuk memasukkan perangkat (contoh: Layar, Sound System, Proyektor, Lensa, Server, UPS, dsb).
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 font-mono space-y-2">
              <p className="text-base font-bold text-slate-400">Belum ada ruangan yang dipilih.</p>
              <p className="text-xs sm:text-sm">Pilih salah satu studio atau proyektor dari panel tengah untuk mengelola data teknis dan equipment.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH RUANGAN (STUDIO / PROYEKTOR) - AUTO CLOSE PADA SAAT SUKSES */}
      {/* ========================================================================= */}
      {isAddRuanganOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0b1220] border-2 border-cyan-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/20">
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <Plus className="w-4.5 h-4.5 text-cyan-400" />
                <span>Tambah {activeCategory === 'studio' ? 'Studio' : 'Proyektor'} Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRuanganOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addRuanganError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addRuanganError}</span>
              </div>
            )}

            <div className="space-y-2 text-xs sm:text-sm font-mono">
              <label className="block text-slate-300 font-bold">
                Nama {activeCategory === 'studio' ? 'Studio' : 'Ruang Proyektor'}: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={newRuanganName}
                onChange={(e) => {
                  setNewRuanganName(e.target.value);
                  if (addRuanganError) setAddRuanganError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSavingRuangan) handleCreateRuangan();
                }}
                placeholder={activeCategory === 'studio' ? 'Contoh: Studio 9, Premiere XXI, dll' : 'Contoh: Proyektor Studio 9'}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-white focus:outline-none font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSavingRuangan}
                onClick={() => setIsAddRuanganOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingRuangan}
                onClick={handleCreateRuangan}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-mono text-xs sm:text-sm font-bold transition shadow-[0_0_14px_rgba(0,240,255,0.4)] cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingRuangan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT NAMA RUANGAN - AUTO CLOSE PADA SAAT SUKSES */}
      {/* ========================================================================= */}
      {isEditRuanganOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0b1220] border-2 border-cyan-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-cyan-500/20">
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <Edit className="w-4.5 h-4.5 text-cyan-400" />
                <span>Edit Nama {activeCategory === 'studio' ? 'Studio' : 'Proyektor'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditRuanganOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editRuanganError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editRuanganError}</span>
              </div>
            )}

            <div className="space-y-2 text-xs sm:text-sm font-mono">
              <label className="block text-slate-300 font-bold">Nama Baru: <span className="text-rose-400">*</span></label>
              <input
                type="text"
                autoFocus
                value={editingRuanganName}
                onChange={(e) => {
                  setEditingRuanganName(e.target.value);
                  if (editRuanganError) setEditRuanganError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSavingRename) handleSaveRename();
                }}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-white focus:outline-none font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSavingRename}
                onClick={() => setIsEditRuanganOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingRename}
                onClick={handleSaveRename}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-mono text-xs sm:text-sm font-bold transition shadow-[0_0_14px_rgba(0,240,255,0.4)] cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingRename ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HAPUS RUANGAN (WAJIB BERFUNGSI DENGAN KONFIRMASI) */}
      {/* ========================================================================= */}
      {isDeleteRuanganOpen && ruanganToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0b1220] border-2 border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                  Hapus {ruanganToDelete.name}?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-sans">
                  Apakah Anda yakin ingin menghapus <strong>{ruanganToDelete.name}</strong> dari daftar?
                </p>
                {ruanganToDelete.equipments.length > 0 && (
                  <p className="text-xs text-amber-300 font-mono font-bold pt-1">
                    ⚠️ Perhatian: Ruangan ini memiliki {ruanganToDelete.equipments.length} equipment yang juga akan ikut terhapus.
                  </p>
                )}
                {ruanganToDelete.image && (
                  <p className="text-xs text-amber-300 font-mono font-bold">
                    ⚠️ Foto/denah ruangan juga akan terhapus.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingRuangan}
                onClick={() => {
                  setIsDeleteRuanganOpen(false);
                  setRuanganToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingRuangan}
                onClick={handleConfirmDeleteRuangan}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white font-mono text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer disabled:opacity-50"
              >
                {isDeletingRuangan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT EQUIPMENT (AUTO-CLOSE & IMMEDIATE LIST UPDATE) */}
      {/* ========================================================================= */}
      {isEquipmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#0b1220] border-2 border-cyan-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <h3 className="text-base sm:text-lg font-bold text-white font-sans flex items-center gap-2">
                <Wrench className="w-5 h-5 text-cyan-400" />
                <span>{editingEquipmentId ? 'Edit Equipment' : 'Tambah Equipment Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEquipmentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {equipmentFormError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{equipmentFormError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs sm:text-sm font-mono">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Nama Equipment <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={equipmentForm.nama}
                  onChange={(e) => {
                    setEquipmentForm({ ...equipmentForm, nama: e.target.value });
                    if (equipmentFormError) setEquipmentFormError(null);
                  }}
                  placeholder="Contoh: Layar, Proyektor, Speaker Depan Kiri, Server IMS, UPS, dsb"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white focus:outline-none font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Merek</label>
                  <input
                    type="text"
                    value={equipmentForm.merek}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, merek: e.target.value })}
                    placeholder="Contoh: Christie, Barco, JBL, Dolby"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white focus:outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Tipe / Model</label>
                  <input
                    type="text"
                    value={equipmentForm.tipeModel}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, tipeModel: e.target.value })}
                    placeholder="Contoh: CP2220 / CP4325 / 4642A"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Nomor Seri (SN)</label>
                <input
                  type="text"
                  value={equipmentForm.nomorSeri}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, nomorSeri: e.target.value })}
                  placeholder="Nomor seri resmi perangkat..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-amber-300 focus:outline-none font-mono text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-bold">Spesifikasi</label>
                  {equipmentForm.spesifikasi && (
                    <button
                      type="button"
                      onClick={() => setEquipmentForm({ ...equipmentForm, spesifikasi: '' })}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-mono underline cursor-pointer"
                      title="Kosongkan spesifikasi ini"
                    >
                      Hapus Spesifikasi
                    </button>
                  )}
                </div>
                <textarea
                  value={equipmentForm.spesifikasi}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, spesifikasi: e.target.value })}
                  placeholder="Ukuran, resolusi, daya watt, teknologi, rasio, dll..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white focus:outline-none font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={equipmentForm.keterangan}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, keterangan: e.target.value })}
                  placeholder="Catatan kondisi, letak rak, posisi, dsb..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-slate-300 focus:outline-none font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSavingEquipment}
                onClick={() => setIsEquipmentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingEquipment}
                onClick={handleSaveEquipment}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-[0_0_14px_rgba(0,240,255,0.4)] cursor-pointer disabled:opacity-50"
              >
                {isSavingEquipment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HAPUS SINGLE EQUIPMENT */}
      {/* ========================================================================= */}
      {equipmentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#0b1222] border-2 border-rose-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-sans">
              Hapus Equipment "{equipmentToDelete.nama}"?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans">
              Equipment ini akan dihapus dari daftar {selectedItem?.name}.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingEquipment}
                onClick={() => setEquipmentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs sm:text-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingEquipment}
                onClick={handleConfirmDeleteSingleEquipment}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs sm:text-sm font-bold cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingEquipment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HAPUS SELECTED EQUIPMENTS */}
      {/* ========================================================================= */}
      {isDeleteSelectedEquipmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#0b1222] border-2 border-rose-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-sans">
              Hapus {selectedEquipmentIds.size} Equipment Terpilih?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans">
              Seluruh equipment yang dicentang ({selectedEquipmentIds.size} item) pada {selectedItem?.name} akan dihapus.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={() => setIsDeleteSelectedEquipmentOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs sm:text-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={handleConfirmDeleteSelected}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs sm:text-sm font-bold cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Ya, Hapus Terpilih</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HAPUS SEMUA EQUIPMENT DI RUANGAN INI */}
      {/* ========================================================================= */}
      {isDeleteAllEquipmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0b1222] border-2 border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                  Hapus Seluruh Equipment pada {selectedItem?.name}?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 font-sans">
                  Tindakan ini akan mengosongkan seluruh daftar equipment ({selectedItem?.equipments.length} item) pada {selectedItem?.name}.
                  Nama ruangan dan foto/denah tidak akan terhapus.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setIsDeleteAllEquipmentOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={handleConfirmDeleteAll}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white font-mono text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
              >
                {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Ya, Kosongkan Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HAPUS GAMBAR RUANGAN */}
      {/* ========================================================================= */}
      {isDeleteImageOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#0b1222] border-2 border-rose-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-sans">
              Hapus Gambar {selectedItem?.name}?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans">
              Gambar yang sudah terpasang akan dihapus dari data ruangan ini.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingImage}
                onClick={() => setIsDeleteImageOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs sm:text-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingImage}
                onClick={handleConfirmDeleteImage}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs sm:text-sm font-bold cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Hapus Gambar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN IMAGE VIEWER */}
      {/* ========================================================================= */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-fade-in select-none"
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="flex items-center justify-between pb-3 text-white border-b border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono text-sm sm:text-base font-bold truncate max-w-md">{fullscreenImage.title}</span>
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-rose-500"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center p-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullscreenImage.url}
              alt={fullscreenImage.title}
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PILIHAN EXPORT PDF (5 OPSI) */}
      {/* ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0b1222] border-2 border-amber-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
              <h3 className="text-base sm:text-lg font-bold text-white font-sans flex items-center gap-2">
                <Download className="w-4.5 h-4.5 text-amber-400" />
                <span>Pilihan Export Dokumen PDF</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-sans">
              Pilih cakupan data teknis yang ingin diekspor ke dalam file PDF resmi A4:
            </p>

            <div className="space-y-2 text-xs sm:text-sm font-mono">
              {/* Opsi 1: Semua Studio & Proyektor */}
              <label
                onClick={() => setExportOption('all')}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  exportOption === 'all'
                    ? 'bg-amber-950/60 border-amber-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={exportOption === 'all'}
                  onChange={() => setExportOption('all')}
                  className="text-amber-500"
                />
                <span className="font-bold">Semua Studio &amp; Proyektor ({totalStudios} Studio + {totalProyektors} Proyektor)</span>
              </label>

              {/* Opsi 2: Semua Studio */}
              <label
                onClick={() => setExportOption('all-studios')}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  exportOption === 'all-studios'
                    ? 'bg-amber-950/60 border-amber-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={exportOption === 'all-studios'}
                  onChange={() => setExportOption('all-studios')}
                  className="text-amber-500"
                />
                <span>Semua Studio ({totalStudios} Studio)</span>
              </label>

              {/* Opsi 3: Per Studio */}
              <div
                onClick={() => setExportOption('single-studio')}
                className={`p-3 rounded-xl border space-y-2.5 cursor-pointer transition ${
                  exportOption === 'single-studio'
                    ? 'bg-amber-950/60 border-amber-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportOption === 'single-studio'}
                    onChange={() => setExportOption('single-studio')}
                    className="text-amber-500"
                  />
                  <span>Per Studio (Pilih Satu Studio)</span>
                </label>
                {exportOption === 'single-studio' && (
                  <select
                    value={selectedExportStudioId}
                    onChange={(e) => setSelectedExportStudioId(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-400/60 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  >
                    {allItems
                      .filter((i) => i.category === 'studio')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.equipments.length} Equipment)
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Opsi 4: Semua Proyektor */}
              <label
                onClick={() => setExportOption('all-proyektors')}
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                  exportOption === 'all-proyektors'
                    ? 'bg-amber-950/60 border-amber-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={exportOption === 'all-proyektors'}
                  onChange={() => setExportOption('all-proyektors')}
                  className="text-amber-500"
                />
                <span>Semua Proyektor ({totalProyektors} Proyektor)</span>
              </label>

              {/* Opsi 5: Per Proyektor */}
              <div
                onClick={() => setExportOption('single-proyektor')}
                className={`p-3 rounded-xl border space-y-2.5 cursor-pointer transition ${
                  exportOption === 'single-proyektor'
                    ? 'bg-amber-950/60 border-amber-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportOption === 'single-proyektor'}
                    onChange={() => setExportOption('single-proyektor')}
                    className="text-amber-500"
                  />
                  <span>Per Proyektor (Pilih Satu Ruang Proyektor)</span>
                </label>
                {exportOption === 'single-proyektor' && (
                  <select
                    value={selectedExportProyektorId}
                    onChange={(e) => setSelectedExportProyektorId(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-400/60 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  >
                    {allItems
                      .filter((i) => i.category === 'proyektor')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.equipments.length} Equipment)
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteExportPdf}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 text-slate-950 font-mono text-xs sm:text-sm font-black transition flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>Buat PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LOADING OVERLAY: PDF EXPORT */}
      {/* ========================================================================= */}
      {isExportingPdf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#0b1222] border-2 border-amber-500/50 p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center space-y-3">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            <h3 className="text-base font-bold text-white font-sans">Mengekspor Dokumen PDF</h3>
            <p className="text-xs font-mono text-amber-300">
              {pdfProgress || 'Menyusun data Studio & Proyektor...'}
            </p>
            <p className="text-[11px] text-slate-400 font-sans">
              Mohon tunggu, file PDF A4 resmi sedang dibuat dan akan otomatis terunduh.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
