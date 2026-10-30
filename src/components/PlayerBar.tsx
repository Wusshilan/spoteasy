import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { formatTime } from '../data/mock';
import { usePlayer } from '../state/player';
import { useNetease } from '../state/netease';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

function useRatioHandler(onRatio: (r: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onRatio(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
  };

  return {
    ref,
    handlers: {
      onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX);
      },
      onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
        if (dragging.current) update(e.clientX);
      },
      onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
        dragging.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      },
      onPointerCancel: () => {
        dragging.current = false;
      },
    },
  };
}

export function PlayerBar({ navigate }: { navigate: (route: Route) => void }) {
  const player = usePlayer();
  const netease = useNetease();
  const { panelOpen, setPanelOpen, panelView, setPanelView, lyricsFull, setLyricsFull, npFull, setNpFull, toast } =
    useUi();
  const [seekHover, setSeekHover] = useState<number | null>(null);
  const [miniOpen, setMiniOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const deviceRef = useRef<HTMLDivElement>(null);
  const track = player.track;
  const duration = track?.duration ?? 0;
  const pct = duration ? (player.progress / duration) * 100 : 0;

  const volumeIcon = player.volume === 0 ? 'mute' : player.volume < 0.5 ? 'volumeLow' : 'volume';
  const seekBar = useRatioHandler((r) => player.seek(r * duration));
  const volumeBar = useRatioHandler((r) => player.setVolume(r));
  const lastVolumeRef = useRef(player.volume > 0 ? player.volume : 0.72);

  useEffect(() => {
    if (player.volume > 0) lastVolumeRef.current = player.volume;
  }, [player.volume]);

  useEffect(() => {
    const unsubscribe = window.spoteasy?.mini?.onClosed?.(() => setMiniOpen(false));
    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!deviceOpen) return;
    const onDown = (event: MouseEvent) => {
      if (deviceRef.current && !deviceRef.current.contains(event.target as Node)) setDeviceOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDeviceOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [deviceOpen]);

  if (!track) {
    return (
      <div className="playerbar playerbar-empty">
        <div className="pb-empty-left" />
        <div className="pb-empty-center">
          <div className="pb-controls">
            <button type="button" className="icon-btn ctrl" disabled aria-label="随机播放">
              <Icon name="shuffle" size={22} />
            </button>
            <button type="button" className="icon-btn ctrl" disabled aria-label="上一首">
              <Icon name="prev" size={21} />
            </button>
            <button type="button" className="play-btn" disabled aria-label="播放">
              <Icon name="play" size={14} />
            </button>
            <button type="button" className="icon-btn ctrl" disabled aria-label="下一首">
              <Icon name="next" size={21} />
            </button>
            <button type="button" className="icon-btn ctrl" disabled aria-label="循环播放">
              <Icon name="repeat" size={22} />
            </button>
          </div>
          <div className="pb-progress pb-empty-progress">
            <span className="pb-time">0:00</span>
            <div className="bar">
              <div className="bar-bg" />
              <div className="bar-fill" style={{ width: '0%' }} />
              <div className="bar-thumb" style={{ left: '0%' }} />
            </div>
            <span className="pb-time">0:00</span>
          </div>
        </div>
        <div className="pb-empty-right">
          <button type="button" className="icon-btn" disabled aria-label="歌词">
            <Icon name="mic" size={20} />
          </button>
          <button type="button" className="icon-btn" disabled aria-label="播放队列">
            <Icon name="queue" size={20} />
          </button>
          <button type="button" className="icon-btn" disabled aria-label="连接设备">
            <Icon name="connect" size={20} />
          </button>
          <div className="pb-volume">
            <button type="button" className="icon-btn" disabled aria-label="音量">
              <Icon name={volumeIcon} size={20} />
            </button>
            <div className="bar volume is-disabled" role="slider" aria-label="音量" aria-valuenow={0} aria-valuemax={100}>
              <div className="bar-bg" />
              <div className="bar-fill" style={{ width: `${player.volume * 100}%` }} />
              <div className="bar-thumb" style={{ left: `${player.volume * 100}%` }} />
            </div>
          </div>
          <button type="button" className="icon-btn" disabled aria-label="迷你播放器">
            <Icon name="pip" size={20} />
          </button>
          <button type="button" className="icon-btn" disabled aria-label="全屏">
            <Icon name="fullscreen" size={20} />
          </button>
        </div>
      </div>
    );
  }

  const isCloud = track.source === 'netease' && Boolean(track.cloudId);
  const isLiked = isCloud ? netease.likedIds.has(track.cloudId as number) : player.liked.has(track.id);
  const openArtist = () => {
    if (track.source === 'netease' && track.cloudArtistIds?.length) {
      navigate({ name: 'cloudArtist', id: String(track.cloudArtistIds[0]) });
    } else if (track.artist) {
      navigate({ name: 'artist', id: track.artist });
    }
  };
  const toggleLike = () => {
    if (isCloud) {
      if (!netease.loggedIn) {
        toast('请先登录');
        netease.openLogin();
        return;
      }
      netease
        .toggleCloudLike(track.cloudId as number)
        .then((next) => toast(next ? '已添加到音乐库' : '已从音乐库移除'))
        .catch(() => toast('操作失败'));
    } else {
      player.toggleLike();
    }
  };
  const openNowPlaying = () => {
    setLyricsFull(false);
    setNpFull(false);
    setPanelView('nowPlaying');
    setPanelOpen(true);
  };
  const openLyrics = () => {
    setNpFull(false);
    setLyricsFull(!lyricsFull);
  };
  const openQueue = () => {
    setLyricsFull(false);
    setNpFull(false);
    if (panelOpen && panelView === 'queue') setPanelOpen(false);
    else {
      setPanelView('queue');
      setPanelOpen(true);
    }
  };
  const openMini = () => {
    const api = window.spoteasy?.mini;
    if (!api) return;
    api.open();
    setMiniOpen(true);
  };

  return (
    <footer className="playerbar">
      <div className="pb-left">
        <button type="button" className="pb-cover-btn" onClick={() => { setLyricsFull(false); setPanelOpen(false); setPanelView('nowPlaying'); setNpFull(true); }} title="打开全屏播放" aria-label="打开全屏播放">
          <Cover key={track.id} hue={track.hue} variant={track.variant} label={track.title} src={track.coverUrl} className="pb-cover" />
        </button>
        <div className="pb-track">
          <div className="pb-title-row">
            <span className="pb-title">{track.title}</span>
            <button
              type="button"
              className={`pb-check ${isLiked ? 'is-liked' : ''}`}
              onClick={toggleLike}
              aria-label={isLiked ? '从音乐库中移除' : '添加到音乐库'}
              title={isLiked ? '从音乐库中移除' : '添加到音乐库'}
            >
              {isLiked ? (
                <span className="pb-check-circle">
                  <Icon name="check" size={11} />
                </span>
              ) : (
                <Icon name="plusCircle" size={16} />
              )}
            </button>
          </div>
          <button type="button" className="pb-artist-link" onClick={openArtist} title={track.artist}>
            {track.artist}
          </button>
        </div>
      </div>

      <div className="pb-center">
        <div className="pb-controls">
          <button
            type="button"
            className={`icon-btn ctrl tip ${player.shuffle ? 'is-on' : ''}`}
            onClick={player.toggleShuffle}
            aria-label="随机播放"
            data-tip={player.shuffle ? '关闭随机播放' : '随机播放'}
          >
            <Icon name="shuffle" size={22} />
            {player.shuffle && <span className="ctrl-dot" />}
          </button>
          <button type="button" className="icon-btn ctrl tip" onClick={player.prev} aria-label="上一首" data-tip="上一首">
            <Icon name="prev" size={21} />
          </button>
          <button
            type="button"
            className="play-btn tip"
            onClick={player.toggle}
            aria-label={player.playing ? '暂停' : '播放'}
            data-tip={player.playing ? '暂停' : '播放'}
          >
            <Icon name={player.playing ? 'pause' : 'play'} size={14} />
          </button>
          <button type="button" className="icon-btn ctrl tip" onClick={player.next} aria-label="下一首" data-tip="下一首">
            <Icon name="next" size={21} />
          </button>
          <button
            type="button"
            className={`icon-btn ctrl tip ${player.repeat !== 'off' ? 'is-on' : ''}`}
            onClick={player.cycleRepeat}
            aria-label="循环播放"
            data-tip={player.repeat === 'one' ? '单曲循环' : player.repeat === 'all' ? '列表循环' : '循环播放'}
          >
            <Icon name={player.repeat === 'one' ? 'repeatOne' : 'repeat'} size={20} />
            {player.repeat !== 'off' && <span className="ctrl-dot" />}
          </button>
        </div>

        <div className="pb-progress">
          <span className="pb-time">{formatTime(player.progress)}</span>
          <div
            className="bar seek"
            {...seekBar.handlers}
            ref={seekBar.ref}
            role="slider"
            aria-label="播放进度"
            aria-valuenow={Math.round(player.progress)}
            aria-valuemax={duration}
            onPointerMove={(e) => {
              seekBar.handlers.onPointerMove(e);
              const rect = e.currentTarget.getBoundingClientRect();
              setSeekHover(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
            }}
            onPointerLeave={() => setSeekHover(null)}
          >
            <div className="bar-bg" />
            <div className="bar-fill" style={{ width: `${pct}%` }} />
            <div className="bar-thumb" style={{ left: `${pct}%` }} />
            {seekHover !== null && (
              <span className="bar-tip" style={{ left: `${seekHover * 100}%` }}>
                {formatTime(seekHover * duration)}
              </span>
            )}
          </div>
          <span className="pb-time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="pb-right">
        <button
          type="button"
          className={`icon-btn pb-icon tip ${lyricsFull ? 'is-on' : ''}`}
          onClick={openLyrics}
          aria-label="歌词"
          data-tip="歌词"
        >
          <Icon name="mic" size={20} />
        </button>
        <button
          type="button"
          className={`icon-btn pb-icon tip ${panelOpen && !lyricsFull && !npFull && panelView === 'queue' ? 'is-on' : ''}`}
          onClick={openQueue}
          aria-label="播放队列"
          data-tip="播放队列"
        >
          <Icon name="queue" size={20} />
        </button>
        <div className="pb-connect" ref={deviceRef}>
          <button
            type="button"
            className={`icon-btn pb-icon tip ${deviceOpen ? 'is-on' : ''}`}
            onClick={() => setDeviceOpen((value) => !value)}
            aria-label="连接设备"
            data-tip="连接设备"
          >
            <Icon name="connect" size={20} />
          </button>
          {deviceOpen && (
            <div className="connect-popover" role="dialog" aria-label="连接设备">
              <div className="connect-popover-head">连接设备</div>
              <button
                type="button"
                className="connect-device is-current"
                onClick={() => setDeviceOpen(false)}
              >
                <Icon name="device" size={20} />
                <span>此电脑</span>
                <Icon name="check" size={16} />
              </button>
              <div className="connect-popover-note">仅支持在本机播放</div>
            </div>
          )}
        </div>
        <div className="pb-volume">
          <button
            type="button"
            className="icon-btn pb-icon tip"
            onClick={() => {
              if (player.volume > 0) {
                lastVolumeRef.current = player.volume;
                player.setVolume(0);
              } else {
                player.setVolume(lastVolumeRef.current || 0.72);
              }
            }}
            aria-label="音量"
            data-tip={player.volume > 0 ? '静音' : '取消静音'}
          >
            <Icon name={volumeIcon} size={20} />
          </button>
          <div
            className="bar volume"
            {...volumeBar.handlers}
            ref={volumeBar.ref}
            role="slider"
            aria-label="音量"
            aria-valuenow={Math.round(player.volume * 100)}
            aria-valuemax={100}
          >
            <div className="bar-bg" />
            <div className="bar-fill" style={{ width: `${player.volume * 100}%` }} />
            <div className="bar-thumb" style={{ left: `${player.volume * 100}%` }} />
          </div>
        </div>
        <button
          type="button"
          className={`icon-btn pb-icon tip ${miniOpen ? 'is-on' : ''}`}
          onClick={openMini}
          aria-label="迷你播放器"
          data-tip="迷你播放器"
        >
          <Icon name="pip" size={20} />
        </button>
        <button
          type="button"
          className={`icon-btn pb-icon tip ${npFull ? 'is-on' : ''}`}
          onClick={() => {
            setLyricsFull(false);
            setNpFull(!npFull);
          }}
          aria-label={npFull ? '退出全屏' : '全屏模式'}
          data-tip={npFull ? '退出全屏' : '全屏模式'}
        >
          <Icon name={npFull ? 'exitFullscreen' : 'fullscreen'} size={20} />
        </button>
      </div>
    </footer>
  );
}
