import z from 'zod/v4';
import { EndpointError } from './endpoint-error';

export function parseBody<T>(zod: z.ZodType<T>, body: unknown): T {
  try {
    return zod.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new EndpointError('Invalid request body', 400);
    }
    throw err;
  }
}

export function parseQuery<T>(zod: z.ZodType<T>, query: unknown): T {
  try {
    return zod.parse(query);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new EndpointError('Invalid query parameters', 400);
    }
    throw err;
  }
}
