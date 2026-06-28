export function toolError(error: string | Error): { error: string } {
  if (typeof error === 'string') {
    return { error };
  }
  return { error: error.message };
}

export function toolSuccess(message: string): { success: string } {
  return { success: message };
}

class ToolWait {
  public constructor(public finishSignal: AbortSignal) {}

  public wait(abortSignal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        abortSignal.removeEventListener('abort', onAbort);
        reject(new Error('Tool wait aborted'));
      };
      abortSignal.addEventListener('abort', onAbort);

      this.finishSignal.addEventListener(
        'abort',
        () => {
          abortSignal.removeEventListener('abort', onAbort);
          resolve();
        },
        { once: true }
      );
    });
  }
}

export function toolWait(finishSignal: AbortSignal) {
  return new ToolWait(finishSignal);
}

export function isToolWait(value: unknown): value is ToolWait {
  return value instanceof ToolWait;
}
