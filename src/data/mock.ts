export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** seconds */
  duration: number;
  hue: number;
  variant: number;
  plays: number;
  explicit?: boolean;
  /** 本地音乐库字段 */
  local?: boolean;
  path?: string;
  mediaUrl?: string;
  coverUrl?: string;
  addedAt?: number;
  /** 网易云来源字段 */
  source?: 'local' | 'netease';
  cloudId?: number;
  cloudAlbumId?: number;
  cloudArtistIds?: number[];
  fee?: number;
  vip?: boolean;
  available?: boolean;
  mvId?: number;
  /** 播客节目字段 */
  programId?: number;
  radioId?: number;
  publishedAt?: number;
  description?: string;
  serialNum?: number;
}

export interface Playlist {
  id: string;
  name: string;
  desc: string;
  owner: string;
  ownerId?: number;
  ownerAvatarUrl?: string;
  hue: number;
  variant: number;
  tracks: string[];
  /** 每日推荐 / 我喜欢的音乐 这类特殊入口 */
  kind?: 'daily' | 'liked';
  /** 网易云歌单字段 */
  coverUrl?: string;
  playCount?: number;
  trackCount?: number;
  cloudId?: number;
  source?: 'netease';
  subscribed?: boolean;
  createdAt?: number;
  addedAt?: number;
  hidePlays?: boolean;
  mosaic?: string[];
}

export interface LyricLine {
  time: number;
  text: string;
}

const rawTracks: Array<[string, string, string, number, number, number, number]> = [
  // title, artist, album, duration, hue, variant, plays
  ['晚风告白', '陈子晴', '晚风告白', 252, 158, 0, 12860000],
  ['海边的卡夫卡', '林晚星', '海边旅馆', 228, 196, 1, 8920000],
  ['凌晨三点的便利店', '陈子晴', '晚风告白', 245, 232, 2, 15620000],
  ['山丘与雾', '野径乐队', '山丘与雾', 312, 118, 3, 4210000],
  ['夏日限定', '林晚星', '橘色日落', 201, 24, 4, 20140000],
  ['城市折叠', '周予安', '城市折叠', 273, 258, 5, 6380000],
  ['慢速列车', '野径乐队', '山丘与雾', 298, 40, 6, 3860000],
  ['雨夜便利店', '洛小北', '午夜电台', 236, 210, 7, 11280000],
  ['白日梦游', '陈子晴', '晚风告白', 213, 286, 1, 7450000],
  ['橘子汽水', '林晚星', '橘色日落', 178, 20, 0, 26840000],
  ['无人区玫瑰', '周予安', '城市折叠', 261, 340, 2, 5280000],
  ['倒带人生', '洛小北', '午夜电台', 284, 188, 3, 9870000],
  ['雾中风景', '野径乐队', '山丘与雾', 336, 204, 4, 2890000],
  ['银河修理员', '陈子晴', '晚风告白', 232, 252, 5, 18760000],
  ['二十岁的夏天', '林晚星', '橘色日落', 248, 36, 6, 12340000],
  ['旧唱片行', '周予安', '城市折叠', 220, 148, 7, 4760000],
  ['午夜电台', '洛小北', '午夜电台', 266, 220, 2, 8210000],
  ['玻璃海', '野径乐队', '山丘与雾', 302, 190, 3, 3140000],
  ['失物招领', '陈子晴', '晚风告白', 227, 300, 4, 9640000],
  ['落日飞车', '林晚星', '橘色日落', 209, 16, 5, 17820000],
  ['回到过去', '周予安', '城市折叠', 255, 268, 6, 5940000],
  ['深夜书店', '洛小北', '午夜电台', 242, 176, 7, 6930000],
  ['北纬三十度', '野径乐队', '山丘与雾', 287, 134, 0, 2410000],
  ['海边旅馆', '陈子晴', '晚风告白', 259, 198, 1, 10890000],
  ['春日漫游', '林晚星', '橘色日落', 192, 88, 2, 14020000],
  ['霓虹之下', '周予安', '城市折叠', 238, 280, 3, 5190000],
  ['纸质情书', '洛小北', '午夜电台', 277, 44, 4, 7830000],
  ['山谷回声', '野径乐队', '山丘与雾', 364, 152, 5, 1980000],
  ['候鸟', '陈子晴', '晚风告白', 251, 240, 6, 8420000],
  ['南方以南', '林晚星', '海边旅馆', 224, 8, 7, 16470000],
  ['慢慢', '周予安', '城市折叠', 206, 60, 0, 6820000],
  ['晚安计划', '洛小北', '午夜电台', 293, 226, 1, 10230000],
];

export const tracks: Track[] = rawTracks.map(
  ([title, artist, album, duration, hue, variant, plays], i) => ({
    id: `t${i + 1}`,
    title,
    artist,
    album,
    duration,
    hue,
    variant,
    plays,
    explicit: i % 11 === 4,
  }),
);

const trackById = new Map(tracks.map((t) => [t.id, t]));
const extraTracks = new Map<string, Track>();

/** 本地音乐库扫描完成后注册，getTrack 会优先查这里。 */
export function registerTracks(list: Track[]) {
  for (const track of list) extraTracks.set(track.id, track);
}

export function getTrack(id: string): Track {
  const hit = extraTracks.get(id) ?? trackById.get(id);
  if (!hit) throw new Error(`unknown track: ${id}`);
  return hit;
}

export const allTrackIds = tracks.map((t) => t.id);

const all = allTrackIds;
const rev = [...all].reverse();

export const playlists: Playlist[] = [
  {
    id: 'daily',
    name: '每日推荐',
    desc: '根据你的音乐口味生成，每天 6:00 更新',
    owner: '音乐爱好者',
    hue: 158,
    variant: 2,
    tracks: all.slice(0, 30),
    kind: 'daily',
  },
  {
    id: 'p1',
    name: '深夜不睡俱乐部',
    desc: '凌晨一点以后，城市才真正属于你。',
    owner: '音乐爱好者8871',
    hue: 232,
    variant: 0,
    tracks: [...all.slice(2), ...all.slice(0, 2)],
  },
  {
    id: 'liked',
    name: '我喜欢的音乐',
    desc: '所有你点过红心的歌',
    owner: '音乐爱好者',
    hue: 340,
    variant: 6,
    tracks: ['t1', 't5', 't9', 't14', 't19', 't24', 't29', 't2', 't10', 't30', 't17'],
    kind: 'liked',
  },
  {
    id: 'p2',
    name: '通勤路上的 45 分钟',
    desc: '地铁到站之前，刚好听完这几首。',
    owner: '阿树',
    hue: 24,
    variant: 5,
    tracks: rev.slice(0, 24),
  },
  {
    id: 'p3',
    name: '华语民谣 · 山与海',
    desc: '木吉他、雾气和一些说不出口的话。',
    owner: '野径电台',
    hue: 118,
    variant: 3,
    tracks: ['t4', 't7', 't13', 't18', 't23', 't28', 't2', 't24', 't30', 't25', 't15', 't29', 't1', 't19'],
  },
  {
    id: 'p4',
    name: 'City Pop 夜行',
    desc: '霓虹、合成器，和一辆永远不靠站的电车。',
    owner: 'NIGHTWAVE',
    hue: 286,
    variant: 7,
    tracks: ['t6', 't11', 't16', 't21', 't26', 't31', 't8', 't17', 't12', 't22', 't27', 't32'],
  },
  {
    id: 'p5',
    name: '华语热歌 · 999+',
    desc: '那些年循环最多的华语歌。',
    owner: 'Spoteasy 音乐',
    hue: 0,
    variant: 4,
    tracks: ['t3', 't10', 't20', 't29', 't14', 't5', 't30', 't8', 't1', 't24', 't15', 't12', 't17', 't25', 't19'],
  },
  {
    id: 'p6',
    name: '独立电子 · 低温',
    desc: '适合一个人写代码的 128 BPM。',
    owner: 'LowTemp',
    hue: 196,
    variant: 1,
    tracks: ['t6', 't11', 't16', 't21', 't26', 't31', 't3', 't13', 't18', 't23'],
  },
  {
    id: 'p7',
    name: '2024 年度歌单',
    desc: '这一年你循环最多的 50 首。',
    owner: '音乐爱好者',
    hue: 44,
    variant: 6,
    tracks: all.slice(4).concat(all.slice(0, 4)),
  },
  {
    id: 'p9',
    name: '深夜轻音乐',
    desc: '睡不着的时候，听一点安静的音乐。',
    owner: 'Spoteasy 电台',
    hue: 210,
    variant: 5,
    tracks: ['t4', 't7', 't13', 't18', 't23', 't28', 't3', 't8', 't22', 't17', 't12', 't27'],
  },
];

export const playlistById = new Map(playlists.map((p) => [p.id, p]));

export interface ArtistCard {
  name: string;
  hue: number;
  tracks: number;
}

export const artists: ArtistCard[] = [...new Set(tracks.map((t) => t.artist))].map((name, i) => ({
  name,
  hue: (i * 67 + 20) % 360,
  tracks: tracks.filter((t) => t.artist === name).length,
}));

export const albums = [...new Set(tracks.map((t) => t.album))].map((name, i) => ({
  name,
  hue: (i * 83 + 40) % 360,
  artist: tracks.find((t) => t.album === name)!.artist,
  tracks: tracks.filter((t) => t.album === name).length,
}));

export const lyrics: LyricLine[] = [
  { time: 0, text: '晚风告白' },
  { time: 14, text: '作词 : 陈子晴' },
  { time: 20, text: '作曲 : 陈子晴' },
  { time: 28, text: '晚风把街灯吹成一片海' },
  { time: 35, text: '我站在便利店门口发呆' },
  { time: 42, text: '你说今晚的月亮有点歪' },
  { time: 49, text: '像我们没说完的对白' },
  { time: 57, text: '如果风也有它的方向' },
  { time: 64, text: '会不会也绕着你打转' },
  { time: 71, text: '我把心事折成纸飞机' },
  { time: 78, text: '却始终没敢递到你手边' },
  { time: 88, text: '晚风啊 替我告白' },
  { time: 95, text: '说我其实一直都在' },
  { time: 102, text: '那些绕了很远的路' },
  { time: 109, text: '都通往同一个答案' },
  { time: 118, text: '晚风啊 别停下来' },
  { time: 125, text: '把这句话吹到你耳边' },
  { time: 132, text: '如果明天还能见面' },
  { time: 139, text: '我想我会勇敢一点' },
  { time: 160, text: '（间奏）' },
  { time: 188, text: '如果风也有它的方向' },
  { time: 195, text: '会不会也绕着你打转' },
  { time: 202, text: '我把心事折成纸飞机' },
  { time: 209, text: '却始终没敢递到你手边' },
  { time: 219, text: '晚风啊 替我告白' },
  { time: 226, text: '说我其实一直都在' },
  { time: 233, text: '那些绕了很远的路' },
  { time: 240, text: '都通往同一个答案' },
  { time: 249, text: '晚风啊 别停下来' },
  { time: 256, text: '把这句话吹到你耳边' },
  { time: 263, text: '如果明天还能见面' },
  { time: 270, text: '我想我会勇敢一点' },
];

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function formatCount(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return `${n}`;
}

export function playlistDuration(p: Playlist): string {
  const total = p.tracks.reduce((sum, id) => sum + getTrack(id).duration, 0);
  if (total < 60) return `${Math.max(0, Math.round(total))} 秒`;
  const h = Math.floor(total / 3600);
  const m = Math.round((total % 3600) / 60);
  return h > 0 ? `${h} 小时 ${m} 分` : `${m} 分钟`;
}
