import { useProcessEditor } from '../process-editor-context';
import { ProcessOverlayView } from '../../../views/process-editor/overlays/process-overlay-view';
import { useEffect } from 'react';
import { ScriptOverlayView } from '../../../views/process-editor/overlays/script-overlay-view';
import type { FileContent } from '@ailaflow/model';
import { FolderTreeItem, FolderTreeView } from '../../../views/process-editor/overlays/folder-tree-view';
import { FileContentEditorView } from '../../../views/process-editor/overlays/file-content-editor-view';
import { ScriptEditorOverlayUtils } from './script-editor-overlay-utils';
import { SvgIcon } from '../../../views/common/svg-icons';

export interface ScriptEditorOverlayState {
  selectedFilePath: string | undefined;
}

export function ScriptEditorOverlay() {
  const state = useProcessEditor();

  const data = ScriptEditorOverlayUtils.getData(state);
  const folderItems = createFolderTree(data.script.contents);
  const { selectedFilePath } = state.getOverlayState<ScriptEditorOverlayState>(() => ({
    selectedFilePath: getFirstFilePath(folderItems)
  }));
  const selectedFile = selectedFilePath ? ScriptEditorOverlayUtils.getFile(data, selectedFilePath) : undefined;

  function setSelectedFilePath(path: string | undefined) {
    state.setOverlayState<ScriptEditorOverlayState>({ selectedFilePath: path });
  }

  useEffect(() => {
    const nextSelectedFilePath = selectedFilePath && selectedFile ? selectedFilePath : getFirstFilePath(folderItems);
    if (nextSelectedFilePath !== selectedFilePath) {
      setSelectedFilePath(nextSelectedFilePath);
    }
  });

  function addFile() {
    const path = window.prompt('File name');
    if (!path?.trim()) {
      return;
    }
    if (ScriptEditorOverlayUtils.getFile(data, path)) {
      window.alert(`File "${path}" already exists.`);
      return;
    }

    ScriptEditorOverlayUtils.setFileContent(data, path, '', 'create');
    setSelectedFilePath(path);
    state.notifyDefinitionChange();
  }

  function removeFile(path: string) {
    if (!window.confirm(`Remove "${path}"?`)) {
      return;
    }

    if (!ScriptEditorOverlayUtils.deleteFile(data, path)) {
      return;
    }

    if (path === selectedFilePath) {
      const nextFolderItems = createFolderTree(data.script.contents);
      setSelectedFilePath(getFirstFilePath(nextFolderItems));
    }
    state.notifyDefinitionChange();
  }

  function updateSelectedFileContent(content: string) {
    if (!selectedFilePath) {
      return;
    }

    ScriptEditorOverlayUtils.setFileContent(data, selectedFilePath, content, 'edit');
    state.notifyDefinitionChange();
  }

  function ok() {
    state.closeOverlay();
  }

  return (
    <ProcessOverlayView
      title="Script Editor"
      isOkVisible={state.isDirty}
      isOkEnabled={state.isDirty}
      closeContent={state.isDirty ? 'Cancel' : <SvgIcon name="x" className="h-4 w-4" />}
      closeAriaLabel={state.isDirty ? 'Cancel' : 'Back to designer'}
      onClose={state.closeOverlay}
      onOk={ok}
    >
      <ScriptOverlayView>
        <FolderTreeView
          items={folderItems}
          currentlyOpenPath={selectedFilePath}
          onAddFile={addFile}
          onRemoveFile={removeFile}
          onSelectFile={setSelectedFilePath}
        />
        <FileContentEditorView path={selectedFilePath} content={selectedFile?.content ?? ''} onContentChange={updateSelectedFileContent} />
      </ScriptOverlayView>
    </ProcessOverlayView>
  );
}

function createFolderTree(contents: FileContent[]): FolderTreeItem[] {
  const root: FolderNode = { name: '', path: '', type: 'folder', children: [] };
  const folderByPath = new Map<string, FolderNode>([['', root]]);

  for (const content of contents) {
    const parts = content.path.split('/').filter(Boolean);
    let node = root;

    for (const [index, part] of parts.entries()) {
      const path = parts.slice(0, index + 1).join('/');
      const isFile = index === parts.length - 1;

      if (isFile) {
        node.children.push({
          name: part,
          path,
          type: 'file',
          mimeType: content.mimeType,
          content: content.content,
          isDirty: false
        });
        break;
      }

      let child = folderByPath.get(path);
      if (!child) {
        child = { name: part, path, type: 'folder', children: [] };
        node.children.push(child);
        folderByPath.set(path, child);
      }
      node = child;
    }
  }

  return sortFolderTree(root.children);
}

function sortFolderTree(items: FolderTreeItem[]): FolderTreeItem[] {
  return items
    .sort(compareFolderTreeItems)
    .map(item => (item.type === 'folder' ? { ...item, children: sortFolderTree(item.children) } : item));
}

function compareFolderTreeItems(a: FolderTreeItem, b: FolderTreeItem) {
  if (a.type === 'folder' && b.type === 'file') {
    return -1;
  }
  if (a.type === 'file' && b.type === 'folder') {
    return 1;
  }
  return a.name.localeCompare(b.name);
}

function getFirstFilePath(items: FolderTreeItem[]): string | undefined {
  let path: string | undefined;
  walkFiles(items, file => {
    path = file.path;
    return false;
  });
  return path;
}

function walkFiles(items: FolderTreeItem[], visit: (file: FileNode) => boolean): boolean {
  for (const item of items) {
    if (item.type === 'file') {
      if (!visit(item)) {
        return false;
      }
    } else if (!walkFiles(item.children, visit)) {
      return false;
    }
  }
  return true;
}

type FolderNode = Extract<FolderTreeItem, { type: 'folder' }>;
type FileNode = Extract<FolderTreeItem, { type: 'file' }>;
