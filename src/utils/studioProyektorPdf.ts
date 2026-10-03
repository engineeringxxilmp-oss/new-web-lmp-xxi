/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudioData, ProyektorData } from '../types/studioProyektor';

// Helper to format date in Indonesian format
function getFormattedIndonesianDate(): string {
  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayName = days[now.getDay()];
  const date = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${dayName}, ${date} ${month} ${year} — ${hours}:${minutes} WIB`;
}

// Convert image url to HTMLImageElement for dimension probing
async function getImageDimensions(src: string): Promise<{ width: number; height: number; img: HTMLImageElement } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, img });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function exportStudioProyektorToPdf(
  studios: StudioData[],
  proyektors: ProyektorData[],
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Menyiapkan dokumen PDF...');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Tracking page numbers for Table of Contents
  const tocEntries: Array<{ title: string; category: 'studio' | 'proyektor'; pageNumber: number }> = [];

  // =========================================================================
  // 1. HALAMAN SAMPUL (COVER PAGE)
  // =========================================================================
  onProgress?.('Membuat Halaman Sampul...');

  // Decorative top bar
  doc.setFillColor(7, 15, 38); // Deep Navy
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(217, 119, 6); // Gold accent
  doc.rect(0, 28, pageWidth, 3, 'F');

  // Try to load Cinema XXI Logo
  try {
    const logoImg = await getImageDimensions('/cinema-xxi.png');
    if (logoImg) {
      const targetW = 65;
      const targetH = (logoImg.height / logoImg.width) * targetW;
      doc.addImage(logoImg.img, 'PNG', (pageWidth - targetW) / 2, 55, targetW, targetH);
    }
  } catch (_) {}

  // Cover Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('DATA TEKNIS', pageWidth / 2, 104, { align: 'center' });
  doc.setFontSize(19);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('AREA STUDIO & PROYEKTOR', pageWidth / 2, 114, { align: 'center' });

  // Divider line
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.line(marginX + 25, 123, pageWidth - marginX - 25, 123);

  // Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('CINEMA XXI — LIPPO MALL PURI', pageWidth / 2, 133, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('Engineering Management System & Digital Technical Reference Book', pageWidth / 2, 140, { align: 'center' });

  // Summary box on cover
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX + 15, 160, contentWidth - 30, 48, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('INFORMASI DOKUMEN', marginX + 22, 172);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Unit Kerja       : Divisi Engineering & Proyektor Cinema XXI`, marginX + 22, 180);
  doc.text(`• Total Ruang    : ${studios.length} Area Studio | ${proyektors.length} Area Proyektor`, marginX + 22, 186);
  doc.text(`• Tanggal Cetak : ${getFormattedIndonesianDate()}`, marginX + 22, 192);
  doc.text(`• Status              : Dokumen Resmi Terverifikasi Sistem`, marginX + 22, 198);

  // Footer Cover
  doc.setFillColor(7, 15, 38);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('CINEMA XXI LIPPO MALL PURI — ENGINEERING DEPARTMENT', pageWidth / 2, pageHeight - 9, { align: 'center' });

  // =========================================================================
  // 2. DAFTAR ISI (TABLE OF CONTENTS)
  // =========================================================================
  doc.addPage();
  const tocPageNumber = doc.getNumberOfPages();

  // We will placeholder the TOC page, and write the contents afterwards
  // once all item page numbers are known!

  // =========================================================================
  // 3. BAGIAN I — AREA STUDIO
  // =========================================================================
  for (let idx = 0; idx < studios.length; idx++) {
    const studio = studios[idx];
    onProgress?.(`Memproses Bagian I: ${studio.name} (${idx + 1}/${studios.length})...`);

    doc.addPage();
    const currentPageNum = doc.getNumberOfPages();
    tocEntries.push({
      title: studio.name,
      category: 'studio',
      pageNumber: currentPageNum
    });

    let currentY = 16;

    // Header Bar
    doc.setFillColor(7, 15, 38);
    doc.roundedRect(marginX, currentY, contentWidth, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(251, 191, 36); // gold
    doc.text('BAGIAN I — SPESIFIKASI AREA STUDIO', marginX + 6, currentY + 6);
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(studio.name.toUpperCase(), marginX + 6, currentY + 12);
    doc.setFontSize(8);
    doc.text(`Tipe: ${studio.studioType.toUpperCase()} | XXI LIPPO MALL PURI`, pageWidth - marginX - 6, currentY + 10, { align: 'right' });
    currentY += 21;

    // Table A: Spesifikasi Layar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('A. Spesifikasi Layar', marginX, currentY);
    currentY += 2;

    const layarRows = [
      ['Jenis Layar', studio.layar.jenisLayar || '—'],
      ['Merek atau Tipe Layar', studio.layar.merekTipeLayar || '—'],
      ['Ukuran Layar (Lebar)', studio.layar.ukuranLebar || '—'],
      ['Ukuran Layar (Tinggi)', studio.layar.ukuranTinggi || '—'],
      ['Rasio Aspek', studio.layar.rasioAspek || '—'],
      ['Tipe Layar', studio.layar.tipeLayar || '—'],
      ['Motor Layar', studio.layar.motorLayar || '—'],
      ['Tipe Motor Layar', studio.layar.tipeMotorLayar || '—'],
      ['Korden Layar', studio.layar.kordenLayar || '—'],
      ['Tipe Korden Layar', studio.layar.tipeKordenLayar || '—'],
      ['Keterangan Tambahan', studio.layar.keteranganTambahan || '—']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Nama Spesifikasi', 'Detail']],
      body: layarRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: contentWidth - 55 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Table B: Spesifikasi Sound System
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('B. Spesifikasi Sound System', marginX, currentY);
    currentY += 2;

    const soundRows = [
      ['Jenis Sound System', studio.soundSystem.jenisSoundSystem || '—'],
      ['Merek Sound System', studio.soundSystem.merekSoundSystem || '—'],
      ['Tipe Sound System', studio.soundSystem.tipeSoundSystem || '—'],
      ['Prosesor & Tipe', `${studio.soundSystem.prosesor || '—'} ${studio.soundSystem.tipeProsesor ? `(${studio.soundSystem.tipeProsesor})` : ''}`.trim()],
      ['DCM & Tipe DCM', `${studio.soundSystem.dcm || '—'} ${studio.soundSystem.tipeDcm ? `(${studio.soundSystem.tipeDcm})` : ''}`.trim()],
      ['Crossover & Tipe', `${studio.soundSystem.crossover || '—'} ${studio.soundSystem.tipeCrossover ? `(${studio.soundSystem.tipeCrossover})` : ''}`.trim()],
      ['Monitor Sound', `${studio.soundSystem.monitorSound || '—'} ${studio.soundSystem.merekTipeMonitorSound ? `(${studio.soundSystem.merekTipeMonitorSound})` : ''}`.trim()],
      ['Main Speaker Depan (Kiri / Kanan)', `${studio.soundSystem.mainSpeakerDepanKiri || '—'} / ${studio.soundSystem.mainSpeakerDepanKanan || '—'}`],
      ['Center Speaker', studio.soundSystem.centerSpeaker || '—'],
      ['Top Speaker (Atas)', studio.soundSystem.topSpeaker || '—'],
      ['Surround Speaker (Kiri / Kanan)', `${studio.soundSystem.surroundSpeakerKiri || '—'} / ${studio.soundSystem.surroundSpeakerKanan || '—'}`],
      ['Back Surround (Kiri / Kanan)', `${studio.soundSystem.backSurroundKiri || '—'} / ${studio.soundSystem.backSurroundKanan || '—'}`],
      ['Subwoofer', studio.soundSystem.subwoofer || '—'],
      ['Keterangan Tambahan', studio.soundSystem.keteranganTambahan || '—']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Nama Spesifikasi Sound', 'Detail']],
      body: soundRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: contentWidth - 55 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Check if we need page break for Fasilitas Studio
    if (currentY > pageHeight - 75) {
      doc.addPage();
      currentY = 20;
    }

    // Table C: Fasilitas Studio
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('C. Fasilitas Studio', marginX, currentY);
    currentY += 2;

    const fasilitasRows = [
      ['Jumlah Bangku', studio.fasilitas.jumlahBangku || '—'],
      ['Tipe Bangku', studio.fasilitas.tipeBangku || '—'],
      ['Jenis Lantai', studio.fasilitas.jenisLantai || '—'],
      ['Jenis Dinding', studio.fasilitas.jenisDinding || '—'],
      ['Jenis Plafon', studio.fasilitas.jenisPlafon || '—'],
      ['Tipe Studio', studio.fasilitas.tipeStudio || '—'],
      ['Fasilitas Tambahan', studio.fasilitas.fasilitasTambahan || '—'],
      ['Keterangan', studio.fasilitas.keterangan || '—']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Fasilitas Studio', 'Detail']],
      body: fasilitasRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: contentWidth - 55 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Catatan Tambahan (jika ada)
    if (studio.catatanTambahan) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('Catatan Teknis Tambahan:', marginX, currentY);
      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(studio.catatanTambahan, marginX, currentY, { maxWidth: contentWidth });
      currentY += 10;
    }

    // Denah Arsitek (D)
    if (studio.denahGambar && studio.denahGambar.dataUrl) {
      doc.addPage();
      let denahY = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`D. Denah Arsitek / Gambar Teknis — ${studio.name}`, marginX, denahY);
      denahY += 6;

      try {
        const denahDim = await getImageDimensions(studio.denahGambar.dataUrl);
        if (denahDim) {
          const maxW = contentWidth;
          const maxH = pageHeight - denahY - 35;
          let drawW = maxW;
          let drawH = (denahDim.height / denahDim.width) * drawW;
          if (drawH > maxH) {
            drawH = maxH;
            drawW = (denahDim.width / denahDim.height) * drawH;
          }
          const posX = marginX + (contentWidth - drawW) / 2;
          doc.addImage(denahDim.img, 'JPEG', posX, denahY, drawW, drawH);
          denahY += drawH + 4;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`File Denah: ${studio.denahGambar.name} (Tersimpan)`, marginX, denahY);
        }
      } catch (err) {
        console.warn('PDF denah image error:', err);
      }
    }

    // Foto Studio (E)
    if (studio.fotoStudio && studio.fotoStudio.length > 0) {
      doc.addPage();
      let fotoY = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`E. Foto Dokumentasi Studio — ${studio.name} (${studio.fotoStudio.length} Foto)`, marginX, fotoY);
      fotoY += 8;

      for (let fIdx = 0; fIdx < studio.fotoStudio.length; fIdx++) {
        const foto = studio.fotoStudio[fIdx];
        if (!foto.dataUrl) continue;
        try {
          const fotoDim = await getImageDimensions(foto.dataUrl);
          if (fotoDim) {
            const maxW = contentWidth;
            const maxH = 95;
            let drawW = maxW;
            let drawH = (fotoDim.height / fotoDim.width) * drawW;
            if (drawH > maxH) {
              drawH = maxH;
              drawW = (fotoDim.width / fotoDim.height) * drawH;
            }

            if (fotoY + drawH + 15 > pageHeight - 15) {
              doc.addPage();
              fotoY = 20;
            }

            const posX = marginX + (contentWidth - drawW) / 2;
            doc.addImage(fotoDim.img, 'JPEG', posX, fotoY, drawW, drawH);
            fotoY += drawH + 3;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Foto #${fIdx + 1}: ${foto.title || 'Dokumentasi Studio'}`, posX, fotoY);
            fotoY += 8;
          }
        } catch (_) {}
      }
    }
  }

  // =========================================================================
  // 4. BAGIAN II — AREA PROYEKTOR
  // =========================================================================
  for (let idx = 0; idx < proyektors.length; idx++) {
    const proyektor = proyektors[idx];
    onProgress?.(`Memproses Bagian II: ${proyektor.name} (${idx + 1}/${proyektors.length})...`);

    doc.addPage();
    const currentPageNum = doc.getNumberOfPages();
    tocEntries.push({
      title: proyektor.name,
      category: 'proyektor',
      pageNumber: currentPageNum
    });

    let currentY = 16;

    // Header Bar
    doc.setFillColor(8, 47, 73); // Deep Cyan/Navy
    doc.roundedRect(marginX, currentY, contentWidth, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text('BAGIAN II — SPESIFIKASI RUANG PROYEKTOR', marginX + 6, currentY + 6);
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(proyektor.name.toUpperCase(), marginX + 6, currentY + 12);
    doc.setFontSize(8);
    doc.text(`Ref: ${proyektor.studioRef} | XXI LIPPO MALL PURI`, pageWidth - marginX - 6, currentY + 10, { align: 'right' });
    currentY += 21;

    // Table A: Spesifikasi Proyektor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('A. Spesifikasi Proyektor', marginX, currentY);
    currentY += 2;

    const proyektorRows = [
      ['Merek Proyektor', proyektor.proyektor.merekProyektor || '—'],
      ['Seri atau Model Proyektor', proyektor.proyektor.seriModelProyektor || '—'],
      ['Teknologi Proyektor', proyektor.proyektor.teknologiProyektor || '—'],
      ['Resolusi', proyektor.proyektor.resolusi || '—'],
      ['Tipe Lensa', proyektor.proyektor.tipeLensa || '—'],
      ['Merek Lensa', proyektor.proyektor.merekLensa || '—'],
      ['Nomor Seri Machine (SN Machine)', proyektor.proyektor.snMachine || '—'],
      ['Tipe Lampu atau Laser', proyektor.proyektor.tipeLampuLaser || '—'],
      ['Merek Lampu', proyektor.proyektor.merekLampu || '—'],
      ['Tipe Lampu', proyektor.proyektor.tipeLampu || '—'],
      ['Keterangan Tambahan', proyektor.proyektor.keteranganTambahan || '—']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Nama Spesifikasi Proyektor', 'Detail']],
      body: proyektorRows,
      theme: 'grid',
      headStyles: {
        fillColor: [8, 47, 73],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: contentWidth - 60 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Table B: Spesifikasi Server dan Sistem
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('B. Spesifikasi Server dan Sistem', marginX, currentY);
    currentY += 2;

    const serverRows = [
      ['Merek Server', proyektor.serverDanSistem.merekServer || '—'],
      ['Tipe Server', proyektor.serverDanSistem.tipeServer || '—'],
      ['Nomor Seri Server (SN Server)', proyektor.serverDanSistem.snServer || '—'],
      ['Jenis IMS', proyektor.serverDanSistem.jenisIms || '—'],
      ['Model IMS', proyektor.serverDanSistem.modelIms || '—'],
      ['Kapasitas Penyimpanan', proyektor.serverDanSistem.kapasitasPenyimpanan || '—'],
      ['Keterangan Tambahan', proyektor.serverDanSistem.keteranganTambahan || '—']
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Nama Spesifikasi Server & IMS', 'Detail']],
      body: serverRows,
      theme: 'grid',
      headStyles: {
        fillColor: [8, 47, 73],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: contentWidth - 60 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Check page space for Perangkat Ruang Proyektor
    if (currentY > pageHeight - 85) {
      doc.addPage();
      currentY = 20;
    }

    // Table C: Perangkat Ruang Proyektor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('C. Perangkat Ruang Proyektor', marginX, currentY);
    currentY += 2;

    const perangkatRows = [
      ['Panel Dimmer & Tipe', `${proyektor.perangkatRuangProyektor.panelDimmer || '—'} ${proyektor.perangkatRuangProyektor.tipePanelDimmer ? `(${proyektor.perangkatRuangProyektor.tipePanelDimmer})` : ''}`.trim()],
      ['PC Komunikator & Tipe', `${proyektor.perangkatRuangProyektor.pcKomunikator || '—'} ${proyektor.perangkatRuangProyektor.tipePcKomunikator ? `(${proyektor.perangkatRuangProyektor.tipePcKomunikator})` : ''}`.trim()],
      ['UPS & Merek/Tipe', `${proyektor.perangkatRuangProyektor.ups || '—'} ${proyektor.perangkatRuangProyektor.merekTipeUps ? `(${proyektor.perangkatRuangProyektor.merekTipeUps})` : ''}`.trim()],
      ['Power Supply & Tipe', `${proyektor.perangkatRuangProyektor.powerSupply || '—'} ${proyektor.perangkatRuangProyektor.tipePowerSupply ? `(${proyektor.perangkatRuangProyektor.tipePowerSupply})` : ''}`.trim()],
      ['Lampu LED & Tipe', `${proyektor.perangkatRuangProyektor.lampuLed || '—'} ${proyektor.perangkatRuangProyektor.tipeLampuLed ? `(${proyektor.perangkatRuangProyektor.tipeLampuLed})` : ''}`.trim()],
      ['Sound Ruang Proyektor', proyektor.perangkatRuangProyektor.soundRuangProyektor || '—'],
      ['Lampu LED Tangga', proyektor.perangkatRuangProyektor.lampuLedTangga || '—'],
      ['Keterangan Tambahan', proyektor.perangkatRuangProyektor.keteranganTambahan || '—']
    ];

    if (proyektor.perangkatTambahan && proyektor.perangkatTambahan.length > 0) {
      proyektor.perangkatTambahan.forEach((pt) => {
        perangkatRows.push([pt.namaPerangkat, `${pt.tipeModel || '—'} ${pt.keterangan ? `(${pt.keterangan})` : ''}`.trim()]);
      });
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Perangkat Ruang Proyektor', 'Detail']],
      body: perangkatRows,
      theme: 'grid',
      headStyles: {
        fillColor: [8, 47, 73],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: contentWidth - 60 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Catatan Tambahan (jika ada)
    if (proyektor.catatanTambahan) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('Catatan Teknis Ruang Proyektor:', marginX, currentY);
      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(proyektor.catatanTambahan, marginX, currentY, { maxWidth: contentWidth });
      currentY += 10;
    }

    // Foto Proyektor / Perangkat (D)
    if (proyektor.fotoPerangkat && proyektor.fotoPerangkat.length > 0) {
      doc.addPage();
      let fotoY = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`D. Foto Proyektor & Perangkat — ${proyektor.name} (${proyektor.fotoPerangkat.length} Foto)`, marginX, fotoY);
      fotoY += 8;

      for (let fIdx = 0; fIdx < proyektor.fotoPerangkat.length; fIdx++) {
        const foto = proyektor.fotoPerangkat[fIdx];
        if (!foto.dataUrl) continue;
        try {
          const fotoDim = await getImageDimensions(foto.dataUrl);
          if (fotoDim) {
            const maxW = contentWidth;
            const maxH = 95;
            let drawW = maxW;
            let drawH = (fotoDim.height / fotoDim.width) * drawW;
            if (drawH > maxH) {
              drawH = maxH;
              drawW = (fotoDim.width / fotoDim.height) * drawH;
            }

            if (fotoY + drawH + 15 > pageHeight - 15) {
              doc.addPage();
              fotoY = 20;
            }

            const posX = marginX + (contentWidth - drawW) / 2;
            doc.addImage(fotoDim.img, 'JPEG', posX, fotoY, drawW, drawH);
            fotoY += drawH + 3;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Foto #${fIdx + 1}: ${foto.title || 'Dokumentasi Perangkat'}`, posX, fotoY);
            fotoY += 8;
          }
        } catch (_) {}
      }
    }
  }

  // =========================================================================
  // 5. ISI DAFTAR ISI (TABLE OF CONTENTS) PADA HALAMAN 2
  // =========================================================================
  onProgress?.('Menyusun Daftar Isi...');
  doc.setPage(tocPageNumber);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('DAFTAR ISI', marginX, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Dokumen Spesifikasi Teknis Area Studio & Area Proyektor — Cinema XXI Lippo Mall Puri', marginX, 30);

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(marginX, 33, pageWidth - marginX, 33);

  const tocBody: Array<[string, string, string]> = [];
  tocEntries.forEach((entry, i) => {
    const prefix = entry.category === 'studio' ? 'Bagian I: Area Studio' : 'Bagian II: Area Proyektor';
    tocBody.push([String(i + 1), `${prefix} — ${entry.title}`, `Halaman ${entry.pageNumber}`]);
  });

  autoTable(doc, {
    startY: 38,
    margin: { left: marginX, right: marginX },
    head: [['No', 'Uraian Dokumen Teknis', 'Halaman']],
    body: tocBody,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: contentWidth - 42 },
      2: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
    }
  });

  // =========================================================================
  // 6. RUNNING HEADER & FOOTER ON ALL PAGES (EXCEPT COVER)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);

    // Running Header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('CINEMA XXI LIPPO MALL PURI — DOKUMEN SPESIFIKASI TEKNIS DIGITAL', marginX, 9);
    doc.text('AREA STUDIO & PROYEKTOR', pageWidth - marginX, 9, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, 11, pageWidth - marginX, 11);

    // Running Footer
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, marginX, pageHeight - 7);
    doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }

  // =========================================================================
  // 7. SIMPAN / DOWNLOAD PDF
  // =========================================================================
  onProgress?.('Menyelesaikan file PDF...');
  const filename = `DATA_TEKNIS_AREA_STUDIO_PROYEKTOR_XXI_LMP_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
