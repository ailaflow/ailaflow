import type { Request, Response } from 'express';

export interface Endpoint {
  method: 'get' | 'post';
  path: string;

  handle(req: Request, res: Response): Promise<object | void> | object | void;
}
