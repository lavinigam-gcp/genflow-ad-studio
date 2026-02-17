import type { GeminiModelOption } from '../types';

// ─── Ad Tones ───────────────────────────────────────────────
export const AD_TONES = ['energetic', 'sophisticated', 'playful', 'authoritative', 'warm'];

// ─── Gemini Models (Script Generation) ──────────────────────
export const GEMINI_MODELS: GeminiModelOption[] = [
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', description: 'Premium quality' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', description: 'Fast & capable (default)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Stable' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fastest' },
];

// ─── Ethnicities ────────────────────────────────────────────
export const ETHNICITIES = [
  '', 'South Asian', 'East Asian', 'Southeast Asian', 'Black', 'White',
  'Latino', 'Middle Eastern', 'Mixed',
];

// ─── Age Ranges ─────────────────────────────────────────────
export const AGE_RANGES = ['18-25', '25-35', '35-45', '45-55', '55+'];

// ─── Veo Models (Video Generation) ──────────────────────────
export const VEO_MODELS = [
  { id: 'veo-3.1-generate-preview', label: 'Veo 3.1 Preview', description: 'Standard — Best quality' },
  { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast Preview', description: 'Faster generation' },
];

// ─── Image Resolutions ──────────────────────────────────────
export const IMAGE_RESOLUTIONS = ['1K', '2K', '4K'] as const;

// ─── Defaults ───────────────────────────────────────────────
export const DEFAULT_IMAGE_RESOLUTION = '2K';
export const DEFAULT_STORYBOARD_QC_THRESHOLD = 60;
export const DEFAULT_MAX_REGEN_ATTEMPTS = 3;
export const DEFAULT_VIDEO_QC_THRESHOLD = 3;
export const DEFAULT_MAX_VIDEO_QC_REGEN = 2;
export const DEFAULT_NUM_VIDEO_VARIANTS = 1;
export const DEFAULT_NUM_AVATAR_VARIANTS = 2;
