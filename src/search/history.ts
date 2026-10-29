import { useEffect, useState } from 'react';
import type { Route } from '../routing';
import type { Track } from '../data/mock';

export type RecentKind = 'track' | 'album' | 'playlist' | 'artist' | 'podcast' | 'local' | 'mv';

export interface RecentSearch {
  key: string;
  kind: RecentKind;
  id: string;
  title: string;
  sub: string;
  coverUrl?: string;
  hue: number;
  variant: number;
  route?: Route;
  verified?: boolean;
  track?: Track;
}

const KEY = 'spoteasy.recentSearches';
const EVENT = 'spoteasy:recent-searches';

function read(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.key && item.title).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

export function addRecentSearch(item: RecentSearch) {
  const list = read().filter((entry) => entry.key !== item.key);
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8)));
  emit();
}

export function removeRecentSearch(key: string) {
  const list = read().filter((entry) => entry.key !== key);
  localStorage.setItem(KEY, JSON.stringify(list));
  emit();
}

export function clearRecentSearches() {
  localStorage.removeItem(KEY);
  emit();
}

export function useRecentSearches(): RecentSearch[] {
  const [items, setItems] = useState<RecentSearch[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return items;
}
