import { getTrack, registerTracks, type Playlist, type Track } from '../data/mock';

export interface StoredFolder {
  id: string;
  name: string;
  playlistIds: string[];
  createdAt?: number;
}

interface StoredLibrary {
  playlists: Playlist[];
  folders: StoredFolder[];
  tracks: Record<string, Track>;
}

export interface LoadedLibrary {
  playlists: Playlist[];
  folders: StoredFolder[];
}

const KEY = 'spoteasy.customLibrary';

function readRaw(): StoredLibrary | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLibrary;
    if (!parsed || !Array.isArray(parsed.playlists) || !Array.isArray(parsed.folders)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadCustomLibrary(): LoadedLibrary {
  const raw = readRaw();
  if (!raw) return { playlists: [], folders: [] };
  const tracks = Object.values(raw.tracks || {}).filter(Boolean);
  registerTracks(tracks);
  return {
    playlists: raw.playlists.filter((playlist) => playlist && playlist.id && Array.isArray(playlist.tracks)),
    folders: raw.folders
      .filter((folder) => folder && folder.id && folder.name)
      .map((folder) => ({ ...folder, playlistIds: Array.isArray(folder.playlistIds) ? folder.playlistIds : [] })),
  };
}

export function saveCustomLibrary(playlists: Playlist[], folders: StoredFolder[]) {
  const tracks: Record<string, Track> = {};
  for (const playlist of playlists) {
    for (const id of playlist.tracks) {
      if (tracks[id]) continue;
      try {
        tracks[id] = getTrack(id);
      } catch {
        /* track gone; keep id, it will be skipped by getTrack if missing */
      }
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ playlists, folders, tracks }));
  } catch {
    /* quota; leave the previous snapshot */
  }
}
