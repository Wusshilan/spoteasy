import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cover } from './CoverArt';
import { Icon } from './Icons';
import { getTrack, type Track } from '../data/mock';
import { useLibrary } from '../state/library';
import { useUi } from '../state/ui';

export function EditTrackDialog() {
  const library = useLibrary();
  const ui = useUi();
  const id = ui.editingTrackId;
  let track: Track | null = null;
  if (id) {
    try {
      track = getTrack(id);
    } catch {
      track = null;
    }
  }

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!track) return;
    setTitle(track.title);
    setArtist(track.artist);
    setAlbum(track.album);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ui.closeEditor();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [id, ui]);

  if (!id || !track || !track.local) return null;

  const save = async () => {
    if (!title.trim()) {
      ui.toast('标题不能为空');
      return;
    }
    setSaving(true);
    try {
      await library.updateTrack(track.id, { title: title.trim(), artist: artist.trim(), album: album.trim() });
      ui.toast('歌曲信息已保存');
      ui.closeEditor();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) ui.closeEditor();
      }}
    >
      <div className="edit-dialog" role="dialog" aria-modal="true" aria-label="编辑歌曲信息">
        <div className="edit-head">
          <h2>编辑歌曲信息</h2>
          <button type="button" className="icon-btn edit-close" onClick={ui.closeEditor} aria-label="关闭">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="edit-body">
          <div className="edit-cover-wrap">
            <Cover hue={track.hue} variant={track.variant} label={title || track.title} src={track.coverUrl} className="edit-cover" />
            <button type="button" className="settings-btn" onClick={() => library.chooseCover(track.id)}>
              更换封面
            </button>
          </div>

          <div className="edit-fields">
            <label className="edit-field">
              <span>标题</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </label>
            <label className="edit-field">
              <span>艺人</span>
              <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="未知艺人" />
            </label>
            <label className="edit-field">
              <span>专辑</span>
              <input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="未知专辑" />
            </label>
          </div>
        </div>

        <p className="edit-hint">只修改 Spoteasy 内的显示信息，不写入音频文件标签。</p>

        <div className="edit-actions">
          <button type="button" className="settings-btn" onClick={ui.closeEditor}>
            取消
          </button>
          <button type="button" className="settings-btn primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
