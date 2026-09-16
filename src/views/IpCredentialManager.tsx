/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import db from '../db/localDb';
import { IpDevice, IpCredential } from '../types';
import {
  Shield,
  Key,
  Server,
  Globe,
  Plus,
  Search,
  Filter,
  Copy,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Tag,
  Layers,
  Building,
  Tv,
  Cpu,
  Lock,
  ChevronDown,
  Info,
  Clock,
  Sparkles,
  Download,
  Printer,
  FileText,
  CheckCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface IpCredentialManagerProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function IpCredentialManager({ onShowToast }: IpCredentialManagerProps) {
  // --- DATABASE STATES ---
  const [devices, setDevices] = useState<IpDevice[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // --- SEARCH, FILTER & SORT STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'area' | 'category' | 'recent' | 'oldest'>('name-asc');

  // --- PASSWORD VISIBILITY MAP ---
  // Key: `${deviceId}-${credentialId}` or `${deviceId}-all`
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // --- MODAL STATES ---
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<IpDevice | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState<IpDevice | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingDevice, setDeletingDevice] = useState<IpDevice | null>(null);

  const [isAddAreaCatModalOpen, setIsAddAreaCatModalOpen] = useState(false);
  const [newAreaInput, setNewAreaInput] = useState('');
  const [newCatInput, setNewCatInput] = useState('');

  // --- PDF EXPORT MODAL STATES ---
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfScope, setPdfScope] = useState<'all' | 'filtered'>('filtered');
  const [pdfIncludePassword, setPdfIncludePassword] = useState(true);
  const [pdfGroupByArea, setPdfGroupByArea] = useState(true);

  // --- DEVICE FORM STATE ---
  const [formData, setFormData] = useState<{
    deviceName: string;
    nickname: string;
    category: string;
    area: string;
    location: string;
    description: string;
    ipAddress: string;
    port: string;
    webInterfaceUrl: string;
    networkNotes: string;
    credentials: IpCredential[];
  }>({
    deviceName: '',
    nickname: '',
    category: 'LMS / AAM',
    area: 'CINEMA',
    location: 'Studio 1',
    description: '',
    ipAddress: '',
    port: '',
    webInterfaceUrl: '',
    networkNotes: '',
    credentials: [
      {
        id: `cred-${Date.now()}-1`,
        nickname: 'Administrator',
        username: 'admin',
        password: '',
        role: 'Full Access',
        notes: ''
      }
    ]
  });

  // --- SYNC WITH LOCAL STORAGE ---
  const reloadData = () => {
    setDevices(db.getIpDevices());
    setAreas(db.getIpAreas());
    setCategories(db.getIpCategories());
  };

  useEffect(() => {
    reloadData();
    const unsubscribe = db.subscribe(() => {
      reloadData();
    });
    return () => unsubscribe();
  }, []);

  // --- TOGGLE PASSWORD EYE ---
  const togglePasswordVisibility = (key: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // --- QUICK COPY HANDLER ---
  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    onShowToast(`${label} berhasil disalin ke clipboard!`, 'success');
  };

  // --- DUPLICATE IP CHECK ---
  const duplicateIpDevice = useMemo(() => {
    const trimmedIp = formData.ipAddress.trim();
    if (!trimmedIp) return null;
    return devices.find(
      (d) => d.ipAddress && d.ipAddress.trim() === trimmedIp && d.id !== editingDevice?.id
    );
  }, [formData.ipAddress, devices, editingDevice]);

  // --- FILTERED & SORTED DEVICES ---
  const filteredDevices = useMemo(() => {
    return devices
      .filter((device) => {
        // Area Filter
        if (selectedArea !== 'All' && device.area !== selectedArea) return false;
        // Category Filter
        if (selectedCategory !== 'All' && device.category !== selectedCategory) return false;

        // Search Query
        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase().trim();

        // Match device attributes
        const matchDevice =
          device.deviceName.toLowerCase().includes(q) ||
          (device.nickname && device.nickname.toLowerCase().includes(q)) ||
          (device.ipAddress && device.ipAddress.toLowerCase().includes(q)) ||
          device.location.toLowerCase().includes(q) ||
          device.area.toLowerCase().includes(q) ||
          device.category.toLowerCase().includes(q) ||
          (device.description && device.description.toLowerCase().includes(q)) ||
          (device.networkNotes && device.networkNotes.toLowerCase().includes(q));

        // Match credentials (EXCLUDING password for security)
        const matchCredentials = device.credentials.some(
          (c) =>
            c.username.toLowerCase().includes(q) ||
            c.nickname.toLowerCase().includes(q) ||
            (c.role && c.role.toLowerCase().includes(q)) ||
            (c.notes && c.notes.toLowerCase().includes(q))
        );

        return matchDevice || matchCredentials;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.deviceName.localeCompare(b.deviceName);
        if (sortBy === 'name-desc') return b.deviceName.localeCompare(a.deviceName);
        if (sortBy === 'area') return a.area.localeCompare(b.area);
        if (sortBy === 'category') return a.category.localeCompare(b.category);
        if (sortBy === 'recent') return (b.updatedAt || '').localeCompare(a.updatedAt || '');
        if (sortBy === 'oldest') return (a.updatedAt || '').localeCompare(b.updatedAt || '');
        return 0;
      });
  }, [devices, selectedArea, selectedCategory, searchQuery, sortBy]);

  // --- METRICS SUMMARY ---
  const totalDevices = devices.length;
  const totalIps = devices.filter((d) => d.ipAddress && d.ipAddress.trim() !== '').length;
  const totalCredentials = devices.reduce((sum, d) => sum + (d.credentials ? d.credentials.length : 0), 0);
  const totalAreasCount = areas.length;
  const totalCategoriesCount = categories.length;

  // --- OPEN ADD DEVICE MODAL ---
  const handleOpenAddDevice = (prefillArea?: string) => {
    setEditingDevice(null);
    setFormData({
      deviceName: '',
      nickname: '',
      category: categories[0] || 'Projector',
      area: prefillArea || areas[0] || 'Studio',
      location: prefillArea === 'Studio' ? 'Studio 1' : prefillArea === 'Loket / POS' ? 'Loket 1' : 'Ruang Server',
      description: '',
      ipAddress: '',
      port: '',
      webInterfaceUrl: '',
      networkNotes: '',
      credentials: [
        {
          id: `cred-${Date.now()}-1`,
          nickname: 'Administrator',
          username: 'admin',
          password: '',
          role: 'Full Access',
          notes: ''
        }
      ]
    });
    setIsDeviceModalOpen(true);
  };

  // --- OPEN EDIT DEVICE MODAL ---
  const handleOpenEditDevice = (device: IpDevice) => {
    setEditingDevice(device);
    setFormData({
      deviceName: device.deviceName,
      nickname: device.nickname || '',
      category: device.category,
      area: device.area,
      location: device.location,
      description: device.description || '',
      ipAddress: device.ipAddress || '',
      port: device.port || '',
      webInterfaceUrl: device.webInterfaceUrl || '',
      networkNotes: device.networkNotes || '',
      credentials: device.credentials && device.credentials.length > 0
        ? device.credentials
        : [
            {
              id: `cred-${Date.now()}-1`,
              nickname: 'Administrator',
              username: 'admin',
              password: '',
              role: 'Full Access',
              notes: ''
            }
          ]
    });
    setIsDeviceModalOpen(true);
  };

  // --- CREDENTIAL DYNAMIC FORM HANDLERS ---
  const handleAddCredentialField = () => {
    setFormData((prev) => ({
      ...prev,
      credentials: [
        ...prev.credentials,
        {
          id: `cred-${Date.now()}-${prev.credentials.length + 1}`,
          nickname: 'Operator / User',
          username: '',
          password: '',
          role: 'Standard User',
          notes: ''
        }
      ]
    }));
  };

  const handleRemoveCredentialField = (id: string) => {
    if (formData.credentials.length <= 1) {
      onShowToast('Perangkat minimal harus memiliki 1 credential entry!', 'warning');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      credentials: prev.credentials.filter((c) => c.id !== id)
    }));
  };

  const handleCredentialChange = (id: string, field: keyof IpCredential, value: string) => {
    setFormData((prev) => ({
      ...prev,
      credentials: prev.credentials.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    }));
  };

  // --- SAVE DEVICE FORM SUBMIT ---
  const handleSaveDevice = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.deviceName.trim()) {
      onShowToast('Nama Perangkat wajib diisi!', 'error');
      return;
    }
    if (!formData.area.trim()) {
      onShowToast('Area wajib dipilih!', 'error');
      return;
    }
    if (!formData.category.trim()) {
      onShowToast('Kategori wajib dipilih!', 'error');
      return;
    }

    const nowStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) + `, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

    const savedDevice: IpDevice = {
      id: editingDevice ? editingDevice.id : `dev-${Date.now()}`,
      deviceName: formData.deviceName.trim(),
      nickname: formData.nickname.trim(),
      category: formData.category,
      area: formData.area,
      location: formData.location.trim() || 'General',
      description: formData.description.trim(),
      ipAddress: formData.ipAddress.trim(),
      port: formData.port.trim(),
      webInterfaceUrl: formData.webInterfaceUrl.trim(),
      networkNotes: formData.networkNotes.trim(),
      credentials: formData.credentials.map((c) => ({
        ...c,
        nickname: c.nickname.trim() || 'Default User',
        username: c.username.trim(),
        password: c.password
      })),
      createdAt: editingDevice ? editingDevice.createdAt : nowStr,
      updatedAt: nowStr
    };

    db.saveIpDevice(savedDevice);
    onShowToast(
      editingDevice
        ? `Perangkat "${savedDevice.deviceName}" berhasil diperbarui!`
        : `Perangkat baru "${savedDevice.deviceName}" berhasil disimpan!`,
      'success'
    );

    setIsDeviceModalOpen(false);
    if (isDetailModalOpen && detailDevice && detailDevice.id === savedDevice.id) {
      setDetailDevice(savedDevice);
    }
  };

  // --- INLINE REALTIME EDIT & AUTO SAVE HANDLER ---
  const handleInlineUpdateDevice = (
    device: IpDevice,
    field: 'deviceName' | 'location' | 'ipAddress' | 'username' | 'password',
    value: string
  ) => {
    const nowStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) + `, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

    const updated: IpDevice = {
      ...device,
      updatedAt: nowStr
    };

    if (field === 'deviceName') {
      updated.deviceName = value;
    } else if (field === 'location') {
      updated.location = value;
    } else if (field === 'ipAddress') {
      updated.ipAddress = value;
    } else if (field === 'username' || field === 'password') {
      const creds = [...(updated.credentials || [])];
      if (creds.length === 0) {
        creds.push({
          id: `cred-${Date.now()}-1`,
          nickname: 'Administrator',
          username: '',
          password: '',
          role: 'Full Access'
        });
      } else {
        creds[0] = { ...creds[0] };
      }
      if (field === 'username') {
        creds[0].username = value;
      } else if (field === 'password') {
        creds[0].password = value;
      }
      updated.credentials = creds;
    }

    db.saveIpDevice(updated);
  };

  // --- REALTIME QUICK DELETE HANDLER ---
  const handleQuickDeleteDevice = (deviceId: string, deviceName?: string) => {
    const target = devices.find((d) => d.id === deviceId);
    if (target) {
      setDeletingDevice(target);
      setIsDeleteModalOpen(true);
    } else {
      db.deleteIpDevice(deviceId);
      onShowToast(`Perangkat "${deviceName || 'Perangkat'}" berhasil dihapus.`, 'info');
    }
  };

  // --- REALTIME QUICK ADD DEVICE HANDLER ---
  const handleQuickAddDevice = () => {
    const nowStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) + `, ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

    const newDev: IpDevice = {
      id: `dev-${Date.now()}`,
      deviceName: 'Perangkat Baru',
      nickname: '',
      category: categories[0] || 'LMS / AAM',
      area: areas[0] || 'Cinema',
      location: 'Studio 1',
      description: '',
      ipAddress: '192.168.1.1',
      port: '',
      webInterfaceUrl: '',
      networkNotes: '',
      credentials: [
        {
          id: `cred-${Date.now()}-1`,
          nickname: 'Administrator',
          username: 'admin',
          password: '',
          role: 'Full Access'
        }
      ],
      createdAt: nowStr,
      updatedAt: nowStr
    };
    db.saveIpDevice(newDev);
    onShowToast('Perangkat baru ditambahkan! Silakan edit langsung di tabel.', 'success');
  };

  // --- DELETE DEVICE CONFIRMATION ---
  const handleConfirmDeleteDevice = () => {
    if (!deletingDevice) return;
    db.deleteIpDevice(deletingDevice.id);
    onShowToast(`Perangkat "${deletingDevice.deviceName}" berhasil dihapus.`, 'warning');
    setIsDeleteModalOpen(false);
    setDeletingDevice(null);
    if (isDetailModalOpen) {
      setIsDetailModalOpen(false);
      setDetailDevice(null);
    }
  };

  // --- ADD CUSTOM AREA / CATEGORY ---
  const handleAddArea = () => {
    if (!newAreaInput.trim()) return;
    db.saveIpArea(newAreaInput.trim());
    onShowToast(`Area baru "${newAreaInput.trim()}" berhasil ditambahkan!`, 'success');
    setNewAreaInput('');
    setAreas(db.getIpAreas());
  };

  const handleAddCategory = () => {
    if (!newCatInput.trim()) return;
    db.saveIpCategory(newCatInput.trim());
    onShowToast(`Kategori baru "${newCatInput.trim()}" berhasil ditambahkan!`, 'success');
    setNewCatInput('');
    setCategories(db.getIpCategories());
  };

  // --- EXPORT PDF GENERATOR ---
  const handleExportPdf = () => {
    try {
      const exportList = pdfScope === 'filtered' ? filteredDevices : devices;

      if (exportList.length === 0) {
        onShowToast('Tidak ada data perangkat untuk diexport!', 'warning');
        return;
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const marginX = 12;

      // Draw Top Header Bar
      const drawHeader = (pageNumber: number) => {
        doc.setFillColor(9, 17, 36);
        doc.rect(0, 0, pageWidth, 22, 'F');

        doc.setFillColor(234, 179, 8); // Gold line
        doc.rect(0, 22, pageWidth, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text('CINEMA XXI — LAPORAN RESMI IP ADDRESS & CREDENTIAL MANAGER', marginX, 11);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(56, 189, 248);
        doc.text('ENGINEERING & NETWORK SYSTEM CONTROL DOCUMENT (CONFIDENTIAL)', marginX, 17);

        const dateStr = new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
        doc.setTextColor(226, 232, 240);
        doc.setFontSize(8);
        doc.text(`Tanggal Cetak: ${dateStr} | Total: ${exportList.length} Perangkat`, pageWidth - marginX, 14, { align: 'right' });
      };

      drawHeader(1);

      // Info bar below header
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, 26, pageWidth - (marginX * 2), 9, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, 26, pageWidth - (marginX * 2), 9, 'S');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const passModeText = pdfIncludePassword ? 'TERBUKA / LENGKAP' : 'TERKUNCI / TERSEMBUNYI (••••••••)';
      doc.text(`STATUS PASSWORD: ${passModeText}   |   CAKUPAN: ${pdfScope === 'filtered' ? `FILTER AKTIF (${exportList.length} Device)` : `SEMUA PERANGKAT (${devices.length} Device)`}   |   CINEMA XXI ENGINEERING`, marginX + 4, 32);

      // Column Coordinates (Width = 273mm)
      const colX = {
        no: marginX,              // 12 (w: 10)
        device: marginX + 10,     // 22 (w: 58)
        areaLoc: marginX + 68,    // 80 (w: 48)
        category: marginX + 116,  // 128 (w: 32)
        network: marginX + 148,   // 160 (w: 45)
        credentials: marginX + 193,// 205 (w: 58)
        notes: marginX + 251      // 263 (w: 22)
      };

      const drawTableHeader = (yPos: number) => {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(marginX, yPos, pageWidth - (marginX * 2), 8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);

        doc.text('NO', colX.no + 2, yPos + 5.5);
        doc.text('PERANGKAT / ALIAS', colX.device + 2, yPos + 5.5);
        doc.text('AREA & LOKASI', colX.areaLoc + 2, yPos + 5.5);
        doc.text('KATEGORI', colX.category + 2, yPos + 5.5);
        doc.text('IP ADDRESS / PORT', colX.network + 2, yPos + 5.5);
        doc.text('USERNAME & PASSWORD', colX.credentials + 2, yPos + 5.5);
        doc.text('CATATAN', colX.notes + 2, yPos + 5.5);

        return yPos + 8;
      };

      let currentY = drawTableHeader(38);
      let pageNum = 1;

      // Grouping
      const groupedDevices: Record<string, IpDevice[]> = {};
      if (pdfGroupByArea) {
        exportList.forEach((d) => {
          const areaKey = d.area || 'Lainnya';
          if (!groupedDevices[areaKey]) groupedDevices[areaKey] = [];
          groupedDevices[areaKey].push(d);
        });
      } else {
        groupedDevices['Daftar Seluruh Perangkat'] = exportList;
      }

      let globalIdx = 1;

      Object.keys(groupedDevices).forEach((areaName) => {
        const areaDevs = groupedDevices[areaName];

        if (currentY > pageHeight - 30) {
          doc.addPage();
          pageNum++;
          drawHeader(pageNum);
          currentY = drawTableHeader(26);
        }

        // Area Banner
        doc.setFillColor(224, 242, 254); // sky-100
        doc.rect(marginX, currentY, pageWidth - (marginX * 2), 6.5, 'F');
        doc.setDrawColor(186, 230, 253);
        doc.rect(marginX, currentY, pageWidth - (marginX * 2), 6.5, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(3, 105, 161);
        doc.text(`AREA: ${areaName.toUpperCase()} (${areaDevs.length} Perangkat)`, marginX + 3, currentY + 4.5);

        currentY += 6.5;

        areaDevs.forEach((dev) => {
          const credsTextArr = (dev.credentials || []).map((c) => {
            const nickStr = c.nickname ? `[${c.nickname}] ` : '';
            const uStr = c.username ? `User: ${c.username}` : '';
            const pVal = pdfIncludePassword ? (c.password || '-') : '••••••••';
            const pStr = `Pass: ${pVal}`;
            return `${nickStr}${uStr} | ${pStr}`.trim();
          });

          const devNameStr = `${dev.deviceName}${dev.nickname ? `\nAlias: ${dev.nickname}` : ''}`;
          const areaLocStr = `${dev.area}\nLokasi: ${dev.location}`;
          const netStr = `${dev.ipAddress || '-'}${dev.port ? ` : ${dev.port}` : ''}${dev.webInterfaceUrl ? `\nWeb: ${dev.webInterfaceUrl}` : ''}`;
          const credsStr = credsTextArr.join('\n') || '-';
          const notesStr = dev.description || dev.networkNotes || '-';

          const devLines = doc.splitTextToSize(devNameStr, 54);
          const areaLocLines = doc.splitTextToSize(areaLocStr, 44);
          const netLines = doc.splitTextToSize(netStr, 41);
          const credsLines = doc.splitTextToSize(credsStr, 54);
          const notesLines = doc.splitTextToSize(notesStr, 20);

          const maxLines = Math.max(
            devLines.length,
            areaLocLines.length,
            netLines.length,
            credsLines.length,
            notesLines.length,
            1
          );

          const rowHeight = Math.max(maxLines * 4 + 4, 8);

          if (currentY + rowHeight > pageHeight - 15) {
            doc.addPage();
            pageNum++;
            drawHeader(pageNum);
            currentY = drawTableHeader(26);
          }

          if (globalIdx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(marginX, currentY, pageWidth - (marginX * 2), rowHeight, 'F');
          }

          doc.setDrawColor(226, 232, 240);
          doc.rect(marginX, currentY, pageWidth - (marginX * 2), rowHeight, 'S');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);

          doc.text(String(globalIdx), colX.no + 2, currentY + 4.5);
          doc.text(devLines, colX.device + 2, currentY + 4.5);
          doc.text(areaLocLines, colX.areaLoc + 2, currentY + 4.5);
          doc.text(dev.category || '-', colX.category + 2, currentY + 4.5);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(5, 150, 105);
          doc.text(netLines, colX.network + 2, currentY + 4.5);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          doc.text(credsLines, colX.credentials + 2, currentY + 4.5);
          doc.text(notesLines, colX.notes + 2, currentY + 4.5);

          currentY += rowHeight;
          globalIdx++;
        });
      });

      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Dokumen Resmi Sistem Engineering Cinema XXI  •  Diunduh pada ${new Date().toLocaleString('id-ID')}`,
          marginX,
          pageHeight - 6
        );
        doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
      }

      doc.save(`Dokumen_IP_and_Credential_Cinema_XXI_${new Date().toISOString().slice(0, 10)}.pdf`);
      onShowToast('Dokumen PDF IP & Credential berhasil diunduh rapi!', 'success');
      setIsPdfModalOpen(false);
    } catch (err) {
      console.error('Export PDF error:', err);
      onShowToast('Gagal memproses dokumen PDF!', 'error');
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12" id="ip-credential-manager-container">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-[#091124] via-[#0d1a38] to-[#071228] p-6 sm:p-8 rounded-3xl border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(0,240,255,0.2)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-mono text-xs font-black tracking-wider uppercase shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Shield className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span>SECURITY & NETWORK COMMAND CENTER</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              🔐 IP & CREDENTIAL MANAGER
            </span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-3xl font-medium leading-relaxed">
            Pusat penyimpanan & pengawasan aman untuk IP Address seluruh perangkat, username, password, URL web interface, port, serta kredensial jaringan Cinema XXI.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3 z-10 shrink-0 w-full lg:w-auto">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono font-bold text-xs sm:text-sm border border-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95"
            id="btn-export-pdf"
          >
            <Download className="h-4 w-4 text-white" />
            <span>📄 EXPORT PDF / CETAK</span>
          </button>

          <button
            onClick={() => setIsAddAreaCatModalOpen(true)}
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs sm:text-sm border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-2 shadow-md hover:scale-105 active:scale-95"
          >
            <Layers className="h-4 w-4 text-amber-400" />
            <span>+ KELOLA AREA / KATEGORI</span>
          </button>

          <button
            onClick={() => handleOpenAddDevice()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-mono font-black text-xs sm:text-sm tracking-wider shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all cursor-pointer flex items-center gap-2.5 border border-cyan-300 hover:scale-105 active:scale-95"
            id="btn-add-new-device"
          >
            <Plus className="h-5 w-5" />
            <span>+ TAMBAH DEVICE BARU</span>
          </button>
        </div>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" id="ip-metrics-grid">
        <div className="bg-[#0b1428]/90 border-2 border-cyan-500/30 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-cyan-400/60 transition-all shadow-lg">
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <span className="text-sm sm:text-base font-mono font-black tracking-wider uppercase">Total Devices</span>
            <Server className="h-7 w-7 text-cyan-400" />
          </div>
          <p className="text-4xl sm:text-5xl font-black text-white font-mono">{totalDevices}</p>
          <span className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">Perangkat Terdaftar</span>
        </div>

        <div className="bg-[#0b1428]/90 border-2 border-emerald-500/30 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-400/60 transition-all shadow-lg">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-sm sm:text-base font-mono font-black tracking-wider uppercase">Total IP Address</span>
            <Globe className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="text-4xl sm:text-5xl font-black text-white font-mono">{totalIps}</p>
          <span className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">IP Terkonfigurasi</span>
        </div>

        <div className="bg-[#0b1428]/90 border-2 border-amber-500/30 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-amber-400/60 transition-all shadow-lg">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-sm sm:text-base font-mono font-black tracking-wider uppercase">Credentials</span>
            <Key className="h-7 w-7 text-amber-400" />
          </div>
          <p className="text-4xl sm:text-5xl font-black text-white font-mono">{totalCredentials}</p>
          <span className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">User & Password</span>
        </div>

        <div className="bg-[#0b1428]/90 border-2 border-fuchsia-500/30 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-fuchsia-400/60 transition-all shadow-lg">
          <div className="flex items-center justify-between text-fuchsia-400 mb-2">
            <span className="text-sm sm:text-base font-mono font-black tracking-wider uppercase">Total Area</span>
            <Building className="h-7 w-7 text-fuchsia-400" />
          </div>
          <p className="text-4xl sm:text-5xl font-black text-white font-mono">{totalAreasCount}</p>
          <span className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">Area Cinema</span>
        </div>

        <div className="bg-[#0b1428]/90 border-2 border-blue-500/30 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-blue-400/60 transition-all shadow-lg col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-sm sm:text-base font-mono font-black tracking-wider uppercase">Kategori</span>
            <Cpu className="h-7 w-7 text-blue-400" />
          </div>
          <p className="text-4xl sm:text-5xl font-black text-white font-mono">{totalCategoriesCount}</p>
          <span className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">Jenis Perangkat</span>
        </div>
      </div>

      {/* AREA SHORTCUT GRID CARDS */}
      <div className="space-y-3">
        <h3 className="text-sm font-mono font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2">
          <Building className="h-4 w-4 text-cyan-400" />
          <span>JELAJAH BERDASARKAN AREA PERANGKAT</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'CINEMA', icon: '🎬', label: 'Studio & Auditorium Cinema', color: 'from-amber-600/30 to-amber-900/40 border-amber-500/40' },
            { name: 'CAFE', icon: '☕', label: 'Concession & Cafe XXI', color: 'from-emerald-600/30 to-emerald-900/40 border-emerald-500/40' },
            { name: 'PREMIERE', icon: '👑', label: 'Lobby & Studio Premiere', color: 'from-purple-600/30 to-purple-900/40 border-purple-500/40' },
            { name: 'MULA MULA', icon: '📁', label: 'Area Mula-Mula / General', color: 'from-cyan-600/30 to-cyan-900/40 border-cyan-500/40' }
          ].map((item) => {
            const count = devices.filter((d) => d.area === item.name).length;
            const isSelected = selectedArea === item.name;

            return (
              <button
                key={item.name}
                onClick={() => setSelectedArea(isSelected ? 'All' : item.name)}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer bg-gradient-to-br ${item.color} ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.35)] scale-[1.02]'
                    : 'hover:scale-[1.01] hover:border-cyan-400/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{item.icon}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-xs font-mono font-bold text-cyan-300">
                    {count} Dev
                  </span>
                </div>
                <div className="font-bold text-white text-sm sm:text-base font-mono uppercase">{item.name}</div>
                <div className="text-[11px] text-slate-300 font-sans truncate mt-0.5">{item.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH, FILTER & SORT BAR */}
      <div className="bg-[#0a1224] border-2 border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400" />
            <input
              type="text"
              placeholder="Cari device, IP, username, nickname, area, studio, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl pl-12 pr-10 py-3 text-sm sm:text-base text-white font-bold placeholder-slate-500 focus:outline-none transition-all shadow-inner"
              id="input-search-ip-devices"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Area Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-cyan-300 font-bold focus:outline-none cursor-pointer uppercase"
              id="select-filter-area"
            >
              <option value="All">🌐 Semua Area</option>
              {areas.map((a) => (
                <option key={a} value={a} className="uppercase">
                  📍 Area: {a.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-emerald-300 font-bold focus:outline-none cursor-pointer uppercase"
              id="select-filter-category"
            >
              <option value="All">📦 Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c} className="uppercase">
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-3.5 py-3 text-xs sm:text-sm text-amber-300 font-bold focus:outline-none cursor-pointer"
              id="select-sort-by"
            >
              <option value="name-asc">🔤 Nama (A - Z)</option>
              <option value="name-desc">🔤 Nama (Z - A)</option>
              <option value="area">📍 Berdasarkan Area</option>
              <option value="category">📦 Berdasarkan Kategori</option>
              <option value="recent">🕒 Terbaru Diperbarui</option>
              <option value="oldest">🕒 Terlama Diperbarui</option>
            </select>
          </div>
        </div>

        {/* ACTIVE FILTER BADGES */}
        {(selectedArea !== 'All' || selectedCategory !== 'All' || searchQuery) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
            <span className="text-slate-400 font-bold">Filter Aktif:</span>
            {selectedArea !== 'All' && (
              <span className="px-2.5 py-1 rounded-full bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold flex items-center gap-1">
                Area: {selectedArea}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedArea('All')} />
              </span>
            )}
            {selectedCategory !== 'All' && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1">
                Kategori: {selectedCategory}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory('All')} />
              </span>
            )}
            {searchQuery && (
              <span className="px-2.5 py-1 rounded-full bg-amber-950 border border-amber-500/50 text-amber-300 font-bold flex items-center gap-1">
                Cari: "{searchQuery}"
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
            <button
              onClick={() => {
                setSelectedArea('All');
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="text-slate-400 hover:text-rose-400 underline ml-auto cursor-pointer font-bold"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* DEVICES LIST / CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-black text-white font-mono flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" />
            <span>DAFTAR PERANGKAT & CREDENTIAL ({filteredDevices.length})</span>
          </h2>
        </div>

        {filteredDevices.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-[#0a1120] border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500">
              <Server className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-mono">
                {searchQuery || selectedArea !== 'All' || selectedCategory !== 'All'
                  ? 'Tidak ada perangkat yang sesuai dengan filter'
                  : 'Belum Ada Perangkat IP / Credential'}
              </h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                {searchQuery || selectedArea !== 'All' || selectedCategory !== 'All'
                  ? 'Coba ubah kata kunci pencarian atau reset filter area & kategori.'
                  : 'Mulai dengan menambahkan data IP address dan credential login perangkat Cinema pertama Anda.'}
              </p>
            </div>
            <button
              onClick={() => handleOpenAddDevice()}
              className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs sm:text-sm tracking-wide shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>+ Tambah Perangkat Pertama</span>
            </button>
          </div>
        ) : (
          /* DEVICE TABLE LIST WITH REALTIME INLINE EDITING */
          <div className="bg-[#0c1527] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-[#070e1c] px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-300">Edit Langsung & Auto Save Real-time Active</span>
              </div>
              <button
                onClick={handleQuickAddDevice}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-white font-bold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Tambah Baris Perangkat</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#050b17] border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] sm:text-xs font-bold">
                    <th className="py-3.5 px-4 min-w-[180px]">Jenis Perangkat</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Tempat Perangkat</th>
                    <th className="py-3.5 px-4 min-w-[160px]">IP Address</th>
                    <th className="py-3.5 px-4 min-w-[140px]">User</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Password</th>
                    <th className="py-3.5 px-4 text-center min-w-[120px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredDevices.map((device) => {
                    const primaryCred = device.credentials && device.credentials[0] ? device.credentials[0] : null;
                    const showPassKey = `${device.id}-${primaryCred?.id || 'default'}`;
                    const isAllPassVisible = visiblePasswords[`${device.id}-all`];
                    const isPassVisible = visiblePasswords[showPassKey] || isAllPassVisible;

                    return (
                      <tr key={device.id} className="hover:bg-slate-900/60 transition-colors">
                        {/* Jenis Perangkat */}
                        <td className="py-3 px-3 align-middle">
                          <input
                            type="text"
                            value={device.deviceName}
                            onChange={(e) => handleInlineUpdateDevice(device, 'deviceName', e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-700/60 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs sm:text-sm focus:outline-none transition-all placeholder:text-slate-600"
                            placeholder="Nama Perangkat..."
                          />
                        </td>

                        {/* Tempat Perangkat */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <input
                              type="text"
                              value={device.location}
                              onChange={(e) => handleInlineUpdateDevice(device, 'location', e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-slate-200 font-bold text-xs sm:text-sm focus:outline-none transition-all placeholder:text-slate-600"
                              placeholder="Lokasi..."
                            />
                          </div>
                        </td>

                        {/* IP Address */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={device.ipAddress || ''}
                              onChange={(e) => handleInlineUpdateDevice(device, 'ipAddress', e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono font-black text-xs sm:text-sm tracking-wider focus:outline-none transition-all placeholder:text-slate-600"
                              placeholder="192.168.1.X"
                            />
                            {device.ipAddress && (
                              <button
                                onClick={() => copyToClipboard(device.ipAddress!, 'IP Address')}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition-all cursor-pointer shrink-0"
                                title="Salin IP"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* User */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={primaryCred ? primaryCred.username || '' : ''}
                              onChange={(e) => handleInlineUpdateDevice(device, 'username', e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono font-bold text-xs sm:text-sm focus:outline-none transition-all placeholder:text-slate-600"
                              placeholder="User..."
                            />
                            {primaryCred?.username && (
                              <button
                                onClick={() => copyToClipboard(primaryCred.username, 'Username')}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition-all cursor-pointer shrink-0"
                                title="Salin Username"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Password */}
                        <td className="py-3 px-3 align-middle">
                          <div className="relative flex items-center gap-1">
                            <input
                              type={isPassVisible ? 'text' : 'password'}
                              value={primaryCred ? primaryCred.password || '' : ''}
                              onChange={(e) => handleInlineUpdateDevice(device, 'password', e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 focus:border-amber-400 rounded-lg pl-2.5 pr-8 py-1.5 text-amber-300 font-mono font-bold text-xs sm:text-sm tracking-wider focus:outline-none transition-all placeholder:text-slate-600"
                              placeholder="Password..."
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(showPassKey)}
                              className="absolute right-2 text-slate-400 hover:text-white cursor-pointer"
                              title={isPassVisible ? 'Sembunyikan' : 'Lihat'}
                            >
                              {isPassVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-3 align-middle text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const target = devices.find((d) => d.id === device.id) || device;
                                setDetailDevice(target);
                                setIsDetailModalOpen(true);
                              }}
                              className="p-1.5 sm:p-2 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 hover:text-cyan-100 border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                              title="Lihat Detail & Credential Lengkap"
                              id={`btn-detail-device-${device.id}`}
                            >
                              <Info className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const target = devices.find((d) => d.id === device.id) || device;
                                handleOpenEditDevice(target);
                              }}
                              className="p-1.5 sm:p-2 rounded-lg bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 hover:text-amber-100 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                              title="Edit Form Lengkap (Modal)"
                              id={`btn-edit-device-${device.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const target = devices.find((d) => d.id === device.id) || device;
                                setDeletingDevice(target);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 sm:p-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-500/40 hover:border-rose-400 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                              title="Hapus Perangkat"
                              id={`btn-delete-device-${device.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT DEVICE */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#0a1120] border-2 border-cyan-500/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_0_60px_rgba(0,240,255,0.3)] my-auto">
            {/* Modal Header */}
            <div className="bg-[#070b16] border-b border-cyan-500/30 px-6 sm:px-8 py-5 flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <Shield className="h-7 w-7 text-cyan-400 shrink-0" />
                <span>{editingDevice ? 'Edit Data Perangkat & Credential' : 'Tambah Perangkat & Credential Baru'}</span>
              </h3>
              <button
                onClick={() => setIsDeviceModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDevice} className="p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* SECTION 1: LOCATION & AREA */}
              <div className="space-y-3 bg-[#050b17] p-4 sm:p-5 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-mono font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <span>1. LOKASI & AREA PERANGKAT</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                      AREA PERANGKAT *
                    </label>
                    <select
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-base font-bold text-white focus:outline-none cursor-pointer uppercase"
                    >
                      {areas.map((a) => (
                        <option key={a} value={a} className="uppercase">
                          📍 {a.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                      STUDIO / SPESIFIKASI LOKASI *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Studio 1, Loket 1, Server Room, Ruang Engineering"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-base font-bold text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: DEVICE INFORMATION */}
              <div className="space-y-3 bg-[#050b17] p-4 sm:p-5 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-mono font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Server className="h-4 w-4 text-cyan-400" />
                  <span>2. INFORMASI IDENTITAS PERANGKAT</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                      KATEGORI *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-base font-bold text-white focus:outline-none cursor-pointer uppercase"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c} className="uppercase">
                          📦 {c.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                      NAMA PERANGKAT *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Projector Barco DP4K-19B Studio 1"
                      value={formData.deviceName}
                      onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-base font-bold text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                      NICKNAME / ALIAS
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: PROJ-S1"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-base font-bold text-white placeholder-slate-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                      DESKRIPSI / CATATAN AKSEK
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Projector utama pementasan film Studio 1"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-2xl px-4 py-3 text-base font-bold text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: NETWORK INFORMATION */}
              <div className="space-y-3 bg-[#050b17] p-4 sm:p-5 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-mono font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  <span>3. KONFIGURASI JARINGAN & NETWORK</span>
                </h4>

                {/* Duplicate IP Warning Banner */}
                {duplicateIpDevice && (
                  <div className="p-3.5 rounded-2xl bg-amber-950/90 border-2 border-amber-500/60 text-amber-200 text-xs sm:text-sm font-mono flex items-start gap-3 animate-pulse">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-300 font-bold">⚠️ PERINGATAN DUPLIKASI IP ADDRESS!</strong>
                      IP Address <strong>"{formData.ipAddress}"</strong> sudah terdaftar pada perangkat:{' '}
                      <strong className="underline">{duplicateIpDevice.deviceName}</strong> ({duplicateIpDevice.area} - {duplicateIpDevice.location}).
                      Anda tetap dapat menyimpannya jika ini adalah IP terbagi (shared network node).
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                      IP ADDRESS
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 192.168.10.101"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-4 py-3 text-base font-bold text-emerald-300 font-mono placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                      PORT
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 8080, 80, 443"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-4 py-3 text-base font-bold text-amber-300 font-mono placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                      WEB INTERFACE / URL
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: http://192.168.10.101:8080"
                      value={formData.webInterfaceUrl}
                      onChange={(e) => setFormData({ ...formData, webInterfaceUrl: e.target.value })}
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-4 py-3 text-base font-bold text-cyan-300 font-mono text-xs placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-mono font-black text-slate-100 mb-1.5">
                    CATATAN TAMBAHAN JARINGAN
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: VLAN 10 Cinema Equipment / Switch Port 24"
                    value={formData.networkNotes}
                    onChange={(e) => setFormData({ ...formData, networkNotes: e.target.value })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-2xl px-4 py-3 text-sm font-bold text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION 4: MULTIPLE CREDENTIALS */}
              <div className="space-y-4 bg-[#050b17] p-4 sm:p-5 rounded-2xl border border-slate-800/90 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-mono font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>4. KREDENSIAL AKSES USER & PASSWORD ({formData.credentials.length})</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleAddCredentialField}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow"
                  >
                    <Plus className="h-4 w-4 text-amber-400" />
                    <span>+ TAMBAH KREDENSIAL</span>
                  </button>
                </div>

                <div className="space-y-3.5">
                  {formData.credentials.map((cred, idx) => (
                    <div
                      key={cred.id}
                      className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-slate-700/80 space-y-3 relative transition-all shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-500/30">
                            AKSES #{idx + 1}
                          </span>
                          {cred.nickname && (
                            <span className="text-xs font-bold text-slate-300 truncate max-w-[200px]">
                              {cred.nickname}
                            </span>
                          )}
                        </div>

                        {formData.credentials.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCredentialField(cred.id)}
                            className="text-rose-400 hover:text-rose-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer bg-rose-950/50 hover:bg-rose-900/60 px-2.5 py-1 rounded-lg border border-rose-500/30 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                            NICKNAME / JUDUL
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Administrator, Operator"
                            value={cred.nickname}
                            onChange={(e) => handleCredentialChange(cred.id, 'nickname', e.target.value)}
                            className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                            USERNAME / ID
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: admin"
                            value={cred.username}
                            onChange={(e) => handleCredentialChange(cred.id, 'username', e.target.value)}
                            className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs sm:text-sm font-black text-cyan-300 placeholder:text-slate-600 focus:outline-none font-mono transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                            PASSWORD
                          </label>
                          <div className="relative">
                            <input
                              type={visiblePasswords[cred.id] ? 'text' : 'password'}
                              placeholder="Password..."
                              value={cred.password}
                              onChange={(e) => handleCredentialChange(cred.id, 'password', e.target.value)}
                              className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 rounded-xl pl-3 pr-9 py-2 text-xs sm:text-sm font-black text-amber-300 placeholder:text-slate-600 focus:outline-none font-mono tracking-wider transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(cred.id)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-0.5"
                              title={visiblePasswords[cred.id] ? 'Sembunyikan' : 'Tampilkan'}
                            >
                              {visiblePasswords[cred.id] ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                            ROLE / HAK AKSES
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Full Access / Viewer"
                            value={cred.role || ''}
                            onChange={(e) => handleCredentialChange(cred.id, 'role', e.target.value)}
                            className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-200 placeholder:text-slate-600 focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-mono font-black transition-all cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-mono font-black text-sm tracking-wide shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-cyan-300"
                >
                  {editingDevice ? 'SIMPAN PERUBAHAN' : 'SIMPAN PERANGKAT BARU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DEVICE DETAIL VIEW */}
      {isDetailModalOpen && detailDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#0a1120] border-2 border-cyan-500/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_60px_rgba(0,240,255,0.35)] my-auto">
            <div className="bg-[#070b16] border-b border-cyan-500/30 px-6 sm:px-8 py-5 flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <Server className="h-7 w-7 text-cyan-400 shrink-0" />
                <span>DETAIL PERANGKAT & CREDENTIAL</span>
              </h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto font-mono">
              {/* Header Badge Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1 rounded-xl bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold text-xs">
                    📍 Area: {detailDevice.area}
                  </span>
                  <span className="px-3.5 py-1 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold text-xs">
                    📦 Kategori: {detailDevice.category}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-xl bg-amber-950 border border-amber-500/50 text-amber-300 font-bold text-xs">
                  📍 {detailDevice.location}
                </span>
              </div>

              {/* Title & Desc */}
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <span>{detailDevice.deviceName}</span>
                  {detailDevice.nickname && (
                    <span className="px-3 py-1 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs">
                      {detailDevice.nickname}
                    </span>
                  )}
                </h2>
                {detailDevice.description && (
                  <p className="text-slate-300 text-sm font-sans mt-2 leading-relaxed">
                    {detailDevice.description}
                  </p>
                )}
              </div>

              {/* Network Configuration */}
              <div className="bg-[#050b17] border-2 border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="h-5 w-5" /> KONFIGURASI NETWORK
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-300 font-bold block mb-1">IP ADDRESS:</span>
                    <div className="flex items-center justify-between bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-800">
                      <strong className="text-emerald-300 text-base sm:text-xl font-black font-mono tracking-wider">
                        {detailDevice.ipAddress || 'Tidak ada IP'}
                      </strong>
                      {detailDevice.ipAddress && (
                        <button
                          onClick={() => copyToClipboard(detailDevice.ipAddress!, 'IP Address')}
                          className="text-cyan-400 hover:text-cyan-300 p-1 cursor-pointer"
                        >
                          <Copy className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-300 font-bold block mb-1">PORT & URL:</span>
                    <div className="bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-amber-300 font-bold text-sm sm:text-base">Port: {detailDevice.port || '-'}</span>
                      {detailDevice.webInterfaceUrl && (
                        <a
                          href={detailDevice.webInterfaceUrl.startsWith('http') ? detailDevice.webInterfaceUrl : `http://${detailDevice.webInterfaceUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 underline font-bold flex items-center gap-1.5 text-xs sm:text-sm"
                        >
                          <span>Buka URL</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {detailDevice.networkNotes && (
                  <p className="text-xs sm:text-sm text-slate-300 border-t border-slate-900 pt-2.5">
                    Catatan Network: {detailDevice.networkNotes}
                  </p>
                )}
              </div>

              {/* Credentials Detail List */}
              <div className="space-y-3.5">
                <h4 className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-400" /> CREDENTIALS TERDAFTAR ({detailDevice.credentials ? detailDevice.credentials.length : 0})
                </h4>

                <div className="space-y-3.5">
                  {detailDevice.credentials && detailDevice.credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm"
                    >
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="font-black text-amber-400 text-sm sm:text-base">
                          {cred.nickname || 'Default Credential'}
                        </span>
                        {cred.role && (
                          <span className="px-3 py-1 rounded-md bg-slate-800 text-cyan-300 text-xs font-bold">
                            {cred.role}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        <div>
                          <span className="text-slate-400 block text-xs font-bold mb-1">USERNAME:</span>
                          <div className="flex items-center justify-between bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                            <strong className="text-cyan-300 text-sm sm:text-base font-black">{cred.username || '-'}</strong>
                            {cred.username && (
                              <button
                                onClick={() => copyToClipboard(cred.username, 'Username')}
                                className="text-cyan-400 hover:text-cyan-300 p-1 cursor-pointer"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-xs font-bold mb-1">PASSWORD:</span>
                          <div className="flex items-center justify-between bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                            <strong className="text-amber-300 text-base sm:text-lg font-black tracking-wider">
                              {visiblePasswords[cred.id] ? (cred.password || '(Kosong)') : '••••••••'}
                            </strong>
                            <div className="flex items-center gap-1.5">
                              {cred.password && (
                                <button
                                  onClick={() => copyToClipboard(cred.password, 'Password')}
                                  className="text-amber-400 hover:text-amber-300 p-1 cursor-pointer"
                                >
                                  <Lock className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => togglePasswordVisibility(cred.id)}
                                className="text-slate-400 hover:text-white p-1 cursor-pointer"
                              >
                                {visiblePasswords[cred.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Meta & Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Terakhir Diperbarui: {detailDevice.updatedAt || detailDevice.createdAt || '-'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenEditDevice(detailDevice);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" /> EDIT PERANGKAT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION DIALOG */}
      {isDeleteModalOpen && deletingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0e172a] border-2 border-rose-500/60 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.35)] p-6 space-y-5 my-auto">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="h-12 w-12 rounded-2xl bg-rose-950 border border-rose-500/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-7 w-7 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white font-mono">Konfirmasi Hapus Perangkat</h3>
                <p className="text-xs text-slate-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
              <p className="text-slate-200">
                Apakah Anda yakin ingin menghapus perangkat{' '}
                <strong className="text-rose-300">"{deletingDevice.deviceName}"</strong> ({deletingDevice.area} - {deletingDevice.location})?
              </p>

              {deletingDevice.credentials && deletingDevice.credentials.length > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-[11px] font-bold">
                  ⚠️ Perangkat ini memiliki {deletingDevice.credentials.length} credential terhubung. Menghapus perangkat ini juga akan menghapus seluruh credential terkait.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs cursor-pointer transition-all"
              >
                BATAL
              </button>
              <button
                onClick={handleConfirmDeleteDevice}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs tracking-wider shadow-lg cursor-pointer transition-all"
              >
                HAPUS PERANGKAT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD AREA / CATEGORY DYNAMICALLY */}
      {isAddAreaCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0a1120] border-2 border-cyan-500/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.3)] p-6 sm:p-8 space-y-6 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg sm:text-xl font-black text-white font-mono flex items-center gap-2">
                <Layers className="h-6 w-6 text-amber-400" />
                <span>Kelola Master Area & Kategori</span>
              </h3>
              <button
                onClick={() => setIsAddAreaCatModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add New Area */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-cyan-300 uppercase">
                + TAMBAH AREA BARU
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: Studio 9, Control Room, Booth VVIP"
                  value={newAreaInput}
                  onChange={(e) => setNewAreaInput(e.target.value)}
                  className="flex-1 bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white font-bold"
                />
                <button
                  onClick={handleAddArea}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs cursor-pointer"
                >
                  Tambah
                </button>
              </div>
            </div>

            {/* Add New Category */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-mono font-bold text-emerald-400 uppercase">
                + TAMBAH KATEGORI BARU
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: Laser Projector, Smart Power, Signage"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-sm text-white font-bold"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs cursor-pointer"
                >
                  Tambah
                </button>
              </div>
            </div>

            {/* Close */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsAddAreaCatModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold cursor-pointer"
              >
                SELESAI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EXPORT PDF & PRINT MODAL WITH LIVE PREVIEW */}
      {/* ========================================== */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0b1428] border-2 border-rose-500/50 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(244,63,94,0.3)] overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-950 via-[#180e22] to-slate-900 p-5 sm:p-6 border-b border-rose-500/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/20 border border-rose-400/40 rounded-2xl text-rose-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white font-mono uppercase tracking-wide flex items-center gap-2">
                    <span>📄 DOKUMEN EXPORT PDF & CETAK LAPORAN IP</span>
                  </h2>
                  <p className="text-xs text-rose-200/80 font-medium">
                    Konfigurasi & Pratinjau Dokumen Cetak IP Address & Credentials Cinema XXI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content / Controls */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              
              {/* Configuration Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl">
                
                {/* Control 1: Scope */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-black text-cyan-300 uppercase flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    <span>Cakupan Data Device</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setPdfScope('filtered')}
                      className={`p-2.5 rounded-xl text-left border text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-between ${
                        pdfScope === 'filtered'
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>Filter Saat Ini ({filteredDevices.length} Device)</span>
                      {pdfScope === 'filtered' && <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfScope('all')}
                      className={`p-2.5 rounded-xl text-left border text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-between ${
                        pdfScope === 'all'
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>Seluruh Device ({devices.length} Device)</span>
                      {pdfScope === 'all' && <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Control 2: Security Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-black text-amber-400 uppercase flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Keamanan Password</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setPdfIncludePassword(true)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-between ${
                        pdfIncludePassword
                          ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>Tampilkan Password (Lengkap)</span>
                      {pdfIncludePassword && <CheckCircle className="h-4 w-4 text-amber-400 shrink-0" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfIncludePassword(false)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-between ${
                        !pdfIncludePassword
                          ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>Sembunyikan (••••••••)</span>
                      {!pdfIncludePassword && <CheckCircle className="h-4 w-4 text-amber-400 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Control 3: Layout & Grouping */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-black text-emerald-400 uppercase flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Pengelompokan Document</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setPdfGroupByArea(!pdfGroupByArea)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-between ${
                        pdfGroupByArea
                          ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{pdfGroupByArea ? '✓ Kelompokkan Per-Area' : 'Flat List (Tanpa Grouping)'}</span>
                      <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                    </button>
                    <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 font-mono">
                      Format Kertas: A4 Landscape (Laporan Resmi Engineering)
                    </div>
                  </div>
                </div>

              </div>

              {/* LIVE DOKUMEN PREVIEW CARD */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-rose-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-rose-400" />
                    PRATINJAU DOKUMEN HASIL PDF (DOCUMENT PREVIEW)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Total: {(pdfScope === 'filtered' ? filteredDevices : devices).length} Device Siap Diexport
                  </span>
                </div>

                <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border-4 border-slate-300 overflow-x-auto text-xs font-sans">
                  
                  {/* Document XXI Header */}
                  <div className="border-b-2 border-slate-900 pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-mono uppercase">
                        CINEMA XXI — LAPORAN RESMI IP ADDRESS & CREDENTIAL
                      </h3>
                      <p className="text-xs font-bold text-sky-700 uppercase tracking-wide">
                        ENGINEERING & NETWORK SYSTEM CONTROL DOCUMENT (CONFIDENTIAL)
                      </p>
                    </div>
                    <div className="text-left sm:text-right text-[11px] font-mono text-slate-600 bg-slate-100 p-2 rounded-lg border border-slate-300">
                      <div>Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                      <div>Keamanan Password: <strong className={pdfIncludePassword ? 'text-amber-700' : 'text-emerald-700'}>{pdfIncludePassword ? 'TERBUKA' : 'TERKUNCI'}</strong></div>
                    </div>
                  </div>

                  {/* Document Table Preview */}
                  <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase">
                        <th className="p-2 border border-slate-700 text-center w-10">No</th>
                        <th className="p-2 border border-slate-700">Nama Perangkat / Alias</th>
                        <th className="p-2 border border-slate-700">Area & Lokasi</th>
                        <th className="p-2 border border-slate-700">Kategori</th>
                        <th className="p-2 border border-slate-700">IP Address & Port</th>
                        <th className="p-2 border border-slate-700">Username & Password</th>
                        <th className="p-2 border border-slate-700">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pdfScope === 'filtered' ? filteredDevices : devices).slice(0, 10).map((dev, idx) => (
                        <tr key={dev.id} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="p-2 border border-slate-300 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="p-2 border border-slate-300 font-bold text-slate-900">
                            {dev.deviceName}
                            {dev.nickname && <span className="block text-[10px] font-mono text-slate-500">Alias: {dev.nickname}</span>}
                          </td>
                          <td className="p-2 border border-slate-300">
                            <span className="font-bold text-slate-800">{dev.area}</span>
                            <span className="block text-[10px] text-slate-500">{dev.location}</span>
                          </td>
                          <td className="p-2 border border-slate-300 text-slate-700">{dev.category}</td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-emerald-700">
                            {dev.ipAddress || '-'}
                            {dev.port && <span className="text-slate-600 font-normal">:{dev.port}</span>}
                          </td>
                          <td className="p-2 border border-slate-300 font-mono text-[10px]">
                            {dev.credentials && dev.credentials.length > 0 ? (
                              dev.credentials.map((c) => (
                                <div key={c.id} className="text-slate-800">
                                  {c.username && <span>U: {c.username} | </span>}
                                  <span className="font-bold text-rose-700">P: {pdfIncludePassword ? (c.password || '-') : '••••••••'}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-2 border border-slate-300 text-[10px] text-slate-600">
                            {dev.description || dev.networkNotes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {(pdfScope === 'filtered' ? filteredDevices : devices).length > 10 && (
                    <div className="text-center py-2 text-[11px] text-slate-500 italic bg-slate-100 mt-2 rounded border border-slate-200">
                      ... dan {(pdfScope === 'filtered' ? filteredDevices : devices).length - 10} perangkat lainnya akan dimuat lengkap pada file PDF yang diunduh.
                    </div>
                  )}

                  {/* Document Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>Dokumen Resmi System Engineering Cinema XXI</span>
                    <span>Halaman 1 dari 1 (Pratinjau)</span>
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer Buttons */}
            <div className="p-5 bg-slate-900 border-t border-rose-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs cursor-pointer"
              >
                BATAL
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Printer className="h-4 w-4 text-cyan-400" />
                  <span>🖨 CETAK (PRINT)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono font-black text-xs sm:text-sm tracking-wider shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-all cursor-pointer flex items-center gap-2.5 border border-rose-300 hover:scale-105 active:scale-95"
                  id="btn-download-pdf-now"
                >
                  <Download className="h-5 w-5 text-white animate-bounce" />
                  <span>📥 UNDUH PDF SEKARANG</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
