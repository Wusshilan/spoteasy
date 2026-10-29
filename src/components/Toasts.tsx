import { Icon } from './Icons';
import { useUi } from '../state/ui';

export function Toasts() {
  const { toasts } = useUi();
  if (!toasts.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <Icon name="check" size={14} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
