import { useEffect, useMemo, useState } from 'react';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { registerTracks } from '../data/mock';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

export type FeedMode = 'whatsNew' | 'following';

interface FeedViewProps {
  mode: FeedMode;
  navigate(route: Route): void;
  demo?: boolean;
}

type Tab = 'all' | 'music' | 'podcast';

const DAY = 86_400_000;

const demoReleases: NeteaseAlbum[] = [
  ['demo-r1', '晚风告白', '陈子晴', 12, 1, 158, 0],
  ['demo-r2', '城市折叠', '周予安', 10, 2, 258, 5],
  ['demo-r3', '山丘与雾', '野径乐队', 1, 3, 118, 3],
  ['demo-r4', '午夜电台', '洛小北', 9, 5, 210, 7],
  ['demo-r5', '海边旅馆', '林晚星', 1, 9, 196, 1],
  ['demo-r6', '橘色日落', '林晚星', 11, 20, 24, 4],
  ['demo-r7', '无声告白', '陈子晴', 1, 45, 286, 2],
  ['demo-r8', '银河修理员', '陈子晴', 10, 120, 252, 5],
].map(([id, name, artist, size, days, hue, variant]) => ({
  id: String(id),
  cloudId: 90000 + Number(String(id).replace(/\D/g, '')),
  source: 'netease' as const,
  name: String(name),
  artist: String(artist),
  artists: [{ name: String(artist) }],
  size: Number(size),
  publishTime: Date.now() - Number(days) * DAY,
  hue: Number(hue),
  variant: Number(variant),
}));

function relativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const day = 86_400_000;
  if (diff < day) return '今天';
  const days = Math.floor(diff / day);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function releaseType(album: NeteaseAlbum): string {
  return album.size > 2 ? '专辑' : '单曲';
}

export function FeedView({ mode, navigate, demo }: FeedViewProps) {
  const netease = useNetease();
  const player = usePlayer();
  const { toast } = useUi();
  const [albums, setAlbums] = useState<NeteaseAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [reloadKey, setReloadKey] = useState(0);
  const [subscribed, setSubscribed] = useState<Set<number>>(() => new Set(netease.myAlbums.map((album) => album.cloudId)));
  const [playing, setPlaying] = useState<number | null>(null);
  const usingDemo = Boolean(demo) && !netease.loggedIn;

  useEffect(() => {
    setSubscribed(new Set(netease.myAlbums.map((album) => album.cloudId)));
  }, [netease.myAlbums]);

  useEffect(() => {
    if (!netease.loggedIn) {
      setAlbums([]);
      setLoading(false);
      return;
    }
    const artists = netease.myArtists.slice(0, 10);
    if (artists.length === 0) {
      if (!netease.myMusicLoading) setLoading(false);
      return;
    }
    const api = window.spoteasy?.netease;
    if (!api) return;
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all(
      artists.map((artist) =>
        api.artistAlbums(artist.cloudId, 4, 0).catch(() => ({ albums: [] as NeteaseAlbum[], hasMore: false })),
      ),
    )
      .then((results) => {
        if (!alive) return;
        const seen = new Set<number>();
        const list: NeteaseAlbum[] = [];
        for (const result of results) {
          for (const album of result.albums || []) {
            if (!album.publishTime || seen.has(album.cloudId)) continue;
            seen.add(album.cloudId);
            list.push(album);
          }
        }
        list.sort((a, b) => b.publishTime - a.publishTime);
        setAlbums(list.slice(0, 24));
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(String(err?.message || err));
        setAlbums([]);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [netease.loggedIn, netease.myArtists, netease.myMusicLoading, reloadKey]);

  const copy = useMemo(
    () =>
      mode === 'whatsNew'
        ? {
            title: '新增内容',
            subtitle: '你关注的艺人、播客和节目的最新发布内容。',
          }
        : {
            title: '收听动态',
            subtitle: '你关注音乐人的最新动态。',
          },
    [mode],
  );

  const visible = tab === 'podcast' ? [] : usingDemo ? demoReleases : albums;

  const openAlbum = (album: NeteaseAlbum) => navigate({ name: 'cloudAlbum', id: String(album.cloudId) });
  const openArtist = (album: NeteaseAlbum) => {
    const id = album.artistId || album.artists?.[0]?.id;
    if (id) navigate({ name: 'cloudArtist', id: String(id) });
    else if (album.artist) navigate({ name: 'search', q: album.artist });
  };

  const toggleSub = async (album: NeteaseAlbum) => {
    if (usingDemo) {
      toast('示例数据，登录后可添加到音乐库');
      return;
    }
    const api = window.spoteasy?.netease;
    if (!api) return;
    const next = !subscribed.has(album.cloudId);
    const result = await api.albumSub(album.cloudId, next).catch(() => ({ ok: false }));
    if (!result?.ok) {
      toast('操作失败，请稍后再试');
      return;
    }
    setSubscribed((current) => {
      const copySet = new Set(current);
      if (next) copySet.add(album.cloudId);
      else copySet.delete(album.cloudId);
      return copySet;
    });
    netease.refreshMyMusic();
    toast(next ? '已添加到音乐库' : '已从音乐库移除');
  };

  const playRelease = async (album: NeteaseAlbum) => {
    if (usingDemo) {
      toast('示例数据，登录后可播放');
      return;
    }
    const api = window.spoteasy?.netease;
    if (!api) return;
    setPlaying(album.cloudId);
    try {
      const detail = await api.album(album.cloudId);
      const tracks = detail.tracks || [];
      if (tracks.length === 0) throw new Error('empty album');
      registerTracks(tracks);
      player.play(tracks[0].id, tracks.map((track) => track.id), album.name);
    } catch {
      toast('暂时无法播放这张专辑');
    } finally {
      setPlaying(null);
    }
  };

  const loginState = (
    <div className="feed-empty">
      <h2>登录后查看{copy.title}</h2>
      <p>用网易云账号登录，就能看到你关注艺人的最新单曲、专辑和动态。</p>
      <button type="button" className="primary-btn" onClick={netease.openLogin}>
        登录
      </button>
    </div>
  );

  const emptyState = (
    <div className="feed-empty">
      <h2>{tab === 'podcast' ? '还没有关注的播客' : '暂时没有新内容'}</h2>
      <p>
        {tab === 'podcast'
          ? '关注播客后，最新单集会出现在这里。'
          : '关注更多歌手后，他们的新单曲和新专辑会出现在这里。'}
      </p>
      <button type="button" className="primary-btn" onClick={() => navigate({ name: 'browse' })}>
        去浏览
      </button>
    </div>
  );

  return (
    <div className={`feed-page feed-${mode}`}>
      <div className="feed-inner">
        <h1>{copy.title}</h1>
        <p className="feed-subtitle">{copy.subtitle}</p>

        {mode === 'whatsNew' && (
          <div className="feed-tabs">
            <button
              type="button"
              className={`chip ${tab === 'music' ? 'is-active' : ''}`}
              onClick={() => setTab((current) => (current === 'music' ? 'all' : 'music'))}
            >
              音乐
            </button>
            <button
              type="button"
              className={`chip ${tab === 'podcast' ? 'is-active' : ''}`}
              onClick={() => setTab((current) => (current === 'podcast' ? 'all' : 'podcast'))}
            >
              播客和节目
            </button>
          </div>
        )}

        {!netease.loggedIn && !usingDemo ? (
          loginState
        ) : (loading || (netease.myMusicLoading && albums.length === 0)) && !usingDemo ? (
          <div className="feed-list" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div className="feed-row feed-row-skeleton" key={index}>
                <span className="feed-cover" />
                <span className="feed-copy">
                  <span className="feed-skeleton-line is-title" />
                  <span className="feed-skeleton-line" />
                  <span className="feed-skeleton-line is-short" />
                </span>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="feed-empty">
            <h2>内容加载失败</h2>
            <p>{error}</p>
            <button type="button" className="primary-btn" onClick={() => setReloadKey((value) => value + 1)}>
              重试
            </button>
          </div>
        ) : tab === 'podcast' || visible.length === 0 ? (
          emptyState
        ) : (
          <div className="feed-list">
            {visible.map((album) => {
              const saved = subscribed.has(album.cloudId);
              return (
                <article className="feed-row" key={album.cloudId}>
                  <button type="button" className="feed-cover" onClick={() => openAlbum(album)} aria-label={album.name}>
                    <Cover hue={album.hue} variant={album.variant} label={album.name} src={album.coverUrl} />
                  </button>

                  <div className="feed-copy">
                    <button type="button" className="feed-title" onClick={() => openAlbum(album)}>
                      {album.name}
                    </button>
                    <button type="button" className="feed-artist" onClick={() => openArtist(album)}>
                      {album.artist}
                    </button>
                    <p className="feed-desc">
                      你关注的 {album.artist} 刚刚发布了{releaseType(album)}《{album.name}》，收录 {album.size} 首作品。
                    </p>
                    <div className="feed-meta">
                      {releaseType(album)} · {relativeTime(album.publishTime)} · {album.size} 首
                    </div>
                    <div className="feed-actions">
                      <button
                        type="button"
                        className={`feed-add ${saved ? 'is-on' : ''}`}
                        onClick={() => toggleSub(album)}
                        title={saved ? '从音乐库移除' : '添加到音乐库'}
                        aria-label={saved ? '从音乐库移除' : '添加到音乐库'}
                      >
                        <Icon name={saved ? 'check' : 'plus'} size={18} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`feed-play ${playing === album.cloudId ? 'is-loading' : ''}`}
                    onClick={() => playRelease(album)}
                    aria-label={`播放 ${album.name}`}
                  >
                    <Icon name="play" size={20} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
