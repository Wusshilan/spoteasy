import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { registerTracks, type Track } from '../data/mock';

interface LibraryApi {
  tracks: Track[];
  folders: string[];
  loading: boolean;
  scanning: boolean;
  progress: { done: number; total: number } | null;
  chooseFolder(): Promise<void>;
  rescan(): Promise<void>;
  removeFolder(dir: string): Promise<void>;
  clearLibrary(): Promise<void>;
  updateTrack(id: string, patch: TrackPatch): Promise<void>;
  chooseCover(id: string): Promise<void>;
  prune(): Promise<void>;
  clearCovers(): Promise<void>;
}

const LibraryContext = createContext<LibraryApi | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const apply = useCallback((payload: LibraryPayload | undefined) => {
    if (!payload) return;
    registerTracks(payload.tracks);
    setTracks(payload.tracks);
    setFolders(payload.folders);
  }, []);

  useEffect(() => {
    const api = window.spoteasy?.library;
    if (!api) {
      setLoading(false);
      return;
    }
    let alive = true;
    api
      .get()
      .then((payload) => {
        if (alive) apply(payload);
      })
      .catch((err) => console.warn('[library] load failed', err))
      .finally(() => {
        if (alive) setLoading(false);
      });

    const off = api.onProgress((value) => setProgress(value));
    const offChanged = api.onChanged((payload) => {
      if (alive) apply(payload);
    });
    return () => {
      alive = false;
      off();
      offChanged();
    };
  }, [apply]);

  const chooseFolder = useCallback(async () => {
    const api = window.spoteasy?.library;
    if (!api) return;
    setScanning(true);
    setProgress(null);
    try {
      apply(await api.chooseFolder());
    } catch (err) {
      console.warn('[library] choose failed', err);
    } finally {
      setScanning(false);
      setProgress(null);
    }
  }, [apply]);

  const rescan = useCallback(async () => {
    const api = window.spoteasy?.library;
    if (!api) return;
    setScanning(true);
    setProgress(null);
    try {
      apply(await api.rescan());
    } catch (err) {
      console.warn('[library] rescan failed', err);
    } finally {
      setScanning(false);
      setProgress(null);
    }
  }, [apply]);

  const removeFolder = useCallback(async (dir: string) => {
    const api = window.spoteasy?.library;
    if (!api) return;
    try {
      apply(await api.removeFolder(dir));
    } catch (err) {
      console.warn('[library] remove folder failed', err);
    }
  }, [apply]);

  const clearLibrary = useCallback(async () => {
    const api = window.spoteasy?.library;
    if (!api) return;
    try {
      apply(await api.clear());
    } catch (err) {
      console.warn('[library] clear failed', err);
    }
  }, [apply]);

  const updateTrack = useCallback(async (id: string, patch: TrackPatch) => {
    const api = window.spoteasy?.library;
    if (!api) return;
    try {
      apply(await api.updateTrack(id, patch));
    } catch (err) {
      console.warn('[library] update track failed', err);
    }
  }, [apply]);

  const chooseCover = useCallback(async (id: string) => {
    const api = window.spoteasy?.library;
    if (!api) return;
    try {
      apply(await api.chooseCover(id));
    } catch (err) {
      console.warn('[library] choose cover failed', err);
    }
  }, [apply]);

  const prune = useCallback(async () => {
    const api = window.spoteasy?.library;
    if (!api) return;
    try {
      apply(await api.prune());
    } catch (err) {
      console.warn('[library] prune failed', err);
    }
  }, [apply]);

  const clearCovers = useCallback(async () => {
    const api = window.spoteasy?.library;
    if (!api) return;
    try {
      apply(await api.clearCovers());
    } catch (err) {
      console.warn('[library] clear covers failed', err);
    }
  }, [apply]);

  const value = useMemo<LibraryApi>(
    () => ({
      tracks,
      folders,
      loading,
      scanning,
      progress,
      chooseFolder,
      rescan,
      removeFolder,
      clearLibrary,
      updateTrack,
      chooseCover,
      prune,
      clearCovers,
    }),
    [
      tracks,
      folders,
      loading,
      scanning,
      progress,
      chooseFolder,
      rescan,
      removeFolder,
      clearLibrary,
      updateTrack,
      chooseCover,
      prune,
      clearCovers,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryApi {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
