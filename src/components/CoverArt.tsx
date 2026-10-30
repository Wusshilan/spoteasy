import { useEffect, useId, useState } from 'react';
import { Icon } from './Icons';

function proxyImage(src?: string) {
  return src && /^https?:\/\//i.test(src) && /music\.126\.net/i.test(src)
    ? `spoteasy-img://image?url=${encodeURIComponent(src)}`
    : src;
}

interface CoverProps {
  hue: number;
  variant: number;
  label?: string;
  className?: string;
  title?: string;
  heart?: boolean;
  src?: string;
}

/** 生成式封面：不依赖任何图片资源，离线也有「专辑封面」的层次感。 */
export function Cover({ hue, variant, label = '', className, title, heart = false, src }: CoverProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [src]);
  const h = hue;
  const bg = `hsl(${h} 38% 13%)`;
  const c1 = `hsl(${h} 78% 58%)`;
  const c2 = `hsl(${(h + 38) % 360} 72% 42%)`;
  const c3 = `hsl(${(h + 320) % 360} 62% 30%)`;
  const glyph = (label || title || '·').trim().charAt(0) || '·';
  const resolvedSrc = proxyImage(src);

  const defs = (
    <defs>
      <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={c2} stopOpacity="0.95" />
        <stop offset="0.55" stopColor={bg} />
        <stop offset="1" stopColor={c3} />
      </linearGradient>
      <linearGradient id={`ac${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={c1} />
        <stop offset="1" stopColor={c2} />
      </linearGradient>
      <radialGradient id={`vig${uid}`} cx="0.5" cy="0.42" r="0.75">
        <stop offset="0.45" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.42" />
      </radialGradient>
      <filter id={`blur${uid}`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="12" />
      </filter>
      <filter id={`grain${uid}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <pattern id={`dots${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="1.4" cy="1.4" r="0.75" fill="#fff" fillOpacity="0.22" />
      </pattern>
      <pattern id={`lines${uid}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="#fff" strokeOpacity="0.13" strokeWidth="1" />
      </pattern>
      <linearGradient id={`fade${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.55" />
      </linearGradient>
    </defs>
  );

  let art = null;
  switch (variant % 8) {
    case 0:
      art = (
        <>
          <rect width="100" height="100" fill={`url(#bg${uid})`} />
          <g filter={`url(#blur${uid})`}>
            <ellipse cx="70" cy="22" rx="36" ry="22" fill={c1} fillOpacity="0.66" />
            <ellipse cx="26" cy="74" rx="30" ry="20" fill={c2} fillOpacity="0.62" />
            <ellipse cx="56" cy="56" rx="17" ry="14" fill={`hsl(${(h + 200) % 360} 72% 62%)`} fillOpacity="0.4" />
          </g>
          <path
            d="M-8 84 C 16 58, 36 96, 58 72 S 86 42, 110 56"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.46"
            strokeWidth="1.1"
          />
          <path
            d="M-8 92 C 16 66, 36 104, 58 80 S 86 50, 110 64"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.16"
            strokeWidth="1"
          />
          <circle cx="74" cy="30" r="8" fill={c1} fillOpacity="0.92" />
          <circle cx="74" cy="30" r="15" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.7" />
        </>
      );
      break;
    case 1:
      art = (
        <>
          <rect width="100" height="100" fill={bg} />
          <rect width="100" height="100" fill={`url(#lines${uid})`} />
          <path d="M0 100 58 0h42L42 100z" fill={`url(#ac${uid})`} fillOpacity="0.82" />
          <circle cx="22" cy="24" r="11" fill="#fff" fillOpacity="0.14" />
        </>
      );
      break;
    case 2:
      art = (
        <>
          <rect width="100" height="100" fill={bg} />
          <radialGradient id={`r2${uid}`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor={c1} stopOpacity="0.85" />
            <stop offset="1" stopColor={bg} stopOpacity="0" />
          </radialGradient>
          <rect width="100" height="100" fill={`url(#r2${uid})`} />
          {[14, 24, 34, 44].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="0.9" />
          ))}
          <circle cx="66" cy="34" r="8" fill={c1} fillOpacity="0.9" />
        </>
      );
      break;
    case 3:
      art = (
        <>
          <rect width="100" height="100" fill={`url(#bg${uid})`} />
          <rect width="100" height="100" fill={`url(#dots${uid})`} />
          <path d="M-4 76 62 10h42v18L40 100H-4z" fill={c1} fillOpacity="0.8" />
          <circle cx="72" cy="70" r="16" fill="#121212" fillOpacity="0.55" />
          <circle cx="72" cy="70" r="5" fill="#fff" fillOpacity="0.8" />
        </>
      );
      break;
    case 4:
      art = (
        <>
          <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`hsl(${h} 55% 30%)`} />
            <stop offset="0.62" stopColor={c1} stopOpacity="0.9" />
            <stop offset="0.63" stopColor={`hsl(${(h + 20) % 360} 45% 12%)`} />
            <stop offset="1" stopColor={`hsl(${h} 40% 7%)`} />
          </linearGradient>
          <rect width="100" height="100" fill={`url(#sky${uid})`} />
          <circle cx="50" cy="63" r="15" fill="#fff" fillOpacity="0.92" />
          <rect y="64" width="100" height="36" fill={`hsl(${h} 45% 8%)`} />
          <rect y="64" width="100" height="0.7" fill="#fff" fillOpacity="0.4" />
          <rect y="74" width="100" height="0.5" fill="#fff" fillOpacity="0.12" />
          <rect y="86" width="100" height="0.5" fill="#fff" fillOpacity="0.08" />
        </>
      );
      break;
    case 5:
      art = (
        <>
          <rect width="100" height="100" fill={`url(#bg${uid})`} />
          <rect width="100" height="100" filter={`url(#grain${uid})`} opacity="0.16" />
          <text
            x="50"
            y="55"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fillOpacity="0.94"
            fontSize="46"
            fontWeight="800"
            fontFamily="MiSans, Inter, system-ui, sans-serif"
            letterSpacing="-2"
          >
            {glyph}
          </text>
          <rect x="10" y="86" width="22" height="2" fill={c1} />
          <circle cx="86" cy="14" r="5" fill={c1} fillOpacity="0.85" />
        </>
      );
      break;
    case 6:
      art = (
        <>
          <rect width="100" height="100" fill={bg} />
          <rect width="100" height="100" fill={`url(#ac${uid})`} opacity="0.38" />
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M-5 ${28 + i * 16} C 20 ${12 + i * 16}, 42 ${46 + i * 16}, 66 ${30 + i * 16} S 96 ${40 + i * 16}, 108 ${26 + i * 16}`}
              fill="none"
              stroke="#fff"
              strokeOpacity={0.5 - i * 0.09}
              strokeWidth={1.4 - i * 0.15}
            />
          ))}
          <circle cx="76" cy="72" r="18" fill={c3} fillOpacity="0.55" filter={`url(#blur${uid})`} />
        </>
      );
      break;
    default:
      art = (
        <>
          <rect width="100" height="100" fill={`url(#bg${uid})`} />
          {Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: 4 }, (_, col) => {
              const on = (row * 3 + col * 5) % 7 < 3;
              return on ? (
                <rect
                  key={`${row}-${col}`}
                  x={col * 25 + 2}
                  y={row * 25 + 2}
                  width="21"
                  height="21"
                  rx="4"
                  fill={col % 2 === row % 2 ? c1 : c2}
                  fillOpacity={0.2 + ((row + col) % 3) * 0.16}
                />
              ) : (
                <rect
                  key={`${row}-${col}`}
                  x={col * 25 + 2}
                  y={row * 25 + 2}
                  width="21"
                  height="21"
                  rx="4"
                  fill="#fff"
                  fillOpacity="0.045"
                />
              );
            }),
          )}
        </>
      );
  }

  return (
    <div className={`cover ${className || ''}`} title={title}>
      {src && !imageFailed ? (
        <img
          className="cover-img"
          src={resolvedSrc}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {defs}
          {art}
          <rect width="100" height="100" fill={`url(#vig${uid})`} />
        </svg>
      )}
      {heart && (
        <span className="cover-heart" aria-hidden="true">
          <Icon name="heartFill" size={28} />
        </span>
      )}
    </div>
  );
}

export function Avatar({
  hue,
  label,
  size = 40,
  src,
}: {
  hue: number;
  label: string;
  size?: number;
  src?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [src]);
  const resolvedSrc = proxyImage(src);

  if (resolvedSrc && !imageFailed) {
    return (
      <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
        <img src={resolvedSrc} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
      </div>
    );
  }

  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id={`av${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={`hsl(${hue} 62% 46%)`} />
            <stop offset="1" stopColor={`hsl(${(hue + 45) % 360} 58% 28%)`} />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="20" fill={`url(#av${uid})`} />
      </svg>
      <span>{label.trim().charAt(0)}</span>
    </div>
  );
}
