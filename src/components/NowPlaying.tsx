import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Cover } from './CoverArt';
import { Icon } from './Icons';
import { formatCount, formatTime, lyrics as demoLyrics, type LyricLine } from '../data/mock';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

export function NowPlaying({
  navigate,
  demoHover = false,
  forceLyrics = false,
}: {
  navigate: (route: Route) => void;
  demoHover?: boolean;
  forceLyrics?: boolean;
}) {
  const player = usePlayer();
  const netease = useNetease();
  const fetchCloudLyrics = netease.lyrics;
  const { setPanelOpen, setNpFull, openMenu, toast, panelTab } = useUi();
  const [cloudLyrics, setCloudLyrics] = useState<LyricLine[] | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [followers, setFollowers] = useState<number | null>(null);
  const [artistAvatar, setArtistAvatar] = useState<string | undefined>(undefined);
  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  const [lyricsStart, setLyricsStart] = useState(0);
  const [followed, setFollowed] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lyricsCardRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLElement>(null);
  const previousTab = useRef(panelTab);

  const track = player.track;

  useEffect(() => {
    setFollowers(null);
    setArtistAvatar(undefined);
    setFollowed(null);
    setLyricsExpanded(false);
    setLyricsStart(0);
    scrollRef.current?.scrollTo({ top: 0 });
    if (!track || track.source !== 'netease' || !track.cloudArtistIds?.length) return;
    let alive = true;
    window.spoteasy?.netease
      ?.artistStat(track.cloudArtistIds[0])
      .then((stat) => {
        if (alive) {
          setFollowers(stat?.followers ?? 0);
          setArtistAvatar(stat?.avatarUrl);
        }
      })
      .catch(() => {
        if (alive) setFollowers(null);
      });
    return () => {
      alive = false;
    };
  }, [track?.id, track?.source]);

  useEffect(() => {
    if (forceLyrics) setLyricsExpanded(true);
  }, [forceLyrics, track?.id]);

  useEffect(() => {
    if (previousTab.current !== panelTab) {
      const target = panelTab === 'lyrics' ? lyricsCardRef.current : nextRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    previousTab.current = panelTab;
  }, [panelTab]);

  useEffect(() => {
    if (!track || track.source !== 'netease' || !track.cloudId) {
      setCloudLyrics(null);
      setCloudLoading(false);
      return;
    }
    let alive = true;
    setCloudLyrics(null);
    setCloudLoading(true);
    fetchCloudLyrics(track)
      .then((lines) => {
        if (alive) setCloudLyrics(lines);
      })
      .catch(() => {
        if (alive) setCloudLyrics([]);
      })
      .finally(() => {
        if (alive) setCloudLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [track?.id, fetchCloudLyrics]);

  const lines = useMemo<LyricLine[]>(() => {
    if (track?.source === 'netease') return cloudLyrics ?? [];
    if (track?.id === 't1') return demoLyrics;
    return [];
  }, [track?.id, track?.source, cloudLyrics]);

  const hasLyrics = lines.length > 0;
  const activeLine = useMemo(() => {
    let idx = 0;
    lines.forEach((line, i) => {
      if (player.progress >= line.time) idx = i;
    });
    return idx;
  }, [player.progress, lines]);

  if (!track) return null;

  const isCloud = track.source === 'netease' && Boolean(track.cloudId);
  const isLiked = isCloud
    ? netease.likedIds.has(track.cloudId as number)
    : player.liked.has(track.id);
  const artistCloudId = track.source === 'netease' ? track.cloudArtistIds?.[0] : undefined;
  const knownArtist = artistCloudId
    ? netease.myArtists.find((artist) => artist.cloudId === artistCloudId)
    : undefined;
  const isFollowing = followed ?? Boolean(knownArtist);
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
        .then((next) => toast(next ? '已添加到喜欢的音乐' : '已从喜欢中移除'))
        .catch(() => toast('操作失败'));
    } else {
      player.toggleLike();
    }
  };

  const openArtist = () => {
    if (artistCloudId) {
      navigate({ name: 'cloudArtist', id: String(artistCloudId) });
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

  const toggleFollow = async () => {
    if (!artistCloudId) return;
    const next = !isFollowing;
    const result = await window.spoteasy?.netease?.artistSub(artistCloudId, next).catch(() => ({ ok: false }));
    if (!result?.ok) {
      toast('操作失败，请稍后再试');
      return;
    }
    setFollowed(next);
    netease.refreshMyMusic();
    toast(next ? `已关注 ${track.artist}` : `已取消关注 ${track.artist}`);
  };

  const previewLines = hasLyrics
    ? lyricsExpanded
      ? lines.slice(lyricsStart, lyricsStart + 8)
      : lines.slice(activeLine, activeLine + 2)
    : [];

  const toggleLyrics = () => {
    if (!lyricsExpanded) setLyricsStart(Math.max(0, Math.min(activeLine - 1, lines.length - 8)));
    setLyricsExpanded((value) => !value);
  };

  const queue = player.queue.slice(0, 5);

  return (
    <aside className={`np-panel ${demoHover ? 'is-demo-hover' : ''}`} style={{ ['--np-hue' as string]: track.hue }}>
      <div className="np-ambient" />
      <header className="np-head">
        <button
          type="button"
          className="np-collapse"
          aria-label="收起播放视图"
          title="收起播放视图"
          onClick={() => setPanelOpen(false)}
        >
          <Icon name="panelRight" size={20} />
        </button>
        <span className="np-context" title={context}>
          {context}
        </span>
        <div className="np-head-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="更多操作"
            title="更多操作"
            onClick={(event) => {
              const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
              openMenu(track.id, rect.right - 8, rect.bottom + 6);
            }}
          >
            <Icon name="more" size={20} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="展开播放视图"
            title="展开播放视图"
            onClick={() => setNpFull(true)}
          >
            <Icon name="expand" size={20} />
          </button>
        </div>
      </header>

      <div className="np-scroll" ref={scrollRef}>
        <div className="np-top">
          <div className="np-cover-wrap">
            <Cover
              key={track.id}
              hue={track.hue}
              variant={track.variant}
              label={track.title}
              src={track.coverUrl}
              className="np-cover"
            />
          </div>

          <div className="np-info">
            <div className="np-text">
              <div className="np-title">{track.title}</div>
              <button type="button" className="np-artist" onClick={openArtist} title={track.artist}>
                {track.artist}
              </button>
            </div>
            <div className="np-info-actions">
              <button type="button" className="icon-btn" onClick={share} aria-label="分享" title="分享">
                <Icon name="share" size={20} />
              </button>
              <button
                type="button"
                className={`np-save ${isLiked ? 'is-liked' : ''}`}
                onClick={toggleLike}
                aria-label={isLiked ? '取消喜欢' : '喜欢'}
                title={isLiked ? '取消喜欢' : '喜欢'}
              >
                <Icon name={isLiked ? 'check' : 'plus'} size={16} />
              </button>
            </div>
          </div>

        </div>

        <section className={`np-lyrics-card ${lyricsExpanded ? 'is-expanded' : ''}`} ref={lyricsCardRef}>
          <div className="np-card-head">
            <span>{lyricsExpanded ? '歌词' : '歌词预览'}</span>
            {hasLyrics && (
              <button
                type="button"
                className="np-card-expand"
                onClick={toggleLyrics}
                aria-label={lyricsExpanded ? '收起歌词' : '展开歌词'}
              >
                <Icon name={lyricsExpanded ? 'exitFullscreen' : 'expand'} size={16} />
              </button>
            )}
          </div>
          {hasLyrics ? (
            <div className="np-lyric-lines">
              {previewLines.map((line, index) => {
                const indexInAll = lyricsExpanded ? lyricsStart + index : activeLine + index;
                return (
                  <button
                    type="button"
                    key={`${line.time}-${index}`}
                    className={`np-lyric ${indexInAll === activeLine ? 'is-active' : ''}`}
                    onClick={() => player.seek(line.time)}
                  >
                    {line.text}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="np-lyrics-empty">
              {cloudLoading ? '歌词加载中…' : '还没有这首歌的歌词'}
            </div>
          )}
          {hasLyrics && (
            <button type="button" className="np-lyrics-pill" onClick={toggleLyrics}>
              {lyricsExpanded ? '收起' : '显示更多'}
            </button>
          )}
        </section>

        {track.artist && (
          <section className="np-section np-about">
            <h3>关于艺人</h3>
            <div className="np-about-row">
              <Avatar hue={track.hue} label={track.artist} size={56} src={knownArtist?.avatarUrl || artistAvatar} />
              <div className="np-about-text">
                <button type="button" className="np-about-name" onClick={openArtist}>
                  {track.artist}
                </button>
                <span className="np-about-sub">
                  {followers != null && followers > 0
                    ? `${formatCount(followers)} 位关注者`
                    : '音乐人'}
                </span>
              </div>
              {artistCloudId && (
                <button type="button" className={`np-follow ${isFollowing ? 'is-on' : ''}`} onClick={toggleFollow}>
                  {isFollowing ? '已关注' : '关注'}
                </button>
              )}
            </div>
          </section>
        )}

        <section className="np-section np-songinfo">
          <h3>歌曲信息</h3>
          <div className="np-kv">
            <span>专辑</span>
            <button type="button" onClick={openAlbum}>
              {track.album}
            </button>
          </div>
          <div className="np-kv">
            <span>时长</span>
            <span>{formatTime(track.duration)}</span>
          </div>
          <div className="np-kv">
            <span>来源</span>
            <span>{isCloud ? '在线' : '本地'}</span>
          </div>
        </section>

        <section className="np-section np-next" ref={nextRef}>
          <h3>下一首播放</h3>
          {queue.length === 0 && <div className="np-next-empty">队列是空的</div>}
          {queue.map((item, index) => (
            <button
              type="button"
              key={`${item.id}-${index}`}
              className="np-next-row"
              onClick={() => player.play(item.id, player.order, player.contextName)}
            >
              <Cover hue={item.hue} variant={item.variant} label={item.title} src={item.coverUrl} className="np-next-cover" />
              <span className="np-next-text">
                <span className="np-next-title">{item.title}</span>
                <span className="np-next-artist">{item.artist}</span>
              </span>
              <span className="np-next-time">{formatTime(item.duration)}</span>
            </button>
          ))}
        </section>
      </div>
    </aside>
  );
}

export function NowPlayingEmpty() {
  const { setPanelOpen } = useUi();
  return (
    <aside className="np-panel np-empty">
      <div className="np-ambient" />
      <header className="np-head">
        <button
          type="button"
          className="np-collapse"
          aria-label="收起播放视图"
          title="收起播放视图"
          onClick={() => setPanelOpen(false)}
        >
          <Icon name="panelRight" size={20} />
        </button>
        <span className="np-context">正在播放</span>
      </header>
      <div className="np-empty-body">
        <span className="np-empty-art">
          <Icon name="note" size={38} />
        </span>
        <h3>还没有在播放</h3>
        <p>从音乐库或搜索里选一首歌开始播放。</p>
      </div>
    </aside>
  );
}

export function NowPlayingRail({ onOpen }: { onOpen: () => void }) {
  const player = usePlayer();
  const track = player.track;
  return (
    <button type="button" className="np-rail" onClick={onOpen} aria-label="展开播放视图" title="展开播放视图">
      <span className="np-rail-card">
        <Icon name="arrowLeft" size={16} />
      </span>
      {track && (
        <span className="np-rail-peek">
          <Cover hue={track.hue} variant={track.variant} label={track.title} src={track.coverUrl} className="np-rail-cover" />
          <span className="np-rail-text">
            <span className="np-rail-title">{track.title}</span>
            <span className="np-rail-artist">{track.artist}</span>
          </span>
        </span>
      )}
    </button>
  );
}
