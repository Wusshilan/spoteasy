import { useState } from 'react';
import { Icon } from './Icons';
import { formatTime, getTrack } from '../data/mock';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';

interface TrackListProps {
  ids: string[];
  playIds?: string[];
  contextName: string;
  showAlbum?: boolean;
  showDate?: boolean;
  compact?: boolean;
  hideFooter?: boolean;
  onRemove?(id: string): void;
  onMove?(from: number, to: number): void;
}

function addedLabel(index: number): string {
  const d = new Date();
  d.setDate(d.getDate() - ((index * 5) % 47 + 1));
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function TrackList({
  ids,
  playIds,
  contextName,
  showAlbum = true,
  showDate = false,
  compact = false,
  hideFooter = false,
  onRemove,
  onMove,
}: TrackListProps) {
  const player = usePlayer();
  const { openMenu } = useUi();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const order = playIds ?? ids;
  const totalSeconds = ids.reduce((sum, id) => sum + getTrack(id).duration, 0);
  const durationLabel =
    totalSeconds < 60 ? `${Math.round(totalSeconds)} 秒` : `${Math.round(totalSeconds / 60)} 分钟`;

  return (
    <div className={`tracklist ${compact ? 'is-compact' : ''} ${showAlbum ? 'has-album' : ''} ${
      showDate ? 'has-date' : ''
    }`}>
      <div className="track-head" role="row">
        <span className="col-index">#</span>
        <span className="col-title">标题</span>
        {showAlbum && <span className="col-album">专辑</span>}
        {showDate && <span className="col-date">添加日期</span>}
        <span className="col-time">
          <Icon name="clock" size={14} />
        </span>
        <span className="col-menu" />
      </div>

      {ids.map((id, i) => {
        const track = getTrack(id);
        const current = player.track?.id === id;
        const playing = current && player.playing;
        return (
          <div
            key={`${id}-${i}`}
            role="row"
            tabIndex={0}
            className={`track-row ${current ? 'is-current' : ''} ${playing ? 'is-playing' : ''}`}
            onClick={() => player.play(id, order, contextName)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') player.play(id, order, contextName);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              openMenu(id, e.clientX, e.clientY);
            }}
            onDragStart={(e) => {
              if (!onMove) return;
              setDragIndex(i);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(i));
            }}
            onDragOver={(e) => {
              if (!onMove) return;
              e.preventDefault();
              setDropIndex(i);
            }}
            onDragLeave={() => setDropIndex(null)}
            onDrop={(e) => {
              if (!onMove) return;
              e.preventDefault();
              const from = Number(e.dataTransfer.getData('text/plain'));
              if (Number.isFinite(from) && from !== i) onMove(from, i);
              setDragIndex(null);
              setDropIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDropIndex(null);
            }}
          >
            <span className="col-index">
              {playing ? (
                <span className="equalizer" aria-label="正在播放">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                <>
                  <span className="row-num">{i + 1}</span>
                  <span className="row-play">
                    <Icon name="play" size={13} />
                  </span>
                </>
              )}
            </span>

            <span className="col-title">
              <span className="track-title">
                {track.title}
                {track.explicit && <span className="explicit">E</span>}
              </span>
              <span className="track-artist">{track.artist}</span>
            </span>

            {showAlbum && <span className="col-album">{track.album}</span>}
            {showDate && (
              <span className="col-date">
                {track.addedAt
                  ? `${new Date(track.addedAt).getMonth() + 1}月${new Date(track.addedAt).getDate()}日`
                  : addedLabel(i)}
              </span>
            )}

            <span className="col-time">{formatTime(track.duration)}</span>
            <span className="col-menu">
              {onRemove && (
                <button
                  type="button"
                  className="icon-btn row-remove"
                  aria-label="从歌单中移除"
                  title="从歌单中移除"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(id);
                  }}
                >
                  <Icon name="x" size={14} />
                </button>
              )}
              <button
                type="button"
                className="icon-btn row-more"
                aria-label="更多操作"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  openMenu(id, rect.right - 8, rect.bottom + 4);
                }}
              >
                <Icon name="more" size={16} />
              </button>
            </span>
          </div>
        );
      })}

      {ids.length === 0 && <div className="track-empty">这里还空着，去搜索里找点歌吧。</div>}

      {!hideFooter && (
        <div className="track-foot">
          {ids.length} 首歌 · {durationLabel}
        </div>
      )}
    </div>
  );
}
