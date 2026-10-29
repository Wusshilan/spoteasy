import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';
import { useNetease } from '../state/netease';

export function LoginDialog() {
  const netease = useNetease();
  const [qr, setQr] = useState<NeteaseQr | null>(null);
  const [hint, setHint] = useState('正在获取二维码…');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!netease.loginOpen) return;
    let alive = true;
    let timer: number | undefined;
    setQr(null);
    setError(null);
    setHint('正在获取二维码…');

    const start = async () => {
      try {
        const api = window.spoteasy?.netease;
        if (!api) throw new Error('服务 API 未加载');
        const next = await api.qrStart();
        if (!alive) return;
        setQr(next);
        setHint('打开音乐 App，扫一扫登录');
        timer = window.setInterval(async () => {
          try {
            const result = await api.qrCheck(next.key);
            if (!alive) return;
            if (result.code === 803) {
              await netease.refreshStatus();
              netease.closeLogin();
            } else if (result.code === 802) {
              setHint('已扫码，请在手机上确认');
            } else if (result.code === 800) {
              setHint('二维码已过期，点刷新重试');
              setQr(null);
              if (timer) window.clearInterval(timer);
            }
          } catch {
            if (alive) setHint('检查登录状态失败，请刷新二维码');
          }
        }, 2000);
      } catch (err) {
        if (alive) {
          setError(String((err as Error)?.message || '无法获取二维码'));
          setHint('登录暂时不可用');
        }
      }
    };

    start();
    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
    };
  }, [netease.loginOpen, nonce]);

  if (!netease.loginOpen) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) netease.closeLogin();
      }}
    >
      <div className="login-dialog" role="dialog" aria-modal="true" aria-label="登录">
        <div className="edit-head">
          <h2>登录</h2>
          <button type="button" className="icon-btn edit-close" onClick={netease.closeLogin} aria-label="关闭">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="login-qr">
          {qr?.qrimg ? (
            <img src={qr.qrimg} alt="登录二维码" />
          ) : (
            <div className="login-qr-placeholder">
              <Icon name="user" size={38} />
              <span>{error ? '登录暂不可用' : '正在生成…'}</span>
            </div>
          )}
        </div>

        <p className={`login-hint ${error ? 'is-error' : ''}`}>{hint}</p>

        <div className="edit-actions login-actions">
          <button type="button" className="settings-btn" onClick={() => setNonce((value) => value + 1)}>
            刷新二维码
          </button>
          <button type="button" className="settings-btn primary" onClick={netease.closeLogin}>
            取消
          </button>
        </div>

        <p className="login-note">登录只用于获取你自己账号已有权限的内容；会话加密保存在本机，不会上传密码。</p>
      </div>
    </div>,
    document.body,
  );
}
