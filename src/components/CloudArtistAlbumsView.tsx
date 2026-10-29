import { useEffect, useState } from 'react';
import { Cover } from './CoverArt';
import { MediaCard } from './MediaCard';
import type { Route } from '../routing';

interface CloudArtistAlbumsViewProps {
  artistId: number;
  navigate(route: Route): void;
}

export function CloudArtistAlbumsView({ artistId, navigate }: CloudArtistAlbumsViewProps) {
  const [artist, setArtist] = useState<NeteaseArtist | null>(null);
  const [albums, setAlbums] = useState<NeteaseAlbum[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const api = window.spoteasy?.netease;
    if (!api) {
      setError('服务 API 未加载');
      setLoading(false);
      return;
    }
    Promise.all([api.artist(artistId), api.artistAlbums(artistId, 30, 0)])
      .then(([artistResult, albumResult]) => {
        if (!alive) return;
        if (!artistResult?.artist) throw new Error(artistResult?.error || '找不到这位歌手');
        setArtist(artistResult.artist);
        setAlbums([...(albumResult.albums || [])].sort((a, b) => b.publishTime - a.publishTime));
        setHasMore(Boolean(albumResult.hasMore));
      })
      .catch((err) => {
        if (alive) setError(String((err as Error)?.message || '暂时不可用'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [artistId]);

  const loadMore = async () => {
    const api = window.spoteasy?.netease;
    if (!api || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await api.artistAlbums(artistId, 30, albums.length);
      const map = new Map(albums.map((album) => [album.id, album]));
      for (const album of result.albums || []) map.set(album.id, album);
      setAlbums([...map.values()].sort((a, b) => b.publishTime - a.publishTime));
      setHasMore(Boolean(result.hasMore));
    } finally {
      setLoadingMore(false);
    }
  };

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">CLOUD</div>
        <h2>全部专辑暂时打不开</h2>
        <p>{error}</p>
        <button type="button" className="primary-btn" onClick={() => navigate({ name: 'home' })}>
          回到首页
        </button>
      </div>
    );
  }

  if (loading || !artist) {
    return (
      <div className="empty-state">
        <div className="empty-icon">…</div>
        <h2>正在加载全部专辑</h2>
        <p>正在加载歌手和专辑列表。</p>
      </div>
    );
  }

  return (
    <div className="discography-page" style={{ ['--hero-hue' as string]: artist.hue }}>
      <header className="discography-head">
        <div className="discography-avatar">
          <Cover hue={artist.hue} variant={artist.variant} label={artist.name} src={artist.avatarUrl} />
        </div>
        <div className="discography-copy">
          <span className="hero-eyebrow">歌手</span>
          <h1 className="discography-title">{artist.name}</h1>
          <p className="discography-sub">全部专辑 · {artist.albumSize} 张</p>
          <div className="discography-actions">
            <button
              type="button"
              className="settings-btn"
              onClick={() => navigate({ name: 'cloudArtist', id: String(artistId) })}
            >
              返回歌手
            </button>
          </div>
        </div>
      </header>

      <div className="media-grid">
        {albums.map((album) => {
          const year = album.publishTime ? new Date(album.publishTime).getFullYear() : null;
          return (
            <MediaCard
              key={album.id}
              title={album.name}
              subtitle={year ? `${year} · ${album.size} 首` : `${album.size} 首`}
              hue={album.hue}
              variant={album.variant}
              coverUrl={album.coverUrl}
              onClick={() => navigate({ name: 'cloudAlbum', id: String(album.cloudId) })}
              onPlay={() => navigate({ name: 'cloudAlbum', id: String(album.cloudId) })}
            />
          );
        })}
      </div>

      {hasMore && (
        <button type="button" className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? '加载中…' : '加载更多专辑'}
        </button>
      )}
    </div>
  );
}
