import type { LyricLine } from './mock';

/** 解析 LRC：支持一行多个时间戳、[mm:ss.xx] / [mm:ss:xx]。 */
export function parseLrc(raw: string): LyricLine[] {
  if (!raw) return [];
  const lines: LyricLine[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const tags = [...line.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (!tags.length) continue;
    const text = line.replace(/\[[^\]]+\]/g, '').trim();
    if (!text) continue;
    for (const tag of tags) {
      const minutes = Number(tag[1]);
      const seconds = Number(tag[2]);
      const fraction = tag[3] ? Number(tag[3].padEnd(3, '0').slice(0, 3)) : 0;
      lines.push({
        time: minutes * 60 + seconds + fraction / 1000,
        text,
      });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}
