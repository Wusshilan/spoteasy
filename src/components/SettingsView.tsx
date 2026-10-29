import { useCallback, useEffect, useState } from 'react';
import mark from '../assets/spoteasy-mark.svg';
import { Icon } from './Icons';
import { useLibrary } from '../state/library';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Repeat } from '../state/player';

type Tab = 'preferences' | 'local' | 'playback' | 'appearance' | 'about';

const tabs: Array<[Tab, string]> = [
  ['preferences', '偏好设置'],
  ['local', '本地音乐'],
  ['playback', '播放'],
  ['appearance', '外观'],
  ['about', '关于'],
];

const repeatOptions: Array<[Repeat, string]> = [
  ['off', '关闭'],
  ['all', '列表循环'],
  ['one', '单曲循环'],
];

const qualityOptions: Array<[NeteaseQuality, string]> = [
  ['standard', '标准'],
  ['higher', '较高'],
  ['exhigh', '极高'],
  ['lossless', '无损'],
  ['hires', 'Hi-Res'],
];

function Switch({ on, onClick, label }: { on: boolean; onClick(): void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch ${on ? 'is-on' : ''}`}
      onClick={onClick}
    />
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(0, Math.round(bytes / 1024))} KB`;
}

export function SettingsView() {
  const library = useLibrary();
  const netease = useNetease();
  const player = usePlayer();
  const ui = useUi();
  const [tab, setTab] = useState<Tab>('preferences');
  const [zoom, setZoom] = useState(() => {
    const value = Number(localStorage.getItem('spoteasy.zoom') || 100);
    return value >= 70 && value <= 130 ? value : 100;
  });
  const [compactLibrary, setCompactLibrary] = useState(() => localStorage.getItem('spoteasy.compactLibrary') === '1');
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('spoteasy.reduceMotion') === '1');
  const [updateState, setUpdateState] = useState<{ checking?: boolean; version?: string; url?: string; assetUrl?: string; error?: string }>({});
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [blockedArtists, setBlockedArtists] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('spoteasy.blockedArtists');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const refreshStats = useCallback(async () => {
    try {
      setStats((await window.spoteasy?.library.stats()) ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshStats();
    window.spoteasy?.app
      .info()
      .then(setInfo)
      .catch(() => undefined);
  }, [refreshStats]);

  useEffect(() => {
    document.documentElement.style.zoom = `${zoom}%`;
    localStorage.setItem('spoteasy.zoom', String(zoom));
  }, [zoom]);

  useEffect(() => {
    document.documentElement.dataset.compactLibrary = compactLibrary ? '1' : '0';
    localStorage.setItem('spoteasy.compactLibrary', compactLibrary ? '1' : '0');
  }, [compactLibrary]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? '1' : '0';
    localStorage.setItem('spoteasy.reduceMotion', reduceMotion ? '1' : '0');
  }, [reduceMotion]);

  useEffect(() => {
    refreshStats();
  }, [library.tracks, library.folders, refreshStats]);

  const run = useCallback(
    async (action: () => Promise<void>, message?: string) => {
      setBusy(true);
      try {
        await action();
        if (message) ui.toast(message);
      } catch (err) {
        console.warn('[settings] action failed', err);
      } finally {
        setBusy(false);
        await refreshStats();
      }
    },
    [refreshStats, ui],
  );

  const normalize = (value: string) => value.replace(/\\/g, '/').toLowerCase();
  const isInside = (file: string | undefined, folder: string) => {
    if (!file) return false;
    const target = normalize(file);
    const base = normalize(folder);
    return target === base || target.startsWith(`${base}/`);
  };
  const folderName = (folder: string) => folder.split(/[\\/]/).filter(Boolean).pop() ?? folder;
  const countIn = (folder: string) => library.tracks.filter((track) => isInside(track.path, folder)).length;
  const scanPercent =
    library.progress && library.progress.total > 0
      ? Math.round((library.progress.done / library.progress.total) * 100)
      : 0;

  const checkUpdate = async () => {
    setUpdateState({ checking: true });
    const result = await window.spoteasy?.app.latestRelease();
    if (!result || result.error) {
      setUpdateState({ error: result?.error || '检查失败' });
      return;
    }
    setUpdateState({ version: result.version, url: result.url, assetUrl: result.assetUrl });
    if (result.version === info?.version) ui.toast('已经是最新版本');
  };

  const latest = updateState.version && updateState.version !== info?.version;

  return (
    <div className="settings-page">
      <h1 className="settings-title">设置</h1>

      <div className="settings-tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`settings-tab ${tab === key ? 'is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'preferences' && (
        <div className="settings-body spotify-settings">
          <section className="settings-section">
            <h2>账号</h2>
            <div className="settings-row">
              <div className="settings-label">{netease.loggedIn ? netease.nickname : '音乐爱好者'}</div>
              <div className="settings-control settings-actions">
                <button type="button" className="settings-btn" onClick={() => (netease.loggedIn ? void netease.logout() : netease.openLogin())}>
                  <Icon name="user" size={16} />
                  {netease.loggedIn ? '退出登录' : '登录网易云'}
                </button>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h2>语言</h2>
            <div className="settings-row">
              <div className="settings-label">选择语言</div>
              <div className="settings-control">
                <span className="settings-value">简体中文 (Simp)</span>
              </div>
            </div>
            <p className="settings-help">当前版本只提供简体中文。</p>
          </section>

          <section className="settings-section">
            <h2>儿童不宜内容</h2>
            <div className="settings-row">
              <div className="settings-label">允许播放儿童不宜内容</div>
              <div className="settings-control"><span className="settings-value">网易云接口未返回明确分级，暂不可用</span></div>
            </div>
          </section>

          <section className="settings-section">
            <h2>音质</h2>
            <div className="settings-row">
              <div className="settings-label">串流播放品质</div>
              <div className="settings-control">
                <div className="segmented">
                  {qualityOptions.map(([value, label]) => (
                    <button key={value} type="button" className={netease.quality === value ? 'is-active' : ''} onClick={() => netease.setQuality(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">下载</div>
              <div className="settings-control"><span className="settings-value">当前版本未提供下载功能</span></div>
            </div>
          </section>

          <section className="settings-section">
            <h2>音乐库</h2>
            <div className="settings-row">
              <div className="settings-label">使用紧凑音乐库布局</div>
              <div className="settings-control"><Switch on={compactLibrary} onClick={() => setCompactLibrary((value) => !value)} label="使用紧凑音乐库布局" /></div>
            </div>
            <div className="settings-row">
              <div className="settings-label">从其他应用导入音乐</div>
              <div className="settings-control">
                <button type="button" className="settings-btn" disabled={busy || library.scanning} onClick={() => run(() => library.chooseFolder(), '本地库已更新')}>
                  <Icon name="plus" size={16} /> 导入音乐库
                </button>
              </div>
            </div>
            <p className="settings-help">导入会添加本地文件夹并重新扫描索引，不会移动或删除原文件。</p>
          </section>

          <section className="settings-section">
            <h2>显示</h2>
            <div className="settings-row">
              <div className="settings-label">减少动态效果</div>
              <div className="settings-control"><Switch on={reduceMotion} onClick={() => setReduceMotion((value) => !value)} label="减少动态效果" /></div>
            </div>
            <p className="settings-help">开启后关闭界面过渡、骨架动画和沉浸卡片动画。</p>
          </section>

          <section className="settings-section">
            <h2>视频和 Canvas</h2>
            <div className="settings-row">
              <div className="settings-label">Canvas</div>
              <div className="settings-control"><span className="settings-value">当前版本未接入视频 Canvas</span></div>
            </div>
            <div className="settings-row">
              <div className="settings-label">其他视频</div>
              <div className="settings-control"><span className="settings-value">当前版本未接入视频</span></div>
            </div>
          </section>

          <section className="settings-section">
            <h2>收听动态和洞察</h2>
            <div className="settings-row">
              <div className="settings-label">私人点歌房</div>
              <div className="settings-control"><span className="settings-value">需要 Spotify 社交服务，当前使用网易云</span></div>
            </div>
            <div className="settings-row">
              <div className="settings-label">收听动态</div>
              <div className="settings-control"><span className="settings-value">当前未接入社交动态</span></div>
            </div>
          </section>

          <section className="settings-section">
            <h2>播放增强</h2>
            <div className="settings-row">
              <div className="settings-label">淡入 / 淡出</div>
              <div className="settings-control"><span className="settings-value">未接入音频处理</span></div>
            </div>
            <div className="settings-row">
              <div className="settings-label">无缝播放 / 自动混音</div>
              <div className="settings-control"><span className="settings-value">未接入音频处理</span></div>
            </div>
            <div className="settings-row">
              <div className="settings-label">音量标准化 / 单声道</div>
              <div className="settings-control"><span className="settings-value">未接入音频处理</span></div>
            </div>
          </section>

          <section className="settings-section">
            <h2>缩放级别</h2>
            <div className="settings-row">
              <div className="settings-label">界面缩放</div>
              <div className="settings-control settings-actions">
                {[70, 80, 90, 100, 110, 120, 130].map((value) => (
                  <button key={value} type="button" className={`settings-btn ${zoom === value ? 'primary' : ''}`} onClick={() => setZoom(value)}>
                    {value}%
                  </button>
                ))}
                <button type="button" className="settings-btn" onClick={() => setZoom(100)}>重置</button>
              </div>
            </div>
            <p className="settings-help">也可以用 Ctrl + / Ctrl - 调整缩放。</p>
          </section>

          <section className="settings-section">
            <h2>播放</h2>
            <div className="settings-row">
              <div className="settings-label">音量</div>
              <div className="settings-control">
                <input className="settings-range" type="range" min="0" max="100" value={Math.round(player.volume * 100)} onChange={(event) => player.setVolume(Number(event.target.value) / 100)} aria-label="音量" />
                <span className="settings-value">{Math.round(player.volume * 100)}%</span>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">随机播放</div>
              <div className="settings-control"><Switch on={player.shuffle} onClick={player.toggleShuffle} label="随机播放" /></div>
            </div>
            <div className="settings-row">
              <div className="settings-label">循环模式</div>
              <div className="settings-control">
                <div className="segmented">
                  {repeatOptions.map(([value, label]) => (
                    <button key={value} type="button" className={player.repeat === value ? 'is-active' : ''} onClick={() => player.setRepeat(value)}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">睡眠定时器</div>
              <div className="settings-control settings-actions">
                {ui.sleepAt ? (
                  <>
                    <span className="settings-value">已开启 · 约 {Math.max(0, Math.ceil((ui.sleepAt - Date.now()) / 60_000))} 分钟</span>
                    <button type="button" className="settings-btn" onClick={() => ui.setSleepAt(null)}>取消</button>
                  </>
                ) : (
                  [15, 30, 60].map((minutes) => (
                    <button key={minutes} type="button" className="settings-btn" onClick={() => ui.setSleepAt(Date.now() + minutes * 60_000)}>{minutes} 分钟</button>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h2>存储</h2>
            <div className="settings-row">
              <div className="settings-label">曲目 / 文件夹</div>
              <div className="settings-control"><span className="settings-value">{library.tracks.length} 首 · {library.folders.length} 个文件夹</span></div>
            </div>
            <div className="settings-row">
              <div className="settings-label">封面缓存</div>
              <div className="settings-control settings-actions">
                <button type="button" className="settings-btn" disabled={busy || !stats || stats.covers === 0} onClick={() => run(() => library.clearCovers(), '封面缓存已清理')}>
                  清理 {stats?.covers ?? 0} 张
                </button>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h2>关于 Spoteasy</h2>
            <div className="settings-row">
              <div className="settings-label">当前版本</div>
              <div className="settings-control"><span className="settings-value">v{info?.version ?? '0.1.32'}</span></div>
            </div>
            <div className="settings-row">
              <div className="settings-label">检查更新</div>
              <div className="settings-control settings-actions">
                <button type="button" className="settings-btn" disabled={updateState.checking} onClick={() => void checkUpdate()}>
                  {updateState.checking ? '检查中…' : '检查更新'}
                </button>
                {latest && updateState.url && (
                  <button
                    type="button"
                    className="settings-btn primary"
                    onClick={async () => {
                      const result = await window.spoteasy?.app.installUpdate(updateState.assetUrl || '');
                      if (!result?.ok) ui.toast(result?.error || '下载更新失败');
                    }}
                  >
                    下载并安装 {updateState.version}
                  </button>
                )}
                {updateState.error && <span className="settings-value">{updateState.error}</span>}
              </div>
            </div>
            <p className="settings-help">安装版请使用 NSIS Setup；portable 版本不能自动覆盖更新。</p>
          </section>
        </div>
      )}

      {tab === 'local' && (
        <div className="settings-body">
          <section className="settings-section">
            <h2>音乐文件夹</h2>
            <p className="settings-help">Spoteasy 会递归扫描这些文件夹里的音频文件，并把索引存在本地。</p>

            {library.folders.length === 0 && <div className="settings-empty">还没有添加文件夹</div>}

            {library.folders.map((folder) => (
              <div className="folder-row" key={folder}>
                <span className="folder-icon">
                  <Icon name="disc" size={18} />
                </span>
                <div className="folder-body">
                  <div className="folder-name">{folderName(folder)}</div>
                  <div className="folder-path">{folder}</div>
                </div>
                <span className="folder-count">{countIn(folder)} 首</span>
                <button
                  type="button"
                  className="settings-btn"
                  disabled={busy || library.scanning}
                  onClick={() => run(() => library.removeFolder(folder), '已移除文件夹')}
                >
                  移除
                </button>
              </div>
            ))}

            <div className="settings-actions">
              <button
                type="button"
                className="settings-btn primary"
                disabled={busy || library.scanning}
                onClick={() => run(() => library.chooseFolder(), '本地库已更新')}
              >
                <Icon name="plus" size={16} />
                添加文件夹
              </button>
              <button
                type="button"
                className="settings-btn"
                disabled={busy || library.scanning || library.folders.length === 0}
                onClick={() => run(() => library.rescan(), '扫描完成')}
              >
                <Icon name="repeat" size={16} />
                重新扫描
              </button>
            </div>

            {library.scanning && (
              <div className="scan-status settings-scan">
                <div className="scan-bar">
                  <span style={{ width: `${scanPercent}%` }} />
                </div>
                <span>
                  正在扫描 {library.progress?.done ?? 0}/{library.progress?.total ?? '…'}
                </span>
              </div>
            )}
          </section>

          <section className="settings-section">
            <h2>存储</h2>
            <div className="settings-row">
              <div className="settings-label">曲目</div>
              <div className="settings-control">
                {library.tracks.length} 首 · {library.folders.length} 个文件夹
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">索引文件</div>
              <div className="settings-control">
                <span className="mono">{stats ? `${formatBytes(stats.bytes)} · ${stats.path}` : '读取中…'}</span>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">数据目录</div>
              <div className="settings-control">
                <span className="mono">{info?.userData ?? '读取中…'}</span>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">缓存清理</div>
              <div className="settings-control settings-actions">
                <button
                  type="button"
                  className="settings-btn"
                  disabled={busy || !stats || stats.missing === 0}
                  onClick={() => run(() => library.prune(), '已清理失效条目')}
                >
                  清理失效条目{stats && stats.missing > 0 ? ` (${stats.missing})` : ''}
                </button>
                <button
                  type="button"
                  className="settings-btn"
                  disabled={busy || !stats || stats.covers === 0}
                  onClick={() => run(() => library.clearCovers(), '封面缓存已清理')}
                >
                  清理封面缓存{stats && stats.covers > 0 ? ` (${stats.covers})` : ''}
                </button>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">操作</div>
              <div className="settings-control settings-actions">
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => {
                    window.spoteasy?.app.openDataFolder();
                    ui.toast('已打开数据目录');
                  }}
                >
                  打开数据文件夹
                </button>
                <button
                  type="button"
                  className="settings-btn danger"
                  disabled={busy || (library.tracks.length === 0 && library.folders.length === 0)}
                  onClick={() => {
                    if (!window.confirm('清空本地音乐库？不会删除磁盘上的音乐文件。')) return;
                    run(() => library.clearLibrary(), '本地库已清空');
                  }}
                >
                  清空本地库
                </button>
              </div>
            </div>
            <p className="settings-help">清空只会移除索引和封面缓存，不会删除磁盘上的音乐文件。清理封面后，下次扫描会重新从文件读取。</p>
          </section>
        </div>
      )}

      {tab === 'playback' && (
        <div className="settings-body">
          <section className="settings-section">
            <h2>播放</h2>
            <div className="settings-row">
              <div className="settings-label">音量</div>
              <div className="settings-control">
                <input
                  className="settings-range"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(player.volume * 100)}
                  onChange={(e) => player.setVolume(Number(e.target.value) / 100)}
                  aria-label="音量"
                />
                <span className="settings-value">{Math.round(player.volume * 100)}%</span>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">音质</div>
              <div className="settings-control">
                <div className="segmented">
                  {qualityOptions.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={netease.quality === value ? 'is-active' : ''}
                      onClick={() => netease.setQuality(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="settings-value">云端歌曲生效</span>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">随机播放</div>
              <div className="settings-control">
                <Switch on={player.shuffle} onClick={player.toggleShuffle} label="随机播放" />
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">循环模式</div>
              <div className="settings-control">
                <div className="segmented">
                  {repeatOptions.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={player.repeat === value ? 'is-active' : ''}
                      onClick={() => player.setRepeat(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">歌词面板</div>
              <div className="settings-control">
                <Switch
                  on={ui.panelOpen && ui.panelTab === 'lyrics'}
                  label="歌词面板"
                  onClick={() => {
                    if (ui.panelOpen && ui.panelTab === 'lyrics') {
                      ui.setPanelOpen(false);
                    } else {
                      ui.setPanelTab('lyrics');
                      ui.setPanelOpen(true);
                    }
                  }}
                />
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">睡眠定时器</div>
              <div className="settings-control settings-actions">
                {ui.sleepAt ? (
                  <>
                    <span className="settings-value">
                      已开启 · 约 {Math.max(0, Math.ceil((ui.sleepAt - Date.now()) / 60_000))} 分钟后暂停
                    </span>
                    <button
                      type="button"
                      className="settings-btn"
                      onClick={() => {
                        ui.setSleepAt(null);
                        ui.toast('已取消睡眠定时器');
                      }}
                    >
                      取消
                    </button>
                  </>
                ) : (
                  [15, 30, 60].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className="settings-btn"
                      onClick={() => {
                        ui.setSleepAt(Date.now() + minutes * 60_000);
                        ui.toast(`将在 ${minutes} 分钟后暂停`);
                      }}
                    >
                      {minutes} 分钟
                    </button>
                  ))
                )}
              </div>
            </div>
            <p className="settings-help">
              无损 / Hi-Res 需要会员；当前账号没有权限时会自动降级到可用音质。
            </p>
          </section>

          <section className="settings-section">
            <h2>屏蔽的艺人</h2>
            {blockedArtists.length === 0 ? (
              <p className="settings-help">还没有屏蔽任何艺人。</p>
            ) : (
              blockedArtists.map((artist) => (
                <div className="settings-row" key={artist}>
                  <div className="settings-label">{artist}</div>
                  <div className="settings-control settings-actions">
                    <button
                      type="button"
                      className="settings-btn"
                      onClick={() => {
                        const next = blockedArtists.filter((item) => item !== artist);
                        localStorage.setItem('spoteasy.blockedArtists', JSON.stringify(next));
                        setBlockedArtists(next);
                        ui.toast('已取消屏蔽');
                      }}
                    >
                      取消屏蔽
                    </button>
                  </div>
                </div>
              ))
            )}
            <p className="settings-help">屏蔽只影响本机播放队列，不会修改网易云账号数据。</p>
          </section>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="settings-body">
          <section className="settings-section">
            <h2>外观</h2>
            <div className="settings-row">
              <div className="settings-label">主题色</div>
              <div className="settings-control">
                <button
                  type="button"
                  className={`swatch ${ui.accent === 'green' ? 'is-active' : ''}`}
                  style={{ background: '#1ed760' }}
                  onClick={() => ui.setAccent('green')}
                  title="Spotify 绿"
                >
                  {ui.accent === 'green' && <Icon name="check" size={12} />}
                </button>
                <button
                  type="button"
                  className={`swatch ${ui.accent === 'red' ? 'is-active' : ''}`}
                  style={{ background: '#ec4141' }}
                  onClick={() => ui.setAccent('red')}
                  title="红色"
                >
                  {ui.accent === 'red' && <Icon name="check" size={12} />}
                </button>
                <span className="settings-value">{ui.accent === 'green' ? 'Spotify 绿' : '红色'}</span>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">纯黑模式</div>
              <div className="settings-control">
                <Switch
                  on={ui.mode === 'black'}
                  onClick={() => ui.setMode(ui.mode === 'black' ? 'dark' : 'black')}
                  label="纯黑模式"
                />
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">恢复默认</div>
              <div className="settings-control">
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => {
                    ui.setAccent('green');
                    ui.setMode('dark');
                    ui.toast('外观已恢复默认');
                  }}
                >
                  恢复默认外观
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === 'about' && (
        <div className="settings-body">
          <section className="settings-section">
            <div className="about-brand">
              <img src={mark} alt="Spoteasy" />
              <div>
                <div className="about-name">Spoteasy</div>
                <div className="about-ver">v{info?.version ?? '0.1.0'} · 纯音乐播放器</div>
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-label">Electron</div>
              <div className="settings-control mono">{info?.electron ?? '—'}</div>
            </div>
            <div className="settings-row">
              <div className="settings-label">Chromium</div>
              <div className="settings-control mono">{info?.chrome ?? '—'}</div>
            </div>
            <div className="settings-row">
              <div className="settings-label">Node</div>
              <div className="settings-control mono">{info?.node ?? '—'}</div>
            </div>
            <div className="settings-row">
              <div className="settings-label">本地库</div>
              <div className="settings-control mono">{info?.libraryPath ?? '—'}</div>
            </div>
            <p className="settings-help">
              界面细节参考 Spotify；字体 Figtree Variable + MiSans；播放内核是本地 HTMLAudio + spoteasy-media 协议。
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
