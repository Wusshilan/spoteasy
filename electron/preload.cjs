'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spoteasy', {
  platform: process.platform,
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    toggleMaximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:is-maximized'),
    onMaximized: (cb) => {
      const handler = (_e, value) => cb(value);
      ipcRenderer.on('win:maximized', handler);
      return () => ipcRenderer.removeListener('win:maximized', handler);
    },
  },
  mini: {
    open: () => ipcRenderer.invoke('mini:open'),
    close: () => ipcRenderer.invoke('mini:close'),
    getState: () => ipcRenderer.invoke('mini:get-state'),
    publish: (state) => ipcRenderer.send('mini:state', state),
    command: (command) => ipcRenderer.send('mini:command', command),
    focusMain: () => ipcRenderer.send('mini:focus-main'),
    onState: (cb) => {
      const handler = (_e, state) => cb(state);
      ipcRenderer.on('mini:state', handler);
      return () => ipcRenderer.removeListener('mini:state', handler);
    },
    onCommand: (cb) => {
      const handler = (_e, command) => cb(command);
      ipcRenderer.on('mini:command', handler);
      return () => ipcRenderer.removeListener('mini:command', handler);
    },
    onClosed: (cb) => {
      const handler = () => cb();
      ipcRenderer.on('mini:closed', handler);
      return () => ipcRenderer.removeListener('mini:closed', handler);
    },
  },
  library: {
    get: () => ipcRenderer.invoke('library:get'),
    chooseFolder: () => ipcRenderer.invoke('library:choose'),
    addFolder: (dir) => ipcRenderer.invoke('library:add-folder', dir),
    rescan: () => ipcRenderer.invoke('library:rescan'),
    stats: () => ipcRenderer.invoke('library:stats'),
    removeFolder: (dir) => ipcRenderer.invoke('library:remove-folder', dir),
    clear: () => ipcRenderer.invoke('library:clear'),
    updateTrack: (id, patch) => ipcRenderer.invoke('library:update-track', id, patch),
    chooseCover: (id) => ipcRenderer.invoke('library:choose-cover', id),
    prune: () => ipcRenderer.invoke('library:prune'),
    clearCovers: () => ipcRenderer.invoke('library:clear-covers'),
    onProgress: (cb) => {
      const handler = (_e, payload) => cb(payload);
      ipcRenderer.on('library:progress', handler);
      return () => ipcRenderer.removeListener('library:progress', handler);
    },
    onChanged: (cb) => {
      const handler = (_e, payload) => cb(payload);
      ipcRenderer.on('library:changed', handler);
      return () => ipcRenderer.removeListener('library:changed', handler);
    },
  },
  app: {
    info: () => ipcRenderer.invoke('app:info'),
    openDataFolder: () => ipcRenderer.invoke('app:open-data-folder'),
    latestRelease: () => ipcRenderer.invoke('app:latest-release'),
    installUpdate: (url) => ipcRenderer.invoke('app:install-update', url),
  },
  netease: {
    search: (keyword, offset, limit) => ipcRenderer.invoke('netease:search', keyword, offset, limit),
    lyric: (id) => ipcRenderer.invoke('netease:lyric', id),
    status: () => ipcRenderer.invoke('netease:status'),
    searchUsers: (keyword, offset, limit) => ipcRenderer.invoke('netease:search-users', keyword, offset, limit),
    publicProfile: (uid) => ipcRenderer.invoke('netease:public-profile', uid),
    publicFollowedArtists: (uid) => ipcRenderer.invoke('netease:public-followed-artists', uid),
    userPlaylists: () => ipcRenderer.invoke('netease:user-playlists'),
    albumSublist: () => ipcRenderer.invoke('netease:album-sublist'),
    artistSublist: () => ipcRenderer.invoke('netease:artist-sublist'),
    artistRelated: (id, name) => ipcRenderer.invoke('netease:artist-related', id, name),
    coverColor: (url) => ipcRenderer.invoke('netease:cover-color', url),
    likedIds: () => ipcRenderer.invoke('netease:liked-ids'),
    likedTracks: () => ipcRenderer.invoke('netease:liked-tracks'),
    dailySongs: () => ipcRenderer.invoke('netease:daily-songs'),
    friendEvents: (lasttime) => ipcRenderer.invoke('netease:friend-events', lasttime),
    setLike: (id, liked) => ipcRenderer.invoke('netease:like', id, liked),
    artistSub: (id, follow) => ipcRenderer.invoke('netease:artist-sub', id, follow),
    albumSub: (id, follow) => ipcRenderer.invoke('netease:album-sub', id, follow),
    playlistSubscribe: (id, follow) => ipcRenderer.invoke('netease:playlist-subscribe', id, follow),
    playlistTrackAdd: (id, trackIds) => ipcRenderer.invoke('netease:playlist-track-add', id, trackIds),
    podcastSub: (id, follow) => ipcRenderer.invoke('netease:podcast-sub', id, follow),
    searchPodcasts: (keyword, offset, limit) => ipcRenderer.invoke('netease:search-podcasts', keyword, offset, limit),
    searchMvs: (keyword, offset, limit) => ipcRenderer.invoke('netease:search-mvs', keyword, offset, limit),
    podcastSublist: () => ipcRenderer.invoke('netease:podcast-sublist'),
    podcastDetail: (id, offset, limit) => ipcRenderer.invoke('netease:podcast-detail', id, offset, limit),
    podcastPrograms: (id, offset, limit) => ipcRenderer.invoke('netease:podcast-programs', id, offset, limit),
    qrStart: () => ipcRenderer.invoke('netease:qr-start'),
    qrCheck: (key) => ipcRenderer.invoke('netease:qr-check', key),
    logout: () => ipcRenderer.invoke('netease:logout'),
    recommendPlaylists: () => ipcRenderer.invoke('netease:recommend-playlists'),
    home: () => ipcRenderer.invoke('netease:home'),
    homeGenres: () => ipcRenderer.invoke('netease:home-genres'),
    searchPlaylists: (keyword, offset, limit) => ipcRenderer.invoke('netease:search-playlists', keyword, offset, limit),
    playlist: (id) => ipcRenderer.invoke('netease:playlist', id),
    playlistTracks: (id, offset, limit) => ipcRenderer.invoke('netease:playlist-tracks', id, offset, limit),
    searchArtists: (keyword, offset, limit) => ipcRenderer.invoke('netease:search-artists', keyword, offset, limit),
    searchAlbums: (keyword, offset, limit) => ipcRenderer.invoke('netease:search-albums', keyword, offset, limit),
    artist: (id) => ipcRenderer.invoke('netease:artist', id),
    artistStat: (id) => ipcRenderer.invoke('netease:artist-stat', id),
    artistAvatar: (id) => ipcRenderer.invoke('netease:artist-avatar', id),
    artistAlbums: (id, limit, offset) => ipcRenderer.invoke('netease:artist-albums', id, limit, offset),
    artistMvs: (id, limit, offset) => ipcRenderer.invoke('netease:artist-mvs', id, limit, offset),
    mv: (id) => ipcRenderer.invoke('netease:mv', id),
    album: (id) => ipcRenderer.invoke('netease:album', id),
  },
});
