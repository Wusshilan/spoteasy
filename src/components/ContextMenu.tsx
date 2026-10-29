import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { getTrack, registerTracks, type Playlist } from '../data/mock';
import { usePlayer } from '../state/player';
import { useNetease } from '../state/netease';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

const sleepOptions = [5, 15, 30, 45, 60];

export function ContextMenu({
  playlists,
  navigate,
  onAddToPlaylist,
}: {
  playlists: Playlist[];
  navigate: (route: Route) => void;
  onAddToPlaylist?: (playlistId: string, trackId: string) => void;
}) {
  const player = usePlayer();
  const netease = useNetease();
  const { menu, closeMenu, toast, openEditor, sleepAt, setSleepAt } = useUi();
  const [subOpen, setSubOpen] = useState<'playlist' | 'sleep' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('blur', closeMenu);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('blur', closeMenu);
    };
  }, [menu, closeMenu]);

  useEffect(() => {
    setSubOpen(null);
  }, [menu]);

  if (!menu) return null;

  const track = getTrack(menu.trackId);
  const isCloud = track.source === 'netease' && Boolean(track.cloudId);
  const liked = isCloud
    ? netease.likedIds.has(track.cloudId as number)
    : player.liked.has(track.id);
  const toggleLike = () => {
    if (isCloud) {
      if (!netease.loggedIn) {
        toast('请先登录');
        return;
      }
      netease
        .toggleCloudLike(track.cloudId as number)
        .then((next) => toast(next ? '已添加到喜欢的音乐' : '已从喜欢中移除'))
        .catch(() => toast('操作失败'));
    } else {
      player.toggleLike(track.id);
    }
  };
  const width = 252;
  const height = 432;
  const x = Math.max(8, Math.min(menu.x, window.innerWidth - width - 8));
  const nearBottom = menu.y + height + 8 > window.innerHeight;
  const top = nearBottom ? menu.y - height : menu.y;
  const y = Math.max(8, Math.min(top, window.innerHeight - height - 8));
  const flipSubmenu = x + width + 244 > window.innerWidth;
  const artistTarget: Route =
    track.source === 'netease' && track.cloudArtistIds?.[0]
      ? { name: 'cloudArtist', id: String(track.cloudArtistIds[0]) }
      : { name: 'artist', id: track.artist };
  const albumTarget: Route =
    track.source === 'netease' && track.cloudAlbumId
      ? { name: 'cloudAlbum', id: String(track.cloudAlbumId) }
      : { name: 'album', id: track.album };

  const act = (fn: () => void) => () => {
    fn();
    closeMenu();
  };

  const addToPlaylist = (playlist: Playlist) => {
    registerTracks([track]);
    onAddToPlaylist?.(playlist.id, track.id);
    closeMenu();
  };

  const setSleepTimer = (minutes: number) => {
    setSleepAt(Date.now() + minutes * 60_000);
    toast(`将在 ${minutes} 分钟后暂停播放`);
    closeMenu();
  };

  return createPortal(
    <div className="context-menu" style={{ left: x, top: y }} ref={ref} role="menu">
      <div className="cm-row" onMouseEnter={() => setSubOpen('playlist')} onMouseLeave={() => setSubOpen(null)}>
        <button
          type="button"
          className="cm-item"
          onClick={() => setSubOpen((value) => (value === 'playlist' ? null : 'playlist'))}
        >
          <Icon name="plus" size={16} />
          <span>加入歌单</span>
          <Icon name="arrowRight" size={14} className="cm-arrow" />
        </button>
        {subOpen === 'playlist' && (
          <div className={`submenu ${flipSubmenu ? 'is-flipped' : ''}`}>
            <div className="submenu-head">添加到</div>
            {playlists.length === 0 && <div className="submenu-empty">还没有可用的歌单</div>}
            {playlists.map((playlist) => (
              <button
                type="button"
                key={playlist.id}
                className="submenu-item"
                onClick={() => addToPlaylist(playlist)}
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
        className={`cm-item ${liked ? 'is-liked' : ''}`}
        onClick={act(toggleLike)}
      >
        <Icon name={liked ? 'heartFill' : 'heart'} size={16} />
        <span>{liked ? '从「我喜欢的音乐」中删除' : '喜欢这首歌'}</span>
      </button>
      <button type="button" className="cm-item" onClick={act(() => player.addQueue(track.id))}>
        <Icon name="queue" size={16} />
        <span>加入播放队列</span>
      </button>

      <div className="cm-row" onMouseEnter={() => setSubOpen('sleep')} onMouseLeave={() => setSubOpen(null)}>
        <button
          type="button"
          className="cm-item"
          onClick={() => setSubOpen((value) => (value === 'sleep' ? null : 'sleep'))}
        >
          <Icon name="clock" size={16} />
          <span>睡眠定时器</span>
          <Icon name="arrowRight" size={14} className="cm-arrow" />
        </button>
        {subOpen === 'sleep' && (
          <div className={`submenu ${flipSubmenu ? 'is-flipped' : ''}`}>
            <div className="submenu-head">播放停止于</div>
            {sleepOptions.map((minutes) => (
              <button
                type="button"
                key={minutes}
                className="submenu-item"
                onClick={() => setSleepTimer(minutes)}
              >
                <Icon name="clock" size={16} />
                <span>{minutes} 分钟</span>
              </button>
            ))}
            {sleepAt && (
              <button
                type="button"
                className="submenu-item"
                onClick={() => {
                  setSleepAt(null);
                  toast('已取消睡眠定时器');
                  closeMenu();
                }}
              >
                <Icon name="x" size={16} />
                <span>取消睡眠定时器</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="cm-sep" />

      <button type="button" className="cm-item" onClick={act(() => navigate(artistTarget))}>
        <Icon name="user" size={16} />
        <span>转至艺人</span>
      </button>
      <button type="button" className="cm-item" onClick={act(() => navigate(albumTarget))}>
        <Icon name="disc" size={16} />
        <span>转至专辑</span>
      </button>
      <button
        type="button"
        className="cm-item"
        onClick={act(() => {
          const url = isCloud
            ? `https://music.163.com/song?id=${track.cloudId}`
            : `${track.title} — ${track.artist}`;
          navigator.clipboard?.writeText(url).catch(() => undefined);
          toast(isCloud ? '链接已复制' : '歌曲信息已复制');
        })}
      >
        <Icon name="share" size={16} />
        <span>分享</span>
      </button>

      <div className="cm-sep" />

      <button type="button" className="cm-item" onClick={act(() => player.play(track.id))}>
        <Icon name="play" size={16} />
        <span>立即播放</span>
      </button>
      <button type="button" className="cm-item" onClick={act(() => player.addNext(track.id))}>
        <Icon name="next" size={16} />
        <span>下一首播放</span>
      </button>

      {track.local && (
        <button type="button" className="cm-item" onClick={act(() => openEditor(track.id))}>
          <Icon name="note" size={16} />
          <span>编辑歌曲信息</span>
        </button>
      )}
    </div>,
    document.body,
  );
}
