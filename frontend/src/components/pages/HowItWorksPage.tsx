import { useEffect, useRef } from 'react';
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
    description: 'Upload or generate a product image, provide specifications and select the number of scenes.',
    details: 'Supports URL input, file upload, or AI-generated product images via Gemini 3 Pro Image. Auto-fill extracts product details from the image.',
    tech: 'Gemini 3 Flash',
  },
  {
    label: 'Script Generation',
    icon: Description,
    description: 'AI composes a cinematic video script with dialogue, camera directions, and scene transitions.',
    details: 'The script includes a narrative arc (hook, reveal, features, CTA), avatar profile, and per-scene instructions for lighting, camera movement, and sound design.',
    tech: 'Gemini 3 Pro / Flash',
  },
  {
    label: 'Avatar Creation',
    icon: Face,
    description: 'Generates multiple photorealistic presenter variants based on the script\'s avatar profile.',
    details: 'Up to 4 avatar variants are generated. You select one that best fits the brand. The selected avatar is used for consistency across all scenes.',
    tech: 'Gemini 3 Pro Image',
  },
  {
    label: 'Storyboard',
    icon: GridView,
    description: 'Creates scene-by-scene storyboard images with automatic quality control.',
    details: 'Each scene image goes through a QC feedback loop: generate, evaluate (avatar + product consistency), rewrite prompt if needed, regenerate. Up to 3 attempts per scene.',
    tech: 'Gemini 3 Pro Image + Flash QC',
  },
  {
    label: 'Video Generation',
    icon: Videocam,
    description: 'Veo 3.1 generates 8-second video clips for each scene with multiple variants.',
    details: 'Each scene produces up to 4 video variants. Videos go through QC scoring for technical quality, avatar consistency, and temporal coherence. Best variant is auto-selected.',
    tech: 'Veo 3.1 + Flash QC',
  },
  {
    label: 'Final Stitching',
    icon: ContentCut,
    description: 'FFmpeg composites all scene clips into a single finished commercial.',
    details: 'Handles VFR->CFR conversion (24fps), scene transitions (crossfade or concat), audio normalization (loudnorm), and final encoding to H.264/AAC MP4.',
    tech: 'FFmpeg',
  },
  {
    label: 'Review & Approval',
    icon: RateReview,
    description: 'Human review workflow -- approve, reject, or request changes to the generated ad.',
    details: 'Reviewers can watch the final video, inspect per-scene QC scores, and submit decisions. Rejected ads can be regenerated from any step.',
    tech: 'Human + AI',
  },
];

export default function HowItWorksPage() {
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

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
                      background: 'linear-gradient(135deg, #1A73E8 0%, #4285F4 100%)',
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
                      sx={{
                        mt: 2,
                        p: 3,
                        borderRadius: 2,
                        backgroundColor: '#F8F9FA',
                        border: '1px dashed',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 100,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Architecture diagram placeholder -- will be generated with Gemini 3 Pro Image
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}
