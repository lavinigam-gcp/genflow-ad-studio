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

  switch (pipeline.activeStep) {
    case 0:
      return (
        <ProductForm
          onSubmit={pipeline.startPipeline}
          isLoading={pipeline.isLoading}
        />
      );

    case 1:
      return pipeline.script ? (
        <ScriptEditor
          script={pipeline.script}
          onContinue={pipeline.generateAvatars}
          onUpdateScript={pipeline.updateScript}
          isLoading={pipeline.isLoading}
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
        />
      );

    case 3:
      return (
        <StoryboardGrid
          results={pipeline.storyboardResults}
          onContinue={pipeline.generateVideos}
          isLoading={pipeline.isLoading}
        />
      );

    case 4:
      return (
        <VideoPlayer
          results={pipeline.videoResults}
          onContinue={pipeline.stitchFinalVideo}
          onSelectVariant={pipeline.selectVideoVariant}
          isLoading={pipeline.isLoading}
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
