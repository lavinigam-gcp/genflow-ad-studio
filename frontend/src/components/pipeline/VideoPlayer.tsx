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
  InputLabel,
  Select,
  MenuItem,
  Switch,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { ArrowForward, EmojiEvents, CheckCircle, Refresh, ExpandMore, ExpandLess } from '@mui/icons-material';
import QCBadge from '../qc/QCBadge';
import QCDetailPanel from '../qc/QCDetailPanel';
import type { VideoResult, VideoGenerateOptions } from '../../types';
import { usePipelineStore } from '../../store/pipelineStore';

interface VideoPlayerProps {
  results: VideoResult[];
  onContinue: () => void;
  onGenerate: (options?: VideoGenerateOptions) => void;
  onSelectVariant?: (sceneNumber: number, variantIndex: number) => void;
  onRegenScene?: (sceneNumber: number, options?: VideoGenerateOptions) => void;
  isLoading: boolean;
  readOnly?: boolean;
  totalScenes?: number;
}

const VEO_MODELS = [
  { id: 'veo-3.1-generate-preview', label: 'Veo 3.1 Preview', description: 'Standard — Best quality' },
  { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast Preview', description: 'Faster generation' },
];

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
  const [resolution, setResolution] = useState('720p');
  const [numVariants, setNumVariants] = useState(4);
  const [compression, setCompression] = useState('optimized');
  const [useReferenceImages, setUseReferenceImages] = useState(true);
  const [qcThreshold, setQcThreshold] = useState(6);
  const [maxQcRegen, setMaxQcRegen] = useState(2);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31).toString());
  const [generateAudio, setGenerateAudio] = useState(true);
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({});

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
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Video Generation
        </Typography>
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
                <FormControl size="small" fullWidth>
                  <InputLabel>Veo Model</InputLabel>
                  <Select
                    value={veoModel}
                    label="Veo Model"
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
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Duration
                </Typography>
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
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Scene Resolution
                </Typography>
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
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Variants: {numVariants}
                </Typography>
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
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Compression
                </Typography>
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
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useReferenceImages}
                      onChange={(e) => setUseReferenceImages(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Reference images (avatar + product consistency)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={generateAudio}
                      onChange={(e) => setGenerateAudio(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Generate audio"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  QC Threshold: {qcThreshold}
                </Typography>
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
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Max QC Regen: {maxQcRegen}
                </Typography>
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
                <TextField
                  label="Negative Prompt (optional)"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="e.g. blurry, text overlay, watermark"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Seed (optional)"
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
            {onRegenScene && !readOnly && (
              <Tooltip title="Regenerate this scene">
                <IconButton
                  size="small"
                  onClick={() => onRegenScene(sceneResult.scene_number, buildOptions(controlValues))}
                  disabled={isLoading}
                  sx={{ color: 'text.secondary' }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
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
                  <Box sx={{ position: 'relative', bgcolor: 'common.black' }}>
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
                        disabled={isLoading}
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
