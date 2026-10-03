/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Polyfill Promise.try for modern pdfjs-dist compatibility
if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function (fn: any, ...args: any[]) {
    return new Promise((resolve) => resolve(fn(...args)));
  };
}

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { FormCutiData } from '../types';

// Configure pdfjs worker to use the standalone, polyfilled worker served directly from the server
if (typeof window !== 'undefined') {
  const origin = window.location.origin;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`;
}

const INDEXED_DB_NAME = 'CinemaXXICutiDB';
const DB_VERSION = 2;
const STORE_NAME = 'pdf_template';
const KEY_NAME = 'master_pdf_bytes_v2';

/**
 * Open or init IndexedDB for persistent caching of master PDF
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported'));
    }
    const request = window.indexedDB.open(INDEXED_DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if a Uint8Array or its underlying ArrayBuffer is detached or empty
 */
export function isBufferDetached(bytes: Uint8Array | null | undefined): boolean {
  if (!bytes) return true;
  if (bytes.byteLength === 0) return true;
  if (!bytes.buffer) return true;
  if (bytes.buffer.byteLength === 0) return true;
  if ('detached' in (bytes.buffer as any) && (bytes.buffer as any).detached) return true;
  return false;
}

/**
 * Safely create a completely independent copy of a Uint8Array
 * with a new underlying ArrayBuffer.
 */
export function cloneUint8Array(src: Uint8Array): Uint8Array {
  if (isBufferDetached(src)) return new Uint8Array(0);
  try {
    const copyBuffer = src.buffer.slice(
      src.byteOffset,
      src.byteOffset + src.byteLength
    );
    return new Uint8Array(copyBuffer);
  } catch {
    const copy = new Uint8Array(src.byteLength);
    copy.set(src);
    return copy;
  }
}

// In-memory cache for master template PDF to prevent repeated network/disk reads
let memoryPdfCache: Uint8Array | null = null;

/**
 * Save master PDF bytes into IndexedDB
 */
export async function saveMasterPdfToIndexedDB(bytes: Uint8Array): Promise<void> {
  if (isBufferDetached(bytes) || bytes.byteLength < 100) return;
  try {
    memoryPdfCache = cloneUint8Array(bytes);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(cloneUint8Array(bytes), KEY_NAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save PDF to IndexedDB:', err);
  }
}

/**
 * Load master PDF bytes from IndexedDB
 */
export async function loadMasterPdfFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);
      req.onsuccess = () => {
        let resultBytes: Uint8Array | null = null;
        if (req.result instanceof Uint8Array) {
          resultBytes = req.result;
        } else if (req.result instanceof ArrayBuffer) {
          resultBytes = new Uint8Array(req.result);
        }
        if (resultBytes && !isBufferDetached(resultBytes) && resultBytes.byteLength >= 2000) {
          memoryPdfCache = cloneUint8Array(resultBytes);
          resolve(cloneUint8Array(resultBytes));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Fetch master PDF from server (/Form Cuti master pdf.pdf)
 */
export async function fetchMasterPdfFromServer(): Promise<Uint8Array | null> {
  try {
    // Try multiple possible paths with cache-busting to ensure fresh regular font master PDF
    const candidatePaths = [
      `/Form Cuti master pdf.pdf?v=reg-${Date.now()}`,
      '/Form Cuti master pdf.pdf',
      encodeURI('/Form Cuti master pdf.pdf'),
      '/templates/Form Cuti master pdf.pdf'
    ];

    for (const url of candidatePaths) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (buf && buf.byteLength >= 2000) {
            const bytes = new Uint8Array(buf);
            memoryPdfCache = cloneUint8Array(bytes);
            await saveMasterPdfToIndexedDB(cloneUint8Array(bytes));
            return cloneUint8Array(bytes);
          }
        }
      } catch {}
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resilient master template retriever: checks memory cache -> Server fetch -> IndexedDB
 * Always returns a detached-safe cloned copy.
 */
export async function getOrLoadMasterPdfBytes(): Promise<Uint8Array | null> {
  if (memoryPdfCache && !isBufferDetached(memoryPdfCache) && memoryPdfCache.byteLength >= 2000) {
    return cloneUint8Array(memoryPdfCache);
  }
  // Try fetching authentic file from server first
  let bytes = await fetchMasterPdfFromServer();
  if (!bytes || isBufferDetached(bytes) || bytes.byteLength < 2000) {
    bytes = await loadMasterPdfFromIndexedDB();
  }
  if (bytes && !isBufferDetached(bytes) && bytes.byteLength >= 2000) {
    memoryPdfCache = cloneUint8Array(bytes);
    return cloneUint8Array(bytes);
  }
  return null;
}

/**
 * Upload master PDF file to backend so it's stored permanently in public/
 */
export async function uploadMasterPdfToServer(bytes: Uint8Array): Promise<boolean> {
  try {
    if (isBufferDetached(bytes) || bytes.byteLength < 100) return false;
    memoryPdfCache = cloneUint8Array(bytes);

    // Convert to binary string chunked to avoid stack overflow
    let binary = '';
    const len = bytes.byteLength;
    const chunk = 8192;
    for (let i = 0; i < len; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, len)));
    }
    const base64 = btoa(binary);

    const res = await fetch('/api/template-pdf/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: `data:application/pdf;base64,${base64}` })
    });

    return res.ok;
  } catch (err) {
    console.warn('Failed to upload template PDF to server:', err);
    return false;
  }
}

/**
 * Render PDF page directly to an HTML Canvas using pdfjs-dist.
 * Guarantees that ArrayBuffers transferred by PDF.js worker never detach caller buffers.
 * Completely prevents "Cannot use the same canvas during multiple render() operations"
 * by sequencing render tasks and awaiting cancellations before starting a new render.
 */
export async function renderPdfToCanvas(
  pdfBytes: Uint8Array | null | undefined,
  canvas: HTMLCanvasElement,
  scale = 2.0
): Promise<{ width: number; height: number; freshBytes?: Uint8Array; cancelled?: boolean }> {
  let validBytes: Uint8Array | null = null;
  let reloaded = false;

  if (pdfBytes && !isBufferDetached(pdfBytes) && pdfBytes.byteLength > 100) {
    validBytes = pdfBytes;
  } else {
    // Attempt automatic reload if passed buffer was detached or empty
    const fresh = await getOrLoadMasterPdfBytes();
    if (fresh && !isBufferDetached(fresh) && fresh.byteLength > 100) {
      validBytes = fresh;
      reloaded = true;
    }
  }

  if (!validBytes || isBufferDetached(validBytes) || validBytes.byteLength < 100) {
    throw new Error('Master PDF bytes buffer is invalid or detached.');
  }

  // Assign unique session ID to this canvas to detect superseded render operations
  const currentSessionId = ((canvas as any)._renderSessionId || 0) + 1;
  (canvas as any)._renderSessionId = currentSessionId;

  // If there's an ongoing session on this canvas, cancel it AND wait for its cleanup
  const prevSession = (canvas as any)._activePdfSession;
  if (prevSession) {
    try {
      if (prevSession.renderTask) {
        prevSession.renderTask.cancel();
      }
      if (prevSession.loadingTask) {
        try { prevSession.loadingTask.destroy(); } catch (_) {}
      }
      if (prevSession.promise) {
        await prevSession.promise.catch(() => {});
      }
    } catch (_) {}
  }

  // Also check direct task ref if any
  if ((canvas as any)._currentPdfRenderTask) {
    try {
      const task = (canvas as any)._currentPdfRenderTask;
      task.cancel();
      if (task.promise) {
        await task.promise.catch(() => {});
      }
    } catch (_) {}
    (canvas as any)._currentPdfRenderTask = null;
  }

  // Check if a newer render request arrived while waiting for cancellation
  if ((canvas as any)._renderSessionId !== currentSessionId) {
    return { width: canvas.width, height: canvas.height, cancelled: true };
  }

  const session: {
    id: number;
    renderTask: any;
    loadingTask: any;
    promise: Promise<any> | null;
  } = {
    id: currentSessionId,
    renderTask: null,
    loadingTask: null,
    promise: null
  };
  (canvas as any)._activePdfSession = session;

  // CRITICAL FIX:
  // PDF.js worker passes the underlying ArrayBuffer in postMessage's transfer list,
  // which detaches that ArrayBuffer on the main thread.
  // We ALWAYS pass an isolated clone of the ArrayBuffer so validBytes remains 100% intact!
  const isolatedBuffer = validBytes.buffer.slice(
    validBytes.byteOffset,
    validBytes.byteOffset + validBytes.byteLength
  );
  const workerSafeData = new Uint8Array(isolatedBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: workerSafeData,
    cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
    cMapPacked: true
  });
  session.loadingTask = loadingTask;

  try {
    const pdfDoc = await loadingTask.promise;

    if ((canvas as any)._renderSessionId !== currentSessionId) {
      try { pdfDoc.cleanup(); } catch (_) {}
      return { width: canvas.width, height: canvas.height, cancelled: true };
    }

    const page = await pdfDoc.getPage(1);

    if ((canvas as any)._renderSessionId !== currentSessionId) {
      try { pdfDoc.cleanup(); } catch (_) {}
      return { width: canvas.width, height: canvas.height, cancelled: true };
    }

    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Explicitly paint pure solid white background so the paper is 100% opaque white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext: any = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas
    };

    const renderTask = page.render(renderContext);
    session.renderTask = renderTask;
    session.promise = renderTask.promise;
    (canvas as any)._currentPdfRenderTask = renderTask;

    await renderTask.promise;

    return {
      width: viewport.width,
      height: viewport.height,
      freshBytes: reloaded ? cloneUint8Array(validBytes) : undefined
    };
  } catch (err: any) {
    if (
      err?.name === 'RenderingCancelledException' ||
      err?.message?.includes('RenderingCancelledException') ||
      err?.message?.includes('cancelled')
    ) {
      return { width: canvas.width, height: canvas.height, cancelled: true };
    }
    if (err?.message?.includes('Cannot use the same canvas during multiple render() operations')) {
      console.warn('PDF.js canvas render conflict avoided gracefully.');
      return { width: canvas.width, height: canvas.height, cancelled: true };
    }
    if ((canvas as any)._renderSessionId !== currentSessionId) {
      return { width: canvas.width, height: canvas.height, cancelled: true };
    }
    throw err;
  } finally {
    if ((canvas as any)._activePdfSession === session) {
      (canvas as any)._activePdfSession = null;
      (canvas as any)._currentPdfRenderTask = null;
    }
  }
}

/**
 * Generate final high-fidelity vector PDF using pdf-lib by loading the authentic master PDF
 * and overlaying text/marks directly onto the page coordinates.
 */
export async function generateFinalPdfWithMasterTemplate(
  masterBytes: Uint8Array,
  data: FormCutiData,
  formatIndoDateFn: (d?: string) => string,
  options: { hideLogo?: boolean } = { hideLogo: true }
): Promise<{ blob: Blob; base64: string; fileName: string }> {
  let bytesToUse = masterBytes;
  if (isBufferDetached(bytesToUse) || bytesToUse.byteLength < 100) {
    const fresh = await getOrLoadMasterPdfBytes();
    if (!fresh || isBufferDetached(fresh)) {
      throw new Error('Master PDF bytes buffer is invalid or detached.');
    }
    bytesToUse = fresh;
  }

  // Clone buffer so pdf-lib does not mutate or detach the original
  const isolatedBytes = cloneUint8Array(bytesToUse);
  const pdfDoc = await PDFDocument.load(isolatedBytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  // 1. Cleanly mask whatever previous logo header was in the master PDF
  page.drawRectangle({
    x: 27.5,
    y: 772,
    width: 540.2,
    height: 46.5,
    color: rgb(1, 1, 1) // Pure white
  });

  // 2. Draw official Trio Header Logo (Cinema XXI • the Premiere • Cinema 21)
  // Sesuai Permintaan: pasang gambar ini di atas kertas dan tepat di atas teks formulir permohonan cuti
  try {
    let pngBytes: Uint8Array | null = null;
    if (typeof window !== 'undefined') {
      const res = await fetch('/cinema-trio-header.png?v=shifted');
      if (res.ok) {
        pngBytes = new Uint8Array(await res.arrayBuffer());
      }
    }
    if (!pngBytes && typeof process !== 'undefined' && (process as any).cwd) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const p = path.join(process.cwd(), 'public', 'cinema-trio-header.png');
        if (fs.existsSync(p)) {
          pngBytes = new Uint8Array(fs.readFileSync(p));
        }
      } catch (_) {}
    }

    if (pngBytes && pngBytes.byteLength > 100) {
      const embeddedLogo = await pdfDoc.embedPng(pngBytes);
      // Scaled & shifted: Cinema XXI shifted left, Cinema 21 shifted right
      const drawW = 490;
      const drawH = (180 / 2400) * drawW; // ~36.75 pt
      const drawX = (width - drawW) / 2; // ~52.64 pt
      const drawY = 776; // directly above title at y = 758

      page.drawImage(embeddedLogo, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH
      });
    }
  } catch (err) {
    console.warn('Could not embed cinema trio header logo into PDF:', err);
  }

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawTxt = (
    text: string,
    x: number,
    y: number,
    size = 9,
    bold = false,
    color = rgb(0, 0, 0)
  ) => {
    if (!text) return;
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? fontBold : fontRegular,
      color
    });
  };

  const drawCenteredTxt = (
    text: string,
    centerX: number,
    y: number,
    size = 9,
    bold = false
  ) => {
    if (!text) return;
    const f = bold ? fontBold : fontRegular;
    const textWidth = f.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: centerX - textWidth / 2,
      y,
      size,
      font: f,
      color: rgb(0, 0, 0)
    });
  };

  // Section I: DATA PEGAWAI (Judul bagian menggunakan font normal / regular)
  page.drawRectangle({
    x: 41,
    y: 728,
    width: 120,
    height: 12,
    color: rgb(1, 1, 1)
  });
  page.drawText('I. DATA PEGAWAI', {
    x: 42,
    y: 730,
    size: 9,
    font: fontRegular,
    color: rgb(0, 0, 0)
  });

  drawTxt(data.nama || '', 125, 715, 8.5, false);
  drawTxt(data.nik || '', 410, 715, 8.5, false);
  drawTxt(data.divisi || '', 125, 701, 8.5, false);
  drawTxt(data.noHp || '', 410, 701, 8.5, false);
  drawTxt(data.jabatan || '', 125, 687, 8.5, false);

  // Section II: RENCANA CUTI
  if (data.tanggalMulai) {
    const tglMulai = formatIndoDateFn(data.tanggalMulai);
    const tglSelesai = formatIndoDateFn(data.tanggalSelesai);
    const rencanaStr = `${tglMulai} s/d ${tglSelesai} ( ${data.jumlahHari || 0} Hari Cuti )`;
    drawTxt(rencanaStr, 135, 668, 9, false);
  }

  // Section III: BEKERJA KEMBALI
  if (data.tanggalKembali) {
    const kembaliStr = `Tanggal ${formatIndoDateFn(data.tanggalKembali)}`;
    drawTxt(kembaliStr, 155, 648, 9, false);
  }

  // Section IV: JENIS CUTI YANG DIAMBIL (Marks in checkbox squares)
  const drawCheck = (x: number, y: number) => {
    // Draw clean vector checkmark lines (immune to WinAnsi unicode encoding errors)
    page.drawLine({
      start: { x: x + 1.5, y: y + 3.5 },
      end: { x: x + 3.5, y: y + 1 },
      color: rgb(0, 0, 0),
      thickness: 1.5
    });
    page.drawLine({
      start: { x: x + 3.5, y: y + 1 },
      end: { x: x + 7.5, y: y + 7.5 },
      color: rgb(0, 0, 0),
      thickness: 1.5
    });
  };

  switch (data.jenisCuti) {
    case 'Cuti Tahunan':
      drawCheck(56, 609);
      break;
    case 'Menikah':
      drawCheck(56, 589);
      break;
    case 'Menikahkan Anak':
      drawCheck(56, 569);
      break;
    case 'Khitanan Anak':
      drawCheck(56, 549);
      break;
    case 'Baptisan Anak':
      drawCheck(196, 609);
      break;
    case 'Istri Melahirkan / Keguguran':
    case 'Istri Melahirkan/Keguguran':
      drawCheck(196, 589);
      break;
    case 'Suami/Istri, Orangtua/Mertua atau Menantu Meninggal':
      drawCheck(196, 569);
      break;
    case 'Anggota keluarga dalam 1 rumah meninggal dunia':
      drawCheck(421, 609);
      break;
  }

  // Section V: ALASAN CUTI (Judul bagian menggunakan font normal / regular)
  page.drawRectangle({
    x: 41,
    y: 519,
    width: 100,
    height: 12,
    color: rgb(1, 1, 1)
  });
  page.drawText('V. ALASAN CUTI', {
    x: 42,
    y: 521,
    size: 9,
    font: fontRegular,
    color: rgb(0, 0, 0)
  });

  if (data.alasanCuti) {
    const words = data.alasanCuti.split(' ');
    let currentLine = '';
    let lineY = 502;
    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      if (fontRegular.widthOfTextAtSize(testLine, 9) > 500) {
        drawTxt(currentLine, 45, lineY, 8.5, false);
        currentLine = w;
        lineY -= 13;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      drawTxt(currentLine, 45, lineY, 8.5, false);
    }
  }

  // Section VI: PEJABAT PENGGANTI SELAMA CUTI (Judul bagian menggunakan font normal / regular, huruf kapital semua)
  page.drawRectangle({
    x: 41,
    y: 442,
    width: 250,
    height: 14,
    color: rgb(1, 1, 1)
  });
  page.drawText('VI. PEJABAT PENGGANTI SELAMA CUTI', {
    x: 42,
    y: 444,
    size: 9,
    font: fontRegular,
    color: rgb(0, 0, 0)
  });

  // Teks nilai isian dimulai rapi setelah garis pembatas masing-masing
  drawTxt(data.penggantiNama || '', 100, 427, 8.5, false);
  drawTxt(data.penggantiNoHp || '', 440, 427, 8.5, false);

  // Section VII: PARAF / PERSETUJUAN (Signatures)
  // Column 1: Diajukan Oleh (Center ~115)
  drawCenteredTxt(data.diajukanOlehNama || '', 115, 350, 9, false);
  drawCenteredTxt(data.diajukanOlehJabatan || '', 115, 332, 8.5, false);

  // Column 2: Disetujui Oleh (Center ~297)
  drawCenteredTxt(data.disetujuiOlehNama || '', 297, 350, 9, false);
  drawCenteredTxt(data.disetujuiOlehJabatan || '', 297, 332, 8.5, false);

  // Column 3: Mengetahui (Center ~480)
  drawCenteredTxt(data.mengetahuiNama || '', 480, 350, 9, false);
  drawCenteredTxt(data.mengetahuiJabatan || '', 480, 332, 8.5, false);

  // Section VIII: DIISI OLEH HUMAN CAPITAL
  // Requirement 3: Logic Titik-Titik Pada Kolom Isian
  // Jika kolom belum diisi, titik-titik master PDF tetap terlihat utuh.
  // Jika kolom sudah diisi, titik-titik ditutup rapi dengan latar putih lalu dicetak nilainya.
  if (data.hcHakCutiHari && String(data.hcHakCutiHari).trim() !== '') {
    page.drawRectangle({
      x: 204,
      y: 227,
      width: 65,
      height: 12,
      color: rgb(1, 1, 1)
    });
    drawTxt(`${data.hcHakCutiHari} Hari`, 205, 230, 8.5, false);
  }

  if (data.hcCutiTelahDiambil && String(data.hcCutiTelahDiambil).trim() !== '') {
    page.drawRectangle({
      x: 204,
      y: 211,
      width: 65,
      height: 12,
      color: rgb(1, 1, 1)
    });
    drawTxt(`${data.hcCutiTelahDiambil} Hari`, 205, 214, 8.5, false);
  }

  if (data.hcIzin && String(data.hcIzin).trim() !== '') {
    page.drawRectangle({
      x: 204,
      y: 195,
      width: 65,
      height: 12,
      color: rgb(1, 1, 1)
    });
    drawTxt(`${data.hcIzin} Hari`, 205, 198, 8.5, false);
  }

  if (data.hcAlpa && String(data.hcAlpa).trim() !== '') {
    page.drawRectangle({
      x: 204,
      y: 179,
      width: 65,
      height: 12,
      color: rgb(1, 1, 1)
    });
    drawTxt(`${data.hcAlpa} Hari`, 205, 182, 8.5, false);
  }

  if (data.hcSakit && String(data.hcSakit).trim() !== '') {
    page.drawRectangle({
      x: 204,
      y: 163,
      width: 65,
      height: 12,
      color: rgb(1, 1, 1)
    });
    drawTxt(`${data.hcSakit} Hari`, 205, 166, 8.5, false);
  }

  if (data.hcSisaCuti && String(data.hcSisaCuti).trim() !== '') {
    page.drawRectangle({
      x: 204,
      y: 147,
      width: 65,
      height: 12,
      color: rgb(1, 1, 1)
    });
    drawTxt(`${data.hcSisaCuti} Hari`, 205, 150, 8.5, false);
  }

  // Requirement 2.B: Bagian Hasil Verifikasi Data Cuti Karyawan
  // Format teks presisi:
  // - Hanya kata "Dapat" yang dicetak tebal (bold) pada pilihan pertama
  // - Hanya kata "Tidak Dapat" yang dicetak tebal (bold) pada pilihan kedua
  // - Kata "Permohonan Cuti" dan "Diproses" menggunakan ketebalan normal
  page.drawRectangle({
    x: 70,
    y: 108,
    width: 250,
    height: 13,
    color: rgb(1, 1, 1)
  });
  page.drawRectangle({
    x: 70,
    y: 90,
    width: 250,
    height: 13,
    color: rgb(1, 1, 1)
  });

  const wPrefix = fontRegular.widthOfTextAtSize('Permohonan Cuti ', 8.5);
  const wDapat = fontBold.widthOfTextAtSize('Dapat', 8.5);
  page.drawText('Permohonan Cuti ', { x: 71, y: 111, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
  page.drawText('Dapat', { x: 71 + wPrefix, y: 111, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText(' Diproses', { x: 71 + wPrefix + wDapat, y: 111, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });

  const wTidakDapat = fontBold.widthOfTextAtSize('Tidak Dapat', 8.5);
  page.drawText('Permohonan Cuti ', { x: 71, y: 93, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
  page.drawText('Tidak Dapat', { x: 71 + wPrefix, y: 93, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText(' Diproses', { x: 71 + wPrefix + wTidakDapat, y: 93, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });

  // Verifikasi checklist mark (x) presisi di dalam kotak checklist
  if (data.hcStatusVerifikasi === 'Dapat Diproses') {
    drawTxt('x', 60, 111, 9, true);
  } else if (data.hcStatusVerifikasi === 'Tidak Dapat Diproses') {
    drawTxt('x', 60, 93, 9, true);
  }

  // HC Database Paraf (masking titik-titik jika nama paraf diisi)
  if (data.hcParafNama && String(data.hcParafNama).trim() !== '') {
    page.drawRectangle({
      x: 418,
      y: 32,
      width: 130,
      height: 14,
      color: rgb(1, 1, 1)
    });
    drawCenteredTxt(`( ${data.hcParafNama} )`, 480, 35, 8.5, false);
  }

  const finalBytes = await pdfDoc.save();
  const blob = new Blob([finalBytes], { type: 'application/pdf' });

  // Convert to datauristring
  let binary = '';
  const len = finalBytes.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    binary += String.fromCharCode(...finalBytes.subarray(i, Math.min(i + chunk, len)));
  }
  const base64 = `data:application/pdf;base64,${btoa(binary)}`;

  const safeNama = (data.nama || 'Pegawai').trim().replace(/[/\\?%*:|"<>]/g, '-');
  const safeDate = (data.tanggalMulai || new Date().toISOString().split('T')[0]).trim();
  const fileName = `Form Cuti_${safeNama}_${safeDate}.pdf`;

  return { blob, base64, fileName };
}
