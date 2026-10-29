import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { parseLrc } from '../data/lrc';
import { registerTracks, type LyricLine, type Playlist, type Track } from '../data/mock';

interface NeteaseApi {
  loggedIn: boolean;
  premium: boolean;
  nickname: string;
  avatar?: string;
  uid?: number;
  knownTracks: Track[];
  myPlaylists: Playlist[];
  myAlbums: NeteaseAlbum[];
  myArtists: NeteaseArtist[];
  myPodcasts: NeteasePodcast[];
  sessionExpired: boolean;
  likedIds: Set<number>;
  myMusicLoading: boolean;
  loginOpen: boolean;
  quality: NeteaseQuality;
  setQuality(value: NeteaseQuality): void;
  openLogin(): void;
  closeLogin(): void;
  refreshStatus(): Promise<void>;
  refreshMyMusic(): Promise<void>;
  logout(): Promise<void>;
  podcastDetail(id: number, offset?: number, limit?: number): Promise<NeteasePodcastDetail>;
  podcastPrograms(id: number, offset?: number, limit?: number): Promise<NeteasePodcastPrograms>;
  search(keyword: string, offset?: number, limit?: number): Promise<NeteaseSearchResult>;
  lyrics(track: Track): Promise<LyricLine[]>;
  dailyTracks(): Promise<Track[]>;
  likedTracks(): Promise<Track[]>;
  toggleCloudLike(id: number): Promise<boolean>;
}

const NeteaseContext = createContext<NeteaseApi | null>(null);
const QUALITY_KEY = 'spoteasy.quality';
const QUALITIES: NeteaseQuality[] = ['standard', 'higher', 'exhigh', 'lossless', 'hires'];

function loadQuality(): NeteaseQuality {
  const raw = localStorage.getItem(QUALITY_KEY);
  return QUALITIES.includes(raw as NeteaseQuality) ? (raw as NeteaseQuality) : 'exhigh';
}

export function NeteaseProvider({ children }: { children: ReactNode }) {
  const [knownTracks, setKnownTracks] = useState<Track[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [myAlbums, setMyAlbums] = useState<NeteaseAlbum[]>([]);
  const [myArtists, setMyArtists] = useState<NeteaseArtist[]>([]);
  const [myPodcasts, setMyPodcasts] = useState<NeteasePodcast[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [myMusicLoading, setMyMusicLoading] = useState(false);
  const [status, setStatus] = useState<NeteaseStatus>({
    loggedIn: false,
    premium: false,
    nickname: '音乐爱好者',
  });
  const [loginOpen, setLoginOpen] = useState(false);
  const [quality, setQualityState] = useState<NeteaseQuality>(loadQuality);
  const lyricCache = useRef(new Map<number, LyricLine[]>());

  const setQuality = useCallback((value: NeteaseQuality) => {
    setQualityState(value);
    localStorage.setItem(QUALITY_KEY, value);
  }, []);

  const rememberTracks = useCallback((tracks: Track[]) => {
    if (!tracks.length) return;
    registerTracks(tracks);
    setKnownTracks((previous) => {
      const map = new Map(previous.map((track) => [track.id, track]));
      for (const track of tracks) map.set(track.id, track);
      return [...map.values()];
    });
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await window.spoteasy?.netease?.status();
      if (next) setStatus(next);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshMyMusic = useCallback(async () => {
    const api = window.spoteasy?.netease;
    if (!api || !status.loggedIn) {
      setMyPlaylists([]);
      setMyAlbums([]);
      setMyArtists([]);
      setMyPodcasts([]);
      setLikedIds(new Set());
      return;
    }
    setMyMusicLoading(true);
    try {
      const [playlistResult, likedResult, albumResult, artistResult, podcastResult] = await Promise.all([
        api.userPlaylists().catch(() => ({ playlists: [] })),
        api.likedIds().catch(() => ({ ids: [] })),
        api.albumSublist().catch(() => ({ albums: [] })),
        api.artistSublist().catch(() => ({ artists: [] })),
        api.podcastSublist().catch(() => ({ podcasts: [] })),
      ]);
      setMyPlaylists(playlistResult.playlists || []);
      setLikedIds(new Set(likedResult.ids || []));
      setMyAlbums(albumResult.albums || []);
      setMyArtists(artistResult.artists || []);
      setMyPodcasts(podcastResult.podcasts || []);
    } catch {
      /* ignore */
    } finally {
      setMyMusicLoading(false);
    }
  }, [status.loggedIn]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status.loggedIn) refreshMyMusic();
    else {
      setMyPlaylists([]);
      setMyAlbums([]);
      setMyArtists([]);
      setMyPodcasts([]);
      setLikedIds(new Set());
    }
  }, [refreshMyMusic, status.loggedIn, status.uid]);

  useEffect(() => {
    const tick = () => {
      refreshStatus();
    };
    const timer = window.setInterval(tick, 30_000);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, [refreshStatus]);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const logout = useCallback(async () => {
    try {
      const next = await window.spoteasy?.netease?.logout();
      if (next) setStatus(next);
    } catch {
      /* ignore */
    }
  }, []);

  const podcastDetail = useCallback(
    async (id: number, offset = 0, limit = 20) => {
      const api = window.spoteasy?.netease;
      if (!api) return { podcast: null, programs: [], hasMore: false };
      const result = await api.podcastDetail(id, offset, limit);
      rememberTracks(result.programs || []);
      return result;
    },
    [rememberTracks],
  );

  const podcastPrograms = useCallback(
    async (id: number, offset = 0, limit = 20) => {
      const api = window.spoteasy?.netease;
      if (!api) return { programs: [], hasMore: false };
      const result = await api.podcastPrograms(id, offset, limit);
      rememberTracks(result.programs || []);
      return result;
    },
    [rememberTracks],
  );

  const search = useCallback(async (keyword: string, offset = 0, limit = 20) => {
    const api = window.spoteasy?.netease;
    if (!api) return { tracks: [], hasMore: false };
    const result = await api.search(keyword, offset, limit);
    rememberTracks(result?.tracks || []);
    return result;
  }, [rememberTracks]);

  const lyrics = useCallback(async (track: Track) => {
    if (!track.cloudId) return [];
    const cached = lyricCache.current.get(track.cloudId);
    if (cached) return cached;
    const api = window.spoteasy?.netease;
    if (!api) return [];
    const raw = await api.lyric(track.cloudId);
    const parsed = parseLrc(raw?.lrc || '');
    if (parsed.length) lyricCache.current.set(track.cloudId, parsed);
    return parsed;
  }, []);

  const dailyTracks = useCallback(async () => {
    const api = window.spoteasy?.netease;
    if (!api) return [];
    const result = await api.dailySongs();
    const tracks = result.tracks || [];
    rememberTracks(tracks);
    return tracks;
  }, [rememberTracks]);

  const likedTracks = useCallback(async () => {
    const api = window.spoteasy?.netease;
    if (!api) return [];
    const result = await api.likedTracks();
    const tracks = result.tracks || [];
    rememberTracks(tracks);
    return tracks;
  }, [rememberTracks]);

  const toggleCloudLike = useCallback(async (id: number) => {
    const api = window.spoteasy?.netease;
    if (!api) throw new Error('音乐服务未加载');
    const next = !likedIds.has(id);
    const result = await api.setLike(id, next);
    if (!result.ok) throw new Error(result.error || '操作失败');
    setLikedIds((previous) => {
      const copy = new Set(previous);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
    return next;
  }, [likedIds]);

  const value = useMemo<NeteaseApi>(
    () => ({
      loggedIn: status.loggedIn,
      premium: status.premium,
      nickname: status.nickname,
      avatar: status.avatar,
      uid: status.uid,
      knownTracks,
      myPlaylists,
      myAlbums,
      myArtists,
      myPodcasts,
      sessionExpired: Boolean(status.sessionExpired),
      likedIds,
      myMusicLoading,
      loginOpen,
      quality,
      setQuality,
      openLogin,
      closeLogin,
      refreshStatus,
      refreshMyMusic,
      logout,
      podcastDetail,
      podcastPrograms,
      search,
      lyrics,
      dailyTracks,
      likedTracks,
      toggleCloudLike,
    }),
    [
      closeLogin,
      dailyTracks,
      knownTracks,
      likedIds,
      likedTracks,
      loginOpen,
      logout,
      lyrics,
      myMusicLoading,
      myPlaylists,
      myAlbums,
      myArtists,
      myPodcasts,
      podcastDetail,
      podcastPrograms,
      openLogin,
      quality,
      refreshMyMusic,
      refreshStatus,
      search,
      setQuality,
      status,
      toggleCloudLike,
    ],
  );

  return <NeteaseContext.Provider value={value}>{children}</NeteaseContext.Provider>;
}

export function useNetease(): NeteaseApi {
  const ctx = useContext(NeteaseContext);
  if (!ctx) throw new Error('useNetease must be used inside NeteaseProvider');
  return ctx;
}
