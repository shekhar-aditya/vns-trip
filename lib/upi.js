import QRCode from 'qrcode';

// handle@psp — handle: letters, digits, dot, dash, underscore; psp: letters
const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;

export function isValidUpi(upiId) {
  return UPI_RE.test(String(upiId || '').trim());
}

export function buildUpiLink({ upiId, name, amount, note }) {
  const params = new URLSearchParams({ pa: upiId.trim(), pn: name, cu: 'INR' });
  if (amount) params.set('am', Number(amount).toFixed(2));
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`;
}

export function generateQrDataUrl(text) {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: 512, color: { dark: '#0A0A0A', light: '#FFFFFF' } });
}
