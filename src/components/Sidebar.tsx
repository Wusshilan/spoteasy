import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';
import { Cover } from './CoverArt';
import { CreateMenu, type CreateAnchor, type CreateKind } from './CreateMenu';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import { registerTracks } from '../data/mock';
import type { Playlist } from '../data/mock';
import type { Route } from '../routing';

export interface LibraryFolder {
  id: string;
  name: string;
  playlistIds: string[];
  createdAt?: number;
}

interface SidebarProps {
  playlists: Playlist[];
  folders: LibraryFolder[];
  collapsed: boolean;
  onToggleCollapsed(): void;
  onOpenLibrary(): void;
  navigate(route: Route): void;
  onCreate(kind: CreateKind): void;
  onAssignPlaylist(folderId: string, playlistId: string): void;
  onRenameFolder(folderId: string): void;
  onDeleteFolder(folderId: string): void;
  onAddToPlaylist(playlistId: string, trackId: string): void;
  /** 截图 / 深链用：强制展示悬停展开态 */
  forceHover?: boolean;
  /** 截图 / 深链用：强制打开创建菜单 */
  forceCreate?: boolean;
  /** 截图 / 深链用：强制显示收起态 tooltip */
  forceTip?: boolean;
  /** 截图 / 深链用：未登录时也展示一条「我喜欢的音乐」 */
  demoLiked?: boolean;
}

type Filter = 'all' | 'playlists' | 'albums' | 'artists' | 'podcasts';
type SortMode = 'recent' | 'added' | 'alpha' | 'creator';

const sortLabels: Array<[SortMode, string]> = [
  ['recent', '最近播放'],
  ['added', '最近添加的内容'],
  ['alpha', '按字母顺序'],
  ['creator', '创建者'],
];

interface SideItem {
  key: string;
  kind: 'liked' | 'playlist' | 'album' | 'artist' | 'podcast';
  title: string;
  sub: string;
  coverUrl?: string;
  hue: number;
  variant: number;
  cloudId?: number;
  trackIds?: string[];
  addedAt?: number;
  pinned?: boolean;
  open(): void;
}

interface FolderGroup {
  id: string;
  name: string;
  children: SideItem[];
}

type RowEntry = { type: 'item'; item: SideItem } | { type: 'folder'; folder: FolderGroup };

function RailTooltip({ text, rect }: { text: string; rect: DOMRect }) {
  return createPortal(
    <div
      className="rail-tooltip"
      style={{ left: rect.right + 10, top: rect.top + rect.height / 2 }}
      role="tooltip"
    >
      {text}
    </div>,
    document.body,
  );
}

export function Sidebar({
  playlists,
  folders,
  collapsed,
  onToggleCollapsed,
  onOpenLibrary,
  navigate,
  onCreate,
  onAssignPlaylist,
  onRenameFolder,
  onDeleteFolder,
  onAddToPlaylist,
  forceHover,
  forceCreate,
  forceTip,
  demoLiked,
}: SidebarProps) {
  const netease = useNetease();
  const player = usePlayer();
  const { toast } = useUi();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortPos, setSortPos] = useState({ left: 0, top: 0, width: 252 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [hovering, setHovering] = useState(Boolean(forceHover));
  const [createAnchor, setCreateAnchor] = useState<CreateAnchor | null>(null);
  const [createTrigger, setCreateTrigger] = useState<HTMLElement | null>(null);
  const [tip, setTip] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [folderMenu, setFolderMenu] = useState<{ folder: FolderGroup; x: number; y: number } | null>(null);
  const [itemMenu, setItemMenu] = useState<{ item: SideItem; x: number; y: number } | null>(null);
  const [menuSub, setMenuSub] = useState<'playlists' | 'share' | null>(null);
  const [pins, setPins] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('spoteasy.pins');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [viewMode, setViewMode] = useState<'titles' | 'list' | 'comfortable' | 'dense'>(() => {
    const saved = localStorage.getItem('spoteasy.libraryView');
    if (saved === 'grid') return 'comfortable';
    if (saved === 'mosaic') return 'dense';
    if (saved === 'compact') return 'titles';
    if (saved === 'titles' || saved === 'list' || saved === 'comfortable' || saved === 'dense') return saved;
    return 'list';
  });
  const sortRef = useRef<HTMLDivElement>(null);
  const headerAddRef = useRef<HTMLButtonElement>(null);
  const railLibRef = useRef<HTMLButtonElement>(null);
  const tipTimer = useRef<number | null>(null);
  const forceOpened = useRef(false);

  useEffect(() => {
    if (!sortOpen) return;
    const onResize = () => setSortOpen(false);
    window.addEventListener('resize', onResize);
    const onDown = (event: MouseEvent) => {
      if (
        sortRef.current &&
        !sortRef.current.contains(event.target as Node) &&
        !(event.target as Element | null)?.closest('.library-sort-menu')
      ) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onDown);
    };
  }, [sortOpen]);

  useEffect(() => {
    localStorage.setItem('spoteasy.pins', JSON.stringify(pins));
  }, [pins]);

  useEffect(() => {
    localStorage.setItem('spoteasy.libraryView', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!itemMenu) return;
    const onDown = (event: MouseEvent) => {
      if (!(event.target as Element | null)?.closest('.sidebar-item-menu')) setItemMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [itemMenu]);

  useEffect(() => {
    if (!folderMenu) return;
    const onDown = (event: MouseEvent) => {
      if (!(event.target as Element | null)?.closest('.sidebar-folder-menu')) setFolderMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [folderMenu]);

  useEffect(() => {
    const onResize = () => setFolderMenu(null);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (forceHover) setHovering(true);
  }, [forceHover]);

  useEffect(() => {
    setCreateAnchor(null);
    setCreateTrigger(null);
    setTip(null);
    forceOpened.current = false;
  }, [collapsed]);

  useEffect(() => {
    if (!forceCreate || forceOpened.current || collapsed) return;
    const el = headerAddRef.current;
    if (!el) return;
    forceOpened.current = true;
    const rect = el.getBoundingClientRect();
    setCreateTrigger(el);
    setCreateAnchor({ left: rect.left, top: rect.bottom + 8, right: rect.right });
  }, [forceCreate, collapsed]);

  const hideTip = useCallback(() => {
    if (tipTimer.current !== null) {
      window.clearTimeout(tipTimer.current);
      tipTimer.current = null;
    }
    setTip(null);
  }, []);

  const showTip = useCallback((text: string, el: HTMLElement) => {
    if (tipTimer.current !== null) window.clearTimeout(tipTimer.current);
    tipTimer.current = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTip({ text, rect });
    }, 260);
  }, []);

  useEffect(() => {
    if (!forceTip || !collapsed) return;
    const timer = window.setTimeout(() => {
      const el = railLibRef.current;
      if (!el) return;
      setTip({ text: '打开音乐库', rect: el.getBoundingClientRect() });
    }, 320);
    return () => {
      window.clearTimeout(timer);
      setTip(null);
    };
  }, [forceTip, collapsed]);

  useEffect(() => () => hideTip(), [hideTip]);

  const closeCreate = useCallback(() => {
    setCreateAnchor(null);
    setCreateTrigger(null);
  }, []);

  const toggleCreate = useCallback(
    (el: HTMLElement) => {
      if (createAnchor) {
        closeCreate();
        return;
      }
      hideTip();
      const rect = el.getBoundingClientRect();
      setCreateTrigger(el);
      setCreateAnchor(
        collapsed
          ? { left: rect.right + 8, top: rect.top, right: rect.right }
          : { left: rect.left, top: rect.bottom + 8, right: rect.right },
      );
    },
    [collapsed, closeCreate, createAnchor, hideTip],
  );

  const pickCreate = useCallback(
    (kind: CreateKind) => {
      closeCreate();
      onCreate(kind);
    },
    [closeCreate, onCreate],
  );

  const toggleFolder = (id: string) => {
    setExpandedFolders((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  };

  const regular = useMemo<SideItem[]>(() => {
    const playlistItems: SideItem[] = [];
    const podcastItems: SideItem[] = [];
    const albumItems: SideItem[] = [];
    const artistItems: SideItem[] = [];
    const all: SideItem[] = [];

    if (netease.loggedIn) {
      all.push({
        key: 'liked',
        kind: 'liked',
        title: '我喜欢的音乐',
        sub: `歌单 · ${netease.nickname}`,
        hue: 282,
        variant: 3,
        pinned: true,
        open: () => navigate({ name: 'cloudLiked' }),
      });
    } else if (demoLiked || player.liked.size > 0) {
      all.push({
        key: 'demo-liked',
        kind: 'liked',
        title: '我喜欢的音乐',
        sub: '歌单 · 本地喜欢',
        hue: 282,
        variant: 3,
        pinned: true,
        open: () => navigate({ name: 'cloudLiked' }),
      });
    }

    const seen = new Set<string>();
    for (const playlist of playlists) {
      if (seen.has(playlist.id)) continue;
      seen.add(playlist.id);
      playlistItems.push({
        key: playlist.id,
        kind: 'playlist',
        title: playlist.name,
        sub: `歌单 · ${playlist.owner || netease.nickname}`,
        coverUrl: playlist.coverUrl,
        hue: playlist.hue,
        variant: playlist.variant,
        trackIds: playlist.tracks,
        addedAt: playlist.createdAt || playlist.addedAt,
        open: () => navigate({ name: 'playlist', id: playlist.id }),
      });
    }
    for (const playlist of netease.myPlaylists) {
      if (seen.has(playlist.id)) continue;
      seen.add(playlist.id);
      playlistItems.push({
        key: playlist.id,
        kind: 'playlist',
        title: playlist.name,
        sub: `歌单 · ${playlist.owner || netease.nickname}`,
        coverUrl: playlist.coverUrl,
        hue: playlist.hue,
        variant: playlist.variant,
        trackIds: playlist.tracks,
        addedAt: playlist.createdAt || playlist.addedAt,
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
        cloudId: podcast.cloudId,
        hue: podcast.hue,
        variant: podcast.variant,
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
        cloudId: album.cloudId,
        hue: album.hue,
        variant: album.variant,
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
        cloudId: artist.cloudId,
        hue: artist.hue,
        variant: artist.variant,
        open: () => navigate({ name: 'cloudArtist', id: String(artist.cloudId) }),
      });
    }

    const max = Math.max(playlistItems.length, podcastItems.length, albumItems.length, artistItems.length);
    for (let index = 0; index < max; index += 1) {
      if (playlistItems[index]) all.push(playlistItems[index]);
      if (podcastItems[index]) all.push(podcastItems[index]);
      if (albumItems[index]) all.push(albumItems[index]);
      if (artistItems[index]) all.push(artistItems[index]);
    }

    const needle = query.trim().toLowerCase();
    let filtered = all.filter((item) => {
      if (filter === 'playlists' && item.kind !== 'liked' && item.kind !== 'playlist') return false;
      if (filter === 'albums' && item.kind !== 'album') return false;
      if (filter === 'artists' && item.kind !== 'artist') return false;
      if (filter === 'podcasts' && item.kind !== 'podcast') return false;
      return !needle || `${item.title} ${item.sub}`.toLowerCase().includes(needle);
    });

    const isPinned = (item: SideItem) => Boolean(item.pinned) || pins.includes(item.key);
    const pinned = filtered.filter(isPinned);
    let rest = filtered.filter((item) => !isPinned(item));

    if (sort === 'alpha') {
      rest = [...rest].sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
    } else if (sort === 'creator') {
      rest = [...rest].sort((a, b) => a.sub.localeCompare(b.sub, 'zh-Hans-CN'));
    } else if (sort === 'added') {
      rest = [...rest].sort((a, b) => {
        const delta = (b.addedAt || 0) - (a.addedAt || 0);
        return delta || a.title.localeCompare(b.title, 'zh-Hans-CN');
      });
    } else {
      const history = player.history;
      const rank = new Map(history.map((track, index) => [track.id, index]));
      const itemRank = (item: SideItem) => {
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
      rest = [...rest].sort((a, b) => {
        const delta = itemRank(a) - itemRank(b);
        return delta || a.title.localeCompare(b.title, 'zh-Hans-CN');
      });
    }
    return [...pinned, ...rest];
  }, [filter, navigate, netease, pins, player.history, player.liked, playlists, query, sort]);

  const catalog = useMemo<SideItem[]>(() => {
    const base: SideItem[] = [];
    if (netease.loggedIn) {
      base.push({
        key: 'liked',
        kind: 'liked',
        title: '我喜欢的音乐',
        sub: `歌单 · ${netease.nickname}`,
        hue: 282,
        variant: 3,
        pinned: true,
        open: () => navigate({ name: 'cloudLiked' }),
      });
    } else if (demoLiked || player.liked.size > 0) {
      base.push({
        key: 'demo-liked',
        kind: 'liked',
        title: '我喜欢的音乐',
        sub: '歌单 · 本地喜欢',
        hue: 282,
        variant: 3,
        pinned: true,
        open: () => navigate({ name: 'cloudLiked' }),
      });
    }
    for (const playlist of playlists) {
      base.push({
        key: playlist.id,
        kind: 'playlist',
        title: playlist.name,
        sub: `歌单 · ${playlist.owner || netease.nickname}`,
        coverUrl: playlist.coverUrl,
        hue: playlist.hue,
        variant: playlist.variant,
        trackIds: playlist.tracks,
        addedAt: playlist.createdAt || playlist.addedAt,
        open: () => navigate({ name: 'playlist', id: playlist.id }),
      });
    }
    for (const playlist of netease.myPlaylists) {
      if (playlists.some((item) => item.id === playlist.id)) continue;
      base.push({
        key: playlist.id,
        kind: 'playlist',
        title: playlist.name,
        sub: `歌单 · ${playlist.owner || netease.nickname}`,
        coverUrl: playlist.coverUrl,
        hue: playlist.hue,
        variant: playlist.variant,
        trackIds: playlist.tracks,
        addedAt: playlist.createdAt || playlist.addedAt,
        open: () => navigate({ name: 'playlist', id: playlist.id }),
      });
    }
    for (const podcast of netease.myPodcasts) {
      base.push({
        key: podcast.id,
        kind: 'podcast',
        title: podcast.name,
        sub: `播客 · ${podcast.djName}`,
        coverUrl: podcast.coverUrl,
        cloudId: podcast.cloudId,
        hue: podcast.hue,
        variant: podcast.variant,
        open: () => navigate({ name: 'podcast', id: String(podcast.cloudId) }),
      });
    }
    for (const album of netease.myAlbums) {
      base.push({
        key: album.id,
        kind: 'album',
        title: album.name,
        sub: `专辑 · ${album.artist}`,
        coverUrl: album.coverUrl,
        cloudId: album.cloudId,
        hue: album.hue,
        variant: album.variant,
        open: () => navigate({ name: 'cloudAlbum', id: String(album.cloudId) }),
      });
    }
    for (const artist of netease.myArtists) {
      base.push({
        key: artist.id,
        kind: 'artist',
        title: artist.name,
        sub: '艺人',
        coverUrl: artist.avatarUrl,
        cloudId: artist.cloudId,
        hue: artist.hue,
        variant: artist.variant,
        open: () => navigate({ name: 'cloudArtist', id: String(artist.cloudId) }),
      });
    }
    return base;
  }, [navigate, netease, player.liked, playlists]);

  const entries = useMemo<RowEntry[]>(() => {
    if (folders.length === 0) return regular.map((item) => ({ type: 'item', item }));
    const needle = query.trim().toLowerCase();
    const folded = new Set(folders.flatMap((folder) => folder.playlistIds));
    const playlistById = new Map(catalog.filter((item) => item.kind === 'playlist').map((item) => [item.key, item]));

    const folderEntries: RowEntry[] = [];
    for (const folder of folders) {
      if (filter === 'albums' || filter === 'artists') continue;
      const children = folder.playlistIds
        .map((id) => playlistById.get(id))
        .filter((item): item is SideItem => Boolean(item))
        .filter((item) => !needle || `${item.title} ${item.sub}`.toLowerCase().includes(needle));
      const folderHit = !needle || folder.name.toLowerCase().includes(needle);
      if (!folderHit && children.length === 0) continue;
      folderEntries.push({ type: 'folder', folder: { id: folder.id, name: folder.name, children } });
    }

    const flat = regular.filter((item) => !folded.has(item.key));
    const liked = flat.filter((item) => item.kind === 'liked');
    const rest = flat.filter((item) => item.kind !== 'liked');
    return [...liked.map((item) => ({ type: 'item', item } as RowEntry)), ...folderEntries, ...rest.map((item) => ({ type: 'item', item } as RowEntry))];
  }, [catalog, filter, folders, query, regular]);

  const railItems = useMemo(() => {
    const folded = new Set(folders.flatMap((folder) => folder.playlistIds));
    const visible = regular.filter((item) => !folded.has(item.key));
    return visible;
  }, [folders, regular]);

  const previewHoverKey = forceHover ? entries.find((entry) => entry.type === 'item')?.item.key ?? null : null;

  const togglePin = (item: SideItem) => {
    setPins((list) => (list.includes(item.key) ? list.filter((key) => key !== item.key) : [...list, item.key]));
    setItemMenu(null);
    setMenuSub(null);
  };

  const itemCloudId = (item: SideItem) => {
    if (item.cloudId) return item.cloudId;
    const match = item.key.match(/^ne-(?:artist|album|podcast)-(\d+)$/);
    return match ? Number(match[1]) : null;
  };

  const unfollowArtist = async (item: SideItem) => {
    const id = itemCloudId(item);
    const api = window.spoteasy?.netease;
    if (!id || !api) return;
    try {
      const result = await api.artistSub(id, false);
      if (!result.ok) throw new Error(result.error);
      toast('已取消关注');
      netease.refreshMyMusic();
    } catch {
      toast('操作失败');
    }
    setItemMenu(null);
  };

  const blockArtist = (item: SideItem) => {
    player.blockArtist(item.title);
    try {
      const raw = localStorage.getItem('spoteasy.blockedArtists');
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(item.title)) list.push(item.title);
      localStorage.setItem('spoteasy.blockedArtists', JSON.stringify(list));
    } catch {
      /* ignore */
    }
    toast('已在本机屏蔽该艺人');
    setItemMenu(null);
  };

  const startArtistRadio = async (item: SideItem) => {
    const id = itemCloudId(item);
    const api = window.spoteasy?.netease;
    if (!id || !api) return;
    setItemMenu(null);
    try {
      const result = await api.artist(id);
      const tracks = (result.tracks || []).filter((track) => track.mediaUrl || track.source === 'netease');
      if (!tracks.length) {
        toast('这个艺人暂时没有可播放歌曲');
        return;
      }
      registerTracks(tracks);
      const pick = tracks[Math.floor(Math.random() * tracks.length)];
      if (!player.shuffle) player.toggleShuffle();
      player.play(pick.id, tracks.map((track) => track.id), `${item.title} 电台`);
      toast('已开始艺人电台');
    } catch {
      toast('艺人电台打开失败');
    }
  };

  const shareArtist = async (item: SideItem) => {
    const id = itemCloudId(item);
    if (!id) return;
    try {
      await navigator.clipboard.writeText(`https://music.163.com/#/artist?id=${id}`);
      toast('艺人链接已复制');
    } catch {
      toast('复制失败');
    }
    setItemMenu(null);
  };

  const reportArtist = () => {
    window.open('https://music.163.com/st/staticdeal/complaints.html', '_blank', 'noopener');
    toast('已打开网易云举报页面');
    setItemMenu(null);
  };

  const removeAlbum = async (item: SideItem) => {
    const id = itemCloudId(item);
    const api = window.spoteasy?.netease;
    if (!id || !api) return;
    try {
      const result = await api.albumSub(id, false);
      if (!result.ok) throw new Error(result.error);
      toast('已从音乐库删除');
      netease.refreshMyMusic();
    } catch {
      toast('操作失败');
    }
    setItemMenu(null);
  };

  const addAlbumToQueue = async (item: SideItem) => {
    const id = itemCloudId(item);
    const api = window.spoteasy?.netease;
    if (!id || !api) return;
    setItemMenu(null);
    try {
      const result = await api.album(id);
      const tracks = result.tracks || [];
      if (!tracks.length) {
        toast('专辑里没有歌曲');
        return;
      }
      registerTracks(tracks);
      for (const track of tracks) player.addQueue(track.id);
      toast(`已把 ${tracks.length} 首歌加入播放队列`);
    } catch {
      toast('加入队列失败');
    }
  };

  const addAlbumToPlaylist = async (item: SideItem, playlistId: string) => {
    const id = itemCloudId(item);
    const api = window.spoteasy?.netease;
    if (!id || !api) return;
    setItemMenu(null);
    setMenuSub(null);
    try {
      const result = await api.album(id);
      const tracks = result.tracks || [];
      if (!tracks.length) {
        toast('专辑里没有歌曲');
        return;
      }
      registerTracks(tracks);
      for (const track of tracks) onAddToPlaylist(playlistId, track.id);
    } catch {
      toast('加入歌单失败');
    }
  };

  const unfollowPodcast = async (item: SideItem) => {
    const id = itemCloudId(item);
    const api = window.spoteasy?.netease;
    if (!id || !api) return;
    try {
      const result = await api.podcastSub(id, false);
      if (!result.ok) throw new Error(result.error);
      toast('已取消关注播客');
      netease.refreshMyMusic();
    } catch {
      toast('操作失败');
    }
    setItemMenu(null);
  };

  const sharePodcast = async (item: SideItem) => {
    const id = itemCloudId(item);
    if (!id) return;
    try {
      await navigator.clipboard.writeText(`https://music.163.com/#/djradio?id=${id}`);
      toast('播客链接已复制');
    } catch {
      toast('复制失败');
    }
    setItemMenu(null);
  };

  const shareAlbum = async (item: SideItem) => {
    const id = itemCloudId(item);
    if (!id) return;
    try {
      await navigator.clipboard.writeText(`https://music.163.com/#/album?id=${id}`);
      toast('专辑链接已复制');
    } catch {
      toast('复制失败');
    }
    setItemMenu(null);
  };

  const menuPlaylists = useMemo(() => {
    const map = new Map<string, { id: string; name: string; coverUrl?: string; hue: number; variant: number }>();
    for (const playlist of playlists) {
      map.set(playlist.id, playlist);
    }
    for (const playlist of netease.myPlaylists) {
      map.set(playlist.id, playlist);
    }
    return [...map.values()];
  }, [netease.myPlaylists, playlists]);

  const renderCover = (item: SideItem, className: string, withPlay = false) => (
    <span className={`${className} ${item.kind === 'artist' ? 'artist-cover' : ''}`}>
      {item.kind === 'liked' ? (
        <span className="liked-cover">
          <Icon name="heartFill" size={22} />
        </span>
      ) : (
        <Cover hue={item.hue} variant={item.variant} label={item.title} src={item.coverUrl} />
      )}
      {withPlay && (
        <span className="cover-play">
          <Icon name="play" size={18} />
        </span>
      )}
    </span>
  );

  const renderRow = (item: SideItem) => (
    <button
      key={item.key}
      type="button"
      className={`side-cloud-playlist library-row ${item.kind === 'liked' ? 'is-liked' : ''} ${
        item.key === previewHoverKey ? 'is-preview-hover' : ''
      }`}
      draggable={item.kind === 'playlist'}
      onDragStart={(event) => {
        if (item.kind !== 'playlist') return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.key);
      }}
      onContextMenu={(event) => {
        if (item.kind !== 'artist' && item.kind !== 'album' && item.kind !== 'podcast') return;
        event.preventDefault();
        setItemMenu({ item, x: event.clientX, y: event.clientY });
        setMenuSub(null);
      }}
      onClick={item.open}
    >
      {renderCover(item, 'side-cloud-cover', item.kind !== 'artist')}
      <span className="side-cloud-text">
        <span className="side-cloud-title">{item.title}</span>
        <span className="side-cloud-sub">
          {(item.pinned || pins.includes(item.key)) && (
            <span className="row-pin" aria-hidden="true">
              <Icon name="pin" size={12} />
            </span>
          )}
          <span className="side-cloud-sub-text">{item.sub}</span>
        </span>
      </span>
    </button>
  );

  if (collapsed) {
    return (
      <aside className="sidebar is-collapsed">
        <div className="library-rail">
          <div className="library-rail-top">
            <button
              ref={railLibRef}
              type="button"
              className="rail-library"
              aria-label="打开音乐库"
              onClick={onToggleCollapsed}
              onMouseEnter={(event) => showTip('打开音乐库', event.currentTarget)}
              onMouseLeave={hideTip}
              onFocus={(event) => showTip('打开音乐库', event.currentTarget)}
              onBlur={hideTip}
            >
              <Icon name="library" size={24} />
            </button>
            <button
              type="button"
              className={`rail-add ${createAnchor ? 'is-open' : ''}`}
              aria-label={createAnchor ? '关闭创建菜单' : '创建'}
              aria-haspopup="menu"
              aria-expanded={Boolean(createAnchor)}
              onClick={(event) => toggleCreate(event.currentTarget)}
              onMouseEnter={(event) => showTip('创建', event.currentTarget)}
              onMouseLeave={hideTip}
            >
              <Icon name={createAnchor ? 'xLg' : 'plus'} size={24} />
            </button>
          </div>
          <div className="library-rail-list" onScroll={hideTip}>
            {railItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className="rail-item"
                onClick={item.open}
                onMouseEnter={(event) => showTip(item.title, event.currentTarget)}
                onMouseLeave={hideTip}
                aria-label={item.title}
              >
                {renderCover(item, 'rail-cover')}
              </button>
            ))}
          </div>
        </div>

        {createAnchor && createTrigger && (
          <CreateMenu anchor={createAnchor} trigger={createTrigger} onPick={pickCreate} onClose={closeCreate} />
        )}
        {tip && <RailTooltip text={tip.text} rect={tip.rect} />}
        {folderMenu &&
          createPortal(
            <div className="context-menu sidebar-folder-menu" style={{ left: folderMenu.x, top: folderMenu.y }} role="menu">
              <button
                type="button"
                className="cm-item"
                role="menuitem"
                onClick={() => {
                  onRenameFolder(folderMenu.folder.id);
                  setFolderMenu(null);
                }}
              >
                <Icon name="note" size={15} />
                <span>重命名文件夹</span>
              </button>
              <button
                type="button"
                className="cm-item is-danger"
                role="menuitem"
                onClick={() => {
                  onDeleteFolder(folderMenu.folder.id);
                  setFolderMenu(null);
                }}
              >
                <Icon name="trash" size={15} />
                <span>删除文件夹</span>
              </button>
            </div>,
            document.body,
          )}
      </aside>
    );
  }

  const isHovering = Boolean(forceHover) || hovering || Boolean(createAnchor);

  return (
    <aside className={`sidebar ${sortOpen ? 'is-sort-open' : ''}`}>
      <section
        className={`side-cloud ${isHovering ? 'is-hovering' : ''}`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => {
          setHovering(false);
          hideTip();
        }}
      >
        <header className="library-head">
          <button
            type="button"
            className="library-collapse"
            aria-label="收起音乐库"
            title="收起音乐库"
            onClick={onToggleCollapsed}
          >
            <Icon name="panelOpen" size={20} />
          </button>
          <h2>音乐库</h2>
          <div className="library-head-actions">
            <button
              ref={headerAddRef}
              type="button"
              className={`library-add ${createAnchor ? 'is-open' : ''}`}
              aria-label={createAnchor ? '关闭创建菜单' : '创建'}
              aria-haspopup="menu"
              aria-expanded={Boolean(createAnchor)}
              title={createAnchor ? undefined : '创建'}
              onClick={(event) => toggleCreate(event.currentTarget)}
            >
              <Icon name={createAnchor ? 'xLg' : 'plus'} size={24} />
            </button>
            <button
              type="button"
              className="icon-btn library-expand"
              aria-label="打开音乐库"
              title="打开音乐库"
              onClick={onOpenLibrary}
            >
              <Icon name="expand" size={20} />
            </button>
          </div>
        </header>

        <div className="library-filters">
          {(
            [
              ['playlists', '歌单'],
              ['podcasts', '播客'],
              ['albums', '专辑'],
              ['artists', '艺人'],
            ] as Array<[Filter, string]>
          ).map(([key, label]) => (
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

        <div className="library-tools">
          {searchOpen ? (
            <label className="library-search">
              <Icon name="search" size={16} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="在音乐库中搜索"
                aria-label="在音乐库中搜索"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setQuery('');
                    setSearchOpen(false);
                  }
                }}
              />
              <button
                type="button"
                className="library-search-close"
                aria-label="关闭搜索"
                onClick={() => {
                  setQuery('');
                  setSearchOpen(false);
                }}
              >
                <Icon name="x" size={14} />
              </button>
            </label>
          ) : (
            <>
              <button
                type="button"
                className="library-search-btn"
                aria-label="搜索音乐库"
                title="搜索音乐库"
                onClick={() => setSearchOpen(true)}
              >
                <Icon name="search" size={20} />
              </button>
              <div className="library-sort-wrap" ref={sortRef}>
                <button
                  type="button"
                  className="library-sort"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const sidebar = (event.currentTarget as HTMLElement).closest('.sidebar');
                    const sidebarWidth = sidebar?.getBoundingClientRect().width || 280;
                    const previousWidth = Math.max(196, Math.min(252, sidebarWidth - 24));
                    const width = Math.max(148, Math.round((previousWidth * 2) / 3));
                    setSortPos({
                      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
                      top: rect.bottom + 6,
                      width,
                    });
                    setSortOpen((value) => !value);
                  }}
                >
                  {sortLabels.find(([key]) => key === sort)?.[1]}
                  <Icon name="sort" size={20} />
                </button>
                {sortOpen &&
                  createPortal(
                    <div
                      className="library-sort-menu is-sidebar library-sort-menu-rich"
                      style={{ position: 'fixed', left: sortPos.left, top: sortPos.top, width: sortPos.width }}
                    >
                    <div className="sort-menu-title">排序方式</div>
                    {sortLabels.map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`menu-row sort-menu-option ${sort === key ? 'is-active' : ''}`}
                        onClick={() => {
                          setSort(key);
                          setSortOpen(false);
                        }}
                      >
                        <span>{label}</span>
                        {sort === key && <Icon name="chevronDown" size={15} />}
                      </button>
                    ))}
                    <div className="sort-menu-sep" />
                    <div className="sort-menu-title">视图模式:</div>
                    <div className="sort-menu-views">
                      {(
                        [
                          ['titles', 'sort', '仅标题和作者'],
                          ['list', 'listView', '列表模式'],
                          ['comfortable', 'grid', '宽松视图'],
                          ['dense', 'panel', '紧凑视图'],
                        ] as const
                      ).map(([mode, icon, label]) => (
                        <button
                          key={mode}
                          type="button"
                          className={`sort-view-btn ${viewMode === mode ? 'is-active' : ''}`}
                          title={label}
                          aria-label={label}
                          onClick={() => {
                            setViewMode(mode);
                            setSortOpen(false);
                          }}
                        >
                          <Icon name={icon} size={18} />
                        </button>
                      ))}
                    </div>
                    </div>,
                    document.body,
                  )}
              </div>
            </>
          )}
        </div>

        <div className={`library-rows view-${viewMode}`}>
          {entries.map((entry) =>
            entry.type === 'folder' ? (
              <div className="library-folder-group" key={entry.folder.id}>
                <button
                  type="button"
                  className="library-row library-folder-row"
                  aria-expanded={expandedFolders.includes(entry.folder.id)}
                  onClick={() => toggleFolder(entry.folder.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setFolderMenu({ folder: entry.folder, x: event.clientX, y: event.clientY });
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const playlistId = event.dataTransfer.getData('text/plain');
                    if (playlistId) onAssignPlaylist(entry.folder.id, playlistId);
                  }}
                >
                  <span className="folder-tile">
                    <Icon name="folder" size={22} />
                  </span>
                  <span className="side-cloud-text">
                    <span className="side-cloud-title">{entry.folder.name}</span>
                    <span className="side-cloud-sub">{entry.folder.children.length} 个歌单</span>
                  </span>
                  <span
                    className={`folder-chevron ${expandedFolders.includes(entry.folder.id) ? 'is-open' : ''}`}
                  >
                    <Icon name="chevronDown" size={16} />
                  </span>
                </button>
                {expandedFolders.includes(entry.folder.id) &&
                  entry.folder.children.map((item) => (
                    <div className="library-folder-child" key={item.key}>
                      {renderRow(item)}
                    </div>
                  ))}
              </div>
            ) : (
              renderRow(entry.item)
            ),
          )}
          {entries.length === 0 && (
            <div className="library-empty">
              {query
                ? '没有找到内容'
                : netease.loggedIn
                  ? '音乐库还是空的'
                  : '登录后同步歌单、专辑、艺人和播客'}
            </div>
          )}
        </div>

        {netease.myMusicLoading && <div className="side-cloud-loading">加载中…</div>}

        {createAnchor && createTrigger && (
          <CreateMenu anchor={createAnchor} trigger={createTrigger} onPick={pickCreate} onClose={closeCreate} />
        )}
        {itemMenu &&
          createPortal(
            <div
              className="context-menu sidebar-item-menu"
              role="menu"
              style={{
                left: Math.max(8, Math.min(itemMenu.x, window.innerWidth - 272)),
                top: Math.max(8, Math.min(itemMenu.y, window.innerHeight - 352)),
              }}
            >
              {itemMenu.item.kind === 'podcast' ? (
                <>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    onClick={() => void unfollowPodcast(itemMenu.item)}
                  >
                    <Icon name="x" size={15} />
                    <span>取消关注</span>
                  </button>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    onClick={() => togglePin(itemMenu.item)}
                  >
                    <Icon name="pin" size={15} />
                    <span>{pins.includes(itemMenu.item.key) ? '取消置顶播客' : '置顶播客'}</span>
                  </button>
                  <div
                    className="cm-row"
                    onMouseEnter={() => setMenuSub('share')}
                    onMouseLeave={() => setMenuSub(null)}
                  >
                    <button
                      type="button"
                      className="cm-item"
                      role="menuitem"
                      aria-haspopup="menu"
                      onClick={() => setMenuSub((value) => (value === 'share' ? null : 'share'))}
                    >
                      <Icon name="share" size={15} />
                      <span>分享</span>
                      <Icon name="chevronRight" size={14} className="cm-arrow" />
                    </button>
                    {menuSub === 'share' && (
                      <div className="submenu sidebar-item-submenu">
                        <button
                          type="button"
                          className="submenu-item"
                          onClick={() => void sharePodcast(itemMenu.item)}
                        >
                          <Icon name="link" size={15} />
                          <span>复制播客链接</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : itemMenu.item.kind === 'artist' ? (
                <>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    onClick={() => void unfollowArtist(itemMenu.item)}
                  >
                    <Icon name="x" size={15} />
                    <span>取消关注</span>
                  </button>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    onClick={() => blockArtist(itemMenu.item)}
                  >
                    <Icon name="block" size={15} />
                    <span>不要播放此艺人的歌曲</span>
                  </button>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    onClick={() => togglePin(itemMenu.item)}
                  >
                    <Icon name="pin" size={15} />
                    <span>{pins.includes(itemMenu.item.key) ? '取消置顶艺人' : '置顶艺人'}</span>
                  </button>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    onClick={() => void startArtistRadio(itemMenu.item)}
                  >
                    <Icon name="radio" size={15} />
                    <span>转至艺人电台</span>
                  </button>
                  <button type="button" className="cm-item" role="menuitem" onClick={reportArtist}>
                    <Icon name="alert" size={15} />
                    <span>举报</span>
                    <Icon name="link" size={14} className="cm-arrow" />
                  </button>
                  <div
                    className="cm-row"
                    onMouseEnter={() => setMenuSub('share')}
                    onMouseLeave={() => setMenuSub(null)}
                  >
                    <button
                      type="button"
                      className="cm-item"
                      role="menuitem"
                      aria-haspopup="menu"
                      onClick={() => setMenuSub((value) => (value === 'share' ? null : 'share'))}
                    >
                      <Icon name="share" size={15} />
                      <span>分享</span>
                      <Icon name="chevronRight" size={14} className="cm-arrow" />
                    </button>
                    {menuSub === 'share' && (
                      <div className="submenu sidebar-item-submenu">
                        <button
                          type="button"
                          className="submenu-item"
                          onClick={() => void shareArtist(itemMenu.item)}
                        >
                          <Icon name="link" size={15} />
                          <span>复制艺人链接</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    onClick={() => void removeAlbum(itemMenu.item)}
                  >
                    <Icon name="check" size={15} className="cm-success" />
                    <span>从音乐库中删除</span>
                  </button>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    onClick={() => void addAlbumToQueue(itemMenu.item)}
                  >
                    <Icon name="queue" size={15} />
                    <span>加入播放队列</span>
                  </button>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    onClick={() => togglePin(itemMenu.item)}
                  >
                    <Icon name="pin" size={15} />
                    <span>{pins.includes(itemMenu.item.key) ? '取消置顶专辑' : '置顶专辑'}</span>
                  </button>
                  <div
                    className="cm-row"
                    onMouseEnter={() => setMenuSub('playlists')}
                    onMouseLeave={() => setMenuSub(null)}
                  >
                    <button
                      type="button"
                      className="cm-item"
                      role="menuitem"
                      aria-haspopup="menu"
                      onClick={() => setMenuSub((value) => (value === 'playlists' ? null : 'playlists'))}
                    >
                      <Icon name="plus" size={15} />
                      <span>加入歌单</span>
                      <Icon name="chevronRight" size={14} className="cm-arrow" />
                    </button>
                    {menuSub === 'playlists' && (
                      <div className="submenu sidebar-item-submenu">
                        <div className="submenu-head">添加到</div>
                        {menuPlaylists.map((playlist) => (
                          <button
                            key={playlist.id}
                            type="button"
                            className="submenu-item"
                            onClick={() => void addAlbumToPlaylist(itemMenu.item, playlist.id)}
                          >
                            <Cover
                              hue={playlist.hue}
                              variant={playlist.variant}
                              label={playlist.name}
                              src={playlist.coverUrl}
                              className="submenu-cover"
                            />
                            <span>{playlist.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="cm-item"
                    role="menuitem"
                    disabled
                    title="当前版本不支持下载"
                  >
                    <Icon name="download" size={15} />
                    <span>下载</span>
                  </button>
                  <div
                    className="cm-row"
                    onMouseEnter={() => setMenuSub('share')}
                    onMouseLeave={() => setMenuSub(null)}
                  >
                    <button
                      type="button"
                      className="cm-item"
                      role="menuitem"
                      aria-haspopup="menu"
                      onClick={() => setMenuSub((value) => (value === 'share' ? null : 'share'))}
                    >
                      <Icon name="share" size={15} />
                      <span>分享</span>
                      <Icon name="chevronRight" size={14} className="cm-arrow" />
                    </button>
                    {menuSub === 'share' && (
                      <div className="submenu sidebar-item-submenu">
                        <button
                          type="button"
                          className="submenu-item"
                          onClick={() => void shareAlbum(itemMenu.item)}
                        >
                          <Icon name="link" size={15} />
                          <span>复制专辑链接</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>,
            document.body,
          )}
        {tip && <RailTooltip text={tip.text} rect={tip.rect} />}
        {folderMenu &&
          createPortal(
            <div className="context-menu sidebar-folder-menu" style={{ left: folderMenu.x, top: folderMenu.y }} role="menu">
              <button
                type="button"
                className="cm-item"
                role="menuitem"
                onClick={() => {
                  onRenameFolder(folderMenu.folder.id);
                  setFolderMenu(null);
                }}
              >
                <Icon name="note" size={15} />
                <span>重命名文件夹</span>
              </button>
              <button
                type="button"
                className="cm-item is-danger"
                role="menuitem"
                onClick={() => {
                  onDeleteFolder(folderMenu.folder.id);
                  setFolderMenu(null);
                }}
              >
                <Icon name="trash" size={15} />
                <span>删除文件夹</span>
              </button>
            </div>,
            document.body,
          )}
      </section>
    </aside>
  );
}
