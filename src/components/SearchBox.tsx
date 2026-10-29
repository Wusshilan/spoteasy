import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icons';
import { Cover } from './CoverArt';
import { addRecentSearch, clearRecentSearches, removeRecentSearch, useRecentSearches, type RecentSearch } from '../search/history';
import { SearchResultRow } from '../search/SearchResultRow';
import { useLibrary } from '../state/library';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import { getTrack, registerTracks, type Playlist, type Track } from '../data/mock';
import type { Route } from '../routing';

type Suggestion =
  | { kind: 'track'; key: string; track: Track }
  | { kind: 'album'; key: string; album: NeteaseAlbum }
  | { kind: 'playlist'; key: string; playlist: Playlist }
  | { kind: 'artist'; key: string; artist: NeteaseArtist }
  | { kind: 'podcast'; key: string; podcast: NeteasePodcast };

const HOT = ['晴天', '周杰伦', '林俊杰', 'City Pop', '陈奕迅', '夏日'];

export function SearchBox({ route, navigate }: { route: Route; navigate: (route: Route) => void }) {
  const netease = useNetease();
  const library = useLibrary();
  const player = usePlayer();
  const ui = useUi();
  const recent = useRecentSearches();
  const [value, setValue] = useState(route.name === 'search' ? route.q ?? '' : '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState(-1);
  const [actionState, setActionState] = useState<Record<string, boolean>>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (route.name === 'search') setValue(route.q ?? '');
  }, [route.name, route.name === 'search' ? route.q : undefined]);

  useEffect(() => {
    if (!ui.searchOpen) return;
    ui.setSearchOpen(false);
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [ui.searchOpen, ui.setSearchOpen]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const keyword = value.trim();

  useEffect(() => {
    if (!keyword) {
      setSuggestions([]);
      setLoading(false);
      setSelected(-1);
      return;
    }
    let alive = true;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const api = window.spoteasy?.netease;
      const [tracks, albums, playlists, artists, podcasts] = await Promise.all([
        netease.search(keyword, 0, 4).catch(() => ({ tracks: [] as Track[], hasMore: false })),
        (api ? api.searchAlbums(keyword, 0, 3) : Promise.resolve({ albums: [] as NeteaseAlbum[], hasMore: false })).catch(() => ({ albums: [] as NeteaseAlbum[], hasMore: false })),
        (api ? api.searchPlaylists(keyword, 0, 3) : Promise.resolve({ playlists: [] as Playlist[], hasMore: false })).catch(() => ({ playlists: [] as Playlist[], hasMore: false })),
        (api ? api.searchArtists(keyword, 0, 3) : Promise.resolve({ artists: [] as NeteaseArtist[], hasMore: false })).catch(() => ({ artists: [] as NeteaseArtist[], hasMore: false })),
        (api ? api.searchPodcasts(keyword, 0, 3) : Promise.resolve({ podcasts: [] as NeteasePodcast[], hasMore: false })).catch(() => ({ podcasts: [] as NeteasePodcast[], hasMore: false })),
      ]);
      if (!alive) return;
      const rows: Suggestion[] = [];
      for (const track of tracks.tracks || []) rows.push({ kind: 'track', key: track.id, track });
      for (const podcast of podcasts.podcasts || []) rows.push({ kind: 'podcast', key: podcast.id, podcast });
      for (const album of albums.albums || []) rows.push({ kind: 'album', key: album.id, album });
      for (const playlist of playlists.playlists || []) rows.push({ kind: 'playlist', key: playlist.id, playlist });
      for (const artist of artists.artists || []) rows.push({ kind: 'artist', key: artist.id, artist });
      setSuggestions(rows.slice(0, 10));
      setActionState((previous) => {
        const next = { ...previous };
        for (const artist of artists.artists || []) if (!(artist.id in next)) next[artist.id] = Boolean(artist.followed) || netease.myArtists.some((item) => item.cloudId === artist.cloudId);
        for (const album of albums.albums || []) if (!(album.id in next)) next[album.id] = Boolean(album.isSub);
        for (const playlist of playlists.playlists || []) if (!(playlist.id in next)) next[playlist.id] = Boolean(playlist.subscribed);
        for (const podcast of podcasts.podcasts || []) if (!(podcast.id in next)) next[podcast.id] = Boolean(podcast.followed);
        return next;
      });
      setLoading(false);
      setSelected(-1);
    }, 220);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [keyword, netease.search]);

  const rows = useMemo(() => {
    if (!keyword) return [] as Suggestion[];
    const needle = keyword.toLowerCase();
    const localTracks = library.tracks
      .filter(
        (track) =>
          track.title.toLowerCase().includes(needle) ||
          track.artist.toLowerCase().includes(needle) ||
          track.album.toLowerCase().includes(needle),
      )
      .slice(0, 3)
      .map((track) => ({ kind: 'track' as const, key: `local:${track.id}`, track }));
    const seen = new Set(localTracks.map((row) => row.track.id));
    return [...localTracks, ...suggestions.filter((row) => row.kind !== 'track' || !seen.has(row.track.id))];
  }, [keyword, library.tracks, suggestions]);

  const close = () => setOpen(false);

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

  const activate = (item: Suggestion) => {
    if (item.kind === 'track') {
      const ids = (suggestions.filter((row) => row.kind === 'track') as Array<{ track: Track }>).map((row) => row.track.id);
      const order = ids.includes(item.track.id) ? ids : [item.track.id, ...ids];
      player.play(item.track.id, order, `搜索：${keyword}`);
      rememberTrack(item.track);
    } else if (item.kind === 'podcast') {
      navigate({ name: 'podcast', id: String(item.podcast.cloudId) });
      addRecentSearch({
        key: item.podcast.id,
        kind: 'podcast',
        id: item.podcast.id,
        title: item.podcast.name,
        sub: `播客 · ${item.podcast.djName}`,
        route: { name: 'podcast', id: String(item.podcast.cloudId) },
        coverUrl: item.podcast.coverUrl,
        hue: item.podcast.hue,
        variant: item.podcast.variant,
      });
    } else if (item.kind === 'album') {
      navigate({ name: 'cloudAlbum', id: String(item.album.cloudId) });
      addRecentSearch({ key: item.album.id, kind: 'album', id: item.album.id, title: item.album.name, sub: `专辑 · ${item.album.artist}`, coverUrl: item.album.coverUrl, hue: item.album.hue, variant: item.album.variant });
    } else if (item.kind === 'playlist') {
      navigate({ name: 'playlist', id: item.playlist.id });
      addRecentSearch({ key: item.playlist.id, kind: 'playlist', id: item.playlist.id, title: item.playlist.name, sub: '歌单', coverUrl: item.playlist.coverUrl, hue: item.playlist.hue, variant: item.playlist.variant });
    } else {
      navigate({ name: 'cloudArtist', id: String(item.artist.cloudId) });
      addRecentSearch({ key: item.artist.id, kind: 'artist', id: item.artist.id, title: item.artist.name, sub: '艺人', coverUrl: item.artist.avatarUrl, hue: item.artist.hue, variant: item.artist.variant, verified: true });
    }
    close();
  };

  const activateRecent = (item: RecentSearch) => {
    if (item.kind === 'track') {
      try {
        const track = item.track ?? getTrack(item.id);
        registerTracks([track]);
        player.play(track.id, [track.id], '搜索');
        rememberTrack(track);
      } catch {
        ui.toast('这首歌的信息已失效');
      }
    } else if (item.route) {
      navigate(item.route);
    } else if (item.kind === 'podcast') {
      const id = Number(item.id.replace('ne-podcast-', ''));
      if (Number.isFinite(id)) navigate({ name: 'podcast', id: String(id) });
    }
    close();
  };

  const toggleAction = async (item: Suggestion) => {
    const api = window.spoteasy?.netease;
    if (!api) return;
    if (!netease.loggedIn) {
      ui.toast('请先登录');
      netease.openLogin();
      return;
    }
    try {
      if (item.kind === 'track') {
        await netease.toggleCloudLike(item.track.cloudId as number);
        return;
      }
      if (item.kind === 'album') {
        const next = !(actionState[item.album.id] ?? item.album.isSub);
        const result = await api.albumSub(item.album.cloudId, next);
        if (!result.ok) throw new Error(result.error);
        setActionState((s) => ({ ...s, [item.album.id]: next }));
        netease.refreshMyMusic();
        return;
      }
      if (item.kind === 'playlist') {
        const next = !(actionState[item.playlist.id] ?? item.playlist.subscribed);
        const result = await api.playlistSubscribe(item.playlist.cloudId as number, next);
        if (!result.ok) throw new Error(result.error);
        setActionState((s) => ({ ...s, [item.playlist.id]: next }));
        netease.refreshMyMusic();
        return;
      }
      if (item.kind === 'artist') {
        const next = !(actionState[item.artist.id] ?? item.artist.followed);
        const result = await api.artistSub(item.artist.cloudId, next);
        if (!result.ok) throw new Error(result.error);
        setActionState((s) => ({ ...s, [item.artist.id]: next }));
        netease.refreshMyMusic();
        return;
      }
      const next = !(actionState[item.podcast.id] ?? item.podcast.followed);
      const result = await api.podcastSub(item.podcast.cloudId, next);
      if (!result.ok) throw new Error(result.error);
      setActionState((s) => ({ ...s, [item.podcast.id]: next }));
      netease.refreshMyMusic();
    } catch {
      ui.toast('操作失败');
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      const count = keyword ? rows.length : recent.length;
      if (count) setSelected((current) => (current < 0 ? 0 : (current + 1) % count));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const count = keyword ? rows.length : recent.length;
      if (count) setSelected((current) => (current - 1 + count) % count);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!keyword) {
        if (recent[selected]) activateRecent(recent[selected]);
        return;
      }
      if (selected >= 0 && rows[selected]) activate(rows[selected]);
      else {
        navigate({ name: 'search', q: keyword });
        close();
      }
    }
  };

  const submit = () => {
    if (!keyword) return;
    navigate({ name: 'search', q: keyword });
    close();
  };

  return (
    <div className="search-box" ref={boxRef}>
      <Icon name="search" size={22} className="search-box-icon" />
      <input
        ref={inputRef}
        className="search-input"
        value={value}
        placeholder="想播放什么?"
        aria-label="搜索歌曲、歌手、歌单、专辑"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          aria-label="清空搜索"
          onClick={() => {
            setValue('');
            if (route.name === 'search') navigate({ name: 'search' });
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <Icon name="x" size={17} />
        </button>
      )}

      {open && (
        <div className="search-dropdown" onMouseDown={(event) => event.stopPropagation()}>
          <div className="search-dropdown-hint">
            <span className="search-dropdown-hint-left">
              <span>↑↓</span>
              <span>浏览</span>
            </span>
            <span>输入 搜索</span>
          </div>

          {!keyword && (
            <>
              {recent.length > 0 ? (
                <>
                  <div className="search-dropdown-title">最近的搜索记录</div>
                  {recent.map((item, index) => (
                    <div className="search-recent-item" key={item.key}>
                      <button
                        type="button"
                        className={`search-recent-row ${index === selected ? 'is-selected' : ''}`}
                        onMouseEnter={() => setSelected(index)}
                        onClick={() => activateRecent(item)}
                      >
                        <Cover
                          hue={item.hue}
                          variant={item.variant}
                          label={item.title}
                          src={item.coverUrl}
                          className="search-recent-cover"
                        />
                        <span className="search-recent-copy">
                          <span className="search-recent-title">{item.title}</span>
                          <span className="search-recent-sub">{item.sub}</span>
                        </span>
                        {item.verified && <Icon name="check" size={14} />}
                      </button>
                      <button
                        type="button"
                        className="search-recent-remove"
                        aria-label={`删除 ${item.title}`}
                        title="删除这条搜索记录"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeRecentSearch(item.key);
                        }}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="search-clear-recent" onClick={clearRecentSearches}>
                    清空最近的搜索记录
                  </button>
                </>
              ) : (
                <>
                  <div className="search-dropdown-title">热门搜索</div>
                  <div className="hot-searches">
                    {HOT.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="chip"
                        onClick={() => {
                          setValue(term);
                          setOpen(true);
                          inputRef.current?.focus();
                        }}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {keyword && (
            <>
              {loading && <div className="search-loading">正在搜索…</div>}
              {!loading && rows.length === 0 && <div className="search-empty">没有找到“{keyword}”</div>}
              {!loading &&
                rows.map((item, index) => {
                  if (item.kind === 'track') {
                    return (
                      <SearchResultRow
                        key={item.key}
                        kind="track"
                        title={item.track.title}
                        sub={`歌曲 · ${item.track.artist}`}
                        typeLabel="歌曲"
                        hue={item.track.hue}
                        variant={item.track.variant}
                        coverUrl={item.track.coverUrl}
                        action={item.track.cloudId && netease.likedIds.has(item.track.cloudId) ? 'liked' : 'add'}
                        selected={index === selected}
                        onAction={() => void toggleAction(item)}
                        onClick={() => activate(item)}
                      />
                    );
                  }
                  if (item.kind === 'podcast') {
                    return (
                      <SearchResultRow
                        key={item.key}
                        kind="podcast"
                        title={item.podcast.name}
                        sub={`播客 · ${item.podcast.djName}`}
                        typeLabel="播客"
                        hue={item.podcast.hue}
                        variant={item.podcast.variant}
                        coverUrl={item.podcast.coverUrl}
                        action={actionState[item.podcast.id] ? 'following' : 'follow'}
                        selected={index === selected}
                        onAction={() => void toggleAction(item)}
                        onClick={() => activate(item)}
                      />
                    );
                  }
                  if (item.kind === 'album') {
                    return (
                      <SearchResultRow
                        key={item.key}
                        kind="album"
                        title={item.album.name}
                        sub={`专辑 · ${item.album.artist}`}
                        typeLabel="专辑"
                        hue={item.album.hue}
                        variant={item.album.variant}
                        coverUrl={item.album.coverUrl}
                        action={(actionState[item.album.id] ?? Boolean(item.album.isSub)) ? 'liked' : 'add'}
                        selected={index === selected}
                        onAction={() => void toggleAction(item)}
                        onClick={() => activate(item)}
                      />
                    );
                  }
                  if (item.kind === 'playlist') {
                    return (
                      <SearchResultRow
                        key={item.key}
                        kind="playlist"
                        title={item.playlist.name}
                        sub={`歌单 · ${item.playlist.owner}`}
                        typeLabel="歌单"
                        hue={item.playlist.hue}
                        variant={item.playlist.variant}
                        coverUrl={item.playlist.coverUrl}
                        action={(actionState[item.playlist.id] ?? Boolean(item.playlist.subscribed)) ? 'liked' : 'add'}
                        selected={index === selected}
                        onAction={() => void toggleAction(item)}
                        onClick={() => activate(item)}
                      />
                    );
                  }
                  return (
                    <SearchResultRow
                      key={item.key}
                      kind="artist"
                      title={item.artist.name}
                      sub=""
                      typeLabel="艺人"
                      hue={item.artist.hue}
                      variant={item.artist.variant}
                      coverUrl={item.artist.avatarUrl}
                      action={actionState[item.artist.id] ? 'following' : 'follow'}
                      selected={index === selected}
                      onAction={() => void toggleAction(item)}
                      onClick={() => activate(item)}
                    />
                  );
                })}
              {!loading && keyword && (
                <button type="button" className="search-all-link" onClick={submit}>
                  查看全部结果
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
