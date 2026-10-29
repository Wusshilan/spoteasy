import { Cover } from './CoverArt';
import type { Route } from '../routing';

interface Category {
  name: string;
  hue: number;
  variant: number;
  rotate: number;
  query?: string;
  route?: Route;
}

const categories: Category[] = [
  { name: '音乐', hue: 330, variant: 5, rotate: -22, route: { name: 'home' } },
  { name: '播客', hue: 164, variant: 1, rotate: 24, query: '播客' },
  { name: '现场活动', hue: 268, variant: 3, rotate: -18, query: '现场' },
  { name: '为你打造', hue: 220, variant: 2, rotate: 20, route: { name: 'cloudDaily' } },
  { name: '新歌热播', hue: 84, variant: 4, rotate: -24, query: '新歌' },
  { name: '歌单计划', hue: 340, variant: 6, rotate: 26, query: '歌单' },
  { name: '韩语流行', hue: 356, variant: 2, rotate: -20, query: '韩语流行' },
  { name: '日文歌曲', hue: 10, variant: 7, rotate: 22, query: '日文歌曲' },
  { name: '流行', hue: 196, variant: 1, rotate: -18, query: '流行' },
  { name: '排行榜', hue: 262, variant: 5, rotate: 20, query: '排行榜' },
  { name: '教育', hue: 200, variant: 3, rotate: -22, query: '教育' },
  { name: '纪实', hue: 286, variant: 0, rotate: 24, query: '纪实' },
  { name: '喜剧', hue: 312, variant: 4, rotate: -20, query: '喜剧' },
  { name: '嘻哈', hue: 208, variant: 6, rotate: 22, query: '嘻哈' },
  { name: '粤语流行', hue: 128, variant: 2, rotate: -18, query: '粤语流行' },
  { name: '华语流行音乐', hue: 26, variant: 5, rotate: 20, query: '华语流行' },
];

export function BrowseView({ navigate }: { navigate: (route: Route) => void }) {
  return (
    <div className="browse-page">
      <div className="browse-inner">
        <h1>浏览全部</h1>
        <div className="browse-grid">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              className="browse-card"
              style={{
                background: `linear-gradient(135deg, hsl(${category.hue} 72% 46%), hsl(${(category.hue + 22) % 360} 66% 36%))`,
              }}
              onClick={() =>
                category.route
                  ? navigate(category.route)
                  : navigate({ name: 'search', q: category.query ?? category.name })
              }
            >
              <span className="browse-card-title">{category.name}</span>
              <span className="browse-card-art" style={{ transform: `rotate(${category.rotate}deg)` }}>
                <Cover hue={category.hue} variant={category.variant} label={category.name} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
