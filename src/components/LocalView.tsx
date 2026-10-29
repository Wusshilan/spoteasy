import { PlaylistView } from './PlaylistView';
import { useLibrary } from '../state/library';
import type { Playlist } from '../data/mock';
import type { Route } from '../routing';

export function LocalView({ navigate }: { navigate: (route: Route) => void }) {
  const { tracks, folders, scanning, progress, chooseFolder, rescan } = useLibrary();

  const folderNames = folders
    .map((folder) => folder.split(/[\\/]/).filter(Boolean).pop())
    .filter(Boolean) as string[];

  const playlist: Playlist = {
    id: 'local-all',
    name: '本地音乐',
    desc:
      folderNames.length > 0
        ? folderNames.join(' · ')
        : '从电脑里选择一个音乐文件夹，Spoteasy 会扫描并记住它。',
    owner: '我的电脑',
    hue: 158,
    variant: 4,
    tracks: tracks.map((track) => track.id),
  };

  return (
    <PlaylistView
      playlist={playlist}
      navigate={navigate}
      local={{
        folders,
        scanning,
        progress,
        onChooseFolder: chooseFolder,
        onRescan: rescan,
      }}
    />
  );
}
