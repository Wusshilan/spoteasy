import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icons';
import { Avatar, Cover } from './CoverArt';
import { SearchResultRow, type SearchRowKind } from '../search/SearchResultRow';
import { addRecentSearch } from '../search/history';
import type { Playlist, Track } from '../data/mock';
import { useLibrary } from '../state/library';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

type Tab = 'all' | 'tracks' | 'podcasts' | 'albums' | 'playlists' | 'artists' | 'mvs' | 'genres';

const TABS: Array<[Tab, string]> = [
  ['all', '全部'],
  ['tracks', '歌曲'],
  ['podcasts', '播客和节目'],
  ['albums', '专辑'],
  ['playlists', '歌单'],
  ['artists', '艺人'],
  ['mvs', 'MV'],
  ['genres', '曲风和心情'],
];

const GENRES: Array<{ name: string; hue: number; variant: number }> = [
  { name: '华语流行', hue: 0, variant: 5 },
  { name: '摇滚', hue: 340, variant: 6 },
  { name: '民谣', hue: 118, variant: 3 },
  { name: '电子', hue: 196, variant: 1 },
  { name: '说唱', hue: 280, variant: 2 },
  { name: '爵士', hue: 38, variant: 4 },
  { name: '古典', hue: 46, variant: 0 },
  { name: '轻音乐', hue: 218, variant: 7 },
  { name: '影视原声', hue: 300, variant: 2 },
  { name: '粤语', hue: 14, variant: 6 },
  { name: '日语', hue: 330, variant: 4 },
  { name: '韩语', hue: 204, variant: 1 },
];

const HOT = ['晴天', '周杰伦', '林俊杰', '陈奕迅', 'City Pop', '夏日'];

const LIMITS = { songs: 20, podcasts: 6, albums: 6, playlists: 6, artists: 6, mvs: 6 };

type Row =
  | { kind: 'track'; key: string; track: Track }
  | { kind: 'podcast'; key: string; podcast: NeteasePodcast }
  | { kind: 'album'; key: string; album: NeteaseAlbum }
  | { kind: 'playlist'; key: string; playlist: Playlist }
  | { kind: 'artist'; key: string; artist: NeteaseArtist }
  | { kind: 'mv'; key: string; mv: NeteaseMv }
  | { kind: 'local'; key: string; track: Track };

export function SearchView({
  initialQuery = '',
  localPlaylists = [],
  navigate,
}: {
  initialQuery?: string;
  localPlaylists?: Playlist[];
  navigate(route: Route): void;
}) {
  const player = usePlayer();
  const netease = useNetease();
  const library = useLibrary();
  const { toast } = useUi();
  const query = initialQuery.trim();
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [songs, setSongs] = useState<Track[]>([]);
  const [podcasts, setPodcasts] = useState<NeteasePodcast[]>([]);
  const [albums, setAlbums] = useState<NeteaseAlbum[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<NeteaseArtist[]>([]);
  const [mvs, setMvs] = useState<NeteaseMv[]>([]);
  const [more, setMore] = useState({ songs: false, podcasts: false, albums: false, playlists: false, artists: false, mvs: false });
  const [loadingMore, setLoadingMore] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTab('all');
  }, [query]);

  useEffect(() => {
    if (!query) {
      setSongs([]);
      setPodcasts([]);
      setAlbums([]);
      setPlaylists([]);
      setArtists([]);
      setMore({ songs: false, podcasts: false, albums: false, playlists: false, artists: false, mvs: false });
      setLoading(false);
      setError(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(false);
    setSongs([]);
    setPodcasts([]);
    setAlbums([]);
    setPlaylists([]);
    setArtists([]);
    setMvs([]);
    const timer = window.setTimeout(async () => {
      const api = window.spoteasy?.netease;
      const wait = () => new Promise((resolve) => window.setTimeout(resolve, 220));
      const songResult = await netease.search(query, 0, LIMITS.songs).catch(() => ({ tracks: [], hasMore: false }));
      if (!alive) return;
      await wait();
      const podcastResult = await (api ? api.searchPodcasts(query, 0, LIMITS.podcasts) : Promise.resolve({ podcasts: [], hasMore: false })).catch(() => ({ podcasts: [], hasMore: false }));
      if (!alive) return;
      await wait();
      const albumResult = await (api ? api.searchAlbums(query, 0, LIMITS.albums) : Promise.resolve({ albums: [], hasMore: false })).catch(() => ({ albums: [], hasMore: false }));
      if (!alive) return;
      await wait();
      const playlistResult = await (api ? api.searchPlaylists(query, 0, LIMITS.playlists) : Promise.resolve({ playlists: [], hasMore: false })).catch(() => ({ playlists: [], hasMore: false }));
      if (!alive) return;
      await wait();
      const artistResult = await (api ? api.searchArtists(query, 0, LIMITS.artists) : Promise.resolve({ artists: [], hasMore: false })).catch(() => ({ artists: [], hasMore: false }));
      if (!alive) return;
      await wait();
      const mvResult = await (api?.searchMvs ? api.searchMvs(query, 0, LIMITS.mvs) : Promise.resolve({ mvs: [], hasMore: false })).catch(() => ({ mvs: [], hasMore: false }));
      if (!alive) return;
      setSongs(songResult.tracks || []);
      setPodcasts(podcastResult.podcasts || []);
      setAlbums(albumResult.albums || []);
      setPlaylists(playlistResult.playlists || []);
      setArtists(artistResult.artists || []);
      setMvs(mvResult.mvs || []);
      setMore({
        songs: Boolean(songResult.hasMore),
        podcasts: Boolean(podcastResult.hasMore),
        albums: Boolean(albumResult.hasMore),
        playlists: Boolean(playlistResult.hasMore),
        artists: Boolean(artistResult.hasMore),
        mvs: Boolean(mvResult.hasMore),
      });
      setStates((previous) => {
        const next = { ...previous };
        for (const podcast of podcastResult.podcasts || []) if (!(podcast.id in next)) next[podcast.id] = Boolean(podcast.followed);
        for (const album of albumResult.albums || []) if (!(album.id in next)) next[album.id] = Boolean(album.isSub);
        for (const playlist of playlistResult.playlists || []) if (!(playlist.id in next)) next[playlist.id] = Boolean(playlist.subscribed);
        for (const artist of artistResult.artists || []) if (!(artist.id in next)) next[artist.id] = Boolean(artist.followed) || netease.myArtists.some((item) => item.cloudId === artist.cloudId);
        return next;
      });
      setLoading(false);
      setError(
        (songResult.tracks?.length || 0) === 0 &&
          (podcastResult.podcasts?.length || 0) === 0 &&
          (albumResult.albums?.length || 0) === 0 &&
          (playlistResult.playlists?.length || 0) === 0 &&
          (artistResult.artists?.length || 0) === 0,
      );
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query, netease.search]);

  const localTracks = useMemo(() => {
    if (!query) return [];
    const needle = query.toLowerCase();
    return library.tracks
      .filter(
        (track) =>
          track.title.toLowerCase().includes(needle) ||
          track.artist.toLowerCase().includes(needle) ||
          track.album.toLowerCase().includes(needle),
      )
      .slice(0, 4);
  }, [library.tracks, query]);

  const localAlbumHits = useMemo(() => {
    if (!query) return [] as Array<{ name: string; artist: string; track: Track }>;
    const needle = query.toLowerCase();
    const seen = new Set<string>();
    const hits: Array<{ name: string; artist: string; track: Track }> = [];
    for (const track of library.tracks) {
      if (!track.album || !track.album.toLowerCase().includes(needle) || seen.has(track.album)) continue;
      seen.add(track.album);
      hits.push({ name: track.album, artist: track.artist, track });
    }
    return hits.slice(0, 4);
  }, [library.tracks, query]);

  const localArtistHits = useMemo(() => {
    if (!query) return [] as Array<{ name: string; count: number; track: Track }>;
    const needle = query.toLowerCase();
    const map = new Map<string, { name: string; count: number; track: Track }>();
    for (const track of library.tracks) {
      if (!track.artist || !track.artist.toLowerCase().includes(needle)) continue;
      const current = map.get(track.artist);
      if (current) current.count += 1;
      else map.set(track.artist, { name: track.artist, count: 1, track });
    }
    return [...map.values()].slice(0, 4);
  }, [library.tracks, query]);

  const localPlaylistHits = useMemo(() => {
    if (!query) return [] as Playlist[];
    const needle = query.toLowerCase();
    return localPlaylists
      .filter((playlist) => `${playlist.name} ${playlist.owner} ${playlist.desc}`.toLowerCase().includes(needle))
      .slice(0, 4);
  }, [localPlaylists, query]);

  const top = songs[0];

  const mixedRows = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    const groups: Row[][] = [
      songs.slice(1).map((track) => ({ kind: 'track', key: track.id, track })),
      podcasts.map((podcast) => ({ kind: 'podcast', key: podcast.id, podcast })),
      albums.map((album) => ({ kind: 'album', key: album.id, album })),
      playlists.map((playlist) => ({ kind: 'playlist', key: playlist.id, playlist })),
      artists.map((artist) => ({ kind: 'artist', key: artist.id, artist })),
      mvs.map((mv) => ({ kind: 'mv', key: mv.id, mv })),
      localPlaylistHits.map((playlist) => ({ kind: 'playlist', key: playlist.id, playlist })),
    ];
    const max = Math.max(...groups.map((group) => group.length));
    for (let index = 0; index < max; index += 1) {
      for (const group of groups) {
        if (group[index]) rows.push(group[index]);
      }
    }
    return rows;
  }, [albums, artists, localPlaylistHits, mvs, playlists, podcasts, songs]);

  const tabRows = useMemo<Row[]>(() => {
    if (tab === 'tracks') return songs.map((track) => ({ kind: 'track', key: track.id, track }));
    if (tab === 'podcasts') return podcasts.map((podcast) => ({ kind: 'podcast', key: podcast.id, podcast }));
    if (tab === 'albums') return albums.map((album) => ({ kind: 'album', key: album.id, album }));
    if (tab === 'playlists') return [...playlists, ...localPlaylistHits].map((playlist) => ({ kind: 'playlist', key: playlist.id, playlist }));
    if (tab === 'artists') return artists.map((artist) => ({ kind: 'artist', key: artist.id, artist }));
    if (tab === 'mvs') return mvs.map((mv) => ({ kind: 'mv', key: mv.id, mv }));
    return mixedRows;
  }, [albums, artists, localPlaylistHits, mixedRows, mvs, playlists, podcasts, songs, tab]);

  const rows = tab === 'all' ? mixedRows.slice(0, 11) : tabRows;
  const showTop = tab === 'all' && Boolean(top);
  const visibleRows = showTop ? rows : rows;
  const currentKind = tab === 'all' ? null : tab === 'tracks' ? 'songs' : tab === 'podcasts' ? 'podcasts' : tab === 'albums' ? 'albums' : tab === 'playlists' ? 'playlists' : tab === 'artists' ? 'artists' : tab === 'mvs' ? 'mvs' : null;

  const ensureLogin = () => {
    if (netease.loggedIn) return true;
    toast('请先登录');
    netease.openLogin();
    return false;
  };

  const rememberTrack = (track: Track) => {
    addRecentSearch({
      key: `track:${track.id}`,
      kind: 'track',
      id: track.id,
      title: track.title,
      sub: `单曲 · ${track.artist}`,
      coverUrl: track.coverUrl,
      hue: track.hue,
      variant: track.variant,
      track,
    });
  };

  const playTrack = (track: Track) => {
    const ids = songs.map((item) => item.id);
    const order = ids.includes(track.id) ? ids : [track.id, ...ids];
    player.play(track.id, order, `搜索：${query}`);
    rememberTrack(track);
  };

  const openRow = (row: Row) => {
    if (row.kind === 'track') {
      playTrack(row.track);
      return;
    }
    if (row.kind === 'local') {
      player.play(row.track.id, library.tracks.map((track) => track.id), '本地搜索');
      return;
    }
    if (row.kind === 'podcast') {
      navigate({ name: 'podcast', id: String(row.podcast.cloudId) });
      addRecentSearch({
        key: row.podcast.id,
        kind: 'podcast',
        id: row.podcast.id,
        title: row.podcast.name,
        sub: `播客 · ${row.podcast.djName}`,
        route: { name: 'podcast', id: String(row.podcast.cloudId) },
        coverUrl: row.podcast.coverUrl,
        hue: row.podcast.hue,
        variant: row.podcast.variant,
      });
      return;
    }
    if (row.kind === 'album') {
      navigate({ name: 'cloudAlbum', id: String(row.album.cloudId) });
      addRecentSearch({ key: row.album.id, kind: 'album', id: row.album.id, title: row.album.name, sub: `专辑 · ${row.album.artist}`, coverUrl: row.album.coverUrl, hue: row.album.hue, variant: row.album.variant });
      return;
    }
    if (row.kind === 'playlist') {
      navigate({ name: 'playlist', id: row.playlist.id });
      addRecentSearch({ key: row.playlist.id, kind: 'playlist', id: row.playlist.id, title: row.playlist.name, sub: '歌单', coverUrl: row.playlist.coverUrl, hue: row.playlist.hue, variant: row.playlist.variant });
      return;
    }
    if (row.kind === 'mv') {
      navigate({ name: 'mv', id: String(row.mv.cloudId) });
      addRecentSearch({ key: row.mv.id, kind: 'mv', id: row.mv.id, title: row.mv.name, sub: `MV · ${row.mv.artist}`, coverUrl: row.mv.coverUrl, hue: row.mv.hue, variant: row.mv.variant });
      return;
    }
    navigate({ name: 'cloudArtist', id: String(row.artist.cloudId) });
    addRecentSearch({ key: row.artist.id, kind: 'artist', id: row.artist.id, title: row.artist.name, sub: '艺人', coverUrl: row.artist.avatarUrl, hue: row.artist.hue, variant: row.artist.variant, verified: true });
  };

  const toggleAction = async (row: Row) => {
    if (!ensureLogin()) return;
    const api = window.spoteasy?.netease;
    if (!api) return;
    try {
      if (row.kind === 'track') {
        if (!row.track.cloudId) return;
        await netease.toggleCloudLike(row.track.cloudId);
        return;
      }
      if (row.kind === 'local' || row.kind === 'mv') return;
      if (row.kind === 'podcast') {
        const next = !(states[row.podcast.id] ?? row.podcast.followed);
        const result = await api.podcastSub(row.podcast.cloudId, next);
        if (!result.ok) throw new Error(result.error);
        setStates((state) => ({ ...state, [row.podcast.id]: next }));
        netease.refreshMyMusic();
        return;
      }
      if (row.kind === 'album') {
        const next = !(states[row.album.id] ?? row.album.isSub);
        const result = await api.albumSub(row.album.cloudId, next);
        if (!result.ok) throw new Error(result.error);
        setStates((state) => ({ ...state, [row.album.id]: next }));
        netease.refreshMyMusic();
        return;
      }
      if (row.kind === 'playlist') {
        if (!row.playlist.cloudId) return;
        const next = !(states[row.playlist.id] ?? row.playlist.subscribed);
        const result = await api.playlistSubscribe(row.playlist.cloudId, next);
        if (!result.ok) throw new Error(result.error);
        setStates((state) => ({ ...state, [row.playlist.id]: next }));
        netease.refreshMyMusic();
        return;
      }
      const next = !(states[row.artist.id] ?? row.artist.followed);
      const result = await api.artistSub(row.artist.cloudId, next);
      if (!result.ok) throw new Error(result.error);
      setStates((state) => ({ ...state, [row.artist.id]: next }));
      netease.refreshMyMusic();
    } catch {
      toast('操作失败');
    }
  };

  const loadMore = async () => {
    if (!currentKind || loadingMore) return;
    const api = window.spoteasy?.netease;
    if (!api) return;
    setLoadingMore(currentKind);
    try {
      if (currentKind === 'songs') {
        const result = await netease.search(query, songs.length, LIMITS.songs);
        const map = new Map(songs.map((track) => [track.id, track]));
        for (const track of result.tracks || []) map.set(track.id, track);
        setSongs([...map.values()]);
        setMore((state) => ({ ...state, songs: Boolean(result.hasMore) }));
      } else if (currentKind === 'podcasts') {
        const result = await api.searchPodcasts(query, podcasts.length, LIMITS.podcasts);
        const map = new Map(podcasts.map((item) => [item.id, item]));
        for (const item of result.podcasts || []) map.set(item.id, item);
        setPodcasts([...map.values()]);
        setMore((state) => ({ ...state, podcasts: Boolean(result.hasMore) }));
      } else if (currentKind === 'albums') {
        const result = await api.searchAlbums(query, albums.length, LIMITS.albums);
        const map = new Map(albums.map((item) => [item.id, item]));
        for (const item of result.albums || []) map.set(item.id, item);
        setAlbums([...map.values()]);
        setMore((state) => ({ ...state, albums: Boolean(result.hasMore) }));
      } else if (currentKind === 'playlists') {
        const result = await api.searchPlaylists(query, playlists.length, LIMITS.playlists);
        const map = new Map(playlists.map((item) => [item.id, item]));
        for (const item of result.playlists || []) map.set(item.id, item);
        setPlaylists([...map.values()]);
        setMore((state) => ({ ...state, playlists: Boolean(result.hasMore) }));
      } else if (currentKind === 'artists') {
        const result = await api.searchArtists(query, artists.length, LIMITS.artists);
        const map = new Map(artists.map((item) => [item.id, item]));
        for (const item of result.artists || []) map.set(item.id, item);
        setArtists([...map.values()]);
      } else if (currentKind === 'mvs' && api.searchMvs) {
        const result = await api.searchMvs(query, mvs.length, LIMITS.mvs);
        const map = new Map(mvs.map((item) => [item.id, item]));
        for (const item of result.mvs || []) map.set(item.id, item);
        setMvs([...map.values()]);
        setMore((state) => ({ ...state, mvs: Boolean(result.hasMore) }));
      }
    } catch {
      toast('加载失败');
    } finally {
      setLoadingMore(null);
    }
  };

  const typeLabel: Record<SearchRowKind, string> = {
    track: '歌曲',
    podcast: '播客',
    album: '专辑',
    playlist: '歌单',
    artist: '艺人',
    mv: 'MV',
    local: '本地',
  };

  return (
    <div className="search-page">
      {!query ? (
        <>
          <h2 className="search-page-title">搜索网易云音乐</h2>
          <div className="hot-searches">
            {HOT.map((term) => (
              <button key={term} type="button" className="chip" onClick={() => navigate({ name: 'search', q: term })}>
                {term}
              </button>
            ))}
          </div>
          <div className="search-genre-grid" style={{ marginTop: 28 }}>
            {GENRES.map((genre) => (
              <button
                key={genre.name}
                type="button"
                className="search-genre-card"
                style={{
                  background: `linear-gradient(135deg, hsl(${genre.hue} 68% 44%), hsl(${(genre.hue + 42) % 360} 64% 24%))`,
                }}
                onClick={() => navigate({ name: 'search', q: genre.name })}
              >
                {genre.name}
                <Cover hue={genre.hue} variant={genre.variant} label={genre.name} className="genre-art" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="search-tabs">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`chip ${tab === key ? 'is-active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'genres' ? (
            <div className="search-genre-grid">
              {GENRES.map((genre) => (
                <button
                  key={genre.name}
                  type="button"
                  className="search-genre-card"
                  style={{
                    background: `linear-gradient(135deg, hsl(${genre.hue} 68% 44%), hsl(${(genre.hue + 42) % 360} 64% 24%))`,
                  }}
                  onClick={() => navigate({ name: 'search', q: genre.name })}
                >
                  {genre.name}
                  <Cover hue={genre.hue} variant={genre.variant} label={genre.name} className="genre-art" />
                </button>
              ))}
            </div>
          ) : (
            <>
              {showTop && top && (
                <div className="search-top-card">
                  <div className="search-top-art">
                    <Cover hue={top.hue} variant={top.variant} label={top.title} src={top.coverUrl} />
                  </div>
                  <div className="search-top-copy">
                    <div className="search-top-title">{top.title}</div>
                    <div className="search-top-sub">歌曲 · {top.artist}</div>
                  </div>
                  <div className="search-top-actions">
                    <button
                      type="button"
                      className={`search-top-add ${top.cloudId && netease.likedIds.has(top.cloudId) ? 'is-liked' : ''}`}
                      aria-label="添加到音乐库"
                      onClick={() => void toggleAction({ kind: 'track', key: top.id, track: top })}
                    >
                      <Icon name={top.cloudId && netease.likedIds.has(top.cloudId) ? 'check' : 'plus'} size={16} />
                    </button>
                    <button type="button" className="search-top-play" aria-label="播放" onClick={() => playTrack(top)}>
                      <Icon name="play" size={20} />
                    </button>
                  </div>
                </div>
              )}

              {loading && <div className="search-loading">正在搜索…</div>}
              {!loading && error && <div className="search-empty">搜索服务暂时不可用，稍后再试。</div>}
              {!loading &&
                !error &&
                visibleRows.map((row) => {
                  if (row.kind === 'local') {
                    return (
                      <SearchResultRow
                        highlight={query}
                        key={row.key}
                        kind="local"
                        title={row.track.title}
                        sub={`${row.track.artist} · ${row.track.album}`}
                        typeLabel={typeLabel.local}
                        hue={row.track.hue}
                        variant={row.track.variant}
                        coverUrl={row.track.coverUrl}
                        onClick={() => openRow(row)}
                      />
                    );
                  }
                  if (row.kind === 'track') {
                    const liked = Boolean(row.track.cloudId && netease.likedIds.has(row.track.cloudId));
                    return (
                      <SearchResultRow
                        highlight={query}
                        key={row.key}
                        kind="track"
                        title={row.track.title}
                        sub={row.track.artist}
                        typeLabel={typeLabel.track}
                        hue={row.track.hue}
                        variant={row.track.variant}
                        coverUrl={row.track.coverUrl}
                        action={liked ? 'liked' : 'add'}
                        onAction={() => void toggleAction(row)}
                        onClick={() => openRow(row)}
                      />
                    );
                  }
                  if (row.kind === 'podcast') {
                    return (
                      <SearchResultRow
                        highlight={query}
                        key={row.key}
                        kind="podcast"
                        title={row.podcast.name}
                        sub={row.podcast.djName}
                        typeLabel={typeLabel.podcast}
                        hue={row.podcast.hue}
                        variant={row.podcast.variant}
                        coverUrl={row.podcast.coverUrl}
                        action={states[row.podcast.id] ? 'following' : 'follow'}
                        onAction={() => void toggleAction(row)}
                        onClick={() => openRow(row)}
                      />
                    );
                  }
                  if (row.kind === 'album') {
                    return (
                      <SearchResultRow
                        highlight={query}
                        key={row.key}
                        kind="album"
                        title={row.album.name}
                        sub={row.album.artist}
                        typeLabel={typeLabel.album}
                        hue={row.album.hue}
                        variant={row.album.variant}
                        coverUrl={row.album.coverUrl}
                        action={states[row.album.id] ? 'liked' : 'add'}
                        onAction={() => void toggleAction(row)}
                        onClick={() => openRow(row)}
                      />
                    );
                  }
                  if (row.kind === 'playlist') {
                    return (
                      <SearchResultRow
                        highlight={query}
                        key={row.key}
                        kind="playlist"
                        title={row.playlist.name}
                        sub={row.playlist.owner}
                        typeLabel={typeLabel.playlist}
                        hue={row.playlist.hue}
                        variant={row.playlist.variant}
                        coverUrl={row.playlist.coverUrl}
                        action={row.playlist.source === 'netease' ? (states[row.playlist.id] ? 'liked' : 'add') : 'none'}
                        onAction={() => void toggleAction(row)}
                        onClick={() => openRow(row)}
                      />
                    );
                  }
                  if (row.kind === 'mv') {
                    return (
                      <SearchResultRow
                        highlight={query}
                        key={row.key}
                        kind="mv"
                        title={row.mv.name}
                        sub={`MV · ${row.mv.artist}`}
                        typeLabel="MV"
                        hue={row.mv.hue}
                        variant={row.mv.variant}
                        coverUrl={row.mv.coverUrl}
                        onClick={() => openRow(row)}
                      />
                    );
                  }
                  return (
                    <SearchResultRow
                        highlight={query}
                      key={row.key}
                      kind="artist"
                      title={row.artist.name}
                      sub=""
                      typeLabel={typeLabel.artist}
                      hue={row.artist.hue}
                      variant={row.artist.variant}
                      coverUrl={row.artist.avatarUrl}
                      action={states[row.artist.id] ? 'following' : 'follow'}
                      onAction={() => void toggleAction(row)}
                      onClick={() => openRow(row)}
                    />
                  );
                })}

              {(tab === 'all' || tab === 'tracks' || tab === 'albums' || tab === 'artists') &&
                (localTracks.length > 0 || localAlbumHits.length > 0 || localArtistHits.length > 0) && (
                <>
                  <div className="search-local-title">本地结果</div>
                  {(tab === 'all' || tab === 'albums') && localAlbumHits.map((album) => (
                    <SearchResultRow
                        highlight={query}
                      key={`local-album-${album.name}`}
                      kind="local"
                      title={album.name}
                      sub={`本地专辑 · ${album.artist}`}
                      typeLabel="本地专辑"
                      hue={album.track.hue}
                      variant={album.track.variant}
                      coverUrl={album.track.coverUrl}
                      onClick={() => navigate({ name: 'album', id: album.name })}
                    />
                  ))}
                  {(tab === 'all' || tab === 'artists') && localArtistHits.map((artist) => (
                    <SearchResultRow
                        highlight={query}
                      key={`local-artist-${artist.name}`}
                      kind="local"
                      title={artist.name}
                      sub={`本地艺人 · ${artist.count} 首`}
                      typeLabel="本地艺人"
                      hue={artist.track.hue}
                      variant={artist.track.variant}
                      coverUrl={artist.track.coverUrl}
                      onClick={() => navigate({ name: 'artist', id: artist.name })}
                    />
                  ))}
                  {(tab === 'all' || tab === 'tracks') && localTracks.map((track) => (
                    <SearchResultRow
                        highlight={query}
                      key={track.id}
                      kind="local"
                      title={track.title}
                      sub={`${track.artist} · ${track.album}`}
                      typeLabel="本地"
                      hue={track.hue}
                      variant={track.variant}
                      coverUrl={track.coverUrl}
                      onClick={() => openRow({ kind: 'local', key: track.id, track })}
                    />
                  ))}
                </>
              )}

              {currentKind && more[currentKind] && (
                <button type="button" className="load-more-btn" onClick={() => void loadMore()} disabled={String(loadingMore) === currentKind}>
                  {String(loadingMore) === currentKind ? '加载中…' : '加载更多'}
                </button>
              )}

              {!loading && !error && rows.length === 0 && localTracks.length === 0 && localAlbumHits.length === 0 && localArtistHits.length === 0 && (
                <div className="search-empty">没有找到“{query}”</div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
