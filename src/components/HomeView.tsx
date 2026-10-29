import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from './Icons';
import { Cover } from './CoverArt';
import { MediaCard } from './MediaCard';
import { formatCount, registerTracks, type Playlist, type Track } from '../data/mock';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import type { Route } from '../routing';

interface HomeViewProps {
  navigate(route: Route): void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '凌晨好';
  if (h < 12) return '早上好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function CardRow({
  title,
  playlists,
  onOpen,
  onPlay,
  onShowAll,
}: {
  title: string;
  playlists: Playlist[];
  onOpen(p: Playlist): void;
  onPlay(p: Playlist): void;
  onShowAll(): void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 640, behavior: 'smooth' });
  };

  if (!playlists.length) return null;

  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <button type="button" className="show-all" onClick={onShowAll}>
          显示全部
        </button>
      </div>
      <div className="card-row-wrap">
        <button type="button" className="row-arrow is-left" onClick={() => scrollBy(-1)} aria-label="向左">
          <Icon name="arrowLeft" size={20} />
        </button>
        <div className="card-row" ref={ref}>
          {playlists.map((p) => (
            <MediaCard
              key={`${title}-${p.id}`}
              title={p.name}
              subtitle={
                p.hidePlays
                  ? p.desc
                  : p.playCount
                    ? `${formatCount(p.playCount)} 次播放`
                    : p.kind === 'daily'
                      ? '每天 6:00 更新'
                      : p.kind === 'liked'
                        ? `我喜欢的音乐 · ${p.tracks.length} 首`
                        : p.desc
              }
              hue={p.hue}
              variant={p.variant}
              heart={p.kind === 'liked'}
              coverUrl={p.coverUrl}
              onClick={() => onOpen(p)}
              onPlay={() => onPlay(p)}
            />
          ))}
        </div>
        <button type="button" className="row-arrow is-right" onClick={() => scrollBy(1)} aria-label="向右">
          <Icon name="arrowRight" size={20} />
        </button>
      </div>
    </section>
  );
}

export function HomeView({ navigate }: HomeViewProps) {
  const netease = useNetease();
  const player = usePlayer();
  const [recommended, setRecommended] = useState<Playlist[]>([]);
  const [resource, setResource] = useState<Playlist[]>([]);
  const [top, setTop] = useState<Playlist[]>([]);
  const [charts, setCharts] = useState<Playlist[]>([]);
  const [newSongs, setNewSongs] = useState<Track[]>([]);
  const [podcastEpisodes, setPodcastEpisodes] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyCover, setDailyCover] = useState<string | undefined>(undefined);
  const [dailyHue, setDailyHue] = useState(158);
  const [heroHue, setHeroHue] = useState(210);

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
        setNewSongs(data?.newSongs || []);
        registerTracks(data?.newSongs || []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!netease.loggedIn) return;
    let alive = true;
    netease
      .dailyTracks()
      .then((tracks) => {
        if (!alive || !tracks[0]) return;
        setDailyCover(tracks[0].coverUrl);
        setDailyHue(tracks[0].hue);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [netease.dailyTracks, netease.loggedIn]);

  const quick = useMemo(() => {
    if (!netease.loggedIn) {
      if (player.liked.size === 0) return [];
      return [
        {
          id: '__liked',
          name: '我喜欢的音乐',
          desc: '',
          owner: '',
          hue: 158,
          variant: 5,
          tracks: [],
          kind: 'liked' as const,
        },
      ];
    }
    return [
      {
        id: '__daily',
        name: '每日推荐',
        desc: '每天 6:00 更新',
        owner: '',
        hue: dailyHue,
        variant: 0,
        tracks: [],
        coverUrl: dailyCover,
        kind: 'daily' as const,
      },
      {
        id: '__liked',
        name: '我喜欢的音乐',
        desc: '',
        owner: '',
        hue: 158,
        variant: 5,
        tracks: [],
        kind: 'liked' as const,
      },
      ...netease.myPlaylists,
    ].slice(0, 6);
  }, [dailyCover, dailyHue, netease.loggedIn, netease.myPlaylists, player.liked]);

  useEffect(() => {
    if (!netease.loggedIn || netease.myPodcasts.length === 0) {
      setPodcastEpisodes([]);
      return;
    }
    let alive = true;
    Promise.all(
      netease.myPodcasts.slice(0, 6).map((podcast) =>
        netease.podcastPrograms(podcast.cloudId, 0, 1).catch(() => ({ programs: [] as Track[], hasMore: false })),
      ),
    ).then((results) => {
      if (!alive) return;
      const episodes = results
        .flatMap((result) => result.programs || [])
        .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
        .slice(0, 8);
      setPodcastEpisodes(episodes);
    });
    return () => {
      alive = false;
    };
  }, [netease.loggedIn, netease.myPodcasts, netease.podcastPrograms]);

  const podcastCards = useMemo<Playlist[]>(
    () =>
      netease.myPodcasts.map((podcast) => ({
        id: podcast.id,
        name: podcast.name,
        desc: podcast.djName,
        owner: podcast.djName,
        hue: podcast.hue,
        variant: podcast.variant,
        tracks: [],
        coverUrl: podcast.coverUrl,
        playCount: podcast.subscriberCount,
        hidePlays: true,
      })),
    [netease.myPodcasts],
  );

  const episodeCards = useMemo<Playlist[]>(
    () =>
      podcastEpisodes.map((episode) => ({
        id: `episode:${episode.id}`,
        name: episode.title,
        desc: episode.artist,
        owner: episode.artist,
        hue: episode.hue,
        variant: episode.variant,
        tracks: [episode.id],
        coverUrl: episode.coverUrl,
        hidePlays: true,
      })),
    [podcastEpisodes],
  );

  const openPodcast = (playlist: Playlist) => {
    navigate({ name: 'podcast', id: String(playlist.id.replace('ne-podcast-', '')) });
  };

  const openEpisode = (playlist: Playlist) => {
    const track = podcastEpisodes.find((item) => item.id === playlist.tracks[0]);
    if (!track) return;
    registerTracks(podcastEpisodes);
    player.play(track.id, podcastEpisodes.map((item) => item.id), track.artist || '播客');
  };

  const newSongCards = useMemo<Playlist[]>(
    () =>
      newSongs.map((track) => ({
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
      })),
    [newSongs],
  );

  const open = (playlist: Playlist) => {
    if (playlist.kind === 'daily') {
      navigate({ name: 'cloudDaily' });
      return;
    }
    if (playlist.kind === 'liked') {
      navigate({ name: 'cloudLiked' });
      return;
    }
    if (playlist.id.startsWith('__new-')) {
      const trackId = playlist.tracks[0];
      if (trackId) player.play(trackId, [trackId], '新歌速递');
      return;
    }
    navigate({ name: 'playlist', id: playlist.id });
  };

  const empty = !loading && !recommended.length && !top.length && !charts.length && !newSongCards.length;



  useEffect(() => {
    const pool = [...recommended, ...resource, ...top, ...charts].filter((item) => item.coverUrl);
    if (dailyCover) pool.push({ id: '__daily-color', name: '每日推荐', desc: '', owner: '', hue: dailyHue, variant: 0, tracks: [], coverUrl: dailyCover, kind: 'daily' });
    if (!pool.length) {
      setHeroHue(210);
      return;
    }
    let alive = true;
    const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')) || 1;
    const pick = pool[seed % pool.length];
    setHeroHue(pick.hue);
    window.spoteasy?.netease
      ?.coverColor(pick.coverUrl || '')
      .then((result) => {
        if (alive && typeof result?.hue === 'number') setHeroHue(result.hue);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [charts, dailyCover, dailyHue, recommended, resource, top]);

  useEffect(() => {
    document.documentElement.style.setProperty('--home-hue', String(heroHue));
  }, [heroHue]);

  if (loading) {
    return (
      <div className="home home-loading" aria-busy="true">
        <div className="home-skel home-skel-title" />
        <div className="home-skel-row">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="home-skel home-skel-card" key={index} />
          ))}
        </div>
        <div className="home-skel home-skel-title" />
        <div className="home-skel-row">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="home-skel home-skel-card is-wide" key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="home" style={{ '--home-hue': String(heroHue) } as CSSProperties}>
      <h1 className="home-greeting">{greeting()}</h1>

      {quick.length > 0 && (
        <div className="quick-grid">
          {quick.map((playlist) => (
            <div
              key={playlist.id}
              className="quick-tile"
              role="button"
              tabIndex={0}
              onClick={() => open(playlist)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') open(playlist);
              }}
            >
              <Cover
                hue={playlist.hue}
                variant={playlist.variant}
                label={playlist.name}
                heart={playlist.kind === 'liked'}
                src={playlist.coverUrl}
                className="quick-cover"
              />
              <span className="quick-name">{playlist.name}</span>
              <button
                type="button"
                className="quick-play"
                aria-label={`打开 ${playlist.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  open(playlist);
                }}
              >
                <Icon name="play" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {loading && empty && <div className="cloud-loading">正在加载推荐…</div>}
      {empty && <div className="cloud-loading">暂时没有可展示的推荐。</div>}

      <CardRow
        title="为你推荐"
        playlists={recommended}
        onOpen={open}
        onPlay={open}
        onShowAll={() => navigate({ name: 'section', id: 'recommended' })}
      />

      {podcastCards.length > 0 && (
        <CardRow
          title="你的节目"
          playlists={podcastCards}
          onOpen={openPodcast}
          onPlay={openPodcast}
          onShowAll={() => navigate({ name: 'library' })}
        />
      )}

      {episodeCards.length > 0 && (
        <CardRow
          title="新单集"
          playlists={episodeCards}
          onOpen={openEpisode}
          onPlay={openEpisode}
          onShowAll={() => navigate({ name: 'library' })}
        />
      )}
      <CardRow
        title="排行榜"
        playlists={charts}
        onOpen={open}
        onPlay={open}
        onShowAll={() => navigate({ name: 'section', id: 'charts' })}
      />
      <CardRow
        title="专属推荐"
        playlists={resource}
        onOpen={open}
        onPlay={open}
        onShowAll={() => navigate({ name: 'section', id: 'resource' })}
      />
      <CardRow
        title="热门歌单"
        playlists={top}
        onOpen={open}
        onPlay={open}
        onShowAll={() => navigate({ name: 'section', id: 'top' })}
      />
      <CardRow
        title="新歌速递"
        playlists={newSongCards}
        onOpen={open}
        onPlay={open}
        onShowAll={() => navigate({ name: 'section', id: 'new' })}
      />
    </div>
  );
}
