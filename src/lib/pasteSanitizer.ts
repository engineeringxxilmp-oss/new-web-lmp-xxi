/**
 * Utility for sanitizing pasted content for Berita Acara Document Editor.
 * Standard text and clipboard sanitizer without auto-formatting.
 * All formatting (bold, alignment, font-size, etc.) is handled manually by the user via toolbar.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts plain text into clean standard paragraphs without forcing any bold, center, or font-size.
 */
export function formatPlainText(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '<p><br></p>';

  const lines = rawText.split(/\r?\n/);
  const parts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      parts.push('<p><br></p>');
    } else {
      parts.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  return parts.join('');
}

/**
 * Converts tab-separated lines (e.g. copied from Excel/Sheets) into clean text or table
 */
export function convertTsvToTable(tsvText: string): string {
  const lines = tsvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return '';

  let html = `<div style="margin-top: 8px; margin-bottom: 12px;">`;

  lines.forEach((line) => {
    const cells = line.split('\t').map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length === 1) {
      html += `<p>${escapeHtml(cells[0])}</p>`;
    } else if (cells.length === 2) {
      let val = cells[1];
      if (!val.startsWith(':') && !cells[0].endsWith(':')) {
        val = `: ${val}`;
      }
      html += `<p>${escapeHtml(cells[0])} ${escapeHtml(val)}</p>`;
    } else if (cells.length > 2) {
      html += `<p>• ${escapeHtml(cells[0])} - ${cells.slice(1).map((c) => escapeHtml(c)).join(' | ')}</p>`;
    }
  });

  html += `</div>`;
  return html;
}

/**
 * Cleans DOM tree of external junk (Word / Docs / scripts) without modifying alignment or font-weight
 */
function cleanDomTree(doc: Document) {
  // Remove scripts, meta, link, styles
  doc.querySelectorAll('o\\:p, xml, script, style, meta, link, head, iframe, svg, noscript').forEach((el) => el.remove());

  // Remove dark mode / black background overrides if pasted from dark mode apps
  const allElements = Array.from(doc.body.querySelectorAll('*'));
  allElements.forEach((node) => {
    const el = node as HTMLElement;
    if (el.style.backgroundColor && el.style.backgroundColor !== 'transparent') {
      el.style.backgroundColor = '';
    }
    if (el.style.color && (el.style.color === 'white' || el.style.color === 'rgb(255, 255, 255)')) {
      el.style.color = '';
    }
  });
}

/**
 * Sanitizes pasted content (HTML or plain text) without applying any auto-format rules.
 * Keeps text as-is so formatting is done manually with toolbar.
 */
export function sanitizeAndFormatPastedContent(htmlInput: string, textInput: string): string {
  const trimmedText = textInput ? textInput.trim() : '';

  // 1. Check if plain text is tab-separated (e.g. copied from Excel/Google Sheets)
  const lines = trimmedText.split(/\r?\n/);
  const isTabSeparated = lines.length > 0 && lines.some((line) => line.includes('\t'));

  if (isTabSeparated && (!htmlInput || !htmlInput.includes('<table'))) {
    return convertTsvToTable(trimmedText);
  }

  // 2. If rich HTML is available from clipboard, clean external junk and use it
  if (htmlInput && htmlInput.trim()) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlInput, 'text/html');
      cleanDomTree(doc);
      if (doc.body && doc.body.innerHTML.trim()) {
        return doc.body.innerHTML;
      }
    } catch {
      // fallback to plain text below
    }
  }

  // 3. Plain text fallback: split into clean paragraphs
  if (textInput) {
    return formatPlainText(textInput);
  }

  return '';
}

/**
 * Cleans existing document HTML string (strips scripts, etc.)
 */
export function cleanDocumentHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    cleanDomTree(doc);
    return doc.body.innerHTML;
  } catch (err) {
    console.error('Error cleaning document HTML:', err);
    return rawHtml;
  }
}

/**
 * Kept for backward compatibility if imported
 */
export function normalizeEditorDom(_editorEl?: HTMLElement) {
  // No-op: Auto-format disabled as requested.
}
