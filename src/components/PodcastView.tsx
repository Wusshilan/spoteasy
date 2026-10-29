import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { formatCount, registerTracks, type Track } from '../data/mock';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

function formatDate(value?: number) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '--:--';
  const total = Math.round(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function PodcastView({ podcastId, navigate }: { podcastId: number; navigate: (route: Route) => void }) {
  const netease = useNetease();
  const player = usePlayer();
  const { toast } = useUi();
  const [podcast, setPodcast] = useState<NeteasePodcast | null>(null);
  const [programs, setPrograms] = useState<Track[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setPrograms([]);
    netease
      .podcastDetail(podcastId, 0, 20)
      .then((result) => {
        if (!alive) return;
        if (!result.podcast) {
          setError(true);
          return;
        }
        setPodcast(result.podcast);
        setFollowed(Boolean(result.podcast.followed));
        setPrograms(result.programs || []);
        setHasMore(Boolean(result.hasMore));
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [netease.podcastDetail, podcastId]);

  const loadMore = async () => {
    if (!podcast || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await netease.podcastPrograms(podcast.cloudId, programs.length, 20);
      const map = new Map(programs.map((item) => [item.id, item]));
      for (const item of result.programs || []) map.set(item.id, item);
      setPrograms([...map.values()]);
      setHasMore(Boolean(result.hasMore));
    } catch {
      toast('节目加载失败');
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleFollow = async () => {
    if (!podcast) return;
    if (!netease.loggedIn) {
      toast('请先登录');
      netease.openLogin();
      return;
    }
    const api = window.spoteasy?.netease;
    if (!api) return;
    try {
      const result = await api.podcastSub(podcast.cloudId, !followed);
      if (!result.ok) throw new Error(result.error);
      setFollowed((value) => !value);
      toast(followed ? '已取消关注' : '已关注播客');
      netease.refreshMyMusic();
    } catch {
      toast('操作失败');
    }
  };

  const share = async () => {
    if (!podcast) return;
    try {
      await navigator.clipboard.writeText(`https://music.163.com/#/djradio?id=${podcast.cloudId}`);
      toast('播客链接已复制');
    } catch {
      toast('复制失败');
    }
  };

  const playProgram = (track: Track) => {
    if (!programs.length) return;
    registerTracks(programs);
    player.play(track.id, programs.map((item) => item.id), podcast?.name || '播客');
  };

  if (loading) {
    return (
      <div className="podcast-page">
        <div className="podcast-loading">正在加载播客…</div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="podcast-page">
        <div className="podcast-empty">
          <h2>播客加载失败</h2>
          <p>可能是网络或登录状态问题。</p>
          <button type="button" className="podcast-back" onClick={() => navigate({ name: 'home' })}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const hue = podcast.hue;
  return (
    <div className="podcast-page" style={{ ['--podcast-hue' as string]: String(hue) } as CSSProperties}>
      <section className="podcast-hero">
        <Cover
          hue={hue}
          variant={podcast.variant}
          label={podcast.name}
          src={podcast.coverUrl}
          className="podcast-cover"
        />
        <div className="podcast-hero-info">
          <span className="podcast-kicker">播客</span>
          <h1 className="podcast-title">{podcast.name}</h1>
          <div className="podcast-host">
            <span>{podcast.djName}</span>
            {(podcast.programCount || 0) > 0 && <span>{podcast.programCount} 个节目</span>}
            {(podcast.subscriberCount || 0) > 0 && <span>{formatCount(podcast.subscriberCount || 0)} 位关注者</span>}
          </div>
          {podcast.description && <p className="podcast-description">{podcast.description}</p>}
          <div className="podcast-actions">
            <button type="button" className="podcast-play" onClick={() => programs[0] && playProgram(programs[0])}>
              <Icon name="play" size={18} />
              播放最新一集
            </button>
            <button type="button" className={`podcast-follow ${followed ? 'is-on' : ''}`} onClick={() => void toggleFollow()}>
              <Icon name={followed ? 'check' : 'plus'} size={16} />
              {followed ? '已关注' : '关注'}
            </button>
            <button type="button" className="podcast-share" aria-label="分享播客" title="分享播客" onClick={() => void share()}>
              <Icon name="share" size={17} />
            </button>
          </div>
        </div>
      </section>

      <section className="podcast-programs">
        <div className="podcast-section-head">
          <h2>节目</h2>
          <span>{podcast.programCount || programs.length} 集</span>
        </div>
        {programs.length === 0 ? (
          <div className="podcast-empty">这个播客还没有可播放的单集。</div>
        ) : (
          <div className="podcast-program-list">
            {programs.map((program, index) => {
              const active = player.track?.id === program.id;
              return (
                <button
                  key={program.id}
                  type="button"
                  className={`podcast-program-row ${active ? 'is-active' : ''}`}
                  onClick={() => playProgram(program)}
                >
                  <span className="podcast-program-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="podcast-program-main">
                    <span className="podcast-program-title">{program.title}</span>
                    <span className="podcast-program-meta">
                      {formatDate(program.publishedAt)}
                      {program.serialNum ? ` · 第 ${program.serialNum} 期` : ''}
                    </span>
                  </span>
                  <span className="podcast-program-duration">{formatDuration(program.duration)}</span>
                  <span className="podcast-program-play" aria-hidden="true">
                    <Icon name={active && player.playing ? 'pause' : 'play'} size={15} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {hasMore && (
          <button type="button" className="podcast-load-more" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? '加载中…' : '加载更多节目'}
          </button>
        )}
      </section>
    </div>
  );
}
