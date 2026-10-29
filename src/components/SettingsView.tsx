import { useCallback, useEffect, useState } from 'react';
import mark from '../assets/spoteasy-mark.svg';
import { Icon } from './Icons';
import { useLibrary } from '../state/library';
import { useNetease } from '../state/netease';
import { usePlayer } from '../state/player';
import { useUi } from '../state/ui';
import type { Repeat } from '../state/player';

type Tab = 'local' | 'playback' | 'appearance' | 'about';

const tabs: Array<[Tab, string]> = [
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
  const [tab, setTab] = useState<Tab>('local');
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
