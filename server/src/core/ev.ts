// Event
export class Ev<T> {
  private readonly listeners: EvListener<T>[] = [];

  public subscribe(listener: EvListener<T>) {
    this.listeners.push(listener);
  }

  public unsubscribe(listener: EvListener<T>) {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    } else {
      throw new Error('Unknown listener');
    }
  }

  public emit(value: T) {
    if (this.listeners.length > 0) {
      this.listeners.forEach(listener => listener(value));
    }
  }
}

export type EvListener<T> = (value: T) => void;
