import { useEffect, useState } from 'react';
import mark from '../assets/spoteasy-mark.svg';
import { Icon } from './Icons';

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const api = window.spoteasy?.win;
    if (!api) return;
    api.isMaximized().then(setMaximized);
    return api.onMaximized(setMaximized);
  }, []);

  const win = window.spoteasy?.win;

  return (
    <header className="titlebar" onDoubleClick={() => win?.toggleMaximize()}>
      <div className="titlebar-brand">
        <span className="brand-mark">
          <img src={mark} alt="" />
        </span>
        <span className="brand-name">Spoteasy</span>
        <span className="brand-sub">音乐</span>
      </div>
      <div className="titlebar-drag" />
      <div className="win-controls">
        <button type="button" className="win-btn" aria-label="最小化" onClick={() => win?.minimize()}>
          <Icon name="minimize" size={16} />
        </button>
        <button
          type="button"
          className="win-btn"
          aria-label={maximized ? '还原' : '最大化'}
          onClick={() => win?.toggleMaximize()}
        >
          <Icon name={maximized ? 'restore' : 'maximize'} size={16} />
        </button>
        <button type="button" className="win-btn win-close" aria-label="关闭" onClick={() => win?.close()}>
          <Icon name="close" size={16} />
        </button>
      </div>
    </header>
  );
}
