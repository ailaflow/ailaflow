import z from 'zod';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { TableManager } from '../../table/table-manager';

const whereValueSchema = z.union([z.string(), z.number().finite(), z.boolean()]);
const whereConditionSchema = z
  .object({
    $eq: whereValueSchema.optional(),
    $neq: whereValueSchema.optional(),
    $lt: whereValueSchema.optional(),
    $gt: whereValueSchema.optional(),
    $lte: whereValueSchema.optional(),
    $gte: whereValueSchema.optional()
  })
  .strict()
  .refine(condition => Object.values(condition).some(value => value !== undefined), {
    message: 'A where condition must contain at least one operator'
  });

const requestSchema = z.object({
  name: z.string(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  orderBy: z.string(),
  ascending: z.boolean(),
  where: z.record(z.string(), whereConditionSchema).optional()
});

export class ReadTablePageRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'readTablePage';

  public constructor(private readonly tableManager: TableManager) {}

  public async handle(abortSignal: AbortSignal, _sandboxName: string, _executionId: string, data: object) {
    const request = requestSchema.parse(data);
    return this.tableManager.readPage(abortSignal, {
      tableName: request.name,
      page: request.page,
      pageSize: request.pageSize,
      orderBy: request.orderBy,
      ascending: request.ascending,
      where: request.where
    });
  }
}
