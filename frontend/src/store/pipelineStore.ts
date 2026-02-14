import { create } from 'zustand';
import type {
  Job,
  VideoScript,
  AvatarVariant,
  StoryboardResult,
  VideoResult,
  LogEntry,
} from '../types';

interface PipelineState {
  activeStep: number;
  runId: string | null;
  script: VideoScript | null;
  avatarVariants: AvatarVariant[];
  selectedAvatarIndex: number | null;
  storyboardResults: StoryboardResult[];
  videoResults: VideoResult[];
  finalVideoPath: string | null;
  logs: LogEntry[];
  isLoading: boolean;
  error: string | null;

  setStep: (step: number) => void;
  setRunId: (runId: string) => void;
  setScript: (script: VideoScript) => void;
  setAvatars: (variants: AvatarVariant[]) => void;
  selectAvatar: (index: number) => void;
  setStoryboard: (results: StoryboardResult[]) => void;
  setVideos: (results: VideoResult[]) => void;
  selectVideoVariant: (sceneNumber: number, variantIndex: number, selectedPath: string) => void;
  setFinalVideo: (path: string) => void;
  addLog: (message: string, level: LogEntry['level']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadJob: (job: Job) => void;
  reset: () => void;
}

const initialState = {
  activeStep: 0,
  runId: null,
  script: null,
  avatarVariants: [],
  selectedAvatarIndex: null,
  storyboardResults: [],
  videoResults: [],
  finalVideoPath: null,
  logs: [],
  isLoading: false,
  error: null,
};

export const usePipelineStore = create<PipelineState>((set) => ({
  ...initialState,

  setStep: (step) => set({ activeStep: step }),

  setRunId: (runId) => set({ runId }),

  setScript: (script) => set({ script }),

  setAvatars: (variants) => set({ avatarVariants: variants }),

  selectAvatar: (index) => set({ selectedAvatarIndex: index }),

  setStoryboard: (results) => set({ storyboardResults: results }),

  setVideos: (results) => set({ videoResults: results }),

  selectVideoVariant: (sceneNumber, variantIndex, selectedPath) =>
    set((state) => ({
      videoResults: state.videoResults.map((r) =>
        r.scene_number === sceneNumber
          ? { ...r, selected_index: variantIndex, selected_video_path: selectedPath }
          : r,
      ),
    })),

  setFinalVideo: (path) => set({ finalVideoPath: path }),

  addLog: (message, level) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          timestamp: new Date().toISOString(),
          message,
          level,
        },
      ],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  loadJob: (job) => {
    // Compute the furthest step with data
    let step = 0;
    if (job.script) step = 1;
    if (job.avatar_variants && job.avatar_variants.length > 0) step = 2;
    if (job.storyboard_results && job.storyboard_results.length > 0) step = 3;
    if (job.video_results && job.video_results.length > 0) step = 4;
    if (job.final_video_path) step = 5;

    set({
      runId: job.job_id,
      script: job.script ?? null,
      avatarVariants: job.avatar_variants ?? [],
      selectedAvatarIndex: null,
      storyboardResults: job.storyboard_results ?? [],
      videoResults: job.video_results ?? [],
      finalVideoPath: job.final_video_path ?? null,
      activeStep: step,
      logs: [],
      isLoading: false,
      error: null,
    });
  },

  reset: () => set(initialState),
}));
