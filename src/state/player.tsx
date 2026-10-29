import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { getTrack, registerTracks, type Track } from '../data/mock';
import { useLibrary } from './library';
import { useNetease } from './netease';
import { useUi } from './ui';
import { useEqualizer } from '../audio/equalizer';

type Repeat = 'off' | 'all' | 'one';

interface PlayerState {
  order: string[];
  index: number;
  contextName: string;
  playing: boolean;
  progress: number;
  volume: number;
  shuffle: boolean;
  shuffleBase: string[] | null;
  repeat: Repeat;
  liked: Set<string>;
  history: string[];
}

type Action =
  | { type: 'play'; id: string; order?: string[]; name?: string }
  | { type: 'toggle' }
  | { type: 'pause' }
  | { type: 'next'; auto?: boolean }
  | { type: 'prev' }
  | { type: 'seek'; time: number }
  | { type: 'volume'; value: number }
  | { type: 'like'; id?: string }
  | { type: 'shuffle' }
  | { type: 'removeQueueIndex'; index: number }
  | { type: 'clearQueue' }
  | { type: 'moveQueue'; from: number; to: number }
  | { type: 'jumpQueue'; index: number }
  | { type: 'repeat' }
  | { type: 'repeatMode'; value: Repeat }
  | { type: 'addNext'; id: string }
  | { type: 'addQueue'; id: string }
  | { type: 'blockArtist'; name: string }
  | { type: 'tick'; delta: number }
  | { type: 'syncProgress'; value: number };

const initialOrder: string[] = [];

const likedSeed: string[] = [];

function loadLiked(): Set<string> {
  try {
    const raw = localStorage.getItem('spoteasy.liked');
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set(likedSeed);
}

function loadVolume(): number {
  const raw = localStorage.getItem('spoteasy.volume');
  if (raw === null) return 0.72;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.72;
}

function loadBlockedArtists(): string[] {
  try {
    const raw = localStorage.getItem('spoteasy.blockedArtists');
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return [];
}

function isBlockedTrack(id: string): boolean {
  const track = getTrack(id);
  const blocked = loadBlockedArtists();
  return blocked.some(
    (name) => track.artist === name || track.artist.split(' / ').includes(name),
  );
}

const QUEUE_KEY = 'spoteasy.playerQueue';

interface StoredQueue {
  order: string[];
  index: number;
  contextName: string;
  shuffle: boolean;
  shuffleBase: string[] | null;
  repeat: Repeat;
  progress: number;
  history: string[];
  tracks: Track[];
}

function loadQueue(): Partial<PlayerState> {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredQueue;
    if (!parsed || !Array.isArray(parsed.order)) return {};
    const tracks = Array.isArray(parsed.tracks) ? parsed.tracks.filter(Boolean) : [];
    registerTracks(tracks);
    const playable = parsed.order.filter((id) => {
      try {
        getTrack(id);
        return true;
      } catch {
        return false;
      }
    });
    const rawIndex = Math.max(0, Math.min(Number(parsed.index) || 0, playable.length - 1));
    const currentId = playable[rawIndex];
    const index = currentId ? Math.max(0, playable.indexOf(currentId)) : 0;
    return {
      order: playable,
      index,
      contextName: typeof parsed.contextName === 'string' ? parsed.contextName : '',
      shuffle: Boolean(parsed.shuffle),
      shuffleBase: Array.isArray(parsed.shuffleBase) ? parsed.shuffleBase : null,
      repeat: parsed.repeat === 'all' || parsed.repeat === 'one' ? parsed.repeat : 'off',
      progress: Number.isFinite(parsed.progress) ? Math.max(0, parsed.progress) : 0,
      history: Array.isArray(parsed.history)
        ? parsed.history
            .filter((id) => {
              try {
                getTrack(id);
                return true;
              } catch {
                return false;
              }
            })
            .slice(0, 30)
        : [],
    };
  } catch {
    return {};
  }
}

const restoredQueue = loadQueue();

const initialState: PlayerState = {
  order: restoredQueue.order ?? initialOrder,
  index: restoredQueue.index ?? 0,
  contextName: restoredQueue.contextName ?? '',
  playing: false,
  progress: restoredQueue.progress ?? 0,
  volume: loadVolume(),
  shuffle: restoredQueue.shuffle ?? false,
  shuffleBase: restoredQueue.shuffleBase ?? null,
  repeat: restoredQueue.repeat ?? 'off',
  liked: loadLiked(),
  history: restoredQueue.history ?? [],
};

function pushHistory(state: PlayerState): string[] {
  const current = state.order[state.index];
  if (!current) return state.history;
  return [current, ...state.history.filter((id) => id !== current)].slice(0, 30);
}

function durationOf(state: PlayerState): number {
  const id = state.order[state.index];
  return id ? getTrack(id).duration : 0;
}

function nextTrack(state: PlayerState, auto: boolean): PlayerState {
  const dur = durationOf(state);
  if (auto && state.repeat === 'one') {
    return { ...state, progress: 0, playing: true };
  }
  if (state.index < state.order.length - 1) {
    const next = { ...state, index: state.index + 1, progress: 0, playing: true };
    return { ...next, history: pushHistory(next) };
  }
  if (state.repeat === 'all') {
    const next = { ...state, index: 0, progress: 0, playing: true };
    return { ...next, history: pushHistory(next) };
  }
  return { ...state, progress: dur, playing: false };
}

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case 'play': {
      const rawOrder = action.order ?? (state.order.includes(action.id) ? state.order : [action.id]);
      const order = rawOrder.filter((id) => !isBlockedTrack(id));
      if (!order.length || !order.includes(action.id)) return state;
      const index = Math.max(0, order.indexOf(action.id));
      const same = state.order[index] === action.id && state.order.length === order.length;
      const next = {
        ...state,
        order,
        index,
        contextName: action.name ?? state.contextName,
        playing: true,
        progress: same ? state.progress : 0,
      };
      return same ? next : { ...next, history: pushHistory(next) };
    }
    case 'toggle':
      return { ...state, playing: !state.playing };
    case 'pause':
      return { ...state, playing: false };
    case 'next':
      return nextTrack(state, Boolean(action.auto));
    case 'prev': {
      if (state.progress > 3) return { ...state, progress: 0 };
      if (state.index > 0) {
        const next = { ...state, index: state.index - 1, progress: 0, playing: true };
        return { ...next, history: pushHistory(next) };
      }
      if (state.repeat === 'all' && state.order.length > 0) {
        const next = { ...state, index: state.order.length - 1, progress: 0, playing: true };
        return { ...next, history: pushHistory(next) };
      }
      return { ...state, progress: 0 };
    }
    case 'seek': {
      const dur = durationOf(state);
      return { ...state, progress: Math.min(Math.max(0, action.time), dur) };
    }
    case 'volume':
      return { ...state, volume: Math.min(1, Math.max(0, action.value)) };
    case 'like': {
      const liked = new Set(state.liked);
      const id = action.id ?? state.order[state.index];
      if (!id) return state;
      if (liked.has(id)) liked.delete(id);
      else liked.add(id);
      return { ...state, liked };
    }
    case 'shuffle': {
      if (state.shuffle) {
        const currentId = state.order[state.index];
        const base = state.shuffleBase ?? state.order;
        const extra = state.order.filter((id) => !base.includes(id));
        const order = [...base, ...extra];
        const index = currentId ? Math.max(0, order.indexOf(currentId)) : 0;
        return { ...state, shuffle: false, shuffleBase: null, order, index };
      }
      const head = state.order.slice(0, state.index + 1);
      const tail = state.order.slice(state.index + 1);
      for (let i = tail.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [tail[i], tail[j]] = [tail[j], tail[i]];
      }
      return {
        ...state,
        shuffle: true,
        shuffleBase: [...state.order],
        order: [...head, ...tail],
      };
    }
    case 'removeQueueIndex': {
      if (action.index <= state.index || action.index >= state.order.length) return state;
      const order = state.order.filter((_, i) => i !== action.index);
      return { ...state, order };
    }
    case 'clearQueue':
      return { ...state, order: state.order.slice(0, state.index + 1) };
    case 'moveQueue': {
      if (action.from <= state.index || action.to <= state.index) return state;
      if (action.from >= state.order.length || action.to >= state.order.length) return state;
      const order = [...state.order];
      const [moved] = order.splice(action.from, 1);
      order.splice(action.to, 0, moved);
      return { ...state, order };
    }
    case 'jumpQueue': {
      if (action.index < 0 || action.index >= state.order.length) return state;
      const next = { ...state, index: action.index, progress: 0, playing: true };
      return { ...next, history: pushHistory(next) };
    }
    case 'repeat': {
      const next = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
      return { ...state, repeat: next };
    }
    case 'repeatMode':
      return { ...state, repeat: action.value };
    case 'addNext': {
      if (isBlockedTrack(action.id)) return state;
      const order = [...state.order];
      order.splice(state.index + 1, 0, action.id);
      return { ...state, order };
    }
    case 'addQueue':
      if (isBlockedTrack(action.id)) return state;
      return { ...state, order: [...state.order, action.id] };
    case 'blockArtist': {
      const currentId = state.order[state.index];
      const order = state.order.filter((id) => {
        const track = getTrack(id);
        return !track.artist.split(' / ').includes(action.name);
      });
      if (!order.length) {
        return { ...state, order: [], index: 0, playing: false, progress: 0 };
      }
      const keptIndex = currentId ? order.indexOf(currentId) : -1;
      const index = keptIndex >= 0 ? keptIndex : Math.min(state.index, order.length - 1);
      const changed = order[index] !== currentId;
      return {
        ...state,
        order,
        index,
        playing: state.playing,
        progress: changed ? 0 : state.progress,
      };
    }
    case 'tick': {
      if (!state.playing) return state;
      const dur = durationOf(state);
      const progress = state.progress + action.delta;
      if (progress >= dur) return nextTrack(state, true);
      return { ...state, progress };
    }
    case 'syncProgress': {
      const dur = durationOf(state);
      const value = Math.max(0, action.value);
      return { ...state, progress: dur > 0 ? Math.min(value, dur) : value };
    }
    default:
      return state;
  }
}

interface PlayerApi {
  track: Track | null;
  queue: Track[];
  history: Track[];
  order: string[];
  index: number;
  contextName: string;
  playing: boolean;
  progress: number;
  volume: number;
  shuffle: boolean;
  repeat: Repeat;
  liked: Set<string>;
  play(id: string, order?: string[], name?: string): void;
  toggle(): void;
  pause(): void;
  next(): void;
  prev(): void;
  seek(time: number): void;
  setVolume(v: number): void;
  toggleLike(id?: string): void;
  toggleShuffle(): void;
  cycleRepeat(): void;
  setRepeat(value: Repeat): void;
  addNext(id: string): void;
  addQueue(id: string): void;
  removeFromQueue(index: number): void;
  clearQueue(): void;
  moveQueue(from: number, to: number): void;
  jumpTo(index: number): void;
  blockArtist(name: string): void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const library = useLibrary();
  const netease = useNetease();
  const { quality } = netease;
  const { toast } = useUi();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEqualizer(audioRef);
  const loadedUrlRef = useRef<string | null>(null);
  const retriedTrackRef = useRef<string | null>(null);

  const currentId = state.order[state.index];
  const currentTrack = currentId ? getTrack(currentId) : null;
  const isReal = Boolean(
    currentTrack?.mediaUrl && (currentTrack.local || currentTrack.source === 'netease'),
  );

  useEffect(() => {
    retriedTrackRef.current = null;
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!state.playing || isReal) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      dispatch({ type: 'tick', delta });
    }, 250);
    return () => window.clearInterval(timer);
  }, [state.playing, isReal]);

  // 切歌 / 切播放状态时驱动 <audio>；本地和网易云歌曲走真实播放，mock 歌曲继续用 tick 模拟。
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const baseSrc =
      currentTrack && (currentTrack.local || currentTrack.source === 'netease')
        ? currentTrack.mediaUrl
        : undefined;
    const src =
      baseSrc && currentTrack?.source === 'netease'
        ? `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}level=${quality}`
        : baseSrc;
    if (!src) {
      if (loadedUrlRef.current) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        loadedUrlRef.current = null;
      }
      return;
    }

    if (loadedUrlRef.current !== src) {
      audio.src = src;
      audio.load();
      audio.currentTime = Math.min(state.progress || 0, currentTrack?.duration || 0);
      loadedUrlRef.current = src;
    }

    if (state.playing) audio.play().catch(() => undefined);
    else audio.pause();
  }, [currentTrack, quality, state.playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = state.volume;
  }, [state.volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      dispatch({ type: 'syncProgress', value: audio.currentTime });
    };
    const onEnded = () => {
      if (state.repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
        dispatch({ type: 'seek', time: 0 });
      } else {
        dispatch({ type: 'next', auto: true });
      }
    };
    const onError = () => {
      if (!audio.currentSrc) return;
      const trackId = currentTrack?.id;
      if (trackId && retriedTrackRef.current !== trackId) {
        // 网易云流地址偶尔会瞬时失效，先静默重试一次，再提示用户。
        retriedTrackRef.current = trackId;
        window.setTimeout(() => {
          if (audioRef.current !== audio) return;
          audio.load();
          audio.play().catch(() => undefined);
        }, 700);
        return;
      }
      dispatch({ type: 'pause' });
      (async () => {
        const status = await window.spoteasy?.netease?.status().catch(() => null);
        if (status && !status.loggedIn) {
          toast('网易云登录已失效，请重新登录');
          netease.openLogin();
        } else {
          toast('这首歌暂时无法播放，可能是版权或会员限制');
        }
      })();
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [state.repeat, toast, currentTrack?.id]);

  useEffect(() => {
    localStorage.setItem('spoteasy.liked', JSON.stringify([...state.liked]));
  }, [state.liked]);

  useEffect(() => {
    localStorage.setItem('spoteasy.volume', String(state.volume));
  }, [state.volume]);

  const latestStateRef = useRef(state);
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    const save = () => {
      const current = latestStateRef.current;
      const tracks: Record<string, Track> = {};
      for (const id of [...current.order, ...current.history]) {
        try {
          tracks[id] = getTrack(id);
        } catch {
          /* skip missing */
        }
      }
      try {
        localStorage.setItem(
          QUEUE_KEY,
          JSON.stringify({
            order: current.order,
            index: current.index,
            contextName: current.contextName,
            shuffle: current.shuffle,
            shuffleBase: current.shuffleBase,
            repeat: current.repeat,
            progress: current.progress,
            history: current.history,
            tracks: Object.values(tracks),
          }),
        );
      } catch {
        /* quota */
      }
    };
    save();
    const timer = window.setInterval(save, 4000);
    window.addEventListener('beforeunload', save);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('beforeunload', save);
    };
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: currentTrack.coverUrl
          ? [{ src: currentTrack.coverUrl, sizes: '400x400', type: 'image/jpeg' }]
          : [],
      });
    }
    navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', () => dispatch({ type: 'toggle' }));
    navigator.mediaSession.setActionHandler('pause', () => dispatch({ type: 'pause' }));
    navigator.mediaSession.setActionHandler('previoustrack', () => dispatch({ type: 'prev' }));
    navigator.mediaSession.setActionHandler('nexttrack', () => dispatch({ type: 'next' }));
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        dispatch({ type: 'seek', time: details.seekTime });
        if (audioRef.current && audioRef.current.readyState > 0) {
          audioRef.current.currentTime = details.seekTime;
        }
      }
    });
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [currentTrack?.id, state.playing]);

  const api = useMemo<PlayerApi>(() => {
    const track = state.order[state.index] ? getTrack(state.order[state.index]) : null;
    const real = Boolean(track?.mediaUrl && (track.local || track.source === 'netease'));
    return {
      track,
      queue: state.order.slice(state.index + 1).map(getTrack),
      history: state.history.map((id) => getTrack(id)),
      order: state.order,
      index: state.index,
      contextName: state.contextName,
      playing: state.playing,
      progress: state.progress,
      volume: state.volume,
      shuffle: state.shuffle,
      repeat: state.repeat,
      liked: state.liked,
      play: (id, order, name) => dispatch({ type: 'play', id, order, name }),
      toggle: () => dispatch({ type: 'toggle' }),
      pause: () => dispatch({ type: 'pause' }),
      next: () => dispatch({ type: 'next' }),
      prev: () => {
        if (real && state.progress > 3 && audioRef.current) audioRef.current.currentTime = 0;
        dispatch({ type: 'prev' });
      },
      seek: (time) => {
        dispatch({ type: 'seek', time });
        if (real && audioRef.current && audioRef.current.readyState > 0) {
          audioRef.current.currentTime = time;
        }
      },
      setVolume: (value) => dispatch({ type: 'volume', value }),
      toggleLike: (id) => dispatch({ type: 'like', id }),
      toggleShuffle: () => dispatch({ type: 'shuffle' }),
      cycleRepeat: () => dispatch({ type: 'repeat' }),
      setRepeat: (value) => dispatch({ type: 'repeatMode', value }),
      addNext: (id) => dispatch({ type: 'addNext', id }),
      addQueue: (id) => dispatch({ type: 'addQueue', id }),
      removeFromQueue: (index) => dispatch({ type: 'removeQueueIndex', index }),
      clearQueue: () => dispatch({ type: 'clearQueue' }),
      moveQueue: (from, to) => dispatch({ type: 'moveQueue', from, to }),
      jumpTo: (index) => dispatch({ type: 'jumpQueue', index }),
      blockArtist: (name) => dispatch({ type: 'blockArtist', name }),
    };
  }, [state, library.tracks]);

  return (
    <PlayerContext.Provider value={api}>
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" style={{ display: 'none' }} />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}

export function useTrack(id: string | undefined | null): Track | null {
  return useMemo(() => (id ? getTrack(id) : null), [id]);
}

export function usePlaylistTracks(ids: string[]): Track[] {
  return useMemo(() => ids.map(getTrack), [ids]);
}

export type { Repeat };
