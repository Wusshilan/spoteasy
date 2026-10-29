/* 在渲染进程里跑的一组交互冒烟检查，结果通过 electron 主进程打印出来。 */
(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));
  const text = (el) => (el ? el.textContent.trim() : null);

  const results = { steps: [] };
  const step = (name, value) => results.steps.push({ name, value });

  await sleep(400);
  step('boot', Boolean(q('.app')));
  step('initialHash', location.hash);
  step('initialTrack', text(q('.pb-title')));

  // 1. 侧栏点击进入歌单
  const row = qa('.media-row').find((el) => text(el.querySelector('.row-title')) === '深夜不睡俱乐部');
  step('sidebarRowFound', Boolean(row));
  row?.click();
  await sleep(250);
  step('routeAfterSidebar', location.hash);
  step('heroTitle', text(q('.hero-title')));

  // 2. 播放
  q('.big-play')?.click();
  await sleep(800);
  step('isPlaying', Boolean(q('.playerbar .play-btn[aria-label="暂停"]')));
  step('currentRow', text(q('.track-row.is-current .track-title')));
  step('progress', text(q('.pb-progress .pb-time')));

  // 3. 确认评论/云村/一起听这些社交入口已经移除
  step('commentTabRemoved', !qa('.np-tab').some((el) => el.textContent.includes('评论')));
  step('cloudEntryRemoved', !qa('.nav-item').some((el) => el.textContent.includes('云村')));
  step('togetherRemoved', !qa('.np-tab').some((el) => el.textContent.includes('一起听')));

  // 4. 右键菜单
  const firstRow = q('.track-row');
  firstRow?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 640, clientY: 420 }));
  await sleep(150);
  step('contextMenu', Boolean(q('.context-menu')));
  const queueAction = qa('.cm-item').find((el) => text(el)?.includes('下一首播放'));
  step('queueActionFound', Boolean(queueAction));
  queueAction?.click();
  await sleep(500);
  step('menuClosedAfterAction', !q('.context-menu'));

  // 5. Ctrl+K 搜索浮层
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true }));
  await sleep(250);
  step('overlayOpen', Boolean(q('.overlay .search-modal')));
  const input = q('.search-modal-input input');
  if (input) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '晚风');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(250);
    step('overlayResults', qa('.search-result').length);
    step('overlayFirst', text(q('.result-title')));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await sleep(500);
  }
  step('overlayClosedAfterEnter', !q('.overlay'));
  step('trackAfterSearchEnter', text(q('.pb-title')));

  // 6. 后退
  qa('.circle-btn')[0]?.click();
  await sleep(200);
  step('routeAfterBack', location.hash);

  // 7. 折叠侧栏
  q('.library-title')?.click();
  await sleep(350);
  step('sidebarCollapsed', q('.sidebar')?.classList.contains('is-collapsed'));
  q('.library-title')?.click();
  await sleep(350);

  // 8. 主题色切换
  q('.profile-btn')?.click();
  await sleep(150);
  step('profileMenu', Boolean(q('.profile-menu')));
  qa('.swatch')[1]?.click();
  await sleep(150);
  step('accent', document.documentElement.dataset.accent);
  qa('.swatch')[0]?.click();

  // 9. 播放队列面板
  const queueTab = qa('.np-tab').find((el) => el.textContent.includes('队列'));
  queueTab?.click();
  await sleep(150);
  step('queueTabActive', Boolean(q('.np-tab.is-active')?.textContent.includes('队列')));
  step('queueRows', qa('.queue-row').length);

  // 10. 右侧正在播放面板的收起/展开动画
  const mainBefore = q('.main-shell')?.getBoundingClientRect().width ?? 0;
  const panelBtn = qa('.pb-right .icon-btn').find((el) => el.getAttribute('aria-label') === '正在播放视图');
  step('panelButtonFound', Boolean(panelBtn));
  panelBtn?.click();
  await sleep(500);
  step('panelSlotClosed', Math.round(q('.np-slot')?.getBoundingClientRect().width ?? -1));
  step('mainGotWider', (q('.main-shell')?.getBoundingClientRect().width ?? 0) > mainBefore + 100);
  panelBtn?.click();
  await sleep(500);
  step('panelSlotReopened', Math.round(q('.np-slot')?.getBoundingClientRect().width ?? -1));
  step('mainBackToNormal', Math.abs((q('.main-shell')?.getBoundingClientRect().width ?? 0) - mainBefore) < 2);

  return results;
})();
