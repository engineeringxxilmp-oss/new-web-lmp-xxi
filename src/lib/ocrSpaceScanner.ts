/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilmUpload } from '../types';
import {
  SmartGroupedFilm,
  ScannedVariant,
  VisualLock,
  detectVisualLocks,
  analyzeRowLockVisual,
  RowLockAnalysisResult,
  extractRawContentName,
  extractTechnicalSpecs,
  extractTitleStem,
  extractContentFamilyKey,
  normalizeContentIdentity,
  isDisallowedCandidateTitle,
  isPlaceholderLockName,
  isUiArtifactOrForbiddenText,
  isNonFilmContent,
  matchToMasterFilm,
  loadImage
} from './smartFilmScanner';
import { getOcrWorker } from './screenshotScanner';

export interface OcrSpaceWord {
  WordText: string;
  Left: number;
  Top: number;
  Height: number;
  Width: number;
}

export interface OcrSpaceLine {
  Words: OcrSpaceWord[];
  MaxHeight: number;
  MinTop: number;
}

export interface OcrSpaceParsedResult {
  TextOverlay?: {
    Lines: OcrSpaceLine[];
    HasOverlay: boolean;
  };
  ParsedText: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

export interface OcrSpaceApiResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string | null;
}

export interface DebugRowInfo {
  rowNumber: number;
  screenshotIndex: number;
  hasLock: boolean;
  lockStatus?: 'LOCK' | 'REVIEW_LOCK' | 'NO_LOCK';
  lockConfidence?: number;
  lockCropUrl?: string;
  hasCheckbox?: boolean;
  lockX?: number;
  lockY?: number;
  ocrText: string;
  ocrConfidence?: number;
  boundingBox?: { top: number; left: number; width: number; height: number };
  contentRoi?: { x: number; y: number; width: number; height: number };
  masterFilmMatch?: string | null;
  matchingConfidence: 'high' | 'medium' | 'low' | 'none';
  status: 'MATCHED' | 'PERLU DICOCOKKAN' | 'REVIEW LOCK' | 'IGNORED — NO LOCK' | 'IGNORED — NON-FILM';
  reason?: string;
  // Requirement 9: Debug wajib asal sumber OCR dan koordinat
  ocrSource?: string; // 'ORIGINAL UPLOADED IMAGE'
  rowY?: number;
  lockRoi?: { x: number; y: number; width: number; height: number };
  selectedOcrText?: string;
}

export interface ScanStats {
  totalRowCount: number;
  lockDetectedCount: number;
  lockReviewCount: number;
  ignoredNoLockCount: number;
  ocrContentReadCount: number;
  matchedMasterCount: number;
  needsMatchCount: number;
  ignoredNonFilmCount: number;
  rawCandidateCount?: number;
  uniqueFilmCount?: number;
  duplicateMergedCount?: number;
  // Requirement 9: Internal debug dimensions
  ocrSource?: string; // 'ORIGINAL UPLOADED IMAGE'
  originalImageWidth?: number;
  originalImageHeight?: number;
  ocrImageWidth?: number;
  ocrImageHeight?: number;
}

export interface OcrSpaceScanResult {
  films: SmartGroupedFilm[];
  excludedCount: number;
  stats: ScanStats;
  debugRows: DebugRowInfo[];
  detectedLocksByScreenshot?: Record<number, VisualLock[]>;
  rawOcrResponse?: any;
}

/**
 * Normalized OCR Word with absolute canvas coordinates
 */
interface NormalizedWord {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerY: number;
}

/**
 * Table Row grouping all words horizontally aligned on the same table line
 */
interface GroupedTableRow {
  words: NormalizedWord[];
  top: number;
  bottom: number;
  height: number;
  centerY: number;
  minLeft: number;
  maxRight: number;
  hasLock: boolean;
  lockStatus?: 'LOCK' | 'REVIEW_LOCK' | 'NO_LOCK';
  lockConfidence?: number;
  lockCropUrl?: string;
  lockX?: number;
  lockY?: number;
  hasCheckbox?: boolean;
  lockAnalysis?: RowLockAnalysisResult;
  lock?: VisualLock;
}

/**
 * Preprocesses screenshot image for optimal OCR.space recognition:
 * - Upscales 1.5x with smoothing if image is smaller than Full HD
 * - Rebalances dark theme polarity (dark-mode inverted to dark text on light background)
 * - Enhances contrast so CPL strings and small font metadata are preserved
 */
export function preprocessForOcrSpace(
  sourceCanvas: HTMLCanvasElement
): { dataUrl: string; scale: number } {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Compute adaptive scale factor: up to 1.5x if below 1600px wide
  const scale = width < 1600 ? 1.5 : 1.0;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const offscreen = document.createElement('canvas');
  offscreen.width = targetW;
  offscreen.height = targetH;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { dataUrl: sourceCanvas.toDataURL('image/png'), scale: 1.0 };

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(sourceCanvas, 0, 0, width, height, 0, 0, targetW, targetH);

  try {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;

    // Detect if dark theme from corner samples
    let bgLumSum = 0;
    let samples = 0;
    for (let py = 0; py < targetH; py += Math.max(1, Math.floor(targetH / 10))) {
      const idx = py * targetW * 4;
      bgLumSum += 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
      samples++;
    }
    const isDarkTheme = (samples > 0 ? bgLumSum / samples : 40) < 130;

    let minLum = 255;
    let maxLum = 0;
    for (let i = 0; i < d.length; i += 4) {
      let lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (isDarkTheme) lum = 255 - lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const lumRange = Math.max(1, maxLum - minLum);

    for (let i = 0; i < d.length; i += 4) {
      let lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (isDarkTheme) lum = 255 - lum;

      let norm = ((lum - minLum) / lumRange) * 255;
      if (norm < 110) {
        norm = norm * 0.75;
      } else if (norm > 155) {
        norm = 255 - (255 - norm) * 0.5;
      }
      const val = Math.max(0, Math.min(255, Math.round(norm)));
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (_) {}

  return { dataUrl: offscreen.toDataURL('image/png'), scale };
}

/**
 * Calls backend OCR.space proxy (/api/ocr-space) with robust non-JSON protection
 */
export async function callOcrSpaceApi(
  dataUrl: string,
  onProgress?: (percent: number, stepText: string) => void
): Promise<OcrSpaceApiResponse> {
  onProgress?.(30, 'MENGIRIM SCREENSHOT KE SERVER OCR.SPACE...');

  let response: Response;
  try {
    response = await fetch('/api/ocr-space', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageBase64: dataUrl,
        language: 'eng',
        isOverlayRequired: true,
        isTable: true,
        OCREngine: '2'
      })
    });
  } catch (netErr: any) {
    throw new Error(`Koneksi ke endpoint OCR gagal: ${netErr.message || netErr}`);
  }

  // Safely read response text without assuming JSON
  const rawText = await response.text();
  let result: any = null;

  if (rawText && !rawText.trim().startsWith('<')) {
    try {
      result = JSON.parse(rawText);
    } catch {
      result = null;
    }
  }

  if (!result) {
    throw new Error(`Respons server bukan format JSON (HTTP ${response.status})`);
  }

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.error || `Gagal menghubungi service OCR.space (HTTP ${response.status})`);
  }

  return result.data as OcrSpaceApiResponse;
}

/**
 * High-reliability browser-side fallback OCR using Tesseract.js
 * Used whenever OCR.space is throttled, offline, or returns HTML.
 */
export async function runLocalTesseractFallback(
  canvas: HTMLCanvasElement,
  onProgress?: (percent: number, stepText: string) => void
): Promise<OcrSpaceApiResponse> {
  onProgress?.(45, 'MEMUAT ENGINE OCR BROWSER (TESSERACT CADANGAN)...');
  const worker = await getOcrWorker();

  onProgress?.(55, 'MEMINDAI TEKS CPL SECARA LOKAL DENGAN TESSERACT...');
  const res = await worker.recognize(canvas);

  const rawLines = (res.data as any).lines || [];
  const ocrLines: OcrSpaceLine[] = rawLines
    .map((l: any) => ({
      Words: (l.words || [])
        .map((w: any) => ({
          WordText: (w.text || '').trim(),
          Left: w.bbox?.x0 ?? 0,
          Top: w.bbox?.y0 ?? 0,
          Width: Math.max(10, (w.bbox?.x1 ?? 0) - (w.bbox?.x0 ?? 0)),
          Height: Math.max(10, (w.bbox?.y1 ?? 0) - (w.bbox?.y0 ?? 0))
        }))
        .filter((w: any) => w.WordText.length > 0),
      MaxHeight: Math.max(14, (l.bbox?.y1 ?? 0) - (l.bbox?.y0 ?? 0)),
      MinTop: l.bbox?.y0 ?? 0
    }))
    .filter((l: any) => l.Words.length > 0);

  return {
    ParsedResults: [
      {
        TextOverlay: {
          Lines: ocrLines,
          HasOverlay: ocrLines.length > 0
        },
        ParsedText: res.data.text || ''
      }
    ],
    OCRExitCode: 1,
    IsErroredOnProcessing: false
  };
}

/**
 * Helper to check whether a word is an artifact of the Language or Subtitle column
 */
function isLanguageColumnWord(wordText: string): boolean {
  const clean = wordText.trim().toUpperCase().replace(/[^A-Z-]/g, '');
  return (
    clean === 'ID' ||
    clean === 'EN' ||
    clean === 'IND' ||
    clean === 'AD' ||
    clean === 'SUB' ||
    clean === 'DUB' ||
    clean === 'ID-EN' ||
    clean === 'EN-ID' ||
    clean === 'IND-EN' ||
    clean === 'EN-IND' ||
    clean === 'FLAG'
  );
}

/**
 * Helper to check whether a word is an artifact of the Type column (Feature, Trailer, etc.)
 */
function isTypeColumnWord(wordText: string): boolean {
  const clean = wordText.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (
    clean === 'FEATURE' ||
    clean === 'FEATURE1' ||
    clean === 'FEATURE2' ||
    clean === 'TRAILER' ||
    clean === 'TEASER' ||
    clean === 'PROMO' ||
    clean === 'ADV' ||
    clean === 'POLICY' ||
    clean === 'TEST' ||
    clean === 'DCP' ||
    clean === 'FTR'
  );
}

/**
 * Helper to check whether a word is a duration string (e.g. 186:13, 03:01:14, 103min)
 */
function isDurationWord(wordText: string): boolean {
  const clean = wordText.trim();
  if (/^\d{1,3}[:.]\d{2}(?:[:.]\d{2})?$/.test(clean)) return true;
  if (/^\d{2,3}(?:min|m|s)?$/i.test(clean)) return true;
  return false;
}

/**
 * Helper to check whether a word is stray UI noise (checkbox brackets, delimiters)
 */
function isNoiseWord(wordText: string): boolean {
  const clean = wordText.trim();
  if (!clean) return true;
  if (/^[[\](){}|~_\\/•✓o\-+=]+$/.test(clean)) return true;
  if (/^[0-9]$/.test(clean)) return true;
  return false;
}

/**
 * Main OCR.space Screenshot Scanner Engine:
 * Architecture:
 * 1. OCR.SPACE -> SEMUA TEXT + KOORDINAT
 * 2. KELOMPOKKAN TEXT MENJADI ROW (Group words/lines horizontally)
 * 3. DETEKSI LOCK SECARA VISUAL PADA ROW (PADLOCK 🔒 visual check)
 * 4. HANYA ROW YANG MEMILIKI LOCK YANG DIPROSES (Primary Gate)
 * 5. AMBIL CONTENT NAME DARI ROW TERSEBUT (Isolate CPL name column)
 * 6. MATCH KE MASTER FILM (Single Source of Truth)
 * 7. HASIL SELEKSI (Deduplicate & multi-version grouping)
 */
export async function runOcrSpaceScreenshotScanner(
  screenshotDataUrls: string[],
  masterFilms: FilmUpload[],
  onProgress?: (percent: number, stepText: string) => void
): Promise<OcrSpaceScanResult> {
  if (screenshotDataUrls.length === 0) {
    return {
      films: [],
      excludedCount: 0,
      stats: {
        totalRowCount: 0,
        lockDetectedCount: 0,
        lockReviewCount: 0,
        ignoredNoLockCount: 0,
        ocrContentReadCount: 0,
        matchedMasterCount: 0,
        needsMatchCount: 0,
        ignoredNonFilmCount: 0
      },
      debugRows: []
    };
  }

  onProgress?.(5, 'MEMPERSIAPKAN SCREENSHOT UNTUK OCR.SPACE...');

  const rawCandidates: Array<{
    rawContentName: string;
    canonicalTitle: string;
    singkatan?: string;
    variantTag: string;
    formatSound: string;
    formatFilm: string;
    hasLock: boolean;
    lockStatus?: 'LOCK' | 'REVIEW_LOCK' | 'NO_LOCK';
    lockConfidence?: number;
    lockCropUrl?: string;
    hasCheckbox?: boolean;
    screenshotIndex: number;
    matchedFilm: FilmUpload | null;
    needsManual: boolean;
    confidence: 'high' | 'medium' | 'low';
  }> = [];

  const debugRows: DebugRowInfo[] = [];
  const detectedLocksByScreenshot: Record<number, VisualLock[]> = {};

  let totalTableRowCount = 0;
  let totalLockDetected = 0;
  let totalLockReview = 0;
  let totalOcrContentRead = 0;
  let totalMatchedMaster = 0;
  let totalNeedsMatch = 0;
  let totalIgnoredNoLock = 0;
  let totalIgnoredNonFilm = 0;
  let lastRawOcrResponse: any = null;
  let firstImageWidth = 0;
  let firstImageHeight = 0;

  for (let sIdx = 0; sIdx < screenshotDataUrls.length; sIdx++) {
    const sUrl = screenshotDataUrls[sIdx];
    const sNumber = sIdx + 1;

    onProgress?.(
      15 + Math.round((sIdx / screenshotDataUrls.length) * 20),
      `DETEKSI VISUAL 🔒 (Screenshot ${sNumber} dari ${screenshotDataUrls.length})...`
    );

    const img = await loadImage(sUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;
    ctx.drawImage(img, 0, 0);

    const width = canvas.width;
    const height = canvas.height;
    if (firstImageWidth === 0) {
      firstImageWidth = width;
      firstImageHeight = height;
    }

    // STEP 1: DETEKSI VISUAL GEMBOK 🔒 (PADLOCK ICON DETECTION)
    const detectedLocks = detectVisualLocks(canvas);
    detectedLocksByScreenshot[sNumber] = detectedLocks;

    // Perkiraan posisi X kolom gembok
    const lockXs = detectedLocks.map((l) => l.x).sort((a, b) => a - b);
    const medianLockX = lockXs.length > 0 ? lockXs[Math.floor(lockXs.length / 2)] : Math.round(width * 0.08);

    let medianRowHeight = 32;
    if (detectedLocks.length >= 2) {
      const spacings: number[] = [];
      for (let i = 1; i < detectedLocks.length; i++) {
        const delta = detectedLocks[i].centerY - detectedLocks[i - 1].centerY;
        if (delta >= 18 && delta <= 65) spacings.push(delta);
      }
      if (spacings.length > 0) {
        spacings.sort((a, b) => a - b);
        medianRowHeight = spacings[Math.floor(spacings.length / 2)];
      }
    }

    // STEP 2: PREPROCESSING UNTUK OCR.SPACE
    onProgress?.(
      35 + Math.round((sIdx / screenshotDataUrls.length) * 15),
      `MEMPROSES OCR.SPACE ENGINE (Screenshot ${sNumber})...`
    );

    const { dataUrl: preprocessedDataUrl, scale: ocrScale } = preprocessForOcrSpace(canvas);

    let ocrResponse: OcrSpaceApiResponse;
    let effectiveScale = ocrScale;
    try {
      ocrResponse = await callOcrSpaceApi(preprocessedDataUrl, onProgress);
      lastRawOcrResponse = ocrResponse;
    } catch (err: any) {
      console.warn('OCR.space call failed, attempting local Tesseract fallback:', err.message || err);
      try {
        onProgress?.(
          45 + Math.round((sIdx / screenshotDataUrls.length) * 10),
          `BERALIH KE LOCAL OCR CADANGAN (Screenshot ${sNumber})...`
        );
        ocrResponse = await runLocalTesseractFallback(canvas, onProgress);
        effectiveScale = 1.0;
        lastRawOcrResponse = ocrResponse;
      } catch (localErr: any) {
        console.error('All OCR methods failed:', localErr);
        // Fallback jika API & local OCR gagal: baris bertanda gembok disajikan untuk manual review
        for (let lIdx = 0; lIdx < detectedLocks.length; lIdx++) {
          const lock = detectedLocks[lIdx];
          rawCandidates.push({
            rawContentName: '',
            canonicalTitle: 'PERLU DICOCOKKAN',
            singkatan: '',
            variantTag: '5.1',
            formatSound: '5.1',
            formatFilm: '2D Flat',
            hasLock: true,
            lockStatus: 'LOCK',
            lockConfidence: lock.confidence || 75,
            lockCropUrl: lock.cropUrl,
            hasCheckbox: lock.hasCheckbox,
            screenshotIndex: sNumber,
            matchedFilm: null,
            needsManual: true,
            confidence: 'low'
          });
          debugRows.push({
            rowNumber: debugRows.length + 1,
            screenshotIndex: sNumber,
            hasLock: true,
            lockX: lock.x,
            lockY: lock.centerY,
            ocrText: '(OCR Engine Error)',
            matchingConfidence: 'none',
            status: 'PERLU DICOCOKKAN',
            reason: localErr.message || err.message || 'Gagal memproses OCR'
          });
          totalNeedsMatch++;
          totalLockDetected++;
        }
        continue;
      }
    }

    // STEP 3: SEMUA TEXT + KOORDINAT DARI OCR.SPACE
    const parsedResult = ocrResponse.ParsedResults?.[0];
    const overlayLines = parsedResult?.TextOverlay?.Lines || [];
    const allNormalizedWords: NormalizedWord[] = [];

    if (overlayLines.length > 0) {
      for (const line of overlayLines) {
        if (!line.Words || line.Words.length === 0) continue;
        for (const w of line.Words) {
          const wText = w.WordText.trim();
          if (!wText) continue;
          const left = Math.round(w.Left / effectiveScale);
          const top = Math.round(w.Top / effectiveScale);
          const wWidth = Math.round(w.Width / effectiveScale);
          const wHeight = Math.round(w.Height / effectiveScale);
          allNormalizedWords.push({
            text: wText,
            left,
            top,
            width: wWidth,
            height: wHeight,
            right: left + wWidth,
            bottom: top + wHeight,
            centerY: Math.round(top + wHeight / 2)
          });
        }
      }
    } else if (parsedResult?.ParsedText) {
      // Fallback jika tidak ada overlay bounding box
      const textLines = parsedResult.ParsedText.split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      textLines.forEach((tLine, tIdx) => {
        const estCenterY =
          tIdx < detectedLocks.length
            ? detectedLocks[tIdx].centerY
            : Math.round(height * 0.1 + tIdx * medianRowHeight);

        const words = tLine.split(/\s+/).filter(Boolean);
        let currLeft = Math.round(width * 0.15);
        words.forEach((w) => {
          const wWidth = Math.max(20, w.length * 9);
          allNormalizedWords.push({
            text: w,
            left: currLeft,
            top: estCenterY - Math.round(medianRowHeight / 2),
            width: wWidth,
            height: medianRowHeight,
            right: currLeft + wWidth,
            bottom: estCenterY + Math.round(medianRowHeight / 2),
            centerY: estCenterY
          });
          currLeft += wWidth + 10;
        });
      });
    }

    onProgress?.(
      60 + Math.round((sIdx / screenshotDataUrls.length) * 20),
      `MENGELOMPOKKAN ROW & MEMFILTER LOCK (Screenshot ${sNumber})...`
    );

    // STEP 4: KELOMPOKKAN TEXT MENJADI ROW (ROW GROUPING)
    // Sort semua kata berdasarkan posisi Y
    allNormalizedWords.sort((a, b) => a.centerY - b.centerY);

    const groupedRows: GroupedTableRow[] = [];

    for (const word of allNormalizedWords) {
      // Cari row yang secara vertikal selaras dengan kata ini
      let matchedRow: GroupedTableRow | null = null;
      for (const r of groupedRows) {
        const verticalTolerance = Math.max(16, medianRowHeight * 0.55);
        const hasOverlap = Math.min(word.bottom, r.bottom) - Math.max(word.top, r.top) > 2;
        const verticalDist = Math.abs(word.centerY - r.centerY);
        if (hasOverlap || verticalDist <= verticalTolerance) {
          matchedRow = r;
          break;
        }
      }

      if (matchedRow) {
        matchedRow.words.push(word);
        matchedRow.top = Math.min(matchedRow.top, word.top);
        matchedRow.bottom = Math.max(matchedRow.bottom, word.bottom);
        matchedRow.height = Math.max(14, matchedRow.bottom - matchedRow.top);
        matchedRow.centerY = Math.round((matchedRow.top + matchedRow.bottom) / 2);
        matchedRow.minLeft = Math.min(matchedRow.minLeft, word.left);
        matchedRow.maxRight = Math.max(matchedRow.maxRight, word.right);
      } else {
        groupedRows.push({
          words: [word],
          top: word.top,
          bottom: word.bottom,
          height: Math.max(14, word.height),
          centerY: word.centerY,
          minLeft: word.left,
          maxRight: word.right,
          hasLock: false
        });
      }
    }

    // Sort kata di setiap row dari KIRI ke KANAN (horizontal column order)
    for (const r of groupedRows) {
      r.words.sort((a, b) => a.left - b.left);
    }

    // Sort baris dari ATAS ke BAWAH
    groupedRows.sort((a, b) => a.centerY - b.centerY);

    // STEP 5: DETEKSI LOCK SECARA VISUAL PADA SETIAP ROW (REQUIREMENT 3, 4, 5, 6, 7)
    // Gunakan posisi Y tengah dari masing-masing row yang dihasilkan OCR.space
    for (const row of groupedRows) {
      // Temukan perkiraan posisi kolom teks (sebelah kanan kolom gembok)
      const contentWords = row.words.filter((w) => !isNoiseWord(w.text));
      const firstContentX = contentWords.length > 0 ? contentWords[0].left : row.minLeft;

      // 1. Cek apakah ada visual lock terdeteksi yang vertikalnya selaras dengan baris ini
      const matchingLock = detectedLocks.find(
        (l) =>
          Math.abs(l.centerY - row.centerY) <= Math.max(20, Math.max(row.height, medianRowHeight) * 0.85) ||
          (l.centerY >= row.top - 8 && l.centerY <= row.bottom + 8)
      );

      // 2. Analisis visual pada koordinat Y baris ini
      const analysis = analyzeRowLockVisual(canvas, row.centerY, row.height, firstContentX);

      if (matchingLock) {
        row.hasLock = true;
        row.lockStatus = 'LOCK';
        row.lockConfidence = matchingLock.confidence || 85;
        row.lockCropUrl = matchingLock.cropUrl || analysis.cropUrl;
        row.lockX = matchingLock.x;
        row.lockY = matchingLock.centerY;
        row.hasCheckbox = matchingLock.hasCheckbox ?? analysis.hasCheckbox;
        row.lockAnalysis = analysis;
      } else if (analysis.status === 'LOCK' || analysis.status === 'REVIEW_LOCK') {
        row.hasLock = true;
        row.lockStatus = analysis.status;
        row.lockConfidence = analysis.confidence;
        row.lockCropUrl = analysis.cropUrl;
        row.lockX = analysis.lockX;
        row.lockY = analysis.lockY || row.centerY;
        row.hasCheckbox = analysis.hasCheckbox;
        row.lockAnalysis = analysis;
      } else {
        row.hasLock = false;
        row.lockStatus = 'NO_LOCK';
        row.lockConfidence = analysis.confidence || 0;
        row.lockCropUrl = analysis.cropUrl;
        row.lockX = analysis.lockX;
        row.lockY = row.centerY;
        row.hasCheckbox = analysis.hasCheckbox;
        row.lockAnalysis = analysis;
      }
    }

    // REQUIREMENT 2: JANGAN MEMBUANG SEMUA ROW JIKA LOCK TIDAK TERDETEKSI (SAFETY NET)
    // Jika visual detector tidak menemukan icon lock berkeyakinan tinggi (misal kontras gambar unik):
    // JANGAN anggap 0 LOCK dan buang semua baris! Ubah baris berkonten menjadi "PERLU REVIEW LOCK".
    const confirmedLockCount = groupedRows.filter((r) => r.hasLock && r.lockStatus === 'LOCK').length;
    if (confirmedLockCount === 0) {
      for (const row of groupedRows) {
        const fullRowText = row.words.map((w) => w.text).join(' ').trim();
        const isHeader = /^(?:Storage|Capacity|RAID|Ingest|Cinema\s*XXI|Server|TMS|Content\s*Name|Type|Duration|Language)/i.test(fullRowText);
        if (!isHeader && fullRowText.length >= 3) {
          row.lockStatus = 'REVIEW_LOCK';
          row.lockConfidence = Math.max(row.lockConfidence || 0, 35);
          row.hasLock = true;
        }
      }
    }

    // STEP 6: FILTER BERDASARKAN STATUS LOCK VISUAL (PRIMARY GATE WITH REVIEW TIER)
    for (let rIdx = 0; rIdx < groupedRows.length; rIdx++) {
      const row = groupedRows[rIdx];
      const fullRowText = row.words.map((w) => w.text).join(' ').trim();

      // Abaikan baris header tabel atau metadata server AAM (Storage, RAID, Ingest, Capacity, Header Columns)
      if (
        /^(?:Storage|Capacity|RAID|Ingest|Cinema\s*XXI|Server|TMS|Content\s*Name|Type|Duration|Language)/i.test(
          fullRowText
        )
      ) {
        continue;
      }

      // Hitung total baris tabel terdeteksi (Requirement 8: TOTAL ROW)
      totalTableRowCount++;

      const isConfirmedLock = row.lockStatus === 'LOCK';
      const isReviewLock = row.lockStatus === 'REVIEW_LOCK';

      // =====================================================================
      // JIKA STATUS NO_LOCK (BENAR-BENAR TIDAK MEMILIKI LOCK / LATAR KOSONG) -> ABAIKAN
      // =====================================================================
      if (!isConfirmedLock && !isReviewLock) {
        totalIgnoredNoLock++;
        debugRows.push({
          rowNumber: debugRows.length + 1,
          screenshotIndex: sNumber,
          hasLock: false,
          lockStatus: 'NO_LOCK',
          lockConfidence: row.lockConfidence || 0,
          lockCropUrl: row.lockCropUrl,
          hasCheckbox: row.hasCheckbox,
          lockX: row.lockX,
          lockY: row.lockY || row.centerY,
          ocrText: fullRowText,
          ocrSource: 'ORIGINAL UPLOADED IMAGE',
          rowY: row.lockY || row.centerY,
          lockRoi: {
            x: row.lockX || medianLockX,
            y: (row.lockY || row.centerY) - Math.round(row.height / 2),
            width: 24,
            height: row.height
          },
          contentRoi: {
            x: (row.lockX || medianLockX) + 14,
            y: (row.lockY || row.centerY) - Math.round(row.height / 2),
            width: Math.max(80, (row.maxRight || width) - ((row.lockX || medianLockX) + 14)),
            height: row.height
          },
          selectedOcrText: '',
          boundingBox: {
            top: row.top,
            left: row.minLeft,
            width: row.maxRight - row.minLeft,
            height: row.height
          },
          matchingConfidence: 'none',
          status: 'IGNORED — NO LOCK',
          reason: 'Baris diabaikan karena tidak memiliki icon LOCK 🔒 secara visual'
        });
        continue; // STOP! Jangan buat candidate untuk baris tanpa LOCK!
      }

      // Update counter statistik (Requirement 8)
      if (isConfirmedLock) {
        totalLockDetected++;
      } else {
        totalLockReview++;
      }

      // =====================================================================
      // STEP 7: AMBIL CONTENT NAME DARI ROW TERSEBUT (KOLOM CONTENT NAME MURNI)
      // Abaikan kolom: Checkbox, Lock, ID/IND, Feature, Duration, Noise
      // =====================================================================
      const lockRightBound = (row.lockX || medianLockX) + 14;
      const contentWords = row.words.filter((w) => {
        // Abaikan kolom sebelah kiri gembok (checkbox / lock artifact)
        if (w.right <= lockRightBound) return false;
        // Abaikan kolom Language/Subtitle (ID, EN, IND, AD, SUB, dsb.)
        if (isLanguageColumnWord(w.text)) return false;
        // Abaikan kolom Type (Feature, Feature 1, Trailer, dsb.)
        if (isTypeColumnWord(w.text)) return false;
        // Abaikan kolom Duration di sebelah kanan (186:13, 03:01:14, dsb.)
        if (isDurationWord(w.text)) return false;
        // Abaikan simbol noise UI (checkbox, tanda panah, dsb.)
        if (isNoiseWord(w.text)) return false;
        return true;
      });

      let candidateRawText = contentWords.map((w) => w.text).join(' ').trim();

      // Jika filtering kata menghasilkan string kosong, gunakan fullRowText dan jalankan extractRawContentName
      if (!candidateRawText) {
        candidateRawText = extractRawContentName(fullRowText);
      } else {
        candidateRawText = extractRawContentName(candidateRawText);
      }

      // Safety check: jika masih belum mendapatkan CPL valid, periksa nearby words di baris OCR
      if (!candidateRawText || candidateRawText.length < 2 || isDisallowedCandidateTitle(candidateRawText)) {
        const rowTargetY = row.lockY || row.centerY;
        const nearbyWords = allNormalizedWords
          .filter((w) => Math.abs(w.centerY - rowTargetY) <= Math.max(18, medianRowHeight * 0.75))
          .sort((a, b) => a.left - b.left);
        if (nearbyWords.length > 0) {
          const rawNearby = nearbyWords
            .filter((w) => w.left > (row.lockX || medianLockX) - 5)
            .map((w) => w.text)
            .join(' ');
          const extractedNearby = extractRawContentName(rawNearby);
          if (
            extractedNearby &&
            extractedNearby.length >= 2 &&
            !isDisallowedCandidateTitle(extractedNearby) &&
            !isPlaceholderLockName(extractedNearby)
          ) {
            candidateRawText = extractedNearby;
          }
        }
      }

      // FILTER NON-FILM: LSF, LDR, trailer, promo, dsb.
      if (candidateRawText && isNonFilmContent(candidateRawText)) {
        totalIgnoredNonFilm++;
        debugRows.push({
          rowNumber: debugRows.length + 1,
          screenshotIndex: sNumber,
          hasLock: true,
          lockStatus: row.lockStatus,
          lockConfidence: row.lockConfidence,
          lockCropUrl: row.lockCropUrl,
          hasCheckbox: row.hasCheckbox,
          lockX: row.lockX,
          lockY: row.lockY,
          ocrText: candidateRawText,
          ocrSource: 'ORIGINAL UPLOADED IMAGE',
          rowY: row.lockY || row.centerY,
          lockRoi: {
            x: row.lockX || medianLockX,
            y: (row.lockY || row.centerY) - Math.round(row.height / 2),
            width: 24,
            height: row.height
          },
          contentRoi: {
            x: (row.lockX || medianLockX) + 14,
            y: (row.lockY || row.centerY) - Math.round(row.height / 2),
            width: Math.max(80, (row.maxRight || width) - ((row.lockX || medianLockX) + 14)),
            height: row.height
          },
          selectedOcrText: '',
          boundingBox: {
            top: row.top,
            left: row.minLeft,
            width: row.maxRight - row.minLeft,
            height: row.height
          },
          matchingConfidence: 'none',
          status: 'IGNORED — NON-FILM',
          reason: 'Materi non-film (LSF / LDR / Trailer / Promo / Iklan)'
        });
        continue;
      }

      totalOcrContentRead++;

      // Validasi apakah nama content valid (bukan noise kolom, bukan placeholder gembok, dan bukan label UI scanner)
      const isDisallowed =
        isDisallowedCandidateTitle(candidateRawText) ||
        isPlaceholderLockName(candidateRawText) ||
        isUiArtifactOrForbiddenText(candidateRawText);

      // STEP 8: MATCH KE MASTER FILM (REQUIREMENT 4, 10: RAW CPL ASLI DARI OCR.SPACE)
      if (candidateRawText.length >= 2 && !isDisallowed) {
        const specs = extractTechnicalSpecs(candidateRawText);
        const matchRes = matchToMasterFilm(candidateRawText, masterFilms);

        if (matchRes.matched) {
          totalMatchedMaster++;
        } else {
          totalNeedsMatch++;
        }

        rawCandidates.push({
          rawContentName: candidateRawText,
          canonicalTitle: matchRes.officialTitle,
          singkatan: matchRes.singkatan,
          variantTag: specs.variantTag,
          formatSound: matchRes.matched?.format_sound || specs.formatSound,
          formatFilm: matchRes.matched?.format_film || specs.formatFilm,
          hasLock: true,
          lockStatus: row.lockStatus,
          lockConfidence: row.lockConfidence,
          lockCropUrl: row.lockCropUrl,
          hasCheckbox: row.hasCheckbox,
          screenshotIndex: sNumber,
          matchedFilm: matchRes.matched,
          needsManual: matchRes.needsManual || isReviewLock,
          confidence: matchRes.matched ? (isReviewLock ? 'medium' : 'high') : 'medium'
        });

        debugRows.push({
          rowNumber: debugRows.length + 1,
          screenshotIndex: sNumber,
          hasLock: true,
          lockStatus: row.lockStatus,
          lockConfidence: row.lockConfidence,
          lockCropUrl: row.lockCropUrl,
          hasCheckbox: row.hasCheckbox,
          lockX: row.lockX,
          lockY: row.lockY,
          ocrText: candidateRawText,
          ocrSource: 'ORIGINAL UPLOADED IMAGE',
          rowY: row.lockY || row.centerY,
          lockRoi: {
            x: row.lockX || medianLockX,
            y: (row.lockY || row.centerY) - Math.round(row.height / 2),
            width: 24,
            height: row.height
          },
          contentRoi: {
            x: (row.lockX || medianLockX) + 14,
            y: (row.lockY || row.centerY) - Math.round(row.height / 2),
            width: Math.max(80, (row.maxRight || width) - ((row.lockX || medianLockX) + 14)),
            height: row.height
          },
          selectedOcrText: candidateRawText,
          boundingBox: {
            top: row.top,
            left: row.minLeft,
            width: row.maxRight - row.minLeft,
            height: row.height
          },
          masterFilmMatch: matchRes.matched?.judul_film || null,
          matchingConfidence: matchRes.matched ? 'high' : 'low',
          status: isReviewLock ? 'REVIEW LOCK' : (matchRes.matched ? 'MATCHED' : 'PERLU DICOCOKKAN'),
          reason: isReviewLock
            ? `Status PERLU REVIEW LOCK (Confidence: ${row.lockConfidence}%). ` + (matchRes.matched ? `Cocok Master: ${matchRes.matched.judul_film}` : 'Perlu pencocokan manual')
            : (matchRes.matched
                ? `Cocok dengan Master Film: ${matchRes.matched.judul_film}`
                : 'Perlu review / pencocokan manual')
        });
      } else {
        // Row MEMILIKI LOCK 🔒 SECARA VISUAL tetapi teks OCR kosong / gagal membaca CPL / teks adalah UI artifact
        // Sesuai Requirement 5 & 11: JANGAN gunakan placeholder "KONTEN TERKUNCI (GEMBOK X)"
        // Gunakan: rawCpl = "", title = "PERLU DICOCOKKAN", status = "PERLU DICOCOKKAN"
        totalNeedsMatch++;
        rawCandidates.push({
          rawContentName: '',
          canonicalTitle: 'PERLU DICOCOKKAN',
          singkatan: '',
          variantTag: '5.1',
          formatSound: '5.1',
          formatFilm: '2D Flat',
          hasLock: true,
          lockStatus: row.lockStatus,
          lockConfidence: row.lockConfidence,
          lockCropUrl: row.lockCropUrl,
          hasCheckbox: row.hasCheckbox,
          screenshotIndex: sNumber,
          matchedFilm: null,
          needsManual: true,
          confidence: 'low'
        });

        debugRows.push({
          rowNumber: debugRows.length + 1,
          screenshotIndex: sNumber,
          hasLock: true,
          lockStatus: row.lockStatus,
          lockConfidence: row.lockConfidence,
          lockCropUrl: row.lockCropUrl,
          hasCheckbox: row.hasCheckbox,
          lockX: row.lockX,
          lockY: row.lockY,
          ocrText: candidateRawText || '(Nama CPL tidak terbaca)',
          ocrSource: 'ORIGINAL UPLOADED IMAGE',
          rowY: row.lockY || row.centerY,
          lockRoi: {
            x: row.lockX || medianLockX,
            y: (row.lockY || row.centerY) - Math.round(row.height / 2),
            width: 24,
            height: row.height
          },
          contentRoi: {
            x: (row.lockX || medianLockX) + 14,
            y: (row.lockY || row.centerY) - Math.round(row.height / 2),
            width: Math.max(80, (row.maxRight || width) - ((row.lockX || medianLockX) + 14)),
            height: row.height
          },
          selectedOcrText: '',
          matchingConfidence: 'none',
          status: 'PERLU DICOCOKKAN',
          reason: isUiArtifactOrForbiddenText(candidateRawText)
            ? 'Teks diabaikan karena terdeteksi sebagai label/UI scanner, bukan nama CPL asli'
            : 'Baris memiliki LOCK 🔒 tetapi OCR gagal mengekstrak nama CPL'
        });
      }
    }

    // STEP 9: SAFETY NET — SETIAP GEMBOK GLOBAL YANG BELUM TERCOVER TETAP DIPROSES
    // Cari teks OCR pada koordinat Y gembok tersebut, JANGAN PERNAH gunakan placeholder!
    const coveredLockIndices = new Set<number>();
    for (let lIdx = 0; lIdx < detectedLocks.length; lIdx++) {
      const lock = detectedLocks[lIdx];
      const matchingRow = groupedRows.find(
        (r) =>
          r.hasLock &&
          (Math.abs((r.lockY || r.centerY) - lock.centerY) <=
            Math.max(20, Math.max(r.height, medianRowHeight) * 0.85) ||
            (lock.centerY >= r.top - 8 && lock.centerY <= r.bottom + 8))
      );
      if (matchingRow) {
        coveredLockIndices.add(lIdx);
      }
    }

    for (let lIdx = 0; lIdx < detectedLocks.length; lIdx++) {
      if (coveredLockIndices.has(lIdx)) continue;
      const lock = detectedLocks[lIdx];

      totalLockDetected++;
      totalNeedsMatch++;

      // Cari kata-kata OCR di sekitar koordinat Y gembok ini
      const nearbyWords = allNormalizedWords
        .filter((w) => Math.abs(w.centerY - lock.centerY) <= Math.max(18, medianRowHeight * 0.85))
        .sort((a, b) => a.left - b.left);

      let rowCplText = '';
      if (nearbyWords.length > 0) {
        const lockRight = lock.x + 14;
        const cWords = nearbyWords.filter((w) => {
          if (w.right <= lockRight) return false;
          if (isLanguageColumnWord(w.text)) return false;
          if (isTypeColumnWord(w.text)) return false;
          if (isDurationWord(w.text)) return false;
          if (isNoiseWord(w.text)) return false;
          return true;
        });
        rowCplText = extractRawContentName(cWords.map((w) => w.text).join(' ').trim());
        if (!rowCplText) {
          rowCplText = extractRawContentName(nearbyWords.map((w) => w.text).join(' ').trim());
        }
      }

      if (
        rowCplText &&
        rowCplText.length >= 2 &&
        !isDisallowedCandidateTitle(rowCplText) &&
        !isPlaceholderLockName(rowCplText) &&
        !isUiArtifactOrForbiddenText(rowCplText)
      ) {
        const specs = extractTechnicalSpecs(rowCplText);
        const matchRes = matchToMasterFilm(rowCplText, masterFilms);
        if (matchRes.matched) totalMatchedMaster++;

        rawCandidates.push({
          rawContentName: rowCplText,
          canonicalTitle: matchRes.officialTitle,
          singkatan: matchRes.singkatan,
          variantTag: specs.variantTag,
          formatSound: matchRes.matched?.format_sound || specs.formatSound,
          formatFilm: matchRes.matched?.format_film || specs.formatFilm,
          hasLock: true,
          lockStatus: 'LOCK',
          lockConfidence: lock.confidence || 85,
          lockCropUrl: lock.cropUrl,
          hasCheckbox: lock.hasCheckbox,
          screenshotIndex: sNumber,
          matchedFilm: matchRes.matched,
          needsManual: matchRes.needsManual,
          confidence: matchRes.matched ? 'high' : 'medium'
        });

        debugRows.push({
          rowNumber: debugRows.length + 1,
          screenshotIndex: sNumber,
          hasLock: true,
          lockX: lock.x,
          lockY: lock.centerY,
          ocrText: rowCplText,
          ocrSource: 'ORIGINAL UPLOADED IMAGE',
          rowY: lock.centerY,
          lockRoi: {
            x: lock.x,
            y: lock.centerY - Math.round(medianRowHeight / 2),
            width: 24,
            height: medianRowHeight
          },
          contentRoi: {
            x: lock.x + 14,
            y: lock.centerY - Math.round(medianRowHeight / 2),
            width: Math.max(80, width - (lock.x + 14)),
            height: medianRowHeight
          },
          selectedOcrText: rowCplText,
          matchingConfidence: matchRes.matched ? 'high' : 'low',
          status: matchRes.matched ? 'MATCHED' : 'PERLU DICOCOKKAN',
          reason: 'Gembok terdeteksi dan teks OCR berhasil dipasangkan'
        });
      } else {
        // Teks OCR benar-benar tidak terbaca di baris gembok ini
        // Sesuai Requirement 5 & 11: rawCpl = "", title = "PERLU DICOCOKKAN" (BUKAN PLACEHOLDER GEMBOK X)
        rawCandidates.push({
          rawContentName: '',
          canonicalTitle: 'PERLU DICOCOKKAN',
          singkatan: '',
          variantTag: '5.1',
          formatSound: '5.1',
          formatFilm: '2D Flat',
          hasLock: true,
          lockStatus: 'LOCK',
          lockConfidence: lock.confidence || 75,
          lockCropUrl: lock.cropUrl,
          hasCheckbox: lock.hasCheckbox,
          screenshotIndex: sNumber,
          matchedFilm: null,
          needsManual: true,
          confidence: 'low'
        });

        debugRows.push({
          rowNumber: debugRows.length + 1,
          screenshotIndex: sNumber,
          hasLock: true,
          lockX: lock.x,
          lockY: lock.centerY,
          ocrText: rowCplText || '(Nama CPL tidak terbaca)',
          ocrSource: 'ORIGINAL UPLOADED IMAGE',
          rowY: lock.centerY,
          lockRoi: {
            x: lock.x,
            y: lock.centerY - Math.round(medianRowHeight / 2),
            width: 24,
            height: medianRowHeight
          },
          contentRoi: {
            x: lock.x + 14,
            y: lock.centerY - Math.round(medianRowHeight / 2),
            width: Math.max(80, width - (lock.x + 14)),
            height: medianRowHeight
          },
          selectedOcrText: '',
          matchingConfidence: 'none',
          status: 'PERLU DICOCOKKAN',
          reason: isUiArtifactOrForbiddenText(rowCplText)
            ? 'Teks diabaikan karena merupakan label UI scanner, bukan nama CPL asli'
            : 'Gembok terdeteksi secara visual, teks CPL tidak terbaca oleh OCR'
        });
      }
    }
  }

  onProgress?.(85, 'DEDUPLICATION BERDASARKAN MASTER FILM & PENYUSUNAN HASIL...');

  // =========================================================================
  // STEP 10: DEDUPLICATION DENGAN CONTENT FAMILY KEY (Requirement 1, 2, 3, 4, 5)
  // =========================================================================
  // 1. PRIORITAS 1: MASTER FILM MATCH
  //    Jika beberapa raw content match ke Master Film yang sama:
  //    canonical identity = Master Film
  // 2. PRIORITAS 2: CONTENT FAMILY KEY
  //    Jika belum match ke Master Film (PERLU DICOCOKKAN):
  //    canonical identity = Content Family Key
  //    JANGAN menggunakan Raw CPL lengkap sebagai identity!
  // 3. Jembatan Family: Jika salah satu versi dari Content Family Key yang sama
  //    berhasil match ke Master Film, SELURUH keluarga versi teknis tersebut
  //    otomatis disatukan ke Master Film tersebut.
  // 4. Occurrence count & detail baris asli (sourceRows & technical versions) tetap disimpan.
  // 5. Urutan kemunculan mengikuti urutan pertama dari screenshot (FIFO).
  const dedupOrder: string[] = [];
  const groupedMap = new Map<string, SmartGroupedFilm>();

  // Map family key to matched Master Film if any variant in the family matched
  const familyToMasterMap = new Map<string, FilmUpload>();
  for (const cand of rawCandidates) {
    if (isPlaceholderLockName(cand.rawContentName) || isUiArtifactOrForbiddenText(cand.rawContentName)) {
      cand.rawContentName = '';
    }
    if (isPlaceholderLockName(cand.canonicalTitle) || isUiArtifactOrForbiddenText(cand.canonicalTitle)) {
      cand.canonicalTitle = 'PERLU DICOCOKKAN';
    }
    const famKey = cand.rawContentName ? extractContentFamilyKey(cand.rawContentName) : '';
    if (cand.matchedFilm && famKey && !isUiArtifactOrForbiddenText(famKey)) {
      if (!familyToMasterMap.has(famKey)) {
        familyToMasterMap.set(famKey, cand.matchedFilm);
      }
    }
  }

  for (let cIdx = 0; cIdx < rawCandidates.length; cIdx++) {
    const cand = rawCandidates[cIdx];

    // REQUIREMENT 6 & 14: Validasi & sanitasi — blok semua placeholder lama & UI artifacts
    if (isPlaceholderLockName(cand.rawContentName) || isUiArtifactOrForbiddenText(cand.rawContentName)) {
      cand.rawContentName = '';
    }
    if (isPlaceholderLockName(cand.canonicalTitle) || isUiArtifactOrForbiddenText(cand.canonicalTitle)) {
      cand.canonicalTitle = 'PERLU DICOCOKKAN';
    }

    const familyKey = cand.rawContentName ? extractContentFamilyKey(cand.rawContentName) : '';

    // Cek apakah ada master film match (langsung dari cand atau dari jembatan familyKey)
    const resolvedMaster = cand.matchedFilm || (familyKey ? familyToMasterMap.get(familyKey) : null);

    let groupKey: string;
    let canonicalTitleToUse: string;
    let singkatanToUse: string;

    if (resolvedMaster) {
      // PRIORITAS 1: MASTER FILM MATCH
      groupKey = `MASTER_${resolvedMaster.id}`;
      canonicalTitleToUse = resolvedMaster.judul_film.toUpperCase();
      singkatanToUse = (resolvedMaster.singkatan_film || cand.singkatan || '').toUpperCase();
    } else if (familyKey && !isUiArtifactOrForbiddenText(familyKey)) {
      // PRIORITAS 2: CONTENT FAMILY KEY (Fallback Identity untuk yang belum match / PERLU DICOCOKKAN)
      groupKey = `FAMILY_${familyKey}`;
      canonicalTitleToUse = familyKey;
      singkatanToUse = cand.singkatan || '';
    } else if (cand.rawContentName && !isUiArtifactOrForbiddenText(cand.rawContentName)) {
      groupKey = `RAW_${cand.rawContentName}`;
      canonicalTitleToUse = cand.rawContentName;
      singkatanToUse = '';
    } else {
      // Baris dengan LOCK tetapi OCR gagal membaca CPL
      // Sesuai Requirement 5 & 11: title = PERLU DICOCOKKAN, rawCpl = ""
      groupKey = `UNMATCHED_ROW_${cand.screenshotIndex}_${cIdx}`;
      canonicalTitleToUse = 'PERLU DICOCOKKAN';
      singkatanToUse = '';
    }

    if (isUiArtifactOrForbiddenText(canonicalTitleToUse)) {
      canonicalTitleToUse = 'PERLU DICOCOKKAN';
    }

    const sourceRowItem = {
      rawContentName: cand.rawContentName || '',
      screenshotIndex: cand.screenshotIndex,
      formatSound: cand.formatSound,
      formatFilm: cand.formatFilm
    };

    const variantItem: ScannedVariant = {
      rawTitle: cand.rawContentName || 'CPL',
      rawContentName: cand.rawContentName || '',
      sourceScreenshotIndex: cand.screenshotIndex,
      formatSound: cand.formatSound,
      formatFilm: cand.formatFilm,
      techTag: cand.variantTag
    };

    if (groupedMap.has(groupKey)) {
      // DUPLIKAT DITEMUKAN (Film yang sama berdasarkan Master Film atau Content Family Key):
      const existing = groupedMap.get(groupKey)!;
      existing.occurrenceCount = (existing.occurrenceCount || 1) + 1;

      if (!existing.sourceRows) {
        existing.sourceRows = [
          {
            rawContentName: existing.rawContentName || '',
            screenshotIndex: cand.screenshotIndex,
            formatSound: existing.formatSound,
            formatFilm: existing.formatFilm
          }
        ];
      }
      existing.sourceRows.push(sourceRowItem);

      if (!existing.rawContentName && cand.rawContentName) {
        existing.rawContentName = cand.rawContentName;
      }

      // Simpan technical version unik
      if (cand.rawContentName && !existing.variants.some((v) => v.rawTitle === cand.rawContentName)) {
        existing.variants.push(variantItem);
      }
      existing.variantCount = existing.variants.length;

      // Update matched film jika resolvedMaster ditemukan
      if (resolvedMaster && !existing.matchedFilm) {
        existing.matchedFilm = resolvedMaster;
        existing.canonicalTitle = resolvedMaster.judul_film.toUpperCase();
        existing.singkatan = (resolvedMaster.singkatan_film || existing.singkatan || '').toUpperCase();
        existing.needsManualMatch = false;
        existing.confidence = 'high';
      }

      // Prioritas sound format dan kualitas deteksi lock
      if (cand.formatSound && cand.formatSound !== '5.1') {
        existing.formatSound = cand.formatSound;
      }
      if (existing.lockStatus !== 'LOCK' && cand.lockStatus === 'LOCK') {
        existing.lockStatus = 'LOCK';
      }
      if (cand.lockConfidence && (!existing.lockConfidence || cand.lockConfidence > existing.lockConfidence)) {
        existing.lockConfidence = cand.lockConfidence;
      }
      if (!existing.lockCropUrl && cand.lockCropUrl) {
        existing.lockCropUrl = cand.lockCropUrl;
      }
    } else {
      // KEMUNCULAN PERTAMA DARI FILM / FAMILY:
      dedupOrder.push(groupKey);
      groupedMap.set(groupKey, {
        id: resolvedMaster
          ? `group-${resolvedMaster.id}`
          : `group-row-${Date.now()}-${cIdx}-${Math.random().toString(36).substring(2, 6)}`,
        canonicalTitle: canonicalTitleToUse,
        singkatan: singkatanToUse,
        rawContentName: cand.rawContentName || '',
        formatFilm: resolvedMaster?.format_film || cand.formatFilm || '2D Flat',
        formatSound: resolvedMaster?.format_sound || cand.formatSound || '5.1',
        hasLock: true,
        lockStatus: cand.lockStatus || 'LOCK',
        lockConfidence: cand.lockConfidence || 80,
        lockCropUrl: cand.lockCropUrl,
        hasCheckbox: cand.hasCheckbox,
        confidence: resolvedMaster ? 'high' : cand.confidence,
        matchedFilm: resolvedMaster || null,
        needsManualMatch: !resolvedMaster,
        isChecked: true,
        occurrenceCount: 1,
        sourceRows: [sourceRowItem],
        variants: [variantItem],
        variantCount: 1
      });
    }
  }

  onProgress?.(100, 'SELESAI - SIAP DIREVIEW');

  // Urutan hasil mengikuti kemunculan pertama dari screenshot (Requirement 10 & 12)
  const resultList = dedupOrder.map((key) => groupedMap.get(key)!);

  const rawTotal = rawCandidates.length;
  const uniqueTotal = resultList.length;
  const duplicatesMerged = Math.max(0, rawTotal - uniqueTotal);

  // Recalculate unique matched vs unique needs match
  const uniqueMatchedCount = resultList.filter((f) => f.matchedFilm !== null).length;
  const uniqueNeedsMatchCount = resultList.filter((f) => f.matchedFilm === null).length;

  const stats: ScanStats = {
    totalRowCount: totalTableRowCount,
    lockDetectedCount: totalLockDetected,
    lockReviewCount: totalLockReview,
    ignoredNoLockCount: totalIgnoredNoLock,
    ocrContentReadCount: totalOcrContentRead,
    matchedMasterCount: uniqueMatchedCount,
    needsMatchCount: uniqueNeedsMatchCount,
    ignoredNonFilmCount: totalIgnoredNonFilm,
    rawCandidateCount: rawTotal,
    uniqueFilmCount: uniqueTotal,
    duplicateMergedCount: duplicatesMerged,
    ocrSource: 'ORIGINAL UPLOADED IMAGE',
    originalImageWidth: firstImageWidth,
    originalImageHeight: firstImageHeight,
    ocrImageWidth: firstImageWidth,
    ocrImageHeight: firstImageHeight
  };

  return {
    films: resultList,
    excludedCount: totalIgnoredNonFilm,
    stats,
    debugRows,
    detectedLocksByScreenshot,
    rawOcrResponse: lastRawOcrResponse
  };
}
