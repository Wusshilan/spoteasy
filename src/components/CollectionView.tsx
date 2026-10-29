import { useLayoutEffect, useMemo, useRef } from 'react';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { MediaCard } from './MediaCard';
import { TrackList } from './TrackList';
import { playlistDuration } from '../data/mock';
import { deriveAlbums, deriveArtists } from '../data/derive';
import { useLibrary } from '../state/library';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

interface CollectionViewProps {
  kind: 'artist' | 'album';
  name: string;
  navigate(route: Route): void;
}

export function CollectionView({ kind, name, navigate }: CollectionViewProps) {
  const library = useLibrary();
  const { knownTracks } = useNetease();
  const player = usePlayer();
  const { toast } = useUi();
  const infoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const allTracks = useMemo(
    () => [...library.tracks, ...knownTracks],
    [knownTracks, library.tracks],
  );

  const collection = useMemo(() => {
    const matches =
      kind === 'artist'
        ? allTracks.filter((track) => track.artist === name)
        : allTracks.filter((track) => track.album === name);
    const ids = matches.map((track) => track.id);
    const artist = kind === 'artist' ? deriveArtists(matches)[0] : deriveAlbums(matches)[0];
    const albums = kind === 'artist' ? deriveAlbums(matches) : [];
    const albumTracks = (albumName: string) =>
      allTracks.filter((track) => track.album === albumName).map((track) => track.id);
    const duration = playlistDuration({
      id: `${kind}-${name}`,
      name,
      desc: '',
      owner: '',
      hue: artist?.hue ?? 158,
      variant: 2,
      tracks: ids,
    });
    return {
      tracks: matches,
      ids,
      albums,
      albumTracks,
      hue: artist?.hue ?? 158,
      albumArtist: matches[0]?.artist ?? '未知艺人',
      duration,
    };
  }, [allTracks, kind, name]);

  useLayoutEffect(() => {
    const el = titleRef.current;
    const box = infoRef.current;
    if (!el || !box) return;
    const fit = () => {
      el.style.whiteSpace = 'nowrap';
      let size = 36;
      el.style.fontSize = `${size}px`;
      while (size > 18 && el.scrollWidth > el.clientWidth + 1) {
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
      if (el.scrollWidth > el.clientWidth + 1) {
        el.style.whiteSpace = 'normal';
        el.style.fontSize = '22px';
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [kind, name]);

  if (collection.tracks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">404</div>
        <h2>{kind === 'artist' ? '找不到这位歌手' : '找不到这张专辑'}</h2>
        <p>曲库更新后它可能被移除，或者名字对不上。</p>
        <button type="button" className="primary-btn" onClick={() => navigate({ name: 'search' })}>
          去搜索
        </button>
      </div>
    );
  }

  const playAll = () => {
    if (collection.ids[0]) player.play(collection.ids[0], collection.ids, name);
  };

  const shuffleAll = () => {
    if (!collection.ids.length) return;
    if (!player.shuffle) player.toggleShuffle();
    const pick = collection.ids[Math.floor(Math.random() * collection.ids.length)];
    player.play(pick, collection.ids, name);
    toast('已打乱播放顺序');
  };

  return (
    <div className="playlist-page collection-page" style={{ ['--hero-hue' as string]: collection.hue }}>
      <div className="playlist-hero">
        <div className={`hero-cover ${kind === 'artist' ? 'is-artist' : ''}`}>
          <Cover hue={collection.hue} variant={kind === 'artist' ? 3 : 2} label={name} />
        </div>

        <div className="hero-info" ref={infoRef}>
          <span className="hero-eyebrow">{kind === 'artist' ? '歌手' : '专辑'}</span>
          <h1 className="hero-title" ref={titleRef}>
            {name}
          </h1>
          <div className="hero-meta">
            {kind === 'artist' ? (
              <>
                <span>{collection.tracks.length} 首歌</span>
                <span>·</span>
                <span>{collection.albums.length} 张专辑</span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="collection-artist-link"
                  onClick={() => navigate({ name: 'artist', id: collection.albumArtist })}
                >
                  {collection.albumArtist}
                </button>
                <span>·</span>
                <span>{collection.tracks.length} 首歌</span>
              </>
            )}
            <span>·</span>
            <span>{collection.duration}</span>
          </div>
        </div>
      </div>

      <div className="playlist-actions">
        <button type="button" className="big-play" onClick={playAll} aria-label="播放">
          <Icon name="play" size={24} />
        </button>
        <button
          type="button"
          className={`round-btn ${player.shuffle ? 'is-on' : ''}`}
          onClick={shuffleAll}
          title="随机播放"
        >
          <Icon name="shuffle" size={22} />
        </button>
        <button
          type="button"
          className="icon-btn action-icon"
          onClick={() => toast(kind === 'artist' ? '已关注这位歌手（假的）' : '已收藏这张专辑')}
          title={kind === 'artist' ? '关注' : '收藏'}
        >
          <Icon name={kind === 'artist' ? 'user' : 'heart'} size={24} />
        </button>
        <button type="button" className="icon-btn action-icon" onClick={() => toast('更多操作')} title="更多">
          <Icon name="more" size={24} />
        </button>
      </div>

      <div className="playlist-tracks">
        <TrackList ids={collection.ids} contextName={name} showAlbum={kind === 'artist'} showDate={false} />
      </div>

      {kind === 'artist' && collection.albums.length > 0 && (
        <section className="artist-albums">
          <h2>专辑</h2>
          <div className="card-row">
            {collection.albums.map((album) => {
              const albumIds = collection.albumTracks(album.name);
              return (
                <MediaCard
                  key={album.name}
                  title={album.name}
                  subtitle={`${album.tracks} 首`}
                  hue={album.hue}
                  variant={2}
                  onClick={() => navigate({ name: 'album', id: album.name })}
                  onPlay={() => {
                    if (albumIds[0]) player.play(albumIds[0], albumIds, album.name);
                  }}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
