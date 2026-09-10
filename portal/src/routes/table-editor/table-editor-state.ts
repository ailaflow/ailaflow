import { SaveTableRequest, TableDto, TableValidator } from '@ailaflow/shared';
import { useMemo, useState } from 'react';

export interface TableEditorData {
  name: string;
  description: string;
  isDirty: boolean;
  isNew: boolean;
}

export interface TableEditorState extends TableEditorData {
  nameError: string | null;
  descriptionError: string | null;
  canSave: boolean;
  setName(name: string): void;
  setDescription(description: string): void;
  markSaved(): void;
  toSaveRequest(): SaveTableRequest;
}

export function useTableEditorState(table?: TableDto): TableEditorState {
  const [data, setData] = useState<TableEditorData>(() => createData(table));
  const { nameError, descriptionError } = useMemo(() => validateState(data), [data]);
  const canSave = data.isDirty && nameError === null && descriptionError === null;

  function update(delta: Partial<TableEditorData>): void {
    setData(data => ({
      ...data,
      ...delta,
      isDirty: true
    }));
  }

  return {
    ...data,
    nameError,
    descriptionError,
    canSave,
    setName: name => update({ name }),
    setDescription: description => update({ description }),
    markSaved: () => setData(data => ({ ...data, isDirty: false })),
    toSaveRequest: () => ({
      insert: data.isNew,
      name: data.name,
      description: data.description
    })
  };
}

function createData(table?: TableDto): TableEditorData {
  return {
    name: table?.name ?? 'new_table',
    description: table?.description ?? '',
    isDirty: !table,
    isNew: !table
  };
}

function validateState(state: TableEditorData): { nameError: string | null; descriptionError: string | null } {
  return {
    nameError: TableValidator.validateName(state.name),
    descriptionError: TableValidator.validateDescription(state.description)
  };
}
