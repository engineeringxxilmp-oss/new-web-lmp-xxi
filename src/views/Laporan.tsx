/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Area, Equipment, PrEngineering, VendorTeknisi, OrderBarang, BarangDatang, RiwayatEquipment } from '../types';
import { FileSpreadsheet, Printer, Filter, X, Check, MapPin, Calendar, Database, FileText } from 'lucide-react';
import Modal from '../components/Modal';

interface LaporanProps {
  areas: Area[];
  equipment: Equipment[];
  prList: PrEngineering[];
  vendors: VendorTeknisi[];
  orders: OrderBarang[];
  barangDatang: BarangDatang[];
  riwayat: RiwayatEquipment[];
}

export default function Laporan({
  areas,
  equipment,
  prList,
  vendors,
  orders,
  barangDatang,
  riwayat
}: LaporanProps) {
  // Filter states
  const [selectedAreaId, setSelectedAreaId] = useState('ALL');
  const [filterTanggal, setFilterTanggal] = useState(''); // Text matching, e.g., "Juli 2026"

  // PDF Preview print modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const getAreaName = (id: string) => {
    return areas.find((a) => a.id === id)?.name || 'Tanpa Area';
  };

  const getEquipmentName = (id: string) => {
    return equipment.find((e) => e.id === id)?.name || 'Unknown Equipment';
  };

  // --- FILTER LOGIC ---
  const filteredEquipment = equipment.filter((eq) => {
    const matchArea = selectedAreaId === 'ALL' || eq.areaId === selectedAreaId;
    return matchArea; // Equipment has no date field
  });

  const filteredPr = prList.filter((pr) => {
    const matchArea = selectedAreaId === 'ALL' || pr.areaId === selectedAreaId;
    const matchDate = !filterTanggal ||
      pr.tanggalPenemuan.toLowerCase().includes(filterTanggal.toLowerCase()) ||
      (pr.tanggalSelesai && pr.tanggalSelesai.toLowerCase().includes(filterTanggal.toLowerCase()));
    return matchArea && matchDate;
  });

  const filteredVendors = vendors.filter((v) => {
    const matchArea = selectedAreaId === 'ALL' || v.areaId === selectedAreaId;
    const matchDate = !filterTanggal || v.tanggal.toLowerCase().includes(filterTanggal.toLowerCase());
    return matchArea && matchDate;
  });

  const filteredRiwayat = riwayat.filter((r) => {
    const matchArea = selectedAreaId === 'ALL' || r.areaId === selectedAreaId;
    const matchDate = !filterTanggal ||
      r.tanggalMulai.toLowerCase().includes(filterTanggal.toLowerCase()) ||
      (r.tanggalSelesai && r.tanggalSelesai.toLowerCase().includes(filterTanggal.toLowerCase()));
    return matchArea && matchDate;
  });

  // --- EXPORT TO EXCEL (CSV Format with UTF-8 BOM) ---
  const handleExportExcel = () => {
    let csvContent = '\uFEFF'; // Excel UTF-8 BOM
    csvContent += 'LAPORAN REKAPITULASI ENGINEERING CINEMA XXI LIPPO MALL PURI\r\n';
    csvContent += `Dibuat Tanggal: ${new Date().toLocaleDateString('id-ID')}\r\n`;
    csvContent += `Filter Area: ${selectedAreaId === 'ALL' ? 'Semua Area' : getAreaName(selectedAreaId)}\r\n`;
    csvContent += `Filter Tanggal: ${filterTanggal || 'Semua Tanggal'}\r\n\r\n`;

    // 1. Equipment Section
    csvContent += '--- LAPORAN EQUIPMENT ---\r\n';
    csvContent += 'ID;Nama Equipment;Area;Quantity;Status;Keterangan\r\n';
    filteredEquipment.forEach((eq) => {
      csvContent += `"${eq.id}";"${eq.name}";"${getAreaName(eq.areaId)}";${eq.quantity};"${eq.status}";"${eq.keterangan || ''}"\r\n`;
    });
    csvContent += '\r\n';

    // 2. PR Tickets Section
    csvContent += '--- LAPORAN PR ENGINEERING ---\r\n';
    csvContent += 'ID;Kategori;Area;Keluhan;Tanggal Temuan;Tanggal Selesai;Status;Keterangan\r\n';
    filteredPr.forEach((pr) => {
      csvContent += `"${pr.id}";"${pr.category}";"${getAreaName(pr.areaId)}";"${pr.keluhan}";"${pr.tanggalPenemuan}";"${pr.tanggalSelesai || '-'}";"${pr.status}";"${pr.keterangan || ''}"\r\n`;
    });
    csvContent += '\r\n';

    // 3. Vendor Visits Section
    csvContent += '--- LAPORAN JADWAL VENDOR ---\r\n';
    csvContent += 'ID;Vendor;Teknisi;Tanggal;Jam Mulai;Jam Selesai;Area Kerja;Hasil;Status\r\n';
    filteredVendors.forEach((v) => {
      csvContent += `"${v.id}";"${v.namaVendor}";"${v.namaTeknisi}";"${v.tanggal}";"${v.jamMulai}";"${v.jamSelesai}";"${getAreaName(v.areaId)}";"${v.hasilPekerjaan || ''}";"${v.status}"\r\n`;
    });
    csvContent += '\r\n';

    // 4. Riwayat Section
    csvContent += '--- LAPORAN RIWAYAT MAINTENANCE ---\r\n';
    csvContent += 'ID;Equipment;Area;Tanggal Mulai;Tanggal Selesai;Sparepart Diganti;Status Kondisi;Keterangan\r\n';
    filteredRiwayat.forEach((r) => {
      csvContent += `"${r.id}";"${getEquipmentName(r.equipmentId)}";"${getAreaName(r.areaId)}";"${r.tanggalMulai}";"${r.tanggalSelesai || '-'}";"${r.barangYangDiganti}";"${r.status}";"${r.keterangan || ''}"\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Cinema_XXI_Lippo_Mall_Puri_Eng_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PRINT PDF TRIGGER ---
  const handlePrintPDF = () => {
    setIsPreviewOpen(true);
  };

  const executePrint = () => {
    const printContent = document.getElementById('printable-report-area');
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const printHTML = `
      <html>
        <head>
          <title>Laporan Engineering CINEMA XXI LIPPO MALL PURI</title>
          <style>
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 40px; 
              color: #111827; 
              line-height: 1.5; 
              background-color: #ffffff !important; 
            }
            h1 { 
              font-size: 22px; 
              font-weight: 800; 
              border-bottom: 2px solid #111827; 
              padding-bottom: 10px; 
              margin-bottom: 20px; 
              color: #000000 !important; 
              letter-spacing: -0.025em;
              text-transform: uppercase;
            }
            h2 { 
              font-size: 14px; 
              font-weight: 800; 
              margin-top: 30px; 
              margin-bottom: 12px; 
              color: #111827 !important; 
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 6px;
              text-transform: uppercase;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 24px; 
              font-size: 11px; 
              background-color: #ffffff !important; 
              color: #374151 !important; 
            }
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 10px; 
              text-align: left; 
              color: #374151 !important; 
              background-color: #ffffff !important; 
            }
            th { 
              background-color: #f3f4f6 !important; 
              font-weight: 700; 
              color: #111827 !important; 
            }
            /* Custom Status Badges formatting for printing */
            .bg-emerald-100 { background-color: #ecfdf5 !important; border: 1px solid #a7f3d0; }
            .text-emerald-800 { color: #065f46 !important; }
            .bg-amber-100 { background-color: #fef3c7 !important; border: 1px solid #fde68a; }
            .text-amber-800 { color: #92400e !important; }
            .bg-rose-100 { background-color: #ffe4e6 !important; border: 1px solid #fecdd3; }
            .text-rose-800 { color: #9f1239 !important; }
            .bg-blue-100 { background-color: #eff6ff !important; border: 1px solid #bfdbfe; }
            .text-blue-800 { color: #1e40af !important; }
            
            span {
              display: inline-block;
              padding: 2px 6px !important;
              border-radius: 4px !important;
              font-weight: 800 !important;
              font-size: 9px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
            }
            .signature-block { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 60px; 
              font-size: 11px; 
              color: #374151 !important; 
            }
            .signature { 
              border-top: 1px solid #111827; 
              width: 200px; 
              text-align: center; 
              margin-top: 60px; 
              padding-top: 8px; 
              color: #111827 !important; 
              font-weight: 700;
            }
            @media print {
              body { padding: 0; }
              @page { size: landscape; margin: 20mm; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHTML);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 500);
    }
  };

  return (
    <div className="space-y-6" id="reports-tab-view">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d1322]/90 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            LAPORAN WEB
          </h2>
          <p className="text-sm md:text-base text-slate-300 mt-1 font-sans">
            Saring data log dan ekspor ke Excel (CSV) atau cetak dokumen PDF resmi untuk meeting manajerial.
          </p>
        </div>
      </div>

      {/* Filters Card Panel */}
      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
          <Filter className="h-4.5 w-4.5 text-blue-500" /> Saring Data Laporan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Area Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Area Penempatan
            </label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-hidden transition-all cursor-pointer"
              id="filter-report-area"
            >
              <option value="ALL" className="text-gray-900 bg-white">Semua Area ({areas.length})</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id} className="text-gray-900 bg-white">{a.name}</option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Tanggal / Bulan / Tahun
            </label>
            <input
              type="text"
              value={filterTanggal}
              onChange={(e) => setFilterTanggal(e.target.value)}
              placeholder="Contoh: Juli 2026, 10 Juli, atau kosongkan..."
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-hidden transition-all placeholder:text-gray-400"
              id="filter-report-date"
            />
          </div>
        </div>

        {/* Clear buttons or info */}
        {(selectedAreaId !== 'ALL' || filterTanggal) && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-blue-600">
            <span>Filter Aktif Terpasang</span>
            <button
              onClick={() => {
                setSelectedAreaId('ALL');
                setFilterTanggal('');
              }}
              className="flex items-center gap-1 font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Bersihkan Filter
            </button>
          </div>
        )}
      </div>

      {/* Export Action Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        
        {/* Excel Export Card */}
        <div
          onClick={handleExportExcel}
          className="group rounded-2xl border border-emerald-200 bg-white p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex gap-5 items-start"
          id="btn-export-excel"
        >
          <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div>
            <h4 className="font-extrabold text-gray-950 text-base font-sans">
              Ekspor ke Microsoft Excel
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed mt-1">
              Download file spreadsheet `.csv` berisi 4 database utama yang terfilter untuk pelaporan komparatif.
            </p>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs mt-3">
              Download CSV Spreadsheet →
            </span>
          </div>
        </div>

        {/* PDF Export Card */}
        <div
          onClick={handlePrintPDF}
          className="group rounded-2xl border border-blue-200 bg-white p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex gap-5 items-start"
          id="btn-export-pdf"
        >
          <div className="rounded-2xl bg-blue-50 p-4 text-blue-700 group-hover:scale-110 transition-transform">
            <Printer className="h-8 w-8" />
          </div>
          <div>
            <h4 className="font-extrabold text-gray-950 text-base font-sans">
              Cetak PDF / Pratinjau
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed mt-1">
              Renders a printable report layout with standard letterheads, audit logs, and signature fields.
            </p>
            <span className="inline-flex items-center gap-1 text-blue-700 font-bold text-xs mt-3">
              Buka Pratinjau Cetak →
            </span>
          </div>
        </div>

      </div>

      {/* Data summary preview */}
      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-gray-900 text-sm font-sans flex items-center gap-2 border-b pb-3 border-gray-100">
          <Database className="w-4.5 h-4.5 text-gray-400" /> Hasil Filter Database Saat Ini
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-2xl font-black text-gray-900 font-mono">{filteredEquipment.length}</p>
            <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider mt-1">Equipment Terfilter</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-2xl font-black text-gray-900 font-mono">{filteredPr.length}</p>
            <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider mt-1">Tiket PR Terfilter</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-2xl font-black text-gray-900 font-mono">{filteredVendors.length}</p>
            <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider mt-1">Vendor Terfilter</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-2xl font-black text-gray-900 font-mono">{filteredRiwayat.length}</p>
            <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wider mt-1">Riwayat Terfilter</p>
          </div>
        </div>
      </div>

      {/* Printable Report Modal Layout */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Pratinjau Dokumen Cetak"
        maxWidth="4xl"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-gray-100 p-4 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-600 font-mono font-medium">Format: Dokumen Resmi PDF 1.4 (Landscape Optimal)</span>
            <button
              onClick={executePrint}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
              id="execute-system-print"
            >
              <Printer className="w-3.5 h-3.5" /> Kirim ke Printer / Simpan PDF
            </button>
          </div>

          {/* Printable HTML Paper container */}
          <div
            className="border border-gray-300 p-8 rounded-xl bg-white text-gray-900 shadow-inner font-sans max-h-[60vh] overflow-y-auto"
            id="printable-report-area"
          >
            {/* Report Header */}
            <div className="text-center border-b-2 border-black pb-4 mb-6">
              <h1 className="text-xl font-black tracking-tight uppercase text-black">
                CINEMA XXI LIPPO MALL PURI
              </h1>
              <p className="text-xs font-mono tracking-widest text-gray-600 uppercase mt-1">
                Laporan Departemen Engineering &amp; Maintenance
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Alamat: Lippo Mall Puri Lantai 1, Kembangan, Jakarta Barat
              </p>
            </div>

            {/* Filter Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b pb-4 mb-4 text-gray-700">
              <div className="space-y-1">
                <p><span className="font-bold text-gray-900">JENIS LAPORAN:</span> REKAPITULASI MAINTENANCE</p>
                <p><span className="font-bold text-gray-900">FILTER AREA:</span> {selectedAreaId === 'ALL' ? 'SEMUA AREA' : getAreaName(selectedAreaId).toUpperCase()}</p>
              </div>
              <div className="text-right space-y-1">
                <p><span className="font-bold text-gray-900">TANGGAL CETAK:</span> {new Date().toLocaleDateString('id-ID')}</p>
                <p><span className="font-bold text-gray-900">PERIODE FILTER:</span> {filterTanggal ? filterTanggal.toUpperCase() : 'SEMUA RIWAYAT'}</p>
              </div>
            </div>

            {/* 1. Equipment List */}
            <div className="mb-6">
              <h2 className="text-xs font-extrabold uppercase border-b border-gray-300 pb-1.5 mb-2 text-gray-900">
                1. Inventory Equipment Terdaftar ({filteredEquipment.length})
              </h2>
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 font-bold border-b border-gray-300 text-gray-900">
                    <th className="p-2 border border-gray-200 text-gray-900 bg-gray-100 font-bold">Equipment</th>
                    <th className="p-2 border border-gray-200 text-gray-900 bg-gray-100 font-bold">Area</th>
                    <th className="p-2 border border-gray-200 text-gray-900 bg-gray-100 font-bold text-center">Qty</th>
                    <th className="p-2 border border-gray-200 text-gray-900 bg-gray-100 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 border border-gray-200 text-center text-gray-400 italic">Tidak ada data equipment.</td>
                    </tr>
                  ) : (
                    filteredEquipment.map((eq) => (
                      <tr key={eq.id} className="border-b border-gray-100 hover:bg-gray-50 text-gray-800">
                        <td className="p-2 border border-gray-200 font-bold text-gray-900">{eq.name}</td>
                        <td className="p-2 border border-gray-200">{getAreaName(eq.areaId)}</td>
                        <td className="p-2 border border-gray-200 text-center font-mono font-bold">{eq.quantity}</td>
                        <td className="p-2 border border-gray-200">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            eq.status === 'Normal' ? 'bg-emerald-100 text-emerald-800' :
                            eq.status === 'Maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {eq.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 2. PR Tickets */}
            <div className="mb-6">
              <h2 className="text-xs font-extrabold uppercase border-b border-gray-300 pb-1.5 mb-2 text-gray-900">
                2. Laporan PR Engineering &amp; Keluhan ({filteredPr.length})
              </h2>
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-200 font-black border-b border-gray-400 text-slate-950">
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black">Kategori</th>
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black">Area</th>
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black">Keluhan Detail</th>
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black font-mono">Temuan</th>
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPr.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 border border-gray-300 text-center text-slate-800 font-bold italic">Tidak ada keluhan terekam.</td>
                    </tr>
                  ) : (
                    filteredPr.map((pr) => (
                      <tr key={pr.id} className="border-b border-gray-200 hover:bg-slate-50 text-slate-900">
                        <td className="p-2.5 border border-gray-300 font-black text-slate-950">{pr.category}</td>
                        <td className="p-2.5 border border-gray-300 font-bold">{getAreaName(pr.areaId)}</td>
                        <td className="p-2.5 border border-gray-300 text-slate-900 font-medium">{pr.keluhan}</td>
                        <td className="p-2.5 border border-gray-300 font-mono font-bold text-slate-950">{pr.tanggalPenemuan}</td>
                        <td className="p-2.5 border border-gray-300">
                          <span className={`px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider ${
                            pr.status === 'Belum Dikerjakan' ? 'bg-rose-100 text-rose-950 border border-rose-300' :
                            pr.status === 'Sedang Diproses' ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          }`}>
                            {pr.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 3. Vendor Log */}
            <div className="mb-6">
              <h2 className="text-sm font-black uppercase border-b-2 border-gray-400 pb-1.5 mb-2 text-slate-950">
                3. Log Kunjungan Vendor &amp; Kontraktor ({filteredVendors.length})
              </h2>
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-200 font-black border-b border-gray-400 text-slate-950">
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black">Vendor</th>
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black">Teknisi</th>
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black">Tanggal</th>
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black">Laporan Hasil</th>
                    <th className="p-2.5 border border-gray-300 text-slate-950 bg-slate-200 font-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 border border-gray-300 text-center text-slate-800 font-bold italic">Tidak ada kunjungan vendor.</td>
                    </tr>
                  ) : (
                    filteredVendors.map((v) => (
                      <tr key={v.id} className="border-b border-gray-200 hover:bg-slate-50 text-slate-900">
                        <td className="p-2.5 border border-gray-300 font-black text-slate-950">{v.namaVendor}</td>
                        <td className="p-2.5 border border-gray-300 font-bold">{v.namaTeknisi}</td>
                        <td className="p-2.5 border border-gray-300 font-mono font-bold text-slate-950">
                          {v.tanggal} <span className="text-xs text-slate-800 font-black">({v.jamMulai}-{v.jamSelesai})</span>
                        </td>
                        <td className="p-2.5 border border-gray-300 text-slate-900 font-medium italic">{v.hasilPekerjaan || '-'}</td>
                        <td className="p-2.5 border border-gray-300">
                          <span className={`px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider ${
                            v.status === 'Selesai' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' :
                            v.status === 'On Progress' ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-rose-100 text-rose-950 border border-rose-300'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Signatures block */}
            <div className="mt-12 flex justify-between text-xs pt-8 border-t border-gray-200 text-gray-800">
              <div className="text-center w-40">
                <p>Dilaporkan Oleh,</p>
                <p className="font-bold mt-12 underline text-black">Chief Engineering</p>
                <p className="text-[10px] text-gray-500">CINEMA XXI LIPPO MALL PURI</p>
              </div>
              <div className="text-center w-40">
                <p>Mengetahui,</p>
                <p className="font-bold mt-12 underline text-black">General Manager</p>
                <p className="text-[10px] text-gray-500">CINEMA XXI LIPPO MALL PURI</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
