import { EventEmitter } from "node:events";

type TaskAvailableListener = (hint?: { commandType?: string; taskId?: string }) => void;

/**
 * In-process event bus: notify a worker immediately when a new task is queued,
 * instead of waiting on a 1.5s database poll.
 *
 * Architecture notes:
 * - Same-process setups (desktop, monolith) get zero-delay notify through EventEmitter.
 * - Cross-process setups (server + director-worker) still fall back to polling,
 *   and can later grow IPC / Unix socket / Redis pub-sub.
 * - This does not replace database persistence: DB remains the source of truth; Dispatcher is only a wake-up signal.
 */
class TaskDispatcher {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  /** Call when a new command is queued or status changes, to wake an idle slot. */
  notify(hint?: { commandType?: string; taskId?: string }): void {
    this.emitter.emit("task-available", hint);
  }

  /** Register a worker-slot listener that wakes immediately when a new task arrives. */
  onTaskAvailable(listener: TaskAvailableListener): () => void {
    this.emitter.on("task-available", listener);
    return () => {
      this.emitter.removeListener("task-available", listener);
    };
  }

  /**
   * Wait for the next wake-up signal or a timeout (replaces setTimeout polling).
   * Returns true if woken by a signal, false on timeout.
   */
  waitForSignal(timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(false);
      }, timeoutMs);

      const onSignal = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(true);
      };

      const cleanup = () => {
        this.emitter.removeListener("task-available", onSignal);
      };

      this.emitter.once("task-available", onSignal);
    });
  }
}

export const taskDispatcher = new TaskDispatcher();
