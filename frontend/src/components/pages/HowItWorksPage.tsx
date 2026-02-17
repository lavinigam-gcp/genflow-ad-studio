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
    subtitle: 'Three ways to start, AI does the rest',
    bullets: [
      'Paste a URL, upload a photo, or let AI generate a studio-quality product image',
      'Gemini 3 Flash analyzes the image and auto-fills the product name, features, and tagline',
      'You review the details, choose your scene count (2-6), and set the ad tone',
    ],
    tech: 'Gemini 3 Flash + Gemini 3 Pro Image',
    diagram: 'product-input',
  },
  {
    label: 'Script Generation',
    icon: Description,
    subtitle: 'AI writes your commercial like a professional Ad Director',
    bullets: [
      'Gemini 3 Pro acts as an award-winning Ad Director — it sees your product and writes a cinematic script',
      'Follows a proven narrative arc: Hook (grab attention) \u2192 Reveal (introduce product) \u2192 Features (show benefits) \u2192 CTA (close the deal)',
      'Script includes scene-by-scene dialogue, camera directions, lighting, sound design, and transitions',
      'A consistent presenter profile is generated so the same person appears across all scenes',
    ],
    tech: 'Gemini 3 Pro',
    diagram: 'script-generation',
  },
  {
    label: 'Avatar Creation',
    icon: Face,
    subtitle: 'AI generates your presenter — you pick your favorite',
    bullets: [
      'Gemini 3 Pro Image creates 1-5 photorealistic presenter portraits based on the script\u2019s profile',
      'Optionally customize gender, ethnicity, age range, or write your own description',
      'Each variant is unique — browse the gallery and click to select',
      'Your chosen presenter will appear consistently across every scene in the final video',
    ],
    tech: 'Gemini 3 Pro Image',
    diagram: 'avatar-creation',
  },
  {
    label: 'Storyboard & Quality Control',
    icon: GridView,
    subtitle: 'AI draws each scene, then checks its own work',
    bullets: [
      'Gemini 3 Pro Image generates a photorealistic storyboard frame for each scene',
      'A separate model (Gemini 3 Flash) reviews every frame on 3 dimensions: presenter match, product accuracy, and visual composition',
      'If a frame scores below the quality threshold, AI rewrites the prompt and regenerates automatically',
      'Up to 3 attempts per scene — the best result is always kept, even if none pass perfectly',
    ],
    tech: 'Gemini 3 Pro Image + Flash QC',
    diagram: 'storyboard-qc',
  },
  {
    label: 'Video Generation',
    icon: Videocam,
    subtitle: 'Veo 3.1 creates video clips with built-in scene continuity',
    bullets: [
      'Veo 3.1 generates 4-8 second video clips with native dialogue, sound effects, and music',
      'Scenes are processed sequentially — the last frame of each scene feeds into the next for visual continuity',
      'Same random seed across all scenes keeps the presenter\u2019s voice and appearance consistent',
      'Gemini 3 Flash scores each video across 7 quality dimensions (technical, avatar, product, composition, motion, audio, temporal)',
      'Below-threshold videos are regenerated with an improved prompt (up to 3 tries)',
    ],
    tech: 'Veo 3.1 + Flash QC',
    diagram: 'video-continuity',
  },
  {
    label: 'Final Assembly',
    icon: ContentCut,
    subtitle: 'Scene clips become a polished commercial',
    bullets: [
      'All scene clips are standardized to 24 frames per second for smooth playback',
      'Scene transitions from the script are applied: dissolve, wipe, zoom, or clean cut',
      'Audio is normalized to broadcast standards so nothing is too loud or too quiet',
      'Output is a polished 30-second MP4 video that plays anywhere',
    ],
    tech: 'FFmpeg',
    diagram: 'ffmpeg-stitching',
  },
  {
    label: 'Review & Approval',
    icon: RateReview,
    subtitle: 'Watch your commercial, then approve, revise, or reject',
    bullets: [
      'Watch the complete commercial with all scenes, transitions, and audio',
      'Jump to any scene, compare different video takes, and view AI quality scores',
      'Approve to mark as ready for distribution',
      'Request changes targeting a specific step — AI regenerates from that point forward',
      'Reject to discard and start fresh',
    ],
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
                    <Typography variant="body1" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {step.subtitle}
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, mb: 2 }}>
                      {step.bullets.map((bullet, i) => (
                        <Box
                          component="li"
                          key={i}
                          sx={{ mb: 0.75 }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {bullet}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
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
