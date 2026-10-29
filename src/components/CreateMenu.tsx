import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';

export type CreateKind = 'playlist' | 'blend' | 'folder';

export interface CreateAnchor {
  left: number;
  top: number;
  right: number;
}

interface CreateMenuProps {
  anchor: CreateAnchor;
  trigger: HTMLElement | null;
  onPick(kind: CreateKind): void;
  onClose(): void;
}

const MENU_WIDTH = 308;
const MENU_HEIGHT = 300;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function place(anchor: CreateAnchor): { left: number; top: number } {
  const left = clamp(anchor.left, 8, window.innerWidth - MENU_WIDTH - 8);
  const top = clamp(anchor.top, 8, window.innerHeight - MENU_HEIGHT - 8);
  return { left, top };
}

export function CreateMenu({ anchor, trigger, onPick, onClose }: CreateMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { left, top } = place(anchor);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if (trigger?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onDismiss = () => onClose();
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onDismiss);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onDismiss);
    };
  }, [onClose, trigger]);

  const pick = (kind: CreateKind) => {
    onPick(kind);
    onClose();
  };

  return createPortal(
    <div className="create-menu" style={{ left, top }} role="menu" aria-label="创建">
      <button type="button" className="create-menu-row" role="menuitem" onClick={() => pick('playlist')}>
        <span className="create-menu-icon">
          <Icon name="notePlus" size={24} />
        </span>
        <span className="create-menu-copy">
          <span className="create-menu-title">歌单</span>
          <span className="create-menu-desc">创建包含歌曲或单集的歌单</span>
        </span>
      </button>

      <button type="button" className="create-menu-row" role="menuitem" onClick={() => pick('blend')}>
        <span className="create-menu-icon">
          <Icon name="slidersV" size={24} />
        </span>
        <span className="create-menu-copy">
          <span className="create-menu-title">本地合辑</span>
          <span className="create-menu-desc">从本地音乐库和本地点赞生成一张合辑</span>
        </span>
      </button>

      <div className="create-menu-sep" />

      <button type="button" className="create-menu-row" role="menuitem" onClick={() => pick('folder')}>
        <span className="create-menu-icon">
          <Icon name="folder" size={24} />
        </span>
        <span className="create-menu-copy">
          <span className="create-menu-title">文件夹</span>
          <span className="create-menu-desc">管理歌单</span>
        </span>
      </button>
    </div>,
    document.body,
  );
}
