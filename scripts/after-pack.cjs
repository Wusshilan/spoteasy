const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/**
 * electron-builder 的 signAndEditExecutable 会去下载 winCodeSign；
 * 这里关闭它，改用本地 rcedit 写图标和 0.1.0 版本信息。
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const projectDir = context.packager.projectDir;
  const exe = path.join(context.appOutDir, 'Spoteasy.exe');
  const rcedit = path.join(projectDir, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');
  const icon = path.join(projectDir, 'build', 'icon.ico');
  const version = context.packager.appInfo.version;

  execFileSync(
    rcedit,
    [
      exe,
      '--set-icon', icon,
      '--set-version-string', 'ProductName', 'Spoteasy',
      '--set-version-string', 'FileDescription', 'Spoteasy',
      '--set-version-string', 'CompanyName', 'Spoteasy',
      '--set-version-string', 'LegalCopyright', 'Copyright © 2026 Spoteasy',
      '--set-version-string', 'OriginalFilename', 'Spoteasy.exe',
      '--set-version-string', 'InternalName', 'Spoteasy',
      '--set-file-version', version,
      '--set-product-version', version,
    ],
    { stdio: 'inherit' },
  );
  const localesDir = path.join(context.appOutDir, 'locales');
  if (fs.existsSync(localesDir)) {
    const keep = new Set(['zh-CN.pak', 'zh-TW.pak', 'en-US.pak']);
    for (const name of fs.readdirSync(localesDir)) {
      if (!keep.has(name)) fs.rmSync(path.join(localesDir, name), { force: true });
    }
  }
  console.log(`[afterPack] rcedit ${path.basename(exe)} ${version}`);
};
