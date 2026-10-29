import type { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'home'
  | 'search'
  | 'library'
  | 'plus'
  | 'arrowLeft'
  | 'arrowRight'
  | 'chevronDown'
  | 'chevronRight'
  | 'play'
  | 'pause'
  | 'next'
  | 'prev'
  | 'shuffle'
  | 'repeat'
  | 'repeatOne'
  | 'heart'
  | 'heartFill'
  | 'more'
  | 'volume'
  | 'volumeLow'
  | 'mute'
  | 'queue'
  | 'device'
  | 'fullscreen'
  | 'exitFullscreen'
  | 'pip'
  | 'lyrics'
  | 'comment'
  | 'headphones'
  | 'clock'
  | 'download'
  | 'check'
  | 'x'
  | 'minimize'
  | 'maximize'
  | 'restore'
  | 'close'
  | 'note'
  | 'share'
  | 'connect'
  | 'block'
  | 'userPlus'
  | 'alert'
  | 'link'
  | 'trash'
  | 'sparkle'
  | 'disc'
  | 'user'
  | 'sliders'
  | 'palette'
  | 'radio'
  | 'cast'
  | 'panel'
  | 'mic'
  | 'plusCircle'
  | 'premium'
  | 'bell'
  | 'users'
  | 'expand'
  | 'sort'
  | 'panelOpen'
  | 'panelRight'
  | 'grid'
  | 'listView'
  | 'notePlus'
  | 'slidersV'
  | 'blend'
  | 'folder'
  | 'pin'
  | 'xLg'
  | 'homeOutline'
  | 'browse'
  | 'browseFill';

const stroke: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="7.2" />
      <path d="m16.2 16.2 4.4 4.4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  expand: <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />,
  sort: <path d="M4 6h16M4 12h10M4 18h6" />,
  panelOpen: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16M15 9l-3 3 3 3" />
    </>
  ),
  panelRight: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M15 4v16M9 9l3 3-3 3" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  listView: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.5-3.2 2.6-5 5.5-5s5 1.8 5.5 5" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M17.2 15c2 .5 3.2 2.2 3.5 5" />
    </>
  ),
  arrowLeft: <path d="M15 4 7 12l8 8" />,
  arrowRight: <path d="M9 4l8 8-8 8" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  prev: (
    <>
      <path d="M19 5.1v13.8L9 12z" fill="currentColor" stroke="none" />
      <rect x="5" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  next: (
    <>
      <path d="M5 5.1v13.8L15 12z" fill="currentColor" stroke="none" />
      <rect x="16.6" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  shuffle: (
    <>
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.8 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.5-.6-3.3-1.7l-.8-1.1" />
      <path d="m18 14 4 4-4 4" />
    </>
  ),
  repeat: (
    <>
      <path d="M4.6 8.5A3.5 3.5 0 0 1 8.1 5h7.8a3.5 3.5 0 0 1 3.5 3.5v5a3.5 3.5 0 0 1-3.5 3.5H10" />
      <path d="m7.6 13.8-3.1 3.1 3.1 3.1" />
    </>
  ),
  heart: (
    <path d="M12 20.8s-7.4-4.5-9.1-9C1.5 8.2 3.7 5 7.1 5c2 0 3.6 1 4.9 2.7C13.4 6 15 5 17 5c3.3 0 5.5 3.2 4.2 6.9-1.8 4.4-9.1 8.9-9.1 8.9z" />
  ),
  volume: (
    <>
      <path d="M11.2 5 6.6 9H3v6h3.6L11.2 19z" fill="currentColor" stroke="none" />
      <path d="M15.3 8.6a5 5 0 0 1 0 6.8" />
    </>
  ),
  volumeLow: (
    <>
      <path d="M11.2 5 6.6 9H3v6h3.6L11.2 19z" fill="currentColor" stroke="none" />
      <path d="M15.3 8.6a5 5 0 0 1 0 6.8" />
    </>
  ),
  mute: (
    <>
      <path d="M11.2 5 6.6 9H3v6h3.6L11.2 19z" fill="currentColor" stroke="none" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
  queue: (
    <>
      <rect x="3" y="4.5" width="18" height="5" rx="2.5" />
      <path d="M3 13.5h12M3 18.5h12" />
    </>
  ),
  device: (
    <>
      <rect x="2.5" y="4" width="13.5" height="10" rx="1.6" />
      <path d="M6.5 20h6M9.5 14v6" />
      <rect x="17.2" y="9.5" width="4.8" height="10.5" rx="1.3" />
    </>
  ),
  fullscreen: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />,
  exitFullscreen: <path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" />,
  pip: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <rect x="12" y="11" width="8" height="7" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  lyrics: (
    <>
      <path d="M21 11.6a8.4 8.4 0 0 1-9 8.3 9.6 9.6 0 0 1-3.8-.8L3 21l1.4-4.2A8.4 8.4 0 1 1 21 11.6z" />
      <path d="M8 10.5h8M8 14h5" />
    </>
  ),
  comment: <path d="M21 11.6a8.4 8.4 0 0 1-9 8.3 9.6 9.6 0 0 1-3.8-.8L3 21l1.4-4.2A8.4 8.4 0 1 1 21 11.6z" />,
  headphones: (
    <>
      <path d="M4 14.5v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="13.5" width="4" height="7" rx="2" />
      <rect x="17" y="13.5" width="4" height="7" rx="2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 4.3-4.3M12 15l-4.3-4.3" />
      <path d="M4 19.5h16" />
    </>
  ),
  check: <path d="m5 12.5 4.4 4.4L19 6.6" />,
  x: <path d="M6 6 18 18M18 6 6 18" />,
  xLg: <path d="M4.6 4.6 19.4 19.4M19.4 4.6 4.6 19.4" />,
  pin: (
    <g transform="rotate(45 12 12)" fill="currentColor" stroke="none">
      <rect x="7.4" y="3.2" width="9.2" height="9.6" rx="2.2" />
      <rect x="11.1" y="12.4" width="1.8" height="8.6" rx="0.9" />
    </g>
  ),
  notePlus: (
    <>
      <path d="M11.4 18.2V6.6l8.4-1.7v11.6" />
      <circle cx="8.9" cy="18.2" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="17.3" cy="16.4" r="2.5" fill="currentColor" stroke="none" />
      <path d="M4.1 5.2v5.2M1.5 7.8h5.2" strokeWidth={1.9} />
    </>
  ),
  slidersV: (
    <>
      <path d="M8 3.8v16.4M16 3.8v16.4" strokeWidth={1.7} />
      <path d="M5 9h6M13 15h6" strokeWidth={2.4} />
    </>
  ),
  blend: (
    <>
      <circle cx="8.2" cy="12" r="5.7" fill="currentColor" stroke="none" opacity="0.55" />
      <circle cx="15.8" cy="12" r="5.7" fill="currentColor" stroke="none" />
    </>
  ),
  folder: (
    <path d="M3.4 6.6a2 2 0 0 1 2-2h3.9l1.9 2.2h7.4a2 2 0 0 1 2 2v9.1a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z" />
  ),
  homeOutline: (
    <path d="M3.6 10.4 12 3.4l8.4 7v9a1.1 1.1 0 0 1-1.1 1.1h-4.5v-6.2H9.2v6.2H4.7a1.1 1.1 0 0 1-1.1-1.1z" />
  ),
  browse: (
    <>
      <path d="M6.4 11.2V6.3A2.1 2.1 0 0 1 8.5 4.2h7a2.1 2.1 0 0 1 2.1 2.1v4.9" />
      <path d="M3 11.4h18l-1.2 8.5a2.2 2.2 0 0 1-2.2 1.9H5.4a2.2 2.2 0 0 1-2.2-1.9z" />
      <ellipse cx="12" cy="16.6" rx="3.4" ry="2.1" fill="currentColor" stroke="none" />
    </>
  ),
  browseFill: (
    <>
      <rect x="6.4" y="4.2" width="11.2" height="4.4" rx="1.8" fill="currentColor" stroke="none" />
      <path
        d="M3 10h18l-1.2 9.9a2.2 2.2 0 0 1-2.2 1.9H5.4a2.2 2.2 0 0 1-2.2-1.9z"
        fill="currentColor"
        stroke="none"
      />
      <ellipse cx="12" cy="16" rx="3.4" ry="2.1" fill="#121212" stroke="none" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12" />
      <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
      <path d="M5.5 14v5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5" />
    </>
  ),
  connect: (
    <>
      <rect x="14.6" y="4" width="6.8" height="16" rx="2" />
      <circle cx="18" cy="14.4" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="18" cy="8.2" r="1" fill="currentColor" stroke="none" />
      <path d="M10.2 6.6H8.8A1.3 1.3 0 0 0 7.5 7.9v8.2a1.3 1.3 0 0 0 1.3 1.3h1.4" />
      <circle cx="8.8" cy="19.6" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  block: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M18.5 8v6M15.5 11h6" />
    </>
  ),
  alert: (
    <>
      <path d="m8 3h8l5 5v8l-5 5H8l-5-5V8z" />
      <path d="M12 7v6M12 16.8v.2" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.8a4.2 4.2 0 0 0 6 0l2.6-2.6a4.2 4.2 0 0 0-6-6l-1.2 1.2" />
      <path d="M14 10.2a4.2 4.2 0 0 0-6 0l-2.6 2.6a4.2 4.2 0 0 0 6 6l1.2-1.2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.9 10l6.6 2-6.6 2-1.9 6.5L10.1 14l-6.6-2 6.6-2z" />
    </>
  ),
  premium: (
    <>
      <path d="M4.3 8.8 8.3 11.8 12 6.4l3.7 5.4 4-3-1.5 8.7H5.8L4.3 8.8Z" />
      <path d="M6.5 20.2h11" />
    </>
  ),
  disc: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2" />
      <circle cx="9" cy="16" r="2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18h1.6a2.4 2.4 0 0 0 0-4.8H13a1.8 1.8 0 0 1-.4-3.6h3.9A4.5 4.5 0 0 0 21 8.1C21 5.3 17 3 12 3z" />
      <circle cx="8" cy="9" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="7.6" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15" />
    </>
  ),
  cast: (
    <>
      <path d="M2.5 8.5a13 13 0 0 1 13 13M2.5 13a8.5 8.5 0 0 1 8.5 8.5M2.5 17.5a4 4 0 0 1 4 4" />
      <path d="M2.5 4.5h19v15h-6" />
    </>
  ),
  panel: (
    <>
      <rect x="2.8" y="4.5" width="18.4" height="15" rx="2.2" />
      <path d="M15.4 4.5v15" />
    </>
  ),
  mic: (
    <g transform="rotate(45 12 12)">
      <rect x="9" y="2.8" width="6" height="10" rx="3" />
      <path d="M12 13v5.2" />
    </g>
  ),
  plusCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
};

export function Icon({
  name,
  size = 24,
  className,
  style,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  if (name === 'home') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        style={style}
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M12.2 2.6a.4.4 0 0 0-.4 0L2.3 9.8a.5.5 0 0 0-.2.4V21a.5.5 0 0 0 .5.5h6.6a.5.5 0 0 0 .5-.5v-5.6h4.6V21a.5.5 0 0 0 .5.5h6.6a.5.5 0 0 0 .5-.5V10.2a.5.5 0 0 0-.2-.4z" />
      </svg>
    );
  }
  if (name === 'library') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        style={style}
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.2 3v18" strokeWidth={2.4} />
        <path d="M8.8 3v18" strokeWidth={2.4} />
        <path d="M14.2 4.2 21.4 8.2v12.6h-7.2z" />
      </svg>
    );
  }
  if (name === 'play') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" fill="currentColor">
        <path d="M7.6 4.2a.8.8 0 0 1 1.2-.7l11 7.5a.9.9 0 0 1 0 1.5l-11 7.5a.8.8 0 0 1-1.2-.7z" />
      </svg>
    );
  }
  if (name === 'pause') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" fill="currentColor">
        <rect x="6.2" y="4.5" width="4" height="15" rx="1" />
        <rect x="13.8" y="4.5" width="4" height="15" rx="1" />
      </svg>
    );
  }
  if (name === 'heartFill') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" fill="currentColor">
        <path d="M12 20.8s-7.4-4.5-9.1-9C1.5 8.2 3.7 5 7.1 5c2 0 3.6 1 4.9 2.7C13.4 6 15 5 17 5c3.3 0 5.5 3.2 4.2 6.9-1.8 4.4-9.1 8.9-9.1 8.9z" />
      </svg>
    );
  }
  if (name === 'more' || name === 'minimize' || name === 'maximize' || name === 'restore' || name === 'close') {
    if (name === 'more') {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" fill="currentColor">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      );
    }
    if (name === 'minimize') {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" stroke="currentColor" strokeWidth={1}>
          <path d="M6 12h12" />
        </svg>
      );
    }
    if (name === 'maximize') {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.1}>
          <rect x="6.5" y="6.5" width="11" height="11" />
        </svg>
      );
    }
    if (name === 'restore') {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.1}>
          <rect x="5.5" y="8.5" width="10" height="10" />
          <path d="M8.5 8.5v-2h10v10h-2" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" stroke="currentColor" strokeWidth={1.1}>
        <path d="M6 6 18 18M18 6 6 18" />
      </svg>
    );
  }
  if (name === 'repeatOne') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {stroke.repeat}
        <path d="M11.4 9.4 12.6 8.6v6.8" strokeWidth={1.6} />
      </svg>
    );
  }
  if (name === 'note') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18.2V6.4l10-2v11.8" />
        <circle cx="6.6" cy="18.2" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="16.6" cy="16.2" r="2.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  const body = stroke[name];
  if (!body) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {body}
    </svg>
  );
}
