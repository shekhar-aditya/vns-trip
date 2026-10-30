'use client';

import { useEffect } from 'react';

/** Bottom-sheet on phones, centered card on wider screens. */
export default function Modal({ title, onClose, children, className = '', dismissable = true }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape' && dismissable) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, dismissable]);

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (dismissable && e.target === e.currentTarget) onClose?.(); }}
    >
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        {(title || dismissable) && (
          <div className="modal__head">
            <h2 className="modal__title">{title}</h2>
            {dismissable && <button className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Close">✕</button>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
