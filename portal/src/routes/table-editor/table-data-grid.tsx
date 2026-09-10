import { TableDataDto } from '@ailaflow/shared';
import { useLoader } from '@aibindkit/react';
import { useSearchParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { TableDataGridColumn, TableDataGridRow, TableDataGridView } from '../../views/table-editor/table-data-grid-view';

const PAGE_SIZE = 20;
const VALUE_COLUMN_ID = 'value';

export function TableDataGrid(props: { tableName: string }) {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);
  const loader = useLoader(
    abortSignal => apiClient.table.getTableData(abortSignal, props.tableName, { page, pageSize: PAGE_SIZE }),
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

function createGrid(rows: TableDataDto[]): { columns: TableDataGridColumn[]; rows: TableDataGridRow[] } {
  const keys = new Set<string>();
  let hasValueColumn = false;

  for (const row of rows) {
    if (isRecord(row.data)) {
      Object.keys(row.data).forEach(key => keys.add(key));
    } else {
      hasValueColumn = true;
    }
  }

  const columns = Array.from(keys, key => ({ id: fieldColumnId(key), label: key }));
  if (hasValueColumn) {
    columns.push({ id: VALUE_COLUMN_ID, label: 'Value' });
  }

  return {
    columns,
    rows: rows.map(row => ({
      pk: row.pk,
      values: createValues(row.data, keys),
      updatedAt: new Date(row.updatedAt).toLocaleString()
    }))
  };
}

function createValues(data: unknown, keys: Set<string>): Record<string, string> {
  if (!isRecord(data)) {
    return { [VALUE_COLUMN_ID]: formatValue(data) };
  }

  return Array.from(keys).reduce<Record<string, string>>((values, key) => {
    if (key in data) {
      values[fieldColumnId(key)] = formatValue(data[key]);
    }
    return values;
  }, {});
}

function fieldColumnId(key: string): string {
  return `field:${key}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
