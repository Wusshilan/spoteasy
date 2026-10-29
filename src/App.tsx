import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Sidebar, type LibraryFolder } from './components/Sidebar';
import type { CreateKind } from './components/CreateMenu';
import { Topbar } from './components/Topbar';
import { HomeView } from './components/HomeView';
import { PlaylistView } from './components/PlaylistView';
import { SearchView } from './components/SearchView';
import { LocalView } from './components/LocalView';
import { SettingsView } from './components/SettingsView';
import { CollectionView } from './components/CollectionView';
import { CloudCollectionView } from './components/CloudCollectionView';
import { CloudArtistAlbumsView } from './components/CloudArtistAlbumsView';
import { CloudPersonalView } from './components/CloudPersonalView';
import { CloudPlaylistView } from './components/CloudPlaylistView';
import { PodcastView } from './components/PodcastView';
import { MvView } from './components/MvView';
import { SectionView } from './components/SectionView';
import { BrowseView } from './components/BrowseView';
import { FeedView } from './components/FeedView';
import { FriendFeedView } from './components/FriendFeedView';
import { LibraryView } from './components/LibraryView';
import { NowPlaying, NowPlayingEmpty, NowPlayingRail } from './components/NowPlaying';
import { NowPlayingFull } from './components/NowPlayingFull';
import { LyricsFullView } from './components/LyricsFullView';
import { QueueView } from './components/QueueView';
import { MiniPlayerBridge } from './components/MiniPlayerBridge';
import { PlayerBar } from './components/PlayerBar';
import { ContextMenu } from './components/ContextMenu';
import { EditTrackDialog } from './components/EditTrackDialog';
import { LoginDialog } from './components/LoginDialog';
import { ProfileDialog } from './components/ProfileDialog';
import { SessionBanner } from './components/SessionBanner';
import { Toasts } from './components/Toasts';
import { getTrack, playlists as seedPlaylists, type Playlist } from './data/mock';
import { usePlayer } from './state/player';
import { useNetease } from './state/netease';
import { useLibrary } from './state/library';
import { loadCustomLibrary, saveCustomLibrary } from './state/libraryStore';
import { useUi, type PanelTab } from './state/ui';
import { parseHash, parseHashExtras, routeHash, type Route } from './routing';

const panelTabs: PanelTab[] = ['lyrics', 'queue'];

function initialRoute(): Route {
  return parseHash();
}

export default function App() {
  const player = usePlayer();
  const netease = useNetease();
  const library = useLibrary();
  const ui = useUi();
  const demoMode = useRef(parseHashExtras().mock === '1').current;
  const demoNp = useRef(parseHashExtras().np ?? '').current;
  const [navState, setNavState] = useState(() => ({ list: [initialRoute()], i: 0 }));
  const [initialLibrary] = useState(() => (demoMode ? { playlists: [...seedPlaylists], folders: [] } : loadCustomLibrary()));
  const [lists, setLists] = useState<Playlist[]>(() => initialLibrary.playlists);
  const [folders, setFolders] = useState<LibraryFolder[]>(() => initialLibrary.folders);
  const [collapsed, setCollapsed] = useState(false);
  const [demo, setDemo] = useState<{ lib?: string; tip?: string; np?: string; lyrics?: string }>({});
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sidebarW, setSidebarW] = useState(() => (window.innerWidth <= 1180 ? 248 : 280));
  const [npW, setNpW] = useState(() => (window.innerWidth <= 1180 ? 316 : 340));

  const startResize = (edge: 'left' | 'right') => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = edge === 'left' ? sidebarW : npW;
    const onMove = (move: PointerEvent) => {
      const delta = move.clientX - startX;
      if (edge === 'left') {
        const maxWidth = Math.min(360, Math.max(220, window.innerWidth - npW - 480 - 32));
        setSidebarW(Math.min(maxWidth, Math.max(220, startWidth + delta)));
      } else {
        const maxWidth = Math.min(460, Math.max(280, window.innerWidth - sidebarW - 480 - 32));
        setNpW(Math.min(maxWidth, Math.max(280, startWidth - delta)));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('is-resizing');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    document.body.classList.add('is-resizing');
  };

  const route = navState.list[navState.i];

  useEffect(() => {
    // 窄窗口下右栏默认收起，避免一进来就挡住主内容（需要时可从底栏再打开）。
    if (window.innerWidth < 1080) ui.setPanelOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!player.track) {
      ui.setNpFull(false);
      ui.setLyricsFull(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.track]);

  useEffect(() => {
    const extras = parseHashExtras();
    if (extras.panel === 'off') {
      ui.setPanelOpen(false);
    } else if (extras.panel && panelTabs.includes(extras.panel as PanelTab)) {
      ui.setPanelTab(extras.panel as PanelTab);
      ui.setPanelOpen(true);
    }
    if (extras.accent === 'red' || extras.accent === 'green') {
      ui.setAccent(extras.accent);
    }
    // 截图专用：?menu=1 时自动展开一首歌的右键菜单
    if (extras.menu === '1') {
      window.setTimeout(() => ui.openMenu('t1', 620, 300), 400);
    }
    if (extras.collapsed === '1') setCollapsed(true);
    if (extras.lib || extras.tip || extras.np || extras.lyrics) {
      setDemo({
        lib: extras.lib ?? undefined,
        tip: extras.tip ?? undefined,
        np: extras.np ?? undefined,
        lyrics: extras.lyrics ?? undefined,
      });
    }
    if (extras.track) {
      const track = getTrack(extras.track);
      if (track) {
        const demoPlaylist = seedPlaylists.find((playlist) => playlist.id === 'p1') ?? seedPlaylists[0];
        const order = [track.id, ...demoPlaylist.tracks.filter((id) => id !== track.id)];
        player.play(track.id, order, demoPlaylist.name);
        if (extras.panel !== 'off') ui.setPanelOpen(true);
      }
    }
    if (extras.full === '1') ui.setNpFull(true);
    if (extras.view === 'lyrics') ui.setLyricsFull(true);
    else if (extras.view === 'queue') {
      ui.setPanelView('queue');
      ui.setPanelOpen(true);
    } else if (extras.view === 'full') ui.setNpFull(true);
    if (extras.overlay === '1') {
      window.setTimeout(() => ui.setSearchOpen(true), 300);
    }
    // 仅用于截图/深链的初始状态
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.history.replaceState(null, '', routeHash(route));
    } catch {
      /* file:// 下某些环境会拒绝，忽略 */
    }
  }, [route]);

  const navigate = useCallback((next: Route) => {
    ui.setNpFull(false);
    ui.setLyricsFull(false);
    setNavState((s) => {
      const list = [...s.list.slice(0, s.i + 1), next];
      // 相同路由不重复入栈
      if (s.list[s.i] && routeHash(s.list[s.i]) === routeHash(next)) return s;
      return { list, i: list.length - 1 };
    });
    setScrolled(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [ui]);

  const back = useCallback(() => {
    ui.setNpFull(false);
    ui.setLyricsFull(false);
    setNavState((s) => (s.i > 0 ? { ...s, i: s.i - 1 } : s));
    scrollRef.current?.scrollTo({ top: 0 });
  }, [ui]);

  const forward = useCallback(() => {
    ui.setNpFull(false);
    ui.setLyricsFull(false);
    setNavState((s) => (s.i < s.list.length - 1 ? { ...s, i: s.i + 1 } : s));
    scrollRef.current?.scrollTo({ top: 0 });
  }, [ui]);

  const createPlaylist = useCallback(() => {
    const n = lists.filter((p) => p.id.startsWith('new-')).length + 1;
    const fresh: Playlist = {
      id: `new-${Date.now()}`,
      name: `新建歌单 #${n}`,
      desc: '还没有添加歌曲，去搜索里找几首吧。',
      owner: netease.loggedIn ? netease.nickname : '本地用户',
      createdAt: Date.now(),
      hue: Math.floor(Math.random() * 360),
      variant: Math.floor(Math.random() * 8),
      tracks: [],
    };
    setLists((list) => [fresh, ...list]);
    navigate({ name: 'playlist', id: fresh.id });
    ui.toast(`已创建「${fresh.name}」`);
  }, [lists, navigate, ui, netease.loggedIn, netease.nickname]);

  const createBlend = useCallback(() => {
    const likedLocal = library.tracks.filter((track) => player.liked.has(track.id));
    const pool = likedLocal.length ? likedLocal : library.tracks;
    if (!pool.length) {
      ui.toast('本地音乐库还是空的，先到本地音乐里选择文件夹');
      return;
    }
    const n = lists.filter((list) => list.id.startsWith('blend-')).length + 1;
    const fresh: Playlist = {
      id: `blend-${Date.now()}`,
      name: `本地合辑 #${n}`,
      desc: '从本地音乐库和本地点赞里生成的合辑，可以继续添加或移除歌曲。',
      owner: netease.loggedIn ? netease.nickname : '本地用户',
      createdAt: Date.now(),
      hue: 146,
      variant: 2,
      tracks: pool.slice(0, 20).map((track) => track.id),
    };
    setLists((list) => [fresh, ...list]);
    navigate({ name: 'playlist', id: fresh.id });
    ui.toast(`已创建「${fresh.name}」`);
  }, [library.tracks, lists, navigate, netease.loggedIn, netease.nickname, player.liked, ui]);

  const createFolder = useCallback(() => {
    const n = folders.length + 1;
    const fresh: LibraryFolder = { id: `folder-${Date.now()}`, name: `新建文件夹 ${n}`, playlistIds: [], createdAt: Date.now() };
    setFolders((list) => [...list, fresh]);
    ui.toast(`已创建「${fresh.name}」`);
  }, [folders.length, ui]);

  const saveQueueAsPlaylist = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const n = lists.filter((p) => p.id.startsWith('queue-')).length + 1;
      const now = new Date();
      const fresh: Playlist = {
        id: `queue-${Date.now()}`,
        name: `播放队列 ${now.getMonth() + 1}-${now.getDate()} #${n}`,
        desc: '从播放队列保存的歌单。',
        owner: netease.loggedIn ? netease.nickname : '本地用户',
        createdAt: Date.now(),
        hue: Math.floor(Math.random() * 360),
        variant: Math.floor(Math.random() * 8),
        tracks: ids,
      };
      setLists((list) => [fresh, ...list]);
      navigate({ name: 'playlist', id: fresh.id });
      ui.toast(`队列已保存为「${fresh.name}」`);
    },
    [lists, navigate, netease.loggedIn, netease.nickname, ui],
  );

  const renamePlaylist = useCallback(
    (playlistId: string) => {
      const target = lists.find((playlist) => playlist.id === playlistId);
      if (!target) return;
      const next = window.prompt('重命名歌单', target.name)?.trim();
      if (!next || next === target.name) return;
      setLists((list) => list.map((playlist) => (playlist.id === playlistId ? { ...playlist, name: next } : playlist)));
      ui.toast(`已重命名为「${next}」`);
    },
    [lists, ui],
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => {
      const target = lists.find((playlist) => playlist.id === playlistId);
      if (!target) return;
      if (!window.confirm(`删除歌单「${target.name}」？歌单里的歌曲不会从音乐库删除。`)) return;
      setLists((list) => list.filter((playlist) => playlist.id !== playlistId));
      setFolders((list) => list.map((folder) => ({ ...folder, playlistIds: folder.playlistIds.filter((id) => id !== playlistId) })));
      if (route.name === 'playlist' && route.id === playlistId) navigate({ name: 'home' });
      ui.toast(`已删除「${target.name}」`);
    },
    [lists, navigate, route, ui],
  );

  const removeTrackFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      setLists((list) =>
        list.map((playlist) =>
          playlist.id === playlistId ? { ...playlist, tracks: playlist.tracks.filter((id) => id !== trackId) } : playlist,
        ),
      );
      ui.toast('已从歌单移除');
    },
    [ui],
  );

  const moveTrackInPlaylist = useCallback(
    (playlistId: string, from: number, to: number) => {
      setLists((list) =>
        list.map((playlist) => {
          if (playlist.id !== playlistId) return playlist;
          const tracks = [...playlist.tracks];
          if (from < 0 || from >= tracks.length || to < 0 || to >= tracks.length) return playlist;
          const [moved] = tracks.splice(from, 1);
          tracks.splice(to, 0, moved);
          return { ...playlist, tracks };
        }),
      );
    },
    [],
  );

  const addToPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      const local = lists.find((playlist) => playlist.id === playlistId);
      if (local) {
        setLists((list) =>
          list.map((playlist) =>
            playlist.id === playlistId && !playlist.tracks.includes(trackId)
              ? { ...playlist, tracks: [...playlist.tracks, trackId] }
              : playlist,
          ),
        );
        ui.toast('已加入歌单');
        return;
      }
      const cloud = netease.myPlaylists.find((playlist) => playlist.id === playlistId);
      if (!cloud?.cloudId) {
        ui.toast('这个歌单暂时不可用');
        return;
      }
      try {
        const track = getTrack(trackId);
        if (!track.cloudId) {
          ui.toast('本地歌曲不能加入云歌单');
          return;
        }
        void window.spoteasy?.netease
          ?.playlistTrackAdd(cloud.cloudId, [track.cloudId])
          .then((result) => {
            if (!result.ok) throw new Error(result.error);
            ui.toast('已加入云歌单');
            netease.refreshMyMusic();
          })
          .catch(() => ui.toast('操作失败'));
      } catch {
        ui.toast('操作失败');
      }
    },
    [lists, netease, ui],
  );

  const assignPlaylistToFolder = useCallback(
    (folderId: string, playlistId: string) => {
      setFolders((list) =>
        list.map((folder) => {
          const ids = folder.playlistIds.filter((id) => id !== playlistId);
          return {
            ...folder,
            playlistIds: folder.id === folderId ? [...ids, playlistId] : ids,
          };
        }),
      );
      ui.toast('已移入文件夹');
    },
    [ui],
  );

  const renameFolder = useCallback(
    (folderId: string) => {
      const target = folders.find((folder) => folder.id === folderId);
      if (!target) return;
      const next = window.prompt('重命名文件夹', target.name)?.trim();
      if (!next || next === target.name) return;
      setFolders((list) => list.map((folder) => (folder.id === folderId ? { ...folder, name: next } : folder)));
      ui.toast(`已重命名为「${next}」`);
    },
    [folders, ui],
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const target = folders.find((folder) => folder.id === folderId);
      if (!target) return;
      if (!window.confirm(`删除文件夹「${target.name}」？里面的歌单会回到音乐库，不会被删除。`)) return;
      setFolders((list) => list.filter((folder) => folder.id !== folderId));
      ui.toast(`已删除「${target.name}」`);
    },
    [folders, ui],
  );

  const create = useCallback(
    (kind: CreateKind) => {
      if (kind === 'playlist') {
        createPlaylist();
        return;
      }
      if (kind === 'blend') {
        createBlend();
        return;
      }
      createFolder();
    },
    [createBlend, createFolder, createPlaylist],
  );

  const currentPlaylist = useMemo<Playlist | null>(() => {
    if (route.name !== 'playlist') return null;
    if (route.id === 'liked') {
      return {
        id: 'liked',
        name: '我喜欢的音乐',
        desc: '所有你点过红心的歌，会一直留在这里。',
        owner: netease.loggedIn ? netease.nickname : '本地喜欢',
        hue: 340,
        variant: 6,
        tracks: [...player.liked],
        kind: 'liked',
      };
    }
    return lists.find((p) => p.id === route.id) ?? null;
  }, [route, lists, player.liked, netease.loggedIn, netease.nickname]);

  useEffect(() => {
    if (demoMode) return;
    saveCustomLibrary(lists, folders);
  }, [demoMode, folders, lists]);

  useEffect(() => {
    try {
      localStorage.removeItem('spoteasy.eventLikes');
    } catch {
      /* ignore */
    }
  }, []);

  const pauseRef = useRef(player.pause);
  useEffect(() => {
    pauseRef.current = player.pause;
  }, [player.pause]);

  useEffect(() => {
    if (!ui.sleepAt) return;
    const delay = Math.max(0, ui.sleepAt - Date.now());
    const timer = window.setTimeout(() => {
      pauseRef.current();
      ui.setSleepAt(null);
      ui.toast('睡眠定时器结束，已暂停播放');
    }, delay);
    return () => window.clearTimeout(timer);
  }, [ui.sleepAt, ui]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

      if (e.key === 'Escape') {
        ui.setSearchOpen(false);
        ui.closeMenu();
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        ui.setSearchOpen(true);
        return;
      }

      if (typing) return;

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        forward();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        player.toggle();
      } else if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        player.next();
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        player.prev();
      } else if (e.key.toLowerCase() === 'f' && player.track) {
        e.preventDefault();
        ui.setNpFull(!ui.npFull);
      } else if (e.key.toLowerCase() === 'l' && player.track) {
        e.preventDefault();
        ui.setLyricsFull(!ui.lyricsFull);
        ui.setNpFull(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.ctrlKey) player.next();
        else player.seek(Math.min(player.progress + 5, player.track?.duration ?? 0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.ctrlKey) player.prev();
        else player.seek(Math.max(player.progress - 5, 0));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player, ui, back, forward]);

  const content = (() => {
    if (route.name === 'home') return <HomeView navigate={navigate} />;
    if (route.name === 'search') {
      return <SearchView key={route.q ?? '__empty'} initialQuery={route.q} localPlaylists={lists} navigate={navigate} />;
    }
    if (route.name === 'local') return <LocalView navigate={navigate} />;
    if (route.name === 'settings') return <SettingsView />;
    if (route.name === 'artist') return <CollectionView kind="artist" name={route.id} navigate={navigate} />;
    if (route.name === 'album') return <CollectionView kind="album" name={route.id} navigate={navigate} />;
    if (route.name === 'cloudArtist') {
      return <CloudCollectionView kind="artist" cloudId={Number(route.id)} navigate={navigate} />;
    }
    if (route.name === 'cloudArtistAlbums') {
      return <CloudArtistAlbumsView artistId={Number(route.id)} navigate={navigate} />;
    }
    if (route.name === 'podcast') return <PodcastView podcastId={Number(route.id)} navigate={navigate} />;
    if (route.name === 'cloudDaily' || route.name === 'cloudLiked') {
      return <CloudPersonalView kind={route.name === 'cloudDaily' ? 'daily' : 'liked'} navigate={navigate} />;
    }
    if (route.name === 'mv') return <MvView mvId={Number(route.id)} navigate={navigate} />;
    if (route.name === 'section') return <SectionView kind={route.id} navigate={navigate} />;
    if (route.name === 'browse') return <BrowseView navigate={navigate} />;
    if (route.name === 'whatsNew') return <FeedView mode="whatsNew" navigate={navigate} demo={demoMode} />;
    if (route.name === 'following') return <FriendFeedView navigate={navigate} demo={demoMode} />;
    if (route.name === 'library') {
      return (
        <LibraryView
          navigate={navigate}
          onCreate={create}
          demoPlaylists={demoMode ? lists : undefined}
          localPlaylists={lists}
        />
      );
    }
    if (route.name === 'cloudAlbum') {
      return <CloudCollectionView kind="album" cloudId={Number(route.id)} navigate={navigate} />;
    }
    if (route.name === 'playlist' && route.id.startsWith('ne-pl-')) {
      return <CloudPlaylistView cloudId={Number(route.id.slice('ne-pl-'.length))} navigate={navigate} />;
    }
    if (currentPlaylist) {
      const isLocalCustom = lists.some((playlist) => playlist.id === currentPlaylist.id);
      return (
        <PlaylistView
          playlist={currentPlaylist}
          navigate={navigate}
          manage={
            isLocalCustom
              ? {
                  onRename: () => renamePlaylist(currentPlaylist.id),
                  onDelete: () => deletePlaylist(currentPlaylist.id),
                  onRemoveTrack: (trackId) => removeTrackFromPlaylist(currentPlaylist.id, trackId),
                  onMoveTrack: (from, to) => moveTrackInPlaylist(currentPlaylist.id, from, to),
                }
              : undefined
          }
        />
      );
    }
    return (
      <div className="empty-state">
        <div className="empty-icon">404</div>
        <h2>找不到这个歌单</h2>
        <p>它可能被删了，也可能还没同步下来。</p>
        <button type="button" className="primary-btn" onClick={() => navigate({ name: 'home' })}>
          回到首页
        </button>
      </div>
    );
  })();

  return (
    <div className="app" data-scrolled={scrolled ? 'true' : 'false'}>
      <Topbar
        route={route}
        canBack={navState.i > 0}
        canForward={navState.i < navState.list.length - 1}
        onBack={back}
        onForward={forward}
        onCollapseLibrary={() => setCollapsed(true)}
        navigate={navigate}
      />

      <div
        className="app-body"
        data-panel-open={ui.panelOpen ? 'true' : 'false'}
        style={
          {
            ['--sidebar-w' as string]: `${sidebarW}px`,
            ['--np-w' as string]: `${npW}px`,
          } as CSSProperties
        }
      >
        {ui.npFull && player.track ? (
          <NowPlayingFull navigate={navigate} />
        ) : ui.lyricsFull && player.track ? (
          <LyricsFullView navigate={navigate} />
        ) : (
          <>
            {route.name !== 'library' && (
              <>
                <Sidebar
                  playlists={lists}
                  folders={folders}
                  collapsed={collapsed}
                  onToggleCollapsed={() => setCollapsed((v) => !v)}
                  onOpenLibrary={() => navigate({ name: 'library' })}
                  navigate={navigate}
                  onCreate={create}
                  onAssignPlaylist={assignPlaylistToFolder}
                  onRenameFolder={renameFolder}
                  onDeleteFolder={deleteFolder}
                  onAddToPlaylist={addToPlaylist}
                  forceHover={demo.lib === 'hover' || demo.lib === 'create'}
                  forceCreate={demo.lib === 'create'}
                  forceTip={demo.tip === '1'}
                  demoLiked={demoMode}
                />
                <div
                  className={`splitter ${collapsed ? 'is-disabled' : ''}`}
                  onPointerDown={collapsed ? undefined : startResize('left')}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="调整音乐库宽度"
                />
              </>
            )}

            <main
              className={`main-shell ${route.name === 'home' ? 'is-home' : ''}`}
              data-scrolled={scrolled ? 'true' : 'false'}
            >
              <div
                className="main-scroll"
                ref={scrollRef}
                onScroll={(e) => {
                  const next = e.currentTarget.scrollTop > 8;
                  setScrolled((prev) => (prev === next ? prev : next));
                }}
              >
                {content}
              </div>
            </main>

            <div
              className={`splitter ${ui.panelOpen ? '' : 'is-disabled'}`}
              onPointerDown={ui.panelOpen ? startResize('right') : undefined}
              role="separator"
              aria-orientation="vertical"
              aria-label="调整播放视图宽度"
            />
            <div className={`np-slot ${ui.panelOpen ? 'is-open' : 'is-collapsed'} ${demoNp === 'peek' ? 'is-demo-peek' : ''}`}>
              {ui.panelOpen ? (
                ui.panelView === 'queue' ? (
                  <QueueView onSaveQueue={saveQueueAsPlaylist} />
                ) : player.track ? (
                  <NowPlaying
                    navigate={navigate}
                    demoHover={demo.np === 'hover'}
                    forceLyrics={demo.lyrics === '1'}
                  />
                ) : (
                  <NowPlayingEmpty />
                )
              ) : (
                <NowPlayingRail onOpen={() => ui.setPanelOpen(true)} />
              )}
            </div>
          </>
        )}
      </div>

      <PlayerBar navigate={navigate} />
      <MiniPlayerBridge />
      <ContextMenu playlists={[...lists, ...netease.myPlaylists]} navigate={navigate} onAddToPlaylist={addToPlaylist} />
      <EditTrackDialog />
      <SessionBanner />
      <LoginDialog />
      <ProfileDialog />
      <Toasts />
    </div>
  );
}
