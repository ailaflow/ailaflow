import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Request } from 'express';
import test from 'node:test';
import {
  ProcessExecutionTraceRetention,
  ProcessExecutionTraceEventType,
  ProcessExecutionTraceStatus,
  ProcessExecutionTrigger,
  ProcessLogLevel
} from '@ailaflow/shared';
import { ProcessExecutionTraceEvent } from '../../repositories/process-execution-trace/process-execution-trace-event';
import { ProcessExecutionTraceEventRepository } from '../../repositories/process-execution-trace/process-execution-trace-event-repository';
import { ProcessExecutionTrace } from '../../repositories/process-execution-trace/process-execution-trace';
import { ProcessExecutionTraceRepository } from '../../repositories/process-execution-trace/process-execution-trace-repository';
import { GetProcessExecutionTraceEventsEndpoint } from './get-process-execution-trace-events-endpoint';
import { GetProcessExecutionTraceEndpoint } from './get-process-execution-trace-endpoint';
import { GetProcessExecutionTracesEndpoint } from './get-process-execution-traces-endpoint';

test('gets a filtered page of process execution trace DTOs', async () => {
  const trace = createTrace();
  let pageArguments: [offset: number, limit: number, processName?: string] | null = null;
  let countProcessName: string | undefined;
  const repository: ProcessExecutionTraceRepository = {
    setup: async () => undefined,
    tryGet: async () => null,
    upsert: async () => undefined,
    deleteOldWithAllEvents: async () => 0,
    getPage: async (_, offset, limit, processName) => {
      pageArguments = [offset, limit, processName];
      return [trace];
    },
    count: async (_, processName) => {
      countProcessName = processName;
      return 21;
    }
  };
  const endpoint = new GetProcessExecutionTracesEndpoint(repository);

  assert.deepEqual(await endpoint.handle(createRequest({ query: { page: '3', pageSize: '10', processName: 'process_1' } })), {
    traces: [trace.toDto()],
    totalCount: 21,
    page: 3,
    pageSize: 10
  });
  assert.deepEqual(pageArguments, [20, 10, 'process_1']);
  assert.equal(countProcessName, 'process_1');
});

test('gets a process execution trace DTO', async () => {
  const trace = createTrace();
  let requestedExecutionId: string | null = null;
  const repository: ProcessExecutionTraceRepository = {
    setup: async () => undefined,
    tryGet: async (_, executionId) => {
      requestedExecutionId = executionId;
      return trace;
    },
    upsert: async () => undefined,
    deleteOldWithAllEvents: async () => 0,
    getPage: async () => [],
    count: async () => 0
  };
  const endpoint = new GetProcessExecutionTraceEndpoint(repository);

  assert.deepEqual(await endpoint.handle(createRequest({ params: { executionId: 'execution_1' } })), {
    trace: trace.toDto()
  });
  assert.equal(requestedExecutionId, 'execution_1');
});

test('gets all process execution trace event DTOs', async () => {
  const events = [
    new ProcessExecutionTraceEvent('execution_1', ProcessExecutionTraceEventType.STEP_CHANGE, { stepId: 'step_1' }, 1_000),
    ProcessExecutionTraceEvent.createLog('execution_1', [1_100, ProcessLogLevel.INFO, 'Started'])
  ];
  let requestedExecutionId: string | null = null;
  const repository: ProcessExecutionTraceEventRepository = {
    setup: async () => undefined,
    insert: async () => undefined,
    getAll: async (_, executionId) => {
      requestedExecutionId = executionId;
      return events;
    }
  };
  const endpoint = new GetProcessExecutionTraceEventsEndpoint(repository);

  assert.deepEqual(await endpoint.handle(createRequest({ params: { executionId: 'execution_1' } })), {
    events: events.map(event => event.toDto())
  });
  assert.equal(requestedExecutionId, 'execution_1');
});

function createRequest(values: { query?: Record<string, string>; params?: Record<string, string> }): Request {
  return Object.assign(new EventEmitter(), { query: {}, params: {}, ...values }) as unknown as Request;
}

function createTrace(): ProcessExecutionTrace {
  return new ProcessExecutionTrace(
    'execution_1',
    ProcessExecutionTrigger.SCHEDULED_JOB,
    ProcessExecutionTraceStatus.COMPLETED,
    'process_1',
    ProcessExecutionTraceRetention.ONE_WEEK,
    'user_1',
    1_000,
    2_000,
    3_000
  );
}
