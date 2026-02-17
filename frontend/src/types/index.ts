export interface ScriptRequest {
  product_name: string;
  specifications: string;
  image_url: string;
  scene_count?: number;
  ad_tone?: string;
  gemini_model?: string;
  max_dialogue_words_per_scene?: number;
  custom_instructions?: string;
  run_id?: string;
}

export interface AvatarProfile {
  gender: string;
  age_range: string;
  attire: string;
  tone_of_voice: string;
  visual_description: string;
  voice_style?: string;
  ethnicity?: string;
}

export interface Scene {
  scene_number: number;
  duration_seconds: number;
  scene_type: string;
  shot_type: string;
  camera_movement: string;
  lighting: string;
  visual_background: string;
  avatar_action: string;
  avatar_emotion: string;
  product_visual_integration: string;
  script_dialogue: string;
  sound_design: string;
  voice_style?: string;
  detailed_avatar_description?: string;
  negative_elements?: string;
  transition_type?: string;
  transition_duration?: number;
  audio_continuity?: string;
}

export interface VideoScript {
  video_title: string;
  total_duration: number;
  avatar_profile: AvatarProfile;
  scenes: Scene[];
  negative_elements?: string;
  voice_style?: string;
}

export interface ScriptResponse {
  status: string;
  run_id: string;
  product_image_path: string;
  script: VideoScript;
}

export interface ScriptUpdateRequest {
  run_id: string;
  script: VideoScript;
}

export interface ScriptConfig {
  scene_count: { default: number; min: number; max: number };
  ad_tones: string[];
  transition_types: string[];
}

export interface AvatarGenerateOptions {
  num_variants?: number;
  image_model?: string;
  custom_prompt?: string;
  reference_image_url?: string;
  override_ethnicity?: string;
  override_gender?: string;
  override_age_range?: string;
  aspect_ratio?: string;   // '9:16' or '16:9'
  image_size?: string;     // '1K', '2K', '4K'
}

export interface AvatarVariant {
  index: number;
  image_path: string;
}

export interface AvatarResponse {
  status: string;
  run_id: string;
  variants: AvatarVariant[];
}

export interface QCScore {
  score: number;
  reason: string;
}

export interface StoryboardQCReport {
  avatar_validation: QCScore;
  product_validation: QCScore;
  composition_quality?: QCScore;
}

export interface StoryboardResult {
  scene_number: number;
  image_path: string;
  qc_report: StoryboardQCReport;
  regen_attempts: number;
  prompt_used?: string;
}

export interface StoryboardGenerateOptions {
  image_model?: string;
  aspect_ratio?: string;
  qc_threshold?: number;
  max_regen_attempts?: number;
  include_composition_qc?: boolean;
  custom_prompts?: Record<number, string>;
  image_size?: string;     // '1K', '2K', '4K'
}

export interface StoryboardRegenRequest {
  run_id: string;
  scene_number: number;
  scene: Scene;
  image_model?: string;
  aspect_ratio?: string;
  qc_threshold?: number;
  max_regen_attempts?: number;
  include_composition_qc?: boolean;
  custom_prompt?: string;
  image_size?: string;     // '1K', '2K', '4K'
}

export interface VideoQCDimension {
  score: number;
  reasoning: string;
}

export interface VideoQCReport {
  technical_distortion: VideoQCDimension;
  cinematic_imperfections: VideoQCDimension;
  avatar_consistency: VideoQCDimension;
  product_consistency: VideoQCDimension;
  temporal_coherence: VideoQCDimension;
  hand_body_integrity: VideoQCDimension;
  brand_text_accuracy: VideoQCDimension;
  overall_verdict: string;
}

export interface VideoVariant {
  index: number;
  video_path: string;
  qc_report?: VideoQCReport;
}

export interface VideoResult {
  scene_number: number;
  variants: VideoVariant[];
  selected_index: number;
  selected_video_path: string;
  regen_attempts?: number;
  prompt_used?: string;
  qc_rewrite_context?: string;
}

export interface VideoGenerateOptions {
  seed?: number;
  resolution?: string;
  veo_model?: string;
  aspect_ratio?: string;
  duration_seconds?: number;
  num_variants?: number;
  compression_quality?: string;
  qc_threshold?: number;
  max_qc_regen_attempts?: number;
  use_reference_images?: boolean;
  negative_prompt_extra?: string;
  generate_audio?: boolean;
}

export interface VideoRegenRequest {
  run_id: string;
  scene_number: number;
  scene: Scene;
  storyboard_result: StoryboardResult;
  avatar_profile: AvatarProfile;
  seed?: number;
  resolution?: string;
  veo_model?: string;
  aspect_ratio?: string;
  duration_seconds?: number;
  num_variants?: number;
  compression_quality?: string;
  qc_threshold?: number;
  max_qc_regen_attempts?: number;
  use_reference_images?: boolean;
  negative_prompt_extra?: string;
  generate_audio?: boolean;
  previous_qc_report?: VideoQCReport;
}

export interface VideoSelectRequest {
  run_id: string;
  scene_number: number;
  variant_index: number;
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobStep {
  SCRIPT = 'script',
  AVATAR = 'avatar',
  AVATAR_SELECTION = 'avatar_selection',
  STORYBOARD = 'storyboard',
  VIDEO = 'video',
  STITCH = 'stitch',
  REVIEW = 'review',
}

export interface JobProgress {
  current_step: JobStep;
  step_index: number;
  total_steps: number;
  detail: string;
}

export interface Job {
  job_id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  request?: ScriptRequest;
  progress?: JobProgress;
  script?: VideoScript;
  avatar_variants?: AvatarVariant[];
  selected_avatar?: string;
  storyboard_results?: StoryboardResult[];
  video_results?: VideoResult[];
  final_video_path?: string;
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'error' | 'warn' | 'dim';
}

export interface PipelineLog {
  id: number;
  job_id: string;
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes_requested',
}

export interface SSEEvent {
  event: string;
  job_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Input step models
// ---------------------------------------------------------------------------

export interface SampleProduct {
  id: string;
  product_name: string;
  specifications: string;
  image_url: string;
  thumbnail: string;
}

export interface ImageUploadResponse {
  status: string;
  image_url: string;
}

export interface GenerateImageRequest {
  description: string;
}

export interface GenerateImageResponse {
  status: string;
  image_url: string;
}

export interface AnalyzeImageRequest {
  image_url: string;
}

export interface AnalyzeImageResponse {
  status: string;
  product_name: string;
  specifications: string;
}

export interface GeminiModelOption {
  id: string;
  label: string;
  description: string;
}
