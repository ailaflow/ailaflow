export type FolderTreeItem =
  | {
      name: string;
      path: string;
      type: 'folder';
      children: FolderTreeItem[];
    }
  | {
      name: string;
      path: string;
      type: 'file';
      mimeType: string;
      content: string;
      isDirty: boolean;
    };

export interface FolderTreeViewProps {
  items: FolderTreeItem[];
  currentlyOpenPath?: string;
  onAddFile: () => void;
  onRemoveFile: (path: string) => void;
  onSelectFile: (path: string) => void;
}

export function FolderTreeView(props: FolderTreeViewProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 px-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Files</h3>
        <button
          type="button"
          onClick={props.onAddFile}
          className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          title="Add file"
        >
          +
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto py-2">
        {props.items.length === 0 ? (
          <p className="px-3 py-2 text-sm text-slate-500">No files.</p>
        ) : (
          <FolderNodeList
            nodes={props.items}
            depth={0}
            items={props.items}
            currentlyOpenPath={props.currentlyOpenPath}
            onAddFile={props.onAddFile}
            onRemoveFile={props.onRemoveFile}
            onSelectFile={props.onSelectFile}
          />
        )}
      </div>
    </aside>
  );
}

function FolderNodeList(props: FolderTreeViewProps & { nodes: FolderTreeItem[]; depth: number }) {
  return (
    <>
      {props.nodes.map(node =>
        node.type === 'file' ? (
          <FileTreeRow
            key={node.path}
            item={node}
            depth={props.depth}
            currentlyOpenPath={props.currentlyOpenPath}
            onRemoveFile={props.onRemoveFile}
            onSelectFile={props.onSelectFile}
          />
        ) : (
          <div key={node.path}>
            <div
              className="flex h-7 items-center gap-1 px-3 text-xs font-medium text-slate-500"
              style={{ paddingLeft: `${12 + props.depth * 14}px` }}
            >
              <span className="text-slate-400">▾</span>
              <span className="truncate">{node.name}</span>
            </div>
            <FolderNodeList
              nodes={node.children}
              depth={props.depth + 1}
              items={props.items}
              currentlyOpenPath={props.currentlyOpenPath}
              onAddFile={props.onAddFile}
              onRemoveFile={props.onRemoveFile}
              onSelectFile={props.onSelectFile}
            />
          </div>
        )
      )}
    </>
  );
}

function FileTreeRow(props: {
  item: Extract<FolderTreeItem, { type: 'file' }>;
  depth: number;
  currentlyOpenPath?: string;
  onRemoveFile: (path: string) => void;
  onSelectFile: (path: string) => void;
}) {
  const className =
    props.item.path === props.currentlyOpenPath
      ? 'group flex h-8 w-full items-center gap-2 bg-white px-3 text-left text-sm text-slate-900 shadow-sm'
      : 'group flex h-8 w-full items-center gap-2 px-3 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900';

  return (
    <div className={className} style={{ paddingLeft: `${12 + props.depth * 14}px` }}>
      <button
        type="button"
        onClick={() => props.onSelectFile(props.item.path)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="shrink-0 text-xs text-slate-400">◇</span>
        <span className="truncate">{props.item.name}</span>
        {props.item.isDirty && <span className="shrink-0 text-xs text-slate-400">●</span>}
      </button>
      <button
        type="button"
        onClick={() => props.onRemoveFile(props.item.path)}
        className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:inline-flex"
        title={`Remove ${props.item.path}`}
      >
        ×
      </button>
    </div>
  );
}
