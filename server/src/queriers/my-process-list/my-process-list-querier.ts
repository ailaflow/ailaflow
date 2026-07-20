import { MyProcessLiteDto } from '@aila/model';

export interface MyProcessListQuerier {
  query(abortSignal: AbortSignal, userName: string): Promise<MyProcessLiteDto[]>;
}
