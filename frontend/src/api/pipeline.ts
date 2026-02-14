import { api } from './client';
import type {
  ScriptRequest,
  ScriptResponse,
  AvatarProfile,
  AvatarResponse,
  Scene,
  StoryboardResult,
  VideoResult,
  Job,
  VideoScript,
  ScriptConfig,
  ImageUploadResponse,
  GenerateImageResponse,
  AnalyzeImageResponse,
  SampleProduct,
  PipelineLog,
} from '../types';

export async function generateScript(request: ScriptRequest): Promise<ScriptResponse> {
  return api.post<ScriptResponse>('/pipeline/script', request);
}

export async function updateScript(
  runId: string,
  script: VideoScript,
): Promise<ScriptResponse> {
  return api.post<ScriptResponse>('/pipeline/script/update', {
    run_id: runId,
    script,
  });
}

export async function getScriptConfig(): Promise<ScriptConfig> {
  return api.post<ScriptConfig>('/config/script');
}

export async function generateAvatars(
  runId: string,
  avatarProfile: AvatarProfile,
): Promise<AvatarResponse> {
  return api.post<AvatarResponse>('/pipeline/avatar', {
    run_id: runId,
    avatar_profile: avatarProfile,
  });
}

export async function selectAvatar(
  runId: string,
  variantIndex: number,
): Promise<{ status: string; selected_path: string }> {
  return api.post<{ status: string; selected_path: string }>(
    '/pipeline/avatar/select',
    { run_id: runId, variant_index: variantIndex },
  );
}

export async function generateStoryboard(
  runId: string,
  scenes: Scene[],
): Promise<{ status: string; results: StoryboardResult[] }> {
  return api.post<{ status: string; results: StoryboardResult[] }>(
    '/pipeline/storyboard',
    { run_id: runId, scenes },
  );
}

export async function generateVideo(
  runId: string,
  scenesData: StoryboardResult[],
  scriptScenes: Scene[],
  avatarProfile: AvatarProfile,
): Promise<{ status: string; results: VideoResult[] }> {
  return api.post<{ status: string; results: VideoResult[] }>(
    '/pipeline/video',
    {
      run_id: runId,
      scenes_data: scenesData,
      script_scenes: scriptScenes,
      avatar_profile: avatarProfile,
    },
  );
}

export async function selectVideoVariant(
  runId: string,
  sceneNumber: number,
  variantIndex: number,
): Promise<{ status: string; selected_video_path: string }> {
  return api.post<{ status: string; selected_video_path: string }>(
    '/pipeline/video/select',
    { run_id: runId, scene_number: sceneNumber, variant_index: variantIndex },
  );
}

export async function stitchVideo(
  runId: string,
): Promise<{ status: string; path: string }> {
  return api.post<{ status: string; path: string }>(
    `/pipeline/stitch?run_id=${encodeURIComponent(runId)}`,
  );
}

export async function getJob(jobId: string): Promise<Job> {
  return api.get<Job>(`/jobs/${jobId}`);
}

export async function listJobs(): Promise<Job[]> {
  return api.get<Job[]>('/jobs');
}

export async function submitReview(
  runId: string,
  action: 'approved' | 'rejected' | 'changes_requested',
  notes?: string,
): Promise<{ status: string }> {
  return api.post<{ status: string }>(`/review/${runId}/decision`, {
    status: action,
    notes,
  });
}

// ---------------------------------------------------------------------------
// Input step API
// ---------------------------------------------------------------------------

export async function uploadImage(file: File): Promise<ImageUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return api.upload<ImageUploadResponse>('/input/upload-image', formData);
}

export async function generateProductImage(
  description: string,
): Promise<GenerateImageResponse> {
  return api.post<GenerateImageResponse>('/input/generate-image', { description });
}

export async function analyzeImage(
  imageUrl: string,
): Promise<AnalyzeImageResponse> {
  return api.post<AnalyzeImageResponse>('/input/analyze-image', { image_url: imageUrl });
}

export async function listSamples(): Promise<{ samples: SampleProduct[] }> {
  return api.post<{ samples: SampleProduct[] }>('/input/samples');
}

export async function listLogs(jobId: string): Promise<{ logs: PipelineLog[] }> {
  return api.post<{ logs: PipelineLog[] }>('/logs/list', { job_id: jobId });
}
