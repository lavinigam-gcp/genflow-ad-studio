import { useCallback } from 'react';
import { usePipelineStore } from '../store/pipelineStore';
import * as pipelineApi from '../api/pipeline';
import type { ScriptRequest, VideoScript } from '../types';

export function usePipeline() {
  const store = usePipelineStore();

  const startPipeline = useCallback(
    async (request: ScriptRequest) => {
      store.setLoading(true);
      store.setError(null);
      store.addLog(`Starting pipeline for "${request.product_name}"`, 'info');

      try {
        const response = await pipelineApi.generateScript(request);
        store.setRunId(response.run_id);
        store.setScript(response.script);
        store.setStep(1);
        store.addLog('Script generated successfully', 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate script';
        store.setError(message);
        store.addLog(message, 'error');
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  const generateAvatars = useCallback(async () => {
    const { runId, script } = usePipelineStore.getState();
    if (!runId || !script) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog('Generating avatar variants...', 'info');

    try {
      const response = await pipelineApi.generateAvatars(
        runId,
        script.avatar_profile,
      );
      store.setAvatars(response.variants);
      store.setStep(2);
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
    const { runId, selectedAvatarIndex } = usePipelineStore.getState();
    if (!runId || selectedAvatarIndex === null) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog(`Selecting avatar variant ${selectedAvatarIndex}`, 'info');

    try {
      await pipelineApi.selectAvatar(runId, selectedAvatarIndex);
      store.setStep(3);
      store.addLog('Avatar selected, generating storyboard...', 'success');

      // Auto-start storyboard generation after avatar selection
      const { script } = usePipelineStore.getState();
      if (script) {
        store.addLog('Generating storyboard with QC...', 'info');
        const sbResponse = await pipelineApi.generateStoryboard(runId, script.scenes);
        store.setStoryboard(sbResponse.results);
        store.addLog(
          `Storyboard generated: ${sbResponse.results.length} scenes`,
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
    const { runId, storyboardResults, script } = usePipelineStore.getState();
    if (!runId || !script || storyboardResults.length === 0) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog('Generating video variants with Veo 3.1...', 'info');

    try {
      const response = await pipelineApi.generateVideo(
        runId,
        storyboardResults,
        script.scenes,
        script.avatar_profile,
      );
      store.setVideos(response.results);
      store.setStep(4);
      store.addLog(`Videos generated for ${response.results.length} scenes`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate videos';
      store.setError(message);
      store.addLog(message, 'error');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const stitchFinalVideo = useCallback(async () => {
    const { runId } = usePipelineStore.getState();
    if (!runId) return;
    store.setLoading(true);
    store.setError(null);
    store.addLog('Stitching final video with FFmpeg...', 'info');

    try {
      const response = await pipelineApi.stitchVideo(runId);
      store.setFinalVideo(response.path);
      store.setStep(5);
      store.addLog('Final video ready', 'success');
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

  return {
    ...store,
    startPipeline,
    updateScript,
    generateAvatars,
    confirmAvatarSelection,
    generateVideos,
    selectVideoVariant,
    stitchFinalVideo,
    submitForReview,
  };
}
