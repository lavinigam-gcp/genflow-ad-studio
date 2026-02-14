import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import { Close, AutoAwesome } from '@mui/icons-material';

const PIPELINE_STEPS = [
  { label: 'Input', description: 'Analyzing product image and specifications' },
  { label: 'Script', description: 'AI composing cinematic video script with Gemini' },
  { label: 'Avatar', description: 'Generating photorealistic presenter from script' },
  { label: 'Storyboard', description: 'Creating scene-by-scene storyboard images with QC' },
  { label: 'Video', description: 'Veo 3.1 generating video clips per scene' },
  { label: 'Stitch', description: 'FFmpeg compositing scenes into final commercial' },
  { label: 'Review', description: 'Ready for human review and approval' },
];

interface PipelineInsightProps {
  currentStep: number;
  stepName: string;
  isLoading: boolean;
}

export default function PipelineInsight({ currentStep, stepName, isLoading }: PipelineInsightProps) {
  const [open, setOpen] = useState(false);

  if (!isLoading) return null;

  return (
    <>
      <Chip
        icon={<AutoAwesome sx={{ fontSize: 16 }} />}
        label={`${stepName}...`}
        color="primary"
        variant="outlined"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1100,
          animation: 'fadeInUp 0.3s ease',
          cursor: 'pointer',
          px: 1,
          '& .MuiChip-label': { fontWeight: 600 },
        }}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, border: '1px solid', borderColor: 'divider' },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome color="primary" />
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
            Pipeline Progress
          </Typography>
          <IconButton size="small" onClick={() => setOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={currentStep} orientation="vertical">
            {PIPELINE_STEPS.map((step, index) => (
              <Step key={step.label} completed={index < currentStep}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontWeight: index === currentStep ? 700 : 400,
                      color: index === currentStep ? 'primary.main' : 'inherit',
                    },
                  }}
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {step.description}
                  </Typography>
                  {index === currentStep && (
                    <Box
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        background: 'linear-gradient(90deg, #1A73E8 0%, #4285F4 50%, #1A73E8 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s linear infinite',
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: '#F8F9FA',
                      border: '1px dashed',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 80,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Pipeline diagram placeholder
                    </Typography>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
      </Dialog>
    </>
  );
}
