import { SvgIcon } from '../../common/svg-icons';

export interface DisabledSubValuePreviewViewProps {
  label: string;
  onEnable: () => void;
}

export function DisabledSubValuePreviewView(props: DisabledSubValuePreviewViewProps) {
  return (
    <SubValuePreviewView>
      <div className="flex w-full justify-center">
        <SubValuePreviewButton transparent onClick={props.onEnable}>
          {props.label}
        </SubValuePreviewButton>
      </div>
    </SubValuePreviewView>
  );
}

export interface EnabledSubValuePreviewViewProps {
  children: React.ReactNode;
  error?: string;
  onEdit: () => void;
  onRemove?: () => void;
}

export function EnabledSubValuePreviewView(props: EnabledSubValuePreviewViewProps) {
  return (
    <SubValuePreviewView error={props.error}>
      <div className="min-w-0 flex-1 text-s text-slate-500">{props.children}</div>
      <div className="flex shrink-0 items-center gap-1">
        <SubValuePreviewButton iconOnly onClick={props.onEdit} label="Edit">
          <SvgIcon name="pencil" className="h-4 w-4" />
        </SubValuePreviewButton>
        {props.onRemove && (
          <SubValuePreviewButton danger iconOnly onClick={props.onRemove} label="Remove">
            <SvgIcon name="x" className="h-4 w-4" />
          </SubValuePreviewButton>
        )}
      </div>
    </SubValuePreviewView>
  );
}

interface SubValuePreviewButtonProps {
  children: React.ReactNode;
  danger?: boolean;
  iconOnly?: boolean;
  label?: string;
  onClick: () => void;
  title?: string;
  transparent?: boolean;
}

function SubValuePreviewButton(props: SubValuePreviewButtonProps) {
  const sizeClassName = props.iconOnly ? 'h-8 w-8' : 'h-8 px-2.5 text-sm font-medium';
  const surfaceClassName = props.transparent ? 'border-transparent bg-transparent' : 'border-slate-300 bg-white/60';
  const colorClassName = props.danger
    ? 'text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-400'
    : 'text-slate-600 hover:border-slate-400 hover:bg-white hover:text-slate-800 focus-visible:ring-slate-400';

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 ${sizeClassName} ${surfaceClassName} ${colorClassName}`}
      onClick={props.onClick}
      aria-label={props.label}
      title={props.title ?? props.label}
    >
      {props.children}
    </button>
  );
}

function SubValuePreviewView(props: { children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1">
      <div className={`rounded-md border bg-slate-50 px-2.5 py-2 ${props.error ? 'border-red-300' : 'border-slate-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">{props.children}</div>
      </div>
      {props.error && <div className="px-1 text-xs text-red-700">{props.error}</div>}
    </div>
  );
}
