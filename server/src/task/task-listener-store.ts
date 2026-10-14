import { Task } from '../repositories/task/task';

export type TaskListenerStoreListener = (task: Task) => void;

export class TaskListenerStore {
  public readonly listeners = new Map<string, Set<TaskListenerStoreListener>>();

  public set(userName: string, listener: TaskListenerStoreListener) {
    let listeners = this.listeners.get(userName);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(userName, listeners);
    }
    listeners.add(listener);
  }

  public delete(userName: string, listener: TaskListenerStoreListener) {
    const listeners = this.listeners.get(userName);
    if (listeners && listeners.delete(listener) && listeners.size === 0) {
      this.listeners.delete(userName);
    }
  }

  public notify(userName: string, task: Task) {
    const listeners = this.listeners.get(userName);
    if (listeners) {
      for (const listener of listeners) {
        listener(task);
      }
    }
  }
}
