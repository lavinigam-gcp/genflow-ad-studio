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
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Dialog,
  IconButton,
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
import { uploadImage } from '../../api/pipeline';

const IMAGE_MODELS = [
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', description: 'Default' },
  { id: 'imagen-4.0-generate-001', label: 'Imagen 4 Standard', description: 'High quality' },
  { id: 'imagen-4.0-fast-generate-001', label: 'Imagen 4 Fast', description: 'Faster generation' },
  { id: 'imagen-4.0-ultra-generate-001', label: 'Imagen 4 Ultra', description: 'Best quality' },
];

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
  const [numVariants, setNumVariants] = useState(2);
  const [imageModel, setImageModel] = useState('gemini-3-pro-image-preview');
  const [customPrompt, setCustomPrompt] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
      image_model: imageModel !== 'gemini-3-pro-image-preview' ? imageModel : undefined,
      custom_prompt: customPrompt || undefined,
      reference_image_url: referenceImageUrl || undefined,
    };
    onGenerate(options);
  };

  const hasVariants = variants.length > 0;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        {hasVariants ? 'Select Avatar' : 'Generate Avatar'}
      </Typography>

      {/* Avatar Generation Controls — always visible when not readOnly */}
      {!readOnly && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            p: 3,
            mb: 3,
            border: '1px solid #DADCE0',
            borderRadius: 2,
            bgcolor: '#F8F9FA',
          }}
        >
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Variants slider */}
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Number of Variants: {numVariants}
              </Typography>
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

            {/* Model selector */}
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Image Model</InputLabel>
              <Select
                value={imageModel}
                label="Image Model"
                onChange={(e: SelectChangeEvent) => setImageModel(e.target.value)}
                disabled={isLoading}
              >
                {IMAGE_MODELS.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.label} — {m.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Custom prompt */}
          <TextField
            label="Custom Prompt (optional)"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={isLoading}
            placeholder="Override the default avatar prompt..."
            helperText="Leave empty to use the auto-generated prompt from the script"
          />

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
                  border: '1px solid #DADCE0',
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
                      ? '3px solid #1A73E8'
                      : '1px solid #DADCE0',
                    transition: 'border-color 0.2s, transform 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px) scale(1.02)',
                      borderColor: selectedIndex === variant.index ? '#1A73E8' : '#9AA0A6',
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
                      bgcolor: '#F0F0F0',
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
                      bgcolor: 'rgba(255,255,255,0.85)',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
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
            sx: { bgcolor: '#1a1a1a', position: 'relative', overflow: 'hidden' },
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
