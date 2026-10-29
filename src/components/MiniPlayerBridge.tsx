import { useEffect, useRef } from 'react';
import { usePlayer } from '../state/player';
import { useNetease } from '../state/netease';
import { useUi } from '../state/ui';
import type { MiniCommand, MiniState } from '../mini';

export function MiniPlayerBridge() {
  const player = usePlayer();
  const netease = useNetease();
  const ui = useUi();
  const playerRef = useRef(player);
  const neteaseRef = useRef(netease);
  const uiRef = useRef(ui);
  playerRef.current = player;
  neteaseRef.current = netease;
  uiRef.current = ui;

  useEffect(() => {
    const api = window.spoteasy?.mini;
    if (!api) return;
    const track = player.track;
    const liked = track
      ? track.source === 'netease' && track.cloudId
        ? netease.likedIds.has(track.cloudId)
        : player.liked.has(track.id)
      : false;
    const state: MiniState = {
      track: track
        ? {
            id: track.id,
            title: track.title,
            artist: track.artist,
            coverUrl: track.coverUrl,
            hue: track.hue,
            variant: track.variant,
            cloudId: track.cloudId,
            source: track.source,
            duration: track.duration,
          }
        : null,
      playing: player.playing,
      progress: player.progress,
      duration: track?.duration ?? 0,
      volume: player.volume,
      shuffle: player.shuffle,
      repeat: player.repeat,
      liked,
      contextName: player.contextName,
    };
    api.publish(state);
  }, [
    player.track,
    player.playing,
    player.progress,
    player.volume,
    player.shuffle,
    player.repeat,
    player.contextName,
    player.liked,
    netease.likedIds,
  ]);

  useEffect(() => {
    const api = window.spoteasy?.mini;
    if (!api) return;
    const off = api.onCommand((command: MiniCommand) => {
      const current = playerRef.current;
      const cloud = neteaseRef.current;
      const messages = uiRef.current;
      switch (command.type) {
        case 'toggle':
          current.toggle();
          break;
        case 'next':
          current.next();
          break;
        case 'prev':
          current.prev();
          break;
        case 'seek':
          current.seek(command.value);
          break;
        case 'volume':
          current.setVolume(command.value);
          break;
        case 'mute':
          current.setVolume(current.volume > 0 ? 0 : 0.72);
          break;
        case 'shuffle':
          current.toggleShuffle();
          break;
        case 'repeat':
          current.cycleRepeat();
          break;
        case 'like': {
          const track = current.track;
          if (!track) break;
          if (track.source === 'netease' && track.cloudId) {
            if (!cloud.loggedIn) {
              messages.toast('请先登录');
              cloud.openLogin();
              break;
            }
            cloud.toggleCloudLike(track.cloudId).catch(() => messages.toast('操作失败'));
          } else {
            current.toggleLike();
          }
          break;
        }
        case 'focus-main':
          api.focusMain();
          break;
        default:
          break;
      }
    });
    return off;
  }, []);

  return null;
}
