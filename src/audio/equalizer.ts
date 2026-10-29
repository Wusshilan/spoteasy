import { useEffect, type RefObject } from 'react';

export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const EQ_EVENT = 'spoteasy:eq';
export const EQ_KEY = 'spoteasy.eq';

export interface EqState {
  enabled: boolean;
  preset: string;
  gains: number[];
}

export const EQ_PRESETS: Array<{ key: string; label: string; gains: number[] }> = [
  { key: 'flat', label: '平直', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { key: 'pop', label: '流行', gains: [-1, 0, 2, 3, 2, 0, -1, -2, -2, -3] },
  { key: 'rock', label: '摇滚', gains: [5, 4, 2, 0, -1, -1, 1, 3, 4, 4] },
  { key: 'jazz', label: '爵士', gains: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3] },
  { key: 'classical', label: '古典', gains: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4] },
  { key: 'bass', label: '低音增强', gains: [7, 6, 4, 2, 0, -1, -2, -2, -1, 0] },
  { key: 'vocal', label: '人声强化', gains: [-2, -1, 0, 1, 3, 5, 5, 3, 1, 0] },
  { key: 'electronic', label: '电子', gains: [5, 4, 1, 0, -2, -1, 1, 3, 5, 5] },
];

export function defaultEq(): EqState {
  return { enabled: false, preset: 'flat', gains: [...EQ_PRESETS[0].gains] };
}

export function normalizeEq(input: unknown): EqState {
  const base = defaultEq();
  if (!input || typeof input !== 'object') return base;
  const value = input as Partial<EqState>;
  const gains = Array.isArray(value.gains)
    ? EQ_BANDS.map((_, index) => {
        const gain = Number(value.gains?.[index]);
        return Number.isFinite(gain) ? Math.max(-12, Math.min(12, gain)) : 0;
      })
    : base.gains;
  return {
    enabled: Boolean(value.enabled),
    preset: EQ_PRESETS.some((preset) => preset.key === value.preset) ? String(value.preset) : 'custom',
    gains,
  };
}

export function loadEqState(): EqState {
  try {
    return normalizeEq(JSON.parse(localStorage.getItem(EQ_KEY) || 'null'));
  } catch {
    return defaultEq();
  }
}

export function saveEqState(state: EqState) {
  const normalized = normalizeEq(state);
  localStorage.setItem(EQ_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(EQ_EVENT, { detail: normalized }));
}

/** Attach a 10-band peaking EQ to the player audio element. */
export function useEqualizer(audioRef: RefObject<HTMLAudioElement | null>) {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let context: AudioContext | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let filters: BiquadFilterNode[] = [];
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      context = new Ctor();
      source = context.createMediaElementSource(audio);
      filters = EQ_BANDS.map((frequency, index) => {
        const filter = context!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = frequency;
        filter.Q.value = index === 0 || index === EQ_BANDS.length - 1 ? 0.7 : 1.05;
        filter.gain.value = 0;
        return filter;
      });
      source.connect(filters[0]);
      for (let index = 0; index < filters.length - 1; index += 1) {
        filters[index].connect(filters[index + 1]);
      }
      filters[filters.length - 1].connect(context.destination);
    } catch (error) {
      console.warn('[eq] unavailable', error);
      context?.close().catch(() => undefined);
      return;
    }

    const apply = (state: EqState) => {
      const normalized = normalizeEq(state);
      filters.forEach((filter, index) => {
        filter.gain.value = normalized.enabled ? normalized.gains[index] : 0;
      });
    };
    const onEq = (event: Event) => apply((event as CustomEvent<EqState>).detail);
    const resume = () => {
      if (context?.state === 'suspended') context.resume().catch(() => undefined);
    };
    apply(loadEqState());
    window.addEventListener(EQ_EVENT, onEq);
    audio.addEventListener('play', resume);
    audio.addEventListener('canplay', resume);
    return () => {
      window.removeEventListener(EQ_EVENT, onEq);
      audio.removeEventListener('play', resume);
      audio.removeEventListener('canplay', resume);
      try {
        source?.disconnect();
        filters.forEach((filter) => filter.disconnect());
        context?.close();
      } catch {
        // ignore teardown errors
      }
    };
  }, [audioRef]);
}
