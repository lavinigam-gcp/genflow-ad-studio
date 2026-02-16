import { useCallback } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import * as pipelineApi from '../api/pipeline';
import type { ScriptRequest, VideoScript, AvatarGenerateOptions } from '../types';

export function usePipeline() {
  const store = usePipelineStore();

  const startPipeline = useCallback(
    async (request: ScriptRequest) => {
      // Navigate to script step immediately so user sees loading state there
      store.setStep(1);
      store.setLoading(true);
      store.setError(null);
      store.addLog(`Starting script generation (model: ${request.gemini_model || 'gemini-3-flash-preview'})...`, 'info');

      try {
        const t0 = Date.now();
        const response = await pipelineApi.generateScript(request);
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
        store.setLoading(false);
      }
    },
    [store]
  );

  const navigateToAvatarStep = useCallback(() => {
    store.setStep(2);
  }, [store]);

  const generateAvatars = useCallback(async (options?: AvatarGenerateOptions) => {
    const { runId, script } = usePipelineStore.getState();
    if (!runId || !script) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog('Generating avatar variants...', 'info');

    try {
      const response = await pipelineApi.generateAvatars(
        runId,
        script.avatar_profile,
        options,
      );
      store.setAvatars(response.variants);
      store.addLog(`Generated ${response.variants.length} avatar variants`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate avatars';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const confirmAvatarSelection = useCallback(async () => {
    const { runId, selectedAvatarIndex, script: currentScript } = usePipelineStore.getState();
    if (!runId || selectedAvatarIndex === null) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog(`Selecting avatar variant ${selectedAvatarIndex}${currentScript ? `, preparing ${currentScript.scenes.length} scene storyboard` : ''}`, 'info');

    try {
      await pipelineApi.selectAvatar(runId, selectedAvatarIndex);
      store.setStep(3);
      store.addLog('Avatar selected, generating storyboard...', 'success');

      const { script } = usePipelineStore.getState();
      if (script) {
        store.addLog('Generating storyboard with QC...', 'info');
        const t0 = Date.now();
        const sbResponse = await pipelineApi.generateStoryboard(runId, script.scenes);
        store.setStoryboard(sbResponse.results);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        store.addLog(
          `Storyboard generated: ${sbResponse.results.length} scenes in ${elapsed}s`,
          'success',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed during avatar/storyboard step';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const generateVideos = useCallback(async () => {
    const { runId, storyboardResults, script, veoSeed, veoResolution } = usePipelineStore.getState();
    if (!runId || !script || storyboardResults.length === 0) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog(`Generating video variants with Veo 3.1 for ${storyboardResults.length} scenes...`, 'info');

    try {
      const t0 = Date.now();
      const response = await pipelineApi.generateVideo(
        runId,
        storyboardResults,
        script.scenes,
        script.avatar_profile,
        veoSeed,
        veoResolution,
      );
      store.setVideos(response.results);
      store.setStep(4);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      store.addLog(`Videos generated for ${response.results.length} scenes in ${elapsed}s`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate videos';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      store.setLoading(false);
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
    generateVideos,
    selectVideoVariant,
    stitchFinalVideo,
    submitForReview,
    loadJob,
  };
}
