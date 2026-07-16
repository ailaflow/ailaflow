import { useProcessEditor } from '../process-editor-context';
import { ProcessSubEditorView } from '../../../views/process-editor/process-sub-editor-view';
import type { FileContent, ScriptDefinition } from '@aila/model';
import { useState } from 'react';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { ScriptSubEditorView } from '../../../views/process-editor/script-sub-editor/script-sub-editor';
import { FolderTreeItem, FolderTreeView } from '../../../views/process-editor/script-sub-editor/folder-tree-view';
import { FileContentEditorView } from '../../../views/process-editor/script-sub-editor/file-content-editor-view';
import { fnv1a } from '../../../core/fnv1a';
import { ScriptChildEditorUtils } from './script-child-editor-utils';

export interface ScriptChildEditorState {
  selectedFilePath: string | undefined;
}

export function ScriptChildEditor() {
  const state = useProcessEditor();

  const [folderItems, setFolderItems] = useState<FolderTreeItem[]>(() => {
    const { form: script } = ScriptChildEditorUtils.getData(state);
    return createFolderTree(script.contents);
  });
  const { selectedFilePath } = state.getOverlayState<ScriptChildEditorState>(() => ({ selectedFilePath: getFirstFilePath(folderItems) }));
  const selectedFile = selectedFilePath ? findFile(folderItems, selectedFilePath) : undefined;

  function setSelectedFilePath(path: string | undefined) {
    state.setOverlayState({ selectedFilePath: path });
  }

  function addFile() {
    const path = window.prompt('File name');
    if (!path?.trim()) {
      return;
    }
    if (findFile(folderItems, path)) {
      window.alert(`File "${path}" already exists.`);
      return;
    }

    const file: FileContent = {
      path,
      mimeType: ScriptChildEditorUtils.resolveMimeType(path),
      content: '',
      modifiedAt: Date.now()
    };

    setSelectedFilePath(path);
    setFolderItems(current => addFileToTree(current, file));
  }

  function removeFile(path: string) {
    if (!window.confirm(`Remove "${path}"?`)) {
      return;
    }

    const nextFolderItems = removeFileFromTree(folderItems, path);
    const nextSelectedPath = path === selectedFilePath ? getFirstFilePath(nextFolderItems) : selectedFilePath;

    setSelectedFilePath(nextSelectedPath);
    setFolderItems(nextFolderItems);
  }

  function updateSelectedFileContent(content: string) {
    if (!selectedFilePath) {
      return;
    }

    setFolderItems(current =>
      updateFolderTree(current, item =>
        item.path === selectedFilePath
          ? {
              ...item,
              content,
              modifiedAt: Date.now(),
              isDirty: true
            }
          : item
      )
    );
  }

  function ok() {
    const { form: currentScript } = ScriptChildEditorUtils.getData(state);
    const contents = flattenFolderTree(folderItems);
    const script: ScriptDefinition = {
      sandboxName: currentScript.sandboxName,
      contents,
      hash: fnv1a(contents)
    };
    Object.assign(currentScript, script);
    state.setDefinition(wrapDefinition(state.definition.value), true);
    state.closeOverlay();
  }

  return (
    <ProcessSubEditorView title="Script Editor" canOk={true} onCancel={state.closeOverlay} onOk={ok}>
      <ScriptSubEditorView>
        <FolderTreeView
          items={folderItems}
          currentlyOpenPath={selectedFilePath}
          onAddFile={addFile}
          onRemoveFile={removeFile}
          onSelectFile={setSelectedFilePath}
        />
        <FileContentEditorView path={selectedFilePath} content={selectedFile?.content ?? ''} onContentChange={updateSelectedFileContent} />
      </ScriptSubEditorView>
    </ProcessSubEditorView>
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
          modifiedAt: content.modifiedAt,
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

function addFileToTree(items: FolderTreeItem[], file: FileContent): FolderTreeItem[] {
  const parts = file.path.split('/').filter(Boolean);
  return sortFolderTree(addFileToTreeItems(items, parts, file));
}

function addFileToTreeItems(items: FolderTreeItem[], parts: string[], file: FileContent, parentPath = ''): FolderTreeItem[] {
  const [name, ...rest] = parts;
  if (!name) {
    return items;
  }

  const path = parentPath ? `${parentPath}/${name}` : name;

  if (rest.length === 0) {
    return [
      ...items,
      {
        name,
        path,
        type: 'file',
        mimeType: file.mimeType,
        content: file.content,
        modifiedAt: file.modifiedAt,
        isDirty: true
      }
    ];
  }

  const existingFolder = items.find((item): item is FolderNode => item.type === 'folder' && item.path === path);
  if (existingFolder) {
    return items.map(item =>
      item === existingFolder
        ? {
            ...item,
            children: addFileToTreeItems(item.children, rest, file, path)
          }
        : item
    );
  }

  return [
    ...items,
    {
      name,
      path,
      type: 'folder',
      children: addFileToTreeItems([], rest, file, path)
    }
  ];
}

function removeFileFromTree(items: FolderTreeItem[], path: string): FolderTreeItem[] {
  const nextItems: FolderTreeItem[] = [];

  for (const item of items) {
    if (item.type === 'file') {
      if (item.path !== path) {
        nextItems.push(item);
      }
      continue;
    }

    const children = removeFileFromTree(item.children, path);
    if (children.length > 0) {
      nextItems.push({
        ...item,
        children
      });
    }
  }

  return nextItems.sort(compareFolderTreeItems);
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

function updateFolderTree(items: FolderTreeItem[], updateFile: (item: FileNode) => FileNode): FolderTreeItem[] {
  return items.map(item => {
    if (item.type === 'file') {
      return updateFile(item);
    }
    return {
      ...item,
      children: updateFolderTree(item.children, updateFile)
    };
  });
}

function findFile(items: FolderTreeItem[], path: string): FileNode | undefined {
  let found: FileNode | undefined;
  walkFiles(items, file => {
    if (file.path === path) {
      found = file;
      return false;
    }
    return true;
  });
  return found;
}

type FolderNode = Extract<FolderTreeItem, { type: 'folder' }>;
type FileNode = Extract<FolderTreeItem, { type: 'file' }>;

function getFirstFilePath(items: FolderTreeItem[]): string | undefined {
  let path: string | undefined;
  walkFiles(items, file => {
    path = file.path;
    return false;
  });
  return path;
}

function flattenFolderTree(items: FolderTreeItem[]): FileContent[] {
  const contents: FileContent[] = [];
  walkFiles(items, file => {
    contents.push({
      path: file.path,
      mimeType: file.mimeType,
      content: file.content,
      modifiedAt: file.modifiedAt
    });
    return true;
  });
  return contents;
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
