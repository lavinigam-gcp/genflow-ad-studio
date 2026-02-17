import { useState, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  Box,
  Skeleton,
  Slider,
  FormControl,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Dialog,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

import {
  ArrowForward,
  AutoAwesome,
  CloudUpload,
  ZoomIn,
  Close,
} from '@mui/icons-material';
import type { AvatarVariant, AvatarGenerateOptions } from '../../types';
import { ETHNICITIES, AGE_RANGES, DEFAULT_NUM_AVATAR_VARIANTS, DEFAULT_IMAGE_RESOLUTION } from '../../constants/controls';
import { uploadImage } from '../../api/pipeline';
import { usePipelineStore } from '../../store/pipelineStore';
import ModelBadge from '../common/ModelBadge';

interface AvatarGalleryProps {
  variants: AvatarVariant[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onGenerate: (options?: AvatarGenerateOptions) => void;
  onContinue: () => void;
  isLoading: boolean;
  readOnly?: boolean;
}

export default function AvatarGallery({
  variants,
  selectedIndex,
  onSelect,
  onGenerate,
  onContinue,
  isLoading,
  readOnly = false,
}: AvatarGalleryProps) {
  const aspectRatio = usePipelineStore((s) => s.aspectRatio);
  const [imageResolution, setImageResolution] = useState(DEFAULT_IMAGE_RESOLUTION);
  const [numVariants, setNumVariants] = useState(DEFAULT_NUM_AVATAR_VARIANTS);
  const [customPrompt, setCustomPrompt] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ethnicity, setEthnicity] = useState('');
  const [gender, setGender] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploadLoading(true);
    try {
      const res = await uploadImage(file);
      setReferenceImageUrl(res.image_url);
    } catch {
      // Silently fail
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const handleGenerate = () => {
    const options: AvatarGenerateOptions = {
      num_variants: numVariants,
      image_size: imageResolution,
      aspect_ratio: usePipelineStore.getState().aspectRatio,
      custom_prompt: customPrompt || undefined,
      reference_image_url: referenceImageUrl || undefined,
      override_ethnicity: ethnicity || undefined,
      override_gender: gender || undefined,
      override_age_range: ageRange || undefined,
    };
    onGenerate(options);
  };

  const hasVariants = variants.length > 0;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {hasVariants ? 'Select Avatar' : 'Generate Avatar'}
        </Typography>
        <ModelBadge />
      </Box>

      {/* Avatar Generation Controls — always visible when not readOnly */}
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
          {/* Character filters row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Aspect Ratio toggle */}
            <Box>
              <Tooltip title="Video frame shape. 9:16 for mobile (Reels, Shorts, TikTok). 16:9 for desktop (YouTube, web)." placement="top" arrow>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                  Aspect Ratio
                </Typography>
              </Tooltip>
              <ToggleButtonGroup
                value={aspectRatio}
                exclusive
                onChange={(_, v) => { if (v !== null) usePipelineStore.getState().setAspectRatio(v); }}
                size="small"
                disabled={isLoading}
              >
                <ToggleButton value="9:16" sx={{ px: 1.5, textTransform: 'none', lineHeight: 1.2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span>9:16</span>
                    <Typography variant="caption" sx={{ fontSize: 9, opacity: 0.7 }}>Reels / Shorts</Typography>
                  </Box>
                </ToggleButton>
                <ToggleButton value="16:9" sx={{ px: 1.5, textTransform: 'none', lineHeight: 1.2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span>16:9</span>
                    <Typography variant="caption" sx={{ fontSize: 9, opacity: 0.7 }}>YouTube / Web</Typography>
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Gender toggle */}
            <Box>
              <Tooltip title="Auto uses the script's character profile. Override to specify male or female." placement="top" arrow>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                  Gender
                </Typography>
              </Tooltip>
              <ToggleButtonGroup
                value={gender}
                exclusive
                onChange={(_, v) => { if (v !== null) setGender(v); }}
                size="small"
                disabled={isLoading}
              >
                <ToggleButton value="" sx={{ px: 1.5, textTransform: 'none' }}>Auto</ToggleButton>
                <ToggleButton value="male" sx={{ px: 1.5, textTransform: 'none' }}>Male</ToggleButton>
                <ToggleButton value="female" sx={{ px: 1.5, textTransform: 'none' }}>Female</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Ethnicity */}
            <Box>
              <Tooltip title="Auto uses the script's character description. Override to ensure specific representation." placement="top" arrow>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                  Ethnicity
                </Typography>
              </Tooltip>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={ethnicity}
                  onChange={(e: SelectChangeEvent) => setEthnicity(e.target.value)}
                  disabled={isLoading}
                  displayEmpty
                >
                  <MenuItem value="">Auto (from script)</MenuItem>
                  {ETHNICITIES.filter(Boolean).map((e) => (
                    <MenuItem key={e} value={e}>{e}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Age range */}
            <Box>
              <Tooltip title="Auto uses the script's character description. Override to target a specific age demographic." placement="top" arrow>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                  Age Range
                </Typography>
              </Tooltip>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={ageRange}
                  onChange={(e: SelectChangeEvent) => setAgeRange(e.target.value)}
                  disabled={isLoading}
                  displayEmpty
                >
                  <MenuItem value="">Auto (from script)</MenuItem>
                  {AGE_RANGES.map((a) => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Model + Variants row */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Variants slider */}
            <Box sx={{ minWidth: 200 }}>
              <Tooltip title="How many avatar options to generate. More variants = more choices but longer generation." placement="top" arrow>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, cursor: 'help' }}>
                  Number of Variants: {numVariants}
                </Typography>
              </Tooltip>
              <Slider
                value={numVariants}
                onChange={(_, value) => setNumVariants(value as number)}
                min={1}
                max={5}
                step={1}
                marks
                valueLabelDisplay="auto"
                disabled={isLoading}
              />
            </Box>

            {/* Avatar Resolution */}
            <Box>
              <Tooltip title="Image quality for avatar portraits. 2K recommended. 4K is sharper but slower." placement="top" arrow>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                  Avatar Resolution
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

          {/* Custom prompt */}
          <Box>
            <Tooltip title="Completely replaces the auto-generated prompt. Use for precise character appearance control." placement="top" arrow>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', cursor: 'help' }}>
                Custom Prompt (optional)
              </Typography>
            </Tooltip>
            <TextField
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              fullWidth
              multiline
              rows={2}
              disabled={isLoading}
              placeholder="Override the default avatar prompt..."
              helperText="Leave empty to use the auto-generated prompt from the script"
            />
          </Box>

          {/* Upload reference + Generate button row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploadLoading}
              startIcon={<CloudUpload />}
              sx={{ textTransform: 'none' }}
            >
              {uploadLoading ? 'Uploading...' : 'Upload Reference'}
            </Button>
            {referenceImageUrl && (
              <Box
                component="img"
                src={referenceImageUrl}
                alt="Reference"
                sx={{
                  width: 48,
                  height: 48,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerate}
              disabled={isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AutoAwesome />
                )
              }
              sx={{ textTransform: 'none', px: 3 }}
            >
              {isLoading
                ? 'Generating...'
                : hasVariants
                  ? 'Regenerate Avatars'
                  : 'Generate Avatars'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Avatar grid — show skeletons while loading, variants when ready */}
      {isLoading && !hasVariants ? (
        <Grid container spacing={3}>
          {Array.from({ length: numVariants }).map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: numVariants <= 3 ? 4 : 3 }} key={i}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : hasVariants ? (
        <>
          <Grid container spacing={3}>
            {variants.map((variant) => (
              <Grid
                size={{ xs: 12, sm: 6, md: variants.length <= 3 ? 4 : 3 }}
                key={variant.index}
              >
                <Card
                  onClick={() => !readOnly && onSelect(variant.index)}
                  sx={{
                    cursor: readOnly ? 'default' : 'pointer',
                    position: 'relative',
                    border: selectedIndex === variant.index
                      ? '3px solid'
                      : '1px solid',
                    borderColor: selectedIndex === variant.index
                      ? 'primary.main'
                      : 'divider',
                    transition: 'border-color 0.2s, transform 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px) scale(1.02)',
                      borderColor: selectedIndex === variant.index ? 'primary.main' : 'text.secondary',
                    },
                    '&:hover .avatar-zoom-btn': { opacity: 1 },
                  }}
                >
                  <CardMedia
                    component="img"
                    image={variant.image_path}
                    alt={`Avatar variant ${variant.index + 1}`}
                    sx={{
                      aspectRatio: '3 / 4',
                      objectFit: 'contain',
                      bgcolor: 'action.hover',
                    }}
                  />
                  {/* Zoom button — visible on hover */}
                  <IconButton
                    className="avatar-zoom-btn"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewUrl(variant.image_path);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'background.paper',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      '&:hover': { bgcolor: 'background.paper' },
                    }}
                  >
                    <ZoomIn fontSize="small" />
                  </IconButton>
                  <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Variant {variant.index + 1}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={onContinue}
            disabled={selectedIndex === null || isLoading || readOnly}
            endIcon={<ArrowForward />}
            sx={{ mt: 3, py: 1.5 }}
          >
            Continue with Selected Avatar
          </Button>
        </>
      ) : (
        /* Empty state — no variants yet, controls shown above */
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1">
            Configure options above and click Generate Avatars to create variants.
          </Typography>
        </Box>
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
            alt="Avatar preview"
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
