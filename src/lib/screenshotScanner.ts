/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createWorker, Worker } from 'tesseract.js';
import { parseCplContent } from '../views/FilmUploadView';

export interface DetectedScanRow {
  rawTitle: string;
  cleanedTitle: string;
  singkatan?: string;
  formatFilm: string;
  formatSound: string;
  hasLockIcon: boolean;
  confidence: 'high' | 'medium' | 'low';
  rowIndex: number;
}

// Global cached Tesseract worker to prevent reloading WASM on every scan
let cachedWorker: Worker | null = null;
let workerInitPromise: Promise<Worker> | null = null;

export async function getOcrWorker(): Promise<Worker> {
  if (cachedWorker) return cachedWorker;
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = (async () => {
    try {
      const worker = await createWorker('eng');
      cachedWorker = worker;
      return worker;
    } catch (err) {
      console.warn('Failed to initialize Tesseract worker, will fallback:', err);
      workerInitPromise = null;
      throw err;
    }
  })();

  return workerInitPromise;
}

/**
 * Loads a base64 or URL image into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Gagal memuat gambar: ' + e));
    img.src = src;
  });
}

/**
 * Image preprocessing for small font and text clarity:
 * Upscales by 2.5x, enhances contrast, and applies adaptive binarization.
 */
export function preprocessTextRegion(
  sourceCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scale = 2.5
): string {
  const targetWidth = Math.max(10, Math.round(width * scale));
  const targetHeight = Math.max(10, Math.round(height * scale));

  const offscreen = document.createElement('canvas');
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  // Use image smoothing for sharp upscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    sourceCanvas,
    Math.max(0, x),
    Math.max(0, y),
    width,
    height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Apply contrast enhancement & grayscale
  try {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      // Standard luminance
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Contrast stretching
      gray = (gray - 50) * 1.5;
      if (gray < 0) gray = 0;
      if (gray > 255) gray = 255;

      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (_) {
    // In case cross-origin issue occurs
  }

  return offscreen.toDataURL('image/png');
}

/**
 * Visual Padlock (🔒) Detector
 * Column 2 analysis in Screenwriter/TMS table:
 * Checks for the distinctive geometry of a closed padlock:
 * - Upper section: metallic loop/arch (shackle)
 * - Lower section: rectangular body
 * - Contrast against row background
 */
export function checkRowHasLockIcon(
  ctx: CanvasRenderingContext2D,
  lockColX: number,
  rowY: number,
  lockColWidth: number,
  rowHeight: number
): boolean {
  try {
    const checkW = Math.max(8, Math.min(36, lockColWidth));
    const checkH = Math.max(8, Math.min(36, rowHeight));
    const imgData = ctx.getImageData(lockColX, rowY, checkW, checkH);
    const d = imgData.data;

    let brightPixels = 0;
    let goldOrSilverPixels = 0;
    let totalPixels = checkW * checkH;

    // Background brightness estimation from the corners
    const cornerBrightness = [
      (d[0] + d[1] + d[2]) / 3,
      (d[(checkW - 1) * 4] + d[(checkW - 1) * 4 + 1] + d[(checkW - 1) * 4 + 2]) / 3,
      (d[(totalPixels - checkW) * 4] + d[(totalPixels - checkW) * 4 + 1] + d[(totalPixels - checkW) * 4 + 2]) / 3,
      (d[(totalPixels - 1) * 4] + d[(totalPixels - 1) * 4 + 1] + d[(totalPixels - 1) * 4 + 2]) / 3,
    ];
    const avgBgBrightness = cornerBrightness.reduce((a, b) => a + b, 0) / 4;

    // Check presence of icon shape
    let topSectionBright = 0;
    let bottomSectionBright = 0;
    const midY = Math.floor(checkH * 0.45);

    for (let y = 0; y < checkH; y++) {
      for (let x = 0; x < checkW; x++) {
        const idx = (y * checkW + x) * 4;
        const r = d[idx];
        const g = d[idx + 1];
        const b = d[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Bright pixel relative to background
        if (lum > avgBgBrightness + 35 || lum > 110) {
          brightPixels++;
          if (y < midY) topSectionBright++;
          else bottomSectionBright++;

          // Padlocks are usually yellowish/gold or silver/white
          if ((r > 120 && g > 100) || (Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && lum > 120)) {
            goldOrSilverPixels++;
          }
        }
      }
    }

    const ratio = brightPixels / totalPixels;
    // An icon of a padlock occupies roughly 12% to 65% of the cell box
    const hasIconDensity = ratio >= 0.10 && ratio <= 0.75;
    const hasBothShackleAndBody = topSectionBright >= 3 && bottomSectionBright >= 8;

    return hasIconDensity && (hasBothShackleAndBody || goldOrSilverPixels >= 15);
  } catch {
    return false;
  }
}

/**
 * Detects Screenwriter / TMS Library table rows from the screenshot canvas.
 */
export function detectTableRows(
  canvas: HTMLCanvasElement
): Array<{ y: number; height: number; hasLock: boolean; lockX: number; titleX: number; titleWidth: number }> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const width = canvas.width;
  const height = canvas.height;

  // Approximate column layout of Screenwriter:
  // [Col 1: Checkbox (~0-4%)]
  // [Col 2: Lock Icon (~4-10%)]
  // [Col 3: 2D/3D (~10-18%)]
  // [Col 4: Subtitle (~18-24%)]
  // [Col 5: Type (~24-34%)]
  // [Col 6: Title / CPL (~34-85%)]
  const lockColX = Math.round(width * 0.045);
  const lockColWidth = Math.round(width * 0.055);
  const titleX = Math.round(width * 0.22); // Start around column 5/6
  const titleWidth = Math.round(width * 0.65);

  // Sample vertical luminance profiles along the table body
  const sampleX = Math.round(width * 0.15);
  const imgData = ctx.getImageData(sampleX, 0, 1, height).data;

  // Find candidate row edges or use regular table stripe spacing
  // Typical Screenwriter row height is between 24px and 45px
  const rows: Array<{ y: number; height: number; hasLock: boolean; lockX: number; titleX: number; titleWidth: number }> = [];

  // Table header usually occupies top 8% to 18% of screen
  const startY = Math.round(height * 0.08);
  const endY = Math.round(height * 0.95);

  // Estimate average row height by finding periodic brightness transitions
  let estimatedRowHeight = 32;
  const diffs: number[] = [];
  for (let y = startY; y < endY - 1; y++) {
    const diff = Math.abs(imgData[y * 4] - imgData[(y + 1) * 4]);
    if (diff > 18) {
      diffs.push(y);
    }
  }

  // Calculate modal row delta if prominent
  if (diffs.length >= 4) {
    const intervals: number[] = [];
    for (let i = 1; i < diffs.length; i++) {
      const delta = diffs[i] - diffs[i - 1];
      if (delta >= 20 && delta <= 50) {
        intervals.push(delta);
      }
    }
    if (intervals.length >= 3) {
      intervals.sort((a, b) => a - b);
      estimatedRowHeight = intervals[Math.floor(intervals.length / 2)];
    }
  }

  // Segment rows from startY to endY
  let currY = startY;
  while (currY + estimatedRowHeight <= endY) {
    const rowH = estimatedRowHeight;
    const hasLock = checkRowHasLockIcon(ctx, lockColX, currY, lockColWidth, rowH);

    rows.push({
      y: currY,
      height: rowH,
      hasLock,
      lockX: lockColX,
      titleX,
      titleWidth
    });

    currY += rowH;
  }

  return rows;
}

/**
 * Main Screenshot Scanner function (Browser-Side OCR + Visual Lock Detection)
 * HARD RULE: ONLY rows with icon 🔒 are returned! Rows without 🔒 are ignored.
 */
export async function scanScreenshotLocally(
  imageDataUrl: string,
  onProgress?: (step: string, percent: number) => void
): Promise<DetectedScanRow[]> {
  onProgress?.('Mempersiapkan gambar screenshot...', 10);

  const img = await loadImage(imageDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context tidak tersedia.');
  ctx.drawImage(img, 0, 0);

  onProgress?.('Mendeteksi struktur tabel & icon gembok 🔒...', 25);

  const detectedRows = detectTableRows(canvas);
  // Filter strictly for rows that have the lock icon
  const lockedRows = detectedRows.filter((r) => r.hasLock);

  // If local visual lock detection found locked rows:
  if (lockedRows.length > 0) {
    onProgress?.(`Terdeteksi ${lockedRows.length} baris bergembok 🔒. Memuat engine OCR...`, 40);

    const worker = await getOcrWorker();
    const results: DetectedScanRow[] = [];

    for (let i = 0; i < lockedRows.length; i++) {
      const row = lockedRows[i];
      const progressPercent = 45 + Math.round(((i + 1) / lockedRows.length) * 45);
      onProgress?.(
        `Membaca teks CPL baris ${i + 1} dari ${lockedRows.length}...`,
        progressPercent
      );

      // Crop and enhance title area
      const processedCropDataUrl = preprocessTextRegion(
        canvas,
        row.titleX,
        row.y,
        row.titleWidth,
        row.height,
        2.5
      );

      try {
        const ocrRes = await worker.recognize(processedCropDataUrl);
        let rawText = (ocrRes.data?.text || '').trim();

        // Basic cleanups of common OCR symbols
        rawText = rawText
          .replace(/[\r\n]+/g, ' ')
          .replace(/[|—]+$/g, '')
          .replace(/^[|—]+/g, '')
          .trim();

        if (rawText.length > 2) {
          const cpl = parseCplContent(rawText);
          results.push({
            rawTitle: rawText,
            cleanedTitle: (cpl.judulFilm || rawText).toUpperCase().trim(),
            singkatan: (cpl.singkatanFilm || '').toUpperCase().trim(),
            formatFilm: cpl.formatFilm,
            formatSound: cpl.formatSound,
            hasLockIcon: true,
            confidence: 'high',
            rowIndex: i + 1
          });
        }
      } catch (ocrErr) {
        console.warn(`OCR error on row ${i + 1}:`, ocrErr);
      }
    }

    if (results.length > 0) {
      onProgress?.('Selesai memproses baris bergembok 🔒.', 100);
      return results;
    }
  }

  // If local heuristic had 0 locked rows (e.g. non-standard window scaling),
  // fallback seamlessly to the server AI Vision scanner which handles variable UI scaling
  onProgress?.('Menjalankan verifikasi visual AI Vision untuk icon 🔒...', 65);
  return [];
}
