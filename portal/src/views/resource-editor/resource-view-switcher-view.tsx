import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { SvgIcon } from '../common/svg-icons';

export interface ResourceViewOption {
  label: string;
  href: string;
  selected?: boolean;
  disabledReason?: string;
}

export interface ResourceViewSwitcherViewProps {
  options: ResourceViewOption[];
  disabledReason?: string;
}

export function ResourceViewSwitcherView(props: ResourceViewSwitcherViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = props.options.find(option => option.selected);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const currentItem = menuRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    (currentItem ?? firstItem)?.focus();

    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === ' ' && event.target instanceof HTMLAnchorElement && event.target.getAttribute('role') === 'menuitem') {
      event.preventDefault();
      event.target.click();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    if (!isOpen) {
      setIsOpen(true);
      return;
    }

    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex(item => item === document.activeElement);
    let nextIndex: number;
    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    } else {
      nextIndex = (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    }
    items[nextIndex].focus();
  }

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onKeyDown={onKeyDown}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Switch resource view: ${selected?.label ?? 'Views'}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen(open => !open)}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-500"
      >
        {selected?.label ?? 'Views'}
        <SvgIcon name={isOpen ? 'chevronUp' : 'chevronDown'} className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2.5rem)] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Resource views"
            aria-describedby={props.disabledReason ? `${menuId}-reason` : undefined}
          >
            {props.options.map(option => {
              const disabledReason = props.disabledReason ?? option.disabledReason;
              const className = `flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm outline-none focus:bg-slate-100 ${
                option.selected
                  ? 'bg-slate-50 font-medium text-slate-900'
                  : disabledReason
                    ? 'cursor-not-allowed text-slate-400'
                    : 'text-slate-700 hover:bg-slate-50'
              }`;
              const content = (
                <>
                  <span aria-hidden="true" className="w-4 shrink-0">
                    {option.selected ? '✓' : ''}
                  </span>
                  <span>
                    {option.label}
                    {!option.selected && !props.disabledReason && option.disabledReason && (
                      <span className="mt-0.5 block text-xs">{option.disabledReason}</span>
                    )}
                  </span>
                </>
              );

              if (option.selected || disabledReason) {
                return (
                  <button
                    key={option.href}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    aria-current={option.selected ? 'page' : undefined}
                    aria-disabled="true"
                    className={className}
                  >
                    {content}
                  </button>
                );
              }
              return (
                <Link
                  key={option.href}
                  to={option.href}
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  onClick={() => setIsOpen(false)}
                >
                  {content}
                </Link>
              );
            })}
          </div>
          {props.disabledReason && (
            <p id={`${menuId}-reason`} className="mt-1 border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              {props.disabledReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
