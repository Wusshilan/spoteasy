import { Icon } from '../components/Icons';
import { Avatar, Cover } from '../components/CoverArt';

export type SearchRowKind = 'track' | 'album' | 'playlist' | 'artist' | 'podcast' | 'local' | 'mv';
export type SearchRowAction = 'add' | 'liked' | 'follow' | 'following' | 'none';

interface SearchResultRowProps {
  kind: SearchRowKind;
  title: string;
  sub: string;
  typeLabel: string;
  hue: number;
  variant: number;
  coverUrl?: string;
  highlight?: string;
  action?: SearchRowAction;
  selected?: boolean;
  onAction?: () => void;
  onClick?: () => void;
}

export function SearchResultRow({
  kind,
  title,
  sub,
  typeLabel,
  hue,
  variant,
  coverUrl,
  highlight,
  action = 'none',
  selected = false,
  onAction,
  onClick,
}: SearchResultRowProps) {
  return (
    <div
      className={`search-row ${selected ? 'is-selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onClick?.();
      }}
    >
      <div className="search-row-art">
        {kind === 'artist' ? (
          <Avatar hue={hue} label={title} src={coverUrl} size={48} />
        ) : (
          <Cover hue={hue} variant={variant} label={title} src={coverUrl} className="search-row-cover" />
        )}
      </div>
      <div className="search-row-copy">
        <div className="search-row-title">
          {highlight && title.toLowerCase().includes(highlight.toLowerCase())
            ? title.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig')).map((part, index) =>
                part.toLowerCase() === highlight.toLowerCase() ? <mark key={index}>{part}</mark> : part,
              )
            : title}
        </div>
        <div className="search-row-sub">{sub}</div>
      </div>
      <div className="search-row-type">{typeLabel}</div>
      <div className="search-row-gap" />
      <div className="search-row-action">
        {action === 'add' && (
          <button
            type="button"
            className="search-add"
            aria-label="添加到音乐库"
            title="添加到音乐库"
            onClick={(event) => {
              event.stopPropagation();
              onAction?.();
            }}
          >
            <Icon name="plus" size={16} />
          </button>
        )}
        {action === 'liked' && (
          <button
            type="button"
            className="search-add is-liked"
            aria-label="从音乐库移除"
            title="从音乐库移除"
            onClick={(event) => {
              event.stopPropagation();
              onAction?.();
            }}
          >
            <Icon name="heartFill" size={15} />
          </button>
        )}
        {(action === 'follow' || action === 'following') && (
          <button
            type="button"
            className={`search-follow ${action === 'following' ? 'is-on' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onAction?.();
            }}
          >
            {action === 'following' ? '关注中' : '关注'}
          </button>
        )}
      </div>
    </div>
  );
}
