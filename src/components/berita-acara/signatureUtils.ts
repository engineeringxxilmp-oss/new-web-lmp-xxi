/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Signature Layout Utility for Berita Acara Orderan
 * Provides dynamic 3, 4, and 5 signature column layout using responsive flexbox/grid.
 * Guarantees balanced columns, equal widths, equal spacing, and precise centering
 * in both Web Preview and exported PDF.
 */

export interface SigneeItem {
  id: string;
  header: string; // e.g. "Mengetahui,"
  name: string;   // e.g. "...................." or "Budi Santoso"
  role: string;   // e.g. "Teknisi Engineering", "Chief Engineering", "Manager Cinema XXI"
}

// Default presets for 3, 4, and 5 signees
export const PRESET_3_SIGNEES: SigneeItem[] = [
  { id: 'sig-1', header: 'Mengetahui,', name: '', role: 'Teknisi Engineering' },
  { id: 'sig-2', header: 'Mengetahui,', name: '', role: 'Chief Engineering' },
  { id: 'sig-3', header: 'Mengetahui,', name: '', role: 'Manager Cinema XXI' }
];

export const PRESET_4_SIGNEES: SigneeItem[] = [
  { id: 'sig-1', header: 'Mengetahui,', name: '', role: 'Teknisi Engineering' },
  { id: 'sig-2', header: 'Mengetahui,', name: '', role: 'Chief Engineering' },
  { id: 'sig-3', header: 'Mengetahui,', name: '', role: 'Manager Cinema XXI' },
  { id: 'sig-4', header: 'Mengetahui,', name: '', role: 'Regional Manager / Head Office' }
];

export const PRESET_5_SIGNEES: SigneeItem[] = [
  { id: 'sig-1', header: 'Mengetahui,', name: '', role: 'Teknisi Engineering' },
  { id: 'sig-2', header: 'Mengetahui,', name: '', role: 'Chief Engineering' },
  { id: 'sig-3', header: 'Mengetahui,', name: '', role: 'Manager Cinema XXI' },
  { id: 'sig-4', header: 'Mengetahui,', name: '', role: 'Regional Manager' },
  { id: 'sig-5', header: 'Mengetahui,', name: '', role: 'Head Office' }
];

export const PRESET_2_SIGNEES: SigneeItem[] = [
  { id: 'sig-1', header: 'Dibuat Oleh,', name: '', role: 'Teknisi Engineering' },
  { id: 'sig-2', header: 'Disetujui Oleh,', name: '', role: 'Cinema Manager' }
];

/**
 * Returns placeholder dots string calibrated to fit column width without overflowing
 */
export function getSignaturePlaceholderDots(count: number): string {
  if (count <= 2) return '................................'; // ~32 dots
  if (count === 3) return '............................';    // ~28 dots
  if (count === 4) return '....................';            // ~20 dots
  return '................';                                  // ~16 dots for 5+
}

/**
 * Generates the clean HTML block for dynamic signatures.
 * Uses responsive Flexbox with 100% width, equal flex distribution (flex: 1 1 0px),
 * and calibrated gap so that 3, 4, or 5 columns are always balanced and centered.
 */
export function generateSignaturesHtml(signees: SigneeItem[]): string {
  if (!signees || signees.length === 0) return '';

  const count = signees.length;

  // Calibrated styling variables per column count
  let gapPx = 14;
  let headerFontSize = '13px';
  let nameFontSize = '13px';
  let roleFontSize = '12px';
  let spaceHeight = 48;
  const defaultDots = getSignaturePlaceholderDots(count);

  if (count <= 2) {
    gapPx = 24;
    headerFontSize = '13.5px';
    nameFontSize = '13px';
    roleFontSize = '12px';
    spaceHeight = 50;
  } else if (count === 3) {
    // 3 TTD: ~177px per column
    gapPx = 18;
    headerFontSize = '13px';
    nameFontSize = '13px';
    roleFontSize = '12px';
    spaceHeight = 48;
  } else if (count === 4) {
    // 4 TTD: ~132px per column
    gapPx = 12;
    headerFontSize = '12px';
    nameFontSize = '12px';
    roleFontSize = '11px';
    spaceHeight = 46;
  } else if (count >= 5) {
    // 5 TTD: ~107px per column
    gapPx = 8;
    headerFontSize = '11.5px';
    nameFontSize = '11px';
    roleFontSize = '10px';
    spaceHeight = 44;
  }

  let html = `<div class="ba-signature-container" data-signature-count="${count}" style="display: flex; flex-direction: row; justify-content: center; align-items: flex-start; width: 100%; max-width: 100%; margin: 32px auto 0 auto; gap: ${gapPx}px; box-sizing: border-box; text-align: center;">\n`;

  signees.forEach((item, idx) => {
    let rawName = (item.name || '').trim();

    // If name is empty or only dots, provide the calibrated dots placeholder
    if (!rawName || /^\.+$/.test(rawName.replace(/[()\s]/g, ''))) {
      rawName = defaultDots;
    }

    // Format with parentheses ( ... )
    const cleanName = rawName.replace(/^[(\s]+|[)\s]+$/g, '').trim() || defaultDots;
    const formattedName = `( ${cleanName} )`;
    const headerText = item.header?.trim() || 'Mengetahui,';
    const roleText = item.role?.trim() || '';

    html += `  <div class="ba-signature-col" data-col-index="${idx}" style="flex: 1 1 0px; min-width: 0; max-width: 100%; text-align: center; box-sizing: border-box; word-break: break-word; overflow-wrap: break-word;">\n`;
    html += `    <p style="margin: 0 0 4px 0; font-weight: bold; font-size: ${headerFontSize}; line-height: 1.3;">${headerText}</p>\n`;
    html += `    <div style="height: ${spaceHeight}px; min-height: ${spaceHeight}px; line-height: ${spaceHeight}px;">&nbsp;</div>\n`;
    html += `    <p style="margin: 0; text-decoration: underline; font-weight: 600; font-size: ${nameFontSize}; line-height: 1.3; overflow-wrap: break-word; word-break: break-word;">${formattedName}</p>\n`;
    if (roleText) {
      html += `    <p style="margin: 3px 0 0 0; color: #334155; font-size: ${roleFontSize}; line-height: 1.25; overflow-wrap: break-word; word-break: break-word;">${roleText}</p>\n`;
    }
    html += `  </div>\n`;
  });

  html += `</div>`;
  return html;
}

/**
 * Parses existing signatures from document HTML string.
 * Supports both new .ba-signature-container elements and legacy <table> layouts.
 */
export function parseSignaturesFromHtml(html: string): SigneeItem[] | null {
  if (!html || !html.trim()) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Look for new dynamic flex/grid container
    const modernContainer = doc.querySelector(
      '.ba-signature-container, .signature-container, [data-signature-count], [data-signature-container]'
    );

    if (modernContainer) {
      const cols = Array.from(modernContainer.querySelectorAll('.ba-signature-col, [class*="signature-col"], > div'));
      if (cols.length > 0) {
        const parsed: SigneeItem[] = [];
        cols.forEach((col, idx) => {
          const paragraphs = col.querySelectorAll('p');
          let header = 'Mengetahui,';
          let name = '';
          let role = '';

          if (paragraphs.length >= 1) {
            header = paragraphs[0].textContent?.trim() || 'Mengetahui,';
          }
          if (paragraphs.length >= 2) {
            const rawName = paragraphs[1].textContent?.trim() || '';
            name = rawName.replace(/^[(\s]+|[)\s]+$/g, '').trim();
          }
          if (paragraphs.length >= 3) {
            role = paragraphs[2].textContent?.trim() || '';
          }

          parsed.push({
            id: `sig-parsed-${idx}-${Date.now()}`,
            header: header || 'Mengetahui,',
            name: name,
            role: role
          });
        });

        if (parsed.length > 0) return parsed;
      }
    }

    // 2. Fallback: Parse from legacy <table> if present
    const tables = doc.querySelectorAll('table');
    let foundSigTable: HTMLTableElement | null = null;

    tables.forEach((table) => {
      const text = table.textContent || '';
      if (
        text.includes('Mengetahui') ||
        text.includes('Dibuat Oleh') ||
        text.includes('Diperiksa Oleh') ||
        text.includes('Disetujui Oleh') ||
        text.includes('Teknisi Engineering') ||
        text.includes('Chief Engineering') ||
        text.includes('Manager Cinema')
      ) {
        foundSigTable = table as HTMLTableElement;
      }
    });

    if (foundSigTable) {
      const cells = (foundSigTable as HTMLTableElement).querySelectorAll('td');
      if (cells.length > 0) {
        const parsedSignees: SigneeItem[] = [];
        cells.forEach((cell, idx) => {
          const paragraphs = cell.querySelectorAll('p');
          let header = 'Mengetahui,';
          let name = '';
          let role = '';

          if (paragraphs.length >= 2) {
            header = paragraphs[0].textContent?.trim() || 'Mengetahui,';
            const p2 = paragraphs[1];
            const innerHtml = p2.innerHTML || '';
            const parts = innerHtml.split(/<br\s*\/?>/i);
            if (parts.length >= 2) {
              const tmpDiv = document.createElement('div');
              tmpDiv.innerHTML = parts[0];
              name = tmpDiv.textContent?.replace(/[()]/g, '').trim() || '';
              tmpDiv.innerHTML = parts[1];
              role = tmpDiv.textContent?.trim() || '';
            } else {
              role = p2.textContent?.trim() || '';
            }
          } else {
            const lines = cell.textContent?.split('\n').map((l) => l.trim()).filter(Boolean) || [];
            if (lines.length > 0) header = lines[0];
            if (lines.length > 1) role = lines[lines.length - 1];
          }

          parsedSignees.push({
            id: `sig-legacy-${idx}-${Date.now()}`,
            header: header || 'Mengetahui,',
            name: name,
            role: role
          });
        });

        if (parsedSignees.length > 0) return parsedSignees;
      }
    }
  } catch (err) {
    console.warn('Could not parse signatures from document HTML:', err);
  }

  return null;
}
