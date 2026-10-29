const crypto = require('crypto');
const https = require('https');

const NONCE = '0CoJUm6Qyw8W8jud';
const IV = '0102030405060708';
const MODULUS =
  '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
const PUB_KEY = '010001';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

function aes(text, key) {
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key), Buffer.from(IV));
  return Buffer.concat([cipher.update(Buffer.from(text)), cipher.final()]).toString('base64');
}

function rsa(text) {
  const reversed = text.split('').reverse().join('');
  const modulus = BigInt(`0x${MODULUS}`);
  const exponent = BigInt(`0x${PUB_KEY}`);
  const cipher = BigInt(`0x${Buffer.from(reversed).toString('hex')}`) ** exponent % modulus;
  return cipher.toString(16).padStart(256, '0');
}

function weapi(data) {
  const secret = crypto.randomBytes(8).toString('hex').slice(0, 16);
  return {
    params: aes(aes(JSON.stringify(data), NONCE), secret),
    encSecKey: rsa(secret),
  };
}

function request(path, data, cookie) {
  const cookieHeader = cookie && String(cookie).trim() ? cookie : 'appver=2.0.2; os=pc;';
  const body = new URLSearchParams(weapi(data)).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'music.163.com',
        path,
        method: 'POST',
        timeout: 15000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          Referer: 'https://music.163.com/',
          Origin: 'https://music.163.com',
          'User-Agent': UA,
          Cookie: cookieHeader,
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body: raw });
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('netease timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function coverUrlFor(album) {
  const pic = album?.picUrl || album?.artist?.img1v1Url;
  if (!pic) return undefined;
  if (pic.includes('?')) return `${pic}&param=640y640`;
  return `${pic}?param=640y640`;
}

function hashHue(value) {
  let hash = 0;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360;
  return hash;
}

function normalizeTrack(song) {
  const artists = song.artists || song.ar || [];
  const album = song.album || song.al || {};
  const duration = (song.duration || song.dt || 0) / 1000;
  const id = Number(song.id);
  return {
    id: `ne-${id}`,
    title: song.name || '未知歌曲',
    artist: artists.map((artist) => artist.name).filter(Boolean).join(' / ') || '未知艺人',
    album: album.name || '未知专辑',
    duration: Number.isFinite(duration) ? Math.round(duration) : 0,
    hue: hashHue(id),
    variant: Number.isFinite(id) ? Math.abs(id) % 8 : 0,
    plays: 0,
    local: false,
    source: 'netease',
    cloudId: id,
    cloudAlbumId: album.id,
    cloudArtistIds: artists.map((artist) => artist.id).filter(Boolean),
    coverUrl: coverUrlFor(album),
    mediaUrl: `spoteasy-cloud://stream/${id}`,
    fee: song.fee,
    vip: song.fee === 1,
    available: true,
    mvId: Number(song.mv || 0) || undefined,
  };
}

async function search(keyword, limit = 20, offset = 0, cookie) {
  const { body } = await request(
    '/weapi/search/get/web',
    {
      s: keyword,
      type: 1,
      limit,
      offset,
    },
    cookie,
  );
  if (body?.code !== 200) return { tracks: [], hasMore: false, code: body?.code };
  const songs = body?.result?.songs || [];
  return {
    tracks: songs.map(normalizeTrack),
    hasMore: songs.length >= limit,
    code: 200,
  };
}

async function songUrl(id, level = 'exhigh', cookie) {
  const { body } = await request(
    '/weapi/song/enhance/player/url/v1',
    {
      ids: JSON.stringify([Number(id)]),
      level,
      encodeType: 'flac',
    },
    cookie,
  );
  return body?.data?.[0] || null;
}

async function lyric(id, cookie) {
  const { body } = await request(
    '/weapi/song/lyric',
    {
      id: Number(id),
      lv: -1,
      kv: -1,
      tv: -1,
    },
    cookie,
  );
  return {
    lrc: body?.lrc?.lyric || '',
    translation: body?.tlyric?.lyric || '',
    code: body?.code,
  };
}

module.exports = { search, songUrl, lyric, UA, normalizeTrack, hashHue };
