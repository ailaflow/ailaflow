import { MyTaskLiteDto } from '@aila/model';

export interface MyTaskListQuerier {
  query(abortSignal: AbortSignal, userName: string): Promise<MyTaskLiteDto[]>;
}
