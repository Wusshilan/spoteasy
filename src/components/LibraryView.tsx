import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icons';
import { Cover } from './CoverArt';
import { CreateMenu, type CreateAnchor, type CreateKind } from './CreateMenu';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { registerTracks, type Playlist } from '../data/mock';
import type { Route } from '../routing';

type Filter = 'all' | 'playlists' | 'podcasts' | 'albums' | 'artists';
type SortMode = 'recent' | 'added' | 'alpha' | 'creator';

interface LibraryItem {
  key: string;
  kind: 'liked' | 'playlist' | 'podcast' | 'album' | 'artist';
  title: string;
  sub: string;
  coverUrl?: string;
  hue: number;
  variant: number;
  owner: string;
  addedAt?: number;
  trackIds?: string[];
  cloudId?: number;
  open(): void;
}

const filterLabels: Array<[Filter, string]> = [
  ['playlists', '歌单'],
  ['podcasts', '播客'],
  ['albums', '专辑'],
  ['artists', '艺人'],
];

const sortLabels: Array<[SortMode, string]> = [
  ['recent', '最近播放'],
  ['added', '最近添加'],
  ['alpha', '字母顺序'],
  ['creator', '创建者'],
];

export function LibraryView({
  navigate,
  onCreate,
  demoPlaylists,
  localPlaylists,
}: {
  navigate: (route: Route) => void;
  onCreate(kind: CreateKind): void;
  demoPlaylists?: Playlist[];
  localPlaylists?: Playlist[];
}) {
  const netease = useNetease();
  const player = usePlayer();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortOpen, setSortOpen] = useState(false);
  const [createAnchor, setCreateAnchor] = useState<CreateAnchor | null>(null);
  const [createTrigger, setCreateTrigger] = useState<HTMLElement | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [sortOpen]);

  const closeCreate = () => {
    setCreateAnchor(null);
    setCreateTrigger(null);
  };

  const toggleCreate = (el: HTMLElement) => {
    if (createAnchor) {
      closeCreate();
      return;
    }
    const rect = el.getBoundingClientRect();
    setCreateTrigger(el);
    setCreateAnchor({ left: Math.max(8, rect.right - 308), top: rect.bottom + 8, right: rect.right });
  };

  const pickCreate = (kind: CreateKind) => {
    closeCreate();
    onCreate(kind);
  };

  const items = useMemo<LibraryItem[]>(() => {
    const liked: LibraryItem[] = [];
    const playlistItems: LibraryItem[] = [];
    const podcastItems: LibraryItem[] = [];
    const albumItems: LibraryItem[] = [];
    const artistItems: LibraryItem[] = [];

    if (netease.loggedIn) {
      liked.push({
        key: 'liked',
        kind: 'liked',
        title: '我喜欢的音乐',
        sub: `歌单 · ${netease.nickname}`,
        hue: 282,
        variant: 3,
        owner: netease.nickname,
        trackIds: [...player.liked],
        open: () => navigate({ name: 'cloudLiked' }),
      });
    } else if (demoPlaylists || player.liked.size > 0) {
      liked.push({
        key: 'demo-liked',
        kind: 'liked',
        title: '我喜欢的音乐',
        sub: '歌单 · 本地喜欢',
        hue: 282,
        variant: 3,
        owner: '本地喜欢',
        trackIds: [...player.liked],
        open: () => navigate({ name: 'cloudLiked' }),
      });
    }

    const extraPlaylists: Playlist[] = [...(demoPlaylists ?? []), ...(localPlaylists ?? [])];
    const seenExtra = new Set<string>();
    for (const playlist of extraPlaylists) {
      if (seenExtra.has(playlist.id)) continue;
      seenExtra.add(playlist.id);
      playlistItems.push({
        key: playlist.id,
        kind: 'playlist',
        title: playlist.name,
        sub: `歌单 · ${playlist.owner || 'Yuyan Peng'}`,
        coverUrl: playlist.coverUrl,
        hue: playlist.hue,
        variant: playlist.variant,
        owner: playlist.owner || 'Yuyan Peng',
        addedAt: playlist.createdAt || playlist.addedAt,
        trackIds: playlist.tracks,
        open: () => navigate({ name: 'playlist', id: playlist.id }),
      });
    }

    for (const playlist of netease.myPlaylists) {
      playlistItems.push({
        key: playlist.id,
        kind: 'playlist',
        title: playlist.name,
        sub: `歌单 · ${playlist.owner || netease.nickname}`,
        coverUrl: playlist.coverUrl,
        hue: playlist.hue,
        variant: playlist.variant,
        owner: playlist.owner || netease.nickname,
        addedAt: playlist.createdAt,
        trackIds: playlist.tracks,
        open: () => navigate({ name: 'playlist', id: playlist.id }),
      });
    }

    for (const podcast of netease.myPodcasts) {
      podcastItems.push({
        key: podcast.id,
        kind: 'podcast',
        title: podcast.name,
        sub: `播客 · ${podcast.djName}`,
        coverUrl: podcast.coverUrl,
        hue: podcast.hue,
        variant: podcast.variant,
        owner: podcast.djName,
        addedAt: podcast.createTime,
        open: () => navigate({ name: 'podcast', id: String(podcast.cloudId) }),
      });
    }
    for (const album of netease.myAlbums) {
      albumItems.push({
        key: album.id,
        kind: 'album',
        title: album.name,
        sub: `专辑 · ${album.artist}`,
        coverUrl: album.coverUrl,
        hue: album.hue,
        variant: album.variant,
        owner: album.artist,
        open: () => navigate({ name: 'cloudAlbum', id: String(album.cloudId) }),
      });
    }

    for (const artist of netease.myArtists) {
      artistItems.push({
        key: artist.id,
        kind: 'artist',
        title: artist.name,
        sub: '艺人',
        coverUrl: artist.avatarUrl,
        hue: artist.hue,
        variant: artist.variant,
        owner: artist.name,
        cloudId: artist.cloudId,
        open: () => navigate({ name: 'cloudArtist', id: String(artist.cloudId) }),
      });
    }

    const base = [...liked];
    const max = Math.max(playlistItems.length, podcastItems.length, albumItems.length, artistItems.length);
    for (let index = 0; index < max; index += 1) {
      if (playlistItems[index]) base.push(playlistItems[index]);
      if (podcastItems[index]) base.push(podcastItems[index]);
      if (albumItems[index]) base.push(albumItems[index]);
      if (artistItems[index]) base.push(artistItems[index]);
    }

    const needle = query.trim().toLowerCase();
    let filtered = base.filter((item) => {
      if (filter === 'playlists' && item.kind !== 'liked' && item.kind !== 'playlist') return false;
      if (filter === 'albums' && item.kind !== 'album') return false;
      if (filter === 'artists' && item.kind !== 'artist') return false;
      if (filter === 'podcasts' && item.kind !== 'podcast') return false;
      return !needle || `${item.title} ${item.sub}`.toLowerCase().includes(needle);
    });

    if (sort === 'alpha') {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
    } else if (sort === 'creator') {
      filtered = [...filtered].sort((a, b) => a.owner.localeCompare(b.owner, 'zh-Hans-CN'));
    } else if (sort === 'added') {
      filtered = [...filtered].sort((a, b) => {
        const delta = (b.addedAt || 0) - (a.addedAt || 0);
        return delta || a.title.localeCompare(b.title, 'zh-Hans-CN');
      });
    } else if (sort === 'recent') {
      const history = player.history;
      const rank = new Map(history.map((track, index) => [track.id, index]));
      const itemRank = (item: LibraryItem) => {
        if (item.trackIds?.length) {
          const values = item.trackIds
            .map((id) => rank.get(id))
            .filter((value): value is number => typeof value === 'number');
          if (values.length) return Math.min(...values);
        }
        if (item.kind === 'album') {
          const hit = history.findIndex((track) => track.album === item.title);
          return hit >= 0 ? hit : Number.POSITIVE_INFINITY;
        }
        if (item.kind === 'artist') {
          const hit = history.findIndex((track) => track.artist.split(' / ').includes(item.title));
          return hit >= 0 ? hit : Number.POSITIVE_INFINITY;
        }
        return Number.POSITIVE_INFINITY;
      };
      filtered = [...filtered].sort((a, b) => {
        const delta = itemRank(a) - itemRank(b);
        return delta || a.title.localeCompare(b.title, 'zh-Hans-CN');
      });
    }

    return filtered;
  }, [demoPlaylists, filter, localPlaylists, navigate, netease, player.history, player.liked, query, sort]);

  const playItem = async (item: LibraryItem) => {
    if (item.kind === 'artist' && item.cloudId) {
      try {
        const result = await window.spoteasy?.netease?.artist(item.cloudId);
        const tracks = result?.tracks || [];
        if (tracks.length) {
          registerTracks(tracks);
          player.play(tracks[0].id, tracks.map((track) => track.id), item.title);
          return;
        }
      } catch {
        /* fall through to open artist */
      }
    }
    if (item.trackIds?.length) {
      player.play(item.trackIds[0], item.trackIds, item.title);
      return;
    }
    item.open();
  };

  return (
    <div className="library-page">
      <header className="library-page-head">
        <h1>音乐库</h1>
        <div className="library-page-head-actions">
          <button
            ref={addRef}
            type="button"
            className={`library-page-add ${createAnchor ? 'is-open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={Boolean(createAnchor)}
            onClick={(event) => toggleCreate(event.currentTarget)}
          >
            <Icon name={createAnchor ? 'xLg' : 'plus'} size={18} />
            <span>{createAnchor ? '关闭' : '创建'}</span>
          </button>
          <button
            type="button"
            className="library-page-expand"
            title="收起音乐库"
            aria-label="收起音乐库"
            onClick={() => navigate({ name: 'home' })}
          >
            <Icon name="exitFullscreen" size={20} />
          </button>
        </div>
      </header>

      <div className="library-page-controls">
        <div className="library-page-filters">
          {filterLabels.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`chip ${filter === key ? 'is-active' : ''}`}
              onClick={() => setFilter((current) => (current === key ? 'all' : key))}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="library-page-tools">
          <label className="library-page-search">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="在音乐库中搜索"
              aria-label="在音乐库中搜索"
            />
            {query && (
              <button type="button" className="library-search-close" aria-label="清空搜索" onClick={() => setQuery('')}>
                <Icon name="x" size={14} />
              </button>
            )}
          </label>

          <div className="library-sort-wrap" ref={sortRef}>
            <button type="button" className="library-sort" onClick={() => setSortOpen((value) => !value)}>
              {sortLabels.find(([key]) => key === sort)?.[1]}
              <Icon name="sort" size={20} />
            </button>
            {sortOpen && (
              <div className="library-sort-menu">
                {sortLabels.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="menu-row"
                    onClick={() => {
                      setSort(key);
                      setSortOpen(false);
                    }}
                  >
                    <span>{label}</span>
                    {sort === key && <Icon name="check" size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="library-view-toggle"
            onClick={() => setView((current) => (current === 'grid' ? 'list' : 'grid'))}
            title={view === 'grid' ? '列表视图' : '网格视图'}
            aria-label={view === 'grid' ? '列表视图' : '网格视图'}
          >
            <Icon name={view === 'grid' ? 'listView' : 'grid'} size={18} />
          </button>
        </div>
      </div>

      {!netease.loggedIn && !(demoPlaylists && demoPlaylists.length > 0) ? (
        <div className="library-page-empty">
          <h2>你的音乐库是空的</h2>
          <p>登录后同步歌单、收藏专辑和关注艺人。</p>
          <button type="button" className="primary-btn" onClick={netease.openLogin}>
            登录
          </button>
        </div>
      ) : netease.myMusicLoading && items.length === 0 ? (
        <div className="library-page-empty">
          <p>正在加载音乐库…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="library-page-empty">
          <h2>没有找到内容</h2>
          <p>{query ? '换个关键词试试。' : '创建歌单，或收藏专辑/关注艺人后会出现在这里。'}</p>
          {!query && (
            <button type="button" className="primary-btn" onClick={() => onCreate('playlist')}>
              创建歌单
            </button>
          )}
        </div>
      ) : (
        <div className={`library-grid ${view === 'list' ? 'is-list' : ''}`}>
          {items.map((item) => (
            <div
              key={item.key}
              role="button"
              tabIndex={0}
              className={`library-card ${item.kind === 'artist' ? 'is-artist' : ''} ${
                item.kind === 'liked' ? 'is-liked' : ''
              }`}
              onClick={item.open}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  item.open();
                }
              }}
              title={`${item.title} — ${item.sub}`}
            >
              <span className={`library-card-art ${item.kind}`}>
                {item.kind === 'liked' ? (
                  <span className="liked-cover library-liked-art">
                    <Icon name="heartFill" size={38} />
                  </span>
                ) : (
                  <Cover hue={item.hue} variant={item.variant} label={item.title} src={item.coverUrl} />
                )}
                {(item.kind === 'liked' || item.kind === 'playlist' || (item.kind === 'artist' && item.cloudId)) && (
                  <button
                    type="button"
                    className="library-card-play"
                    aria-label={`播放 ${item.title}`}
                    title={`播放 ${item.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void playItem(item);
                    }}
                  >
                    <Icon name="play" size={18} />
                  </button>
                )}
              </span>
              <span className="library-card-title">{item.title}</span>
              <span className="library-card-sub">
                {item.kind === 'liked' && (
                  <span className="row-pin" aria-hidden="true">
                    <Icon name="pin" size={13} />
                  </span>
                )}
                <span className="library-card-sub-text">{item.sub}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {createAnchor && createTrigger && (
        <CreateMenu anchor={createAnchor} trigger={createTrigger} onPick={pickCreate} onClose={closeCreate} />
      )}
    </div>
  );
}
