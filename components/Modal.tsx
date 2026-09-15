"use client";

import { useState } from "react";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  if (closing) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setClosing(true);
          onClose();
        }
      }}
    >
      <div className="modal-box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[15px]">{title}</h3>
          <span style={{ cursor: "pointer", color: "var(--ink-faint)" }} onClick={onClose}>✕</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="text-[12.5px] font-medium px-3 py-2 rounded-lg mb-3" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }}>
      {message}
    </div>
  );
}
