import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
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
  Alert,
  Skeleton,
  Collapse,
  FormControl,
  Select,
  MenuItem,
  Switch,
  CircularProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { ArrowForward, EmojiEvents, CheckCircle, Refresh, ExpandMore, ExpandLess } from '@mui/icons-material';
import QCBadge from '../qc/QCBadge';
import QCDetailPanel from '../qc/QCDetailPanel';
import type { VideoResult, VideoGenerateOptions } from '../../types';
import { usePipelineStore } from '../../store/pipelineStore';
import { VEO_MODELS, DEFAULT_NUM_VIDEO_VARIANTS, DEFAULT_VIDEO_QC_THRESHOLD, DEFAULT_MAX_VIDEO_QC_REGEN } from '../../constants/controls';
import ModelBadge from '../common/ModelBadge';

interface VideoPlayerProps {
  results: VideoResult[];
  onContinue: () => void;
  onGenerate: (options?: VideoGenerateOptions) => void;
  onSelectVariant?: (sceneNumber: number, variantIndex: number) => void;
  onRegenScene?: (sceneNumber: number, options?: VideoGenerateOptions) => Promise<void>;
  isLoading: boolean;
  readOnly?: boolean;
  totalScenes?: number;
}


function getOverallScore(report: NonNullable<import('../../types').VideoQCReport>): number {
  const scores = [
    report.technical_distortion.score,
    report.cinematic_imperfections.score,
    report.avatar_consistency.score,
    report.product_consistency.score,
    report.temporal_coherence.score,
    report.hand_body_integrity.score,
    report.brand_text_accuracy.score,
  ];
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function buildOptions(controls: {
  veoModel: string;
  aspectRatio: string;
  duration: string;
  resolution: string;
  numVariants: number;
  compression: string;
  useReferenceImages: boolean;
  qcThreshold: number;
  maxQcRegen: number;
  negativePrompt: string;
  seed: string;
  generateAudio: boolean;
}): VideoGenerateOptions {
  const opts: VideoGenerateOptions = {
    aspect_ratio: controls.aspectRatio,
    duration_seconds: Number(controls.duration),
    resolution: controls.resolution,
    num_variants: controls.numVariants,
    compression_quality: controls.compression,
    use_reference_images: controls.useReferenceImages,
    qc_threshold: controls.qcThreshold,
    max_qc_regen_attempts: controls.maxQcRegen,
    generate_audio: controls.generateAudio,
  };
  if (controls.veoModel) {
    opts.veo_model = controls.veoModel;
  }
  if (controls.negativePrompt.trim()) {
    opts.negative_prompt_extra = controls.negativePrompt.trim();
  }
  if (controls.seed.trim()) {
    const parsed = Number(controls.seed.trim());
    if (!Number.isNaN(parsed)) {
      opts.seed = parsed;
    }
  }
  return opts;
}

export default function VideoPlayer({
  results,
  onContinue,
  onGenerate,
  onSelectVariant,
  onRegenScene,
  isLoading,
  readOnly = false,
  totalScenes,
}: VideoPlayerProps) {
  // Controls state
  const aspectRatio = usePipelineStore((s) => s.aspectRatio);
  const [veoModel, setVeoModel] = useState('veo-3.1-generate-preview');
  const [duration, setDuration] = useState('8');
  const storeResolution = usePipelineStore((s) => s.veoResolution);
  const [resolution, setResolutionLocal] = useState(storeResolution);
  const setResolution = (v: string) => {
    setResolutionLocal(v);
    usePipelineStore.getState().setVeoResolution(v);
  };
  const [numVariants, setNumVariants] = useState(DEFAULT_NUM_VIDEO_VARIANTS);
  const [compression, setCompression] = useState('optimized');
  const [useReferenceImages, setUseReferenceImages] = useState(true);
  const [qcThreshold, setQcThreshold] = useState(DEFAULT_VIDEO_QC_THRESHOLD);
  const [maxQcRegen, setMaxQcRegen] = useState(DEFAULT_MAX_VIDEO_QC_REGEN);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31).toString());
  const [generateAudio, setGenerateAudio] = useState(true);
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({});
  const [expandedQcContext, setExpandedQcContext] = useState<Record<number, boolean>>({});
  const [regenLoading, setRegenLoading] = useState<Record<number, boolean>>({});

  const requires8s = useReferenceImages || resolution === '1080p' || resolution === '4K';
  const show4KWarning = resolution === '4K';

  // Auto-enforce 8s duration when constraints require it
  useEffect(() => {
    if (requires8s && duration !== '8') {
      setDuration('8');
    }
  }, [requires8s, duration]);

  const controlValues = {
    veoModel,
    aspectRatio,
    duration,
    resolution,
    numVariants,
    compression,
    useReferenceImages,
    qcThreshold,
    maxQcRegen,
    negativePrompt,
    seed,
    generateAudio,
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Video Generation
          </Typography>
          <ModelBadge label={VEO_MODELS.find((m) => m.id === veoModel)?.label} />
        </Box>
        {onSelectVariant && !readOnly && results.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            Click a variant to select it for the final video
          </Typography>
        )}
      </Box>

      {/* Controls Panel */}
      {!readOnly && (
        <Card sx={{ mb: 3, border: 1, borderColor: 'divider' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Row 1: Veo model, Aspect ratio chip, Duration */}
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title="Preview models support reference images for character consistency. GA models are production-stable." placement="top" arrow>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                    Veo Model
                  </Typography>
                </Tooltip>
                <FormControl size="small" fullWidth>
                  <Select
                    value={veoModel}
                    onChange={(e: SelectChangeEvent) => setVeoModel(e.target.value)}
                  >
                    {VEO_MODELS.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.label} — {m.description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Chip
                  label={`Aspect Ratio: ${aspectRatio} (${aspectRatio === '16:9' ? 'YouTube / Web' : 'Reels / Shorts'})`}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title="Length of each scene clip. 8s required with reference images or resolution >= 1080p." placement="top" arrow>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                    Duration
                  </Typography>
                </Tooltip>
                <ToggleButtonGroup
                  value={duration}
                  exclusive
                  onChange={(_, v) => { if (v) setDuration(v); }}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="4" disabled={requires8s}>4s</ToggleButton>
                  <ToggleButton value="6" disabled={requires8s}>6s</ToggleButton>
                  <ToggleButton value="8">8s</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>

            {/* Row 2: Resolution, Variants slider, Compression */}
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title="Output video resolution. 1080p and 4K require 8s duration and take longer to generate." placement="top" arrow>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                    Scene Resolution
                  </Typography>
                </Tooltip>
                <ToggleButtonGroup
                  value={resolution}
                  exclusive
                  onChange={(_, v) => { if (v) setResolution(v); }}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="720p">720p</ToggleButton>
                  <ToggleButton value="1080p">1080p</ToggleButton>
                  <ToggleButton value="4K">4K</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title="Video options generated per scene. Best variant is auto-selected by QC scoring." placement="top" arrow>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                    Variants: {numVariants}
                  </Typography>
                </Tooltip>
                <Slider
                  value={numVariants}
                  onChange={(_, v) => setNumVariants(v as number)}
                  min={1}
                  max={4}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip
                  title="Optimized: smaller file size with near-identical visual quality (H.264/H.265 encoding). Lossless: preserves every pixel — much larger files, best for final master exports or further editing."
                  placement="top"
                  arrow
                >
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                    Compression
                  </Typography>
                </Tooltip>
                <ToggleButtonGroup
                  value={compression}
                  exclusive
                  onChange={(_, v) => { if (v) setCompression(v); }}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="optimized">Optimized</ToggleButton>
                  <ToggleButton value="lossless">Lossless</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>

            {/* Row 3: Reference images, Audio toggle, QC threshold, Max QC regen */}
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title="Pass avatar and product images for visual consistency. Requires Preview models and 8s duration." placement="top" arrow>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={useReferenceImages}
                        onChange={(e) => setUseReferenceImages(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Reference images (avatar + product consistency)"
                    sx={{ cursor: 'help' }}
                  />
                </Tooltip>
                <Tooltip title="AI-generated dialogue and sound design. Disable for scenes using custom audio in post-production." placement="top" arrow>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={generateAudio}
                        onChange={(e) => setGenerateAudio(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Generate audio"
                    sx={{ cursor: 'help' }}
                  />
                </Tooltip>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title="Minimum quality score (0-10) to auto-accept. Videos below this trigger prompt rewriting and regeneration." placement="top" arrow>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                    QC Threshold: {qcThreshold}
                  </Typography>
                </Tooltip>
                <Slider
                  value={qcThreshold}
                  onChange={(_, v) => setQcThreshold(v as number)}
                  min={0}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title="Maximum regeneration attempts using QC feedback. Each attempt rewrites the prompt to fix detected issues." placement="top" arrow>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                    Max QC Regen: {maxQcRegen}
                  </Typography>
                </Tooltip>
                <Slider
                  value={maxQcRegen}
                  onChange={(_, v) => setMaxQcRegen(v as number)}
                  min={0}
                  max={3}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  size="small"
                />
              </Grid>
            </Grid>

            {/* Row 4: Negative prompt, Seed */}
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <Tooltip title="Elements to avoid in generated video (e.g., blurry, text overlay, watermark). Appended to global negatives." placement="top" arrow>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                    Negative Prompt (optional)
                  </Typography>
                </Tooltip>
                <TextField
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="e.g. blurry, text overlay, watermark"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title="Random seed for reproducibility. Same seed + prompt = similar output. Shared across scenes for consistency." placement="top" arrow>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                    Seed (optional)
                  </Typography>
                </Tooltip>
                <TextField
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="e.g. 42"
                  type="number"
                />
              </Grid>
            </Grid>

            {/* Constraint warnings */}
            {requires8s && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Duration locked to 8s (required for reference images or high resolution)
              </Alert>
            )}
            {show4KWarning && (
              <Alert severity="info" sx={{ mt: 1 }}>
                4K resolution requires 8-second duration
              </Alert>
            )}

            {/* Generate button */}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => onGenerate(buildOptions(controlValues))}
              disabled={isLoading}
              sx={{ py: 1.5, mt: 1 }}
            >
              Generate Videos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {results.length === 0 && !isLoading && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: 'text.secondary',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            mb: 3,
          }}
        >
          <Typography variant="body1">
            Configure video settings above and click Generate Videos
          </Typography>
        </Box>
      )}

      {/* Skeleton loading — pure skeletons when no results yet */}
      {isLoading && results.length === 0 && (
        <Box sx={{ mb: 4 }}>
          {Array.from({ length: totalScenes || 3 }).map((_, n) => (
            <Box key={`skeleton-scene-${n}`} sx={{ mb: 4 }}>
              <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[0, 1, 2, 3].map((i) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                    <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Box>
      )}

      {/* Results section */}
      {results.map((sceneResult) => (
        <Box key={sceneResult.scene_number} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6">
              Scene {sceneResult.scene_number}
            </Typography>
            {(sceneResult.regen_attempts ?? 0) > 0 && (
              <Chip
                label={`${sceneResult.regen_attempts} QC regen`}
                size="small"
                color="warning"
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
            {sceneResult.qc_rewrite_context && (
              <Chip
                label="QC-informed"
                size="small"
                color="info"
                variant="outlined"
                sx={{ fontSize: 11 }}
              />
            )}
            {onRegenScene && !readOnly && (
              <Tooltip title={regenLoading[sceneResult.scene_number] ? 'Regenerating...' : 'Regenerate this scene using QC feedback from current result'}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!!regenLoading[sceneResult.scene_number]}
                    onClick={async () => {
                      setRegenLoading((prev) => ({ ...prev, [sceneResult.scene_number]: true }));
                      try {
                        await onRegenScene(sceneResult.scene_number, buildOptions(controlValues));
                      } finally {
                        setRegenLoading((prev) => ({ ...prev, [sceneResult.scene_number]: false }));
                      }
                    }}
                    sx={{ color: 'text.secondary' }}
                  >
                    {regenLoading[sceneResult.scene_number] ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>

          <Grid container spacing={2}>
            {sceneResult.variants.map((variant) => {
              const isSelected = variant.index === sceneResult.selected_index;
              const cardContent = (
                <>
                  {isSelected && (
                    <Chip
                      icon={onSelectVariant ? <CheckCircle sx={{ fontSize: 16 }} /> : <EmojiEvents sx={{ fontSize: 16 }} />}
                      label={onSelectVariant ? 'Selected' : 'Best'}
                      size="small"
                      color="primary"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1,
                        fontWeight: 600,
                      }}
                    />
                  )}
                  <Box
                    sx={{ position: 'relative', bgcolor: 'common.black' }}
                    onClickCapture={(e) => e.stopPropagation()}
                  >
                    <video
                      src={variant.video_path}
                      controls
                      style={{
                        width: '100%',
                        height: 180,
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Variant {variant.index + 1}
                    </Typography>
                    {variant.qc_report && (
                      <>
                        <QCBadge
                          score={getOverallScore(variant.qc_report)}
                          label="Overall"
                        />
                        <QCDetailPanel
                          dimensions={[
                            {
                              label: 'Technical',
                              score: variant.qc_report.technical_distortion.score,
                              reasoning: variant.qc_report.technical_distortion.reasoning,
                            },
                            {
                              label: 'Cinematic',
                              score: variant.qc_report.cinematic_imperfections.score,
                              reasoning: variant.qc_report.cinematic_imperfections.reasoning,
                            },
                            {
                              label: 'Avatar',
                              score: variant.qc_report.avatar_consistency.score,
                              reasoning: variant.qc_report.avatar_consistency.reasoning,
                            },
                            {
                              label: 'Product',
                              score: variant.qc_report.product_consistency.score,
                              reasoning: variant.qc_report.product_consistency.reasoning,
                            },
                            {
                              label: 'Temporal',
                              score: variant.qc_report.temporal_coherence.score,
                              reasoning: variant.qc_report.temporal_coherence.reasoning,
                            },
                            {
                              label: 'Hands/Body',
                              score: variant.qc_report.hand_body_integrity.score,
                              reasoning: variant.qc_report.hand_body_integrity.reasoning,
                            },
                            {
                              label: 'Brand/Text',
                              score: variant.qc_report.brand_text_accuracy.score,
                              reasoning: variant.qc_report.brand_text_accuracy.reasoning,
                            },
                          ]}
                        />
                      </>
                    )}
                  </CardContent>
                </>
              );

              return (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={variant.index}>
                  <Card
                    sx={{
                      border: isSelected ? 3 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      position: 'relative',
                      cursor: onSelectVariant && !readOnly ? 'pointer' : 'default',
                      transition: 'border-color 0.15s',
                      animation: 'scaleIn 0.3s ease',
                      '&:hover': onSelectVariant && !readOnly
                        ? { borderColor: 'primary.main' }
                        : {},
                    }}
                  >
                    {onSelectVariant && !readOnly ? (
                      <CardActionArea
                        onClick={() => onSelectVariant(sceneResult.scene_number, variant.index)}
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                      >
                        {cardContent}
                      </CardActionArea>
                    ) : (
                      cardContent
                    )}
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* QC Rewrite Context — expandable */}
          {sceneResult.qc_rewrite_context && (
            <Box sx={{ mt: 1.5 }}>
              <Box
                onClick={() => setExpandedQcContext((p) => ({ ...p, [sceneResult.scene_number]: !p[sceneResult.scene_number] }))}
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 0.5 }}
              >
                <Typography variant="caption" sx={{ fontWeight: 500, color: 'info.main' }}>
                  QC Feedback Used for Rewrite
                </Typography>
                {expandedQcContext[sceneResult.scene_number] ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              </Box>
              <Collapse in={!!expandedQcContext[sceneResult.scene_number]}>
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
                    maxHeight: 200,
                    overflow: 'auto',
                    borderLeft: 3,
                    borderColor: 'info.main',
                  }}
                >
                  {sceneResult.qc_rewrite_context}
                </Typography>
              </Collapse>
            </Box>
          )}

          {/* Prompt used — expandable */}
          {sceneResult.prompt_used && (
            <Box sx={{ mt: 1.5 }}>
              <Box
                onClick={() => setExpandedPrompts((p) => ({ ...p, [sceneResult.scene_number]: !p[sceneResult.scene_number] }))}
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 0.5 }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Prompt Used
                </Typography>
                {expandedPrompts[sceneResult.scene_number] ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              </Box>
              <Collapse in={!!expandedPrompts[sceneResult.scene_number]}>
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
                  {sceneResult.prompt_used}
                </Typography>
              </Collapse>
            </Box>
          )}
        </Box>
      ))}

      {/* Skeleton placeholders for remaining scenes during progressive loading */}
      {isLoading && totalScenes && results.length > 0 && results.length < totalScenes &&
        Array.from({ length: totalScenes - results.length }).map((_, n) => (
          <Box key={`pending-scene-${n}`} sx={{ mb: 4 }}>
            <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {Array.from({ length: numVariants }).map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      }

      {/* Continue button */}
      {results.length > 0 && (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => onContinue()}
          disabled={isLoading || readOnly}
          endIcon={<ArrowForward />}
          sx={{ py: 1.5 }}
        >
          Continue to Final Video
        </Button>
      )}
    </Box>
  );
}
