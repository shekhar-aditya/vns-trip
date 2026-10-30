'use client';

import { useEffect, useState } from 'react';
import { buildUpiLink, generateQrDataUrl, isValidUpi } from '@/lib/upi';

/* eslint-disable @next/next/no-img-element -- data-URL QR images */

/**
 * Shows a member's QR. Uses their uploaded screenshot if present,
 * otherwise generates one from their UPI ID (with amount if given).
 * `prefer="generated"` forces the generated one (amount pre-filled).
 */
export default function UpiQr({ member, amount, note, prefer = 'uploaded', size = 220 }) {
  const [generated, setGenerated] = useState(null);
  const canGenerate = isValidUpi(member?.upiId);
  const useUploaded = member?.qrCodeUrl && (prefer === 'uploaded' || !canGenerate);

  useEffect(() => {
    if (useUploaded || !canGenerate) return;
    let alive = true;
    generateQrDataUrl(buildUpiLink({ upiId: member.upiId, name: member.name, amount, note }))
      .then(url => { if (alive) setGenerated(url); })
      .catch(err => console.error('QR generation failed', err));
    return () => { alive = false; };
  }, [useUploaded, canGenerate, member?.upiId, member?.name, amount, note]);

  const src = useUploaded ? member.qrCodeUrl : (canGenerate ? generated : null);

  if (!src) {
    return (
      <div className="qr-frame qr-frame--empty" style={{ width: size, height: size }}>
        <span>NO QR / UPI YET</span>
      </div>
    );
  }

  return (
    <div className="qr-frame" style={{ width: size }}>
      <img src={src} alt={`UPI QR for ${member.name}`} />
      <div className="qr-frame__caption">{useUploaded ? 'UPLOADED QR' : amount ? 'AUTO QR · AMOUNT FILLED' : 'AUTO QR FROM UPI ID'}</div>
    </div>
  );
}
