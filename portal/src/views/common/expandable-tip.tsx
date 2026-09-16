import { SvgIcon } from './svg-icons';
import { useId, useState } from 'react';

export interface ExpandableTipProps {
  title: string;
  summary: string;
  children: React.ReactNode;
}

export function ExpandableTip(props: ExpandableTipProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();
  return (
    <div className="overflow-hidden rounded-md border border-sky-200 bg-sky-50 text-sky-950">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        onClick={() => setIsExpanded(value => !value)}
        className="cursor-pointer block w-full px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{props.title}</p>
            <p className={`${isExpanded ? '' : 'line-clamp-1'} text-sm text-sky-800`}>{props.summary}</p>
          </div>
          <span className="hidden shrink-0 text-xs font-medium text-sky-700 sm:inline">{isExpanded ? 'Hide details' : 'Show details'}</span>
          <SvgIcon name="chevronDown" className={`h-5 w-5 shrink-0 text-sky-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isExpanded ? (
        <div id={detailsId} className="border-t border-sky-200 px-3 py-3 text-sm leading-6 text-sky-900">
          {props.children}
        </div>
      ) : null}
    </div>
  );
}
