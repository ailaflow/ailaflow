import { Request, Response } from 'express';

export interface Endpoint {
  method: 'get' | 'post';
  path: string;
  auth?: true;

  handle(req: Request, res: Response): Promise<object | void>;
}
