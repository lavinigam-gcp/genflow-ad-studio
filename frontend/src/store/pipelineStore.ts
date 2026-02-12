import { create } from 'zustand';
import type {
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

  reset: () => set(initialState),
}));
