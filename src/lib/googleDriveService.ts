/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DriveFileUploadResult {
  id: string;
  name: string;
  webViewLink: string;
}

/**
 * Helper to format date into DD_MM_YYYY
 */
export function formatDateDDMMYYYY(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}_${mm}_${yyyy}`;
}

/**
 * Helper to get Indonesian month name + year for folder naming
 * e.g., "Berita Acara - Juli 2026"
 */
export function getMonthlyFolderName(date: Date = new Date()): string {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthName = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `Berita Acara - ${monthName} ${year}`;
}

/**
 * Convert Blob to Base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function extractDriveFileId(linkOrId: string): string {
  if (!linkOrId) return '';
  const trimmed = linkOrId.trim();
  if (
    !trimmed.includes('/') &&
    !trimmed.includes('http') &&
    trimmed.length > 15 &&
    !trimmed.startsWith('gdrive_') &&
    !trimmed.startsWith('sop_')
  ) {
    return trimmed;
  }
  const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) return match1[1];

  const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2 && match2[1]) return match2[1];

  const match3 = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match3 && match3[1]) return match3[1];

  return '';
}

/**
 * Google Apps Script standard code for 100% FREE Google Drive auto-sync
 * No OAuth Verification required!
 */
export const RECOMMENDED_APPS_SCRIPT_CODE = `function doGet(e) {
  return getDriveFiles(e);
}

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(errData) {}
    }
    var action = data.action || (e && e.parameter && e.parameter.action) || "upload";

    if (action === "list") {
      return getDriveFiles(e);
    }

    // --- FITUR HAPUS DOKUMEN DARI GOOGLE DRIVE ---
    if (action === "delete") {
      var fileId = data.fileId || "";
      var fileName = data.fileName || "";
      var folderName = data.folderName || "SOP & KNOWLEDGE";
      var count = 0;

      // 1. Hapus langsung berdasarkan Google Drive File ID jika ada
      if (fileId && fileId.length > 10 && fileId.indexOf("gdrive_") === -1 && fileId.indexOf("sop_") === -1) {
        try {
          var targetFile = DriveApp.getFileById(fileId);
          if (targetFile && !targetFile.isTrashed()) {
            targetFile.setTrashed(true);
            count++;
          }
        } catch (err1) {}
      }

      // 2. Hapus file berdasarkan variasi Nama File & Pencarian Kata Kunci
      if (fileName) {
        var cleanTitle = fileName.replace(/\.pdf$/i, "").trim();
        var searchQueries = [
          "title = '" + fileName + "' and trashed = false",
          "title = '" + cleanTitle + ".pdf' and trashed = false",
          "title = '" + cleanTitle + "' and trashed = false",
          "title contains '" + cleanTitle.substring(0, 20) + "' and trashed = false"
        ];

        for (var q = 0; q < searchQueries.length; q++) {
          try {
            var filesFound = DriveApp.searchFiles(searchQueries[q]);
            while (filesFound.hasNext()) {
              var f = filesFound.next();
              try {
                f.setTrashed(true);
                count++;
              } catch (e1) {}
            }
          } catch (e2) {}
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        deletedCount: count,
        message: count > 0 ? "Berhasil memindahkan " + count + " file ke Sampah Google Drive." : "File tidak ditemukan di Google Drive."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- FITUR UPLOAD DOKUMEN KE GOOGLE DRIVE ---
    var folderName = data.folderName || "SOP & KNOWLEDGE";
    var fileName = data.fileName || "berita_acara.pdf";
    var base64Data = data.fileBase64;

    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "File Base64 tidak ditemukan."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Cari atau buat folder SOP & KNOWLEDGE
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    // 2. Buat file PDF dari Base64
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, "application/pdf", fileName);
    var file = folder.createFile(blob);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      id: file.getId(),
      name: file.getName(),
      webViewLink: file.getUrl(),
      folderName: folder.getName()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getDriveFiles(e) {
  try {
    var folderName = (e && e.parameter && e.parameter.folderName) || "SOP & KNOWLEDGE";
    var folders = DriveApp.getFoldersByName(folderName);
    var filesList = [];
    var processedIds = {};

    function processFolderFiles(folder) {
      var files = folder.getFiles();
      while (files.hasNext()) {
        var file = files.next();
        if (!file.isTrashed() && !processedIds[file.getId()]) {
          processedIds[file.getId()] = true;
          filesList.push({
            id: file.getId(),
            name: file.getName(),
            webViewLink: file.getUrl(),
            lastUpdated: file.getLastUpdated().toISOString(),
            size: file.getSize(),
            mimeType: file.getMimeType()
          });
        }
      }
    }

    if (folders.hasNext()) {
      while (folders.hasNext()) {
        processFolderFiles(folders.next());
      }
    } else {
      var allFiles = DriveApp.getFiles();
      var count = 0;
      while (allFiles.hasNext() && count < 50) {
        var f = allFiles.next();
        if (!f.isTrashed() && !processedIds[f.getId()]) {
          processedIds[f.getId()] = true;
          filesList.push({
            id: f.getId(),
            name: f.getName(),
            webViewLink: f.getUrl(),
            lastUpdated: f.getLastUpdated().toISOString(),
            size: f.getSize(),
            mimeType: f.getMimeType()
          });
          count++;
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      folderName: folderName,
      files: filesList
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_XXI_GDRIVE_ENGINEERING_LMP_AUTO_SYNC/exec';

export function isConfiguredAppsScriptUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim();
  if (clean.includes('AKfycbz_XXI_GDRIVE_ENGINEERING_LMP_AUTO_SYNC')) return false;
  return clean.startsWith('https://script.google.com/macros/s/AKfy') || clean.includes('/macros/s/AKfy');
}

/**
 * Normalizes input URL or Deployment ID into a full valid Google Apps Script Web App URL
 */
export function normalizeAppsScriptUrl(input: string): string {
  let clean = input.trim();
  if (!clean) return '';

  // 1. Extract Deployment ID if AKfy... pattern is present
  const idMatch = clean.match(/(AKfy[a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://script.google.com/macros/s/${idMatch[1]}/exec`;
  }

  // 2. Handle paths with /macros/s/
  if (clean.includes('/macros/s/')) {
    const segments = clean.split('/macros/s/');
    let rawId = segments[segments.length - 1];
    rawId = rawId.replace(/\/exec.*$/, '').replace(/^\/+|\/+$/g, '');
    if (rawId) {
      return `https://script.google.com/macros/s/${rawId}/exec`;
    }
  }

  // 3. Fallback for valid http/https URLs
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean.endsWith('/exec') ? clean : `${clean}/exec`;
  }

  // 4. Default assume plain Deployment ID
  return `https://script.google.com/macros/s/${clean}/exec`;
}

/**
 * Delete a PDF file from Google Drive via Google Apps Script Web App
 */
export async function deletePdfViaAppsScript(
  webAppUrl: string,
  folderName: string,
  fileName: string,
  fileIdOrLink?: string
): Promise<{ status: string; message: string; deletedCount?: number }> {
  const normalizedUrl = normalizeAppsScriptUrl(webAppUrl);
  if (!normalizedUrl) {
    throw new Error('URL Google Apps Script tidak valid.');
  }

  const realFileId = extractDriveFileId(fileIdOrLink || '');

  const payload = {
    action: 'delete',
    folderName: folderName || 'SOP & KNOWLEDGE',
    fileName: fileName,
    fileId: realFileId || fileIdOrLink || ''
  };

  const response = await fetch(normalizedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script HTTP Error (${response.status})`);
  }

  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(result.message || 'Gagal menghapus file dari Google Drive');
  }

  return result;
}

/**
 * Upload a PDF blob directly to Google Drive via Google Apps Script Web App
 */
export async function uploadPdfViaAppsScript(
  webAppUrl: string,
  folderName: string,
  fileName: string,
  pdfBlob: Blob
): Promise<DriveFileUploadResult> {
  const normalizedUrl = normalizeAppsScriptUrl(webAppUrl);
  if (!normalizedUrl) {
    throw new Error('URL Google Apps Script tidak valid.');
  }

  const base64 = await blobToBase64(pdfBlob);

  const payload = {
    folderName,
    fileName,
    fileBase64: base64
  };

  const response = await fetch(normalizedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8' // Google Apps Script requires text/plain or no preflight CORS
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script HTTP Error (${response.status})`);
  }

  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(result.message || 'Gagal menyimpan ke Google Drive melalui Apps Script');
  }

  return {
    id: result.id,
    name: result.name,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`
  };
}

export interface DriveFileItem {
  id: string;
  name: string;
  webViewLink: string;
  lastUpdated?: string;
  size?: number;
  mimeType?: string;
}

/**
 * Fetch list of files from Google Drive via Google Apps Script Web App
 */
export async function fetchDriveFilesViaAppsScript(
  webAppUrl: string,
  folderName: string = 'SOP & KNOWLEDGE'
): Promise<{ status: string; folderName?: string; files: DriveFileItem[] }> {
  const normalizedUrl = normalizeAppsScriptUrl(webAppUrl);
  if (!normalizedUrl) {
    throw new Error('URL Google Apps Script tidak valid.');
  }

  // 1. First attempt GET request with query params
  try {
    const getUrl = `${normalizedUrl}?action=list&folderName=${encodeURIComponent(folderName)}`;
    const res = await fetch(getUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success' && Array.isArray(data.files)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('GET list files request failed, attempting POST fallback:', err);
  }

  // 2. Fallback attempt POST request
  const response = await fetch(normalizedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      action: 'list',
      folderName: folderName
    })
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script HTTP Error (${response.status})`);
  }

  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(result.message || 'Gagal mengambil daftar file dari Google Drive');
  }

  return {
    status: result.status || 'success',
    folderName: result.folderName || folderName,
    files: Array.isArray(result.files) ? result.files : []
  };
}
