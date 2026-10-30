import { createRoot } from 'react-dom/client';
import '@fontsource-variable/figtree';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MiniPlayer } from './components/MiniPlayer';
import { parseHashExtras } from './routing';
import { I18nProvider } from './i18n';
import { LibraryProvider } from './state/library';
import { NeteaseProvider } from './state/netease';
import { PlayerProvider } from './state/player';
import { UiProvider } from './state/ui';
import './styles/tokens.css';
import './styles/global.css';
import './search/search.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

if (parseHashExtras().mini === '1') {
  createRoot(root).render(<MiniPlayer />);
} else {
  createRoot(root).render(
    <I18nProvider>
      <UiProvider>
      <LibraryProvider>
        <NeteaseProvider>
          <PlayerProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </PlayerProvider>
        </NeteaseProvider>
      </LibraryProvider>
      </UiProvider>
    </I18nProvider>,
  );
}
