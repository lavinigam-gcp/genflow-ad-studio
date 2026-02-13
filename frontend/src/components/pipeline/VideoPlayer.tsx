import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Button,
  Grid,
  Box,
  Chip,
} from '@mui/material';
import { ArrowForward, EmojiEvents, CheckCircle } from '@mui/icons-material';
import QCBadge from '../qc/QCBadge';
import QCDetailPanel from '../qc/QCDetailPanel';
import type { VideoResult } from '../../types';

interface VideoPlayerProps {
  results: VideoResult[];
  onContinue: () => void;
  onSelectVariant?: (sceneNumber: number, variantIndex: number) => void;
  isLoading: boolean;
  readOnly?: boolean;
}

function getOverallScore(report: NonNullable<import('../../types').VideoQCReport>): number {
  const scores = [
    report.technical_distortion.score,
    report.cinematic_imperfections.score,
    report.avatar_consistency.score,
    report.product_consistency.score,
    report.temporal_coherence.score,
  ];
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export default function VideoPlayer({
  results,
  onContinue,
  onSelectVariant,
  isLoading,
  readOnly = false,
}: VideoPlayerProps) {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Video Variants
        </Typography>
        {onSelectVariant && !readOnly && (
          <Typography variant="body2" color="text.secondary">
            Click a variant to select it for the final video
          </Typography>
        )}
      </Box>

      {results.map((sceneResult) => (
        <Box key={sceneResult.scene_number} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Scene {sceneResult.scene_number}
          </Typography>

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
                  <Box sx={{ position: 'relative', backgroundColor: '#000' }}>
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
                      border: isSelected ? '3px solid #1A73E8' : '1px solid #DADCE0',
                      position: 'relative',
                      cursor: onSelectVariant && !readOnly ? 'pointer' : 'default',
                      transition: 'border-color 0.15s',
                      '&:hover': onSelectVariant && !readOnly
                        ? { borderColor: isSelected ? '#1A73E8' : '#1A73E8AA' }
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
        </Box>
      ))}

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={onContinue}
        disabled={isLoading || readOnly}
        endIcon={<ArrowForward />}
        sx={{ py: 1.5 }}
      >
        Continue to Final Video
      </Button>
    </Box>
  );
}
