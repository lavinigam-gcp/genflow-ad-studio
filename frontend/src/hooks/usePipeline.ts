import { useCallback } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import * as pipelineApi from '../api/pipeline';
import type {
  ScriptRequest,
  VideoScript,
  AvatarGenerateOptions,
  StoryboardGenerateOptions,
  StoryboardResult,
  VideoGenerateOptions,
  VideoResult,
} from '../types';

/**
 * Open an SSE connection that listens for the named `scene_progress` event.
 * The backend sends named SSE events (with `event: scene_progress`), which
 * require `addEventListener` — `onmessage` only fires for unnamed events.
 */
function openSceneProgressSSE(
  runId: string,
  onSceneResult: (data: Record<string, unknown>) => void,
): EventSource {
  const es = new EventSource(`/api/v1/jobs/${runId}/stream`);
  es.addEventListener('scene_progress', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onSceneResult(data);
    } catch {
      // Ignore parse errors
    }
  });
  // Stream backend logs into the frontend log console
  es.addEventListener('log', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      if (typeof data.message === 'string') {
        const level = (data.level as 'info' | 'success' | 'error' | 'warn' | 'dim') || 'dim';
        usePipelineStore.getState().addLog(data.message, level);
      }
    } catch {
      // Ignore parse errors
    }
  });
  // Suppress connection errors (SSE will auto-reconnect, and we close it
  // when the POST completes anyway)
  es.onerror = () => {};
  return es;
}

export function usePipeline() {
  const store = usePipelineStore();

  const startPipeline = useCallback(
    async (request: ScriptRequest) => {
      // Navigate to script step immediately so user sees loading state there
      store.setStep(1);
      store.setLoading(true);
      store.setError(null);
      // Store the original request so ProductForm can show it on resume
      usePipelineStore.setState({ originalRequest: request });
      store.addLog(`Starting script generation (model: ${request.gemini_model || 'gemini-3-flash-preview'})...`, 'info');

      // Pre-generate run_id so we can open SSE log channel before the POST
      const preRunId = request.run_id || Math.random().toString(36).slice(2, 14);
      const requestWithRunId = { ...request, run_id: preRunId };
      store.setRunId(preRunId);
      const es = openSceneProgressSSE(preRunId, () => {});

      try {
        const t0 = Date.now();
        const response = await pipelineApi.generateScript(requestWithRunId);
        store.setRunId(response.run_id);
        store.setScript(response.script);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        store.addLog(`Script generated in ${elapsed}s`, 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate script';
        store.setError(message);
        store.addLog(message, 'error');
        // Navigate back to input step on error so user can retry
        store.setStep(0);
      } finally {
        es.close();
        store.setLoading(false);
      }
    },
    [store]
  );

  const navigateToAvatarStep = useCallback(() => {
    store.setStep(2);
  }, [store]);

  const generateAvatars = useCallback(async (options?: AvatarGenerateOptions) => {
    const { runId, script, aspectRatio } = usePipelineStore.getState();
    if (!runId || !script) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog('Generating avatar variants...', 'info');

    const es = openSceneProgressSSE(runId, () => {});
    try {
      const response = await pipelineApi.generateAvatars(
        runId,
        script.avatar_profile,
        { ...options, aspect_ratio: aspectRatio },
      );
      // Append cache-buster so browser doesn't show stale images
      const cacheBust = Date.now();
      const variants = response.variants.map((v) => ({
        ...v,
        image_path: `${v.image_path}?t=${cacheBust}`,
      }));
      store.setAvatars(variants);
      store.addLog(`Generated ${response.variants.length} avatar variants`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate avatars';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      es.close();
      store.setLoading(false);
    }
  }, [store]);

  const confirmAvatarSelection = useCallback(async () => {
    const { runId, selectedAvatarIndex } = usePipelineStore.getState();
    if (!runId || selectedAvatarIndex === null) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog(`Selecting avatar variant ${selectedAvatarIndex}...`, 'info');

    try {
      await pipelineApi.selectAvatar(runId, selectedAvatarIndex);
      store.setStep(3);
      store.addLog('Avatar selected — configure storyboard settings and click Generate', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select avatar';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const generateStoryboard = useCallback(async (options?: StoryboardGenerateOptions) => {
    const { runId, script, aspectRatio } = usePipelineStore.getState();
    if (!runId || !script) return;
    store.setLoading(true);
    store.setError(null);
    store.setStoryboard([]); // Clear previous results for progressive loading
    store.addLog(`Generating storyboard with QC for ${script.scenes.length} scenes...`, 'info');

    // Open SSE side-channel for progressive scene updates
    const es = openSceneProgressSSE(runId, (data) => {
      if (data.result) {
        const result = data.result as unknown as StoryboardResult;
        const cacheBust = Date.now();
        usePipelineStore.getState().addOrUpdateStoryboardScene({
          ...result,
          image_path: `${result.image_path}?t=${cacheBust}`,
        });
      }
    });

    try {
      const t0 = Date.now();
      const sbResponse = await pipelineApi.generateStoryboard(runId, script.scenes, { ...options, aspect_ratio: aspectRatio });
      store.setStoryboard(sbResponse.results);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      store.addLog(
        `Storyboard generated: ${sbResponse.results.length} scenes in ${elapsed}s`,
        'success',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate storyboard';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      es.close();
      store.setLoading(false);
    }
  }, [store]);

  const regenStoryboardScene = useCallback(async (
    sceneNumber: number,
    options?: Omit<StoryboardGenerateOptions, 'custom_prompts'> & { custom_prompt?: string },
  ) => {
    const { runId, script } = usePipelineStore.getState();
    if (!runId || !script) return;
    const scene = script.scenes.find((s) => s.scene_number === sceneNumber);
    if (!scene) return;
    store.setError(null);
    store.addLog(`Regenerating storyboard for scene ${sceneNumber}...`, 'info');

    const es = openSceneProgressSSE(runId, () => {});
    try {
      const result = await pipelineApi.regenStoryboardScene(runId, sceneNumber, scene, options);
      // Cache-bust the image path
      const cacheBust = Date.now();
      const updatedResult = { ...result, image_path: `${result.image_path}?t=${cacheBust}` };
      store.updateStoryboardScene(sceneNumber, updatedResult);
      store.addLog(`Scene ${sceneNumber} storyboard regenerated`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to regen scene ${sceneNumber}`;
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      es.close();
    }
  }, [store]);

  const navigateToVideoStep = useCallback(() => {
    store.setStep(4);
  }, [store]);

  const generateVideos = useCallback(async (options?: VideoGenerateOptions) => {
    const { runId, storyboardResults, script, aspectRatio } = usePipelineStore.getState();
    if (!runId || !script || storyboardResults.length === 0) return;
    store.setLoading(true);
    store.setError(null);
    store.setVideos([]); // Clear previous results for progressive loading
    store.addLog(`Generating video variants with Veo 3.1 for ${storyboardResults.length} scenes...`, 'info');

    // Open SSE side-channel for progressive scene updates
    const es = openSceneProgressSSE(runId, (data) => {
      if (data.result) {
        const result = data.result as unknown as VideoResult;
        usePipelineStore.getState().addOrUpdateVideoScene(result);
      }
    });

    try {
      const t0 = Date.now();
      const response = await pipelineApi.generateVideo(
        runId,
        storyboardResults,
        script.scenes,
        script.avatar_profile,
        { ...options, aspect_ratio: aspectRatio },
      );
      store.setVideos(response.results);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      store.addLog(`Videos generated for ${response.results.length} scenes in ${elapsed}s`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate videos';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      es.close();
      store.setLoading(false);
    }
  }, [store]);

  const regenVideoScene = useCallback(async (
    sceneNumber: number,
    options?: VideoGenerateOptions,
  ) => {
    const { runId, script, storyboardResults, videoResults } = usePipelineStore.getState();
    if (!runId || !script) return;
    const scene = script.scenes.find((s) => s.scene_number === sceneNumber);
    const sbResult = storyboardResults.find((r) => r.scene_number === sceneNumber);
    if (!scene || !sbResult) return;
    store.setError(null);

    // Extract QC report from current selected variant to inform the regen
    const currentResult = videoResults.find((r) => r.scene_number === sceneNumber);
    const selectedVariant = currentResult?.variants.find(
      (v) => v.index === currentResult.selected_index,
    );
    const previousQcReport = selectedVariant?.qc_report ?? undefined;

    store.addLog(
      `Regenerating video for scene ${sceneNumber}${previousQcReport ? ' (with QC feedback)' : ''}...`,
      'info',
    );

    const es = openSceneProgressSSE(runId, () => {});
    try {
      const response = await pipelineApi.regenVideoScene(
        runId,
        sceneNumber,
        scene,
        sbResult,
        script.avatar_profile,
        options,
        previousQcReport,
      );
      store.updateVideoScene(sceneNumber, response.result);
      store.addLog(`Scene ${sceneNumber} video regenerated`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to regen video scene ${sceneNumber}`;
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      es.close();
    }
  }, [store]);

  const stitchFinalVideo = useCallback(async () => {
    const { runId, script: currentScript } = usePipelineStore.getState();
    if (!runId) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog(`Stitching ${currentScript?.scenes.length || '?'} scenes into final video with FFmpeg...`, 'info');

    // Extract per-scene transitions from script (all scenes except the last)
    const transitions = currentScript?.scenes
      .slice(0, -1)
      .map((s) => ({
        transition_type: s.transition_type ?? 'cut',
        transition_duration: s.transition_duration ?? 0.5,
      }));

    const es = openSceneProgressSSE(runId, () => {});
    try {
      const t0 = Date.now();
      const response = await pipelineApi.stitchVideo(runId, transitions);
      store.setFinalVideo(response.path);
      store.setStep(5);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      store.addLog(`Final video ready in ${elapsed}s`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stitch video';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      es.close();
      store.setLoading(false);
    }
  }, [store]);

  const updateScript = useCallback(async (script: VideoScript) => {
    const { runId } = usePipelineStore.getState();
    if (!runId) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog('Saving script changes...', 'info');

    try {
      const response = await pipelineApi.updateScript(runId, script);
      store.setScript(response.script);
      store.addLog('Script updated successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update script';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const selectVideoVariant = useCallback(
    async (sceneNumber: number, variantIndex: number) => {
      const { runId } = usePipelineStore.getState();
      if (!runId) return;
      store.setLoading(true);
      store.setError(null);

      try {
        const response = await pipelineApi.selectVideoVariant(
          runId,
          sceneNumber,
          variantIndex,
        );
        store.selectVideoVariant(sceneNumber, variantIndex, response.selected_video_path);
        store.addLog(
          `Scene ${sceneNumber}: selected variant ${variantIndex + 1}`,
          'success',
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to select video variant';
        store.setError(message);
        store.addLog(message, 'error');
      } finally {
        store.setLoading(false);
      }
    },
    [store],
  );

  const submitForReview = useCallback(async () => {
    if (!store.runId) return;
    store.setStep(6);
    store.addLog('Submitted for review', 'info');
  }, [store]);

  const loadJob = useCallback(async (jobId: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      const job = await pipelineApi.getJob(jobId);
      store.loadJob(job);
      store.addLog(`Loaded run ${jobId}`, 'info');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  return {
    ...store,
    startPipeline,
    updateScript,
    navigateToAvatarStep,
    generateAvatars,
    confirmAvatarSelection,
    generateStoryboard,
    regenStoryboardScene,
    navigateToVideoStep,
    generateVideos,
    regenVideoScene,
    selectVideoVariant,
    stitchFinalVideo,
    submitForReview,
    loadJob,
  };
}
