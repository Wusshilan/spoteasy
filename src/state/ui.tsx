import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PanelTab = 'lyrics' | 'queue';
export type PanelView = 'nowPlaying' | 'queue';
export type Accent = 'green' | 'red';
export type ThemeMode = 'dark' | 'black';

interface ToastItem {
  id: number;
  text: string;
}

interface UiApi {
  panelOpen: boolean;
  setPanelOpen(v: boolean): void;
  npFull: boolean;
  setNpFull(v: boolean): void;
  lyricsFull: boolean;
  setLyricsFull(v: boolean): void;
  panelView: PanelView;
  setPanelView(v: PanelView): void;
  panelTab: PanelTab;
  setPanelTab(t: PanelTab): void;
  accent: Accent;
  setAccent(a: Accent): void;
  mode: ThemeMode;
  setMode(m: ThemeMode): void;
  toasts: ToastItem[];
  toast(text: string): void;
  searchOpen: boolean;
  setSearchOpen(v: boolean): void;
  sleepAt: number | null;
  setSleepAt(v: number | null): void;
  menu: { trackId: string; x: number; y: number } | null;
  openMenu(trackId: string, x: number, y: number): void;
  closeMenu(): void;
  editingTrackId: string | null;
  openEditor(id: string): void;
  closeEditor(): void;
}

const UiContext = createContext<UiApi | null>(null);

function loadAccent(): Accent {
  return localStorage.getItem('spoteasy.accent') === 'red' ? 'red' : 'green';
}

function loadMode(): ThemeMode {
  return localStorage.getItem('spoteasy.mode') === 'black' ? 'black' : 'dark';
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [npFull, setNpFull] = useState(false);
  const [lyricsFull, setLyricsFull] = useState(false);
  const [panelView, setPanelView] = useState<PanelView>('nowPlaying');
  const [panelTab, setPanelTab] = useState<PanelTab>('lyrics');
  const [accent, setAccent] = useState<Accent>(loadAccent);
  const [mode, setMode] = useState<ThemeMode>(loadMode);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sleepAt, setSleepAt] = useState<number | null>(null);
  const [menu, setMenu] = useState<UiApi['menu']>(null);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    localStorage.setItem('spoteasy.accent', accent);
  }, [accent]);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    localStorage.setItem('spoteasy.mode', mode);
  }, [mode]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, text }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  const openMenu = useCallback((trackId: string, x: number, y: number) => {
    setMenu({ trackId, x, y });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);
  const openEditor = useCallback((id: string) => setEditingTrackId(id), []);
  const closeEditor = useCallback(() => setEditingTrackId(null), []);

  const value = useMemo<UiApi>(
    () => ({
      panelOpen,
      setPanelOpen,
      npFull,
      setNpFull,
      lyricsFull,
      setLyricsFull,
      panelView,
      setPanelView,
      panelTab,
      setPanelTab,
      accent,
      setAccent,
      mode,
      setMode,
      toasts,
      toast,
      searchOpen,
      setSearchOpen,
      sleepAt,
      setSleepAt,
      menu,
      openMenu,
      closeMenu,
      editingTrackId,
      openEditor,
      closeEditor,
    }),
    [panelOpen, npFull, lyricsFull, panelView, panelTab, accent, mode, toasts, toast, searchOpen, sleepAt, menu, openMenu, closeMenu, editingTrackId, openEditor, closeEditor],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiApi {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside UiProvider');
  return ctx;
}
