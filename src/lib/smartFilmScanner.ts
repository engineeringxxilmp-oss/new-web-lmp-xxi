/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createWorker, Worker } from 'tesseract.js';
import { FilmUpload } from '../types';

export interface ScannedVariant {
  rawTitle: string;
  rawContentName?: string;
  sourceScreenshotIndex?: number;
  formatSound?: string;
  formatFilm?: string;
  techTag?: string;
}

export interface SmartGroupedFilm {
  id: string;
  canonicalTitle: string;
  singkatan?: string;
  rawContentName?: string;
  formatFilm: string;
  formatSound: string;
  hasLock: boolean;
  lockStatus?: 'LOCK' | 'REVIEW_LOCK' | 'NO_LOCK';
  lockConfidence?: number;
  lockCropUrl?: string;
  hasCheckbox?: boolean;
  confidence: 'high' | 'medium' | 'low';
  matchedFilm: FilmUpload | null;
  needsManualMatch: boolean;
  isChecked: boolean;
  occurrenceCount?: number;
  sourceRows?: Array<{
    rawContentName: string;
    screenshotIndex: number;
    formatSound?: string;
    formatFilm?: string;
  }>;
  variants: ScannedVariant[];
  variantCount: number;
}

export interface VisualLock {
  x: number;
  y: number;
  width: number;
  height: number;
  centerY: number;
  confidence: number;
  cropUrl?: string;
  hasCheckbox?: boolean;
}

export interface DetectedTableRow {
  rowIndex: number;
  y: number;
  height: number;
  hasLock: boolean;
  lockAnchor?: VisualLock;
  contentX: number;
  contentWidth: number;
}

export interface ScanResultPayload {
  films: SmartGroupedFilm[];
  excludedCount: number;
  detectedLocksByScreenshot?: Record<number, VisualLock[]>;
}

// Global cached Tesseract worker to prevent reloading WASM multiple times
let cachedWorker: Worker | null = null;
let workerInitPromise: Promise<Worker> | null = null;

export async function getOcrWorker(
  onProgress?: (progress: number, status: string) => void
): Promise<Worker> {
  if (cachedWorker) return cachedWorker;
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = (async () => {
    try {
      onProgress?.(15, 'Menginisialisasi Engine OCR Browser-side (Web Worker)...');
      const worker = await createWorker('eng');
      // Set PSM 4 (single column of variable text) as default for tabular table parsing
      await worker.setParameters({
        tessedit_pageseg_mode: '4' as any,
        preserve_interword_spaces: '1'
      });
      cachedWorker = worker;
      return worker;
    } catch (err) {
      console.warn('Gagal memuat Tesseract Web Worker:', err);
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
    img.onerror = (e) => reject(new Error('Gagal memuat gambar screenshot: ' + e));
    img.src = src;
  });
}

/**
 * Filter out Non-Film content:
 * LSF certificate, LDR, Trailer, Teaser, Promo, Advertisement, Test clips, Policy, Bumper
 */
export function isNonFilmContent(text: string): boolean {
  if (!text) return false;
  const upper = text.toUpperCase().trim();

  // Explicit Non-film indicator keywords
  const nonFilmPatterns = [
    /\bLSF\b/i,
    /\bLDR\b/i,
    /\bTRAILER\b/i,
    /\bTRL\b/i,
    /\bTEASER\b/i,
    /\bTSR\b/i,
    /\bPROMO\b/i,
    /\bPRM\b/i,
    /\bCOMMERCIAL\b/i,
    /\bIKLAN\b/i,
    /\bADV\b/i,
    /\bPOLICY\b/i,
    /\bBUMPER\b/i,
    /\bIDENT\b/i,
    /\bRATING\b/i,
    /\bTEST\s*PATTERNS?\b/i,
    /\bTEST\s*CARD\b/i,
    /\bSPONSORED\b/i,
    /\bSTATION\s*ID\b/i
  ];

  for (const pattern of nonFilmPatterns) {
    if (pattern.test(upper)) {
      return true;
    }
  }

  // Also check if CPL content type marker is non-film:
  if (
    upper.includes('_TRL_') ||
    upper.includes('_TRL-') ||
    upper.includes('_TSR_') ||
    upper.includes('_TSR-') ||
    upper.includes('_PRO_') ||
    upper.includes('_POL_') ||
    upper.includes('_ADV_') ||
    upper.includes('_TST_') ||
    upper.includes('_TLR_') ||
    upper.includes('_LSF_') ||
    upper.includes('_LSF-') ||
    upper.includes('_LDR_') ||
    upper.includes('_LDR-')
  ) {
    return true;
  }

  return false;
}

/**
 * VALIDASI SUMBER TEXT (Requirement 5 & 6 & 7):
 * Memastikan teks OCR BUKAN berasal dari elemen UI/label/card hasil scanner aplikasi:
 * - "PERLU DICOCOKKAN"
 * - "PILIH JUDUL MASTER FILM" / "PILIH JUDUL" / "MASTER FILM"
 * - "BUKTI PEMBACAAN" / "PEMBACAAN KOLOM" / "KOLOM AAM" / "HEKTA PERBACAAN"
 * - "KONTEN TERKUNCI" / "TERKUNCI & GEMBOK" / "TERKUNCI" / "GEMBOK"
 * - "RAW CPL" / "RAWCPL"
 * - "LOCK" / "LOCK 🔒" / "REVIEW LOCK"
 * - "CHECKBOX" / "CHECKBOX: ✓"
 * - "DIPILIH" / "DIPILIH:"
 * - "CROP ROI"
 * - "OCCURRENCE" / "DUPLIKAT TERGABUNG" / "CONTENT TERDETEKSI"
 * - "COCOKKAN DENGAN MASTER" / "IMPORT KE LAPORAN"
 * - "VERSI TEKNIS"
 */
export function isUiArtifactOrForbiddenText(text?: string | null): boolean {
  if (!text) return true;
  const s = text.trim();
  if (s.length < 2) return true;
  const upper = s.toUpperCase();

  // 1. Label UI Scanner & Tombol
  if (/PERLU\s*DICOCOKKAN/i.test(upper)) return true;
  if (/PILIH\s*JUDUL/i.test(upper)) return true;
  if (/MASTER\s*FILM/i.test(upper)) return true;
  if (/BUKTI\s*PEMBACAAN/i.test(upper)) return true;
  if (/HEKTA\s*PERBACAAN/i.test(upper)) return true;
  if (/PEMBACAAN\s*KOL/i.test(upper)) return true;
  if (/KOLOM\s*AAM/i.test(upper)) return true;
  if (/KETON\s*AAV/i.test(upper)) return true;
  if (/KOLCS\s*A4N/i.test(upper)) return true;
  if (/RAW\s*CPL/i.test(upper)) return true;
  if (/TERKUNCI\s*&?\s*GEMBOK/i.test(upper)) return true;
  if (/KONTEN\s*TERKUNCI/i.test(upper)) return true;
  if (/DUPLIKAT\s*TERGABUNG/i.test(upper)) return true;
  if (/CONTENT\s*TERDETEKSI/i.test(upper)) return true;
  if (/COCOKKAN\s*DENGAN\s*MASTER/i.test(upper)) return true;
  if (/IMPORT\s*KE\s*LAPORAN/i.test(upper)) return true;
  if (/CROP\s*ROI/i.test(upper)) return true;
  if (/VERSI\s*TEKNIS/i.test(upper)) return true;
  if (/PILIH\s*MANUAL/i.test(upper)) return true;
  if (/SCAN\s*SCREENSHOT/i.test(upper)) return true;

  // 2. Placeholder gembok & lock
  if (/\b(?:gembok|baris|lock)\s*\d+/i.test(upper)) return true;
  if (/^gembok/i.test(upper)) return true;
  if (/\bgembok\b/i.test(upper)) return true;
  if (/^lock\s*🔒/i.test(upper)) return true;
  if (/^review\s*lock/i.test(upper)) return true;

  // 3. UI single words / noise
  if (/^DIPILIH(?:\s*:)?$/i.test(upper)) return true;
  if (/^CHECKBOX(?:\s*:)?(?:\s*✓)?$/i.test(upper)) return true;

  return false;
}

/**
 * Isolates and cleans rawContentName strictly from the Content Column OCR output:
 * 1. Removes trailing Duration tokens (e.g. 186:13, 103:23, 115:00)
 * 2. Removes leading Type column artifacts (e.g. "Feature", "Feature 1", "FEATURE", "Trailer", "ADV")
 * 3. Removes leading Language column artifacts (e.g. "ID", "EN", "IND", "AD", "SUB")
 * 4. Preserves the full genuine Content/CPL name without cutting off leading characters!
 */
export function extractRawContentName(rawOcrText: string): string {
  let text = rawOcrText.replace(/[\r\n]+/g, ' ').trim();

  // If text is already a UI artifact, reject it immediately
  if (isUiArtifactOrForbiddenText(text)) {
    return '';
  }

  // 1. Remove duration from end (e.g., " 186:13", " 103:23", " 01:45:20")
  text = text.replace(/\s*\b\d{1,3}[:.]\d{2}(?:[:.]\d{2})?\b.*$/i, '').trim();

  // 2. Remove leading Type column bleed (e.g. "Feature 1 Aveng...", "Feature AvengEndgamEnc..." -> "AvengEndgamEnc...")
  text = text.replace(
    /^(?:Feature\s*1|Feature\s*2|Feature|FEATURE|Trailer|TRAILER|Teaser|TEASER|Promo|PROMO|Policy|POLICY|Advertisement|ADVERTISEMENT|ADV|TSR|TRL|FTR|LDR|LSF)\s+/i,
    ''
  );

  // 3. Remove leading Language column bleed (e.g. "ID Feature Aveng..." or "ID Aveng...")
  text = text.replace(/^(?:ID|EN|IND|AD|SUB|DUB)\s+/i, '');

  // 4. If the text itself is solely "Feature", "Feature 1", "ID", etc., or UI artifact, clear it
  if (/^(?:Feature\s*1|Feature|FEATURE|Trailer|TRAILER|ID|IND|EN|AD|SUB)$/i.test(text.trim())) {
    return '';
  }
  if (isUiArtifactOrForbiddenText(text)) {
    return '';
  }

  // 5. Remove leading/trailing stray non-alphanumeric noise characters (~, |, -, _, *, /, etc.)
  text = text.replace(/^[^A-Za-z0-9_]+/, '').replace(/[^A-Za-z0-9_]+$/, '').trim();

  if (isUiArtifactOrForbiddenText(text)) {
    return '';
  }

  return text;
}

/**
 * REQUIREMENT 6 & 14: Validates whether a text is a forbidden dummy lock placeholder:
 * e.g. "Konten Terkunci 🔒 (Gembok 1)", "KONTEN TERKUNCI (BARIS 2)", "GEMBOK 1", "LOCK 1", etc.
 * Lock is a filter, NEVER a content name or Raw CPL!
 */
export function isPlaceholderLockName(text?: string | null): boolean {
  if (!text) return true;
  const s = text.trim();
  if (!s) return true;
  if (/^konten\s*(?:terkunci|gembok|lock)/i.test(s)) return true;
  if (/\b(?:gembok|baris|lock)\s*\d+/i.test(s)) return true;
  if (/^gembok/i.test(s)) return true;
  if (/\bgembok\b/i.test(s)) return true;
  if (/^lock\s*🔒/i.test(s)) return true;
  return false;
}

/**
 * Validates that an extracted string is not a generic UI column or noise artifact
 */
export function isDisallowedCandidateTitle(title: string): boolean {
  if (!title) return true;
  if (isPlaceholderLockName(title)) return true;
  if (isUiArtifactOrForbiddenText(title)) return true;
  const clean = title.trim().toUpperCase();
  if (clean.length < 2) return true;
  if (
    clean === 'ID' ||
    clean === 'EN' ||
    clean === 'IND' ||
    clean === 'AD' ||
    clean === 'SUB' ||
    clean === 'DUB' ||
    clean === 'FEATURE' ||
    clean === 'FEATURE 1' ||
    clean === 'FEATURE1' ||
    clean === 'FEATURE 2' ||
    clean === 'TRAILER' ||
    clean === 'DCP' ||
    clean === 'DURATION' ||
    clean === 'CONTENT' ||
    clean === 'TITLE'
  ) {
    return true;
  }
  if (/^\d+$/.test(clean)) return true;
  if (/^\d{1,3}[:.]\d{2}(?:[:.]\d{2})?$/.test(clean)) return true;
  return false;
}

/**
 * Extracts title stem for matching against Master Film:
 * e.g. "AvengEndgamEnc_FTR-2D-InfV_S_EN-IND_ID_71_4K_MRV_20260903_WDS_SMPTE_VF" -> "AvengEndgamEnc"
 * e.g. "HEARTOFTHEBEAST_FTR_..." -> "HEARTOFTHEBEAST"
 * e.g. "BABYUDONREV" -> "BABYUDON"
 */
export function extractTitleStem(rawContentName: string): string {
  let stem = rawContentName.trim();

  // Strip file extensions (.dcp, etc.)
  stem = stem.replace(/\.(?:dcp|xml|mxf|tar|zip|mov|mp4)$/i, '').trim();

  // Strip row numbering and technical version prefixes
  stem = stem.replace(/^(?:\d+[\s_.-]+)?(?:REV|REVISION|REVS|VER|V\d*|FTR|FEATURE|CPL)[\s_.-]+/i, '');
  stem = stem.replace(/^\d+[\s_.-]+/i, '');

  // DCI format splitter: before _FTR, _TLR, _TSR, _ADV, _POL, _PRO, _SHR, _EPS, _DCP, _LDR, _LSF, _2D, _3D
  // Supports _, -, or space delimiter!
  const dciMatch = stem.match(
    /^([A-Za-z0-9_.-]+?)(?:[-_\s](?:FTR|TLR|TSR|ADV|POL|PRO|SHR|EPS|DCP|LDR|LSF|TST|XSN)[-_\s]|[-_\s](?:2D|3D)[-_\s]|[-_\s][SF][-_\s](?:[A-Z]{2}|[0-9]{2}))/i
  );
  if (dciMatch && dciMatch[1] && dciMatch[1].length >= 2) {
    stem = dciMatch[1];
  } else {
    const tokens = stem.split(/[\s_.-]+/);
    const isTechToken = (t: string): boolean => {
      const u = t.toUpperCase();
      if (/^(FTR|TLR|TSR|PRO|POL|ADV|LDR|LSF|SHR|EPS|DCP)$/.test(u)) return true;
      if (/^(2D|3D|2K|4K|INFV|TAB|IMAX)$/.test(u)) return true;
      if (/^(FLAT|SCOPE|SCOOP|S-239|F-185)$/.test(u)) return true;
      if (/^(51|71|5\.1|7\.1|5-1|7-1|ATMOS|IAB|SURROUND)$/.test(u)) return true;
      if (/^(SMPTE|INTEROP|OV|VF)$/.test(u)) return true;
      if (/^(WDS|PXL|MRV|DEL|EFILM)$/.test(u)) return true;
      if (/^202\d{5}$/.test(u)) return true;
      return false;
    };
    const firstTechIdx = tokens.findIndex((t, idx) => idx > 0 && isTechToken(t));
    if (firstTechIdx > 0) {
      stem = tokens.slice(0, firstTechIdx).join('_');
    } else {
      const parts = stem.split('_');
      if (parts.length > 1) {
        const ftrIdx = parts.findIndex((p) => /^(FTR|TLR|TSR|PRO|POL|ADV|LDR|LSF)/i.test(p));
        if (ftrIdx > 0) {
          stem = parts.slice(0, ftrIdx).join('_');
        } else {
          stem = parts[0];
        }
      }
    }
  }

  // Strip technical format suffixes from stem if attached
  stem = stem.replace(/[-_](?:2D|3D|IMAX|4K|2K|51|71|ATMOS|REVS?|InfV|OV|VF)$/i, '');
  stem = stem.replace(/(?:REV|REVS|REVAT|AT|ATMOS|51|71)$/i, '');
  stem = stem.replace(/\.dcp$/i, '');

  return stem.trim();
}

/**
 * CONTENT FAMILY KEY (Single Source of Truth for Film Deduplication):
 * Represents the fundamental canonical identity of a film/content before technical metadata.
 *
 * Examples:
 * - AvengEndgamEnc_FTR_2D_InfV_S_EN_IND_ID_71_4K_MRV_20260903_WDS_SMPTE_VF -> "AVENGENDGAMENC"
 * - AvengEndgamEnc_FTR_2D_InfV_5_EN_IND_ID_TAB_4K_MRV_20260903_WDS_SMPTE_VF -> "AVENGENDGAMENC"
 * - AvengEndgamEnc_FTR_2D_InfV_5_EN_XX_07_71_4K_MRV_20260901_PXL_SMPTE_VF -> "AVENGENDGAMENC"
 * - AvengEndgamEnc_FTR_2D_S_EN_IND_ID_51_4K_MRV_20260904_WDS_SMPTE_VF -> "AVENGENDGAMENC"
 * - AvengEndgamEnc_FTR_2D_S_EN_IND_ID_71_4K_MRV_20260904_WDS_SMPTE_VF -> "AVENGENDGAMENC"
 * - 1_REV_AWAKE_BRAIN_SURGERY_WHERE_MIRACLES_BEGIN_DCP.dcp -> "AWAKE BRAIN SURGERY WHERE MIRACLES BEGIN"
 * - 4_REV_AWAKE_BRAIN_SURGERY_WHERE_MIRACLES_BEGIN_DCP.dcp -> "AWAKE BRAIN SURGERY WHERE MIRACLES BEGIN"
 * - 7_REV_AWAKE_BRAIN_SURGERY_WHERE_MIRACLES_BEGIN_DCP.dcp -> "AWAKE BRAIN SURGERY WHERE MIRACLES BEGIN"
 * - 8_REV_AWAKE_BRAIN_SURGERY_WHERE_MIRACLES_BEGIN_DCP_SURROUND.dcp -> "AWAKE BRAIN SURGERY WHERE MIRACLES BEGIN"
 * - BABYUDONREV / BABYUDONREVAT / BABY UDON -> "BABY UDON" / "BABYUDON"
 *
 * Technical metadata is NEVER included in the family identity:
 * 2D, 3D, InfV, S, EN, IND, ID, XX, 5, 7.1, 5.1, 4K, MRV, date stamps, WDS, PXL, SMPTE, VF, ATMOS, SURROUND
 */
export function extractContentFamilyKey(rawContentName: string): string {
  if (!rawContentName || isPlaceholderLockName(rawContentName)) return '';
  let s = rawContentName.trim();

  // 1. Remove file extensions (.dcp, .xml, .mxf, .tar, .zip, etc.)
  s = s.replace(/\.(?:dcp|xml|mxf|tar|zip|mov|mp4)$/i, '').trim();

  // 2. Remove technical row numbering & prefixes:
  // e.g. "1_REV_", "4_REV_", "7_REV_", "8_REV_", "01_", "1-REV-", "REV_", "REVISION_", "VER_", "V1_"
  s = s.replace(/^(?:\d+[\s_.-]+)?(?:REV|REVISION|REVS|VER|V\d*|FTR|FEATURE|CPL)[\s_.-]+/i, '');
  s = s.replace(/^\d+[\s_.-]+/i, '');

  // 3. DCI standard format extraction:
  // In DCI CPL naming, the MovieTitle is followed by ContentType:
  // e.g. "AvengEndgamEnc_FTR_2D..." -> substring before _FTR_ or -FTR- or _FTR-
  // Also supports space delimiter from OCR output!
  const dciMatch = s.match(
    /^([A-Za-z0-9_.-]+?)(?:[-_\s](?:FTR|TLR|TSR|PRO|POL|ADV|LDR|LSF|SHR|EPS|DCP|TST|XSN)[-_\s]|[-_\s](?:2D|3D)[-_\s]|[-_\s][SF][-_\s](?:[A-Z]{2}|[0-9]{2}))/i
  );
  if (dciMatch && dciMatch[1] && dciMatch[1].length >= 2) {
    s = dciMatch[1];
  } else {
    // 4. Token-based technical token cutoff:
    // Split into tokens by underscores, hyphens, and spaces:
    // Check if any token is a known technical indicator token.
    // If so, everything before the FIRST technical indicator token is the Title Family!
    const tokens = s.split(/[\s_.-]+/);
    if (tokens.length > 1) {
      const isTechToken = (t: string): boolean => {
        const u = t.toUpperCase();
        if (/^(FTR|TLR|TSR|PRO|POL|ADV|LDR|LSF|SHR|EPS|DCP)$/.test(u)) return true;
        if (/^(2D|3D|2K|4K|INFV|TAB|IMAX)$/.test(u)) return true;
        if (/^(FLAT|SCOPE|SCOOP|S-239|F-185)$/.test(u)) return true;
        if (/^(51|71|5\.1|7\.1|5-1|7-1|ATMOS|IAB|SURROUND)$/.test(u)) return true;
        if (/^(SMPTE|INTEROP|OV|VF)$/.test(u)) return true;
        if (/^(WDS|PXL|MRV|DEL|EFILM)$/.test(u)) return true;
        if (/^202\d{5}$/.test(u)) return true;
        return false;
      };

      const firstTechIdx = tokens.findIndex((t, idx) => idx > 0 && isTechToken(t));
      if (firstTechIdx > 0) {
        s = tokens.slice(0, firstTechIdx).join(' ');
      }
    }
  }

  // 5. Tail trimming for remaining technical suffixes (in case attached without delimiter):
  // e.g. "BABYUDONREV" -> "BABYUDON", "BABYUDONREVAT" -> "BABYUDON"
  s = s.replace(/(?:REV|REVS|REVAT|AT|ATMOS|51|71)$/i, '');

  // 6. Loop trim any stray technical suffix tokens remaining at the end:
  const techSuffixRegex = /[\s_.-]+(?:SURROUND|5\.?1|7\.?1|5-1|7-1|ATMOS|IAB|DA|2D|3D|2K|4K|FLAT|SCOPE|SCOOP|S-239|F-185|INFV|TAB|IMAX|DCP|SMPTE|INTEROP|OV|VF|EN[-_]ID|ID[-_]XX|EN[-_]XX|IND[-_]ID|202\d{5}|WDS|PXL|MRV|DEL|REVS?|REV[\s_-]*\d+|REVAT|LAS)$/i;
  for (let i = 0; i < 6; i++) {
    if (techSuffixRegex.test(s)) {
      s = s.replace(techSuffixRegex, '').trim();
    } else {
      break;
    }
  }

  // 7. Format result: normalize spaces & uppercase
  return s.replace(/[\s_.-]+/g, ' ').trim().toUpperCase();
}

/**
 * Normalizes content name / CPL for deduplication identity (Fallback Identity):
 * Directly wraps extractContentFamilyKey for backward compatibility.
 */
export function normalizeContentIdentity(rawText: string): string {
  return extractContentFamilyKey(rawText);
}

/**
 * Extracts technical specs (sound, format, tags) from rawContentName
 */
export function extractTechnicalSpecs(rawContentName: string): {
  formatSound: string;
  formatFilm: string;
  variantTag: string;
} {
  const upper = rawContentName.toUpperCase();
  let formatSound = '5.1';
  let formatFilm = '2D Flat';
  const tags: string[] = [];

  // Sound detection
  if (upper.includes('ATMOS') || upper.includes('_IAB') || upper.includes('-IAB') || upper.includes('_DA')) {
    formatSound = 'Dolby Atmos';
    tags.push('ATMOS');
  } else if (upper.includes('_71') || upper.includes('-71') || upper.includes('7.1') || upper.includes('_7-1')) {
    formatSound = '7.1';
    tags.push('7.1');
  } else if (upper.includes('_51') || upper.includes('-51') || upper.includes('5.1') || upper.includes('_5-1')) {
    formatSound = '5.1';
    tags.push('5.1');
  }

  // Format film detection
  const is3D = upper.includes('3D') || upper.includes('FTR-3D');
  const isScope = upper.includes('_S_') || upper.includes('SCOPE') || upper.includes('SCOOP') || upper.includes('S-239');
  const isFlat = upper.includes('_F_') || upper.includes('FLAT') || upper.includes('F-185');

  if (is3D && isScope) formatFilm = '3D Scoop';
  else if (is3D && isFlat) formatFilm = '3D Flat';
  else if (is3D) formatFilm = '3D Scoop';
  else if (isScope) formatFilm = '2D Scoop';
  else if (isFlat) formatFilm = '2D Flat';
  else if (upper.includes('IMAX')) formatFilm = 'IMAX';

  // Revision detection
  const revMatch = upper.match(/\b(REVS?|REV[\s\-_]*\d+)\b/i);
  if (revMatch) {
    tags.push(revMatch[0]);
  }

  return {
    formatSound,
    formatFilm,
    variantTag: tags.join(' ') || formatSound
  };
}

/**
 * Image preprocessing for small font and text clarity:
 * - Upscales by 2.2x with high-quality smoothing
 * - Automatically detects dark theme background and inverts polarity to dark text on light background
 * - Applies smooth contrast normalization (avoids harsh binary crushing that breaks font character shapes)
 * - Keeps anti-aliased character edges so Tesseract's LSTM neural net accurately reads letters
 */
export function preprocessTextRegion(
  sourceCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scale = 2.2
): string {
  const safeX = Math.max(0, Math.min(x, sourceCanvas.width - 10));
  const safeY = Math.max(0, Math.min(y, sourceCanvas.height - 10));
  const safeW = Math.max(10, Math.min(width, sourceCanvas.width - safeX));
  const safeH = Math.max(10, Math.min(height, sourceCanvas.height - safeY));

  const targetWidth = Math.max(10, Math.round(safeW * scale));
  const targetHeight = Math.max(10, Math.round(safeH * scale));

  const offscreen = document.createElement('canvas');
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    sourceCanvas,
    safeX,
    safeY,
    safeW,
    safeH,
    0,
    0,
    targetWidth,
    targetHeight
  );

  try {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const d = imgData.data;

    // Detect background brightness from corner & border pixels
    let bgLumSum = 0;
    let bgSamples = 0;
    for (let py = 0; py < targetHeight; py += Math.max(1, Math.floor(targetHeight / 4))) {
      const idx0 = (py * targetWidth) * 4;
      const idx1 = (py * targetWidth + (targetWidth - 1)) * 4;
      bgLumSum += 0.299 * d[idx0] + 0.587 * d[idx0 + 1] + 0.114 * d[idx0 + 2];
      bgLumSum += 0.299 * d[idx1] + 0.587 * d[idx1 + 1] + 0.114 * d[idx1 + 2];
      bgSamples += 2;
    }
    const avgBgLuminance = bgSamples > 0 ? bgLumSum / bgSamples : 40;
    const isDarkTheme = avgBgLuminance < 130;

    // First pass: compute min & max luminance for adaptive contrast stretch
    let minLum = 255;
    let maxLum = 0;

    for (let i = 0; i < d.length; i += 4) {
      let lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (isDarkTheme) {
        lum = 255 - lum; // invert: dark bg becomes light, bright text becomes dark
      }
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const lumRange = Math.max(1, maxLum - minLum);

    // Second pass: smooth contrast normalization preserving anti-aliasing
    for (let i = 0; i < d.length; i += 4) {
      let lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (isDarkTheme) {
        lum = 255 - lum;
      }

      // Linear stretch
      let norm = ((lum - minLum) / lumRange) * 255;

      // Gentle S-curve to sharpen characters without clipping anti-aliasing
      if (norm < 100) {
        norm = norm * 0.8; // dark text becomes richer
      } else if (norm > 160) {
        norm = 255 - (255 - norm) * 0.6; // background becomes cleaner
      }

      const finalVal = Math.max(0, Math.min(255, Math.round(norm)));
      d[i] = finalVal;
      d[i + 1] = finalVal;
      d[i + 2] = finalVal;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (_) {}

  return offscreen.toDataURL('image/png');
}

export interface RowLockSignals {
  colorScore: number;
  contrastScore: number;
  shapeScore: number;
  checkboxFound: boolean;
}

export interface RowLockAnalysisResult {
  hasLock: boolean;
  status: 'LOCK' | 'REVIEW_LOCK' | 'NO_LOCK';
  confidence: number;
  lockX: number;
  lockY: number;
  hasCheckbox: boolean;
  checkboxX?: number;
  cropUrl: string;
  signals: RowLockSignals;
  reason: string;
}

/**
 * Checks whether an RGB pixel matches the padlock visual characteristics:
 * AAM/TMS padlocks:
 * 1. Gold / Yellow / Brass (High R and G, lower B)
 * 2. Orange / Amber / Bronze
 * 3. Metallic Silver / Bright Grey in dark UI
 * 4. Distinct contrast against dark table background
 */
export function isLockCandidatePixel(r: number, g: number, b: number, darkTheme: boolean = true): boolean {
  // 1. Classic Gold / Yellow / Brass padlock body (tolerant to antialiasing)
  const isGoldOrYellow =
    r >= 75 &&
    g >= 55 &&
    (r - b) >= 12 &&
    (g - b) >= 6 &&
    r >= g - 40;

  if (isGoldOrYellow) return true;

  // 2. Amber / Bronze / Orange-brass padlock
  const isAmber =
    r >= 85 &&
    g >= 40 &&
    (r - b) >= 18 &&
    (r - g) >= 8;

  if (isAmber) return true;

  // 3. Metallic Silver / White / Light Grey padlock icon in dark UI
  if (darkTheme) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const isNeutralBright =
      lum >= 95 &&
      Math.abs(r - g) <= 32 &&
      Math.abs(g - b) <= 32 &&
      Math.abs(r - b) <= 36;
    if (isNeutralBright) return true;
  }

  return false;
}

/**
 * Requirement 3, 4, 5, 6:
 * Analyzes the visual LOCK icon specifically for a detected table row based on row Y position.
 * - Normalized relative ROI
 * - Multi-signal tolerant detection (outline, body, shackle, gold/amber, silver/contrast)
 * - Checkbox detection as position reference
 * - Produces crop preview thumbnail, confidence score, and clear status ('LOCK' | 'REVIEW_LOCK' | 'NO_LOCK')
 */
export function analyzeRowLockVisual(
  canvas: HTMLCanvasElement,
  rowCenterY: number,
  rowHeight: number,
  contentStartX?: number
): RowLockAnalysisResult {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const defaultCrop = '';
  if (!ctx || width < 50 || height < 50) {
    return {
      hasLock: false,
      status: 'NO_LOCK',
      confidence: 0,
      lockX: Math.round(width * 0.08),
      lockY: rowCenterY,
      hasCheckbox: false,
      cropUrl: defaultCrop,
      signals: { colorScore: 0, contrastScore: 0, shapeScore: 0, checkboxFound: false },
      reason: 'Canvas tidak valid'
    };
  }

  const rowH = Math.max(16, Math.min(65, rowHeight || 32));
  const searchStartY = Math.max(0, Math.round(rowCenterY - rowH * 0.65));
  const searchEndY = Math.min(height, Math.round(rowCenterY + rowH * 0.65));
  const searchH = Math.max(12, searchEndY - searchStartY);

  // Requirement 4: Deteksi Area Lock Berdasarkan Kolom (Normalized ROI)
  // X = area kiri dari content column
  const searchStartX = Math.max(0, Math.round(width * 0.015));
  let searchEndX = Math.round(width * 0.22);
  if (contentStartX && contentStartX > width * 0.08) {
    searchEndX = Math.min(contentStartX - 4, Math.round(width * 0.28));
  }
  searchEndX = Math.max(searchStartX + 40, searchEndX);
  const searchW = searchEndX - searchStartX;

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(searchStartX, searchStartY, searchW, searchH);
  } catch {
    return {
      hasLock: false,
      status: 'NO_LOCK',
      confidence: 0,
      lockX: Math.round(width * 0.08),
      lockY: rowCenterY,
      hasCheckbox: false,
      cropUrl: '',
      signals: { colorScore: 0, contrastScore: 0, shapeScore: 0, checkboxFound: false },
      reason: 'Gagal membaca pixel canvas'
    };
  }

  const d = imgData.data;

  // Requirement 7: Visual Crop Thumbnail Generator (64x36)
  let cropUrl = '';
  try {
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = 64;
    cropCanvas.height = 36;
    const cctx = cropCanvas.getContext('2d');
    if (cctx) {
      cctx.imageSmoothingEnabled = true;
      cctx.imageSmoothingQuality = 'high';
      cctx.drawImage(canvas, searchStartX, searchStartY, searchW, searchH, 0, 0, 64, 36);
      cropUrl = cropCanvas.toDataURL('image/png');
    }
  } catch (_) {}

  // 1. Calculate row background luminance (lower quartile)
  const lums: number[] = [];
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    lums.push(lum);
  }
  lums.sort((a, b) => a - b);
  const bgLum = lums.length > 0 ? lums[Math.floor(lums.length * 0.25)] : 30;
  const isDarkTheme = bgLum < 130;

  // 2. Requirement 6: Gunakan Checkbox sebagai referensi posisi
  let hasCheckbox = false;
  let checkboxRightRelX = 0;
  let checkboxXRel = 0;

  const checkZoneW = Math.round(searchW * 0.42);
  for (let x = 2; x < checkZoneW - 8; x++) {
    let borderCount = 0;
    for (let y = 3; y < searchH - 3; y++) {
      const idx = (y * searchW + x) * 4;
      const lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
      if (Math.abs(lum - bgLum) >= 26) {
        borderCount++;
      }
    }
    if (borderCount >= 5 && borderCount <= 24) {
      for (let span = 7; span <= 18; span++) {
        if (x + span >= checkZoneW) break;
        let rightBorderCount = 0;
        for (let y = 3; y < searchH - 3; y++) {
          const idx = (y * searchW + (x + span)) * 4;
          const lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
          if (Math.abs(lum - bgLum) >= 26) rightBorderCount++;
        }
        if (rightBorderCount >= 4 && rightBorderCount <= 24) {
          hasCheckbox = true;
          checkboxXRel = x;
          checkboxRightRelX = x + span;
          break;
        }
      }
      if (hasCheckbox) break;
    }
  }

  // 3. Search range for lock within the ROI:
  const lockSearchStartRelX = hasCheckbox
    ? Math.min(searchW - 16, checkboxRightRelX + 2)
    : Math.round(searchW * 0.12);
  const lockSearchEndRelX = hasCheckbox
    ? Math.min(searchW, checkboxRightRelX + Math.round(width * 0.10))
    : Math.round(searchW * 0.90);

  // 4. Requirement 5: Multiple visual signals
  let goldPixelCount = 0;
  let brightPixelCount = 0;
  let minClusterX = searchW;
  let maxClusterX = 0;
  let minClusterY = searchH;
  let maxClusterY = 0;

  for (let y = 2; y < searchH - 2; y++) {
    for (let x = lockSearchStartRelX; x < lockSearchEndRelX; x++) {
      const idx = (y * searchW + x) * 4;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Color signal: Gold / Yellow / Amber
      const isGold =
        r >= 70 &&
        g >= 50 &&
        (r - b) >= 10 &&
        (g - b) >= 5 &&
        r >= g - 40;

      const isAmber =
        r >= 80 &&
        g >= 35 &&
        (r - b) >= 15 &&
        (r - g) >= 8;

      if (isGold || isAmber) {
        goldPixelCount++;
        if (x < minClusterX) minClusterX = x;
        if (x > maxClusterX) maxClusterX = x;
        if (y < minClusterY) minClusterY = y;
        if (y > maxClusterY) maxClusterY = y;
      }

      // Bright / Contrast signal
      const contrast = isDarkTheme ? lum - bgLum : bgLum - lum;
      if (contrast >= 28 && lum >= 70) {
        brightPixelCount++;
        if (x < minClusterX) minClusterX = x;
        if (x > maxClusterX) maxClusterX = x;
        if (y < minClusterY) minClusterY = y;
        if (y > maxClusterY) maxClusterY = y;
      }
    }
  }

  // 5. Score Calculation
  let colorScore = 0;
  if (goldPixelCount >= 18) colorScore = 65;
  else if (goldPixelCount >= 8) colorScore = 48;
  else if (goldPixelCount >= 4) colorScore = 32;
  else if (goldPixelCount >= 2) colorScore = 18;

  let contrastScore = 0;
  if (brightPixelCount >= 22) contrastScore = 45;
  else if (brightPixelCount >= 10) contrastScore = 32;
  else if (brightPixelCount >= 5) contrastScore = 20;

  let shapeScore = 0;
  let estimatedLockX = searchStartX + Math.round(searchW * 0.5);
  let estimatedLockY = rowCenterY;

  if (maxClusterX > minClusterX && maxClusterY > minClusterY) {
    const clusterW = maxClusterX - minClusterX;
    const clusterH = maxClusterY - minClusterY;
    const aspect = clusterW / Math.max(1, clusterH);

    estimatedLockX = searchStartX + Math.round((minClusterX + maxClusterX) / 2);
    estimatedLockY = searchStartY + Math.round((minClusterY + maxClusterY) / 2);

    if (aspect >= 0.40 && aspect <= 1.6 && clusterH >= 6 && clusterH <= 36) {
      shapeScore += 30;
      const midY = minClusterY + Math.floor(clusterH * 0.45);
      let topPixels = 0;
      let bottomPixels = 0;
      for (let y = minClusterY; y < maxClusterY; y++) {
        for (let x = minClusterX; x <= maxClusterX; x++) {
          const idx = (y * searchW + x) * 4;
          const lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
          if ((isDarkTheme && lum - bgLum >= 26) || (d[idx] >= 70 && (d[idx] - d[idx + 2]) >= 10)) {
            if (y < midY) topPixels++;
            else bottomPixels++;
          }
        }
      }
      if (topPixels >= 2 && bottomPixels >= 3) {
        shapeScore += 15;
      }
    }
  }

  let totalScore = Math.max(colorScore, contrastScore) + shapeScore * 0.6;
  if (hasCheckbox && (colorScore > 0 || contrastScore > 0)) {
    totalScore += 14; // Checkbox alignment bonus
  }

  const confidence = Math.min(100, Math.round(totalScore));

  let status: 'LOCK' | 'REVIEW_LOCK' | 'NO_LOCK' = 'NO_LOCK';
  let reason = '';

  if (confidence >= 50) {
    status = 'LOCK';
    reason = `Icon LOCK terdeteksi (Conf: ${confidence}%, Warna: ${colorScore}, Bentuk: ${shapeScore}, Checkbox: ${hasCheckbox ? 'Ya' : 'Tidak'})`;
  } else if (confidence >= 22) {
    status = 'REVIEW_LOCK';
    reason = `Sinyal LOCK menengah (Conf: ${confidence}%, perlu review visual oleh operator)`;
  } else {
    status = 'NO_LOCK';
    reason = `Tidak ditemukan icon LOCK pada koordinat kolom (Conf: ${confidence}%, background datar)`;
  }

  return {
    hasLock: status === 'LOCK',
    status,
    confidence,
    lockX: estimatedLockX,
    lockY: estimatedLockY,
    hasCheckbox,
    checkboxX: hasCheckbox ? searchStartX + checkboxXRel : undefined,
    cropUrl,
    signals: {
      colorScore,
      contrastScore,
      shapeScore,
      checkboxFound: hasCheckbox
    },
    reason
  };
}

/**
 * Robust Visual Lock (🔒) Detector:
 * Scans horizontally across the table icon area to locate the Lock column alignment.
 * Bridges vertical shackle-body gaps (up to 4px) so that padlocks are never split and lost!
 */
export function detectVisualLocks(canvas: HTMLCanvasElement): VisualLock[] {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const width = canvas.width;
  const height = canvas.height;

  // Check if screenshot is predominantly dark theme
  let sampleLumSum = 0;
  const cornerSampleData = ctx.getImageData(10, 10, 20, 20).data;
  for (let i = 0; i < cornerSampleData.length; i += 4) {
    sampleLumSum += 0.299 * cornerSampleData[i] + 0.587 * cornerSampleData[i + 1] + 0.114 * cornerSampleData[i + 2];
  }
  const isDarkTheme = sampleLumSum / (cornerSampleData.length / 4) < 130;

  // Search region for the Lock column: 1% to 38% of width
  const searchStartX = Math.max(0, Math.round(width * 0.01));
  const searchEndX = Math.min(width, Math.round(width * 0.38));
  const searchW = searchEndX - searchStartX;
  const startY = Math.round(height * 0.05);
  const endY = Math.round(height * 0.96);
  const searchH = endY - startY;

  if (searchW <= 20 || searchH <= 20) return [];

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(searchStartX, startY, searchW, searchH);
  } catch {
    return [];
  }

  const d = imgData.data;

  // 1. Compute Horizontal Histogram across X to locate the exact Lock Column
  const colScores = new Int32Array(searchW);

  for (let y = 0; y < searchH; y += 2) {
    for (let x = 0; x < searchW; x += 2) {
      const idx = (y * searchW + x) * 4;
      if (isLockCandidatePixel(d[idx], d[idx + 1], d[idx + 2], isDarkTheme)) {
        colScores[x]++;
      }
    }
  }

  // Smooth the column histogram with a window to find the peak column
  const windowSize = 16;
  let bestWindowSum = 0;
  let bestWindowCenter = Math.round(searchW * 0.12);

  for (let x = 0; x < searchW - windowSize; x++) {
    let sum = 0;
    for (let w = 0; w < windowSize; w++) {
      sum += colScores[x + w];
    }
    if (sum > bestWindowSum) {
      bestWindowSum = sum;
      bestWindowCenter = x + Math.floor(windowSize / 2);
    }
  }

  // Determine the lock column strip
  const lockColCenterX = searchStartX + bestWindowCenter;
  const stripHalfW = Math.max(18, Math.round(width * 0.025));
  const lockStripX = Math.max(0, lockColCenterX - stripHalfW);
  const lockStripW = Math.min(width - lockStripX, stripHalfW * 2);

  // 2. Scan along this lock column strip vertically to find each padlock icon
  let stripData: ImageData;
  try {
    stripData = ctx.getImageData(lockStripX, startY, lockStripW, searchH);
  } catch {
    return [];
  }

  const sd = stripData.data;
  const rowLockPixelCounts = new Int32Array(searchH);

  for (let y = 0; y < searchH; y++) {
    let count = 0;
    for (let x = 0; x < lockStripW; x++) {
      const idx = (y * lockStripW + x) * 4;
      if (isLockCandidatePixel(sd[idx], sd[idx + 1], sd[idx + 2], isDarkTheme)) {
        count++;
      }
    }
    rowLockPixelCounts[y] = count;
  }

  // Detect vertical clusters with gap bridging for padlock shackle + body
  const clusters: Array<{ startY: number; endY: number; peakCount: number }> = [];
  let inCluster = false;
  let currentStart = 0;
  let currentPeak = 0;
  let gapCount = 0;
  const MAX_GAP = 4; // allow up to 4px hollow gap between shackle and body

  for (let y = 0; y < searchH; y++) {
    if (rowLockPixelCounts[y] >= 2) {
      if (!inCluster) {
        inCluster = true;
        currentStart = y;
        currentPeak = rowLockPixelCounts[y];
        gapCount = 0;
      } else {
        gapCount = 0;
        if (rowLockPixelCounts[y] > currentPeak) {
          currentPeak = rowLockPixelCounts[y];
        }
      }
    } else {
      if (inCluster) {
        gapCount++;
        if (gapCount > MAX_GAP) {
          inCluster = false;
          const actualEndY = y - gapCount;
          const clusterHeight = actualEndY - currentStart;
          if (clusterHeight >= 6 && clusterHeight <= 50 && currentPeak >= 2) {
            clusters.push({
              startY: currentStart,
              endY: actualEndY,
              peakCount: currentPeak
            });
          }
        }
      }
    }
  }

  if (inCluster) {
    const clusterHeight = searchH - currentStart - gapCount;
    if (clusterHeight >= 6 && clusterHeight <= 50 && currentPeak >= 2) {
      clusters.push({
        startY: currentStart,
        endY: searchH - gapCount,
        peakCount: currentPeak
      });
    }
  }

  const detectedLocks: VisualLock[] = [];

  for (const cluster of clusters) {
    let minX = lockStripW;
    let maxX = 0;
    let validPixels = 0;

    for (let y = cluster.startY; y < cluster.endY; y++) {
      for (let x = 0; x < lockStripW; x++) {
        const idx = (y * lockStripW + x) * 4;
        if (isLockCandidatePixel(sd[idx], sd[idx + 1], sd[idx + 2], isDarkTheme)) {
          validPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    const boxW = Math.max(1, maxX - minX);
    const boxH = cluster.endY - cluster.startY;
    const aspect = boxW / boxH;

    // Padlock icon aspect ratio: 0.25 to 2.8, with at least 5 valid pixels
    if (validPixels >= 5 && aspect >= 0.25 && aspect <= 2.8) {
      const globalY = startY + cluster.startY;
      const globalCenterY = Math.round(globalY + boxH / 2);

      detectedLocks.push({
        x: lockStripX + minX,
        y: globalY,
        width: boxW,
        height: boxH,
        centerY: globalCenterY,
        confidence: Math.min(100, Math.round((validPixels / (boxW * boxH)) * 100))
      });
    }
  }

  // Deduplicate locks that are too close vertically (< 10px apart)
  const mergedLocks: VisualLock[] = [];
  for (const lock of detectedLocks) {
    const existing = mergedLocks.find((m) => Math.abs(m.centerY - lock.centerY) < 10);
    if (!existing) {
      mergedLocks.push(lock);
    } else {
      if (lock.confidence > existing.confidence) {
        existing.y = lock.y;
        existing.centerY = lock.centerY;
        existing.confidence = lock.confidence;
      }
    }
  }

  mergedLocks.sort((a, b) => a.centerY - b.centerY);
  return mergedLocks;
}

/**
 * Preprocess full table or broad region for multi-line Browser OCR with Coordinates:
 * - Upscales 2x
 * - Polarity normalizer: inverts white-on-dark text to black-on-white text
 * - Dynamic contrast enhancement for neural OCR engines
 */
export function preprocessTableForBrowserOcr(
  sourceCanvas: HTMLCanvasElement,
  cropArea: { x: number; y: number; width: number; height: number },
  scale = 2.0
): { canvas: HTMLCanvasElement; dataUrl: string } {
  const targetW = Math.max(20, Math.round(cropArea.width * scale));
  const targetH = Math.max(20, Math.round(cropArea.height * scale));

  const offscreen = document.createElement('canvas');
  offscreen.width = targetW;
  offscreen.height = targetH;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { canvas: offscreen, dataUrl: '' };

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    sourceCanvas,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    targetW,
    targetH
  );

  try {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;

    // Detect if dark theme
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
        norm = norm * 0.75; // Rich dark text
      } else if (norm > 155) {
        norm = 255 - (255 - norm) * 0.5; // Clean crisp background
      }
      const val = Math.max(0, Math.min(255, Math.round(norm)));
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (_) {}

  return { canvas: offscreen, dataUrl: offscreen.toDataURL('image/png') };
}

/**
 * Computes table rows using Lock Anchors:
 * Each row Y is anchored directly to the detected padlock.
 * Content Column starts dynamically relative to the Lock position:
 * - Content Column starts around lockX + 11% to 15% width (safely skips Checkbox, Lock, Icon, Language, Type)
 * - Guarantees NO cutting off the first characters of the title (e.g. "Aveng" in "AvengEndgamEnc", "Heart" in "HeartOfTheBeast")
 * - Stops at ~82% width before the Duration column
 */
export function buildTableRowsFromLocks(
  canvas: HTMLCanvasElement,
  locks: VisualLock[]
): DetectedTableRow[] {
  const width = canvas.width;
  const height = canvas.height;

  if (locks.length === 0) {
    return [];
  }

  // Calculate median lock X coordinate
  const lockXs = locks.map((l) => l.x).sort((a, b) => a - b);
  const medianLockX = lockXs[Math.floor(lockXs.length / 2)];

  // Content Column boundary:
  // Starts safely to the right of the lock column (after language / type column)
  // Distance from lock to content in Screenwriter is typically ~11% to 15% of width
  const contentX = Math.min(
    Math.round(width * 0.38),
    Math.max(Math.round(width * 0.16), Math.round(medianLockX + Math.max(70, width * 0.11)))
  );

  // Content width goes up to 82% of screen width (before Duration column)
  const contentEndX = Math.round(width * 0.82);
  const contentWidth = Math.max(200, contentEndX - contentX);

  let medianRowHeight = 32;
  if (locks.length >= 2) {
    const spacings: number[] = [];
    for (let i = 1; i < locks.length; i++) {
      const delta = locks[i].centerY - locks[i - 1].centerY;
      if (delta >= 18 && delta <= 65) {
        spacings.push(delta);
      }
    }
    if (spacings.length > 0) {
      spacings.sort((a, b) => a - b);
      medianRowHeight = spacings[Math.floor(spacings.length / 2)];
    }
  } else {
    medianRowHeight = Math.max(28, Math.round(locks[0].height * 2.2));
  }

  const rows: DetectedTableRow[] = [];

  locks.forEach((lock, idx) => {
    // Generous row height (+/- 4px) to ensure no character ascenders/descenders are clipped
    const safeH = Math.min(Math.round(medianRowHeight * 1.1), height - 10);
    const rowY = Math.max(0, Math.round(lock.centerY - safeH * 0.5));
    const rowH = Math.min(safeH, height - rowY);

    rows.push({
      rowIndex: idx + 1,
      y: rowY,
      height: rowH,
      hasLock: true,
      lockAnchor: lock,
      contentX,
      contentWidth
    });
  });

  return rows;
}

/**
 * Fallback Row Detector:
 * Used ONLY if 0 locks were found by visual color/cluster detector (e.g. grayscale screenshot).
 */
export function fallbackDetectTableRows(canvas: HTMLCanvasElement): DetectedTableRow[] {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const width = canvas.width;
  const height = canvas.height;

  const contentX = Math.round(width * 0.22);
  const contentWidth = Math.round(width * 0.60);

  const startY = Math.round(height * 0.08);
  const endY = Math.round(height * 0.94);
  const sampleX = Math.round(width * 0.15);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(sampleX, 0, 1, height);
  } catch {
    return [];
  }

  const d = imgData.data;
  const diffs: number[] = [];
  for (let y = startY; y < endY - 1; y++) {
    const diff = Math.abs(d[y * 4] - d[(y + 1) * 4]);
    if (diff > 16) {
      diffs.push(y);
    }
  }

  let rowHeight = 32;
  if (diffs.length >= 4) {
    const intervals: number[] = [];
    for (let i = 1; i < diffs.length; i++) {
      const delta = diffs[i] - diffs[i - 1];
      if (delta >= 18 && delta <= 55) {
        intervals.push(delta);
      }
    }
    if (intervals.length >= 3) {
      intervals.sort((a, b) => a - b);
      rowHeight = intervals[Math.floor(intervals.length / 2)];
    }
  }

  const rows: DetectedTableRow[] = [];
  let currY = startY;
  let idx = 1;

  while (currY + rowHeight <= endY) {
    rows.push({
      rowIndex: idx++,
      y: currY,
      height: rowHeight,
      hasLock: true,
      contentX,
      contentWidth
    });
    currY += rowHeight;
  }

  return rows;
}

/**
 * Calculates Levenshtein Distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculates similarity ratio between 0 and 1
 */
function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

/**
 * Breaks a camelCase or concatenated string into uppercase word tokens:
 * e.g. "AvengEndgamEnc" -> ["AVENG", "ENDGAM", "ENC"]
 * e.g. "HeartOfTheBeast" -> ["HEART", "OF", "THE", "BEAST"]
 * e.g. "BABYUDONREV" -> ["BABYUDONREV"]
 */
function tokenizeStem(stem: string): string[] {
  const spaced = stem
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]/g, ' ')
    .trim();

  return spaced
    .split(/\s+/)
    .map((t) => t.toUpperCase())
    .filter((t) => t.length > 0);
}

/**
 * MASTER FILM MATCHING ENGINE (Single Source of Truth):
 * Strictly matches RAW CONTENT against Master Film Tahunan.
 * Priority:
 * 1. Exact match (case-insensitive)
 * 2. Singkatan match (e.g. AEE, AVENG)
 * 3. Alphanumeric match (clean spaces/symbols, e.g. "HEARTOFTHEBEAST" === "HEARTOFTHEBEAST")
 * 4. ISDCF CPL Acronym / Word Prefix Match (e.g. "AvengEndgamEnc" -> "AVENGERS ENDGAME ENCORE")
 * 5. Word Stem Prefix Containment (e.g. "BABYUDONREV" -> "BABY UDON")
 * 6. High-confidence Fuzzy Match (handles 1-2 character OCR misreads)
 *
 * If no master film matches -> returns matched: null, needsManual: true!
 * NO GUESSING OR HALLUCINATING FILM TITLES.
 */
export function matchToMasterFilm(
  rawContentName: string,
  masterFilms: FilmUpload[]
): {
  matched: FilmUpload | null;
  needsManual: boolean;
  officialTitle: string;
  singkatan: string;
} {
  const stem = extractTitleStem(rawContentName);
  const cleanStemUpper = stem.toUpperCase().replace(/\s+/g, ' ').trim();
  const cleanStemAlpha = cleanStemUpper.replace(/[^A-Z0-9]/g, '');
  const stemTokens = tokenizeStem(stem);

  if (!cleanStemAlpha) {
    return {
      matched: null,
      needsManual: true,
      officialTitle: rawContentName,
      singkatan: ''
    };
  }

  // Tier 1: Exact match (case-insensitive)
  for (const master of masterFilms) {
    const masterTitleUpper = (master.judul_film || '').trim().toUpperCase();
    if (cleanStemUpper === masterTitleUpper) {
      return {
        matched: master,
        needsManual: false,
        officialTitle: master.judul_film.toUpperCase(),
        singkatan: (master.singkatan_film || '').toUpperCase()
      };
    }
  }

  // Tier 2: Singkatan match
  for (const master of masterFilms) {
    const masterSingkatan = (master.singkatan_film || '').trim().toUpperCase();
    if (masterSingkatan && masterSingkatan.length >= 2) {
      if (cleanStemAlpha === masterSingkatan || stemTokens[0] === masterSingkatan) {
        return {
          matched: master,
          needsManual: false,
          officialTitle: master.judul_film.toUpperCase(),
          singkatan: masterSingkatan
        };
      }
    }
  }

  // Tier 3: Alphanumeric Match (ignoring spaces & punctuation)
  // e.g. "HEARTOFTHEBEAST" matches "HEART OF THE BEAST"
  for (const master of masterFilms) {
    const masterAlpha = (master.judul_film || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanStemAlpha === masterAlpha) {
      return {
        matched: master,
        needsManual: false,
        officialTitle: master.judul_film.toUpperCase(),
        singkatan: (master.singkatan_film || '').toUpperCase()
      };
    }
  }

  // Tier 4: ISDCF CamelCase / Word Stem Prefix Match
  // e.g. Stem: "AvengEndgamEnc" -> Tokens: ["AVENG", "ENDGAM", "ENC"]
  // Master: "AVENGERS ENDGAME ENCORE" -> Words: ["AVENGERS", "ENDGAME", "ENCORE"]
  // e.g. Stem: "HeartOfTheBeast" -> Tokens: ["HEART", "OF", "THE", "BEAST"]
  if (stemTokens.length >= 2) {
    for (const master of masterFilms) {
      const masterWords = (master.judul_film || '')
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      if (masterWords.length >= 2) {
        let matchingTokens = 0;
        let masterIdx = 0;

        for (const token of stemTokens) {
          while (masterIdx < masterWords.length) {
            if (masterWords[masterIdx].startsWith(token) || token.startsWith(masterWords[masterIdx])) {
              matchingTokens++;
              masterIdx++;
              break;
            }
            masterIdx++;
          }
        }

        if (matchingTokens >= 2 && matchingTokens >= Math.min(stemTokens.length, masterWords.length) * 0.6) {
          return {
            matched: master,
            needsManual: false,
            officialTitle: master.judul_film.toUpperCase(),
            singkatan: (master.singkatan_film || '').toUpperCase()
          };
        }
      }
    }
  }

  // Tier 5: Prefix / Substring Containment
  // e.g. "BABYUDONREV" starts with "BABYUDON"
  // e.g. "HEARTOFTHEBEAST" starts with "HEART"
  for (const master of masterFilms) {
    const masterAlpha = (master.judul_film || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (masterAlpha.length >= 4) {
      if (cleanStemAlpha.startsWith(masterAlpha)) {
        return {
          matched: master,
          needsManual: false,
          officialTitle: master.judul_film.toUpperCase(),
          singkatan: (master.singkatan_film || '').toUpperCase()
        };
      }
      if (cleanStemAlpha.length >= 6 && masterAlpha.startsWith(cleanStemAlpha)) {
        return {
          matched: master,
          needsManual: false,
          officialTitle: master.judul_film.toUpperCase(),
          singkatan: (master.singkatan_film || '').toUpperCase()
        };
      }
    }
  }

  // Tier 6: High-confidence Fuzzy Match (handles OCR letter misreads like 'W' instead of 'A')
  let bestMaster: FilmUpload | null = null;
  let bestScore = 0;

  for (const master of masterFilms) {
    const masterAlpha = (master.judul_film || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!masterAlpha) continue;

    const scoreAlpha = similarityScore(cleanStemAlpha, masterAlpha);
    if (scoreAlpha > bestScore) {
      bestScore = scoreAlpha;
      bestMaster = master;
    }

    const masterWords = (master.judul_film || '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    if (masterWords.length >= 2) {
      const syntheticStem = masterWords
        .map((w, idx) => (idx === masterWords.length - 1 ? w.substring(0, 3) : w.substring(0, Math.min(6, w.length))))
        .join('');

      const scoreSynthetic = similarityScore(cleanStemAlpha, syntheticStem);
      if (scoreSynthetic > bestScore) {
        bestScore = scoreSynthetic;
        bestMaster = master;
      }
    }
  }

  // Strict high confidence threshold: at least 72% similarity
  if (bestMaster && bestScore >= 0.72) {
    return {
      matched: bestMaster,
      needsManual: false,
      officialTitle: bestMaster.judul_film.toUpperCase(),
      singkatan: (bestMaster.singkatan_film || '').toUpperCase()
    };
  }

  // Match failed: strictly mark as PERLU DICOCOKKAN, DO NOT GUESS!
  return {
    matched: null,
    needsManual: true,
    officialTitle: cleanStemUpper || rawContentName,
    singkatan: ''
  };
}

/**
 * Main Smart Screenshot Scanner:
 * 1. VISUAL LOCK DETECTION (🔒) - Strict primary filter!
 * 2. LOCK COORDINATES -> ROW EXTRACTION
 * 3. CONTENT COLUMN EXTRACTION (Avoids Checkbox, Lock, Icon, ID, Feature, Duration)
 * 4. OCR RAW CONTENT (Enhanced Image Polarity & Upscaling with Smooth Anti-Aliasing)
 * 5. STORE rawContentName
 * 6. EXCLUDE LSF / LDR / TRAILER / PROMO / NON-FILM
 * 7. NORMALIZE FOR MATCHING ONLY
 * 8. MASTER FILM MATCHING (Master Film is Single Source of Truth)
 * 9. NEVER DROP LOCKED ROWS: If OCR fails or is empty, retain as "PERLU DICOCOKKAN"
 * 10. GROUP BY MASTER FILM ID (Single row for multiple versions like 5.1, 7.1, Atmos)
 * 11. DEDUP & READY FOR REVIEW
 */
export async function runSmartScreenshotScanner(
  screenshotDataUrls: string[],
  masterFilms: FilmUpload[],
  onProgress?: (percent: number, stepText: string) => void
): Promise<ScanResultPayload> {
  if (screenshotDataUrls.length === 0) return { films: [], excludedCount: 0 };

  onProgress?.(5, 'MEMPERSIAPKAN GAMBAR SCREENSHOT...');

  const worker = await getOcrWorker((pct, txt) => onProgress?.(pct, txt));

  const rawCandidates: Array<{
    rawContentName: string;
    canonicalTitle: string;
    singkatan?: string;
    variantTag: string;
    formatSound: string;
    formatFilm: string;
    hasLock: boolean;
    screenshotIndex: number;
    matchedFilm: FilmUpload | null;
    needsManual: boolean;
    confidence: 'high' | 'medium' | 'low';
  }> = [];

  let excludedNonFilmCount = 0;
  const detectedLocksByScreenshot: Record<number, VisualLock[]> = {};

  for (let sIdx = 0; sIdx < screenshotDataUrls.length; sIdx++) {
    const sUrl = screenshotDataUrls[sIdx];
    const sNumber = sIdx + 1;

    onProgress?.(
      15 + Math.round((sIdx / screenshotDataUrls.length) * 20),
      `DETEKSI VISUAL 🔒 & STRUKTUR TABEL (Screenshot ${sNumber} dari ${screenshotDataUrls.length})...`
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

    // STEP 1: DETEKSI VISUAL GEMBOK 🔒 (PRIMARY SIGNAL)
    const detectedLocks = detectVisualLocks(canvas);
    detectedLocksByScreenshot[sNumber] = detectedLocks;

    // STRICT PRIMARY GATE: Jika sama sekali tidak ada lock dan tidak ada baris, lewati
    if (detectedLocks.length === 0) {
      continue;
    }

    // Hitung rata-rata posisi kolom lock & perkiraan Content Column
    const lockXs = detectedLocks.map((l) => l.x).sort((a, b) => a - b);
    const medianLockX = lockXs[Math.floor(lockXs.length / 2)];

    // Content Column boundaries:
    // Mulai setelah kolom lock, icon, language, dan type (~11% ke kanan dari gembok)
    const contentX = Math.min(
      Math.round(width * 0.38),
      Math.max(Math.round(width * 0.16), Math.round(medianLockX + Math.max(70, width * 0.11)))
    );
    const contentEndX = Math.round(width * 0.83);
    const contentWidth = Math.max(200, contentEndX - contentX);

    let medianRowHeight = 32;
    if (detectedLocks.length >= 2) {
      const spacings: number[] = [];
      for (let i = 1; i < detectedLocks.length; i++) {
        const delta = detectedLocks[i].centerY - detectedLocks[i - 1].centerY;
        if (delta >= 18 && delta <= 65) {
          spacings.push(delta);
        }
      }
      if (spacings.length > 0) {
        spacings.sort((a, b) => a - b);
        medianRowHeight = spacings[Math.floor(spacings.length / 2)];
      }
    }

    onProgress?.(
      35 + Math.round((sIdx / screenshotDataUrls.length) * 15),
      `BROWSER OCR DENGAN KOORDINAT (Screenshot ${sNumber})...`
    );

    // STEP 2: BROWSER OCR TABLE PARSING DENGAN KOORDINAT (BENCHMARK APPROACH)
    // Preprocess area tabel: upscale 2x, normalisasi polaritas (dark-mode ke dark text on white)
    const tableStartY = Math.max(0, Math.round(height * 0.05));
    const tableEndY = Math.min(height, Math.round(height * 0.96));
    const tableH = tableEndY - tableStartY;

    const preprocessedTable = preprocessTableForBrowserOcr(
      canvas,
      { x: 0, y: tableStartY, width: width, height: tableH },
      2.0
    );

    // Konfigurasi worker untuk multi-line tabular text extraction
    await worker.setParameters({
      tessedit_pageseg_mode: '4' as any, // Single column of variable text
      preserve_interword_spaces: '1'
    });

    let ocrLines: Array<{
      text: string;
      origY0: number;
      origY1: number;
      origCenterY: number;
    }> = [];

    try {
      const fullOcr = await worker.recognize(preprocessedTable.dataUrl);
      const rawLines: any[] = [];
      if (fullOcr.data.blocks) {
        for (const block of fullOcr.data.blocks) {
          if (block.paragraphs) {
            for (const para of block.paragraphs) {
              if (para.lines) {
                rawLines.push(...para.lines);
              }
            }
          }
        }
      }
      const allLines = rawLines.length > 0 ? rawLines : ((fullOcr.data as any).lines || []);

      if (allLines && allLines.length > 0) {
        ocrLines = allLines.map((l: any) => {
          const origY0 = tableStartY + Math.round(l.bbox.y0 / 2.0);
          const origY1 = tableStartY + Math.round(l.bbox.y1 / 2.0);
          return {
            text: l.text || '',
            origY0,
            origY1,
            origCenterY: Math.round((origY0 + origY1) / 2)
          };
        });
      }
    } catch (e) {
      console.warn('Browser OCR full table error:', e);
    }

    // Set untuk melacak gembok mana saja yang sudah berhasil dipasangkan ke baris OCR
    const matchedLockIndices = new Set<number>();

    // STEP 3: FILTER LOCK & EKSTRAKSI CONTENT COLUMN DARI HASIL OCR
    for (const ocrLine of ocrLines) {
      const lineText = ocrLine.text.trim();
      if (!lineText) continue;

      // Periksa apakah baris ini memiliki LOCK 🔒 secara visual
      // Cari apakah ada detectedLock pada rentang Y baris ini
      let matchedLockIdx = -1;
      for (let lIdx = 0; lIdx < detectedLocks.length; lIdx++) {
        const lock = detectedLocks[lIdx];
        const dist = Math.abs(lock.centerY - ocrLine.origCenterY);
        const rowTolerance = Math.max(16, (ocrLine.origY1 - ocrLine.origY0) * 1.1);
        if (dist <= rowTolerance) {
          matchedLockIdx = lIdx;
          break;
        }
      }

      // ATURAN MUTLAK USER:
      // TIDAK ADA LOCK 🔒 -> ABAIKAN BARIS! (Contoh: Awake_Brain_Surgery_... = IGNORE)
      if (matchedLockIdx === -1) {
        continue;
      }

      matchedLockIndices.add(matchedLockIdx);

      // Baris MEMILIKI LOCK 🔒: Ekstraksi hanya Content Name (tanpa ID, Feature, Duration)
      let rawContentName = extractRawContentName(lineText);

      // Jika teks hasil multi-line OCR masih mengandung noise atau kurang bersih,
      // lakukan single-line crop OCR terarah pada Content Column baris tersebut
      if (rawContentName.length < 3 || !rawContentName.includes('_')) {
        const safeH = Math.min(medianRowHeight + 6, height - ocrLine.origY0);
        const cropDataUrl = preprocessTextRegion(
          canvas,
          contentX,
          Math.max(0, ocrLine.origY0 - 3),
          contentWidth,
          safeH,
          2.2
        );
        try {
          await worker.setParameters({ tessedit_pageseg_mode: '7' as any });
          const singleRes = await worker.recognize(cropDataUrl);
          const singleClean = extractRawContentName(singleRes.data?.text || '');
          if (singleClean.length >= 2) {
            rawContentName = singleClean;
          }
        } catch (_) {}
      }

      // FILTER NON-FILM: LSF, LDR, Trailer, Promo, Policy otomatis diabaikan
      if (rawContentName && isNonFilmContent(rawContentName)) {
        excludedNonFilmCount++;
        continue;
      }

      // Validasi & Simpan Candidate
      if (rawContentName.length >= 2) {
        const specs = extractTechnicalSpecs(rawContentName);
        const matchRes = matchToMasterFilm(rawContentName, masterFilms);

        rawCandidates.push({
          rawContentName,
          canonicalTitle: matchRes.officialTitle,
          singkatan: matchRes.singkatan,
          variantTag: specs.variantTag,
          formatSound: matchRes.matched?.format_sound || specs.formatSound,
          formatFilm: matchRes.matched?.format_film || specs.formatFilm,
          hasLock: true,
          screenshotIndex: sNumber,
          matchedFilm: matchRes.matched,
          needsManual: matchRes.needsManual,
          confidence: matchRes.matched ? 'high' : 'medium'
        });
      } else {
        // Baris bergembok tetapi OCR belum terbaca sempurna:
        // Sesuai Requirement 5 & 11: JANGAN gunakan placeholder dummy, gunakan rawCpl = "", title = "PERLU DICOCOKKAN"
        rawCandidates.push({
          rawContentName: '',
          canonicalTitle: 'PERLU DICOCOKKAN',
          singkatan: '',
          variantTag: '5.1',
          formatSound: '5.1',
          formatFilm: '2D Flat',
          hasLock: true,
          screenshotIndex: sNumber,
          matchedFilm: null,
          needsManual: true,
          confidence: 'low'
        });
      }
    }

    // STEP 4: RULE "SATU LOCK = SATU RAW CANDIDATE" (SAFETY NET UNTUK GEMBOK YANG BELUM KENA OCR)
    // Jika ada gembok yang belum terpasangkan ke baris OCR (misal teks kontras rendah),
    // lakukan crop OCR langsung pada posisi Y gembok tersebut agar tidak ada film terlewat!
    for (let lIdx = 0; lIdx < detectedLocks.length; lIdx++) {
      if (matchedLockIndices.has(lIdx)) continue;

      const lock = detectedLocks[lIdx];
      const safeH = Math.min(medianRowHeight + 6, height - 10);
      const rowY = Math.max(0, Math.round(lock.centerY - safeH * 0.5));

      const cropDataUrl = preprocessTextRegion(
        canvas,
        contentX,
        rowY,
        contentWidth,
        safeH,
        2.2
      );

      let recognizedText = '';
      try {
        await worker.setParameters({ tessedit_pageseg_mode: '7' as any });
        const res = await worker.recognize(cropDataUrl);
        recognizedText = (res.data?.text || '').trim();
      } catch (_) {}

      const rawContentName = extractRawContentName(recognizedText);

      if (rawContentName && isNonFilmContent(rawContentName)) {
        excludedNonFilmCount++;
        continue;
      }

      if (rawContentName.length >= 2) {
        const specs = extractTechnicalSpecs(rawContentName);
        const matchRes = matchToMasterFilm(rawContentName, masterFilms);

        rawCandidates.push({
          rawContentName,
          canonicalTitle: matchRes.officialTitle,
          singkatan: matchRes.singkatan,
          variantTag: specs.variantTag,
          formatSound: matchRes.matched?.format_sound || specs.formatSound,
          formatFilm: matchRes.matched?.format_film || specs.formatFilm,
          hasLock: true,
          screenshotIndex: sNumber,
          matchedFilm: matchRes.matched,
          needsManual: matchRes.needsManual,
          confidence: matchRes.matched ? 'high' : 'medium'
        });
      } else {
        // Teks gagal terbaca, tapi baris MEMPUNYAI LOCK 🔒 SECARA VISUAL:
        // Sesuai Requirement 5 & 11: JANGAN gunakan placeholder dummy, gunakan rawCpl = "", title = "PERLU DICOCOKKAN"
        rawCandidates.push({
          rawContentName: '',
          canonicalTitle: 'PERLU DICOCOKKAN',
          singkatan: '',
          variantTag: '5.1',
          formatSound: '5.1',
          formatFilm: '2D Flat',
          hasLock: true,
          screenshotIndex: sNumber,
          matchedFilm: null,
          needsManual: true,
          confidence: 'low'
        });
      }
    }
  }

  onProgress?.(85, 'PENGELOMPOKKAN BERDASARKAN MASTER FILM ID & DEDUP...');

  // STEP 5: PENGELOMPOKKAN & DEDUPLIKASI DENGAN CONTENT FAMILY KEY
  // PRIORITAS 1: Master Film Match -> canonical identity = Master Film
  // PRIORITAS 2: Content Family Key -> canonical identity = Content Family Key
  const dedupOrder: string[] = [];
  const groupedMap = new Map<string, SmartGroupedFilm>();

  // Map family key to matched Master Film if any variant in the family matched
  const familyToMasterMap = new Map<string, FilmUpload>();
  for (const cand of rawCandidates) {
    const famKey = extractContentFamilyKey(cand.rawContentName || cand.canonicalTitle);
    if (cand.matchedFilm && famKey && !famKey.startsWith('KONTEN TERKUNCI')) {
      if (!familyToMasterMap.has(famKey)) {
        familyToMasterMap.set(famKey, cand.matchedFilm);
      }
    }
  }

  for (let cIdx = 0; cIdx < rawCandidates.length; cIdx++) {
    const cand = rawCandidates[cIdx];
    const familyKey = extractContentFamilyKey(cand.rawContentName || cand.canonicalTitle);
    const resolvedMaster = cand.matchedFilm || (familyKey ? familyToMasterMap.get(familyKey) : null);

    let groupKey: string;
    let canonicalTitleToUse: string;
    let singkatanToUse: string;

    if (resolvedMaster) {
      groupKey = `MASTER_${resolvedMaster.id}`;
      canonicalTitleToUse = resolvedMaster.judul_film.toUpperCase();
      singkatanToUse = (resolvedMaster.singkatan_film || cand.singkatan || '').toUpperCase();
    } else if (familyKey && !familyKey.startsWith('KONTEN TERKUNCI')) {
      groupKey = `FAMILY_${familyKey}`;
      canonicalTitleToUse = familyKey;
      singkatanToUse = cand.singkatan || '';
    } else {
      groupKey = `UNMATCHED_ROW_${cand.screenshotIndex}_${cIdx}_${cand.canonicalTitle}`;
      canonicalTitleToUse = cand.canonicalTitle;
      singkatanToUse = '';
    }

    const sourceRowItem = {
      rawContentName: cand.rawContentName,
      screenshotIndex: cand.screenshotIndex,
      formatSound: cand.formatSound,
      formatFilm: cand.formatFilm
    };

    const variantItem: ScannedVariant = {
      rawTitle: cand.rawContentName,
      rawContentName: cand.rawContentName,
      sourceScreenshotIndex: cand.screenshotIndex,
      formatSound: cand.formatSound,
      formatFilm: cand.formatFilm,
      techTag: cand.variantTag
    };

    if (groupedMap.has(groupKey)) {
      const existing = groupedMap.get(groupKey)!;
      existing.occurrenceCount = (existing.occurrenceCount || 1) + 1;
      if (!existing.sourceRows) {
        existing.sourceRows = [
          {
            rawContentName: existing.rawContentName || existing.canonicalTitle,
            screenshotIndex: cand.screenshotIndex,
            formatSound: existing.formatSound,
            formatFilm: existing.formatFilm
          }
        ];
      }
      existing.sourceRows.push(sourceRowItem);

      if (!existing.variants.some((v) => v.rawTitle === cand.rawContentName)) {
        existing.variants.push(variantItem);
        existing.variantCount = existing.variants.length;
      }
      if (resolvedMaster && !existing.matchedFilm) {
        existing.matchedFilm = resolvedMaster;
        existing.canonicalTitle = resolvedMaster.judul_film.toUpperCase();
        existing.needsManualMatch = false;
      }
      if (cand.formatSound && cand.formatSound !== '5.1') {
        existing.formatSound = cand.formatSound;
      }
    } else {
      dedupOrder.push(groupKey);
      groupedMap.set(groupKey, {
        id: resolvedMaster
          ? `group-${resolvedMaster.id}`
          : `group-unmatched-${Date.now()}-${cIdx}-${Math.random().toString(36).substring(2, 6)}`,
        canonicalTitle: canonicalTitleToUse,
        singkatan: singkatanToUse,
        rawContentName: cand.rawContentName,
        formatFilm: resolvedMaster?.format_film || cand.formatFilm || '2D Flat',
        formatSound: resolvedMaster?.format_sound || cand.formatSound || '5.1',
        hasLock: true,
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

  onProgress?.(95, 'MEMVALIDASI HASIL...');
  const resultList = Array.from(groupedMap.values());

  onProgress?.(100, 'SELESAI - SIAP DIREVIEW');
  return {
    films: resultList,
    excludedCount: excludedNonFilmCount,
    detectedLocksByScreenshot
  };
}

/**
 * Fallback Text Parser:
 * Allows parsing text if needed.
 */
export function parsePastedServerText(
  rawPastedText: string,
  masterFilms: FilmUpload[]
): SmartGroupedFilm[] {
  const lines = rawPastedText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const groupedMap = new Map<string, SmartGroupedFilm>();

  for (const line of lines) {
    const rawContentName = extractRawContentName(line);
    if (!rawContentName || isNonFilmContent(rawContentName)) continue;

    const specs = extractTechnicalSpecs(rawContentName);
    const matchRes = matchToMasterFilm(rawContentName, masterFilms);

    const groupKey = matchRes.matched
      ? `MASTER_${matchRes.matched.id}`
      : `UNMATCHED_${matchRes.officialTitle.toUpperCase()}`;

    const variantItem: ScannedVariant = {
      rawTitle: rawContentName,
      rawContentName,
      formatSound: matchRes.matched?.format_sound || specs.formatSound,
      formatFilm: matchRes.matched?.format_film || specs.formatFilm,
      techTag: specs.variantTag
    };

    if (groupedMap.has(groupKey)) {
      const existing = groupedMap.get(groupKey)!;
      if (!existing.variants.some((v) => v.rawTitle === rawContentName)) {
        existing.variants.push(variantItem);
        existing.variantCount = existing.variants.length;
      }
    } else {
      groupedMap.set(groupKey, {
        id: matchRes.matched
          ? `group-${matchRes.matched.id}`
          : `group-paste-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        canonicalTitle: matchRes.matched ? matchRes.matched.judul_film.toUpperCase() : matchRes.officialTitle,
        singkatan: matchRes.matched?.singkatan_film?.toUpperCase() || matchRes.singkatan,
        rawContentName,
        formatFilm: matchRes.matched?.format_film || specs.formatFilm || '2D Flat',
        formatSound: matchRes.matched?.format_sound || specs.formatSound || '5.1',
        hasLock: true,
        confidence: matchRes.matched ? 'high' : 'medium',
        matchedFilm: matchRes.matched,
        needsManualMatch: matchRes.matched === null,
        isChecked: true,
        variants: [variantItem],
        variantCount: 1
      });
    }
  }

  return Array.from(groupedMap.values());
}
