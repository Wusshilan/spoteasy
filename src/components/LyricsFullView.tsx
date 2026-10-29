import { useEffect, useMemo, useRef, useState } from 'react';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { formatTime, lyrics as demoLyrics, type LyricLine } from '../data/mock';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

export function LyricsFullView({ navigate }: { navigate: (route: Route) => void }) {
  const player = usePlayer();
  const netease = useNetease();
  const { setLyricsFull, openMenu, toast } = useUi();
  const track = player.track;
  const [cloudLyrics, setCloudLyrics] = useState<LyricLine[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setLyricsFull(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setLyricsFull]);

  useEffect(() => {
    if (!track || track.source !== 'netease' || !track.cloudId) {
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
  }, [track?.id, netease]);

  const lines = useMemo<LyricLine[]>(() => {
    if (track?.source === 'netease') return cloudLyrics ?? [];
    if (track?.id === 't1') return demoLyrics;
    return [];
  }, [track?.id, track?.source, cloudLyrics]);

  const activeLine = useMemo(() => {
    let index = 0;
    lines.forEach((line, i) => {
      if (player.progress >= line.time) index = i;
    });
    return index;
  }, [player.progress, lines]);

  useEffect(() => {
    const el = lineRefs.current[activeLine];
    const box = scrollRef.current;
    if (!el || !box) return;
    const top =
      el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight / 2 + el.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [activeLine, lines.length]);

  if (!track) return null;

  const isCloud = track.source === 'netease' && Boolean(track.cloudId);
  const isLiked = isCloud ? netease.likedIds.has(track.cloudId as number) : player.liked.has(track.id);
  const context = player.contextName || '正在播放';

  const toggleLike = () => {
    if (isCloud) {
      if (!netease.loggedIn) {
        toast('请先登录');
        netease.openLogin();
        return;
      }
      netease
        .toggleCloudLike(track.cloudId as number)
        .then((next) => toast(next ? '已添加到音乐库' : '已从音乐库移除'))
        .catch(() => toast('操作失败'));
    } else {
      player.toggleLike();
    }
  };
  const openArtist = () => {
    if (isCloud && track.cloudArtistIds?.length) {
      navigate({ name: 'cloudArtist', id: String(track.cloudArtistIds[0]) });
    } else if (track.artist) {
      navigate({ name: 'artist', id: track.artist });
    }
  };
  const share = () => {
    const link = isCloud
      ? `https://music.163.com/song?id=${track.cloudId}`
      : `${track.title} — ${track.artist}`;
    navigator.clipboard?.writeText(link).catch(() => undefined);
    toast('链接已复制');
  };

  return (
    <section className="lyrics-full" style={{ ['--lyric-hue' as string]: track.hue }}>
      <div className="lyrics-full-bg" aria-hidden="true">
        <Cover hue={track.hue} variant={track.variant} label={track.title} src={track.coverUrl} />
      </div>
      <header className="lyrics-full-head">
        <span className="lyrics-full-context" title={context}>
          {context}
        </span>
        <div className="lyrics-full-actions">
          <button
            type="button"
            className={`icon-btn ${isLiked ? 'is-liked' : ''}`}
            onClick={toggleLike}
            title={isLiked ? '从音乐库中移除' : '添加到音乐库'}
            aria-label={isLiked ? '从音乐库中移除' : '添加到音乐库'}
          >
            <Icon name={isLiked ? 'check' : 'plus'} size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={openArtist} title="转至艺人" aria-label="转至艺人">
            <Icon name="user" size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={share} title="分享" aria-label="分享">
            <Icon name="share" size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={(event) => {
              const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
              openMenu(track.id, rect.right - 8, rect.bottom + 6);
            }}
            title="更多操作"
            aria-label="更多操作"
          >
            <Icon name="more" size={18} />
          </button>
          <span className="lyrics-full-sep" />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setLyricsFull(false)}
            title="收起歌词"
            aria-label="收起歌词"
          >
            <Icon name="exitFullscreen" size={20} />
          </button>
        </div>
      </header>

      <div className="lyrics-full-scroll" ref={scrollRef}>
        {lines.length === 0 ? (
          <div className="lyrics-full-empty">还没有这首歌的歌词</div>
        ) : (
          <div className="lyrics-full-lines">
            {lines.map((line, index) => (
              <button
                type="button"
                key={`${line.time}-${index}`}
                ref={(el) => {
                  lineRefs.current[index] = el;
                }}
                className={`lyrics-full-line ${index === activeLine ? 'is-active' : ''}`}
                onClick={() => player.seek(line.time)}
              >
                {line.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lyrics-full-foot">
        <span>{formatTime(player.progress)} / {formatTime(track.duration)}</span>
        <span>歌词来自网易云音乐</span>
      </div>
    </section>
  );
}
