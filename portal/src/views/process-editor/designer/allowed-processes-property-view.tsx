import { EditorPropertyView } from './editor-property-view';
import { DisabledSubValuePreviewView, EnabledSubValuePreviewView } from './sub-value-preview-view';

export interface AllowedProcessesPropertyViewProps {
  processNames: string[] | null;
  error?: string;
  onAllowAll(): void;
  onEdit(): void;
}

export function AllowedProcessesPropertyView(props: AllowedProcessesPropertyViewProps) {
  return (
    <EditorPropertyView label="Allowed processes">
      {props.processNames === null ? (
        <DisabledSubValuePreviewView label="All allowed, click here to change" onEnable={props.onEdit} error={props.error} />
      ) : (
        <EnabledSubValuePreviewView onEdit={props.onEdit} onRemove={props.onAllowAll} error={props.error}>
          {props.processNames.length === 0 ? (
            'No processes allowed'
          ) : (
            <ul className="space-y-1 break-words">
              {props.processNames.map(name => (
                <li key={name}>/{name}</li>
              ))}
            </ul>
          )}
        </EnabledSubValuePreviewView>
      )}
    </EditorPropertyView>
  );
}
