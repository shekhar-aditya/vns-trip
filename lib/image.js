// Client-side image compression so photos/QRs sync as small data URLs.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load that image'));
    img.src = src;
  });
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Resize + re-encode an image (File/Blob or URL) to a data URL.
 * `square` center-crops (avatars). QR codes keep their aspect ratio and
 * stay crisp (PNG-ish quality via high JPEG quality on white).
 */
export async function compressImage(source, { maxSize = 400, square = false, maxBytes = 80_000 } = {}) {
  const src = typeof source === 'string' ? source : await readAsDataUrl(source);
  const img = await loadImage(src);

  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
  }
  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

  // Step quality down until under budget (data URL is ~4/3 of bytes)
  for (const type of ['image/webp', 'image/jpeg']) {
    for (let q = 0.9; q >= 0.4; q -= 0.1) {
      const url = canvas.toDataURL(type, q);
      if (!url.startsWith(`data:${type}`)) break; // type unsupported (Safari webp)
      if (url.length * 0.75 <= maxBytes) return url;
    }
  }
  return canvas.toDataURL('image/jpeg', 0.4);
}

/** Pull the first image out of a paste event, if any. */
export function imageFromClipboard(event) {
  const items = event.clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith('image/')) return item.getAsFile();
  }
  return null;
}
