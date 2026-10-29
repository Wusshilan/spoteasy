import { useEffect, useState } from 'react';
import { Avatar, Cover } from './CoverArt';
import { Icon } from './Icons';
import { getTrack, registerTracks } from '../data/mock';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

function relativeTime(ms: number): string {
  if (!ms) return '刚刚';
  const diff = Math.max(0, Date.now() - ms);
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  const date = new Date(ms);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function demoEvents(): FriendEvent[] {
  const now = Date.now();
  const first = getTrack('t1');
  const second = getTrack('t5');
  return [
    {
      id: 'demo-friend-1',
      threadId: '',
      type: 18,
      typeDesc: '分享单曲',
      time: now - 32 * 60_000,
      user: { id: 1, name: 'Yuyan Peng', avatarUrl: undefined },
      text: '今晚循环这首，副歌一响就回到夏天的便利店。',
      media: {
        kind: 'song',
        id: first.cloudId,
        title: first.title,
        subtitle: first.artist,
        coverUrl: first.coverUrl,
        track: first,
      },
      images: [],
      liked: false,
      likedCount: 12,
    },
    {
      id: 'demo-friend-2',
      threadId: '',
      type: 18,
      typeDesc: '分享单曲',
      time: now - 3 * 60 * 60_000,
      user: { id: 2, name: '阿树', avatarUrl: undefined },
      text: '通勤路上随机到的一首，窗外刚好下雨。',
      media: {
        kind: 'song',
        id: second.cloudId,
        title: second.title,
        subtitle: second.artist,
        coverUrl: second.coverUrl,
        track: second,
      },
      images: [],
      liked: true,
      likedCount: 38,
    },
  ];
}

export function FriendFeedView({ navigate, demo = false }: { navigate: (route: Route) => void; demo?: boolean }) {
  const netease = useNetease();
  const player = usePlayer();
  const { toast } = useUi();
  const usingDemo = demo && !netease.loggedIn;
  const [events, setEvents] = useState<FriendEvent[]>([]);
  const [lasttime, setLasttime] = useState<number | undefined>(undefined);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(!usingDemo);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginExpired, setLoginExpired] = useState(false);

  useEffect(() => {
    if (usingDemo) {
      setEvents(demoEvents());
      setLoading(false);
      setMore(false);
      setError(null);
      return;
    }
    if (!netease.loggedIn) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    setLoginExpired(false);
    window.spoteasy?.netease
      ?.friendEvents(-1)
      .then((page) => {
        if (!alive) return;
        setEvents(page.events || []);
        setLasttime(page.lasttime);
        setMore(Boolean(page.more));
        setLoginExpired(page.error === 'login required');
        setError(page.error && page.error !== 'login required' ? page.error : null);
      })
      .catch((err) => {
        if (alive) setError(String(err?.message || err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [usingDemo, netease.loggedIn]);

  const loadMore = async () => {
    if (loadingMore || !more) return;
    setLoadingMore(true);
    try {
      const page = await window.spoteasy?.netease?.friendEvents(lasttime ?? -1);
      if (page) {
        setEvents((list) => [...list, ...(page.events || [])]);
        setLasttime(page.lasttime);
        setMore(Boolean(page.more));
      }
    } catch (err) {
      toast('动态加载失败');
    } finally {
      setLoadingMore(false);
    }
  };

  const playMedia = (media: FriendEventMedia | null | undefined) => {
    if (!media) return;
    if (media.kind === 'song' && media.track) {
      registerTracks([media.track]);
      player.play(media.track.id, [media.track.id], '好友动态');
      return;
    }
    if (media.kind === 'album' && Number.isFinite(media.id)) {
      navigate({ name: 'cloudAlbum', id: String(media.id) });
      return;
    }
    if (media.kind === 'playlist' && Number.isFinite(media.id)) {
      navigate({ name: 'playlist', id: `ne-pl-${media.id}` });
      return;
    }
    if (media.kind === 'mv' && Number.isFinite(media.id)) {
      navigate({ name: 'mv', id: String(media.id) });
    }
  };

  const heading = (
    <div className="feed-inner">
      <h1>收听动态</h1>
      <p className="feed-subtitle">好友的最新动态。</p>
    </div>
  );

  if (!netease.loggedIn && !usingDemo) {
    return (
      <div className="feed-page">
        {heading}
        <div className="feed-inner">
          <div className="feed-empty">
            <h2>登录后查看好友动态</h2>
            <p>用网易云账号登录，就能看到好友最新分享的单曲、歌单和图片。</p>
            <button type="button" className="primary-btn" onClick={netease.openLogin}>
              登录网易云
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-page">
      {heading}
      <div className="feed-inner">
        {loading ? (
          <div className="feed-list" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div className="friend-event friend-event-skeleton" key={index}>
                <div className="friend-event-head">
                  <span className="friend-avatar-skeleton" />
                  <span className="friend-meta-skeleton">
                    <span className="feed-skeleton-line is-title" />
                    <span className="feed-skeleton-line is-short" />
                  </span>
                </div>
                <span className="feed-skeleton-line" />
                <span className="feed-skeleton-line is-short" />
              </div>
            ))}
          </div>
        ) : error || loginExpired ? (
          <div className="feed-empty">
            <h2>{loginExpired ? '登录已失效' : '动态加载失败'}</h2>
            <p>{loginExpired ? '请重新登录网易云，再查看好友动态。' : error}</p>
            {loginExpired && (
              <button type="button" className="primary-btn" onClick={netease.openLogin}>
                重新登录
              </button>
            )}
          </div>
        ) : events.length === 0 ? (
          <div className="feed-empty">
            <h2>还没有好友动态</h2>
            <p>关注一些好友，或者过一会儿再来看看。</p>
          </div>
        ) : (
          <div className="feed-list">
            {events.map((event) => (
              <article className="friend-event" key={event.id}>
                <header className="friend-event-head">
                  <Avatar
                    hue={(event.user.id ?? 158) % 360}
                    label={event.user.name}
                    size={44}
                    src={event.user.avatarUrl}
                  />
                  <div className="friend-event-meta">
                    <div className="friend-event-name">{event.user.name}</div>
                    <div className="friend-event-time">
                      {relativeTime(event.time)} · {event.typeDesc || '动态'}
                    </div>
                  </div>
                </header>

                {event.text && <p className="friend-event-text">{event.text}</p>}

                {event.media && (
                  <button
                    type="button"
                    className="friend-media"
                    onClick={() => playMedia(event.media)}
                    aria-label={event.media.title}
                  >
                    <Cover
                      hue={event.user.id ?? 158}
                      variant={(event.media.id ?? 1) % 8}
                      label={event.media.title}
                      src={event.media.coverUrl ?? event.media.track?.coverUrl}
                      className="friend-media-cover"
                    />
                    <span className="friend-media-text">
                      <span className="friend-media-title">{event.media.title}</span>
                      <span className="friend-media-sub">{event.media.subtitle}</span>
                    </span>
                    <span className="friend-media-action">
                      <Icon name={event.media.kind === 'song' ? 'play' : 'arrowRight'} size={16} />
                    </span>
                  </button>
                )}

                {event.images.length > 0 && (
                  <div className={`friend-images is-${Math.min(event.images.length, 3)}`}>
                    {event.images.slice(0, 3).map((url) => (
                      <img key={url} src={url} alt="" loading="lazy" />
                    ))}
                  </div>
                )}
              </article>
            ))}
            {more && (
              <button type="button" className="friend-load-more" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? '加载中…' : '加载更多动态'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
