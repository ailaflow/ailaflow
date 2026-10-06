export class SimpleEvent<T> {
  private emissionDepth = 0;
  private listeners: SimpleEventListener<T>[] = [];

  public subscribe(listener: SimpleEventListener<T>) {
    if (this.emissionDepth > 0) {
      this.listeners = [...this.listeners, listener];
    } else {
      this.listeners.push(listener);
    }
  }

  public unsubscribe(listener: SimpleEventListener<T>) {
    if (this.emissionDepth > 0) {
      this.listeners = [...this.listeners];
    }

    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    } else {
      throw new Error('Unknown listener');
    }
  }

  public readonly emit = (value: T) => {
    if (this.listeners.length === 0) {
      return;
    }
    this.emissionDepth++;
    const listeners = this.listeners;
    try {
      listeners.forEach(listener => listener(value));
    } finally {
      this.emissionDepth--;
    }
  };

  public once(listener: SimpleEventListener<T>) {
    const wrapper = (value: T) => {
      this.unsubscribe(wrapper);
      listener(value);
    };
    this.subscribe(wrapper);
  }
}

export type SimpleEventListener<T> = (value: T) => void;
