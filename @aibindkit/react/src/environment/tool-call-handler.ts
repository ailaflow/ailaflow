import { ToolCall, ToolDescriptor } from '@aibindkit/core';
import { AiBinding, AiBindingsStore, AiRoute, isToolWait, toolError, toolSuccess } from '../core';
import { RouterAdapter } from './router-adapter';
import { UnsavedChangesController } from './unsaved-changes-controller';

interface BindingWithStore {
  binding: AiBinding;
  store: AiBindingsStore;
}

export class ToolCallHandler<Stores extends Record<string, AiBindingsStore>> {
  public readonly toolDescriptors: ToolDescriptor[] = [];
  private readonly routeByNameMap: Record<string, AiRoute> = {};
  private readonly routeByPathMap: Record<string, AiRoute> = {};
  private readonly functionMap: Record<string, BindingWithStore> = {};

  public constructor(
    stores: Stores,
    private readonly routerAdapter: RouterAdapter,
    private readonly unsavedChangesController: UnsavedChangesController
  ) {
    this.toolDescriptors.push({
      type: 'function',
      function: {
        name: 'navigation_getCurrentPage',
        description: 'Gets the current page in the browser',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    });

    for (const store of Object.values(stores)) {
      if (store.route) {
        const name = `navigation_open${uppercaseFirst(store.route.name)}Page`;
        this.toolDescriptors.push({
          type: 'function',
          function: {
            name,
            description: `Opens the "${store.route.name}" page`,
            parameters: store.route.paramsSchema
          }
        });
        this.routeByNameMap[name] = store.route;
        for (const path of store.route.paths) {
          this.routeByPathMap[path] = store.route;
        }
      }
      for (const binding of store.bindings) {
        const name = store.route ? `${store.route.name}_${binding.name}` : binding.name;
        this.toolDescriptors.push({
          type: 'function',
          function: {
            name,
            description: binding.description,
            parameters: binding.inputSchema
          }
        });
        this.functionMap[name] = {
          store,
          binding
        };
      }
    }
  }

  public readonly frontEndToolCallsHandler = async (abortSignal: AbortSignal, toolCall: ToolCall): Promise<object | null> => {
    const arg = JSON.parse(toolCall.function.arguments);

    if (toolCall.function.name === 'navigation_getCurrentPage') {
      return this.getCurrentPage();
    }
    const route = this.routeByNameMap[toolCall.function.name];
    if (route) {
      return this.navigateTo(route, arg);
    }
    const fn = this.functionMap[toolCall.function.name];
    if (fn) {
      return this.runFn(abortSignal, fn, arg);
    }

    // We don't support the requested tool call.
    return null;
  };

  private async getCurrentPage() {
    const current = this.routerAdapter.getCurrentRoute();
    const route = current ? this.routeByPathMap[current.path] : null;
    if (!current || !route) {
      return toolError('The current page could not be determined');
    }

    const result: Record<string, unknown> = {
      name: route.name,
      params: current.params
    };

    for (const [fieldName, functionName] of Object.entries(route.currentPageFields)) {
      const fnName = `${route.name}_${functionName}`;
      const fn = this.functionMap[fnName];
      if (fn) {
        const handler = fn.store.tryGet();
        if (handler) {
          const res = await handler[functionName]({});
          result[fieldName] = res;
        }
      }
    }
    return result;
  }

  private async navigateTo(route: AiRoute, arg: Record<string, unknown>) {
    const force = arg.__force === true;
    if (this.unsavedChangesController.hasUnsavedChanges() && !force) {
      return toolError(
        'Navigation was interrupted because the current page has unsaved changes. Stop the current action. ' +
          'If the user explicitly asks to navigate without saving, call this function again with `{ ..., "__force": true }` in the argument object.'
      );
    }
    if (force) {
      delete arg.__force;
    }

    let path = route.paths[0];
    for (const [key, value] of Object.entries(arg)) {
      path = path.replace(`:${key}`, String(value));
    }
    await this.routerAdapter.navigate(path);
    return toolSuccess(`Redirected to the "${route.name}" page`);
  }

  private async runFn(abortSignal: AbortSignal, fn: BindingWithStore, arg: Record<string, unknown>) {
    for (let attempt = 0; ; attempt++) {
      const handler = fn.store.tryGet();
      if (!handler) {
        return toolError(fn.store.route?.notAvailableMessage ?? 'The requested function is not available on the current page');
      }
      if (fn.binding.inputZod) {
        const parseResult = fn.binding.inputZod.safeParse(arg);
        if (!parseResult.success) {
          return toolError(`Invalid arguments: ${parseResult.error.message}`);
        }
      }
      const result = await handler[fn.binding.name](arg);
      if (isToolWait(result)) {
        if (attempt === 0) {
          await result.wait(abortSignal);
          continue;
        } else {
          return toolError('The requested resource is still loading. Please try again later.');
        }
      }
      return result;
    }
  }
}

function uppercaseFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
