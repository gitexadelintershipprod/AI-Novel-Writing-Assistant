import { create } from "zustand";

/**
 * Cross-page snapshot of Automatic director tasks for the current novel, so the sidebar
 * and other shells can show whether a run is in progress without each page parsing query.
 * Live details still come from React Query; this store is only a lightweight sync.
 */
export interface DirectorRealtimeSnapshot {
  novelId: string | null;
  workflowTaskId: string | null;
  taskStatus: string | null;
  /** Timestamp (ms) of the last write from the editor page. */
  updatedAt: number;
}

interface DirectorRealtimeStore extends DirectorRealtimeSnapshot {
  setFromAutoDirectorTask: (
    novelId: string,
    task: { id: string; status: string } | null | undefined,
  ) => void;
  reset: () => void;
}

const initial: DirectorRealtimeSnapshot = {
  novelId: null,
  workflowTaskId: null,
  taskStatus: null,
  updatedAt: 0,
};

export const useDirectorRealtimeStore = create<DirectorRealtimeStore>((set) => ({
  ...initial,
  setFromAutoDirectorTask: (novelId, task) =>
    set({
      novelId,
      workflowTaskId: task?.id ?? null,
      taskStatus: task?.status ?? null,
      updatedAt: Date.now(),
    }),
  reset: () => set({ ...initial, updatedAt: Date.now() }),
}));
