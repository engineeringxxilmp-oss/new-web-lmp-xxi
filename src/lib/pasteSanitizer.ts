/**
 * Utility for sanitizing and formatting pasted content for Berita Acara Document Editor.
 * Cleans ugly background colors, MS Word junk, dark mode inline styles,
 * unwraps layout/data tables into clean paragraphs and key-value lines, and defaults pasted font size to 17px.
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
 * Converts tab-separated lines (e.g. copied from Excel/Sheets) into clean document text or bullet points
 */
export function convertTsvToTable(tsvText: string): string {
  const lines = tsvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return '';

  let html = `<div style="margin-top: 8px; margin-bottom: 12px; font-size: 17px;">`;

  lines.forEach((line) => {
    const cells = line.split('\t').map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length === 1) {
      html += `<p style="font-size: 17px; margin-bottom: 6px; line-height: 1.6;">${escapeHtml(cells[0])}</p>`;
    } else if (cells.length === 2) {
      let val = cells[1];
      if (!val.startsWith(':') && !cells[0].endsWith(':')) {
        val = `: ${val}`;
      }
      html += `<p style="font-size: 17px; margin-bottom: 4px; line-height: 1.5;"><strong>${escapeHtml(cells[0])}</strong> ${escapeHtml(val)}</p>`;
    } else if (cells.length > 2) {
      html += `<p style="font-size: 17px; margin-bottom: 4px; line-height: 1.5;">• <strong>${escapeHtml(cells[0])}</strong> - ${cells.slice(1).map(c => escapeHtml(c)).join(' | ')}</p>`;
    }
  });

  html += `</div>`;
  return html;
}

/**
 * Cleans DOM tree: unwraps ALL tables into clean paragraphs and key-value lines (NO TABLES / NO BOXES)
 * and sets default font size to 17px for pasted content.
 */
function cleanDomTree(doc: Document) {
  // 1. Remove unwanted MS Word XML, metadata, styles, and scripts
  doc.querySelectorAll('o\\:p, xml, script, style, meta, link, head, iframe, svg').forEach((el) => el.remove());

  // Helper: check if text is a narrative/body paragraph
  const isNarrativeSentence = (str: string) => {
    const s = str.toLowerCase().trim();
    if (s.length > 60) return true;
    return (
      s.includes('dengan ini') ||
      s.includes('melaporkan bahwa') ||
      s.includes('dibuat berita') ||
      s.includes('demikian berita') ||
      s.includes('terima kasih') ||
      s.includes('mohon') ||
      s.includes('agar dapat') ||
      s.includes('mengajukan permohonan') ||
      s.includes('di karenakan') ||
      s.includes('dikarenakan') ||
      s.includes('bertanda tangan')
    );
  };

  // 2. UNWRAP ALL TABLES COMPLETELY INTO CLEAN TEXT & PARAGRAPHS
  const tables = Array.from(doc.body.querySelectorAll('table'));
  tables.forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) {
      table.remove();
      return;
    }

    const container = doc.createElement('div');
    container.style.marginBottom = '12px';
    container.style.fontSize = '17px';

    rows.forEach((r) => {
      const cells = Array.from(r.querySelectorAll('th, td'));
      if (cells.length === 0) return;

      const cellTexts = cells.map((c) => (c.textContent || '').trim()).filter((t) => t.length > 0);
      if (cellTexts.length === 0) return;

      // Case A: Title or Single Text Line
      if (cellTexts.length === 1) {
        const text = cellTexts[0];
        const p = doc.createElement('p');

        const isTitle =
          (text === text.toUpperCase() && text.length > 3 && text.length < 80) ||
          (text.toLowerCase().includes('permintaan') && text.length < 70) ||
          (text.toLowerCase().includes('berita acara') && text.length < 70);

        if (isTitle) {
          p.setAttribute('style', 'text-align: center; font-weight: bold; font-size: 17px; margin-top: 12px; margin-bottom: 12px;');
          p.innerHTML = text;
        } else {
          p.setAttribute('style', 'font-size: 17px; margin-bottom: 8px; line-height: 1.6;');
          p.innerHTML = text;
        }
        container.appendChild(p);
        return;
      }

      // Case B: Key-Value row (e.g., "Lokasi", ": St Moritz XXI" or "merek", "CHRISTIE")
      if (cellTexts.length === 2) {
        const labelText = cellTexts[0];
        const valueText = cellTexts[1];

        if (labelText.length < 45 && !isNarrativeSentence(labelText)) {
          const p = doc.createElement('p');
          p.setAttribute('style', 'font-size: 17px; margin-bottom: 4px; line-height: 1.5;');

          let formattedVal = valueText;
          if (!formattedVal.startsWith(':') && !labelText.endsWith(':')) {
            formattedVal = `: ${formattedVal}`;
          }

          // Capitalize label nicely (e.g. "merek" -> "Merek", "type" -> "Type")
          const cleanLabel = labelText.charAt(0).toUpperCase() + labelText.slice(1);
          p.innerHTML = `<strong>${cleanLabel}</strong> ${formattedVal}`;
          container.appendChild(p);
          return;
        }

        // Narrative fallback for 2 cells
        cellTexts.forEach((ct) => {
          const p = doc.createElement('p');
          p.setAttribute('style', 'font-size: 17px; margin-bottom: 8px; line-height: 1.6;');
          p.innerHTML = ct;
          container.appendChild(p);
        });
        return;
      }

      // Case C: 3+ Cells (e.g. Label, Value, Extra Info like "type", "CHRISTIE CDXL 30 SUP", "1 PCS")
      const firstCell = cellTexts[0];
      if (firstCell.length < 40 && !isNarrativeSentence(firstCell)) {
        const p = doc.createElement('p');
        p.setAttribute('style', 'font-size: 17px; margin-bottom: 4px; line-height: 1.5;');

        const cleanLabel = firstCell.charAt(0).toUpperCase() + firstCell.slice(1);
        let restStr = cellTexts.slice(1).join(' ').trim();
        if (!restStr.startsWith(':') && !cleanLabel.endsWith(':')) {
          restStr = `: ${restStr}`;
        }

        p.innerHTML = `<strong>${cleanLabel}</strong> ${restStr}`;
        container.appendChild(p);
        return;
      }

      // Default: render as clean line or bullet point
      const p = doc.createElement('p');
      p.setAttribute('style', 'font-size: 17px; margin-bottom: 6px; line-height: 1.6;');
      p.innerHTML = cellTexts.join(' &nbsp; ');
      container.appendChild(p);
    });

    table.replaceWith(container);
  });

  // 3. Clean all remaining HTML elements (strip classes, IDs, backgrounds, dark borders, boxes)
  const allElements = Array.from(doc.body.querySelectorAll('*'));
  allElements.forEach((node) => {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Strip classes and IDs
    el.removeAttribute('class');
    el.removeAttribute('id');

    // Strip inline styles that cause boxes, borders, dark backgrounds, or bad fonts
    if (el.getAttribute('style')) {
      let styleStr = el.getAttribute('style') || '';

      styleStr = styleStr
        .replace(/background(-color)?\s*:\s*[^;"]+;?/gi, '')
        .replace(/color\s*:\s*[^;"]+;?/gi, '')
        .replace(/border(-[a-z]+)?\s*:\s*[^;"]+;?/gi, '')
        .replace(/box-shadow\s*:\s*[^;"]+;?/gi, '')
        .replace(/outline\s*:\s*[^;"]+;?/gi, '')
        .replace(/font-family\s*:\s*[^;"]+;?/gi, '')
        .replace(/font-size\s*:\s*[^;"]+;?/gi, '')
        .replace(/line-height\s*:\s*[^;"]+;?/gi, '')
        .replace(/mso-[^;"]+;?/gi, '');

      if (styleStr.trim()) {
        el.setAttribute('style', styleStr.trim());
      } else {
        el.removeAttribute('style');
      }
    }

    // Paragraph & text element default styling (Auto 17px)
    if (tag === 'p' || tag === 'li' || tag === 'td' || tag === 'th' || tag === 'div' || tag === 'span') {
      if (!el.style.fontSize) {
        el.style.fontSize = '17px';
      }
      if (tag === 'p' && !el.style.marginBottom) {
        el.style.marginBottom = '8px';
        el.style.lineHeight = '1.6';
      }
    }
  });

  // Ensure all top-level child elements of doc.body have font-size: 17px
  Array.from(doc.body.children).forEach((child) => {
    const htmlEl = child as HTMLElement;
    if (htmlEl && htmlEl.style) {
      if (!htmlEl.style.fontSize) {
        htmlEl.style.fontSize = '17px';
      }
    }
  });
}

/**
 * Sanitizes and cleans up any HTML or plain text pasted into the editor, automatically forcing font-size: 17px
 */
export function sanitizeAndFormatPastedContent(htmlInput: string, textInput: string): string {
  const trimmedText = textInput ? textInput.trim() : '';

  // 1. Check if plain text is tab-separated (e.g., copied from Excel/Google Sheets)
  const lines = trimmedText.split(/\r?\n/);
  const isTabSeparated = lines.length > 0 && lines.some((line) => line.includes('\t'));

  if (isTabSeparated && (!htmlInput || !htmlInput.includes('<table'))) {
    return convertTsvToTable(trimmedText);
  }

  // 2. If we have HTML content (from Word, Google Docs, or Web Pages)
  if (htmlInput && htmlInput.trim()) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlInput, 'text/html');

      cleanDomTree(doc);

      let cleaned = doc.body.innerHTML;

      // Final regex cleanup for any remaining inline bg, border, or color attributes
      cleaned = cleaned
        .replace(/background-color\s*:\s*[^;"]+;?/gi, '')
        .replace(/color\s*:\s*[^;"]+;?/gi, '')
        .replace(/border\s*:\s*[^;"]+;?/gi, '')
        .replace(/<o:p>\s*<\/o:p>/gi, '')
        .replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');

      return cleaned;
    } catch (err) {
      console.warn('Failed parsing HTML during paste, falling back to plain text formatting:', err);
    }
  }

  // 3. Fallback: Format plain text into clean paragraphs with 17px font size
  if (trimmedText) {
    const paragraphs = trimmedText
      .split(/\r?\n\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return paragraphs
      .map((p) => {
        // If paragraph looks like bullet list
        if (p.startsWith('- ') || p.startsWith('* ') || p.startsWith('• ')) {
          const items = p.split(/\r?\n/).map((line) => line.replace(/^[-*•]\s*/, '').trim());
          return `<ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 10px; font-size: 17px;">${items
            .map((item) => `<li style="font-size: 17px;">${escapeHtml(item)}</li>`)
            .join('')}</ul>`;
        }
        return `<p style="font-size: 17px; margin-bottom: 8px; line-height: 1.6;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
  }

  return '';
}

/**
 * Cleans existing document HTML string (strips black background boxes, dark themes, table boxes, and bad inline styles)
 */
export function cleanDocumentHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    cleanDomTree(doc);

    return doc.body.innerHTML
      .replace(/background-color\s*:\s*[^;"]+;?/gi, '')
      .replace(/color\s*:\s*[^;"]+;?/gi, '')
      .replace(/border\s*:\s*[^;"]+;?/gi, '');
  } catch (err) {
    console.error('Error cleaning document HTML:', err);
    return rawHtml;
  }
}


