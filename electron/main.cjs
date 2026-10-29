'use strict';

const { app, BrowserWindow, ipcMain, shell, nativeTheme, nativeImage, dialog, protocol, safeStorage, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const os = require('node:os');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const netease = require('./netease/client.cjs');
const neteaseApi = require('NeteaseCloudMusicApi');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(1);

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'spoteasy-media',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
  {
    scheme: 'spoteasy-cloud',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
  {
    scheme: 'spoteasy-mv',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function argValue(prefix) {
  const hit = argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

const isShot = argv.some((a) => a.startsWith('--screenshot='));
const SHOT_FILE = argValue('--screenshot=');
const SHOT_SIZE = argValue('--shot-size=') || '1440x900';
const SHOT_ROUTE = argValue('--shot-route=');
const SHOT_CLICK = argValue('--shot-click=');
const EVAL_FILE = argValue('--eval-file=');
const MINI_SHOT = argValue('--mini-shot=');
const RENDER_SVG = argValue('--render-svg=');
const RENDER_OUT = argValue('--render-out=') || 'build/icon.png';
const RENDER_SIZE = parseInt(argValue('--render-size=') || '256', 10);
const USER_DATA = argValue('--user-data=');

// Screenshots / icon rendering must be deterministic: no GPU differences, no DPI surprises,
// and an isolated profile so an already running window never steals the lock.
if (isShot || RENDER_SVG) {
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  app.setPath('userData', path.join(os.tmpdir(), `spoteasy-shot-${process.pid}-${Date.now()}`));
}

if (USER_DATA) {
  app.setPath('userData', path.isAbsolute(USER_DATA) ? USER_DATA : path.join(ROOT, USER_DATA));
}

nativeTheme.themeSource = 'dark';
app.setAppUserModelId('com.spoteasy.app');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock && !isShot && !RENDER_SVG) {
  app.quit();
}

let win = null;
let miniWin = null;
let latestMiniState = null;
let neteaseCookie = '';
let neteaseHadSession = false;
let qrState = null;

function neteaseSessionFile() {
  return path.join(app.getPath('userData'), 'netease-session.bin');
}

function loadNeteaseSession() {
  try {
    const buffer = fs.readFileSync(neteaseSessionFile());
    neteaseCookie = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buffer)
      : buffer.toString('utf8');
    neteaseHadSession = Boolean(neteaseCookie);
  } catch {
    /* logged out */
  }
}

function saveNeteaseSession() {
  try {
    const file = neteaseSessionFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const buffer = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(neteaseCookie)
      : Buffer.from(neteaseCookie, 'utf8');
    fs.writeFileSync(file, buffer);
  } catch (err) {
    console.warn('[netease] session save failed', err?.message || err);
  }
}

function clearNeteaseSession() {
  neteaseCookie = '';
  neteaseHadSession = false;
  qrState = null;
  try {
    fs.unlinkSync(neteaseSessionFile());
  } catch {
    /* already gone */
  }
}

function cookiePairs(setCookies) {
  const map = new Map();
  for (const raw of setCookies || []) {
    const first = String(raw).split(';')[0];
    const index = first.indexOf('=');
    if (index > 0) map.set(first.slice(0, index).trim(), first.slice(index + 1).trim());
  }
  return [...map.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

function mergeCookies(base, next) {
  const map = new Map();
  for (const part of `${base || ''}; ${next || ''}`.split(';')) {
    const index = part.indexOf('=');
    if (index > 0) map.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return [...map.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

function coverWithSize(url, size) {
  if (!url) return undefined;
  const value = `param=${size}y${size}`;
  if (/[?&]param=/.test(url)) return url.replace(/([?&])param=[^&]*/, `$1${value}`);
  return url.includes('?') ? `${url}&${value}` : `${url}?${value}`;
}

function mapNeteasePlaylist(raw) {
  const id = Number(raw?.id);
  return {
    id: `ne-pl-${id}`,
    cloudId: id,
    source: 'netease',
    name: raw?.name || '网易云歌单',
    desc: raw?.description || '',
    owner:
      raw?.creator?.nickname ||
      raw?.creator?.name ||
      raw?.owner?.nickname ||
      raw?.user?.nickname ||
      '网易云音乐',
    hue: netease.hashHue(id),
    variant: Math.abs(id) % 8,
    tracks: [],
    coverUrl: coverWithSize(raw?.coverImgUrl || raw?.picUrl, 800),
    playCount: Number(raw?.playCount || 0),
    trackCount: Number(raw?.trackCount || raw?.tracks?.length || 0),
    subscribed: Boolean(raw?.subscribed),
    specialType: Number(raw?.specialType || 0),
    createdAt: Number(raw?.createTime || 0) || undefined,
  };
}

function mapNeteaseArtist(raw) {
  const id = Number(raw?.id);
  return {
    id: `ne-artist-${id}`,
    cloudId: id,
    source: 'netease',
    name: raw?.name || '未知歌手',
    avatarUrl: coverWithSize(raw?.picUrl || raw?.avatar || raw?.img1v1Url, 800),
    albumSize: Number(raw?.albumSize || 0),
    musicSize: Number(raw?.musicSize || 0),
    followers: Number(raw?.fansCount || raw?.followerCount || 0),
    description: raw?.briefDesc || '',
    hue: netease.hashHue(id),
    variant: Math.abs(id) % 8,
    followed: Boolean(raw?.followed),
  };
}

function mapNeteaseMv(raw) {
  const id = Number(raw?.id);
  return {
    id: `ne-mv-${id}`,
    cloudId: id,
    name: raw?.name || 'MV',
    artist: raw?.artistName || raw?.artists?.[0]?.name || '',
    artistId: Number(raw?.artistId || raw?.artists?.[0]?.id || 0) || undefined,
    coverUrl: coverWithSize(raw?.cover || raw?.imgurl || raw?.picUrl, 1000),
    duration: Number(raw?.duration || 0),
    playCount: Number(raw?.playCount || 0),
    publishTime: Number(raw?.publishTime || 0),
    hue: netease.hashHue(id),
    variant: Math.abs(id) % 8,
  };
}

function mapNeteaseAlbum(raw, songs = []) {
  const id = Number(raw?.id);
  const rawArtists = Array.isArray(raw?.artists) && raw.artists.length
    ? raw.artists
    : raw?.artist?.name
      ? [raw.artist]
      : [];
  const songArtists = songs.flatMap((song) => song.ar || song.artists || []);
  const artistMap = new Map();
  for (const artist of [...rawArtists, ...songArtists]) {
    if (artist?.name && !artistMap.has(artist.name)) {
      artistMap.set(artist.name, { id: artist.id, name: artist.name });
    }
  }
  const artists = [...artistMap.values()];
  const artistName = artists.map((artist) => artist.name).join(' / ') || '未知艺人';
  return {
    id: `ne-album-${id}`,
    cloudId: id,
    source: 'netease',
    name: raw?.name || '未知专辑',
    artist: artistName,
    artists,
    artistId: artists[0]?.id,
    coverUrl: coverWithSize(raw?.picUrl, 800),
    size: Number(raw?.size || songs.length || 0),
    albumType: raw?.type || '',
    publishTime: Number(raw?.publishTime || 0),
    hue: netease.hashHue(id),
    variant: Math.abs(id) % 8,
    isSub: Boolean(raw?.isSub || raw?.subscribed),
  };
}

function mapNeteasePodcast(raw) {
  const id = Number(raw?.id);
  const dj = raw?.dj || {};
  return {
    id: `ne-podcast-${id}`,
    cloudId: id,
    source: 'netease',
    name: raw?.name || '播客',
    djName: dj?.nickname || raw?.djName || '播客',
    coverUrl: coverWithSize(raw?.picUrl || raw?.coverUrl || raw?.coverImgUrl || dj?.avatarUrl, 800),
    hue: netease.hashHue(id),
    variant: Math.abs(id) % 8,
    followed: Boolean(dj?.followed || raw?.subscribed),
    programCount: Number(raw?.programCount || 0),
    description: raw?.desc || raw?.description || '',
    subscriberCount: Number(raw?.subCount || raw?.subscriberCount || 0),
    createTime: Number(raw?.createTime || 0),
    lastProgramCreateTime: Number(raw?.lastProgramCreateTime || 0),
  };
}

function mapNeteasePodcastProgram(raw) {
  const id = Number(raw?.id);
  const mainSong = raw?.mainSong || {};
  const songId = Number(mainSong?.id || raw?.mainSongId || 0);
  const radio = raw?.radio || {};
  const radioId = Number(radio?.id || raw?.radioId || 0);
  return {
    id: `ne-program-${id}`,
    title: raw?.name || mainSong?.name || '播客节目',
    artist: radio?.name || raw?.radioName || '播客',
    album: radio?.name || '播客',
    duration: Number(raw?.duration || mainSong?.duration || 0) / 1000,
    hue: netease.hashHue(id || songId),
    variant: Math.abs(id || songId) % 8,
    plays: Number(raw?.playCount || raw?.listenerCount || 0),
    source: 'netease',
    cloudId: songId || undefined,
    mediaUrl: songId ? `spoteasy-cloud://stream/${songId}` : undefined,
    coverUrl: coverWithSize(raw?.coverUrl || radio?.picUrl || mainSong?.album?.picUrl, 800),
    programId: id,
    radioId,
    publishedAt: Number(raw?.createTime || 0),
    description: raw?.description || '',
    serialNum: Number(raw?.serialNum || 0),
    available: Boolean(songId),
  };
}

function mapFriendEvent(raw) {
  let json = {};
  try {
    json = typeof raw?.json === 'string' ? JSON.parse(raw.json) : (raw?.json || {});
  } catch {
    json = {};
  }

  let media = null;
  if (json?.song) {
    const track = netease.normalizeTrack(json.song);
    media = {
      kind: 'song',
      id: track.cloudId,
      title: track.title,
      subtitle: track.artist,
      coverUrl: track.coverUrl,
      track,
    };
  } else if (json?.album) {
    const album = json.album;
    media = {
      kind: 'album',
      id: Number(album.id),
      title: album.name || '专辑',
      subtitle: album.artist?.name || album.artist || '',
      coverUrl: coverWithSize(album.picUrl, 240),
    };
  } else if (json?.playlist) {
    const playlist = json.playlist;
    media = {
      kind: 'playlist',
      id: Number(playlist.id),
      title: playlist.name || '歌单',
      subtitle: playlist.creator?.nickname || '',
      coverUrl: coverWithSize(playlist.coverImgUrl, 240),
    };
  } else if (json?.mv) {
    const mv = json.mv;
    media = {
      kind: 'mv',
      id: Number(mv.id),
      title: mv.name || '视频',
      subtitle: mv.artistName || '',
      coverUrl: coverWithSize(mv.cover, 240),
    };
  }

  const text = [json?.msg, json?.title]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
  const images = (raw?.pics || [])
    .map((pic) => pic?.picUrl || pic?.originUrl)
    .filter(Boolean);
  const user = raw?.user || {};
  const kindLabel = media
    ? { song: '分享单曲', album: '分享专辑', playlist: '分享歌单', mv: '分享视频' }[media.kind]
    : images.length
      ? '发布图片'
      : '发布动态';

  return {
    id: String(raw?.id ?? raw?.uuid ?? ''),
    threadId: String(raw?.threadId ?? raw?.info?.threadId ?? ''),
    type: Number(raw?.type || 0),
    typeDesc: raw?.typeDesc || kindLabel,
    time: Number(raw?.eventTime || 0),
    user: {
      id: user.userId,
      name: user.nickname || '好友',
      avatarUrl: user.avatarUrl,
    },
    text,
    media,
    images,
    liked: Boolean(raw?.info?.liked),
    likedCount: Number(raw?.info?.likedCount || 0),
  };
}

const coverHueCache = new Map();
const coverColorCache = new Map();

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

async function coverHue(url) {
  const key = String(url || '');
  if (!key) return null;
  if (coverHueCache.has(key)) return coverHueCache.get(key);
  try {
    const response = await fetch(key, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Referer: 'https://music.163.com/',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`cover ${response.status}`);
    const image = nativeImage.createFromBuffer(Buffer.from(await response.arrayBuffer()));
    if (image.isEmpty()) throw new Error('empty cover');
    const small = image.resize({ width: 16, height: 16 });
    const bitmap = small.toBitmap();
    const buckets = Array.from({ length: 36 }, () => ({ w: 0, x: 0, y: 0, r: 0, g: 0, b: 0 }));
    let fallbackH = 0;
    let fallbackW = 0;
    for (let i = 0; i < bitmap.length; i += 4) {
      const b = bitmap[i];
      const g = bitmap[i + 1];
      const r = bitmap[i + 2];
      const { h, s, l } = rgbToHsl(r, g, b);
      const w = s * (1 - Math.min(1, Math.abs(l - 0.5) * 1.6));
      if (s < 0.08 || l < 0.07 || l > 0.93) continue;
      fallbackH += Math.cos((h * Math.PI) / 180) * w;
      fallbackW += Math.sin((h * Math.PI) / 180) * w;
      const bucket = buckets[Math.round(h / 10) % 36];
      bucket.w += w;
      bucket.x += Math.cos((h * Math.PI) / 180) * w;
      bucket.y += Math.sin((h * Math.PI) / 180) * w;
      bucket.r += r * w;
      bucket.g += g * w;
      bucket.b += b * w;
    }
    let best = buckets[0];
    for (const bucket of buckets) if (bucket.w > best.w) best = bucket;
    let hue;
    if (best.w > 0.02) {
      hue = Math.round(((Math.atan2(best.y, best.x) * 180) / Math.PI + 360) % 360);
    } else if (fallbackW > 0) {
      hue = Math.round(((Math.atan2(fallbackW, fallbackH) * 180) / Math.PI + 360) % 360);
    } else {
      hue = null;
    }
    coverHueCache.set(key, hue);
    let color = null;
    if (best.w > 0.02) {
      const red = Math.round(best.r / best.w);
      const green = Math.round(best.g / best.w);
      const blue = Math.round(best.b / best.w);
      const hsl = rgbToHsl(red, green, blue);
      const lightness = Math.max(0.24, Math.min(0.4, hsl.l * 0.82));
      const saturation = Math.max(0.42, Math.min(0.7, hsl.s));
      color = `hsl(${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`;
    } else if (typeof hue === 'number') {
      color = `hsl(${hue} 45% 28%)`;
    }
    coverColorCache.set(key, color);
    return hue;
  } catch (err) {
    console.warn('[cover-color]', err?.message || err);
    coverHueCache.set(key, null);
    coverColorCache.set(key, null);
    return null;
  }
}

async function neteaseStatus() {
  if (!neteaseCookie) {
    return {
      loggedIn: false,
      premium: false,
      nickname: '音乐爱好者',
      sessionExpired: neteaseHadSession,
    };
  }
  try {
    const result = await neteaseApi.login_status({ cookie: neteaseCookie });
    const data = result.body?.data;
    const profile = data?.profile;
    if (data?.code === 200 && profile) {
      return {
        loggedIn: true,
        premium: Number(data.account?.vipType || profile.vipType || 0) > 0,
        nickname: profile.nickname || '音乐爱好者',
        avatar: profile.avatarUrl,
        uid: Number(profile.userId || data.account?.id || 0) || undefined,
        sessionExpired: false,
      };
    }
  } catch (err) {
    console.warn('[netease] status failed', err?.message || err);
  }
  return {
    loggedIn: false,
    premium: false,
    nickname: '音乐爱好者',
    sessionExpired: neteaseHadSession,
  };
}

async function neteaseQrStart() {
  const keyResult = await neteaseApi.login_qr_key({ cookie: neteaseCookie });
  const unikey = keyResult.body?.data?.unikey;
  if (!unikey) throw new Error('无法获取二维码 key');
  const cookie = cookiePairs(keyResult.cookie);
  const createResult = await neteaseApi.login_qr_create({ key: unikey, qrimg: true, type: 3, cookie });
  qrState = { key: unikey, cookie };
  return {
    key: unikey,
    qrimg: createResult.body?.data?.qrimg || '',
  };
}

async function neteaseQrCheck(key) {
  const result = await neteaseApi.login_qr_check({
    key,
    type: 3,
    cookie: qrState?.cookie || neteaseCookie,
  });
  const code = result.body?.code;
  if (code === 803) {
    neteaseCookie = mergeCookies(neteaseCookie, cookiePairs(result.cookie));
    neteaseHadSession = true;
    saveNeteaseSession();
    cloudStreamCache.clear();
    qrState = null;
    return { code, status: await neteaseStatus() };
  }
  return { code: code ?? 801 };
}

/* --------------------------------------------------------------------------
   本地音乐库
   -------------------------------------------------------------------------- */

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.m4a', '.aac', '.wav', '.ogg', '.opus', '.webm']);
let library = { folders: [], tracks: [], overrides: {} };
let metadataModule = null;
let watchers = [];
let watchTimer = null;
let watchScanning = false;

function libraryFile() {
  return path.join(app.getPath('userData'), 'library.json');
}

function loadLibrary() {
  try {
    const raw = fs.readFileSync(libraryFile(), 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data?.tracks)) {
      library = {
        folders: Array.isArray(data.folders) ? data.folders.filter((f) => typeof f === 'string') : [],
        tracks: data.tracks.filter((t) => t && typeof t.path === 'string' && typeof t.id === 'string'),
        overrides: data.overrides && typeof data.overrides === 'object' ? data.overrides : {},
      };
    }
  } catch {
    /* first run */
  }
}

function saveLibrary() {
  try {
    const file = libraryFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(library));
  } catch (err) {
    console.error('[library] save failed', err);
  }
}

function getMetadataModule() {
  if (!metadataModule) metadataModule = import('music-metadata');
  return metadataModule;
}

function mediaUrlFor(file) {
  return `spoteasy-media://local/${Buffer.from(file).toString('base64url')}`;
}

function trackIdFor(file) {
  return `local-${crypto.createHash('sha1').update(file).digest('hex').slice(0, 16)}`;
}

function mimeFor(file) {
  switch (path.extname(file).toLowerCase()) {
    case '.mp3':
      return 'audio/mpeg';
    case '.flac':
      return 'audio/flac';
    case '.m4a':
    case '.aac':
      return 'audio/mp4';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
    case '.opus':
      return 'audio/ogg';
    case '.webm':
      return 'audio/webm';
    default:
      return 'application/octet-stream';
  }
}

async function collectAudioFiles(dir, out) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectAudioFiles(full, out);
    else if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
}

async function scanLibrary(folders, targetWindow) {
  const files = [];
  for (const folder of folders) await collectAudioFiles(folder, files);
  const uniqueFiles = [...new Set(files)];
  const previous = new Map(library.tracks.map((t) => [t.path, t]));
  const tracks = [];
  const total = uniqueFiles.length;
  let done = 0;

  const report = () => {
    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.webContents.send('library:progress', { done, total });
    }
  };
  report();

  const mm = await getMetadataModule();

  for (const file of uniqueFiles) {
    try {
      const meta = await mm.parseFile(file, { duration: true, skipCovers: false });
      const common = meta.common || {};
      const format = meta.format || {};
      const old = previous.get(file);
      let coverUrl = old?.coverUrl;
      const picture = common.picture?.[0];
      if (picture?.data) {
        try {
          const image = nativeImage.createFromBuffer(Buffer.from(picture.data));
          if (!image.isEmpty()) {
            const resized = image.resize({ width: 320, quality: 'good' });
            coverUrl = `data:image/jpeg;base64,${resized.toJPEG(82).toString('base64')}`;
          }
        } catch {
          /* ignore broken cover */
        }
      }

      const base = path.basename(file, path.extname(file));
      const id = trackIdFor(file);
      const seed = parseInt(id.slice(-3), 16) || 0;
      const track = {
        id,
        title: common.title || base,
        artist: common.artist || common.albumartist || '未知艺人',
        album: common.album || '未知专辑',
        duration: format.duration || 0,
        plays: 0,
        hue: seed % 360,
        variant: seed % 8,
        local: true,
        path: file,
        mediaUrl: mediaUrlFor(file),
        coverUrl,
        addedAt: old?.addedAt || Date.now(),
      };
      applyOverride(track, library.overrides?.[id]);
      tracks.push(track);
    } catch (err) {
      console.warn('[library] skip', file, err?.message || err);
    }
    done += 1;
    if (done % 5 === 0 || done === total) report();
  }

  const keepIds = new Set(tracks.map((track) => track.id));
  const overrides = {};
  for (const [id, value] of Object.entries(library.overrides || {})) {
    if (keepIds.has(id)) overrides[id] = value;
  }

  library = { folders: [...new Set(folders)], tracks, overrides };
  saveLibrary();
  return library;
}

function applyOverride(track, override) {
  if (!override || typeof override !== 'object') return;
  if (typeof override.title === 'string' && override.title) track.title = override.title;
  if (typeof override.artist === 'string' && override.artist) track.artist = override.artist;
  if (typeof override.album === 'string' && override.album) track.album = override.album;
  if (typeof override.coverUrl === 'string' && override.coverUrl.startsWith('data:image/')) {
    track.coverUrl = override.coverUrl;
  }
}

function syncWatchers() {
  for (const watcher of watchers) {
    try {
      watcher.close();
    } catch {
      /* ignore */
    }
  }
  watchers = [];
  for (const folder of library.folders) {
    try {
      const watcher = fs.watch(folder, { recursive: true }, () => scheduleWatchScan());
      watcher.on('error', () => {
        /* folder may be removed */
      });
      watchers.push(watcher);
    } catch (err) {
      console.warn('[library] watch failed', folder, err?.message || err);
    }
  }
}

function scheduleWatchScan() {
  if (!library.folders.length) return;
  if (watchTimer) clearTimeout(watchTimer);
  watchTimer = setTimeout(async () => {
    watchTimer = null;
    if (watchScanning || !win || win.isDestroyed()) return;
    watchScanning = true;
    try {
      const data = await scanLibrary(library.folders, win);
      if (win && !win.isDestroyed()) win.webContents.send('library:changed', data);
    } catch (err) {
      console.error('[library] watch scan failed', err);
    } finally {
      watchScanning = false;
    }
  }, 1200);
}

function registerMediaProtocol() {
  protocol.handle('spoteasy-media', async (request) => {    try {
      const url = new URL(request.url);
      const encoded = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      const filePath = Buffer.from(encoded, 'base64url').toString('utf8');
      const allowed = library.tracks.some((track) => track.path === filePath);
      if (!allowed) return new Response('forbidden', { status: 403 });

      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) return new Response('not found', { status: 404 });

      const total = stat.size;
      const type = mimeFor(filePath);
      const range = request.headers.get('range');

      if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range);
        let start = match?.[1] ? parseInt(match[1], 10) : 0;
        let end = match?.[2] ? parseInt(match[2], 10) : total - 1;
        if (!Number.isFinite(start) || start < 0) start = 0;
        if (!Number.isFinite(end) || end >= total) end = total - 1;
        if (start > end) {
          return new Response('range not satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${total}` },
          });
        }
        const stream = fs.createReadStream(filePath, { start, end });
        return new Response(Readable.toWeb(stream), {
          status: 206,
          headers: {
            'Content-Type': type,
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
          },
        });
      }

      return new Response(Readable.toWeb(fs.createReadStream(filePath)), {
        status: 200,
        headers: {
          'Content-Type': type,
          'Content-Length': String(total),
          'Accept-Ranges': 'bytes',
        },
      });
    } catch (err) {
      console.error('[media] failed', err);
      return new Response('not found', { status: 404 });
    }
  });
}

const cloudStreamCache = new Map();

async function officialSongUrl(id, level) {
  try {
    const result = await neteaseApi.song_url({
      id: Number(id),
      level: level || 'exhigh',
      cookie: neteaseCookie,
    });
    const data = result?.body?.data?.[0];
    return data?.url ? data : null;
  } catch {
    return null;
  }
}

async function resolveCloudStream(id, level) {
  const key = `${id}:${level}`;
  const cached = cloudStreamCache.get(key);
  if (cached && Date.now() - cached.at < 8 * 60 * 1000 && cached.data?.url) return cached.data;
  let data = await netease.songUrl(id, level, neteaseCookie);
  // 网易云的 weapi 地址偶尔会返回 -110 / 空 data，官方接口作为兜底。
  if (!data?.url) data = await officialSongUrl(id, level);
  if (!data?.url && level !== 'standard') {
    data = await netease.songUrl(id, 'standard', neteaseCookie);
    if (!data?.url) data = await officialSongUrl(id, 'standard');
  }
  if (data?.url) cloudStreamCache.set(key, { data, at: Date.now() });
  return data;
}

function registerCloudProtocol() {
  protocol.handle('spoteasy-cloud', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'stream') return new Response('not found', { status: 404 });
      const id = Number(url.pathname.replace(/^\/+/, ''));
      if (!Number.isFinite(id)) return new Response('bad id', { status: 400 });
      const level = url.searchParams.get('level') || 'exhigh';
      let data = await resolveCloudStream(id, level);
      if (!data?.url) return new Response('unavailable', { status: 404 });

      const range = request.headers.get('range');
      const headers = {
        Referer: 'https://music.163.com/',
        'User-Agent': netease.UA,
      };
      if (range) headers.Range = range;

      let upstream = await fetch(data.url, { headers, redirect: 'follow' });
      if ((upstream.status === 403 || upstream.status === 404) && cloudStreamCache.delete(`${id}:${level}`)) {
        data = await resolveCloudStream(id, level);
        if (data?.url) upstream = await fetch(data.url, { headers, redirect: 'follow' });
      }
      if (!upstream.ok && upstream.status !== 206) {
        return new Response('upstream error', { status: upstream.status || 502 });
      }

      const outHeaders = new Headers();
      for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(name);
        if (value) outHeaders.set(name, value);
      }
      outHeaders.set('Cache-Control', 'no-store');
      return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
    } catch (err) {
      console.error('[cloud] stream failed', err?.message || err);
      return new Response('stream failed', { status: 502 });
    }
  });
}

const mvUrlCache = new Map();

async function resolveMvUrl(id) {
  const key = String(id);
  const cached = mvUrlCache.get(key);
  if (cached && Date.now() - cached.at < 15 * 60 * 1000 && cached.url) return cached.url;
  const result = await neteaseApi.mv_url({ id, r: 1080, cookie: neteaseCookie });
  const url = result.body?.data?.url || '';
  if (url) mvUrlCache.set(key, { url, at: Date.now() });
  return url;
}

function registerMvProtocol() {
  protocol.handle('spoteasy-mv', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'mv') return new Response('not found', { status: 404 });
      const id = Number(url.pathname.replace(/^\/+/, ''));
      if (!Number.isFinite(id)) return new Response('bad id', { status: 400 });
      const target = await resolveMvUrl(id);
      if (!target) return new Response('unavailable', { status: 404 });

      const range = request.headers.get('range');
      const headers = {
        Referer: 'https://music.163.com/',
        'User-Agent': netease.UA,
      };
      if (range) headers.Range = range;
      const upstream = await fetch(target, { headers, redirect: 'follow' });
      if (!upstream.ok && upstream.status !== 206) {
        return new Response('upstream error', { status: upstream.status || 502 });
      }
      const outHeaders = new Headers();
      for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(name);
        if (value) outHeaders.set(name, value);
      }
      outHeaders.set('Cache-Control', 'no-store');
      return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
    } catch (err) {
      console.error('[mv] stream failed', err?.message || err);
      return new Response('stream failed', { status: 502 });
    }
  });
}

function createWindow() {
  const [w, h] = SHOT_SIZE.split('x').map((n) => parseInt(n, 10));
  const width = Number.isFinite(w) ? w : 1440;
  const height = Number.isFinite(h) ? h : 900;

  win = new BrowserWindow({
    width,
    height,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    frame: false,
    backgroundColor: '#000000',
    title: 'Spoteasy',
    icon: path.join(ROOT, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  win.setMenu(null);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const hash = SHOT_ROUTE || '';

  if (devUrl) {
    win.loadURL(devUrl + (hash ? `#${hash.replace(/^#/, '')}` : ''));
  } else {
    win.loadFile(path.join(ROOT, 'dist', 'index.html'), {
      hash: hash.replace(/^#/, ''),
    });
  }

  win.once('ready-to-show', () => {
    win.show();
    if (isShot) setTimeout(takeShot, 2400);
    else if (EVAL_FILE) {
      setTimeout(() => runEvalFile(EVAL_FILE), 1200);
    } else if (MINI_SHOT) {
      setTimeout(runMiniShot, 1400);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  const sendMax = () => win.webContents.send('win:maximized', win.isMaximized());
  win.on('maximize', sendMax);
  win.on('unmaximize', sendMax);
  win.on('closed', () => {
    win = null;
    if (miniWin && !miniWin.isDestroyed()) miniWin.close();
  });
}

function createMiniPlayer() {
  if (miniWin && !miniWin.isDestroyed()) {
    if (miniWin.isMinimized()) miniWin.restore();
    miniWin.show();
    miniWin.focus();
    return;
  }

  miniWin = new BrowserWindow({
    width: 320,
    height: 400,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    frame: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#000000',
    title: 'Spoteasy',
    icon: path.join(ROOT, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  miniWin.setMenu(null);
  miniWin.setAlwaysOnTop(true, 'floating');

  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  miniWin.setPosition(Math.round(x + width - 320 - 18), Math.round(y + height - 400 - 18));

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const hash = 'home?mini=1';
  if (devUrl) {
    miniWin.loadURL(`${devUrl}#${hash}`);
  } else {
    miniWin.loadFile(path.join(ROOT, 'dist', 'index.html'), { hash });
  }

  miniWin.once('ready-to-show', () => {
    if (!miniWin) return;
    miniWin.show();
    if (latestMiniState) miniWin.webContents.send('mini:state', latestMiniState);
  });

  miniWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  miniWin.on('closed', () => {
    miniWin = null;
    if (win && !win.isDestroyed()) win.webContents.send('mini:closed');
  });
}

async function takeShot() {
  if (!win || !SHOT_FILE) return;
  try {
    // 关掉指针命中，避免截图里带上卡片/行的随机 hover 态
    await win.webContents.executeJavaScript("document.documentElement.classList.add('shot-mode')");
    win.webContents.sendInputEvent({ type: 'mouseMove', x: 8, y: 8 });
    await new Promise((resolve) => setTimeout(resolve, 220));
    if (SHOT_CLICK) {
      await win.webContents.executeJavaScript(
        `document.querySelector(${JSON.stringify(SHOT_CLICK)})?.click()`,
      );
      await new Promise((resolve) => setTimeout(resolve, 360));
    }
    const image = await win.webContents.capturePage();
    const out = path.isAbsolute(SHOT_FILE) ? SHOT_FILE : path.join(ROOT, SHOT_FILE);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, image.toPNG());
    console.log(`[shot] ${out} ${image.getSize().width}x${image.getSize().height}`);
  } catch (err) {
    console.error('[shot] failed', err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
}

async function runEvalFile(file) {
  try {
    const source = fs.readFileSync(file, 'utf8');
    const result = await win.webContents.executeJavaScript(source, true);
    console.log('[eval] ' + JSON.stringify(result));
  } catch (err) {
    console.error('[eval] failed', err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
}

async function runMiniShot() {
  try {
    createMiniPlayer();
    await new Promise((resolve) => setTimeout(resolve, 2200));
    if (!miniWin || miniWin.isDestroyed()) throw new Error('mini window missing');
    await miniWin.webContents.executeJavaScript(
      "document.querySelector('.mini-player')?.classList.add('is-demo-hover')",
    );
    await new Promise((resolve) => setTimeout(resolve, 450));
    const image = await miniWin.webContents.capturePage();
    const out = path.isAbsolute(MINI_SHOT) ? MINI_SHOT : path.join(ROOT, MINI_SHOT);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, image.toPNG());
    console.log(`[mini-shot] ${out} ${image.getSize().width}x${image.getSize().height}`);
  } catch (err) {
    console.error('[mini-shot] failed', err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
}

async function renderSvg() {
  try {
    const svg = fs.readFileSync(RENDER_SVG, 'utf8');
    const size = Number.isFinite(RENDER_SIZE) ? RENDER_SIZE : 256;
    const html = [
      '<!doctype html><html><head><meta charset="utf-8"><style>',
      'html,body{margin:0;padding:0;background:transparent;overflow:hidden}',
      `img{display:block;width:${size}px;height:${size}px}`,
      '</style></head><body><img src="data:image/svg+xml;base64,',
      Buffer.from(svg).toString('base64'),
      '"></body></html>',
    ].join('');

    const renderer = new BrowserWindow({
      width: size,
      height: size,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      show: false,
      webPreferences: { offscreen: false },
    });
    await renderer.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    renderer.showInactive();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const image = await renderer.webContents.capturePage();
    const out = path.isAbsolute(RENDER_OUT) ? RENDER_OUT : path.join(ROOT, RENDER_OUT);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, image.toPNG());
    console.log(`[icon] ${out} ${image.getSize().width}x${image.getSize().height}`);
  } catch (err) {
    console.error('[icon] failed', err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
}

app.whenReady().then(() => {
  if (RENDER_SVG) {
    renderSvg();
    return;
  }

  loadLibrary();
  loadNeteaseSession();
  registerMediaProtocol();
  registerCloudProtocol();
  registerMvProtocol();

  ipcMain.handle('netease:friend-events', async (_event, lasttime = -1) => {
    if (!neteaseCookie) return { events: [], error: 'login required' };
    try {
      const result = await neteaseApi.event({
        cookie: neteaseCookie,
        pagesize: 20,
        lasttime: Number(lasttime) || -1,
      });
      const code = Number(result.body?.code);
      if (code === 301 || code === -462 || code === 250) {
        return { events: [], error: 'login required' };
      }
      const raw = Array.isArray(result.body?.event)
        ? result.body.event
        : (result.body?.event?.events || []);
      return {
        events: raw.map(mapFriendEvent),
        lasttime: result.body?.lasttime,
        more: Boolean(result.body?.more),
      };
    } catch (err) {
      console.warn('[netease] friend events failed', err?.message || err);
      return { events: [], error: String(err?.message || err) };
    }
  });

  ipcMain.handle('netease:search', async (_event, keyword, offset = 0, limit = 20) => {
    if (typeof keyword !== 'string' || !keyword.trim()) return { tracks: [], hasMore: false };
    try {
      return await netease.search(
        keyword.trim(),
        Math.max(1, Number(limit) || 20),
        Math.max(0, Number(offset) || 0),
      );
    } catch (err) {
      console.warn('[netease] search failed', err?.message || err);
      return { tracks: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:lyric', async (_event, id) => {
    try {
      return await netease.lyric(id);
    } catch (err) {
      return { lrc: '', translation: '', error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:status', () => neteaseStatus());
  ipcMain.handle('netease:search-users', async (_event, keyword, offset = 0, limit = 20) => {
    const query = String(keyword || '').trim();
    if (!query) return { users: [], hasMore: false };
    try {
      const result = await neteaseApi.search({
        keywords: query,
        type: 1002,
        limit: Math.max(1, Math.min(50, Number(limit) || 20)),
        offset: Math.max(0, Number(offset) || 0),
      });
      const users = (result.body?.result?.userprofiles || []).map((user) => ({
        uid: Number(user.userId),
        nickname: user.nickname || '网易云用户',
        avatarUrl: coverWithSize(user.avatarUrl, 200),
        signature: user.signature || '',
        follows: Number(user.follows || 0),
        followeds: Number(user.followeds || 0),
        playlistCount: Number(user.playlistCount || 0),
      })).filter((user) => Number.isFinite(user.uid) && user.uid > 0);
      return { users, hasMore: Boolean(result.body?.result?.more) };
    } catch (err) {
      return { users: [], hasMore: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('netease:public-profile', async (_event, uid) => {
    const publicUid = Number(uid);
    if (!Number.isFinite(publicUid) || publicUid <= 0) return { profile: null, playlists: [], error: 'invalid uid' };
    try {
      const [detail, list] = await Promise.all([
        neteaseApi.user_detail({ uid: publicUid }),
        neteaseApi.user_playlist({ uid: publicUid, limit: 100, offset: 0 }),
      ]);
      const rawProfile = detail.body?.profile || {};
      const profile = {
        uid: Number(rawProfile.userId || publicUid),
        nickname: rawProfile.nickname || '网易云用户',
        avatarUrl: coverWithSize(rawProfile.avatarUrl, 200),
        signature: rawProfile.signature || '',
        follows: Number(rawProfile.follows || 0),
        followeds: Number(rawProfile.followeds || 0),
        playlistCount: Number(rawProfile.playlistCount || 0),
        level: Number(detail.body?.level || 0),
      };
      const allPlaylists = (list.body?.playlist || []).map(mapNeteasePlaylist);
      const likedPlaylist = allPlaylists.find((playlist) => playlist.specialType === 5) || null;
      const playlists = allPlaylists.filter((playlist) => playlist.specialType !== 5);
      return { profile, playlists, likedPlaylist };
    } catch (err) {
      console.warn('[netease] public profile failed', err?.message || err);
      return { profile: null, playlists: [], error: String(err?.message || err) };
    }
  });

  ipcMain.handle('netease:user-playlists', async () => {
    if (!neteaseCookie) return { playlists: [] };
    try {
      const status = await neteaseStatus();
      if (!status.loggedIn || !status.uid) return { playlists: [] };
      const result = await neteaseApi.user_playlist({
        uid: status.uid,
        limit: 100,
        offset: 0,
        cookie: neteaseCookie,
      });
      const playlists = (result.body?.playlist || [])
        .filter((playlist) => Number(playlist?.specialType) !== 5)
        .map(mapNeteasePlaylist);
      return { playlists };
    } catch (err) {
      console.warn('[netease] user playlists failed', err?.message || err);
      return { playlists: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:album-sublist', async () => {
    if (!neteaseCookie) return { albums: [] };
    try {
      const status = await neteaseStatus();
      if (!status.loggedIn) return { albums: [] };
      const result = await neteaseApi.album_sublist({ limit: 100, offset: 0, cookie: neteaseCookie });
      const rawAlbums = result.body?.subs || result.body?.data || result.body?.albums || [];
      const albums = rawAlbums.map((album) => mapNeteaseAlbum(album));
      return { albums };
    } catch (err) {
      console.warn('[netease] album sublist failed', err?.message || err);
      return { albums: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:artist-sublist', async () => {
    if (!neteaseCookie) return { artists: [] };
    try {
      const status = await neteaseStatus();
      if (!status.loggedIn) return { artists: [] };
      const result = await neteaseApi.artist_sublist({ limit: 100, offset: 0, cookie: neteaseCookie });
      const artists = (result.body?.data || []).map((artist) => mapNeteaseArtist(artist));
      return { artists };
    } catch (err) {
      console.warn('[netease] artist sublist failed', err?.message || err);
      return { artists: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:liked-ids', async () => {
    if (!neteaseCookie) return { ids: [] };
    try {
      const status = await neteaseStatus();
      if (!status.loggedIn || !status.uid) return { ids: [] };
      const result = await neteaseApi.likelist({ uid: status.uid, cookie: neteaseCookie });
      return { ids: (result.body?.ids || []).map(Number).filter((id) => Number.isFinite(id)) };
    } catch (err) {
      return { ids: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:daily-songs', async () => {
    if (!neteaseCookie) return { tracks: [], error: 'login required' };
    try {
      const result = await neteaseApi.recommend_songs({ cookie: neteaseCookie });
      const songs = result.body?.data?.dailySongs || [];
      return { tracks: songs.map(netease.normalizeTrack) };
    } catch (err) {
      return { tracks: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:liked-tracks', async () => {
    if (!neteaseCookie) return { tracks: [], error: 'login required' };
    try {
      const status = await neteaseStatus();
      if (!status.loggedIn || !status.uid) return { tracks: [], error: 'login required' };
      const likeResult = await neteaseApi.likelist({ uid: status.uid, cookie: neteaseCookie });
      const ids = (likeResult.body?.ids || []).map(Number).filter((id) => Number.isFinite(id));
      const tracks = [];
      for (let index = 0; index < ids.length; index += 500) {
        const chunk = ids.slice(index, index + 500);
        const detail = await neteaseApi.song_detail({ ids: chunk.join(','), cookie: neteaseCookie });
        tracks.push(...(detail.body?.songs || []).map(netease.normalizeTrack));
      }
      return { tracks };
    } catch (err) {
      console.warn('[netease] liked tracks failed', err?.message || err);
      return { tracks: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:artist-sub', async (_event, id, follow) => {
    if (!neteaseCookie) return { ok: false, error: 'login required' };
    try {
      const result = await neteaseApi.artist_sub({
        id: Number(id),
        t: follow ? 1 : 0,
        cookie: neteaseCookie,
      });
      return { ok: result?.body?.code === 200, error: result?.body?.message };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:album-sub', async (_event, id, follow) => {
    if (!neteaseCookie) return { ok: false, error: 'login required' };
    try {
      const result = await neteaseApi.album_sub({
        id: Number(id),
        t: follow ? 1 : 0,
        cookie: neteaseCookie,
      });
      return { ok: result?.body?.code === 200, error: result?.body?.message };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:playlist-subscribe', async (_event, id, follow) => {
    if (!neteaseCookie) return { ok: false, error: 'login required' };
    try {
      const result = await neteaseApi.playlist_subscribe({
        id: Number(id),
        t: follow ? 1 : 0,
        cookie: neteaseCookie,
      });
      const code = Number(result?.body?.code);
      return { ok: code === 200 || code === 502, error: result?.body?.message };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:podcast-sub', async (_event, id, follow) => {
    if (!neteaseCookie) return { ok: false, error: 'login required' };
    try {
      const result = await neteaseApi.dj_sub({
        id: Number(id),
        t: follow ? 1 : 0,
        cookie: neteaseCookie,
      });
      const code = Number(result?.body?.code);
      return { ok: code === 200 || code === 502, error: result?.body?.message };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:playlist-track-add', async (_event, id, trackIds) => {
    if (!neteaseCookie) return { ok: false, error: 'login required' };
    try {
      const ids = Array.isArray(trackIds) ? trackIds.map(Number).filter((value) => Number.isFinite(value)) : [];
      if (!ids.length) return { ok: false, error: 'no tracks' };
      const result = await neteaseApi.playlist_track_add({
        op: 'add',
        pid: Number(id),
        tracks: ids.join(','),
        cookie: neteaseCookie,
      });
      const code = Number(result?.body?.code);
      return { ok: code === 200 || code === 502, error: result?.body?.message };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:like', async (_event, id, liked) => {
    if (!neteaseCookie) return { ok: false, error: 'login required' };
    try {
      const result = await neteaseApi.like({ id: Number(id), like: Boolean(liked), cookie: neteaseCookie });
      const ok = result?.body?.code === 200 || result?.status === 200;
      return { ok, error: ok ? undefined : String(result?.body?.message || '操作失败') };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:recommend-playlists', async () => {
    try {
      const result = await neteaseApi.personalized({ limit: 12,  });
      return (result.body?.result || []).map(mapNeteasePlaylist);
    } catch (err) {
      console.warn('[netease] recommend failed', err?.message || err);
      return [];
    }
  });
  ipcMain.handle('netease:home', async () => {
    const safe = (request, fallback) => Promise.resolve(request).catch(() => fallback);
    const wait = () => new Promise((resolve) => setTimeout(resolve, 220));
    const personalized = await safe(neteaseApi.personalized({ limit: 12 }), null);
    await wait();
    const top = await safe(neteaseApi.top_playlist({ cat: '全部', limit: 12 }), null);
    await wait();
    const newsong = await safe(neteaseApi.personalized_newsong({ limit: 12 }), null);
    await wait();
    const resource = await safe(neteaseApi.recommend_resource({}), null);
    await wait();
    const toplist = await safe(neteaseApi.toplist({}), null);

    const recommended = (personalized?.body?.result || []).map(mapNeteasePlaylist);
    const resourcePlaylists = (resource?.body?.recommend || []).map(mapNeteasePlaylist);
    const topPlaylists = (top?.body?.playlists || []).map(mapNeteasePlaylist);
    const newSongs = (newsong?.body?.result || [])
      .map((item) => {
        const raw = item?.song || item;
        return raw?.id ? netease.normalizeTrack(raw) : null;
      })
      .filter(Boolean);

    const charts = (toplist?.body?.list || []).slice(0, 8).map((item) => ({
      ...mapNeteasePlaylist(item),
      hidePlays: true,
      desc: item.updateFrequency || item.description || '官方榜单',
    }));

    return {
      recommended: recommended.length ? recommended : resourcePlaylists,
      resource: resourcePlaylists,
      top: topPlaylists,
      charts,
      newSongs,
    };
  });
  ipcMain.handle('netease:search-playlists', async (_event, keyword, offset = 0, limit = 12) => {
    if (typeof keyword !== 'string' || !keyword.trim()) return { playlists: [], hasMore: false };
    try {
      const result = await neteaseApi.cloudsearch({
        keywords: keyword.trim(),
        type: 1000,
        limit: Math.max(1, Number(limit) || 12),
        offset: Math.max(0, Number(offset) || 0),
        
      });
      const playlists = (result.body?.result?.playlists || []).map(mapNeteasePlaylist);
      return { playlists, hasMore: playlists.length >= (Number(limit) || 12) };
    } catch (err) {
      console.warn('[netease] playlist search failed', err?.message || err);
      return { playlists: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:search-artists', async (_event, keyword, offset = 0, limit = 12) => {
    if (typeof keyword !== 'string' || !keyword.trim()) return { artists: [], hasMore: false };
    try {
      const result = await neteaseApi.cloudsearch({
        keywords: keyword.trim(),
        type: 100,
        limit: Math.max(1, Number(limit) || 12),
        offset: Math.max(0, Number(offset) || 0),
        
      });
      const artists = (result.body?.result?.artists || []).map(mapNeteaseArtist);
      return { artists, hasMore: artists.length >= (Number(limit) || 12) };
    } catch (err) {
      return { artists: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:search-albums', async (_event, keyword, offset = 0, limit = 12) => {
    if (typeof keyword !== 'string' || !keyword.trim()) return { albums: [], hasMore: false };
    try {
      const result = await neteaseApi.cloudsearch({
        keywords: keyword.trim(),
        type: 10,
        limit: Math.max(1, Number(limit) || 12),
        offset: Math.max(0, Number(offset) || 0),
        
      });
      const albums = (result.body?.result?.albums || []).map((album) => mapNeteaseAlbum(album));
      return { albums, hasMore: albums.length >= (Number(limit) || 12) };
    } catch (err) {
      return { albums: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:podcast-sublist', async () => {
    if (!neteaseCookie) return { podcasts: [] };
    try {
      const result = await neteaseApi.dj_sublist({ limit: 100, offset: 0, cookie: neteaseCookie });
      const radios = result.body?.djRadios || result.body?.data || [];
      return { podcasts: radios.map(mapNeteasePodcast) };
    } catch (err) {
      return { podcasts: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:podcast-programs', async (_event, id, offset = 0, limit = 20) => {
    try {
      const rid = Number(id);
      const result = await neteaseApi.dj_program({
        rid,
        limit: Math.max(1, Number(limit) || 20),
        offset: Math.max(0, Number(offset) || 0),
        
      });
      const programs = (result.body?.programs || []).map(mapNeteasePodcastProgram);
      return {
        programs,
        hasMore: Boolean(result.body?.more) || programs.length >= (Number(limit) || 20),
      };
    } catch (err) {
      return { programs: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:search-mvs', async (_event, keyword, offset = 0, limit = 12) => {
    try {
      const result = await neteaseApi.cloudsearch({
        keywords: keyword.trim(),
        type: 1004,
        limit: Math.max(1, Number(limit) || 12),
        offset: Math.max(0, Number(offset) || 0),
        
      });
      const raw = result.body?.result?.mvs || [];
      const mvs = raw.map((mv) => {
        const id = Number(mv.id);
        return {
          id: `ne-mv-${id}`,
          cloudId: id,
          name: mv.name || 'MV',
          artist: mv.artistName || (mv.artists || []).map((artist) => artist.name).join(' / ') || '',
          coverUrl: coverWithSize(mv.cover, 800),
          duration: Number(mv.duration || 0),
          playCount: Number(mv.playCount || 0),
          publishTime: Number(mv.publishTime || 0),
          hue: netease.hashHue(id),
          variant: Math.abs(id) % 8,
        };
      });
      return { mvs, hasMore: raw.length >= (Number(limit) || 12) };
    } catch (err) {
      console.warn('[netease] mv search failed', err?.message || err);
      return { mvs: [], hasMore: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('netease:podcast-detail', async (_event, id, offset = 0, limit = 20) => {
    try {
      const rid = Number(id);
      const [detail, programResult] = await Promise.all([
        neteaseApi.dj_detail({ rid,  }),
        neteaseApi.dj_program({
          rid,
          limit: Math.max(1, Number(limit) || 20),
          offset: Math.max(0, Number(offset) || 0),
          
        }),
      ]);
      const raw = detail.body?.data;
      if (!raw) throw new Error('podcast not found');
      const programs = (programResult.body?.programs || []).map(mapNeteasePodcastProgram);
      return {
        podcast: mapNeteasePodcast(raw),
        programs,
        hasMore: Boolean(programResult.body?.more) || programs.length >= (Number(limit) || 20),
      };
    } catch (err) {
      return { podcast: null, programs: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:search-podcasts', async (_event, keyword, offset = 0, limit = 12) => {
    if (typeof keyword !== 'string' || !keyword.trim()) return { podcasts: [], hasMore: false };
    try {
      const result = await neteaseApi.cloudsearch({
        keywords: keyword.trim(),
        type: 1009,
        limit: Math.max(1, Number(limit) || 12),
        offset: Math.max(0, Number(offset) || 0),
        
      });
      const podcasts = (result.body?.result?.djRadios || []).map(mapNeteasePodcast);
      return { podcasts, hasMore: podcasts.length >= (Number(limit) || 12) };
    } catch (err) {
      return { podcasts: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:artist', async (_event, id) => {
    try {
      const cloudId = Number(id);
      const [detail, songs, followCount, intro] = await Promise.all([
        neteaseApi.artist_detail({ id: cloudId,  }),
        neteaseApi.artist_songs({ id: cloudId, limit: 50, offset: 0,  }),
        neteaseApi.artist_follow_count({ id: cloudId,  }).catch(() => null),
        neteaseApi.artist_desc({ id: cloudId,  }).catch(() => null),
      ]);
      const raw = detail.body?.data?.artist;
      if (!raw) throw new Error('artist not found');
      const description =
        intro?.body?.introduction?.[0]?.txt ||
        intro?.body?.briefDesc ||
        raw?.briefDesc ||
        '';
      return {
        artist: {
          ...mapNeteaseArtist(raw),
          followers: Number(followCount?.body?.data?.fansCnt || 0),
          description,
        },
        tracks: (songs.body?.songs || []).map(netease.normalizeTrack),
      };
    } catch (err) {
      console.warn('[netease] artist failed', err?.message || err);
      return { artist: null, tracks: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:artist-stat', async (_event, id) => {
    try {
      const result = await neteaseApi.artist_follow_count({ id: Number(id),  });
      return { followers: Number(result.body?.data?.fansCnt || 0) };
    } catch (err) {
      return { followers: 0, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:artist-mvs', async (_event, id, limit = 12, offset = 0) => {
    try {
      const result = await neteaseApi.artist_mv({
        id: Number(id),
        limit: Math.max(1, Number(limit) || 12),
        offset: Math.max(0, Number(offset) || 0),
        
      });
      return { mvs: (result.body?.mvs || []).map(mapNeteaseMv) };
    } catch (err) {
      return { mvs: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:mv', async (_event, id) => {
    try {
      const mvid = Number(id);
      const result = await neteaseApi.mv_detail({ mvid,  });
      const raw = result.body?.data;
      if (!raw) throw new Error('mv not found');
      return { mv: mapNeteaseMv(raw) };
    } catch (err) {
      return { mv: null, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:artist-albums', async (_event, id, limit = 30, offset = 0) => {
    try {
      const pageSize = Math.max(1, Number(limit) || 30);
      const result = await neteaseApi.artist_album({
        id: Number(id),
        limit: pageSize,
        offset: Math.max(0, Number(offset) || 0),
        
      });
      const albums = (result.body?.hotAlbums || []).map((album) => mapNeteaseAlbum(album));
      return {
        albums,
        hasMore: Boolean(result.body?.more) || albums.length >= pageSize,
      };
    } catch (err) {
      console.warn('[netease] artist albums failed', err?.message || err);
      return { albums: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:cover-color', async (_event, url) => {
    const hue = await coverHue(url);
    return {
      hue: typeof hue === 'number' ? hue : null,
      color: coverColorCache.get(String(url || '')) || null,
    };
  });

  ipcMain.handle('netease:artist-related', async (_event, id, name) => {
    const cloudId = Number(id);
    const keyword = String(name || '').trim();
    const safe = (request, fallback) => Promise.resolve(request).catch(() => fallback);
    const wait = () => new Promise((resolve) => setTimeout(resolve, 180));
    const searchResult = keyword
      ? await safe(
          neteaseApi.search({
            keywords: keyword,
            type: 1000,
            limit: 20,
          }),
          null,
        )
      : null;
    await wait();
    const simiResult = await safe(neteaseApi.simi_artist({ id: cloudId }), null);
    await wait();
    const albumsResult = await safe(neteaseApi.artist_album({ id: cloudId, limit: 60, offset: 0 }), null);

    const candidates = (searchResult?.body?.result?.playlists || [])
      .map(mapNeteasePlaylist)
      .slice(0, 20);
    const verified = [];
    for (const playlist of candidates) {
      const detail = await safe(neteaseApi.playlist_detail({ id: playlist.cloudId, s: 0 }), null);
      const rawTracks = detail?.body?.playlist?.tracks || [];
      if (!rawTracks.length) {
        verified.push({ ...playlist, mosaic: [] });
      } else {
        const containsArtist = rawTracks.some((track) => {
          const artists = track?.ar || track?.artists || [];
          return artists.some((artist) => {
            const artistName = String(artist?.name || '');
            return (
              artistName === keyword ||
              artistName.split(' / ').includes(keyword) ||
              artistName.includes(keyword) ||
              keyword.includes(artistName)
            );
          });
        });
        if (containsArtist) {
          const mosaic = [];
          for (const track of rawTracks) {
            const url = coverWithSize(track?.al?.picUrl || track?.album?.picUrl, 200);
            if (url && !mosaic.includes(url)) mosaic.push(url);
            if (mosaic.length === 4) break;
          }
          verified.push({ ...playlist, mosaic });
        }
      }
      await wait();
    }
    const playlists = verified.filter(Boolean).slice(0, 20);
    const similarArtists = (simiResult?.body?.artists || [])
      .map(mapNeteaseArtist)
      .slice(0, 20);
    const appearsOn = (albumsResult?.body?.hotAlbums || [])
      .map((album) => mapNeteaseAlbum(album))
      .filter(
        (album) =>
          /精选|合辑|现场|原声/.test(album.albumType || '') ||
          /精选|合辑|现场|原声/.test(album.name || ''),
      )
      .slice(0, 20);

    return { playlists, similarArtists, appearsOn };
  });

  ipcMain.handle('netease:album', async (_event, id) => {
    try {
      const cloudId = Number(id);
      const result = await neteaseApi.album({ id: cloudId,  });
      const raw = result.body?.album;
      if (!raw) throw new Error('album not found');
      const songs = result.body?.songs || [];
      return {
        album: mapNeteaseAlbum(raw, songs),
        tracks: songs.map(netease.normalizeTrack),
      };
    } catch (err) {
      console.warn('[netease] album failed', err?.message || err);
      return { album: null, tracks: [], error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:playlist', async (_event, id) => {
    try {
      const cloudId = Number(id);
      if (!Number.isFinite(cloudId)) throw new Error('bad playlist id');
      const [detail, firstTracks] = await Promise.all([
        neteaseApi.playlist_detail({ id: cloudId,  }),
        neteaseApi.playlist_track_all({ id: cloudId, limit: 100, offset: 0,  }),
      ]);
      const raw = detail.body?.playlist;
      if (!raw) throw new Error('playlist not found');
      const songs = firstTracks.body?.songs || raw.tracks || [];
      return {
        playlist: mapNeteasePlaylist(raw),
        tracks: songs.map(netease.normalizeTrack),
        hasMore: songs.length >= 100 && Number(raw.trackCount || 0) > songs.length,
      };
    } catch (err) {
      console.warn('[netease] playlist failed', err?.message || err);
      return { playlist: null, tracks: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:playlist-tracks', async (_event, id, offset = 0, limit = 100) => {
    try {
      const pageSize = Math.max(1, Number(limit) || 100);
      const result = await neteaseApi.playlist_track_all({
        id: Number(id),
        limit: pageSize,
        offset: Math.max(0, Number(offset) || 0),
        
      });
      const tracks = (result.body?.songs || []).map(netease.normalizeTrack);
      return { tracks, hasMore: tracks.length >= pageSize };
    } catch (err) {
      return { tracks: [], hasMore: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle('netease:qr-start', () => neteaseQrStart());
  ipcMain.handle('netease:qr-check', (_event, key) => neteaseQrCheck(key));
  ipcMain.handle('netease:logout', () => {
    clearNeteaseSession();
    cloudStreamCache.clear();
    return { loggedIn: false, premium: false, nickname: '音乐爱好者', sessionExpired: false };
  });

  ipcMain.handle('library:get', () => library);
  ipcMain.handle('library:choose', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: '选择音乐文件夹',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return library;
    const folders = [...new Set([...library.folders, ...result.filePaths])];
    const data = await scanLibrary(folders, win);
    syncWatchers();
    return data;
  });
  ipcMain.handle('library:add-folder', async (_event, dir) => {
    if (typeof dir !== 'string' || !fs.existsSync(dir)) return library;
    const folders = [...new Set([...library.folders, dir])];
    const data = await scanLibrary(folders, win);
    syncWatchers();
    return data;
  });
  ipcMain.handle('library:rescan', async () => {
    const data = await scanLibrary(library.folders, win);
    syncWatchers();
    return data;
  });
  ipcMain.handle('library:stats', () => {
    let bytes = 0;
    try {
      bytes = fs.statSync(libraryFile()).size;
    } catch {
      /* not scanned yet */
    }
    let missing = 0;
    for (const track of library.tracks) {
      try {
        if (!fs.existsSync(track.path)) missing += 1;
      } catch {
        missing += 1;
      }
    }
    return {
      path: libraryFile(),
      bytes,
      tracks: library.tracks.length,
      folders: library.folders.length,
      missing,
      covers: library.tracks.filter((track) => Boolean(track.coverUrl)).length,
    };
  });
  ipcMain.handle('library:remove-folder', async (_event, dir) => {
    if (typeof dir !== 'string') return library;
    const normalized = (value) => path.resolve(value).toLowerCase();
    const base = normalized(dir);
    const inside = (file) => {
      const target = normalized(file);
      return target === base || target.startsWith(base + path.sep);
    };
    const removedIds = new Set(library.tracks.filter((track) => inside(track.path)).map((track) => track.id));
    const overrides = {};
    for (const [id, value] of Object.entries(library.overrides || {})) {
      if (!removedIds.has(id)) overrides[id] = value;
    }
    library = {
      folders: library.folders.filter((folder) => normalized(folder) !== base),
      tracks: library.tracks.filter((track) => !inside(track.path)),
      overrides,
    };
    saveLibrary();
    syncWatchers();
    return library;
  });
  ipcMain.handle('library:clear', () => {
    library = { folders: [], tracks: [], overrides: {} };
    saveLibrary();
    syncWatchers();
    return library;
  });
  ipcMain.handle('library:update-track', (_event, id, patch) => {
    const track = library.tracks.find((item) => item.id === id);
    if (!track || !patch || typeof patch !== 'object') return library;
    const override = { ...(library.overrides[id] || {}) };
    for (const key of ['title', 'artist', 'album']) {
      if (typeof patch[key] === 'string') {
        const value = patch[key].trim();
        if (value) override[key] = value;
      }
    }
    if (patch.coverUrl === null) delete override.coverUrl;
    if (typeof patch.coverUrl === 'string' && patch.coverUrl.startsWith('data:image/')) {
      override.coverUrl = patch.coverUrl;
    }
    if (Object.keys(override).length) library.overrides[id] = override;
    else delete library.overrides[id];
    applyOverride(track, override);
    saveLibrary();
    return library;
  });
  ipcMain.handle('library:choose-cover', async (_event, id) => {
    const track = library.tracks.find((item) => item.id === id);
    if (!track) return library;
    const result = await dialog.showOpenDialog(win, {
      title: '选择封面图片',
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return library;
    try {
      const image = nativeImage.createFromPath(result.filePaths[0]);
      if (image.isEmpty()) return library;
      const resized = image.resize({ width: 320, quality: 'good' });
      const coverUrl = `data:image/jpeg;base64,${resized.toJPEG(82).toString('base64')}`;
      const override = { ...(library.overrides[id] || {}), coverUrl };
      library.overrides[id] = override;
      track.coverUrl = coverUrl;
      saveLibrary();
    } catch (err) {
      console.warn('[library] cover failed', err);
    }
    return library;
  });
  ipcMain.handle('library:prune', () => {
    const overrides = { ...(library.overrides || {}) };
    const tracks = [];
    for (const track of library.tracks) {
      let exists = false;
      try {
        exists = fs.existsSync(track.path);
      } catch {
        exists = false;
      }
      if (exists) tracks.push(track);
      else delete overrides[track.id];
    }
    library = { ...library, tracks, overrides };
    saveLibrary();
    return library;
  });
  ipcMain.handle('library:clear-covers', () => {
    const tracks = library.tracks.map((track) => ({ ...track, coverUrl: undefined }));
    const overrides = {};
    for (const [id, value] of Object.entries(library.overrides || {})) {
      const next = { ...value };
      delete next.coverUrl;
      if (Object.keys(next).length) overrides[id] = next;
    }
    library = { ...library, tracks, overrides };
    saveLibrary();
    return library;
  });
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    userData: app.getPath('userData'),
    libraryPath: libraryFile(),
  }));
  ipcMain.handle('app:latest-release', async () => {
    try {
      const response = await fetch('https://api.github.com/repos/Wusshilan/spoteasy/releases/latest', {
        headers: {
          'User-Agent': 'Spoteasy',
          Accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`github ${response.status}`);
      const data = await response.json();
      const assets = Array.isArray(data.assets) ? data.assets : [];
      const setup = assets.find((asset) => /spoteasy-setup.*\.exe$/i.test(String(asset.name || '')));
      return {
        version: String(data.tag_name || '').replace(/^v/i, ''),
        url: data.html_url || 'https://github.com/Wusshilan/spoteasy/releases',
        assetUrl: setup?.browser_download_url || '',
        publishedAt: data.published_at || '',
        notes: String(data.body || '').slice(0, 2000),
      };
    } catch (err) {
      return { error: String(err?.message || err) };
    }
  });

  ipcMain.handle('app:install-update', async (_event, url) => {
    const target = String(url || '');
    if (!/^https:\/\/github\.com\/Wusshilan\/spoteasy\/releases\/download\//i.test(target)) {
      return { ok: false, error: 'invalid update url' };
    }
    try {
      const fileName = decodeURIComponent(target.split('/').pop() || 'Spoteasy-Setup.exe');
      const destination = path.join(app.getPath('temp'), fileName);
      const response = await fetch(target, { headers: { 'User-Agent': 'Spoteasy' }, signal: AbortSignal.timeout(30000) });
      if (!response.ok || !response.body) throw new Error(`download ${response.status}`);
      const file = fs.createWriteStream(destination);
      await new Promise((resolve, reject) => {
        const reader = response.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!file.write(Buffer.from(value))) {
                await new Promise((next) => file.once('drain', next));
              }
            }
            file.end(resolve);
          } catch (error) {
            file.destroy();
            reject(error);
          }
        };
        void pump();
      });
      const child = spawn(destination, ['/S'], { detached: true, stdio: 'ignore' });
      child.unref();
      app.quit();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle('app:open-data-folder', async () => {
    await shell.openPath(app.getPath('userData'));
  });

  ipcMain.handle('win:is-maximized', () => (win ? win.isMaximized() : false));
  ipcMain.on('win:minimize', () => win && win.minimize());
  ipcMain.on('win:maximize', () => {
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on('win:close', () => win && win.close());

  ipcMain.handle('mini:open', () => {
    createMiniPlayer();
    return true;
  });
  ipcMain.handle('mini:close', () => {
    if (miniWin && !miniWin.isDestroyed()) miniWin.close();
  });
  ipcMain.handle('mini:get-state', () => latestMiniState);
  ipcMain.on('mini:state', (_event, state) => {
    latestMiniState = state;
    if (miniWin && !miniWin.isDestroyed()) miniWin.webContents.send('mini:state', state);
  });
  ipcMain.on('mini:command', (_event, command) => {
    if (win && !win.isDestroyed()) win.webContents.send('mini:command', command);
  });
  ipcMain.on('mini:focus-main', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  createWindow();
  syncWatchers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
