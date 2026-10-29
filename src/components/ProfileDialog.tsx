import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';
import { useNetease } from '../state/netease';

export function ProfileDialog() {
  const netease = useNetease();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<NeteasePublicUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!netease.profileOpen) return;
    setQuery('');
    setUsers([]);
    setError(null);
    setBusy(false);
  }, [netease.profileOpen]);

  if (!netease.profileOpen) return null;

  const search = async () => {
    const value = query.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (/^\d+$/.test(value)) {
        await netease.choosePublicUser(Number(value));
        return;
      }
      const result = await window.spoteasy?.netease?.searchUsers(value, 0, 20);
      setUsers(result?.users || []);
      if (!result?.users?.length) setError('没有找到用户');
    } catch (err) {
      setError(String((err as Error)?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const choose = async (uid: number) => {
    setBusy(true);
    setError(null);
    try {
      await netease.choosePublicUser(uid);
    } catch (err) {
      setError(String((err as Error)?.message || err));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) netease.closeProfile();
      }}
    >
      <div className="profile-dialog" role="dialog" aria-modal="true" aria-label="选择公开用户">
        <div className="edit-head">
          <h2>选择公开用户</h2>
          <button type="button" className="icon-btn edit-close" onClick={netease.closeProfile} aria-label="关闭">
            <Icon name="x" size={18} />
          </button>
        </div>

        <p className="profile-dialog-note">
          只读取公开主页数据，不使用登录 cookie，也不会执行点赞、关注或收藏。
        </p>

        {netease.publicProfile && (
          <div className="profile-current">
            <img src={netease.publicProfile.avatarUrl} alt="" />
            <div>
              <strong>{netease.publicProfile.nickname}</strong>
              <span>UID {netease.publicProfile.uid}</span>
            </div>
            <button type="button" className="settings-btn" onClick={netease.clearPublicUser}>
              清除
            </button>
          </div>
        )}

        <div className="profile-search-row">
          <label className="profile-search">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void search();
              }}
              placeholder="输入 UID 或用户名"
              autoFocus
            />
          </label>
          <button type="button" className="settings-btn primary" disabled={busy} onClick={() => void search()}>
            {busy ? '读取中…' : '搜索'}
          </button>
        </div>

        {error && <p className="profile-dialog-error">{error}</p>}

        {users.length > 0 && (
          <div className="profile-users">
            {users.map((user) => (
              <button
                key={user.uid}
                type="button"
                className="profile-user-row"
                disabled={busy}
                onClick={() => void choose(user.uid)}
              >
                <img src={user.avatarUrl} alt="" />
                <span>
                  <strong>{user.nickname}</strong>
                  <small>UID {user.uid} · {user.follows || 0} 关注</small>
                </span>
                <Icon name="chevronRight" size={16} />
              </button>
            ))}
          </div>
        )}

        <div className="profile-dialog-footer">
          <button
            type="button"
            className="settings-btn"
            onClick={() => {
              netease.closeProfile();
              netease.openLogin();
            }}
          >
            扫码登录（可选）
          </button>
          <span>登录只用于写操作和私密内容</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
