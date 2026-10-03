/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { FormCutiData } from '../types';
import { renderPdfToCanvas, isBufferDetached } from '../utils/cutiPdfEngine';
import { Upload, FileText, Check, AlertCircle, ZoomIn, ZoomOut, RotateCcw, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface CutiPdfLivePreviewProps {
  masterPdfBytes: Uint8Array | null;
  formData: FormCutiData;
  formatIndoDate: (d?: string) => string;
  onUploadTemplate: (file: File) => void;
  onReloadTemplate?: (freshBytes: Uint8Array) => void;
  scale?: number;
  className?: string;
}

export default function CutiPdfLivePreview({
  masterPdfBytes,
  formData,
  formatIndoDate,
  onUploadTemplate,
  onReloadTemplate,
  scale = 1.0,
  className = ''
}: CutiPdfLivePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(scale);
  const [showDataOverlay, setShowDataOverlay] = useState(true);

  // Keep a stable ref for onReloadTemplate to avoid triggering re-renders when parent re-renders
  const onReloadTemplateRef = useRef(onReloadTemplate);
  useEffect(() => {
    onReloadTemplateRef.current = onReloadTemplate;
  }, [onReloadTemplate]);

  // Re-render PDF on canvas whenever masterPdfBytes or zoom changes
  useEffect(() => {
    let isCancelled = false;

    async function render() {
      if (!canvasRef.current) return;

      try {
        setIsRendering(true);
        setRenderError(null);
        const result = await renderPdfToCanvas(masterPdfBytes, canvasRef.current, zoom * 1.5);
        if (!isCancelled && !result?.cancelled && result?.freshBytes && onReloadTemplateRef.current) {
          onReloadTemplateRef.current(result.freshBytes);
        }
      } catch (err: any) {
        if (!isCancelled) {
          // If cancelled due to rapid zoom or collision avoidance, ignore
          if (
            err?.name === 'RenderingCancelledException' ||
            err?.message?.includes('RenderingCancelledException') ||
            err?.message?.includes('Cannot use the same canvas') ||
            err?.message?.includes('cancelled')
          ) {
            return;
          }
          console.error('Error rendering master PDF:', err);
          setRenderError(err.message || 'Gagal merender halaman PDF asli.');
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    render();

    return () => {
      isCancelled = true;
      if (canvasRef.current) {
        const session = (canvasRef.current as any)._activePdfSession;
        if (session) {
          if (session.renderTask) {
            try { session.renderTask.cancel(); } catch (_) {}
          }
          if (session.loadingTask) {
            try { session.loadingTask.destroy(); } catch (_) {}
          }
        }
      }
    };
  }, [masterPdfBytes, zoom]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        onUploadTemplate(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadTemplate(e.target.files[0]);
    }
  };

  return (
    <div className={`relative flex flex-col items-center w-full max-w-full min-w-0 ${className}`}>
      {/* Clean Desk Control Bar (Tanpa Label Teknis / Debug) */}
      <div className="w-full flex items-center justify-between pb-3 px-1 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 text-slate-400 font-sans text-xs">
          <span className="font-mono text-[11px] text-slate-400">Ukuran Standar A4 (210 × 297 mm)</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            title="Perkecil (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-[11px] font-mono font-medium text-slate-200 min-w-[42px] text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            title="Perbesar (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer ml-0.5 border-l border-slate-800"
            title="Reset Ukuran (100%)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Preview Frame - Realistic Physical A4 Paper */}
      {masterPdfBytes ? (
        <div
          id="pdf-master-preview-wrapper"
          className="relative bg-white select-text transition-all duration-300 w-full min-w-0"
          style={{
            backgroundColor: '#ffffff',
            width: '100%',
            maxWidth: `${595 * zoom}px`,
            aspectRatio: '595.28 / 841.89',
            boxSizing: 'border-box',
            containerType: 'inline-size',
            // Efek kertas formulir fisik realistis di atas meja kerja digital
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 25px 50px -12px rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: '2px'
          }}
        >
          {/* 1. Underlying Canvas Rendering Real PDF Page */}
          <canvas
            ref={canvasRef}
            className="w-full h-full block pointer-events-none bg-white"
            style={{ width: '100%', height: '100%', backgroundColor: '#ffffff' }}
          />

          {/* Official Trio Header Logo (Cinema XXI • the Premiere • Cinema 21) */}
          {/* Sesuai Permintaan: logo Cinema XXI digeser ke kiri, logo Cinema 21 digeser ke kanan */}
          <div
            className="absolute bg-white pointer-events-none z-10 flex items-center justify-center px-1 box-border"
            style={{
              top: '2.8%',
              left: '5.2%',
              width: '89.6%',
              height: '5.2%'
            }}
            title="Cinema XXI • the Premiere • Cinema 21"
          >
            <img
              src="/cinema-trio-header.png?v=shifted"
              alt="Cinema XXI • the Premiere • Cinema 21"
              className="w-full h-full object-contain pointer-events-none select-none block"
            />
          </div>

          {/* 2. Precision Digital Input Overlay Layer (Can be toggled off for clean template inspection) */}
          {showDataOverlay && (
            <div
              className="absolute inset-0 pointer-events-none text-black font-sans bg-transparent"
              style={{
                fontSize: '1.51cqw',
                lineHeight: 1.15
              }}
            >
              {/* Judul Bagian I: DATA PEGAWAI (Font Normal / Regular) */}
              <div
                className="absolute flex items-center font-normal text-black bg-white"
                style={{ top: '12.00%', left: '7.05%', height: '1.80%', paddingRight: '4px' }}
              >
                I. DATA PEGAWAI
              </div>

              {/* Section I: DATA PEGAWAI */}
              {/* Nama */}
              <div
                className="absolute flex items-center font-normal text-black"
                style={{ top: '13.77%', left: '21.00%', width: '36.5%', height: '1.66%', whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {formData.nama}
              </div>

              {/* NIK */}
              <div
                className="absolute flex items-center font-normal text-black"
                style={{ top: '13.77%', left: '68.88%', width: '24.5%', height: '1.66%', whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {formData.nik}
              </div>

              {/* Divisi */}
              <div
                className="absolute flex items-center font-normal text-black"
                style={{ top: '15.43%', left: '21.00%', width: '36.5%', height: '1.66%', whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {formData.divisi}
              </div>

              {/* No. HP */}
              <div
                className="absolute flex items-center font-normal text-black"
                style={{ top: '15.43%', left: '68.88%', width: '24.5%', height: '1.66%', whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {formData.noHp}
              </div>

              {/* Jabatan/Posisi */}
              <div
                className="absolute flex items-center font-normal text-black"
                style={{ top: '17.09%', left: '21.00%', width: '72.5%', height: '1.66%', whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {formData.jabatan}
              </div>

              {/* Section II: RENCANA CUTI */}
              {formData.tanggalMulai && (
                <div
                  className="absolute flex items-center font-normal text-black"
                  style={{ top: '19.82%', left: '22.8%', width: '72%', height: '1.8%', whiteSpace: 'nowrap', overflow: 'hidden' }}
                >
                  {formatIndoDate(formData.tanggalMulai)} s/d {formatIndoDate(formData.tanggalSelesai)} ( {formData.jumlahHari || 0} Hari Cuti )
                </div>
              )}

              {/* Section III: BEKERJA KEMBALI */}
              {formData.tanggalKembali && (
                <div
                  className="absolute flex items-center font-normal text-black"
                  style={{ top: '22.20%', left: '26.2%', width: '68%', height: '1.8%', whiteSpace: 'nowrap', overflow: 'hidden' }}
                >
                  Tanggal {formatIndoDate(formData.tanggalKembali)}
                </div>
              )}

              {/* Section IV: JENIS CUTI YANG DIAMBIL (Checkmarks in 8.5pt square boxes) */}
              {formData.jenisCuti === 'Cuti Tahunan' && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '26.77%', left: '9.24%', width: '1.43%', height: '1.01%' }}>
                  <svg viewBox="0 0 10 10" className="w-full h-full text-black stroke-black fill-none">
                    <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {formData.jenisCuti === 'Menikah' && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '29.15%', left: '9.24%', width: '1.43%', height: '1.01%' }}>
                  <svg viewBox="0 0 10 10" className="w-full h-full text-black stroke-black fill-none">
                    <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {formData.jenisCuti === 'Menikahkan Anak' && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '31.52%', left: '9.24%', width: '1.43%', height: '1.01%' }}>
                  <svg viewBox="0 0 10 10" className="w-full h-full text-black stroke-black fill-none">
                    <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {formData.jenisCuti === 'Khitanan Anak' && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '33.90%', left: '9.24%', width: '1.43%', height: '1.01%' }}>
                  <svg viewBox="0 0 10 10" className="w-full h-full text-black stroke-black fill-none">
                    <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {formData.jenisCuti === 'Baptisan Anak' && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '26.77%', left: '32.76%', width: '1.43%', height: '1.01%' }}>
                  <svg viewBox="0 0 10 10" className="w-full h-full text-black stroke-black fill-none">
                    <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {(formData.jenisCuti === 'Istri Melahirkan / Keguguran' || formData.jenisCuti === 'Istri Melahirkan/Keguguran') && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '29.15%', left: '32.76%', width: '1.43%', height: '1.01%' }}>
                  <svg viewBox="0 0 10 10" className="w-full h-full text-black stroke-black fill-none">
                    <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {formData.jenisCuti === 'Suami/Istri, Orangtua/Mertua atau Menantu Meninggal' && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '31.52%', left: '32.76%', width: '1.43%', height: '1.01%' }}>
                  <svg viewBox="0 0 10 10" className="w-full h-full text-black stroke-black fill-none">
                    <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {formData.jenisCuti === 'Anggota keluarga dalam 1 rumah meninggal dunia' && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '26.77%', left: '70.56%', width: '1.43%', height: '1.01%' }}>
                  <svg viewBox="0 0 10 10" className="w-full h-full text-black stroke-black fill-none">
                    <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              {/* Judul Bagian V: ALASAN CUTI (Font Normal / Regular) */}
              <div
                className="absolute flex items-center font-normal text-black bg-white"
                style={{ top: '36.90%', left: '7.05%', height: '1.60%', paddingRight: '4px' }}
              >
                V. ALASAN CUTI
              </div>

              {/* Section V: ALASAN CUTI */}
              {formData.alasanCuti && (
                <div
                  className="absolute font-normal text-black overflow-hidden leading-relaxed"
                  style={{
                    top: '38.6%',
                    left: '7.6%',
                    width: '84.8%',
                    height: '5.3%',
                    fontSize: '1.45cqw'
                  }}
                >
                  {formData.alasanCuti}
                </div>
              )}

              {/* Judul Bagian VI: PEJABAT PENGGANTI SELAMA CUTI (Font Normal / Regular, Huruf Kapital Semua) */}
              <div
                className="absolute flex items-center font-normal text-black bg-white"
                style={{ top: '45.75%', left: '7.05%', height: '1.90%', paddingRight: '4px' }}
              >
                VI. PEJABAT PENGGANTI SELAMA CUTI
              </div>

              {/* Section VI: Pejabat Pengganti Selama Cuti (Teks Isian) */}
              {/* Kolom isian nama pejabat pengganti (antara garis Nama di 15.96% dan garis tengah di 63.83%) */}
              <div
                className="absolute flex items-center font-normal text-black"
                style={{ top: '47.74%', left: '16.80%', width: '46.5%', height: '2.14%', whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {formData.penggantiNama}
              </div>

              {/* Kolom isian nomor handphone pejabat pengganti (setelah garis No. HP di 73.07%) */}
              <div
                className="absolute flex items-center font-normal text-black"
                style={{ top: '47.74%', left: '73.91%', width: '19.2%', height: '2.14%', whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                {formData.penggantiNoHp}
              </div>

              {/* Section VII: PARAF / PERSETUJUAN */}
              {/* Diajukan Oleh */}
              <div
                className="absolute text-center font-normal text-black flex items-end justify-center"
                style={{ top: '55.5%', left: '8.4%', width: '21.8%', height: '3.3%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {formData.diajukanOlehNama}
              </div>
              <div
                className="absolute text-center text-slate-800 flex items-start justify-center"
                style={{ top: '59.5%', left: '8.4%', width: '21.8%', fontSize: '1.35cqw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {formData.diajukanOlehJabatan}
              </div>

              {/* Disetujui Oleh */}
              <div
                className="absolute text-center font-normal text-black flex items-end justify-center"
                style={{ top: '55.5%', left: '39.0%', width: '21.8%', height: '3.3%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {formData.disetujuiOlehNama}
              </div>
              <div
                className="absolute text-center text-slate-800 flex items-start justify-center"
                style={{ top: '59.5%', left: '39.0%', width: '21.8%', fontSize: '1.35cqw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {formData.disetujuiOlehJabatan}
              </div>

              {/* Mengetahui */}
              <div
                className="absolute text-center font-normal text-black flex items-end justify-center"
                style={{ top: '55.5%', left: '69.7%', width: '21.8%', height: '3.3%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {formData.mengetahuiNama}
              </div>
              <div
                className="absolute text-center text-slate-800 flex items-start justify-center"
                style={{ top: '59.5%', left: '69.7%', width: '21.8%', fontSize: '1.35cqw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {formData.mengetahuiJabatan}
              </div>

              {/* Section VIII: DIISI OLEH HUMAN CAPITAL - 1. DATA CUTI */}
              {/* Requirement 3: Logic Titik-Titik - jika terisi ditutup latar putih, jika kosong titik-titik master PDF tetap terlihat */}
              {formData.hcHakCutiHari && String(formData.hcHakCutiHari).trim() !== '' && (
                <div className="absolute flex items-center font-normal text-black bg-white px-1" style={{ top: '71.4%', left: '34.5%', height: '1.8%', minWidth: '8%' }}>
                  {formData.hcHakCutiHari} Hari
                </div>
              )}
              {formData.hcCutiTelahDiambil && String(formData.hcCutiTelahDiambil).trim() !== '' && (
                <div className="absolute flex items-center font-normal text-black bg-white px-1" style={{ top: '73.3%', left: '34.5%', height: '1.8%', minWidth: '8%' }}>
                  {formData.hcCutiTelahDiambil} Hari
                </div>
              )}
              {formData.hcIzin && String(formData.hcIzin).trim() !== '' && (
                <div className="absolute flex items-center font-normal text-black bg-white px-1" style={{ top: '75.2%', left: '34.5%', height: '1.8%', minWidth: '8%' }}>
                  {formData.hcIzin} Hari
                </div>
              )}
              {formData.hcAlpa && String(formData.hcAlpa).trim() !== '' && (
                <div className="absolute flex items-center font-normal text-black bg-white px-1" style={{ top: '77.1%', left: '34.5%', height: '1.8%', minWidth: '8%' }}>
                  {formData.hcAlpa} Hari
                </div>
              )}
              {formData.hcSakit && String(formData.hcSakit).trim() !== '' && (
                <div className="absolute flex items-center font-normal text-black bg-white px-1" style={{ top: '79.0%', left: '34.5%', height: '1.8%', minWidth: '8%' }}>
                  {formData.hcSakit} Hari
                </div>
              )}
              {formData.hcSisaCuti && String(formData.hcSisaCuti).trim() !== '' && (
                <div className="absolute flex items-center font-normal text-black bg-white px-1" style={{ top: '80.9%', left: '34.5%', height: '1.8%', minWidth: '8%' }}>
                  {formData.hcSisaCuti} Hari
                </div>
              )}

              {/* Requirement 2.B: Bagian Hasil Verifikasi Data Cuti Karyawan */}
              {/* Hanya kata "Dapat" bold di baris 1, hanya kata "Tidak Dapat" bold di baris 2 */}
              <div
                className="absolute flex items-center bg-white text-black font-sans"
                style={{ top: '85.6%', left: '11.9%', height: '1.9%', whiteSpace: 'nowrap' }}
              >
                <span>Permohonan Cuti&nbsp;</span>
                <span className="font-bold">Dapat</span>
                <span>&nbsp;Diproses</span>
              </div>
              <div
                className="absolute flex items-center bg-white text-black font-sans"
                style={{ top: '87.7%', left: '11.9%', height: '1.9%', whiteSpace: 'nowrap' }}
              >
                <span>Permohonan Cuti&nbsp;</span>
                <span className="font-bold">Tidak Dapat</span>
                <span>&nbsp;Diproses</span>
              </div>

              {/* Verifikasi Checks (x) */}
              {formData.hcStatusVerifikasi === 'Dapat Diproses' && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '85.74%', left: '9.74%', width: '1.43%', height: '1.01%' }}>
                  <span className="font-bold font-mono text-[1.4cqw] leading-none text-black select-none">x</span>
                </div>
              )}
              {formData.hcStatusVerifikasi === 'Tidak Dapat Diproses' && (
                <div className="absolute flex items-center justify-center p-[0.5px]" style={{ top: '87.88%', left: '9.74%', width: '1.43%', height: '1.01%' }}>
                  <span className="font-bold font-mono text-[1.4cqw] leading-none text-black select-none">x</span>
                </div>
              )}

              {/* HC Database Paraf (menutupi titik-titik jika nama paraf diisi) */}
              {formData.hcParafNama && String(formData.hcParafNama).trim() !== '' && (
                <div
                  className="absolute flex items-center justify-center font-normal text-black bg-white px-2"
                  style={{ top: '94.2%', left: '69.5%', width: '23%', height: '2.0%', whiteSpace: 'nowrap' }}
                >
                  ( {formData.hcParafNama} )
                </div>
              )}
            </div>
          )}

          {/* Loading indicator while rendering */}
          {isRendering && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center text-slate-800 font-mono text-xs z-20">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-600 mr-2" />
              <span>Memproses rendering PDF asli...</span>
            </div>
          )}

          {/* Render Error Banner */}
          {renderError && (
            <div className="absolute top-2 inset-x-2 bg-rose-950/95 border border-rose-500/70 p-2.5 rounded-lg shadow-xl text-rose-200 text-xs flex items-center justify-between z-30 font-sans">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{renderError}</span>
              </div>
              <button
                onClick={() => {
                  setRenderError(null);
                  setZoom((z) => z);
                }}
                className="px-2.5 py-1 rounded bg-rose-800 hover:bg-rose-700 text-white font-mono text-[11px] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State / Upload Master PDF Dropzone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`w-full max-w-xl p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-4 ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
              : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-500/60'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-bold text-white font-mono">
              Muat Dokumen Asli (Form Cuti master pdf.pdf)
            </h4>
            <p className="text-xs text-slate-400 max-w-md">
              Sesuai instruksi resmi, pratinjau dan unduhan PDF wajib merender langsung file PDF master asli tanpa rekonstruksi HTML.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-mono font-bold text-xs hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Pilih File "Form Cuti master pdf.pdf"</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 font-mono">
            atau seret & letakkan file PDF ke dalam kotak ini
          </p>
        </div>
      )}

      {/* Button to replace/reload template if already loaded */}
      {masterPdfBytes && (
        <div className="w-full flex justify-end pt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] text-cyan-400/80 hover:text-cyan-300 underline font-mono cursor-pointer flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            <span>Ganti File Master PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
