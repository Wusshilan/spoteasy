import { useEffect, useState } from 'react';
import { Icon } from './Icons';
import { useNetease } from '../state/netease';

export function SessionBanner() {
  const netease = useNetease();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!netease.sessionExpired) setDismissed(false);
  }, [netease.sessionExpired]);

  if (!netease.sessionExpired || dismissed) return null;

  return (
    <div className="session-banner" role="status">
      <span className="session-banner-dot" aria-hidden="true" />
      <span>网易云登录已失效，播放和云端操作会失败。</span>
      <button type="button" className="session-banner-login" onClick={() => netease.openLogin()}>
        重新登录
      </button>
      <button
        type="button"
        className="session-banner-dismiss"
        aria-label="稍后处理"
        title="稍后处理"
        onClick={() => setDismissed(true)}
      >
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}
