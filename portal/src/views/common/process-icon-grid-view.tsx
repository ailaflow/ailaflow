import { ProcessIcon } from './process-icon';

const WORD_JOINER = '\u2060';

export interface ProcessIconGridItem {
  name: string;
  description?: string;
  url: string;
  onClick(): void;
}

export interface ProcessIconGridViewProps {
  items: ProcessIconGridItem[];
  emptyMessage: string;
  variant?: 'dashboard' | 'page';
}

const GRID_CLASS_NAMES = {
  dashboard: 'grid-cols-3 gap-x-1 gap-y-2 p-3 sm:grid-cols-4 lg:grid-cols-3 2xl:grid-cols-4',
  page: 'grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-3 gap-y-5 p-4 sm:p-6'
} as const;

const ICON_CLASS_NAMES = {
  dashboard: 'h-14 w-14',
  page: 'h-20 w-20'
} as const;

export function ProcessIconGridView(props: ProcessIconGridViewProps) {
  const variant = props.variant ?? 'page';

  if (props.items.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center px-4 py-8 text-center text-sm text-slate-500">{props.emptyMessage}</div>
    );
  }

  return (
    <div className={`grid items-start ${GRID_CLASS_NAMES[variant]}`}>
      {props.items.map(item => (
        <a
          key={item.name}
          href={item.url}
          aria-label={`Start process ${item.name}`}
          title={item.description ? `${item.name}\n${item.description}` : item.name}
          className="group flex min-w-0 cursor-pointer flex-col items-center rounded-xl px-2 py-2 text-center outline-none transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          onClick={event => {
            event.preventDefault();
            item.onClick();
          }}
        >
          <ProcessIcon name={item.name} className={ICON_CLASS_NAMES[variant]} />
          <span className="mt-2 line-clamp-2 w-full break-words text-sm font-medium leading-5 text-slate-800 group-hover:text-slate-950">
            {formatProcessName(item.name)}
          </span>
        </a>
      ))}
    </div>
  );
}

function formatProcessName(name: string): string {
  const nameWithoutPrefix = name.startsWith('/') ? name.slice(1) : name;
  return `/${WORD_JOINER}${nameWithoutPrefix}`;
}
