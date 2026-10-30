import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Avatar, Cover } from './CoverArt';
import { Icon } from './Icons';
import { TrackList } from './TrackList';
import { formatCount, getTrack, playlistDuration, type Playlist } from '../data/mock';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

interface LocalPlaylistActions {
  folders: string[];
  scanning: boolean;
  progress: { done: number; total: number } | null;
  onChooseFolder(): void;
  onRescan(): void;
}

interface PlaylistLoadMore {
  hasMore: boolean;
  loading: boolean;
  loaded: number;
  total: number;
  onLoadMore(): void;
}

interface PlaylistManage {
  onRename?(): void;
  onDelete?(): void;
  onRemoveTrack?(id: string): void;
  onMoveTrack?(from: number, to: number): void;
  onShare?(): void;
  subscribed?: boolean;
  onToggleSubscribe?(): void;
}

interface PlaylistViewProps {
  playlist: Playlist;
  navigate(route: Route): void;
  local?: LocalPlaylistActions;
  loadMore?: PlaylistLoadMore;
  manage?: PlaylistManage;
}

export function PlaylistView({ playlist, navigate, local, loadMore, manage }: PlaylistViewProps) {
  const player = usePlayer();
  const { toast } = useUi();
  const infoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // 歌单名长短差异很大：从 36px 开始按可用宽度收缩，尽量保持一行；
  // 极窄时退回两行，避免「通勤路上的 / 45 分钟」这种难看断行。
  useLayoutEffect(() => {
    const el = titleRef.current;
    const box = infoRef.current;
    if (!el || !box) return;

    const fit = () => {
      el.style.whiteSpace = 'nowrap';
      let size = 36;
      el.style.fontSize = `${size}px`;
      while (size > 18 && el.scrollWidth > el.clientWidth + 1) {
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
      if (el.scrollWidth > el.clientWidth + 1) {
        el.style.whiteSpace = 'normal';
        el.style.fontSize = '22px';
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [playlist.id, playlist.name]);

  const [coverHue, setCoverHue] = useState<number | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    setCoverHue(null);
    if (!playlist.coverUrl) return;
    let alive = true;
    window.spoteasy?.netease
      ?.coverColor(playlist.coverUrl)
      .then((result) => {
        if (alive && typeof result?.hue === 'number') setCoverHue(result.hue);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [playlist.coverUrl]);

  const heroHue = coverHue ?? playlist.hue;
  const neutralCover = Boolean(playlist.coverUrl) && coverHue === null;

  const isLiked = playlist.kind === 'liked';
  const isDaily = playlist.kind === 'daily';
  const trackCount = playlist.trackCount ?? playlist.tracks.length;
  const totalPlays = playlist.playCount ?? playlist.tracks.reduce((sum, id) => sum + getTrack(id).plays, 0);
  const totalDuration = playlist.tracks.reduce((sum, id) => sum + getTrack(id).duration, 0);
  const scanPercent =
    local?.progress && local.progress.total > 0
      ? Math.round((local.progress.done / local.progress.total) * 100)
      : 0;

  const playAll = () => {
    if (!playlist.tracks.length) {
      toast('先加点歌吧');
      return;
    }
    player.play(playlist.tracks[0], playlist.tracks, playlist.name);
  };

  const shuffleAll = () => {
    if (!playlist.tracks.length) return;
    if (!player.shuffle) player.toggleShuffle();
    const pick = playlist.tracks[Math.floor(Math.random() * playlist.tracks.length)];
    player.play(pick, playlist.tracks, playlist.name);
    toast('已打乱播放顺序');
  };

  return (
    <div
      className="playlist-page"
      style={{
        ['--hero-hue' as string]: neutralCover ? 0 : heroHue,
        ['--hero-sat' as string]: neutralCover ? '0%' : '42%',
        ['--hero-sat2' as string]: neutralCover ? '0%' : '30%',
      }}
    >
      <div className="playlist-hero">
        <div className={`hero-cover ${isLiked ? 'is-liked' : ''} ${local ? 'local-hero' : ''}`}>
          {local ? (
            <Icon name="disc" size={72} />
          ) : (
            <Cover hue={playlist.hue} variant={playlist.variant} label={playlist.name} src={playlist.coverUrl} />
          )}
          {isLiked && (
            <span className="liked-mark">
              <Icon name="heartFill" size={28} />
            </span>
          )}
        </div>

        <div className="hero-info" ref={infoRef}>
          <span className="hero-eyebrow">{local ? '本地' : isDaily ? '为你定制' : '歌单'}</span>
          <h1 className="hero-title" ref={titleRef}>
            {playlist.name}
          </h1>
          <p className="hero-desc">{playlist.desc}</p>
          <div className="hero-meta">
            <span className="hero-owner">
              <Avatar
                hue={playlist.hue}
                label={playlist.owner || '网易云音乐'}
                size={22}
                src={playlist.ownerAvatarUrl}
              />
              {playlist.owner || '网易云音乐'}
            </span>
            <span>·</span>
            <span>{trackCount} 首歌</span>
            {!local && !playlist.hidePlays && (
              <>
                <span>·</span>
                <span>{formatCount(totalPlays)} 次播放</span>
              </>
            )}
            {playlist.tracks.length > 0 && (
              <>
                <span>·</span>
                <span>{playlistDuration(playlist)}</span>
              </>
            )}
            {local && local.folders.length > 0 && (
              <>
                <span>·</span>
                <span>{local.folders.length} 个文件夹</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="playlist-actions">
        <button
          type="button"
          className="big-play"
          onClick={playAll}
          aria-label="播放"
          disabled={playlist.tracks.length === 0}
        >
          <Icon name="play" size={24} />
        </button>
        <button
          type="button"
          className={`round-btn ${player.shuffle ? 'is-on' : ''}`}
          onClick={shuffleAll}
          title="随机播放"
          disabled={playlist.tracks.length === 0}
        >
          <Icon name="shuffle" size={22} />
        </button>

        {manage && (
          <div className="playlist-manage">
            <button
              type="button"
              className={`round-btn ${manageOpen ? 'is-on' : ''}`}
              onClick={() => setManageOpen((value) => !value)}
              aria-label="歌单更多操作"
              title="更多操作"
            >
              <Icon name="more" size={20} />
            </button>
            {manageOpen && (
              <div className="playlist-manage-menu" role="menu">
                {manage.onRename && (
                  <button type="button" className="cm-item" role="menuitem" onClick={() => { setManageOpen(false); manage.onRename?.(); }}>
                    <Icon name="note" size={15} />
                    <span>重命名歌单</span>
                  </button>
                )}
                {manage.onToggleSubscribe && (
                  <button type="button" className="cm-item" role="menuitem" onClick={() => { setManageOpen(false); manage.onToggleSubscribe?.(); }}>
                    <Icon name={manage.subscribed ? 'check' : 'plus'} size={15} />
                    <span>{manage.subscribed ? '取消收藏' : '收藏歌单'}</span>
                  </button>
                )}
                {manage.onShare && (
                  <button type="button" className="cm-item" role="menuitem" onClick={() => { setManageOpen(false); manage.onShare?.(); }}>
                    <Icon name="share" size={15} />
                    <span>分享歌单</span>
                  </button>
                )}
                {manage.onDelete && (
                  <button type="button" className="cm-item is-danger" role="menuitem" onClick={() => { setManageOpen(false); manage.onDelete?.(); }}>
                    <Icon name="trash" size={15} />
                    <span>删除歌单</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {local && (
          <>
            <div className="actions-spacer" />
            <button type="button" className="pill-btn" onClick={local.onChooseFolder}>
              <Icon name="plus" size={16} />
              选择文件夹
            </button>
            {local.folders.length > 0 && (
              <button type="button" className="pill-btn" onClick={local.onRescan} disabled={local.scanning}>
                <Icon name="repeat" size={16} />
                {local.scanning ? '扫描中…' : '重新扫描'}
              </button>
            )}
          </>
        )}
      </div>

      {local?.scanning && (
        <div className="scan-status">
          <div className="scan-bar">
            <span style={{ width: `${scanPercent}%` }} />
          </div>
          <span>
            正在扫描 {local.progress?.done ?? 0}/{local.progress?.total ?? '…'}
          </span>
        </div>
      )}

      {playlist.tracks.length > 0 ? (
        <div className="playlist-tracks">
          <TrackList
            ids={playlist.tracks}
            contextName={playlist.name}
            showAlbum
            showDate={!playlist.source}
            onRemove={manage?.onRemoveTrack}
            onMove={manage?.onMoveTrack}
          />
          {loadMore?.hasMore && (
            <button
              type="button"
              className="load-more-btn playlist-load-more"
              onClick={loadMore.onLoadMore}
              disabled={loadMore.loading}
            >
              {loadMore.loading
                ? '加载中…'
                : `加载更多歌曲（已加载 ${loadMore.loaded} / ${loadMore.total}）`}
            </button>
          )}
        </div>
      ) : local ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="disc" size={40} />
          </div>
          <h2>还没有本地音乐</h2>
          <p>选择音乐文件夹，Spoteasy 会递归扫描 MP3 / FLAC / M4A / WAV / OGG，并记住这个文件夹。</p>
          <button type="button" className="primary-btn" onClick={local.onChooseFolder}>
            选择音乐文件夹
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="note" size={40} />
          </div>
          <h2>这个歌单还空着</h2>
          <p>去搜索里找几首歌，或者把喜欢的歌拖进来。</p>
          <button type="button" className="primary-btn" onClick={() => navigate({ name: 'search' })}>
            去搜索
          </button>
        </div>
      )}

      {!local && (
        <div className="playlist-about">
          <h3>关于这个歌单</h3>
          <p>{playlist.desc}</p>
          <div className="about-meta">
            <span>
              更新于 {new Date().getMonth() + 1} 月 {new Date().getDate()} 日
            </span>
            <span>·</span>
            <span>{playlistDuration(playlist)} 总时长</span>
            <span>·</span>
            <span>共 {trackCount} 首</span>
          </div>
        </div>
      )}
    </div>
  );
}
