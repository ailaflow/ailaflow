import * as z from 'zod/v4';
import { tableRowSchema } from '../table';
import { paginationRequestSchema, paginationResponseSchema } from './pagination';

// getTables

const tableLiteDtoSchema = z.object({
  name: z.string(),
  description: z.string()
});

export const getTablesRequestSchema = paginationRequestSchema;

export const getTablesResponseSchema = paginationResponseSchema.extend({
  tables: z.array(tableLiteDtoSchema)
});

export type TableLiteDto = z.infer<typeof tableLiteDtoSchema>;
export type GetTablesRequest = z.infer<typeof getTablesRequestSchema>;
export type GetTablesResponse = z.infer<typeof getTablesResponseSchema>;

// getTable

const tableDtoSchema = z.object({
  name: z.string(),
  description: z.string()
});

export const getTableResponseSchema = z.object({
  table: tableDtoSchema
});

export type TableDto = z.infer<typeof tableDtoSchema>;
export type GetTableResponse = z.infer<typeof getTableResponseSchema>;

// getTableDataPage

export const getTableDataPageRequestSchema = paginationRequestSchema.extend({
  orderBy: z.string().default('_id'),
  ascending: z.union([z.boolean(), z.enum(['true', 'false']).transform(value => value === 'true')]).default(true)
});

export const getTableDataPageResponseSchema = z.object({
  rows: z.array(tableRowSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean()
});

export type GetTableDataPageRequest = z.infer<typeof getTableDataPageRequestSchema>;
export type GetTableDataPageResponse = z.infer<typeof getTableDataPageResponseSchema>;

// saveTableDataRow

export const saveTableDataRowRequestSchema = z.object({
  row: tableRowSchema
});

export const saveTableDataRowResponseSchema = z.object({
  success: z.boolean()
});

export type SaveTableDataRowRequest = z.infer<typeof saveTableDataRowRequestSchema>;

// saveTable

export const saveTableRequestSchema = z.object({
  insert: z.boolean(),
  name: z.string(),
  description: z.string()
});

export const saveTableResponseSchema = z.object({
  name: z.string()
});

export type SaveTableRequest = z.infer<typeof saveTableRequestSchema>;
export type SaveTableResponse = z.infer<typeof saveTableResponseSchema>;

// deleteTable

export const deleteTableResponseSchema = z.object({
  name: z.string()
});

export type DeleteTableResponse = z.infer<typeof deleteTableResponseSchema>;
