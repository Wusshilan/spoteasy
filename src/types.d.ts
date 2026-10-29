import type { Playlist, Track } from './data/mock';
import type { MiniCommand, MiniState } from './mini';

export {};

declare global {
  interface LibraryPayload {
    folders: string[];
    tracks: Track[];
  }

  interface LibraryStats {
    path: string;
    bytes: number;
    tracks: number;
    folders: number;
    missing: number;
    covers: number;
  }

  interface TrackPatch {
    title?: string;
    artist?: string;
    album?: string;
    coverUrl?: string | null;
  }

  interface NeteaseSearchResult {
    tracks: Track[];
    hasMore: boolean;
    code?: number;
    error?: string;
  }

  interface FriendEventMedia {
    kind: 'song' | 'album' | 'playlist' | 'mv';
    id?: number;
    title: string;
    subtitle?: string;
    coverUrl?: string;
    track?: Track;
  }

  interface FriendEvent {
    id: string;
    threadId: string;
    type: number;
    typeDesc?: string;
    time: number;
    user: { id?: number; name: string; avatarUrl?: string };
    text?: string;
    media?: FriendEventMedia | null;
    images: string[];
    liked: boolean;
    likedCount: number;
  }

  interface FriendEventPage {
    events: FriendEvent[];
    lasttime?: number;
    more?: boolean;
    error?: string;
  }

  interface NeteaseLyric {
    lrc: string;
    translation: string;
    code?: number;
    error?: string;
  }

  interface NeteaseStatus {
    loggedIn: boolean;
    premium: boolean;
    nickname: string;
    avatar?: string;
    uid?: number;
    sessionExpired?: boolean;
  }

  interface NeteasePublicUser {
    uid: number;
    nickname: string;
    avatarUrl?: string;
    signature?: string;
    follows?: number;
    followeds?: number;
    playlistCount?: number;
    level?: number;
  }

  interface NeteaseUserSearchResult {
    users: NeteasePublicUser[];
    hasMore: boolean;
    error?: string;
  }

  interface NeteasePublicProfile {
    profile: NeteasePublicUser | null;
    playlists: Playlist[];
    likedPlaylist: Playlist | null;
    error?: string;
  }

  interface NeteaseQr {
    key: string;
    qrimg: string;
  }

  interface NeteaseQrCheck {
    code: number;
    status?: NeteaseStatus;
  }

  interface NeteasePlaylistDetail {
    playlist: Playlist | null;
    tracks: Track[];
    hasMore?: boolean;
    error?: string;
  }

  interface NeteasePodcast {
    id: string;
    cloudId: number;
    source: 'netease';
    name: string;
    djName: string;
    coverUrl?: string;
    hue: number;
    variant: number;
    followed?: boolean;
    programCount?: number;
    description?: string;
    subscriberCount?: number;
    createTime?: number;
    lastProgramCreateTime?: number;
  }

  interface NeteasePodcastDetail {
    podcast: NeteasePodcast | null;
    programs: Track[];
    hasMore?: boolean;
    error?: string;
  }

  interface NeteasePodcastPrograms {
    programs: Track[];
    hasMore: boolean;
    error?: string;
  }

  interface NeteasePodcastSearchResult {
    podcasts: NeteasePodcast[];
    hasMore: boolean;
    error?: string;
  }

  interface NeteaseArtist {
    id: string;
    cloudId: number;
    source: 'netease';
    name: string;
    avatarUrl?: string;
    albumSize: number;
    musicSize: number;
    followers: number;
    hue: number;
    variant: number;
    followed?: boolean;
    description?: string;
  }

  interface NeteaseAlbum {
    id: string;
    cloudId: number;
    source: 'netease';
    name: string;
    artist: string;
    artists: Array<{ id?: number; name: string }>;
    artistId?: number;
    coverUrl?: string;
    size: number;
    publishTime: number;
    albumType?: string;
    hue: number;
    variant: number;
    isSub?: boolean;
  }

  interface NeteaseArtistDetail {
    artist: NeteaseArtist | null;
    tracks: Track[];
    error?: string;
  }

  interface NeteaseAlbumDetail {
    album: NeteaseAlbum | null;
    tracks: Track[];
    error?: string;
  }

  type NeteaseQuality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires';

  interface NeteaseArtistAlbumsResult {
    albums: NeteaseAlbum[];
    hasMore: boolean;
    error?: string;
  }

  interface NeteaseArtistRelated {
    playlists: Playlist[];
    similarArtists: NeteaseArtist[];
    appearsOn: NeteaseAlbum[];
  }

  interface NeteaseMv {
    id: string;
    cloudId: number;
    name: string;
    artist: string;
    artistId?: number;
    coverUrl?: string;
    duration: number;
    playCount: number;
    publishTime: number;
    hue: number;
    variant: number;
  }

  interface NeteaseMvDetail {
    mv: NeteaseMv | null;
    error?: string;
  }

  interface NeteaseHome {
    recommended: Playlist[];
    resource: Playlist[];
    top: Playlist[];
    charts: Playlist[];
    newSongs: Track[];
  }

  interface AppInfo {
    version: string;
    electron: string;
    chrome: string;
    node: string;
    userData: string;
    libraryPath: string;
  }

  interface Window {
    spoteasy?: {
      platform: string;
      win: {
        minimize(): void;
        toggleMaximize(): void;
        close(): void;
        isMaximized(): Promise<boolean>;
        onMaximized(cb: (value: boolean) => void): () => void;
      };
      mini: {
        open(): Promise<boolean>;
        close(): Promise<void>;
        getState(): Promise<MiniState | null>;
        publish(state: MiniState): void;
        command(command: MiniCommand): void;
        focusMain(): void;
        onState(cb: (state: MiniState) => void): () => void;
        onCommand(cb: (command: MiniCommand) => void): () => void;
        onClosed(cb: () => void): () => void;
      };
      library: {
        get(): Promise<LibraryPayload>;
        chooseFolder(): Promise<LibraryPayload>;
        addFolder(dir: string): Promise<LibraryPayload>;
        rescan(): Promise<LibraryPayload>;
        stats(): Promise<LibraryStats>;
        removeFolder(dir: string): Promise<LibraryPayload>;
        clear(): Promise<LibraryPayload>;
        updateTrack(id: string, patch: TrackPatch): Promise<LibraryPayload>;
        chooseCover(id: string): Promise<LibraryPayload>;
        prune(): Promise<LibraryPayload>;
        clearCovers(): Promise<LibraryPayload>;
        onProgress(cb: (progress: { done: number; total: number }) => void): () => void;
        onChanged(cb: (payload: LibraryPayload) => void): () => void;
      };
      app: {
        info(): Promise<AppInfo>;
        openDataFolder(): Promise<void>;
        installUpdate(url: string): Promise<{ ok: boolean; error?: string }>;
        latestRelease(): Promise<{
          version?: string;
          url?: string;
          assetUrl?: string;
          publishedAt?: string;
          notes?: string;
          error?: string;
        }>;
      };
      netease: {
        search(keyword: string, offset?: number, limit?: number): Promise<NeteaseSearchResult>;
        lyric(id: number): Promise<NeteaseLyric>;
        status(): Promise<NeteaseStatus>;
        searchUsers(keyword: string, offset?: number, limit?: number): Promise<NeteaseUserSearchResult>;
        publicProfile(uid: number): Promise<NeteasePublicProfile>;
        userPlaylists(): Promise<{ playlists: Playlist[]; error?: string }>;
        albumSublist(): Promise<{ albums: NeteaseAlbum[]; error?: string }>;
        artistSublist(): Promise<{ artists: NeteaseArtist[]; error?: string }>;
        artistRelated(id: number, name: string): Promise<NeteaseArtistRelated>;
        coverColor(url: string): Promise<{ hue: number | null; color?: string | null }>;
        likedIds(): Promise<{ ids: number[]; error?: string }>;
        likedTracks(): Promise<{ tracks: Track[]; error?: string }>;
        dailySongs(): Promise<{ tracks: Track[]; error?: string }>;
        friendEvents(lasttime?: number): Promise<FriendEventPage>;
        setLike(id: number, liked: boolean): Promise<{ ok: boolean; error?: string }>;
        artistSub(id: number, follow: boolean): Promise<{ ok: boolean; error?: string }>;
        albumSub(id: number, follow: boolean): Promise<{ ok: boolean; error?: string }>;
        playlistSubscribe(id: number, follow: boolean): Promise<{ ok: boolean; error?: string }>;
        playlistTrackAdd(id: number, trackIds: number[]): Promise<{ ok: boolean; error?: string }>;
        podcastSub(id: number, follow: boolean): Promise<{ ok: boolean; error?: string }>;
        searchMvs(
          keyword: string,
          offset?: number,
          limit?: number,
        ): Promise<{ mvs: NeteaseMv[]; hasMore: boolean; error?: string }>;
        searchPodcasts(
          keyword: string,
          offset?: number,
          limit?: number,
        ): Promise<NeteasePodcastSearchResult>;
        podcastSublist(): Promise<{ podcasts: NeteasePodcast[]; error?: string }>;
        podcastDetail(id: number, offset?: number, limit?: number): Promise<NeteasePodcastDetail>;
        podcastPrograms(id: number, offset?: number, limit?: number): Promise<NeteasePodcastPrograms>;
        qrStart(): Promise<NeteaseQr>;
        qrCheck(key: string): Promise<NeteaseQrCheck>;
        logout(): Promise<NeteaseStatus>;
        recommendPlaylists(): Promise<Playlist[]>;
        home(): Promise<NeteaseHome>;
        searchPlaylists(
          keyword: string,
          offset?: number,
          limit?: number,
        ): Promise<{ playlists: Playlist[]; hasMore: boolean; error?: string }>;
        playlist(id: number): Promise<NeteasePlaylistDetail>;
        playlistTracks(
          id: number,
          offset?: number,
          limit?: number,
        ): Promise<{ tracks: Track[]; hasMore: boolean; error?: string }>;
        searchArtists(
          keyword: string,
          offset?: number,
          limit?: number,
        ): Promise<{ artists: NeteaseArtist[]; hasMore: boolean; error?: string }>;
        searchAlbums(
          keyword: string,
          offset?: number,
          limit?: number,
        ): Promise<{ albums: NeteaseAlbum[]; hasMore: boolean; error?: string }>;
        artist(id: number): Promise<NeteaseArtistDetail>;
        artistStat(id: number): Promise<{ followers: number; error?: string }>;
        artistAlbums(id: number, limit?: number, offset?: number): Promise<NeteaseArtistAlbumsResult>;
        artistMvs(id: number, limit?: number, offset?: number): Promise<{ mvs: NeteaseMv[]; error?: string }>;
        mv(id: number): Promise<NeteaseMvDetail>;
        album(id: number): Promise<NeteaseAlbumDetail>;
      };
    };
  }
}
