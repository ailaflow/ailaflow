import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { SvgIcon } from '../common/svg-icons';

export interface ResourceItemAction<T> {
  label: string | ((item: T) => string);
  ariaLabel?: string | ((item: T) => string);
  isVisible?(item: T): boolean;
  getTo?(item: T): string;
  onClick?(item: T): void | Promise<void>;
}

export interface ResourceItemMenuViewProps<T> {
  item: T;
  actions: ResourceItemAction<T>[];
  ariaLabel: string;
}

interface MenuPosition {
  left: number;
  top: number;
}

const MENU_WIDTH = 192;
const VIEWPORT_MARGIN = 8;

export function ResourceItemMenuView<T>(props: ResourceItemMenuViewProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const visibleActions = props.actions.filter(action => !action.isVisible || action.isVisible(props.item));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    function onPointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function onFocusIn(event: FocusEvent): void {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function closeMenu(): void {
      setIsOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [isOpen]);

  if (visibleActions.length === 0) {
    return null;
  }

  function openMenu(): void {
    const triggerBounds = triggerRef.current?.getBoundingClientRect();
    if (!triggerBounds) {
      return;
    }

    const estimatedMenuHeight = visibleActions.length * 36 + 8;
    const hasRoomBelow = triggerBounds.bottom + estimatedMenuHeight + VIEWPORT_MARGIN <= window.innerHeight;
    setMenuPosition({
      left: Math.max(VIEWPORT_MARGIN, Math.min(triggerBounds.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN)),
      top: hasRoomBelow ? triggerBounds.bottom + 4 : Math.max(VIEWPORT_MARGIN, triggerBounds.top - estimatedMenuHeight - 4)
    });
    setIsOpen(true);
  }

  function closeMenuAndFocusTrigger(): void {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenuAndFocusTrigger();
      return;
    }
    if (event.key === ' ' && event.target instanceof HTMLAnchorElement) {
      event.preventDefault();
      event.target.click();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
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

  const menu: ReactNode = isOpen ? (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label={props.ariaLabel}
      className="fixed z-50 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
      style={menuPosition}
      onKeyDown={onKeyDown}
    >
      {visibleActions.map((action, index) => {
        const label = typeof action.label === 'function' ? action.label(props.item) : action.label;
        const ariaLabel = typeof action.ariaLabel === 'function' ? action.ariaLabel(props.item) : action.ariaLabel;
        const className =
          'flex w-full cursor-pointer items-center rounded px-3 py-2 text-left text-sm text-slate-700 outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-100';

        if (action.getTo) {
          return (
            <Link
              key={index}
              to={action.getTo(props.item)}
              role="menuitem"
              tabIndex={-1}
              aria-label={ariaLabel}
              className={className}
              onClick={() => setIsOpen(false)}
            >
              {label}
            </Link>
          );
        }

        return (
          <button
            key={index}
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-label={ariaLabel}
            className={className}
            onClick={() => {
              setIsOpen(false);
              void action.onClick?.(props.item);
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={props.ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-500"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            openMenu();
          }
        }}
        onKeyDown={event => {
          if (!isOpen && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        <SvgIcon name="moreVertical" className="h-4 w-4" />
      </button>
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
