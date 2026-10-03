/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resizes and compresses an image file to a lightweight DataURL
 * with maximum dimensions (1280px) and quality 0.82 to prevent
 * Firestore 1MB limit and localStorage quota issues.
 */
export async function compressImageFile(file: File, maxDim = 1280, quality = 0.82): Promise<{ dataUrl: string; sizeFormatted: string; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung atau file korup.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Scale down if exceeds maxDim
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: src,
            sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
            name: file.name
          });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG unless transparent PNG
        const isPng = file.type === 'image/png';
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);

        // Approximate size
        const head = `data:${mimeType};base64,`;
        const base64Len = compressedDataUrl.length - head.length;
        const sizeInBytes = Math.round((base64Len * 3) / 4);
        const sizeFormatted = `${(sizeInBytes / 1024).toFixed(1)} KB`;

        resolve({
          dataUrl: compressedDataUrl,
          sizeFormatted,
          name: file.name
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
