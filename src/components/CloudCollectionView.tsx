import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { MediaCard } from './MediaCard';
import { TrackList } from './TrackList';
import { formatCount, getTrack, playlistDuration, registerTracks, type Playlist, type Track } from '../data/mock';
import { usePlayer } from '../state/player';
import { useNetease } from '../state/netease';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

interface CloudCollectionViewProps {
  kind: 'artist' | 'album';
  cloudId: number;
  navigate(route: Route): void;
}

export function CloudCollectionView({ kind, cloudId, navigate }: CloudCollectionViewProps) {
  const player = usePlayer();
  const netease = useNetease();
  const { toast } = useUi();
  const [artist, setArtist] = useState<NeteaseArtist | null>(null);
  const [album, setAlbum] = useState<NeteaseAlbum | null>(null);
  const [albums, setAlbums] = useState<NeteaseAlbum[]>([]);
  const [moreAlbums, setMoreAlbums] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [allLikedTracks, setAllLikedTracks] = useState<Track[]>([]);
  const [related, setRelated] = useState<NeteaseArtistRelated>({
    playlists: [],
    similarArtists: [],
    appearsOn: [],
  });
  const [coverHue, setCoverHue] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hotExpanded, setHotExpanded] = useState(false);
  const [discographyTab, setDiscographyTab] = useState<'popular' | 'albums' | 'singles'>('popular');
  const [playlistsExpanded, setPlaylistsExpanded] = useState(false);
  const [fansExpanded, setFansExpanded] = useState(false);
  const [appearsExpanded, setAppearsExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });
  const [shareOpen, setShareOpen] = useState(false);
  const [blockedArtists, setBlockedArtists] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('spoteasy.blockedArtists');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const infoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setArtist(null);
    setAlbum(null);
    setAlbums([]);
    setMoreAlbums(false);
    setTracks([]);
    setAllLikedTracks([]);
    setRelated({ playlists: [], similarArtists: [], appearsOn: [] });
    setHotExpanded(false);
    setDiscographyTab('popular');
    setPlaylistsExpanded(false);
    setFansExpanded(false);
    setAppearsExpanded(false);
    const api = window.spoteasy?.netease;
    if (!api) {
      setError('服务 API 未加载');
      setLoading(false);
      return;
    }
    const emptyRelated: NeteaseArtistRelated = { playlists: [], similarArtists: [], appearsOn: [] };
    const request =
      kind === 'artist'
        ? Promise.all([
            api.artist(cloudId),
            api.artistAlbums(cloudId, 36, 0).catch(() => ({ albums: [] as NeteaseAlbum[], hasMore: false })),
          ]).then(([result, albumResult]) => {
            if (!result?.artist) throw new Error(result?.error || '找不到这位歌手');
            return {
              artist: result.artist,
              tracks: result.tracks,
              albums: albumResult.albums || [],
              moreAlbums: Boolean(albumResult.hasMore),
              related: emptyRelated,
            };
          })
        : api.album(cloudId).then((result) => {
            if (!result?.album) throw new Error(result?.error || '找不到这张专辑');
            return {
              album: result.album,
              tracks: result.tracks,
              albums: [] as NeteaseAlbum[],
              related: emptyRelated,
            };
          });

    request
      .then((result) => {
        if (!alive) return;
        registerTracks(result.tracks);
        if ('artist' in result) {
          setArtist(result.artist);
          setAlbums(result.albums);
          setMoreAlbums(result.moreAlbums);
          setFollowed(
            Boolean(result.artist.followed) ||
              netease.myArtists.some((item) => item.cloudId === cloudId),
          );
          api
            .artistRelated(cloudId, result.artist.name)
            .then((relation) => {
              if (alive) setRelated(relation);
            })
            .catch(() => undefined);
        } else {
          setAlbum(result.album);
          setSaved(Boolean(result.album.isSub));
        }
        setTracks(result.tracks);
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
  }, [cloudId, kind]);

  useEffect(() => {
    if (kind === 'artist') {
      if (netease.myArtists.some((item) => item.cloudId === cloudId)) setFollowed(true);
    }
  }, [cloudId, kind, netease.myArtists]);

  useEffect(() => {
    if (kind !== 'artist' || !netease.loggedIn) {
      setAllLikedTracks([]);
      return;
    }
    let alive = true;
    netease
      .likedTracks()
      .then((liked) => {
        if (!alive) return;
        registerTracks(liked);
        setAllLikedTracks(liked);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [kind, netease.loggedIn, netease.likedTracks]);

  useEffect(() => {
    setCoverHue(null);
    const url = kind === 'album' ? album?.coverUrl : artist?.avatarUrl;
    if (!url) return;
    let alive = true;
    window.spoteasy?.netease
      ?.coverColor(url)
      .then((result) => {
        if (alive && typeof result?.hue === 'number') setCoverHue(result.hue);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [album?.coverUrl, artist?.avatarUrl, kind]);

  const name = artist?.name || album?.name || '';
  const ids = useMemo(() => tracks.map((track) => track.id), [tracks]);
  const duration = useMemo(() => {
    const synthetic: Playlist = {
      id: `${kind}-${cloudId}`,
      name,
      desc: '',
      owner: '',
      hue: artist?.hue ?? album?.hue ?? 158,
      variant: 2,
      tracks: ids,
    };
    return playlistDuration(synthetic);
  }, [album?.hue, artist?.hue, cloudId, ids, kind, name]);

  const likedArtistTracks = useMemo(() => {
    if (kind !== 'artist') return [];
    const matches = (track: Track) =>
      Boolean(track.cloudArtistIds?.includes(cloudId)) ||
      track.artist === name ||
      track.artist.split(' / ').includes(name);
    const cloudLiked = allLikedTracks.filter(matches);
    const localLiked = [...player.liked]
      .map((id) => getTrack(id))
      .filter(
        (track) => matches(track) && !cloudLiked.some((item) => item.id === track.id),
      );
    return [...cloudLiked, ...localLiked];
  }, [allLikedTracks, cloudId, kind, name, player.liked]);

  const likedNewCount = useMemo(
    () =>
      likedArtistTracks.filter((track) => {
        if (!track.cloudAlbumId) return false;
        const item = albums.find((album) => album.cloudId === track.cloudAlbumId);
        return Boolean(item?.publishTime && Date.now() - item.publishTime < 30 * 86_400_000);
      }).length,
    [albums, likedArtistTracks],
  );

  const hotIds = hotExpanded ? ids.slice(0, 10) : ids.slice(0, 5);
  const latestAlbum = useMemo(
    () => [...albums].sort((a, b) => b.publishTime - a.publishTime)[0],
    [albums],
  );

  const discographyAlbums = useMemo(() => {
    const sorted = [...albums].sort((a, b) => b.publishTime - a.publishTime);
    const isAlbum = (item: NeteaseAlbum) =>
      item.albumType === '专辑' ||
      item.albumType === '精选辑' ||
      (!item.albumType && item.size > 1);
    if (discographyTab === 'albums') return sorted.filter(isAlbum);
    if (discographyTab === 'singles') return sorted.filter((item) => !isAlbum(item));
    return sorted;
  }, [albums, discographyTab]);

  const albumKindLabel = (item: NeteaseAlbum) => {
    if (item.albumType === 'Single') return '单曲';
    if (item.albumType === 'EP') return 'EP';
    if (item.albumType === '精选辑') return '精选辑';
    if (item.albumType === '专辑') return '专辑';
    return item.size > 1 ? '专辑' : '单曲';
  };

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
  }, [name]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || moreRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">CLOUD</div>
        <h2>{kind === 'artist' ? '这位歌手暂时打不开' : '这张专辑暂时打不开'}</h2>
        <p>{error}</p>
        <button type="button" className="primary-btn" onClick={() => navigate({ name: 'home' })}>
          回到首页
        </button>
      </div>
    );
  }

  if (loading || !name) {
    return (
      <div className="empty-state">
        <div className="empty-icon">…</div>
        <h2>{kind === 'artist' ? '正在加载歌手' : '正在加载专辑'}</h2>
        <p>正在拉取资料和曲目。</p>
      </div>
    );
  }

  const hue = coverHue ?? artist?.hue ?? album?.hue ?? 158;
  const year = album?.publishTime ? new Date(album.publishTime).getFullYear() : null;
  const playAll = () => {
    if (ids[0]) player.play(ids[0], ids, name);
  };
  const shuffleAll = () => {
    if (!ids.length) return;
    if (!player.shuffle) player.toggleShuffle();
    player.play(ids[Math.floor(Math.random() * ids.length)], ids, name);
    toast('已打乱播放顺序');
  };

  const toggleFollow = async () => {
    if (!netease.loggedIn) {
      toast('请先登录');
      netease.openLogin();
      return;
    }
    const api = window.spoteasy?.netease;
    if (!api) return;
    const next = !followed;
    const result = await api.artistSub(cloudId, next).catch(() => ({ ok: false }));
    if (!result.ok) {
      toast('操作失败');
      return;
    }
    setFollowed(next);
    toast(next ? '已关注' : '已取消关注');
    netease.refreshMyMusic();
  };

  const toggleSaved = async () => {
    if (!netease.loggedIn) {
      toast('请先登录');
      netease.openLogin();
      return;
    }
    const api = window.spoteasy?.netease;
    if (!api) return;
    const next = !saved;
    const result = await api.albumSub(cloudId, next).catch(() => ({ ok: false }));
    if (!result.ok) {
      toast('操作失败');
      return;
    }
    setSaved(next);
    toast(next ? '已收藏专辑' : '已取消收藏');
    netease.refreshMyMusic();
  };

  const openArtistMenu = () => {
    const rect = moreRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 248;
    const height = 248;
    setMenuPos({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width)),
      top: Math.min(window.innerHeight - height - 8, rect.bottom + 8),
    });
    setShareOpen(false);
    setMenuOpen((value) => !value);
  };

  const copyArtistLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://music.163.com/#/artist?id=${cloudId}`);
      toast('已复制艺人链接');
    } catch {
      toast('复制失败');
    }
    setMenuOpen(false);
  };

  const startArtistRadio = () => {
    if (!ids.length) {
      toast('暂无可用歌曲');
      setMenuOpen(false);
      return;
    }
    if (!player.shuffle) player.toggleShuffle();
    player.play(ids[Math.floor(Math.random() * ids.length)], ids, `${name} 电台`);
    toast('已开始艺人电台');
    setMenuOpen(false);
  };

  const blockThisArtist = () => {
    player.blockArtist(name);
    try {
      const raw = localStorage.getItem('spoteasy.blockedArtists');
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(name)) list.push(name);
      localStorage.setItem('spoteasy.blockedArtists', JSON.stringify(list));
      setBlockedArtists(list);
    } catch {
      /* ignore */
    }
    toast('已在本机屏蔽该艺人的歌曲');
    setMenuOpen(false);
  };

  const unblockThisArtist = () => {
    try {
      const raw = localStorage.getItem('spoteasy.blockedArtists');
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = list.filter((item) => item !== name);
      localStorage.setItem('spoteasy.blockedArtists', JSON.stringify(next));
      setBlockedArtists(next);
      toast('已取消屏蔽');
    } catch {
      /* ignore */
    }
    setMenuOpen(false);
  };

  const reportArtist = () => {
    window.open('https://music.163.com/st/staticdeal/complaints.html', '_blank', 'noopener');
    toast('已打开网易云举报页面');
    setMenuOpen(false);
  };

  return (
    <div
      className={`playlist-page collection-page ${kind === 'artist' ? 'is-artist-page' : ''}`}
      style={{
        ['--hero-hue' as string]: kind === 'album' && coverHue === null ? 0 : hue,
        ['--hero-sat' as string]: kind === 'album' && coverHue === null ? '0%' : '42%',
        ['--hero-sat2' as string]: kind === 'album' && coverHue === null ? '0%' : '30%',
      }}
    >
      <div className={`playlist-hero ${kind === 'artist' ? 'is-artist-hero' : ''}`}>
        {kind === 'artist' && (
          <>
            <div className="artist-hero-bg">
              <Cover hue={hue} variant={3} label={name} src={artist?.avatarUrl} />
            </div>
            <div className="artist-hero-shade" />
          </>
        )}
        <div className={`hero-cover ${kind === 'artist' ? 'is-artist' : ''}`}>
          <Cover
            hue={hue}
            variant={kind === 'artist' ? 3 : 2}
            label={name}
            src={kind === 'artist' ? artist?.avatarUrl : album?.coverUrl}
          />
        </div>

        <div className="hero-info" ref={infoRef}>
          <span className="hero-eyebrow">{kind === 'artist' ? '歌手' : '专辑'}</span>
          <h1 className="hero-title" ref={titleRef}>
            {name}
          </h1>
          <div className="hero-meta">
            {kind === 'artist' ? (
              <>
                {Boolean(artist?.followers) && (
                  <>
                    <span>{formatCount(artist?.followers ?? 0)} 位关注者</span>
                    <span>·</span>
                  </>
                )}
                <span>{tracks.length} 首热门</span>
                <span>·</span>
                <span>{artist?.albumSize ?? 0} 张专辑</span>
                <span>·</span>
                <span>{duration}</span>
              </>
            ) : (
              <>
                {album?.artists?.length ? (
                  album.artists.map((artistItem, index) => {
                    const artistId = artistItem.id || (index === 0 ? album.artistId : undefined);
                    return (
                      <span key={`${artistItem.name}-${index}`}>
                        {index > 0 && <span className="artist-sep"> / </span>}
                        <button
                          type="button"
                          className="collection-artist-link"
                          onClick={() => {
                            if (artistId) navigate({ name: 'cloudArtist', id: String(artistId) });
                            else navigate({ name: 'search', q: artistItem.name });
                          }}
                        >
                          {artistItem.name}
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <button
                    type="button"
                    className="collection-artist-link"
                    onClick={() => {
                      if (album?.artistId) navigate({ name: 'cloudArtist', id: String(album.artistId) });
                      else if (album?.artist) navigate({ name: 'search', q: album.artist });
                    }}
                  >
                    {album?.artist || '未知艺人'}
                  </button>
                )}
                <span>·</span>
                <span>{tracks.length} 首歌</span>
                <span>·</span>
                <span>{duration}</span>
                {year && (
                  <>
                    <span>·</span>
                    <span>{year}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className={`playlist-actions ${kind === 'artist' ? 'artist-actions' : ''}`}>
        <button type="button" className="big-play" onClick={playAll} aria-label="播放">
          <Icon name="play" size={24} />
        </button>
        {kind === 'artist' && latestAlbum && (
          <button
            type="button"
            className="artist-thumb"
            onClick={() => navigate({ name: 'cloudAlbum', id: String(latestAlbum.cloudId) })}
            aria-label={`打开专辑 ${latestAlbum.name}`}
            title={latestAlbum.name}
          >
            <Cover
              hue={latestAlbum.hue}
              variant={latestAlbum.variant}
              label={latestAlbum.name}
              src={latestAlbum.coverUrl}
            />
          </button>
        )}
        <button
          type="button"
          className={`round-btn ${player.shuffle ? 'is-on' : ''}`}
          onClick={shuffleAll}
          title="随机播放"
        >
          <Icon name="shuffle" size={kind === 'artist' ? 24 : 22} />
        </button>
        {kind === 'artist' ? (
          <button
            type="button"
            className={`pill-btn follow-pill ${followed ? 'is-on' : ''}`}
            onClick={toggleFollow}
          >
            {followed ? '已关注' : '关注'}
          </button>
        ) : (
          <button
            type="button"
            className={`pill-btn follow-pill ${saved ? 'is-on' : ''}`}
            onClick={toggleSaved}
          >
            <Icon name={saved ? 'check' : 'plus'} size={14} />
            {saved ? '已收藏' : '收藏'}
          </button>
        )}
        {kind === 'artist' && (
          <button
            type="button"
            ref={moreRef}
            className="round-btn artist-more"
            onClick={openArtistMenu}
            aria-label="更多操作"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="更多操作"
          >
            <Icon name="more" size={20} />
          </button>
        )}
      </div>

      {kind === 'artist' &&
        menuOpen &&
        createPortal(
          <div
            className="context-menu artist-menu"
            style={{ left: menuPos.left, top: menuPos.top }}
            ref={menuRef}
            role="menu"
          >
            <button
              type="button"
              className="cm-item"
              role="menuitem"
              onClick={() => {
                void toggleFollow();
                setMenuOpen(false);
              }}
            >
              <Icon name="userPlus" size={16} />
              <span>{followed ? '已关注' : '关注'}</span>
            </button>
            <button
              type="button"
              className="cm-item"
              role="menuitem"
              onClick={blockedArtists.includes(name) ? unblockThisArtist : blockThisArtist}
            >
              <Icon name="block" size={16} />
              <span>{blockedArtists.includes(name) ? '取消屏蔽此艺人' : '不要播放此艺人的歌曲'}</span>
            </button>
            <button type="button" className="cm-item" role="menuitem" onClick={startArtistRadio}>
              <Icon name="radio" size={16} />
              <span>转至艺人电台</span>
            </button>
            <button type="button" className="cm-item" role="menuitem" onClick={reportArtist}>
              <Icon name="alert" size={16} />
              <span>举报</span>
            </button>
            <div
              className="cm-row"
              onMouseEnter={() => setShareOpen(true)}
              onMouseLeave={() => setShareOpen(false)}
            >
              <button
                type="button"
                className="cm-item"
                role="menuitem"
                aria-haspopup="menu"
                onClick={() => setShareOpen((value) => !value)}
              >
                <Icon name="share" size={16} />
                <span>分享</span>
                <Icon name="chevronRight" size={14} className="cm-arrow" />
              </button>
              {shareOpen && (
                <div className="submenu" role="menu">
                  <div className="submenu-head">分享艺人</div>
                  <button type="button" className="submenu-item" onClick={copyArtistLink}>
                    <Icon name="link" size={15} />
                    <span>复制艺人链接</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {kind === 'artist' ? (
        <>
          <div className="section-head artist-popular-head">
            <h2>热门</h2>
          </div>
          <div className="playlist-tracks">
            <TrackList ids={hotIds} playIds={ids} contextName={name} showAlbum showDate={false} hideFooter />
          </div>
          {ids.length > 5 && (
            <button
              type="button"
              className="artist-more-songs"
              onClick={() => setHotExpanded((value) => !value)}
            >
              {hotExpanded ? '收起' : '查看更多'}
            </button>
          )}

          {likedArtistTracks.length > 0 && (
            <section className="artist-liked-section">
              <div className="section-head">
                <h2>你已点赞</h2>
              </div>
              <button
                type="button"
                className="artist-liked-card"
                onClick={() => navigate({ name: 'cloudLiked' })}
              >
                <span className="artist-liked-cover">
                  <Cover
                    hue={likedArtistTracks[0].hue}
                    variant={likedArtistTracks[0].variant}
                    label={name}
                    src={likedArtistTracks[0].coverUrl}
                  />
                  <span className="artist-liked-heart">
                    <Icon name="heartFill" size={12} />
                  </span>
                </span>
                <span className="artist-liked-copy">
                  <strong>
                    {likedArtistTracks.length} 首歌曲
                    {likedNewCount > 0 ? ` · ${likedNewCount} 首新歌` : ''}
                  </strong>
                  <span>创建者：{name}</span>
                </span>
              </button>
            </section>
          )}

          {albums.length > 0 && (
            <section className="artist-discography">
              <div className="section-head">
                <h2>唱片目录</h2>
                <button
                  type="button"
                  className="show-all"
                  onClick={() => navigate({ name: 'cloudArtistAlbums', id: String(cloudId) })}
                >
                  显示全部
                </button>
              </div>
              <div className="discography-tabs" role="tablist" aria-label="唱片目录筛选">
                {(
                  [
                    ['popular', '热门新歌'],
                    ['albums', '专辑'],
                    ['singles', '单曲和EP'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={discographyTab === key}
                    className={`discography-tab ${discographyTab === key ? 'is-active' : ''}`}
                    onClick={() => setDiscographyTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="card-row">
                {discographyAlbums.slice(0, 4).map((item) => {
                  const year = item.publishTime ? new Date(item.publishTime).getFullYear() : null;
                  return (
                    <MediaCard
                      key={item.id}
                      title={item.name}
                      subtitle={`${year ? `${year} · ` : ''}${albumKindLabel(item)}`}
                      hue={item.hue}
                      variant={item.variant}
                      coverUrl={item.coverUrl}
                      onClick={() => navigate({ name: 'cloudAlbum', id: String(item.cloudId) })}
                      onPlay={() => navigate({ name: 'cloudAlbum', id: String(item.cloudId) })}
                    />
                  );
                })}
              </div>
            </section>
          )}

          <section className="artist-about-section">
            <div className="section-head">
              <h2>关于</h2>
            </div>
            <div className="artist-about-card">
              <div className="artist-about-bg">
                <Cover
                  hue={artist?.hue ?? 158}
                  variant={artist?.variant ?? 2}
                  label={name}
                  src={artist?.avatarUrl}
                />
              </div>
              <div className="artist-about-scrim" />
              <div className="artist-about-copy">
                <h3>
                  {(artist?.followers ?? 0).toLocaleString('en-US')} 位关注者
                </h3>
                <p>{artist?.description || '暂无简介'}</p>
              </div>
            </div>
          </section>

          {related.playlists.length > 0 && (
            <section className="artist-related-playlists">
              <div className="section-head">
                <h2>含有此艺人的歌单</h2>
                {related.playlists.length > 4 && (
                  <button
                    type="button"
                    className="show-all"
                    onClick={() => setPlaylistsExpanded((value) => !value)}
                  >
                    {playlistsExpanded ? '收起' : '显示全部'}
                  </button>
                )}
              </div>
              <div className="artist-playlist-grid">
                {(playlistsExpanded ? related.playlists : related.playlists.slice(0, 4)).map(
                  (playlist) => (
                    <button
                      type="button"
                      key={playlist.id}
                      className="artist-playlist-card"
                      onClick={() => navigate({ name: 'playlist', id: playlist.id })}
                    >
                      <span className="artist-playlist-cover">
                        {playlist.mosaic && playlist.mosaic.length >= 2 ? (
                          <span className="artist-playlist-mosaic">
                            {playlist.mosaic.slice(0, 4).map((cover) => (
                              <img key={cover} src={cover} alt="" loading="lazy" />
                            ))}
                          </span>
                        ) : (
                          <Cover
                            hue={playlist.hue}
                            variant={playlist.variant}
                            label={playlist.name}
                            src={playlist.coverUrl}
                          />
                        )}
                      </span>
                      <span className="artist-playlist-name">{playlist.name}</span>
                      <span className="artist-playlist-owner">
                        创建者：{playlist.owner || '网易云用户'}
                      </span>
                      {playlist.desc && <span className="artist-playlist-desc">{playlist.desc}</span>}
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

          {related.similarArtists.length > 0 && (
            <section className="artist-fans">
              <div className="section-head">
                <h2>粉丝也喜欢</h2>
                {related.similarArtists.length > 4 && (
                  <button
                    type="button"
                    className="show-all"
                    onClick={() => setFansExpanded((value) => !value)}
                  >
                    {fansExpanded ? '收起' : '显示全部'}
                  </button>
                )}
              </div>
              <div className="artist-fan-grid">
                {(fansExpanded ? related.similarArtists : related.similarArtists.slice(0, 4)).map(
                  (similar) => (
                    <button
                      type="button"
                      key={similar.id}
                      className="artist-fan-card"
                      onClick={() => navigate({ name: 'cloudArtist', id: String(similar.cloudId) })}
                    >
                      <span className="artist-fan-cover">
                        <Cover
                          hue={similar.hue}
                          variant={similar.variant}
                          label={similar.name}
                          src={similar.avatarUrl}
                        />
                      </span>
                      <span className="artist-fan-name">{similar.name}</span>
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

          {related.appearsOn.length > 0 && (
            <section className="artist-appears-on">
              <div className="section-head">
                <h2>参与的专辑</h2>
                {related.appearsOn.length > 4 && (
                  <button
                    type="button"
                    className="show-all"
                    onClick={() => setAppearsExpanded((value) => !value)}
                  >
                    {appearsExpanded ? '收起' : '显示全部'}
                  </button>
                )}
              </div>
              <div className="card-row">
                {(appearsExpanded ? related.appearsOn : related.appearsOn.slice(0, 4)).map(
                  (item) => {
                    const year = item.publishTime ? new Date(item.publishTime).getFullYear() : null;
                    return (
                      <MediaCard
                        key={item.id}
                        title={item.name}
                        subtitle={`${year ? `${year} · ` : ''}${albumKindLabel(item)}`}
                        hue={item.hue}
                        variant={item.variant}
                        coverUrl={item.coverUrl}
                        onClick={() => navigate({ name: 'cloudAlbum', id: String(item.cloudId) })}
                        onPlay={() => navigate({ name: 'cloudAlbum', id: String(item.cloudId) })}
                      />
                    );
                  },
                )}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="playlist-tracks">
          <TrackList ids={ids} contextName={name} showAlbum={false} showDate={false} />
        </div>
      )}
    </div>
  );
}
