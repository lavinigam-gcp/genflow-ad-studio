import ProductForm from './ProductForm';
import ScriptEditor from './ScriptEditor';
import AvatarGallery from './AvatarGallery';
import StoryboardGrid from './StoryboardGrid';
import VideoPlayer from './VideoPlayer';
import FinalPlayer from './FinalPlayer';
import ReviewActions from '../review/ReviewActions';
import { usePipeline } from '../../hooks/usePipeline';

export default function PipelineView() {
  const pipeline = usePipeline();

  /* Navigation / Read-Only Logic 
   * A step is read-only if we have progressed past it or if I am viewing a previous step.
   * Actually, `MainLayout` handles the "visual" state, but `PipelineView` needs to handle the "interactive" state.
   * If `activeStep` (viewing) < `maxStep` (derived), strictly speaking we are in read-only mode for that step?
   * BUT `PipelineView` doesn't know `maxStep` easily unless we pass it or derive it again.
   * Let's derive it again or use the store directly if needed, but `usePipeline` hook might have it?
   * `usePipeline` returns state.
   * Let's replicate the logic:
   */
  const {
    runId,
    script,
    avatarVariants,
    storyboardResults,
    videoResults,
    finalVideoPath
  } = pipeline;

  const getReadOnlyStatus = (step: number) => {
    switch (step) {
      case 0: return !!runId;
      case 1: return avatarVariants.length > 0;
      case 2: return storyboardResults.length > 0;
      case 3: return videoResults.length > 0;
      case 4: return !!finalVideoPath;
      default: return false;
    }
  };

  const isReadOnly = getReadOnlyStatus(pipeline.activeStep);

  switch (pipeline.activeStep) {
    case 0:
      return (
        <ProductForm
          onSubmit={pipeline.startPipeline}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      );

    case 1:
      return pipeline.script ? (
        <ScriptEditor
          script={pipeline.script}
          onContinue={pipeline.generateAvatars}
          onUpdateScript={pipeline.updateScript}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      ) : null;

    case 2:
      return (
        <AvatarGallery
          variants={pipeline.avatarVariants}
          selectedIndex={pipeline.selectedAvatarIndex}
          onSelect={pipeline.selectAvatar}
          onRegenerate={pipeline.generateAvatars}
          onContinue={pipeline.confirmAvatarSelection}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      );

    case 3:
      return (
        <StoryboardGrid
          results={pipeline.storyboardResults}
          onContinue={pipeline.generateVideos}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      );

    case 4:
      return (
        <VideoPlayer
          results={pipeline.videoResults}
          onContinue={pipeline.stitchFinalVideo}
          onSelectVariant={pipeline.selectVideoVariant}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      );

    case 5:
      return pipeline.finalVideoPath && pipeline.script ? (
        <FinalPlayer
          videoPath={pipeline.finalVideoPath}
          scenesCount={pipeline.script.scenes.length}
          totalDuration={pipeline.script.total_duration}
          onSubmitForReview={pipeline.submitForReview}
          isLoading={pipeline.isLoading}
        />
      ) : null;

    case 6:
      return pipeline.runId ? (
        <ReviewActions runId={pipeline.runId} />
      ) : null;

    default:
      return null;
  }
}
