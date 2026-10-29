import { useEffect, useRef, useState } from 'react';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { formatTime } from '../data/mock';
import type { MiniCommand, MiniState } from '../mini';

export function MiniPlayer() {
  const [state, setState] = useState<MiniState | null>(null);
  const [copied, setCopied] = useState(false);
  const seeking = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const api = window.spoteasy?.mini;
    if (!api) return;
    let alive = true;
    api.getState().then((next) => {
      if (alive && next) setState(next);
    });
    const off = api.onState((next) => setState(next));
    return () => {
      alive = false;
      off?.();
    };
  }, []);

  const send = (command: MiniCommand) => {
    window.spoteasy?.mini?.command(command);
  };

  if (!state?.track) {
    return (
      <div className="mini-player mini-empty">
        <div className="mini-dots" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </div>
        <span>Spoteasy</span>
      </div>
    );
  }

  const track = state.track;
  const pct = state.duration ? Math.min(100, (state.progress / state.duration) * 100) : 0;
  const volumeIcon = state.volume === 0 ? 'mute' : state.volume < 0.5 ? 'volumeLow' : 'volume';

  const seek = (clientX: number) => {
    const el = barRef.current;
    if (!el || !state.duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    send({ type: 'seek', value: ratio * state.duration });
  };

  const share = () => {
    const link =
      track.source === 'netease' && track.cloudId
        ? `https://music.163.com/song?id=${track.cloudId}`
        : `${track.title} — ${track.artist}`;
    navigator.clipboard?.writeText(link).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className={`mini-player ${state.playing ? 'is-playing' : ''}`}>
      <div className="mini-titlebar">
        <span className="mini-dots" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </span>
        <button
          type="button"
          className="mini-close"
          onClick={() => window.spoteasy?.mini?.close()}
          aria-label="关闭迷你播放器"
          title="关闭"
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="mini-art">
        <Cover
          key={track.id}
          hue={track.hue}
          variant={track.variant}
          label={track.title}
          src={track.coverUrl}
          className="mini-cover"
        />
        <div className="mini-controls">
          <button
            type="button"
            className="icon-btn"
            onClick={() => send({ type: 'mute' })}
            title={state.volume > 0 ? '静音' : '取消静音'}
            aria-label="音量"
          >
            <Icon name={volumeIcon} size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${state.shuffle ? 'is-on' : ''}`}
            onClick={() => send({ type: 'shuffle' })}
            title="随机播放"
            aria-label="随机播放"
          >
            <Icon name="shuffle" size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={() => send({ type: 'prev' })} title="上一首" aria-label="上一首">
            <Icon name="prev" size={16} />
          </button>
          <button
            type="button"
            className="mini-play"
            onClick={() => send({ type: 'toggle' })}
            aria-label={state.playing ? '暂停' : '播放'}
            title={state.playing ? '暂停' : '播放'}
          >
            <Icon name={state.playing ? 'pause' : 'play'} size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={() => send({ type: 'next' })} title="下一首" aria-label="下一首">
            <Icon name="next" size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${state.repeat !== 'off' ? 'is-on' : ''}`}
            onClick={() => send({ type: 'repeat' })}
            title="循环播放"
            aria-label="循环播放"
          >
            <Icon name={state.repeat === 'one' ? 'repeatOne' : 'repeat'} size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={share} title={copied ? '已复制' : '分享'} aria-label="分享">
            <Icon name={copied ? 'check' : 'share'} size={16} />
          </button>
        </div>
      </div>

      <div className="mini-info">
        <div className="mini-track-text">
          <div className="mini-title" title={track.title}>{track.title}</div>
          <div className="mini-artist" title={track.artist}>{track.artist}</div>
        </div>
        <button
          type="button"
          className={`mini-check ${state.liked ? 'is-liked' : ''}`}
          onClick={() => send({ type: 'like' })}
          aria-label={state.liked ? '从音乐库中移除' : '添加到音乐库'}
          title={state.liked ? '从音乐库中移除' : '添加到音乐库'}
        >
          {state.liked ? (
            <span className="mini-check-circle">
              <Icon name="check" size={11} />
            </span>
          ) : (
            <Icon name="plusCircle" size={18} />
          )}
        </button>
      </div>

      <div className="mini-progress">
        <span>{formatTime(state.progress)}</span>
        <div
          className="mini-bar"
          ref={barRef}
          role="slider"
          aria-label="播放进度"
          aria-valuenow={Math.round(state.progress)}
          aria-valuemax={state.duration}
          onPointerDown={(event) => {
            seeking.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            seek(event.clientX);
          }}
          onPointerMove={(event) => {
            if (seeking.current) seek(event.clientX);
          }}
          onPointerUp={(event) => {
            seeking.current = false;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            seeking.current = false;
          }}
        >
          <span className="mini-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span>{formatTime(state.duration)}</span>
      </div>
    </div>
  );
}
