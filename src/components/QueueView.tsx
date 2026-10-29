import { useMemo, useState } from 'react';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';

type QueueTab = 'queue' | 'recent';

export function QueueView({ onSaveQueue }: { onSaveQueue?: (ids: string[]) => void }) {
  const player = usePlayer();
  const { setPanelOpen, toast } = useUi();
  const [tab, setTab] = useState<QueueTab>('queue');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const track = player.track;

  const recent = useMemo(() => {
    const seen = new Set<string>();
    return player.history.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [player.history]);

  const saveQueue = () => {
    if (!onSaveQueue) return;
    const ids = player.order.slice(player.index);
    if (!ids.length) {
      toast('队列是空的');
      return;
    }
    onSaveQueue(ids);
  };

  return (
    <aside className="queue-panel">
      <header className="queue-panel-head">
        <div className="queue-tabs">
          <button
            type="button"
            className={`queue-tab ${tab === 'queue' ? 'is-active' : ''}`}
            onClick={() => setTab('queue')}
          >
            队列
          </button>
          <button
            type="button"
            className={`queue-tab ${tab === 'recent' ? 'is-active' : ''}`}
            onClick={() => setTab('recent')}
          >
            最近播放
          </button>
        </div>
        <button type="button" className="icon-btn queue-close" onClick={() => setPanelOpen(false)} aria-label="关闭队列">
          <Icon name="x" size={18} />
        </button>
      </header>

      <div className="queue-panel-scroll">
        {tab === 'queue' ? (
          <>
            <div className="queue-head-row">
              <h3 className="queue-section-title">当前播放</h3>
              <div className="queue-head-actions">
                <button type="button" className="queue-action" onClick={saveQueue} disabled={!player.order.length}>
                  保存队列
                </button>
                <button
                  type="button"
                  className="queue-action"
                  onClick={() => {
                    if (!player.queue.length) return;
                    player.clearQueue();
                    toast('已清空队列');
                  }}
                  disabled={!player.queue.length}
                >
                  清空
                </button>
              </div>
            </div>
            {track && (
              <div className="queue-track is-current">
                <Cover
                  hue={track.hue}
                  variant={track.variant}
                  label={track.title}
                  src={track.coverUrl}
                  className="queue-track-cover"
                />
                <div className="queue-track-text">
                  <div className="queue-track-title">{track.title}</div>
                  <div className="queue-track-artist">{track.artist}</div>
                </div>
              </div>
            )}
            <div className="queue-origin">下一首歌来自：{player.contextName || '当前播放'}</div>
            {player.queue.length === 0 && <div className="queue-empty">队列是空的</div>}
            {player.queue.map((item, index) => {
              const absolute = player.index + 1 + index;
              return (
                <div
                  key={`${item.id}-${index}`}
                  role="button"
                  tabIndex={0}
                  draggable
                  className={`queue-track queue-track-row ${dropIndex === absolute ? 'is-drop-target' : ''} ${dragIndex === absolute ? 'is-dragging' : ''}`}
                  onClick={() => player.jumpTo(absolute)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') player.jumpTo(absolute);
                  }}
                  onDragStart={(event) => {
                    setDragIndex(absolute);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(absolute));
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropIndex(absolute);
                  }}
                  onDragLeave={() => setDropIndex(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = Number(event.dataTransfer.getData('text/plain'));
                    if (Number.isFinite(from)) player.moveQueue(from, absolute);
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                >
                  <Cover
                    hue={item.hue}
                    variant={item.variant}
                    label={item.title}
                    src={item.coverUrl}
                    className="queue-track-cover"
                  />
                  <div className="queue-track-text">
                    <div className="queue-track-title">{item.title}</div>
                    <div className="queue-track-artist">{item.artist}</div>
                  </div>
                  <button
                    type="button"
                    className="queue-track-remove"
                    aria-label="从队列移除"
                    title="从队列移除"
                    onClick={(event) => {
                      event.stopPropagation();
                      player.removeFromQueue(absolute);
                    }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <h3 className="queue-section-title">最近播放</h3>
            {recent.length === 0 && <div className="queue-empty">还没有最近播放</div>}
            {recent.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`queue-track ${track?.id === item.id ? 'is-current' : ''}`}
                onClick={() => player.play(item.id, recent.map((entry) => entry.id), '最近播放')}
              >
                <Cover
                  hue={item.hue}
                  variant={item.variant}
                  label={item.title}
                  src={item.coverUrl}
                  className="queue-track-cover"
                />
                <div className="queue-track-text">
                  <div className="queue-track-title">{item.title}</div>
                  <div className="queue-track-artist">{item.artist}</div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
