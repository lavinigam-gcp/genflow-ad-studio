import { create } from 'zustand';
import type { Job } from '../types';

interface BulkState {
  jobs: Job[];
  uploadedFile: File | null;
  isProcessing: boolean;

  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  setFile: (file: File | null) => void;
  setProcessing: (processing: boolean) => void;
  reset: () => void;
}

export const useBulkStore = create<BulkState>((set) => ({
  jobs: [],
  uploadedFile: null,
  isProcessing: false,

  setJobs: (jobs) => set({ jobs }),

  addJob: (job) => set((state) => ({ jobs: [...state.jobs, job] })),

  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.job_id === jobId ? { ...j, ...updates } : j)),
    })),

  setFile: (file) => set({ uploadedFile: file }),

  setProcessing: (processing) => set({ isProcessing: processing }),

  reset: () => set({ jobs: [], uploadedFile: null, isProcessing: false }),
}));
