import type React from 'react';
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import { AddCircleOutline, ContentCopy } from '@mui/icons-material';
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

  const handleNewGeneration = () => {
    pipeline.reset();
  };

  const handleCopyRunId = () => {
    if (runId) {
      navigator.clipboard.writeText(runId);
    }
  };

  let content: React.ReactNode = null;

  switch (pipeline.activeStep) {
    case 0:
      content = (
        <ProductForm
          onSubmit={pipeline.startPipeline}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      );
      break;

    case 1:
      content = (
        <ScriptEditor
          script={pipeline.script}
          onContinue={pipeline.navigateToAvatarStep}
          onUpdateScript={pipeline.updateScript}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      );
      break;

    case 2:
      content = (
        <AvatarGallery
          variants={pipeline.avatarVariants}
          selectedIndex={pipeline.selectedAvatarIndex}
          onSelect={pipeline.selectAvatar}
          onGenerate={pipeline.generateAvatars}
          onContinue={pipeline.confirmAvatarSelection}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      );
      break;

    case 3:
      content = (
        <StoryboardGrid
          results={pipeline.storyboardResults}
          onContinue={() => pipeline.navigateToVideoStep()}
          onGenerate={(options) => pipeline.generateStoryboard(options)}
          onRegenScene={(sceneNumber, options) => pipeline.regenStoryboardScene(sceneNumber, options)}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      );
      break;

    case 4:
      content = (
        <VideoPlayer
          results={pipeline.videoResults}
          onContinue={() => pipeline.stitchFinalVideo()}
          onGenerate={(options) => pipeline.generateVideos(options)}
          onSelectVariant={pipeline.selectVideoVariant}
          onRegenScene={(sceneNumber, options) => pipeline.regenVideoScene(sceneNumber, options)}
          isLoading={pipeline.isLoading}
          readOnly={isReadOnly}
        />
      );
      break;

    case 5:
      content = pipeline.finalVideoPath && pipeline.script ? (
        <FinalPlayer
          videoPath={pipeline.finalVideoPath}
          scenesCount={pipeline.script.scenes.length}
          totalDuration={pipeline.script.total_duration}
          onSubmitForReview={pipeline.submitForReview}
          isLoading={pipeline.isLoading}
        />
      ) : null;
      break;

    case 6:
      content = pipeline.runId ? (
        <ReviewActions runId={pipeline.runId} />
      ) : null;
      break;

    default:
      content = null;
  }

  return (
    <>
      {/* Run ID banner */}
      {runId && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            px: 2,
            py: 1,
            backgroundColor: 'background.default',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Run:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              {runId}
            </Typography>
            <Tooltip title="Copy Run ID">
              <IconButton size="small" onClick={handleCopyRunId}>
                <ContentCopy sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddCircleOutline />}
            onClick={handleNewGeneration}
            sx={{ textTransform: 'none' }}
          >
            New Generation
          </Button>
        </Box>
      )}

      {content}
    </>
  );
}
