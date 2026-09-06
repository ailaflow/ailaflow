import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { getEndpointAbortSignal } from './endpoint-abort-signal';

test('a completed request body does not cancel work while the response is pending', () => {
  const response = Object.assign(new EventEmitter(), { writableEnded: false });
  const request = Object.assign(new EventEmitter(), { complete: true, res: response });
  const signal = getEndpointAbortSignal(request as unknown as Request);
  request.emit('close');
  assert.equal(signal.aborted, false);
  response.writableEnded = true;
  response.emit('close');
  assert.equal(signal.aborted, false);
});

test('an interrupted request body or disconnected response cancels work', () => {
  const request = Object.assign(new EventEmitter(), { complete: false });
  const requestSignal = getEndpointAbortSignal(request as unknown as Request);
  request.emit('close');
  assert.equal(requestSignal.aborted, true);

  const response = Object.assign(new EventEmitter(), { writableEnded: false });
  const completeRequest = Object.assign(new EventEmitter(), { complete: true, res: response });
  const responseSignal = getEndpointAbortSignal(completeRequest as unknown as Request);
  response.emit('close');
  assert.equal(responseSignal.aborted, true);
});
