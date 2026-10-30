import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'zh-CN' | 'zh-HK' | 'zh-TW' | 'en';

export const LANG_OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-HK', label: '繁體中文（香港）' },
  { value: 'zh-TW', label: '繁體中文（台灣）' },
  { value: 'en', label: 'English' },
];

type Dict = Record<string, string>;

const zhCN: Dict = {
  'greeting.late': '凌晨好',
  'greeting.morning': '早上好',
  'greeting.afternoon': '下午好',
  'greeting.evening': '晚上好',
  'home.recommended': '为你推荐',
  'home.exclusive': '专属推荐',
  'home.charts': '排行榜',
  'home.hot': '热门歌单',
  'home.new': '新歌速递',
  'home.showAll': '显示全部',
  'home.daily': '每天 6:00 更新',
  'home.plays': '次播放',
  'home.liked': '我喜欢的音乐',
  'genre.mandopop': '华语流行',
  'genre.electronic': '电子',
  'genre.rock': '摇滚',
  'genre.folk': '民谣',
  'genre.hiphop': '说唱',
  'genre.easy': '轻音乐',
  'search.placeholder': '想播放什么?',
  'search.aria': '搜索歌曲、歌手、歌单、专辑',
  'settings.title': '设置',
  'settings.tab.preferences': '偏好设置',
  'settings.tab.local': '本地音乐',
  'settings.tab.playback': '播放',
  'settings.tab.appearance': '外观',
  'settings.tab.about': '关于',
  'settings.language': '语言',
  'settings.languageHelp': '切换界面语言。歌曲、歌单等网易云内容保持原始语言。',
  'common.listener': '音乐爱好者',
  'common.create': '创建',
  'nav.library': '音乐库',
  'library.playlists': '歌单',
  'library.podcasts': '播客',
  'library.albums': '专辑',
  'library.artists': '艺人',
  'library.searchPlaceholder': '在音乐库中搜索',
  'library.search': '搜索音乐库',
};

const zhHK: Dict = {
  ...zhCN,
  'greeting.late': '凌晨好',
  'greeting.morning': '早晨',
  'greeting.afternoon': '下午好',
  'greeting.evening': '晚上好',
  'home.recommended': '為你推薦',
  'home.exclusive': '專屬推薦',
  'home.charts': '排行榜',
  'home.hot': '熱門歌單',
  'home.new': '新歌速遞',
  'home.showAll': '顯示全部',
  'home.daily': '每日 6:00 更新',
  'home.plays': '次播放',
  'home.liked': '我喜歡的音樂',
  'genre.mandopop': '華語流行',
  'genre.electronic': '電子',
  'genre.rock': '搖滾',
  'genre.folk': '民謠',
  'genre.hiphop': '說唱',
  'genre.easy': '輕音樂',
  'search.placeholder': '想播放甚麼?',
  'search.aria': '搜尋歌曲、歌手、歌單、專輯',
  'settings.title': '設定',
  'settings.tab.preferences': '偏好設定',
  'settings.tab.local': '本機音樂',
  'settings.tab.playback': '播放',
  'settings.tab.appearance': '外觀',
  'settings.tab.about': '關於',
  'settings.language': '語言',
  'settings.languageHelp': '切換介面語言。歌曲、歌單等網易雲內容保持原始語言。',
  'common.listener': '音樂愛好者',
  'common.create': '建立',
  'nav.library': '音樂庫',
  'library.playlists': '歌單',
  'library.podcasts': '播客',
  'library.albums': '專輯',
  'library.artists': '藝人',
  'library.searchPlaceholder': '在音樂庫中搜尋',
  'library.search': '搜尋音樂庫',
};

const zhTW: Dict = {
  ...zhCN,
  'greeting.late': '凌晨好',
  'greeting.morning': '早安',
  'greeting.afternoon': '午安',
  'greeting.evening': '晚安',
  'home.recommended': '為你推薦',
  'home.exclusive': '專屬推薦',
  'home.charts': '排行榜',
  'home.hot': '熱門歌單',
  'home.new': '新歌快遞',
  'home.showAll': '顯示全部',
  'home.daily': '每天 6:00 更新',
  'home.plays': '次播放',
  'home.liked': '我喜歡的音樂',
  'genre.mandopop': '華語流行',
  'genre.electronic': '電子',
  'genre.rock': '搖滾',
  'genre.folk': '民謠',
  'genre.hiphop': '饒舌',
  'genre.easy': '輕音樂',
  'search.placeholder': '想播放什麼?',
  'search.aria': '搜尋歌曲、歌手、歌單、專輯',
  'settings.title': '設定',
  'settings.tab.preferences': '偏好設定',
  'settings.tab.local': '本機音樂',
  'settings.tab.playback': '播放',
  'settings.tab.appearance': '外觀',
  'settings.tab.about': '關於',
  'settings.language': '語言',
  'settings.languageHelp': '切換介面語言。歌曲、歌單等網易雲內容保持原始語言。',
  'common.listener': '音樂愛好者',
};

const en: Dict = {
  'greeting.late': 'Good night',
  'greeting.morning': 'Good morning',
  'greeting.afternoon': 'Good afternoon',
  'greeting.evening': 'Good evening',
  'home.recommended': 'Made for you',
  'home.exclusive': 'Exclusive picks',
  'home.charts': 'Charts',
  'home.hot': 'Popular playlists',
  'home.new': 'New releases',
  'home.showAll': 'Show all',
  'home.daily': 'Updated daily at 6:00',
  'home.plays': 'plays',
  'home.liked': 'Liked Songs',
  'genre.mandopop': 'Mandopop',
  'genre.electronic': 'Electronic',
  'genre.rock': 'Rock',
  'genre.folk': 'Folk',
  'genre.hiphop': 'Hip-Hop',
  'genre.easy': 'Easy Listening',
  'search.placeholder': 'What do you want to play?',
  'search.aria': 'Search songs, artists, playlists and albums',
  'settings.title': 'Settings',
  'settings.tab.preferences': 'Preferences',
  'settings.tab.local': 'Local Files',
  'settings.tab.playback': 'Playback',
  'settings.tab.appearance': 'Appearance',
  'settings.tab.about': 'About',
  'settings.language': 'Language',
  'settings.languageHelp': 'Change the interface language. NetEase songs and playlists keep their original language.',
  'common.listener': 'Music lover',
  'common.create': 'Create',
  'nav.library': 'Your Library',
  'library.playlists': 'Playlists',
  'library.podcasts': 'Podcasts',
  'library.albums': 'Albums',
  'library.artists': 'Artists',
  'library.searchPlaceholder': 'Search in Your Library',
  'library.search': 'Search Your Library',
};

const messages: Record<Lang, Dict> = { 'zh-CN': zhCN, 'zh-HK': zhHK, 'zh-TW': zhTW, en };

interface I18nValue {
  lang: Lang;
  setLang(lang: Lang): void;
  t(key: string, vars?: Record<string, string>): string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('spoteasy.lang');
    return saved === 'zh-HK' || saved === 'zh-TW' || saved === 'en' ? saved : 'zh-CN';
  });

  useEffect(() => {
    document.documentElement.lang = lang === 'zh-HK' ? 'zh-Hant-HK' : lang === 'zh-TW' ? 'zh-Hant-TW' : lang;
    document.documentElement.dataset.lang = lang;
    localStorage.setItem('spoteasy.lang', lang);
  }, [lang]);

  const value = useMemo<I18nValue>(() => {
    const t = (key: string, vars?: Record<string, string>) => {
      let text = messages[lang][key] ?? messages['zh-CN'][key] ?? key;
      if (vars) {
        for (const [name, val] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, val);
      }
      return text;
    };
    return { lang, setLang: setLangState, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
