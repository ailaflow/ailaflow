import type { TableRow } from '@ailaflow/shared';
import { useState } from 'react';
import { TableDataRowEditorPopupView } from '../../../views/common/popups/table-data-row-editor-popup-view';

export interface TableDataRowEditorPopupProps {
  row: TableRow;
  onSave(row: TableRow): void | Promise<void>;
  onClose(): void;
}

export function TableDataRowEditorPopup(props: TableDataRowEditorPopupProps) {
  const [json, setJson] = useState(() => JSON.stringify(props.row, null, 2));
  const [row, setRow] = useState<TableRow>(props.row);
  const [isJsonValid, setIsJsonValid] = useState(true);

  function changeJson(value: string): void {
    setJson(value);
    try {
      setRow(JSON.parse(value));
      setIsJsonValid(true);
    } catch {
      setIsJsonValid(false);
    }
  }

  return (
    <TableDataRowEditorPopupView
      rowId={props.row._id}
      json={json}
      isJsonValid={isJsonValid}
      onJsonChange={changeJson}
      onSave={() => props.onSave(row)}
      onClose={props.onClose}
    />
  );
}
