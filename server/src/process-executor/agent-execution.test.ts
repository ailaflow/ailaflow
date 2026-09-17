import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import {
  AgentStep,
  ProcessDefinition,
  LlmUseCase,
  PROCESS_VERSION,
  ProcessLiteDto,
  ProcessExecutionOutcome,
  ProcessExecutionOutcomeType
} from '@ailaflow/shared';
import { LlmClient } from '@aibindkit/llm';
import { AgentToolSetProviderFactory } from '../chat-session/agent-tool-set-provider-factory';
import { Process } from '../repositories/process/process';
import { ProcessManager } from '../process/process-manager';
import { ProcessListQuerier } from '../queriers/process-list/process-list-querier';
import { LlmClientProvider } from '../llm/llm-client-provider';
import { ServerPaths } from '../core/server-paths';
import { SandboxInstanceManager } from '../sandbox/sandbox-instance-manager';
import { AgentSessionRunner } from './services/agent-session-runner';
import { ProcessExecutionServices } from './services/services';
import { ProcessExecutor } from './process-executor';
import { ProcessExecution } from './process-execution';
import { RunProcessTool } from '../chat-session/agent-tools/run-process-tool';
import { ProcessExecutionStore } from './process-execution-store';
import { ProcessExecutionPersister } from './process-execution-persister';
import { ProcessExecutionContext } from './process-execution-context';

const context: ProcessExecutionContext = { startedBy: 'alice', isTest: true };
const signal = new AbortController().signal;

function createAgent(properties: Partial<AgentStep['properties']> = {}): AgentStep {
  return {
    id: 'agent_step',
    name: 'Agent',
    type: 'agent',
    componentType: 'task',
    properties: {
      prompt: { type: 'variable', name: 'prompt' },
      sandboxName: 'sandbox',
      allowedProcesses: [],
      allowedVariableNames: [],
      isTerminalAllowed: false,
      ...properties
    }
  };
}

function createProcess(name: string, sequence: ProcessDefinition['sequence'] = [], isPausable = false): Process {
  return new Process(
    name,
    `${name} description`,
    'admin_only',
    {
      sequence,
      properties: {
        version: PROCESS_VERSION,
        startVariableNames: ['prompt'],
        variables: [
          { name: 'prompt', description: 'The instruction', schema: { type: 'string' } },
          { name: 'answer', description: 'The answer', schema: { type: 'number' } }
        ]
      }
    },
    'hash',
    { prompt: { type: 'string' } },
    sequence.length,
    isPausable
  );
}

function createHarness(
  options: {
    processes?: Process[];
    complete?: LlmClient['complete'];
    sandbox?: SandboxInstanceManager;
  } = {}
) {
  const pages: number[] = [];
  const contexts: ProcessExecutionContext[] = [];
  const executionIds: string[] = [];
  const logs: string[] = [];
  const processes = options.processes ?? [];
  const manager = {
    tryGetByName: async (_: AbortSignal, name: string) => processes.find(process => process.name === name) ?? null
  } as ProcessManager;
  const querier: ProcessListQuerier = {
    query: async (_, page, pageSize) => {
      pages.push(page);
      return {
        page,
        pageSize,
        totalCount: processes.length,
        processes: processes.slice((page - 1) * pageSize, page * pageSize).map<ProcessLiteDto>(process => ({
          name: process.name,
          description: process.description,
          userAccessExpression: process.userAccessExpression,
          isPausable: process.isPausable,
          startVariableSchemas: process.startVariableSchemas ?? {}
        }))
      };
    }
  };
  const sandbox = options.sandbox ?? ({} as SandboxInstanceManager);
  class TrackingProcessExecutor extends ProcessExecutor {
    public override initialize(childContext: ProcessExecutionContext, process: Process, input: Record<string, unknown>) {
      contexts.push(childContext);
      const execution = super.initialize(childContext, process, input);
      executionIds.push(execution.id);
      execution.onLog.subscribe(log => logs.push(log[2]));
      return execution;
    }
  }
  const store = new ProcessExecutionStore();
  const tools = new AgentToolSetProviderFactory(querier, manager, sandbox, store);
  const llm = {
    get: async (_: AbortSignal, useCase: LlmUseCase) => {
      assert.equal(useCase, LlmUseCase.AGENT_STEP);
      return {
        client: { complete: options.complete ?? (async () => ({ message: { role: 'assistant', content: 'Done' } })) },
        modelSettings: { name: 'test', effectiveContextWindowPercent: 95 }
      };
    }
  } as LlmClientProvider;
  const agent = new AgentSessionRunner(llm, tools, {
    getRuntimeFolderPath: () => resolve(__dirname, '../..')
  } as ServerPaths);
  const executor = new TrackingProcessExecutor(
    store,
    {
      persist: async () => {
        assert.fail('Agent execution must not pause');
      }
    } as unknown as ProcessExecutionPersister,
    {
      sandboxInstanceManager: sandbox,
      taskCreator: {},
      notifier: {},
      agentSessionRunner: agent
    } as ProcessExecutionServices
  );
  function run(abortSignal: AbortSignal, runContext: ProcessExecutionContext, process: Process, input: Record<string, unknown>) {
    const execution = executor.initialize(runContext, process, input);
    return execution.runAndWaitForOutcome(abortSignal) as Promise<ProcessExecutionOutcome>;
  }

  let caller: ProcessExecution | undefined;
  function runProcessTool(process: Process, input: Record<string, unknown>) {
    caller ??= executor.initialize(context, createProcess('caller'), { prompt: '' });
    const tool = new RunProcessTool(caller.id, process, store);
    return tool.execute(
      signal,
      { sessionId: 'test', sessionToken: 'test' },
      toolCall(tool.descriptor.function.name, input).message.tool_calls[0]
    );
  }

  return { run, runProcessTool, tools, pages, contexts, logs, store, executionIds, executor };
}

function toolCall(name: string, input: object = {}) {
  return {
    message: {
      role: 'assistant' as const,
      content: 'Working on it',
      tool_calls: [{ type: 'function' as const, id: 'call', function: { name, arguments: JSON.stringify(input) } }]
    }
  };
}

test('agent evaluates its prompt, runs variable tools, logs summaries, and continues to the return step', async () => {
  let turn = 0;
  const process = createProcess('parent', [
    createAgent({ allowedVariableNames: ['answer'] }),
    {
      id: 'return',
      name: 'Return',
      type: 'return',
      componentType: 'task',
      properties: { outputVariableNames: ['answer'] }
    }
  ]);
  const harness = createHarness({
    complete: async (_, __, messages, descriptors) => {
      turn++;
      if (turn === 1) {
        assert.equal(messages[0].role, 'system');
        assert.match(JSON.stringify(messages[0].content), /AI agent/);
        assert.deepEqual(messages[1].content, [{ type: 'text', text: 'Set the answer' }]);
        assert.deepEqual(
          descriptors?.map(tool => tool.function.name),
          ['listVariables', 'readVariable', 'setVariable']
        );
        return toolCall('listVariables');
      }
      if (turn === 2) {
        assert.match(String(messages.at(-1)?.content), /The answer/);
        return toolCall('setVariable', { name: 'answer', value: 'wrong type' });
      }
      if (turn === 3) {
        assert.match(String(messages.at(-1)?.content), /required schema/);
        return toolCall('setVariable', { name: 'answer', value: 42 });
      }
      if (turn === 4) {
        return toolCall('readVariable', { name: 'answer' });
      }
      assert.equal(messages.at(-1)?.content, '{"value":42}');
      return { message: { role: 'assistant', content: 'Answer saved' } };
    }
  });
  const result = await harness.run(signal, context, process, { prompt: 'Set the answer' });
  assert.deepEqual(result, {
    type: ProcessExecutionOutcomeType.FINISHED,
    output: { answer: 42 },
    interruptedStepId: 'return'
  });
  assert.equal(turn, 5);
  assert.ok(harness.logs.includes('Agent tool: setVariable'));
  assert.ok(harness.logs.includes('Agent: Answer saved'));
  assert.deepEqual(harness.pages, []);
});

for (const allowedVariableNames of [[], ['answer']]) {
  test(`agent rejects reading and writing a variable with ${allowedVariableNames.length === 0 ? 'no' : 'other'} variables allowed`, async () => {
    let turn = 0;
    const process = createProcess('parent', [
      createAgent({ allowedVariableNames }),
      {
        id: 'return',
        name: 'Return',
        type: 'return',
        componentType: 'task',
        properties: { outputVariableNames: ['prompt'] }
      }
    ]);
    const harness = createHarness({
      complete: async (_, __, messages) => {
        turn++;
        if (turn === 1) {
          return toolCall('readVariable', { name: 'prompt' });
        }
        assert.match(String(messages.at(-1)?.content), /Variable \$prompt is not allowed to be accessed/);
        if (turn === 2) {
          return toolCall('setVariable', { name: 'prompt', value: 'Changed' });
        }
        return { message: { role: 'assistant', content: 'Access denied' } };
      }
    });

    const result = await harness.run(signal, context, process, { prompt: 'Original' });
    assert.deepEqual(result, {
      type: ProcessExecutionOutcomeType.FINISHED,
      output: { prompt: 'Original' },
      interruptedStepId: 'return'
    });
    assert.equal(turn, 3);
  });
}

test('process tool discovery reads every page, filters selected and pausable processes, and gates terminal access', async () => {
  const processes = Array.from({ length: 105 }, (_, index) => createProcess(`process_${index}`, [], index === 0));
  const harness = createHarness({ processes });
  const parent = createProcess('parent');
  const selected = await harness.tools.create(
    signal,
    ['process_0', 'process_104', 'missing'],
    [],
    'sandbox',
    false,
    parent,
    context,
    'parent_execution'
  );
  assert.deepEqual(harness.pages, [1, 2, 3, 4]);
  assert.deepEqual(
    selected.tools.map(tool => tool.descriptor.function.name),
    ['run_process_process_104', 'listVariables', 'readVariable', 'setVariable']
  );
  const all = await harness.tools.create(signal, null, [], 'sandbox', true, parent, context, 'parent_execution');
  assert.equal(all.tools.filter(tool => tool.descriptor.function.name.startsWith('run_process_')).length, 104);
  assert.ok(all.tools.some(tool => tool.descriptor.function.name === 'runTerminalCommand'));
});

test('child process tools wait for results, bypass user access, and extend ancestry without routing to user chat', async () => {
  const child = createProcess('child');
  const parent = createProcess('parent', [createAgent({ allowedProcesses: ['child'], prompt: { type: 'string', value: 'Run child' } })]);
  let turn = 0;
  const harness = createHarness({
    processes: [child],
    complete: async (_, __, messages) => {
      turn++;
      if (turn === 1) {
        assert.deepEqual(messages[1].content, [{ type: 'text', text: 'Run child' }]);
        return toolCall('run_process_child', { prompt: 'child input' });
      }
      assert.equal(messages.at(-1)?.content, '{"outputValues":{}}');
      return { message: { role: 'assistant', content: 'Child finished' } };
    }
  });
  const result = await harness.run(signal, { ...context, parentProcessNames: ['ancestor'], chatSessionId: 'user:chat' }, parent, {
    prompt: ''
  });
  assert.equal(result.type, ProcessExecutionOutcomeType.FINISHED);
  assert.deepEqual(harness.contexts[1], { ...context, parentProcessNames: ['ancestor', 'parent'] });
  for (const id of harness.executionIds) {
    assert.throws(() => harness.store.get(id), /Cannot find/);
  }
});

for (const allowedProcesses of [null, ['parent', 'ancestor', 'middle', 'child']]) {
  test(`process tools exclude the current process and all ancestors with ${allowedProcesses === null ? 'all' : 'selected'} access`, async () => {
    const parent = createProcess('parent');
    const harness = createHarness({ processes: [parent, createProcess('ancestor'), createProcess('middle'), createProcess('child')] });
    const tools = await harness.tools.create(
      signal,
      allowedProcesses,
      [],
      'sandbox',
      false,
      parent,
      { ...context, parentProcessNames: ['ancestor', 'middle'] },
      'parent_execution'
    );
    assert.deepEqual(
      tools.tools.map(tool => tool.descriptor.function.name),
      ['run_process_child', 'listVariables', 'readVariable', 'setVariable']
    );
  });
}

test('pausable processes and invalid child inputs are rejected before execution', async () => {
  const paused = createProcess('paused', [], true);
  const child = createProcess('child');
  const harness = createHarness({ processes: [paused, child] });
  await assert.rejects(harness.runProcessTool(paused, { prompt: '' }), /pausable/);
  assert.match((await harness.runProcessTool(child, { prompt: 123 })).content, /Invalid tool arguments/);
  assert.deepEqual(harness.contexts, [context]);
});

test('process tools cannot create children after their parent execution finishes', async () => {
  const harness = createHarness();
  await harness.run(signal, context, createProcess('parent'), { prompt: '' });
  const tool = new RunProcessTool(harness.executionIds[0], createProcess('child'), harness.store);

  await assert.rejects(
    tool.execute(
      signal,
      { sessionId: 'test', sessionToken: 'test' },
      toolCall(tool.descriptor.function.name, { prompt: '' }).message.tool_calls[0]
    ),
    /Cannot find the execution/
  );
  assert.equal(harness.executionIds.length, 1);
});

test('terminal commands use the selected sandbox and return output to the agent', async () => {
  let commands = 0;
  const sandbox = {
    getOrCreate: async (_: AbortSignal, name: string) => {
      assert.equal(name, 'selected_sandbox');
      return {
        executeCommand: async (_: AbortSignal, command: unknown) => {
          assert.deepEqual(command, { cwd: '/app', command: '/bin/sh', args: ['-c', 'echo hello'] });
          commands++;
          return { code: 0, stdout: 'hello', stderr: '' };
        }
      };
    }
  } as unknown as SandboxInstanceManager;
  const parent = createProcess('parent', [createAgent({ sandboxName: 'selected_sandbox', isTerminalAllowed: true })]);
  const harness = createHarness({
    sandbox,
    complete: async (_, __, messages) => {
      if (commands === 0) {
        return toolCall('runTerminalCommand', { command: 'echo hello' });
      }
      assert.match(String(messages.at(-1)?.content), /hello/);
      return { message: { role: 'assistant', content: 'Command finished' } };
    }
  });
  assert.equal((await harness.run(signal, context, parent, { prompt: '' })).type, ProcessExecutionOutcomeType.FINISHED);
  assert.equal(commands, 1);
});

test(
  'child timeout is handled after the running activity completes and removes the execution from the live store',
  { timeout: 2_000 },
  async t => {
    const timeoutController = new AbortController();
    const createTimeout = AbortSignal.timeout;
    t.mock.method(AbortSignal, 'timeout', (milliseconds: number) => {
      if (milliseconds === 60_000) {
        return timeoutController.signal;
      }
      return createTimeout(milliseconds);
    });
    let notifyRequestStarted: () => void;
    const requestStarted = new Promise<void>(resolve => {
      notifyRequestStarted = resolve;
    });
    let finishRequest: () => void = () => {
      assert.fail('Agent request did not start');
    };
    const parent = createProcess('parent', [createAgent(), { ...createAgent(), id: 'next_agent_step' }]);
    const harness = createHarness({
      processes: [parent],
      complete: async () => {
        return await new Promise(resolve => {
          finishRequest = () => resolve({ message: { role: 'assistant', content: 'Finished' } });
          timeoutController.abort(new Error('Child process timed out'));
          notifyRequestStarted();
        });
      }
    });
    const pendingResult = harness.runProcessTool(parent, { prompt: '' });
    try {
      await requestStarted;
      assert.equal(harness.store.get(harness.executionIds[1]).id, harness.executionIds[1]);
      finishRequest();
      const result = await pendingResult;
      assert.match(result.content, /The process execution took too long and was stopped/);
      await new Promise(resolve => setImmediate(resolve));
      assert.throws(() => harness.store.get(harness.executionIds[1]), /Cannot find/);
    } finally {
      // Activity cancellation is deferred, so let the in-flight request finish.
      finishRequest();
      await new Promise(resolve => setImmediate(resolve));
    }
  }
);

test('LLM failures fail the agent step', async () => {
  const harness = createHarness({
    complete: async () => {
      throw new Error('Provider unavailable');
    }
  });
  const result = await harness.run(signal, context, createProcess('parent', [createAgent()]), { prompt: '' });
  assert.equal(result.type, ProcessExecutionOutcomeType.FAILED);
  if (result.type === ProcessExecutionOutcomeType.FAILED) {
    assert.match(result.error, /Provider unavailable/);
    assert.equal(result.stepId, 'agent_step');
  }
});

test('repeated agent invocations get fresh conversation history', async () => {
  let turns = 0;
  const harness = createHarness({
    complete: async (_, __, messages) => {
      turns++;
      assert.equal(messages.length, 2);
      assert.deepEqual(messages[1].content, [{ type: 'text', text: `invocation ${turns}` }]);
      return { message: { role: 'assistant', content: 'Finished' } };
    }
  });
  const parent = createProcess('parent', [createAgent()]);
  for (let index = 1; index <= 2; index++) {
    assert.equal(
      (await harness.run(signal, context, parent, { prompt: `invocation ${index}` })).type,
      ProcessExecutionOutcomeType.FINISHED
    );
  }
  assert.equal(turns, 2);
});

test('a process changed to pausable after discovery cannot be launched', async () => {
  const processes = [createProcess('child')];
  let turns = 0;
  const harness = createHarness({
    processes,
    complete: async (_, __, messages) => {
      turns++;
      if (turns === 1) {
        processes[0].isPausable = true;
        return toolCall('run_process_child', { prompt: '' });
      }
      assert.match(String(messages.at(-1)?.content), /pausable/);
      return { message: { role: 'assistant', content: 'Child is unavailable' } };
    }
  });
  await harness.run(signal, context, createProcess('parent', [createAgent({ allowedProcesses: ['child'] })]), {
    prompt: ''
  });
  assert.equal(harness.executionIds.length, 1);
  assert.equal(turns, 2);
});

test('agent runtime timeout fails the step and interrupts the session', async t => {
  const timeoutController = new AbortController();
  const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  t.mock.method(AbortSignal, 'timeout', (milliseconds: number) => {
    assert.equal(milliseconds, 10 * 60_000);
    return timeoutController.signal;
  });
  let requestSignal: AbortSignal | undefined;
  const harness = createHarness({
    complete: async abortSignal => {
      requestSignal = abortSignal;
      return await new Promise((_, reject) => {
        abortSignal.addEventListener('abort', () => reject(abortSignal.reason), { once: true });
        timeoutController.abort(timeoutError);
      });
    }
  });
  const result = await harness.run(signal, context, createProcess('parent', [createAgent()]), { prompt: '' });
  assert.equal(result.type, ProcessExecutionOutcomeType.FAILED);
  if (result.type === ProcessExecutionOutcomeType.FAILED) {
    assert.equal(result.error, timeoutError.message);
    assert.equal(result.stepId, 'agent_step');
  }
  assert.equal(requestSignal?.aborted, true);
});

test('repeated process tools reuse cached start variable schemas', t => {
  const process = createProcess('child');
  const getZodSchema = t.mock.method(process.variables, 'getZodSchema');
  const store = new ProcessExecutionStore();
  const first = new RunProcessTool('parent_execution', process, store);
  const second = new RunProcessTool('parent_execution', process, store);
  assert.equal(getZodSchema.mock.callCount(), 2);
  assert.equal(getZodSchema.mock.calls[0].result, getZodSchema.mock.calls[1].result);
  assert.deepEqual(first.descriptor.function.parameters, second.descriptor.function.parameters);
});
