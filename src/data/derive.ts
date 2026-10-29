import type { ArtistCard, Track } from './mock';

export interface AlbumCard {
  name: string;
  artist: string;
  tracks: number;
  hue: number;
}

function hueFor(name: string, offset = 0): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return (hash + offset) % 360;
}

/** 本地曲库 + 示例曲库合并后的歌手聚合。 */
export function deriveArtists(list: Track[]): ArtistCard[] {
  const counts = new Map<string, number>();
  for (const track of list) {
    const name = track.artist || '未知艺人';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({
    name,
    hue: hueFor(name),
    tracks: count,
  }));
}

/** 本地曲库 + 示例曲库合并后的专辑聚合。 */
export function deriveAlbums(list: Track[]): AlbumCard[] {
  const albums = new Map<string, { artist: string; tracks: number }>();
  for (const track of list) {
    const name = track.album || '未知专辑';
    const prev = albums.get(name);
    albums.set(name, {
      artist: prev?.artist || track.artist || '未知艺人',
      tracks: (prev?.tracks ?? 0) + 1,
    });
  }
  return [...albums.entries()].map(([name, value]) => ({
    name,
    artist: value.artist,
    tracks: value.tracks,
    hue: hueFor(name, 40),
  }));
}
