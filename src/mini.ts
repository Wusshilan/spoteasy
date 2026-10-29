export interface MiniTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  hue: number;
  variant: number;
  cloudId?: number;
  source?: string;
  duration: number;
}

export interface MiniState {
  track: MiniTrack | null;
  playing: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  liked: boolean;
  contextName: string;
}

export type MiniCommand =
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'seek'; value: number }
  | { type: 'volume'; value: number }
  | { type: 'mute' }
  | { type: 'shuffle' }
  | { type: 'repeat' }
  | { type: 'like' }
  | { type: 'focus-main' };
