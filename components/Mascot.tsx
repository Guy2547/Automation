"use client";

export default function Mascot({ message }: { message: string }) {
  return (
    <div className="mascot-wrap">
      <div className="mascot-bubble">
        <div className="tag"><span className="dot" style={{ background: "var(--alarm)", color: "var(--alarm)" }} />Line Buddy</div>
        <p>{message}</p>
      </div>
      <div className="mascot-float">
        <svg width="92" height="108" viewBox="0 0 160 190" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hatGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F6D583" />
              <stop offset="100%" stopColor="#D69A2E" />
            </linearGradient>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F6F1E3" />
              <stop offset="100%" stopColor="#E7DFC9" />
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="180" rx="34" ry="7" fill="#000" opacity="0.28" />
          <ellipse cx="62" cy="168" rx="14" ry="9" fill="#D69A2E" />
          <ellipse cx="98" cy="168" rx="14" ry="9" fill="#D69A2E" />
          <rect x="42" y="112" width="76" height="58" rx="26" fill="url(#bodyGrad)" stroke="#C9BE9C" strokeWidth="1.5" />
          <circle cx="80" cy="138" r="12" fill="none" stroke="#D69A2E" strokeWidth="3" />
          <circle cx="80" cy="138" r="4" fill="#D69A2E" />
          <ellipse cx="38" cy="132" rx="10" ry="15" fill="#F6F1E3" stroke="#C9BE9C" strokeWidth="1.5" />
          <g transform="rotate(-25 122 118)">
            <ellipse cx="122" cy="118" rx="10" ry="16" fill="#F6F1E3" stroke="#C9BE9C" strokeWidth="1.5" />
          </g>
          <g transform="translate(126,92) rotate(25)">
            <rect x="-3" y="0" width="6" height="26" rx="3" fill="#8FA398" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="#8FA398" strokeWidth="4" />
          </g>
          <circle cx="80" cy="70" r="46" fill="url(#bodyGrad)" stroke="#C9BE9C" strokeWidth="1.5" />
          <path d="M34 58 A46 40 0 0 1 126 58 L126 50 A46 40 0 0 0 34 50 Z" fill="url(#hatGrad)" />
          <rect x="30" y="52" width="100" height="10" rx="5" fill="#D69A2E" />
          <line x1="80" y1="20" x2="80" y2="6" stroke="#D69A2E" strokeWidth="3" />
          <circle cx="80" cy="5" r="4.5" fill="#3FD68E" />
          <ellipse cx="55" cy="80" rx="7" ry="4.5" fill="#F2635B" opacity="0.35" />
          <ellipse cx="105" cy="80" rx="7" ry="4.5" fill="#F2635B" opacity="0.35" />
          <g className="mascot-blink">
            <ellipse cx="64" cy="72" rx="6" ry="8" fill="#1B1204" />
            <ellipse cx="96" cy="72" rx="6" ry="8" fill="#1B1204" />
            <circle cx="62" cy="68" r="2" fill="#fff" />
            <circle cx="94" cy="68" r="2" fill="#fff" />
          </g>
          <path d="M70 88 Q80 95 90 88" stroke="#1B1204" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
