import z from 'zod/v4';
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

// getTableData

const tableDataDtoSchema = z.object({
  pk: z.string(),
  data: z.unknown(),
  updatedAt: z.number()
});

export const getTableDataRequestSchema = paginationRequestSchema;

export const getTableDataResponseSchema = paginationResponseSchema.extend({
  rows: z.array(tableDataDtoSchema)
});

export type TableDataDto = z.infer<typeof tableDataDtoSchema>;
export type GetTableDataRequest = z.infer<typeof getTableDataRequestSchema>;
export type GetTableDataResponse = z.infer<typeof getTableDataResponseSchema>;

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
