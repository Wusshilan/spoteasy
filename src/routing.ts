export type Route =
  | { name: 'home' }
  | { name: 'search'; q?: string }
  | { name: 'playlist'; id: string }
  | { name: 'artist'; id: string }
  | { name: 'album'; id: string }
  | { name: 'cloudArtist'; id: string }
  | { name: 'cloudArtistAlbums'; id: string }
  | { name: 'cloudAlbum'; id: string }
  | { name: 'cloudDaily' }
  | { name: 'cloudLiked' }
  | { name: 'podcast'; id: string }
  | { name: 'mv'; id: string }
  | { name: 'section'; id: string }
  | { name: 'browse' }
  | { name: 'whatsNew' }
  | { name: 'following' }
  | { name: 'library' }
  | { name: 'local' }
  | { name: 'settings' };

export function parseHash(hash: string = window.location.hash): Route {
  const raw = hash.replace(/^#/, '');
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'playlist' && parts[1]) return { name: 'playlist', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'artist' && parts[1]) return { name: 'artist', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'album' && parts[1]) return { name: 'album', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'cloud-artist' && parts[1]) return { name: 'cloudArtist', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'cloud-artist-albums' && parts[1]) return { name: 'cloudArtistAlbums', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'cloud-album' && parts[1]) return { name: 'cloudAlbum', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'cloud-daily') return { name: 'cloudDaily' };
  if (parts[0] === 'cloud-liked') return { name: 'cloudLiked' };
  if (parts[0] === 'podcast' && parts[1]) return { name: 'podcast', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'mv' && parts[1]) return { name: 'mv', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'section' && parts[1]) return { name: 'section', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'browse') return { name: 'browse' };
  if (parts[0] === 'whats-new') return { name: 'whatsNew' };
  if (parts[0] === 'following') return { name: 'following' };
  if (parts[0] === 'library') return { name: 'library' };
  if (parts[0] === 'local') return { name: 'local' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'search') {
    const q = params.get('q');
    return q ? { name: 'search', q } : { name: 'search' };
  }
  return { name: 'home' };
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'playlist':
      return `#/playlist/${encodeURIComponent(route.id)}`;
    case 'search':
      return route.q ? `#/search?q=${encodeURIComponent(route.q)}` : '#/search';
    case 'artist':
      return `#/artist/${encodeURIComponent(route.id)}`;
    case 'album':
      return `#/album/${encodeURIComponent(route.id)}`;
    case 'cloudArtist':
      return `#/cloud-artist/${encodeURIComponent(route.id)}`;
    case 'cloudArtistAlbums':
      return `#/cloud-artist-albums/${encodeURIComponent(route.id)}`;
    case 'cloudAlbum':
      return `#/cloud-album/${encodeURIComponent(route.id)}`;
    case 'cloudDaily':
      return '#/cloud-daily';
    case 'cloudLiked':
      return '#/cloud-liked';
    case 'podcast':
      return `#/podcast/${encodeURIComponent(route.id)}`;
    case 'mv':
      return `#/mv/${encodeURIComponent(route.id)}`;
    case 'section':
      return `#/section/${encodeURIComponent(route.id)}`;
    case 'browse':
      return '#/browse';
    case 'whatsNew':
      return '#/whats-new';
    case 'following':
      return '#/following';
    case 'library':
      return '#/library';
    case 'local':
      return '#/local';
    case 'settings':
      return '#/settings';
    default:
      return '#/home';
  }
}

export function parseHashExtras(hash: string = window.location.hash) {
  const raw = hash.replace(/^#/, '');
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  return {
    panel: params.get('panel'),
    tab: params.get('tab'),
    accent: params.get('accent'),
    menu: params.get('menu'),
    collapsed: params.get('collapsed'),
    overlay: params.get('overlay'),
    lib: params.get('lib'),
    tip: params.get('tip'),
    mock: params.get('mock'),
    track: params.get('track'),
    full: params.get('full'),
    np: params.get('np'),
    lyrics: params.get('lyrics'),
    mini: params.get('mini'),
    view: params.get('view'),
  };
}
