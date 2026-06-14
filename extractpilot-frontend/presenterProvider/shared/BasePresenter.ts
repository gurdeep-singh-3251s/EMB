export abstract class BasePresenter<S> {
  private listeners = new Set<() => void>();

  protected notify() {
    for (const l of this.listeners) l();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  abstract getState(): S;
}
