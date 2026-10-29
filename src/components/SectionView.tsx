import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icons';
import { MediaCard } from './MediaCard';
import { formatCount, registerTracks, type Playlist, type Track } from '../data/mock';
import { usePlayer } from '../state/player';
import type { Route } from '../routing';

const titles: Record<string, string> = {
  recommended: '为你推荐',
  charts: '排行榜',
  resource: '专属推荐',
  top: '热门歌单',
  new: '新歌速递',
};

export function SectionView({ kind, navigate }: { kind: string; navigate: (route: Route) => void }) {
  const player = usePlayer();
  const [recommended, setRecommended] = useState<Playlist[]>([]);
  const [resource, setResource] = useState<Playlist[]>([]);
  const [top, setTop] = useState<Playlist[]>([]);
  const [charts, setCharts] = useState<Playlist[]>([]);
  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    window.spoteasy?.netease
      ?.home()
      .then((data) => {
        if (!alive) return;
        setRecommended(data?.recommended || []);
        setResource(data?.resource || []);
        setTop(data?.top || []);
        setCharts(data?.charts || []);
        setSongs(data?.newSongs || []);
        registerTracks(data?.newSongs || []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const playlists = useMemo<Playlist[]>(() => {
    if (kind === 'top') return top;
    if (kind === 'charts') return charts;
    if (kind === 'resource') return resource;
    if (kind === 'new') {
      return songs.map((track) => ({
        id: `__new-${track.id}`,
        name: track.title,
        desc: track.artist,
        owner: '',
        hue: track.hue,
        variant: track.variant,
        tracks: [track.id],
        trackCount: 1,
        coverUrl: track.coverUrl,
        source: 'netease',
        hidePlays: true,
      }));
    }
    return recommended;
  }, [charts, kind, recommended, resource, songs, top]);

  const open = (playlist: Playlist) => {
    if (playlist.id.startsWith('__new-')) {
      const id = playlist.tracks[0];
      if (id) player.play(id, [id], '新歌速递');
      return;
    }
    navigate({ name: 'playlist', id: playlist.id });
  };

  const title = titles[kind] || '推荐';

  return (
    <div className="section-page">
      <header className="section-page-head">
        <button type="button" className="icon-btn" onClick={() => navigate({ name: 'home' })} aria-label="返回首页">
          <Icon name="arrowLeft" size={20} />
        </button>
        <h1>{title}</h1>
        <span>{playlists.length} 个</span>
      </header>

      {loading && <div className="cloud-loading">正在加载…</div>}

      {!loading && (
        <div className="media-grid section-grid">
          {playlists.map((playlist) => (
            <MediaCard
              key={playlist.id}
              title={playlist.name}
              subtitle={playlist.hidePlays ? playlist.desc : formatCount(playlist.playCount || 0) + ' 次播放'}
              hue={playlist.hue}
              variant={playlist.variant}
              coverUrl={playlist.coverUrl}
              onClick={() => open(playlist)}
              onPlay={() => open(playlist)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
