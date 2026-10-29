import { useEffect, useState } from 'react';
import { useNetease } from '../state/netease';
import { useUi } from '../state/ui';
import { PlaylistView } from './PlaylistView';
import { registerTracks, type Playlist } from '../data/mock';
import type { Route } from '../routing';

export function CloudPlaylistView({ cloudId, navigate }: { cloudId: number; navigate: (route: Route) => void }) {
  const netease = useNetease();
  const { toast } = useUi();
  const [data, setData] = useState<NeteasePlaylistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    setHasMore(false);
    const api = window.spoteasy?.netease;
    if (!api) {
      setError('服务 API 未加载');
      return;
    }
    api
      .playlist(cloudId)
      .then((detail) => {
        if (!alive) return;
        if (!detail?.playlist) {
          setError(detail?.error || '这个歌单暂时打不开');
          return;
        }
        registerTracks(detail.tracks);
        setSaved(Boolean(detail.playlist.subscribed));
        const total = detail.playlist.trackCount || detail.tracks.length;
        setHasMore(detail.tracks.length < total || Boolean(detail.hasMore));
        setData(detail);
      })
      .catch((err) => {
        if (alive) setError(String((err as Error)?.message || '这个歌单暂时打不开'));
      });
    return () => {
      alive = false;
    };
  }, [cloudId]);

  const loadMore = async () => {
    const api = window.spoteasy?.netease;
    if (!api || !data?.playlist || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await api.playlistTracks(cloudId, data.tracks.length, 100);
      registerTracks(result.tracks || []);
      const map = new Map(data.tracks.map((track) => [track.id, track]));
      for (const track of result.tracks || []) map.set(track.id, track);
      const tracks = [...map.values()];
      const total = data.playlist.trackCount || tracks.length;
      setData((previous) => (previous ? { ...previous, tracks } : previous));
      setHasMore(tracks.length < total || (result.hasMore && tracks.length === data.tracks.length));
    } catch {
      toast('加载更多失败，稍后再试');
    } finally {
      setLoadingMore(false);
    }
  };

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">CLOUD</div>
        <h2>这个歌单暂时打不开</h2>
        <p>{error}</p>
        <button type="button" className="primary-btn" onClick={() => navigate({ name: 'home' })}>
          回到首页
        </button>
      </div>
    );
  }

  if (!data?.playlist) {
    return (
      <div className="empty-state">
        <div className="empty-icon">…</div>
        <h2>正在加载歌单</h2>
        <p>正在拉取歌单信息和曲目。</p>
      </div>
    );
  }

  const toggleSaved = async () => {
    if (!netease.loggedIn) {
      toast('请先登录');
      netease.openLogin();
      return;
    }
    const api = window.spoteasy?.netease;
    if (!api) return;
    const next = !saved;
    try {
      const result = await api.playlistSubscribe(cloudId, next);
      if (!result.ok) throw new Error(result.error);
      setSaved(next);
      toast(next ? '已收藏歌单' : '已取消收藏');
      netease.refreshMyMusic();
    } catch {
      toast('操作失败');
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`https://music.163.com/#/playlist?id=${cloudId}`);
      toast('歌单链接已复制');
    } catch {
      toast('复制失败');
    }
  };

  const playlist: Playlist = {
    ...data.playlist,
    tracks: data.tracks.map((track) => track.id),
  };

  return (
    <PlaylistView
      playlist={playlist}
      navigate={navigate}
      manage={{ onShare: share, subscribed: saved, onToggleSubscribe: toggleSaved }}
      loadMore={
        playlist.trackCount && playlist.trackCount > playlist.tracks.length
          ? {
              hasMore,
              loading: loadingMore,
              loaded: playlist.tracks.length,
              total: playlist.trackCount,
              onLoadMore: loadMore,
            }
          : hasMore
            ? {
                hasMore,
                loading: loadingMore,
                loaded: playlist.tracks.length,
                total: Math.max(playlist.trackCount || 0, playlist.tracks.length + 1),
                onLoadMore: loadMore,
              }
            : undefined
      }
    />
  );
}
