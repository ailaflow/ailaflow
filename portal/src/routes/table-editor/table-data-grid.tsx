import { TableColumnResolver, TableColumnType, TableRow } from '@ailaflow/shared';
import { useLoader } from '@aibindkit/react';
import { useSearchParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { TableDataGridColumn, TableDataGridRow, TableDataGridView } from '../../views/table-editor/table-data-grid-view';

const PAGE_SIZE = 20;

export function TableDataGrid(props: { tableName: string }) {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);
  const loader = useLoader(
    abortSignal =>
      apiClient.table.getTableData(abortSignal, props.tableName, {
        page,
        pageSize: PAGE_SIZE,
        orderBy: '_id',
        ascending: true
      }),
    [apiClient, props.tableName, page]
  );

  function changePage(value: number): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }

  const grid = createGrid(loader.data.rows);
  return (
    <TableDataGridView
      columns={grid.columns}
      rows={grid.rows}
      pagination={{
        page: loader.data.page,
        pageSize: loader.data.pageSize,
        totalCount: loader.data.totalCount,
        onPageChange: changePage
      }}
    />
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
