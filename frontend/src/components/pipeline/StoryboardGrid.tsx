import { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  Box,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Checkbox,
  FormControlLabel,
  TextField,
  IconButton,
  Tooltip,
  Skeleton,
  Dialog,
  Collapse,
  CircularProgress,
} from '@mui/material';
import { ArrowForward, Refresh, ZoomIn, Close, ExpandMore, ExpandLess } from '@mui/icons-material';
import QCBadge from '../qc/QCBadge';
import QCDetailPanel from '../qc/QCDetailPanel';
import type { StoryboardResult, StoryboardGenerateOptions } from '../../types';
import { usePipelineStore } from '../../store/pipelineStore';
import ModelBadge from '../common/ModelBadge';
import { DEFAULT_IMAGE_RESOLUTION, DEFAULT_STORYBOARD_QC_THRESHOLD, DEFAULT_MAX_REGEN_ATTEMPTS } from '../../constants/controls';

interface StoryboardGridProps {
  results: StoryboardResult[];
  onContinue: () => void;
  onGenerate: (options?: StoryboardGenerateOptions) => void;
  onRegenScene: (sceneNumber: number, options?: Omit<StoryboardGenerateOptions, 'custom_prompts'> & { custom_prompt?: string }) => Promise<void>;
  isLoading: boolean;
  readOnly?: boolean;
  totalScenes?: number;
}


export default function StoryboardGrid({
  results,
  onContinue,
  onGenerate,
  onRegenScene,
  isLoading,
  readOnly = false,
  totalScenes,
}: StoryboardGridProps) {
  const aspectRatio = usePipelineStore((s) => s.aspectRatio);
  const [imageResolution, setImageResolution] = useState(DEFAULT_IMAGE_RESOLUTION);
  const [qcThreshold, setQcThreshold] = useState(DEFAULT_STORYBOARD_QC_THRESHOLD);
  const [maxRegenAttempts, setMaxRegenAttempts] = useState(DEFAULT_MAX_REGEN_ATTEMPTS);
  const [includeCompositionQc, setIncludeCompositionQc] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customPrompts, setCustomPrompts] = useState<Record<number, string>>({});
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({});
  const [regenLoading, setRegenLoading] = useState<Record<number, boolean>>({});

  const hasResults = results.length > 0;

  const avgAvatarScore =
    hasResults
      ? Math.round(
          results.reduce((sum, r) => sum + r.qc_report.avatar_validation.score, 0) /
            results.length
        )
      : 0;
  const avgProductScore =
    hasResults
      ? Math.round(
          results.reduce((sum, r) => sum + r.qc_report.product_validation.score, 0) /
            results.length
        )
      : 0;

  const buildOptions = (): StoryboardGenerateOptions => ({
    aspect_ratio: usePipelineStore.getState().aspectRatio,
    image_size: imageResolution,
    qc_threshold: qcThreshold,
    max_regen_attempts: maxRegenAttempts,
    include_composition_qc: includeCompositionQc,
  });

  const handleGenerate = () => {
    onGenerate(buildOptions());
  };

  const handleRegenScene = async (sceneNumber: number) => {
    const { custom_prompts: _, ...rest } = buildOptions();
    const prompt = customPrompts[sceneNumber]?.trim();
    setRegenLoading((prev) => ({ ...prev, [sceneNumber]: true }));
    try {
      await onRegenScene(sceneNumber, { ...rest, ...(prompt ? { custom_prompt: prompt } : {}) });
    } finally {
      setRegenLoading((prev) => ({ ...prev, [sceneNumber]: false }));
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Storyboard
          </Typography>
          <ModelBadge />
        </Box>
        {hasResults && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`${results.length} scenes`} variant="outlined" />
            <QCBadge score={avgAvatarScore} label="Avg Avatar" />
            <QCBadge score={avgProductScore} label="Avg Product" />
          </Box>
        )}
      </Box>

      {/* Controls panel */}
      {!readOnly && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            p: 3,
            mb: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.default',
          }}
        >
          {/* Row 1: Aspect ratio chip + Image model + Storyboard Resolution */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Chip
              label={`Aspect Ratio: ${aspectRatio} (${aspectRatio === '16:9' ? 'YouTube / Web' : 'Reels / Shorts'})`}
              variant="outlined"
              sx={{ alignSelf: 'center' }}
            />

            {/* Storyboard Resolution */}
            <Box>
              <Tooltip title="Image quality for scene frames. Higher resolution = sharper but slower generation." placement="top" arrow>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                  Storyboard Resolution
                </Typography>
              </Tooltip>
              <ToggleButtonGroup
                value={imageResolution}
                exclusive
                onChange={(_, v) => { if (v !== null) setImageResolution(v); }}
                size="small"
                disabled={isLoading}
              >
                <ToggleButton value="1K" sx={{ px: 1.5, textTransform: 'none' }}>1K</ToggleButton>
                <ToggleButton value="2K" sx={{ px: 1.5, textTransform: 'none' }}>2K</ToggleButton>
                <ToggleButton value="4K" sx={{ px: 1.5, textTransform: 'none' }}>4K</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Row 2: QC threshold + Max regen attempts */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Box sx={{ minWidth: 220 }}>
              <Tooltip title="Minimum quality score (0-100) to auto-accept. Frames below this are automatically regenerated." placement="top" arrow>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, cursor: 'help' }}>
                  QC Threshold: {qcThreshold}
                </Typography>
              </Tooltip>
              <Slider
                value={qcThreshold}
                onChange={(_, value) => setQcThreshold(value as number)}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                disabled={isLoading}
              />
            </Box>

            <Box sx={{ minWidth: 220 }}>
              <Tooltip title="Maximum times a scene regenerates if it fails QC. Higher = better quality, longer generation." placement="top" arrow>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, cursor: 'help' }}>
                  Max Regen Attempts: {maxRegenAttempts}
                </Typography>
              </Tooltip>
              <Slider
                value={maxRegenAttempts}
                onChange={(_, value) => setMaxRegenAttempts(value as number)}
                min={0}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                disabled={isLoading}
              />
            </Box>

            <Tooltip title="Evaluate scene composition (rule of thirds, visual balance) in addition to avatar and product accuracy." placement="top" arrow>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeCompositionQc}
                    onChange={(e) => setIncludeCompositionQc(e.target.checked)}
                    disabled={isLoading}
                  />
                }
                label={
                  <Typography variant="body2">Include Composition QC</Typography>
                }
                sx={{ cursor: 'help' }}
              />
            </Tooltip>
          </Box>

          {/* Row 3: Generate button */}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => handleGenerate()}
            disabled={isLoading}
            sx={{ py: 1.5, textTransform: 'none' }}
          >
            {isLoading
              ? 'Generating...'
              : hasResults
                ? 'Regenerate Storyboard'
                : 'Generate Storyboard'}
          </Button>
        </Box>
      )}

      {/* Skeleton loading state — pure skeletons when no results yet */}
      {isLoading && !hasResults && (
        <Grid container spacing={3}>
          {Array.from({ length: totalScenes || 3 }).map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`skeleton-${i}`}>
              <Card>
                <Skeleton variant="rectangular" height={220} />
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Skeleton variant="rounded" width={80} height={24} />
                    <Skeleton variant="rounded" width={80} height={24} />
                  </Box>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {!hasResults && !isLoading && (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1">
            Configure storyboard settings above and click Generate Storyboard
          </Typography>
        </Box>
      )}

      {/* Results grid (including progressive loading with skeletons) */}
      {hasResults && (
        <>
          <Grid container spacing={3}>
            {results.map((result, index) => {
              const isSceneLoading = !!regenLoading[result.scene_number];
              return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={result.scene_number}>

                <Card sx={{
                  animation: `fadeInUp 0.4s ease ${index * 0.1}s both`,
                  '&:hover .scene-zoom-btn': { opacity: 1 },
                }}>
                  <Box sx={{ position: 'relative', bgcolor: 'action.hover' }}>
                    <CardMedia
                      component="img"
                      height={220}
                      image={result.image_path}
                      alt={`Scene ${result.scene_number}`}
                      sx={{ objectFit: 'contain', opacity: isSceneLoading ? 0.4 : 1, transition: 'opacity 0.3s' }}
                    />
                    {isSceneLoading && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CircularProgress size={36} />
                      </Box>
                    )}
                    <Chip
                      label={`Scene ${result.scene_number}`}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: 'common.white',
                        fontWeight: 500,
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 0.5,
                        alignItems: 'center',
                      }}
                    >
                      {result.regen_attempts > 0 && (
                        <Chip
                          label={`${result.regen_attempts} regen`}
                          size="small"
                          color="warning"
                          sx={{
                            fontSize: 11,
                          }}
                        />
                      )}
                      <Tooltip title="Preview full size">
                        <IconButton
                          className="scene-zoom-btn"
                          size="small"
                          onClick={() => setPreviewUrl(result.image_path)}
                          sx={{
                            bgcolor: 'background.paper',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            '&:hover': { bgcolor: 'background.paper' },
                          }}
                        >
                          <ZoomIn fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!readOnly && (
                        <Tooltip title={isSceneLoading ? 'Regenerating...' : 'Regenerate scene'}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleRegenScene(result.scene_number)}
                              disabled={isSceneLoading}
                              sx={{
                                bgcolor: 'background.paper',
                                '&:hover': { bgcolor: 'background.paper' },
                              }}
                            >
                              <Refresh fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <QCBadge score={result.qc_report.avatar_validation.score} label="Avatar" />
                      <QCBadge score={result.qc_report.product_validation.score} label="Product" />
                    </Box>
                    <QCDetailPanel
                      dimensions={[
                        {
                          label: 'Avatar Validation',
                          score: result.qc_report.avatar_validation.score,
                          reasoning: result.qc_report.avatar_validation.reason,
                        },
                        {
                          label: 'Product Validation',
                          score: result.qc_report.product_validation.score,
                          reasoning: result.qc_report.product_validation.reason,
                        },
                        ...(result.qc_report.composition_quality
                          ? [
                              {
                                label: 'Composition',
                                score: result.qc_report.composition_quality.score,
                                reasoning: result.qc_report.composition_quality.reason,
                              },
                            ]
                          : []),
                      ]}
                    />
                    {/* Prompt used — expandable */}
                    {result.prompt_used && (
                      <Box sx={{ mt: 1 }}>
                        <Box
                          onClick={() => setExpandedPrompts((p) => ({ ...p, [result.scene_number]: !p[result.scene_number] }))}
                          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 0.5 }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Prompt Used
                          </Typography>
                          {expandedPrompts[result.scene_number] ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
                        </Box>
                        <Collapse in={!!expandedPrompts[result.scene_number]}>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              p: 1,
                              bgcolor: 'action.hover',
                              borderRadius: 1,
                              fontFamily: 'monospace',
                              fontSize: 11,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxHeight: 160,
                              overflow: 'auto',
                            }}
                          >
                            {result.prompt_used}
                          </Typography>
                        </Collapse>
                      </Box>
                    )}
                    {/* Per-scene custom prompt for regen */}
                    {!readOnly && (
                      <TextField
                        label="Custom prompt for regen"
                        value={customPrompts[result.scene_number] || ''}
                        onChange={(e) => setCustomPrompts((p) => ({ ...p, [result.scene_number]: e.target.value }))}
                        size="small"
                        fullWidth
                        multiline
                        maxRows={3}
                        disabled={isLoading}
                        sx={{ mt: 1, '& .MuiInputBase-input': { fontSize: 12 } }}
                        placeholder="Override prompt for this scene..."
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
              );
            })}
            {/* Skeleton placeholders for remaining scenes during progressive loading */}
            {isLoading && totalScenes && results.length < totalScenes &&
              Array.from({ length: totalScenes - results.length }).map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`pending-${i}`}>
                  <Card>
                    <Skeleton variant="rectangular" height={220} />
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Skeleton variant="rounded" width={80} height={24} />
                        <Skeleton variant="rounded" width={80} height={24} />
                      </Box>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="40%" />
                    </CardContent>
                  </Card>
                </Grid>
              ))
            }
          </Grid>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={onContinue}
            disabled={isLoading || readOnly}
            endIcon={<ArrowForward />}
            sx={{ mt: 3, py: 1.5 }}
          >
            Continue to Video Generation
          </Button>
        </>
      )}
      {/* Full-size preview dialog */}
      <Dialog
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        maxWidth="md"
        slotProps={{
          paper: {
            sx: { bgcolor: 'common.black', position: 'relative', overflow: 'hidden' },
          },
        }}
      >
        <IconButton
          onClick={() => setPreviewUrl(null)}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            zIndex: 1,
          }}
        >
          <Close />
        </IconButton>
        {previewUrl && (
          <Box
            component="img"
            src={previewUrl}
            alt="Scene preview"
            sx={{
              display: 'block',
              maxWidth: '90vw',
              maxHeight: '85vh',
              objectFit: 'contain',
            }}
          />
        )}
      </Dialog>
    </Box>
  );
}
