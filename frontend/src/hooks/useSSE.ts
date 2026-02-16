import { useEffect, useRef, useCallback } from 'react';
import { createSSEConnection } from '../api/sse';
import { usePipelineStore } from '../store/pipelineStore';
import type { SSEEvent } from '../types';

export function useSSE(jobId: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const addLog = usePipelineStore((s) => s.addLog);
  const setStep = usePipelineStore((s) => s.setStep);
  const setScript = usePipelineStore((s) => s.setScript);
  const setAvatars = usePipelineStore((s) => s.setAvatars);
  const setStoryboard = usePipelineStore((s) => s.setStoryboard);
  const setVideos = usePipelineStore((s) => s.setVideos);
  const setFinalVideo = usePipelineStore((s) => s.setFinalVideo);
  const setError = usePipelineStore((s) => s.setError);
  const addOrUpdateStoryboardScene = usePipelineStore((s) => s.addOrUpdateStoryboardScene);
  const addOrUpdateVideoScene = usePipelineStore((s) => s.addOrUpdateVideoScene);

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.event) {
        case 'step_update':
          if (typeof event.data.step_index === 'number') {
            setStep(event.data.step_index as number);
          }
          if (typeof event.data.detail === 'string') {
            addLog(event.data.detail as string, 'info');
          }
          break;

        case 'script_ready':
          if (event.data.script) {
            setScript(event.data.script as Parameters<typeof setScript>[0]);
          }
          addLog('Script generated successfully', 'success');
          break;

        case 'avatars_ready':
          if (event.data.variants) {
            setAvatars(event.data.variants as Parameters<typeof setAvatars>[0]);
          }
          addLog('Avatar variants generated', 'success');
          break;

        case 'scene_progress':
          if (event.data.result) {
            const sceneResult = event.data.result as Record<string, unknown>;
            if ('image_path' in sceneResult) {
              addOrUpdateStoryboardScene(sceneResult as unknown as Parameters<typeof addOrUpdateStoryboardScene>[0]);
            } else if ('variants' in sceneResult) {
              addOrUpdateVideoScene(sceneResult as unknown as Parameters<typeof addOrUpdateVideoScene>[0]);
            }
            addLog(`Scene ${event.data.scene_number} completed`, 'info');
          }
          break;

        case 'storyboard_ready':
          if (event.data.results) {
            setStoryboard(event.data.results as Parameters<typeof setStoryboard>[0]);
          }
          addLog('Storyboard generation complete', 'success');
          break;

        case 'video_ready':
          if (event.data.results) {
            setVideos(event.data.results as Parameters<typeof setVideos>[0]);
          }
          addLog('Video generation complete', 'success');
          break;

        case 'stitch_ready':
          if (typeof event.data.final_video_path === 'string') {
            setFinalVideo(event.data.final_video_path as string);
          }
          addLog('Final video stitched', 'success');
          break;

        case 'error':
          if (typeof event.data.message === 'string') {
            setError(event.data.message as string);
            addLog(event.data.message as string, 'error');
          }
          break;

        case 'log':
          if (typeof event.data.message === 'string') {
            addLog(
              event.data.message as string,
              (event.data.level as 'info' | 'success' | 'error' | 'warn' | 'dim') || 'info'
            );
          }
          break;

        default:
          if (typeof event.data.detail === 'string') {
            addLog(event.data.detail as string, 'dim');
          }
      }
    },
    [addLog, setStep, setScript, setAvatars, setStoryboard, setVideos, setFinalVideo, setError, addOrUpdateStoryboardScene, addOrUpdateVideoScene]
  );

  useEffect(() => {
    if (!jobId) return;

    esRef.current = createSSEConnection(
      jobId,
      handleEvent,
      () => {
        addLog('SSE connection error - retrying...', 'warn');
      }
    );

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [jobId, handleEvent, addLog]);

  const disconnect = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  return { disconnect };
}
