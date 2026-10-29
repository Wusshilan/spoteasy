import { useEffect, useState } from 'react';
import { PlaylistView } from './PlaylistView';
import { getTrack, type Playlist, type Track } from '../data/mock';
import { useNetease } from '../state/netease';
import type { Route } from '../routing';
import { usePlayer } from '../state/player';

interface CloudPersonalViewProps {
  kind: 'daily' | 'liked';
  navigate(route: Route): void;
}

export function CloudPersonalView({ kind, navigate }: CloudPersonalViewProps) {
  const { loggedIn, openLogin, dailyTracks, likedTracks, likedIds } = useNetease();
  const player = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const likeCount = likedIds.size;
  const localLikedTracks = kind === 'liked' ? [...player.liked].map((id) => getTrack(id)) : [];

  useEffect(() => {
    let alive = true;
    setError(null);
    if (!loggedIn) {
      setTracks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const request = kind === 'daily' ? dailyTracks() : likedTracks();
    request
      .then((next) => {
        if (alive) setTracks(next);
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
  }, [dailyTracks, kind, likedTracks, loggedIn, likeCount]);

  if (!loggedIn && (kind === 'daily' || localLikedTracks.length === 0)) {
    return (
      <div className="empty-state">
        <div className="empty-icon">CLOUD</div>
        <h2>{kind === 'daily' ? '每日推荐需要登录' : '喜欢的音乐需要登录'}</h2>
        <p>
          {kind === 'daily'
            ? '登录后，这里会同步你账号里的每日推荐。'
            : '登录后，这里会同步你账号里的红心歌曲。'}
        </p>
        <button type="button" className="primary-btn" onClick={openLogin}>
          登录
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">…</div>
        <h2>{kind === 'daily' ? '正在生成每日推荐' : '正在加载我喜欢的音乐'}</h2>
        <p>正在加载你账号里的歌曲。</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">CLOUD</div>
        <h2>{kind === 'daily' ? '每日推荐暂时打不开' : '我喜欢的音乐暂时打不开'}</h2>
        <p>{error}</p>
        <button type="button" className="primary-btn" onClick={() => navigate({ name: 'home' })}>
          回到首页
        </button>
      </div>
    );
  }

  const mergedTracks =
    kind === 'liked'
      ? [...tracks, ...localLikedTracks.filter((track) => !tracks.some((item) => item.id === track.id))]
      : tracks;

  if (!mergedTracks.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">♪</div>
        <h2>{kind === 'daily' ? '今天还没有推荐' : '还没有喜欢的歌'}</h2>
        <p>{kind === 'daily' ? '稍后再来，或者换一个账号试试。' : '在歌曲上点红心，就会出现在这里。'}</p>
        <button type="button" className="primary-btn" onClick={() => navigate({ name: 'search' })}>
          去搜索
        </button>
      </div>
    );
  }

  const first = mergedTracks[0];
  const playlist: Playlist = {
    id: kind === 'daily' ? 'ne-daily' : 'ne-liked',
    name: kind === 'daily' ? '每日推荐' : '我喜欢的音乐',
    desc:
      kind === 'daily'
        ? '根据你的音乐口味生成，每天 6:00 更新。'
        : '你收藏的红心歌曲，本地喜欢与网易云红心合并。',
    owner: kind === 'daily' ? '音乐库' : '我的音乐',
    hue: first?.hue ?? 158,
    variant: kind === 'daily' ? 2 : 5,
    kind: kind === 'daily' ? 'daily' : 'liked',
    tracks: mergedTracks.map((track) => track.id),
    trackCount: mergedTracks.length,
    coverUrl: first?.coverUrl,
    source: 'netease',
    hidePlays: true,
  };

  return (
    <div className="liked-merged-page">
      {!loggedIn && kind === 'liked' && (
        <div className="liked-local-note">
          <span>当前显示本地喜欢。登录后同时显示网易云红心歌曲。</span>
          <button type="button" onClick={openLogin}>
            登录网易云
          </button>
        </div>
      )}
      <PlaylistView playlist={playlist} navigate={navigate} />
    </div>
  );
}
