import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Dialog,
} from '@mui/material';
import {
  CameraAlt,
  Description,
  Face,
  GridView,
  Videocam,
  ContentCut,
  RateReview,
} from '@mui/icons-material';

const PIPELINE_STEPS = [
  {
    label: 'Product Input',
    icon: CameraAlt,
    description: 'Upload a product image (URL, file, or AI-generated), provide specifications, and select scene count (2-6).',
    details: 'Gemini 3 Flash auto-analyzes the uploaded image to extract product name and key specifications. Supports URL input, file upload, or AI-generated product images via Gemini 3 Pro Image.',
    tech: 'Gemini 3 Flash',
    diagram: 'product-input',
  },
  {
    label: 'Script Generation',
    icon: Description,
    description: 'Gemini 3 Pro acts as an award-winning Ad Director, composing a cinematic script with dialogue, camera directions, lighting, and scene transitions.',
    details: 'Builds a narrative arc (Hook \u2192 Reveal \u2192 Features \u2192 CTA). Generates identical `detailed_avatar_description` across all scenes for Veo character consistency. Custom creative instructions can be appended.',
    tech: 'Gemini 3 Pro / Flash',
    diagram: 'script-generation',
  },
  {
    label: 'Avatar Creation',
    icon: Face,
    description: 'Generate 1-5 photorealistic presenter variants using Gemini 3 Pro Image or Imagen 4, then select the best fit.',
    details: '85mm portrait template with 3-point lighting. Demographic overrides (gender, ethnicity, age) replace visual_description to avoid conflicting prompt instructions. Selected avatar is used for visual consistency across all scenes.',
    tech: 'Gemini 3 Pro Image',
    diagram: 'avatar-creation',
  },
  {
    label: 'Storyboard',
    icon: GridView,
    description: 'Scene-by-scene storyboard frames with an automated generate \u2192 evaluate \u2192 refine QC loop (up to 3 attempts).',
    details: 'Gemini 3 Pro Image generates frames. Gemini 3 Flash QC scores each on avatar match, product accuracy, and composition (0-100). Failed frames get prompt rewriting. Best result is kept even if none pass QC threshold.',
    tech: 'Gemini 3 Pro Image + Flash QC',
    diagram: 'storyboard-qc',
  },
  {
    label: 'Video Generation',
    icon: Videocam,
    description: 'Veo 3.1 generates 4-8 second video clips for each scene with scene-to-scene continuity via last-frame chaining.',
    details: 'Sequential scene processing ensures continuity. 7-dimension QC evaluates technical quality, avatar consistency, motion, and audio. Same seed across all scenes for character and voice consistency. Reference images require Preview models and enforce 8s duration.',
    tech: 'Veo 3.1 + Flash QC',
    diagram: 'video-continuity',
  },
  {
    label: 'Final Stitching',
    icon: ContentCut,
    description: 'FFmpeg composites all scene clips into a finished commercial with per-scene transitions and normalized audio.',
    details: 'VFR \u2192 24fps CFR preprocessing. Transition map (dissolve\u2192fade, wipe\u2192wipeleft, zoom\u2192zoomin). Audio normalization via loudnorm (I=-14, TP=-1). H.264/AAC encoding with optimized or lossless compression.',
    tech: 'FFmpeg',
    diagram: 'ffmpeg-stitching',
  },
  {
    label: 'Review & Approval',
    icon: RateReview,
    description: 'Watch the final commercial, inspect per-scene QC scores across all 7 dimensions, and approve, reject, or request revisions.',
    details: 'Rejected ads can be regenerated from any pipeline step. Per-scene video variants and QC feedback are preserved for comparison.',
    tech: 'Human + AI',
    diagram: 'review-approval',
  },
];

export default function HowItWorksPage() {
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.2 },
    );

    stepsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, animation: 'fadeInUp 0.6s ease' }}>
          How GenFlow Ad Studio Works
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ animation: 'fadeInUp 0.6s ease 0.1s both' }}>
          From product image to finished 30-second commercial in 7 steps
        </Typography>
      </Box>

      {/* Hero overview diagrams */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexDirection: { xs: 'column', md: 'row' } }}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Pipeline Flow</Typography>
            <Box
              component="img"
              src="/asset/pipeline-flow.webp"
              alt="Pipeline Flow"
              onClick={() => setPreviewSrc('/asset/pipeline-flow.webp')}
              sx={{
                width: '100%',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.85 },
              }}
            />
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>System Architecture</Typography>
            <Box
              component="img"
              src="/asset/system-architecture.webp"
              alt="System Architecture"
              onClick={() => setPreviewSrc('/asset/system-architecture.webp')}
              sx={{
                width: '100%',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 0.85 },
              }}
            />
          </CardContent>
        </Card>
      </Box>

      <Stepper orientation="vertical" sx={{ '& .MuiStepConnector-line': { minHeight: 20 } }}>
        {PIPELINE_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <Step key={step.label} active expanded>
              <StepLabel
                icon={
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--mui-palette-primary-dark) 0%, var(--mui-palette-primary-main) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <Icon sx={{ fontSize: 20 }} />
                  </Box>
                }
                sx={{
                  '& .MuiStepLabel-label': { fontWeight: 600, fontSize: '1.1rem' },
                }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Card
                  ref={(el) => { stepsRef.current[index] = el; }}
                  variant="outlined"
                  sx={{
                    mb: 2,
                    opacity: 0,
                    transform: 'translateY(16px)',
                    transition: 'all 0.5s ease',
                    '&.visible': {
                      opacity: 1,
                      transform: 'translateY(0)',
                    },
                  }}
                >
                  <CardContent>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                      {step.description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {step.details}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={step.tech}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontWeight: 500 }}
                      />
                    </Box>
                    <Box
                      component="img"
                      src={`/asset/${step.diagram}.webp`}
                      alt={`${step.label} architecture diagram`}
                      onClick={() => setPreviewSrc(`/asset/${step.diagram}.webp`)}
                      sx={{
                        mt: 2,
                        width: '100%',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 0.85 },
                      }}
                    />
                  </CardContent>
                </Card>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {/* Full-size image preview dialog */}
      <Dialog
        open={!!previewSrc}
        onClose={() => setPreviewSrc(null)}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'background.paper',
              maxWidth: '95vw',
              maxHeight: '95vh',
            },
          },
        }}
      >
        {previewSrc && (
          <Box
            component="img"
            src={previewSrc}
            alt="Diagram preview"
            onClick={() => setPreviewSrc(null)}
            sx={{
              display: 'block',
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain',
              cursor: 'pointer',
            }}
          />
        )}
      </Dialog>
    </Box>
  );
}
