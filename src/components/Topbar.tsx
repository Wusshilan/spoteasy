import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { SearchBox } from './SearchBox';
import { Avatar } from './CoverArt';
import mark from '../assets/spoteasy-mark.svg';
import { useNetease } from '../state/netease';
import { useUi } from '../state/ui';
import type { Route } from '../routing';

interface TopbarProps {
  route: Route;
  canBack: boolean;
  canForward: boolean;
  onBack(): void;
  onForward(): void;
  onCollapseLibrary(): void;
  navigate(route: Route): void;
}

export function Topbar({ route, canBack, canForward, onBack, onForward, onCollapseLibrary, navigate }: TopbarProps) {
  const { toast } = useUi();
  const netease = useNetease();
  const [menuOpen, setMenuOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [update, setUpdate] = useState<{ version: string; assetUrl: string } | null>(null);
  const [updating, setUpdating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const appMenuRef = useRef<HTMLDivElement>(null);
  const displayName = netease.loggedIn ? netease.nickname : netease.publicProfile?.nickname || '音乐爱好者';
  const displayAvatar = netease.loggedIn ? netease.avatar : netease.publicProfile?.avatarUrl;
  const win = window.spoteasy?.win;
  const homeActive = route.name === 'home';
  const browseActive = route.name === 'browse';
  const whatsNewActive = route.name === 'whatsNew';
  const followingActive = route.name === 'following';

  useEffect(() => {
    if (!menuOpen && !appMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (appMenuRef.current && !appMenuRef.current.contains(e.target as Node)) setAppMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen, appMenuOpen]);

  useEffect(() => {
    if (!win) return;
    win.isMaximized().then(setMaximized);
    return win.onMaximized(setMaximized);
  }, [win]);

  useEffect(() => {
    let alive = true;
    const api = window.spoteasy?.app;
    if (!api?.latestRelease) return;
    const isNewer = (latest: string, current: string) => {
      const a = latest.split('.').map((part) => Number(part) || 0);
      const b = current.split('.').map((part) => Number(part) || 0);
      for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
        if ((a[index] || 0) > (b[index] || 0)) return true;
        if ((a[index] || 0) < (b[index] || 0)) return false;
      }
      return false;
    };
    const check = () => {
      Promise.all([api.info(), api.latestRelease()])
        .then(([info, release]) => {
          if (!alive || !release?.version || !release.assetUrl) return;
          if (isNewer(release.version, info.version)) {
            setUpdate({ version: release.version, assetUrl: release.assetUrl });
          }
        })
        .catch(() => undefined);
    };
    check();
    const timer = window.setInterval(check, 30 * 60_000);
    window.addEventListener('focus', check);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
    };
  }, []);

  const installUpdate = async () => {
    if (!update || updating) return;
    setUpdating(true);
    const result = await window.spoteasy?.app.installUpdate(update.assetUrl);
    if (!result?.ok) {
      setUpdating(false);
      toast(result?.error || '更新失败');
    }
  };

  return (
    <header className="topbar" onDoubleClick={() => win?.toggleMaximize()}>
      <div className="topbar-left">
        <div className="app-menu-wrap" ref={appMenuRef}>
          <button
            type="button"
            className="topbar-logo"
            aria-label="应用菜单"
            title="应用菜单"
            onClick={() => setAppMenuOpen((value) => !value)}
          >
            <img src={mark} alt="Spoteasy" draggable={false} />
          </button>
          {appMenuOpen && (
            <div className="app-menu">
              <div className="app-menu-brand">
                <span>Spoteasy</span>
                <small>0.1.40</small>
              </div>
              <button
                type="button"
                className="menu-row"
                onClick={() => {
                  setAppMenuOpen(false);
                  navigate({ name: 'library' });
                }}
              >
                <Icon name="library" size={16} />
                <span>打开音乐库</span>
              </button>
              <button
                type="button"
                className="menu-row"
                onClick={() => {
                  setAppMenuOpen(false);
                  onCollapseLibrary();
                }}
              >
                <Icon name="panelOpen" size={16} />
                <span>收起音乐库</span>
              </button>
              <button
                type="button"
                className="menu-row"
                onClick={() => {
                  setAppMenuOpen(false);
                  navigate({ name: 'local' });
                }}
              >
                <Icon name="disc" size={16} />
                <span>本地音乐</span>
              </button>
              <button
                type="button"
                className="menu-row"
                onClick={() => {
                  setAppMenuOpen(false);
                  navigate({ name: 'settings' });
                }}
              >
                <Icon name="sliders" size={16} />
                <span>设置</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="nav-arrow"
          disabled={!canBack}
          onClick={onBack}
          aria-label="后退"
          title="后退"
        >
          <Icon name="arrowLeft" size={28} />
        </button>
        <button
          type="button"
          className="nav-arrow"
          disabled={!canForward}
          onClick={onForward}
          aria-label="前进"
          title="前进"
        >
          <Icon name="arrowRight" size={28} />
        </button>
      </div>

      <div className="topbar-center">
        {update && (
          <button
            type="button"
            className="update-pill"
            disabled={updating}
            onClick={() => void installUpdate()}
            title={`更新到 ${update.version}`}
          >
            {updating ? '更新中…' : '更新'}
          </button>
        )}
        <button
          type="button"
          className={`home-btn ${homeActive ? 'is-active' : ''}`}
          onClick={() => navigate({ name: 'home' })}
          aria-label="首页"
          title="首页"
        >
          <Icon name={homeActive ? 'home' : 'homeOutline'} size={24} />
        </button>

        <div className="search-pill">
          <SearchBox route={route} navigate={navigate} />
          <span className="search-pill-sep" aria-hidden="true" />
          <button
            type="button"
            className={`search-browse ${browseActive ? 'is-active' : ''}`}
            aria-label="浏览"
            title="浏览"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              navigate({ name: 'browse' });
            }}
          >
            <Icon name={browseActive ? 'browseFill' : 'browse'} size={24} />
          </button>
        </div>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className={`tb-icon ${whatsNewActive ? 'is-active' : ''}`}
          aria-label="新增内容"
          title="新增内容"
          onClick={() => navigate({ name: 'whatsNew' })}
        >
          <Icon name="bell" size={22} />
        </button>
        <button
          type="button"
          className={`tb-icon ${followingActive ? 'is-active' : ''}`}
          aria-label="收听动态"
          title="收听动态"
          onClick={() => navigate({ name: 'following' })}
        >
          <Icon name="users" size={22} />
        </button>

        <div className="profile" ref={menuRef}>
          <button type="button" className="profile-btn" onClick={() => setMenuOpen((value) => !value)}>
            <Avatar hue={158} label={displayName.slice(0, 1)} size={36} src={displayAvatar} />
          </button>

          {menuOpen && (
            <div className="profile-menu">
              <div className="profile-head">
                <Avatar hue={158} label={displayName.slice(0, 1)} size={40} src={displayAvatar} />
                <div>
                  <div className="profile-head-name">{displayName}</div>
                  <div className="profile-head-sub">{netease.loggedIn ? '已登录' : netease.publicProfile ? `公开数据 · UID ${netease.publicProfile.uid}` : '未选择用户'}</div>
                </div>
              </div>
              <div className="menu-sep" />
              <button
                type="button"
                className="menu-row"
                onClick={() => {
                  setMenuOpen(false);
                  netease.openProfile();
                }}
              >
                <Icon name="users" size={16} />
                <span>{netease.publicProfile ? '切换公开用户' : '选择公开用户'}</span>
              </button>
              <button
                type="button"
                className="menu-row"
                onClick={() => {
                  setMenuOpen(false);
                  navigate({ name: 'settings' });
                }}
              >
                <Icon name="sliders" size={16} />
                <span>设置</span>
              </button>
              <button
                type="button"
                className="menu-row"
                onClick={() => {
                  setMenuOpen(false);
                  navigate({ name: 'local' });
                }}
              >
                <Icon name="disc" size={16} />
                <span>本地音乐</span>
              </button>
              <div className="menu-sep" />
              {netease.loggedIn ? (
                <button
                  type="button"
                  className="menu-row is-muted"
                  onClick={() => {
                    setMenuOpen(false);
                    netease.logout();
                    toast('已退出登录');
                  }}
                >
                  <Icon name="user" size={16} />
                  <span>退出登录</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="menu-row"
                  onClick={() => {
                    setMenuOpen(false);
                    netease.openLogin();
                  }}
                >
                  <Icon name="user" size={16} />
                  <span>登录</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="topbar-win">
          <button type="button" className="win-btn" aria-label="最小化" onClick={() => win?.minimize()}>
            <Icon name="minimize" size={17} />
          </button>
          <button
            type="button"
            className="win-btn"
            aria-label={maximized ? '还原' : '最大化'}
            onClick={() => win?.toggleMaximize()}
          >
            <Icon name={maximized ? 'restore' : 'maximize'} size={17} />
          </button>
          <button type="button" className="win-btn win-close" aria-label="关闭" onClick={() => win?.close()}>
            <Icon name="close" size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
