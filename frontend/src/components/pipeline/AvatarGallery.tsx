import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  Box,
  Skeleton,
} from '@mui/material';
import { ArrowForward, Refresh } from '@mui/icons-material';
import type { AvatarVariant } from '../../types';

interface AvatarGalleryProps {
  variants: AvatarVariant[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onRegenerate: () => void;
  onContinue: () => void;
  isLoading: boolean;
  readOnly?: boolean;
}

export default function AvatarGallery({
  variants,
  selectedIndex,
  onSelect,
  onRegenerate,
  onContinue,
  isLoading,
  readOnly = false,
}: AvatarGalleryProps) {
  if (isLoading && variants.length === 0) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Generating Avatar Variants...
        </Typography>
        <Grid container spacing={3}>
          {[0, 1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Select Avatar
      </Typography>

      <Grid container spacing={3}>
        {variants.map((variant) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={variant.index}>
            <Card
              onClick={() => !readOnly && onSelect(variant.index)}
              sx={{
                cursor: readOnly ? 'default' : 'pointer',
                border: selectedIndex === variant.index
                  ? '3px solid #1A73E8'
                  : '1px solid #DADCE0',
                transition: 'border-color 0.2s, transform 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  borderColor: selectedIndex === variant.index ? '#1A73E8' : '#9AA0A6',
                },
              }}
            >
              <CardMedia
                component="img"
                height={240}
                image={variant.image_path}
                alt={`Avatar variant ${variant.index + 1}`}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Variant {variant.index + 1}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          onClick={onRegenerate}
          disabled={isLoading || readOnly}
          startIcon={<Refresh />}
        >
          Regenerate Avatars
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onContinue}
          disabled={selectedIndex === null || isLoading || readOnly}
          endIcon={<ArrowForward />}
          sx={{ flex: 1 }}
        >
          Continue with Selected Avatar
        </Button>
      </Box>
    </Box>
  );
}
