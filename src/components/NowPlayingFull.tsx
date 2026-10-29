import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { lyrics as demoLyrics, type LyricLine } from '../data/mock';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

export function NowPlayingFull({ navigate }: { navigate: (route: Route) => void }) {
  const player = usePlayer();
  const netease = useNetease();
  const { setNpFull, openMenu, toast } = useUi();
  const track = player.track;
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [waking, setWaking] = useState(false);
  const idleTimer = useRef<number | null>(null);
  const wakeTimer = useRef<number | null>(null);
  const immersiveRef = useRef(false);
  const wakingRef = useRef(false);
  const [coverHue, setCoverHue] = useState(track?.hue ?? 210);
  const [coverColor, setCoverColor] = useState<string | null>(null);
  const [cloudLyrics, setCloudLyrics] = useState<LyricLine[] | null>(null);
  const lyricsScrollRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const flipFromRef = useRef<DOMRect | null>(null);
  const lyricRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!track) return;
    setCoverHue(track.hue);
    setCoverColor(null);
    if (!track.coverUrl) return;
    let alive = true;
    window.spoteasy?.netease
      ?.coverColor(track.coverUrl)
      .then((result) => {
        if (alive && typeof result?.hue === 'number') setCoverHue(result.hue);
        if (alive && typeof result?.color === 'string') setCoverColor(result.color);
      })
      .catch(() => {
        /* keep track.hue fallback */
      });
    return () => {
      alive = false;
    };
  }, [track?.id, track?.coverUrl, track?.hue]);

  useEffect(() => {
    immersiveRef.current = immersive;
  }, [immersive]);

  useEffect(() => {
    const arm = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (immersiveRef.current) return;
      idleTimer.current = window.setTimeout(() => {
        flipFromRef.current = coverRef.current?.getBoundingClientRect() ?? null;
        setLyricsOpen(false);
        immersiveRef.current = true;
        setImmersive(true);
      }, 5000);
    };
    const exitImmersive = () => {
      if (!immersiveRef.current || wakingRef.current) return;
      wakingRef.current = true;
      flipFromRef.current = coverRef.current?.getBoundingClientRect() ?? null;
      setWaking(true);
      if (wakeTimer.current) window.clearTimeout(wakeTimer.current);
      wakeTimer.current = window.setTimeout(() => {
        setImmersive(false);
        immersiveRef.current = false;
        setWaking(false);
        wakingRef.current = false;
        arm();
      }, 420);
    };
    const onMove = () => {
      if (!immersiveRef.current) arm();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (immersiveRef.current) {
        const target = event.target;
        // 单击封面本身不退出；必须点封面以外的地方
        if (target instanceof Element && target.closest('.np-full-cover-wrap')) return;
        event.preventDefault();
        event.stopPropagation();
        exitImmersive();
      } else {
        arm();
      }
    };
    const onKeyDown = () => {
      if (!immersiveRef.current) arm();
    };
    arm();
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (wakeTimer.current) window.clearTimeout(wakeTimer.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!lyricsOpen || !track) return;
    if (track.source !== 'netease' || !track.cloudId) {
      setCloudLyrics(null);
      return;
    }
    let alive = true;
    netease
      .lyrics(track)
      .then((lines) => {
        if (alive) setCloudLyrics(lines);
      })
      .catch(() => {
        if (alive) setCloudLyrics([]);
      });
    return () => {
      alive = false;
    };
  }, [lyricsOpen, netease, track?.id, track?.source, track?.cloudId]);

  useLayoutEffect(() => {
    const from = flipFromRef.current;
    if (!from) return;
    flipFromRef.current = null;
    if (
      document.documentElement.dataset.reduceMotion === '1' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const element = coverRef.current;
    if (!element) return;
    const to = element.getBoundingClientRect();
    if (!to.width || !to.height) return;
    const scaleX = from.width / to.width;
    const scaleY = from.height / to.height;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    element.style.transition = 'none';
    element.style.transformOrigin = 'center center';
    element.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
    void element.offsetWidth;
    requestAnimationFrame(() => {
      element.style.transition = 'transform 0.52s cubic-bezier(0.22, 0.9, 0.28, 1)';
      element.style.transform = 'translate(0, 0) scale(1, 1)';
    });
    const timer = window.setTimeout(() => {
      element.style.transition = '';
      element.style.transform = '';
    }, 580);
    return () => window.clearTimeout(timer);
  }, [immersive]);

  const lyricLines = useMemo<LyricLine[]>(() => {
    if (!track || !lyricsOpen) return [];
    if (track.source === 'netease') return cloudLyrics ?? [];
    if (track.id === 't1') return demoLyrics;
    return [];
  }, [cloudLyrics, lyricsOpen, track?.id, track?.source]);

  const activeLyric = useMemo(() => {
    let index = 0;
    lyricLines.forEach((line, i) => {
      if (line.time <= player.progress + 0.15) index = i;
    });
    return index;
  }, [lyricLines, player.progress]);

  useEffect(() => {
    if (!lyricsOpen) return;
    const line = lyricRefs.current[activeLyric];
    const box = lyricsScrollRef.current;
    if (!line || !box) return;
    const top = line.offsetTop - box.clientHeight / 2 + line.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [activeLyric, lyricsOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setNpFull(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setNpFull]);

  if (!track) return null;

  const isCloud = track.source === 'netease' && Boolean(track.cloudId);
  const hiResCover = useMemo(() => {
    if (!track?.coverUrl) return undefined;
    if (!/^https?:\/\//i.test(track.coverUrl)) return track.coverUrl;
    if (/[?&]param=\d+y\d+/.test(track.coverUrl)) {
      return track.coverUrl.replace(/([?&])param=\d+y\d+/, '$1param=1024y1024');
    }
    return `${track.coverUrl}?param=1024y1024`;
  }, [track?.coverUrl]);

  const openArtist = () => {
    if (isCloud && track.cloudArtistIds?.length) {
      navigate({ name: 'cloudArtist', id: String(track.cloudArtistIds[0]) });
    } else if (track.artist) {
      navigate({ name: 'artist', id: track.artist });
    }
  };
  const openAlbum = () => {
    if (track.cloudAlbumId) navigate({ name: 'cloudAlbum', id: String(track.cloudAlbumId) });
    else if (track.album) navigate({ name: 'album', id: track.album });
  };
  const share = () => {
    const link = isCloud
      ? `https://music.163.com/song?id=${track.cloudId}`
      : `${track.title} — ${track.artist}`;
    navigator.clipboard?.writeText(link).catch(() => undefined);
    toast('链接已复制');
  };

  return (
    <>
      <div
        className={`np-immersive-blackout ${immersive ? 'is-on' : ''} ${waking ? 'is-waking' : ''}`}
        aria-hidden="true"
      />
      <section
        className={`np-full ${immersive ? 'is-immersive' : ''} ${waking ? 'is-waking' : ''}`}
      style={{
        ['--np-hue' as string]: coverHue,
        ['--np-color' as string]: coverColor ?? `hsl(${coverHue} 45% 28%)`,
      }}
    >
      <header className="np-full-head">
        <span className="np-full-context" title={player.contextName || '正在播放'}>
          {player.contextName || '正在播放'}
        </span>
        <div className="np-full-actions">
          <button
            type="button"
            className={`icon-btn ${lyricsOpen ? 'is-on' : ''}`}
            onClick={() => setLyricsOpen((value) => !value)}
            title={lyricsOpen ? '隐藏歌词' : '显示歌词'}
            aria-label={lyricsOpen ? '隐藏歌词' : '显示歌词'}
          >
            <Icon name="lyrics" size={20} />
          </button>
          <button type="button" className="icon-btn" onClick={openArtist} title="转至艺人" aria-label="转至艺人">
            <Icon name="user" size={20} />
          </button>
          <button type="button" className="icon-btn" onClick={share} title="分享" aria-label="分享">
            <Icon name="share" size={20} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="更多操作"
            aria-label="更多操作"
            onClick={(event) => {
              const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
              openMenu(track.id, rect.right - 8, rect.bottom + 8);
            }}
          >
            <Icon name="more" size={20} />
          </button>
          <span className="np-full-sep" />
          <button
            type="button"
            className="icon-btn np-full-shrink"
            onClick={() => setNpFull(false)}
            title="收起播放视图"
            aria-label="收起播放视图"
          >
            <Icon name="exitFullscreen" size={22} />
          </button>
        </div>
      </header>
      <div className={`np-full-stage ${lyricsOpen ? 'has-lyrics' : ''}`}>
        <div className="np-full-cover-wrap" ref={coverRef}>
          <button
            type="button"
            className="np-full-cover-btn"
            onClick={() => setLyricsOpen((value) => !value)}
            title={lyricsOpen ? '隐藏歌词' : '显示歌词'}
          >
            <Cover
              hue={track.hue}
              variant={track.variant}
              label={track.title}
              src={hiResCover}
              className="np-full-cover"
            />
          </button>
        </div>
        <div className="np-full-lyrics" aria-hidden={!lyricsOpen}>
          <div className="np-full-lyrics-scroll" ref={lyricsScrollRef}>
            {lyricLines.length === 0 ? (
              <div className="np-full-lyrics-empty">还没有这首歌的歌词</div>
            ) : (
              lyricLines.map((line, index) => (
                <button
                  key={`${line.time}-${index}`}
                  ref={(element) => {
                    lyricRefs.current[index] = element;
                  }}
                  type="button"
                  className={`np-full-lyric-line ${index === activeLyric ? 'is-active' : ''}`}
                  onClick={() => player.seek(line.time)}
                >
                  {line.text || ' '}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="np-full-immersive-meta">
        <strong>{track.title}</strong>
        <span>{track.artist}</span>
      </div>
      </section>
    </>
  );
}
