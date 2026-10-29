import { Icon } from './Icons';
import { Cover } from './CoverArt';

interface MediaCardProps {
  title: string;
  subtitle?: string;
  hue: number;
  variant: number;
  badge?: string;
  heart?: boolean;
  coverUrl?: string;
  onClick(): void;
  onPlay(): void;
}

export function MediaCard({ title, subtitle, hue, variant, badge, heart, coverUrl, onClick, onPlay }: MediaCardProps) {
  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      <div className="card-art">
        <Cover hue={hue} variant={variant} label={title} heart={heart} src={coverUrl} />
        <button
          type="button"
          className="card-play"
          aria-label={`播放 ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
        >
          <Icon name="play" size={20} />
        </button>
      </div>
      <div className="card-title">{title}</div>
      {subtitle && <div className="card-sub">{subtitle}</div>}
      {badge && <div className="card-badge">{badge}</div>}
    </div>
  );
}
