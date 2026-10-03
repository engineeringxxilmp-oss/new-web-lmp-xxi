/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudioProyektorItem } from '../types/studioProyektor';

export type ExportPdfScope =
  | { type: 'all' }
  | { type: 'all-studios' }
  | { type: 'all-proyektors' }
  | { type: 'single-studio'; itemId: string }
  | { type: 'single-proyektor'; itemId: string };

function getFormattedDate(): string {
  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const day = days[now.getDay()];
  const date = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}, ${date} ${month} ${year} — ${hours}:${minutes} WIB`;
}

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

export async function exportStudioProyektorDashboardToPdf(
  items: StudioProyektorItem[],
  scope: ExportPdfScope = { type: 'all' },
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Menyiapkan dokumen PDF...');

  let targetStudios: StudioProyektorItem[] = [];
  let targetProyektors: StudioProyektorItem[] = [];
  let docTitle = 'DATA TEKNIS STUDIO & PROYEKTOR';
  let fileSlug = 'STUDIO_PROYEKTOR';

  if (scope.type === 'all') {
    targetStudios = items.filter((i) => i.category === 'studio');
    targetProyektors = items.filter((i) => i.category === 'proyektor');
    docTitle = 'DATA TEKNIS STUDIO & PROYEKTOR';
    fileSlug = 'SEMUA_STUDIO_DAN_PROYEKTOR';
  } else if (scope.type === 'all-studios') {
    targetStudios = items.filter((i) => i.category === 'studio');
    docTitle = 'DATA TEKNIS SELURUH AREA STUDIO';
    fileSlug = 'SEMUA_STUDIO';
  } else if (scope.type === 'all-proyektors') {
    targetProyektors = items.filter((i) => i.category === 'proyektor');
    docTitle = 'DATA TEKNIS SELURUH AREA PROYEKTOR';
    fileSlug = 'SEMUA_PROYEKTOR';
  } else if (scope.type === 'single-studio') {
    const s = items.find((i) => i.id === scope.itemId);
    if (s) {
      targetStudios = [s];
      docTitle = `DATA TEKNIS ${s.name.toUpperCase()}`;
      fileSlug = s.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    }
  } else if (scope.type === 'single-proyektor') {
    const p = items.find((i) => i.id === scope.itemId);
    if (p) {
      targetProyektors = [p];
      docTitle = `DATA TEKNIS ${p.name.toUpperCase()}`;
      fileSlug = p.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    }
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // =========================================================================
  // 1. HALAMAN SAMPUL (COVER)
  // =========================================================================
  onProgress?.('Membuat Sampul Dokumen...');

  // Top header bar
  doc.setFillColor(7, 15, 38);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(217, 119, 6); // gold
  doc.rect(0, 28, pageWidth, 3, 'F');

  // Try logo
  try {
    const logoImg = await getImageDimensions('/cinema-xxi.png');
    if (logoImg) {
      const targetW = 60;
      const targetH = (logoImg.height / logoImg.width) * targetW;
      doc.addImage(logoImg.img, 'PNG', (pageWidth - targetW) / 2, 50, targetW, targetH);
    }
  } catch (_) {}

  // Main Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, pageWidth / 2, 98, { align: 'center', maxWidth: contentWidth - 20 });

  doc.setFontSize(15);
  doc.setTextColor(180, 83, 9);
  doc.text('CINEMA XXI LIPPO MALL PURI', pageWidth / 2, 108, { align: 'center' });

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.line(marginX + 20, 116, pageWidth - marginX - 20, 116);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('Engineering Management System — Technical Equipment Reference Book', pageWidth / 2, 124, { align: 'center' });

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX + 15, 145, contentWidth - 30, 48, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('INFORMASI REKAPITULASI DOKUMEN', marginX + 22, 157);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Unit Kerja       : Engineering & Projectionist Cinema XXI Lippo Mall Puri`, marginX + 22, 166);
  if (targetStudios.length > 0) {
    doc.text(`• Daftar Studio   : ${targetStudios.length} Ruang Studio`, marginX + 22, 173);
  }
  if (targetProyektors.length > 0) {
    doc.text(`• Daftar Proyektor: ${targetProyektors.length} Ruang Proyektor`, marginX + 22, 180);
  }
  doc.text(`• Tanggal Ekspor : ${getFormattedDate()}`, marginX + 22, 187);

  // Footer cover
  doc.setFillColor(7, 15, 38);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('CINEMA XXI LIPPO MALL PURI — ENGINEERING DEPARTMENT', pageWidth / 2, pageHeight - 9, { align: 'center' });

  // =========================================================================
  // 2. BAGIAN I — AREA STUDIO (Jika ada dalam scope)
  // =========================================================================
  for (let idx = 0; idx < targetStudios.length; idx++) {
    const studio = targetStudios[idx];
    onProgress?.(`Memproses Studio: ${studio.name} (${idx + 1}/${targetStudios.length})...`);

    doc.addPage();
    let currentY = 16;

    // Header Studio
    doc.setFillColor(7, 15, 38);
    doc.roundedRect(marginX, currentY, contentWidth, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(251, 191, 36); // gold
    doc.text('AREA STUDIO', marginX + 6, currentY + 5.5);

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(studio.name.toUpperCase(), marginX + 6, currentY + 11);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`CINEMA XXI LIPPO MALL PURI`, pageWidth - marginX - 6, currentY + 9, { align: 'right' });
    currentY += 19;

    // Optional Image
    if (studio.image?.dataUrl) {
      try {
        const dim = await getImageDimensions(studio.image.dataUrl);
        if (dim) {
          const maxW = contentWidth;
          const maxH = 65;
          let drawW = maxW;
          let drawH = (dim.height / dim.width) * drawW;
          if (drawH > maxH) {
            drawH = maxH;
            drawW = (dim.width / dim.height) * drawH;
          }
          const posX = marginX + (contentWidth - drawW) / 2;
          doc.addImage(dim.img, 'JPEG', posX, currentY, drawW, drawH);
          currentY += drawH + 2;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Gambar: ${studio.image.name || 'Dokumentasi / Denah Studio'}`, posX, currentY);
          currentY += 6;
        }
      } catch (_) {}
    }

    // Equipment Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Daftar Equipment & Spesifikasi (${studio.equipments.length} Equipment)`, marginX, currentY);
    currentY += 2;

    if (studio.equipments.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Belum ada equipment yang ditambahkan pada studio ini.', marginX, currentY + 5);
      currentY += 12;
    } else {
      const tableRows = studio.equipments.map((eq, i) => [
        String(i + 1),
        eq.nama || '—',
        eq.merek || '—',
        eq.tipeModel || '—',
        eq.nomorSeri || '—',
        eq.spesifikasi || '—',
        eq.keterangan || '—'
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [['No', 'Nama Equipment', 'Merek', 'Tipe / Model', 'Nomor Seri (SN)', 'Spesifikasi', 'Keterangan']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { cellWidth: 24 },
          3: { cellWidth: 26 },
          4: { cellWidth: 26 },
          5: { cellWidth: 36 },
          6: { cellWidth: 30 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Catatan tambahan
    if (studio.catatan?.trim()) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Catatan Tambahan:', marginX, currentY);
      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(studio.catatan, marginX, currentY, { maxWidth: contentWidth });
      currentY += 8;
    }
  }

  // =========================================================================
  // 3. BAGIAN II — AREA PROYEKTOR (Jika ada dalam scope)
  // =========================================================================
  for (let idx = 0; idx < targetProyektors.length; idx++) {
    const proyektor = targetProyektors[idx];
    onProgress?.(`Memproses Proyektor: ${proyektor.name} (${idx + 1}/${targetProyektors.length})...`);

    doc.addPage();
    let currentY = 16;

    // Header Proyektor
    doc.setFillColor(8, 47, 73); // deep cyan/blue
    doc.roundedRect(marginX, currentY, contentWidth, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(56, 189, 248); // sky
    doc.text('AREA PROYEKTOR', marginX + 6, currentY + 5.5);

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(proyektor.name.toUpperCase(), marginX + 6, currentY + 11);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`CINEMA XXI LIPPO MALL PURI`, pageWidth - marginX - 6, currentY + 9, { align: 'right' });
    currentY += 19;

    // Optional Image
    if (proyektor.image?.dataUrl) {
      try {
        const dim = await getImageDimensions(proyektor.image.dataUrl);
        if (dim) {
          const maxW = contentWidth;
          const maxH = 65;
          let drawW = maxW;
          let drawH = (dim.height / dim.width) * drawW;
          if (drawH > maxH) {
            drawH = maxH;
            drawW = (dim.width / dim.height) * drawH;
          }
          const posX = marginX + (contentWidth - drawW) / 2;
          doc.addImage(dim.img, 'JPEG', posX, currentY, drawW, drawH);
          currentY += drawH + 2;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Gambar: ${proyektor.image.name || 'Dokumentasi Ruang Proyektor'}`, posX, currentY);
          currentY += 6;
        }
      } catch (_) {}
    }

    // Equipment Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Daftar Equipment & Spesifikasi (${proyektor.equipments.length} Equipment)`, marginX, currentY);
    currentY += 2;

    if (proyektor.equipments.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Belum ada equipment yang ditambahkan pada ruang proyektor ini.', marginX, currentY + 5);
      currentY += 12;
    } else {
      const tableRows = proyektor.equipments.map((eq, i) => [
        String(i + 1),
        eq.nama || '—',
        eq.merek || '—',
        eq.tipeModel || '—',
        eq.nomorSeri || '—',
        eq.spesifikasi || '—',
        eq.keterangan || '—'
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [['No', 'Nama Equipment', 'Merek', 'Tipe / Model', 'Nomor Seri (SN)', 'Spesifikasi', 'Keterangan']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [8, 47, 73],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { cellWidth: 24 },
          3: { cellWidth: 26 },
          4: { cellWidth: 26 },
          5: { cellWidth: 36 },
          6: { cellWidth: 30 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Catatan tambahan
    if (proyektor.catatan?.trim()) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Catatan Tambahan:', marginX, currentY);
      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(proyektor.catatan, marginX, currentY, { maxWidth: contentWidth });
      currentY += 8;
    }
  }

  // =========================================================================
  // 4. RUNNING HEADER & FOOTER ON ALL CONTENT PAGES
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);

    // Running Header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('CINEMA XXI LIPPO MALL PURI — DOKUMEN TEKNIS STUDIO & PROYEKTOR', marginX, 9);
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

  // Save / download
  onProgress?.('Menyelesaikan file PDF...');
  const filename = `DATA_TEKNIS_XXI_LMP_${fileSlug}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
