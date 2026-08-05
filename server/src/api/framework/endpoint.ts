import { Request, Response } from 'express';

export interface Endpoint {
  method: 'delete' | 'get' | 'post';
  path: string;
  auth?: true;
  admin?: true;

  handle(req: Request, res: Response): Promise<object | void>;
}
