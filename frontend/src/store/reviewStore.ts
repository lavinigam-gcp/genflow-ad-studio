import { create } from 'zustand';
import type { Job } from '../types';

interface ReviewState {
  pendingReviews: Job[];
  currentReview: Job | null;

  setReviews: (reviews: Job[]) => void;
  setCurrentReview: (review: Job | null) => void;
  removeReview: (jobId: string) => void;
  reset: () => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  pendingReviews: [],
  currentReview: null,

  setReviews: (reviews) => set({ pendingReviews: reviews }),

  setCurrentReview: (review) => set({ currentReview: review }),

  removeReview: (jobId) =>
    set((state) => ({
      pendingReviews: state.pendingReviews.filter((r) => r.job_id !== jobId),
      currentReview: state.currentReview?.job_id === jobId ? null : state.currentReview,
    })),

  reset: () => set({ pendingReviews: [], currentReview: null }),
}));
