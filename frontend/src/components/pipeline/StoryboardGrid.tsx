import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  Box,
  Chip,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import QCBadge from '../qc/QCBadge';
import QCDetailPanel from '../qc/QCDetailPanel';
import type { StoryboardResult } from '../../types';

interface StoryboardGridProps {
  results: StoryboardResult[];
  onContinue: () => void;
  isLoading: boolean;
  readOnly?: boolean;
}

export default function StoryboardGrid({ results, onContinue, isLoading, readOnly = false }: StoryboardGridProps) {
  const avgAvatarScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + r.qc_report.avatar_validation.score, 0) /
            results.length
        )
      : 0;
  const avgProductScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + r.qc_report.product_validation.score, 0) /
            results.length
        )
      : 0;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Storyboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={`${results.length} scenes`} variant="outlined" />
          <QCBadge score={avgAvatarScore} label="Avg Avatar" />
          <QCBadge score={avgProductScore} label="Avg Product" />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {results.map((result) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={result.scene_number}>
            <Card>
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height={220}
                  image={result.image_path}
                  alt={`Scene ${result.scene_number}`}
                  sx={{ objectFit: 'cover' }}
                />
                <Chip
                  label={`Scene ${result.scene_number}`}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#FFFFFF',
                    fontWeight: 500,
                  }}
                />
                {result.regen_attempts > 0 && (
                  <Chip
                    label={`${result.regen_attempts} regen`}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(232, 113, 10, 0.85)',
                      color: '#FFFFFF',
                      fontSize: 11,
                    }}
                  />
                )}
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
        disabled={isLoading || readOnly}
        endIcon={<ArrowForward />}
        sx={{ mt: 3, py: 1.5 }}
      >
        Continue to Video Generation
      </Button>
    </Box>
  );
}
