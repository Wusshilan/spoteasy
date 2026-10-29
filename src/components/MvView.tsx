import { useEffect, useState } from 'react';
import { Icon } from './Icons';
import { formatCount } from '../data/mock';
import type { Route } from '../routing';

interface MvViewProps {
  mvId: number;
  navigate(route: Route): void;
}

export function MvView({ mvId, navigate }: MvViewProps) {
  const [mv, setMv] = useState<NeteaseMv | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setFailed(false);
    window.spoteasy?.netease
      ?.mv(mvId)
      .then((result) => {
        if (!alive) return;
        if (!result.mv) {
          setError(result.error || 'MV 暂时打不开');
          return;
        }
        setMv(result.mv);
      })
      .catch((err) => {
        if (alive) setError(String((err as Error)?.message || 'MV 暂时打不开'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [mvId]);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">MV</div>
        <h2>正在加载 MV</h2>
        <p>正在准备视频。</p>
      </div>
    );
  }

  if (error || !mv) {
    return (
      <div className="empty-state">
        <div className="empty-icon">MV</div>
        <h2>这个 MV 暂时打不开</h2>
        <p>{error || '换一个视频试试。'}</p>
        <button type="button" className="primary-btn" onClick={() => navigate({ name: 'home' })}>
          回到首页
        </button>
      </div>
    );
  }

  return (
    <div className="mv-page">
      <header className="mv-head">
        <button type="button" className="icon-btn" onClick={() => navigate({ name: 'home' })} aria-label="返回">
          <Icon name="arrowLeft" size={20} />
        </button>
        <span>MV</span>
      </header>

      <div className="mv-stage">
        {failed ? (
          <div className="mv-fallback">
            <Icon name="play" size={40} />
            <p>视频暂时无法播放</p>
          </div>
        ) : (
          <video
            key={mv.cloudId}
            className="mv-video"
            src={`spoteasy-mv://mv/${mv.cloudId}`}
            poster={mv.coverUrl}
            controls
            autoPlay
            playsInline
            onError={() => setFailed(true)}
          />
        )}
      </div>

      <div className="mv-meta">
        <div>
          <h1>{mv.name}</h1>
          {mv.artist && (
            <button
              type="button"
              className="mv-artist"
              onClick={() => {
                if (mv.artistId) navigate({ name: 'cloudArtist', id: String(mv.artistId) });
                else navigate({ name: 'search', q: mv.artist });
              }}
            >
              {mv.artist}
            </button>
          )}
        </div>
        <div className="mv-stats">
          {mv.playCount > 0 && <span>{formatCount(mv.playCount)} 次播放</span>}
          {mv.publishTime > 0 && <span>{new Date(mv.publishTime).getFullYear()}</span>}
        </div>
      </div>
    </div>
  );
}
