import { TableColumnResolver, TableColumnType, TableRow } from '@ailaflow/shared';
import { useLoader } from '@aibindkit/react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { TableDataGridColumn, TableDataGridRow, TableDataGridView } from '../../views/table-editor/table-data-grid-view';
import { TableDataRowEditorPopup } from '../common/popups/table-data-row-editor-popup';

const PAGE_SIZE = 20;

export function TableDataGrid(props: { tableName: string }) {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const [editingRow, setEditingRow] = useState<TableRow | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const page = Number(searchParams.get('page') ?? 1);
  const loader = useLoader(
    signal =>
      apiClient.table.getTableDataPage(signal, props.tableName, {
        page,
        pageSize: PAGE_SIZE,
        orderBy: '_id',
        ascending: true
      }),
    [apiClient, props.tableName, page, reloadToken]
  );

  function changePage(value: number): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }

  function reload(): void {
    setReloadToken(current => current + 1);
  }

  async function deleteRow(id: string): Promise<void> {
    if (!window.confirm(`Delete row "${id}"? This cannot be undone.`)) {
      return;
    }

    setDeletingRowId(id);
    try {
      await apiClient.table.deleteTableDataRow(AbortSignal.timeout(5_000), props.tableName, id);
      reload();
    } catch (error) {
      window.alert(`Failed to delete row "${id}": ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDeletingRowId(null);
    }
  }

  async function saveRow(row: TableRow): Promise<void> {
    try {
      await apiClient.table.saveTableDataRow(AbortSignal.timeout(10_000), props.tableName, { row });
      setEditingRow(null);
      reload();
    } catch (error) {
      window.alert(`Failed to save row "${row._id}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }

  const rows = loader.data.rows;
  const grid = createGrid(rows);
  return (
    <>
      <TableDataGridView
        columns={grid.columns}
        rows={grid.rows}
        deletingRowId={deletingRowId}
        pagination={{
          page: loader.data.page,
          hasMore: loader.data.hasMore,
          onPageChange: changePage
        }}
        onEdit={id => setEditingRow(rows.find(row => row._id === id) ?? null)}
        onDelete={id => void deleteRow(id)}
      />
      {editingRow ? <TableDataRowEditorPopup row={editingRow} onSave={saveRow} onClose={() => setEditingRow(null)} /> : null}
    </>
  );
}

function createGrid(rows: TableRow[]): { columns: TableDataGridColumn[]; rows: TableDataGridRow[] } {
  const columnTypes = new Map<string, TableColumnType>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('_')) {
        continue;
      }

      const column = TableColumnResolver.resolve(key, value);
      if (column !== null) {
        columnTypes.set(key, column.type);
      }
    }
  }

  const keys = [...columnTypes.keys()];
  const columns = Array.from(columnTypes, ([key, type]) => ({
    id: fieldColumnId(key),
    label: `${key} (${TableColumnType[type]})`
  }));

  return {
    columns,
    rows: rows.map(row => ({
      _id: row._id,
      values: createValues(row, keys),
      _updatedAt: new Date(row._updatedAt).toLocaleString()
    }))
  };
}

function createValues(row: Record<string, unknown>, keys: readonly string[]): Record<string, string> {
  return Array.from(keys).reduce<Record<string, string>>((values, key) => {
    if (key in row) {
      values[fieldColumnId(key)] = formatValue(row[key]);
    }
    return values;
  }, {});
}

function fieldColumnId(key: string): string {
  return `field:${key}`;
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined) {
    return '';
  }
  return JSON.stringify(value);
}
