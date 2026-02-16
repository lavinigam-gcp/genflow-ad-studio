import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import { AutoAwesome, ChevronLeft, CheckCircle } from '@mui/icons-material';
import { usePipelineStore } from '../../store/pipelineStore';

const PIPELINE_STEPS = [
  { label: 'Input', description: 'Analyzing product image and specifications' },
  { label: 'Script', description: 'AI composing cinematic video script with Gemini' },
  { label: 'Avatar', description: 'Generating photorealistic presenter from script' },
  { label: 'Storyboard', description: 'Creating scene-by-scene storyboard images with QC' },
  { label: 'Video', description: 'Veo 3.1 generating video clips per scene' },
  { label: 'Stitch', description: 'FFmpeg compositing scenes into final commercial' },
  { label: 'Review', description: 'Ready for human review and approval' },
];

export default function InsightPanel() {
  const [open, setOpen] = useState(false);
  const activeStep = usePipelineStore((s) => s.activeStep);
  const isLoading = usePipelineStore((s) => s.isLoading);

  const currentLabel = PIPELINE_STEPS[activeStep]?.label ?? 'Pipeline';

  return (
    <>
      {/* Pill trigger — fixed right edge, vertically centered */}
      <Box
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1300,
          width: 28,
          height: 80,
          borderRadius: '14px 0 0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: isLoading ? 'primary.main' : 'action.selected',
          color: isLoading ? 'primary.contrastText' : 'text.secondary',
          animation: isLoading ? 'pulse 2s ease-in-out infinite' : 'none',
          '&:hover': {
            width: 32,
            backgroundColor: isLoading ? 'primary.dark' : 'action.hover',
            color: isLoading ? 'primary.contrastText' : 'primary.main',
          },
        }}
      >
        <AutoAwesome sx={{ fontSize: 16, transform: 'rotate(-90deg)' }} />
      </Box>

      {/* Backdrop */}
      {open && (
        <Box
          onClick={() => setOpen(false)}
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1299,
            backgroundColor: 'rgba(0,0,0,0.4)',
            opacity: 1,
            transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}

      {/* Slide-out panel */}
      <Box
        sx={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: 360,
          zIndex: 1301,
          backgroundColor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider',
          boxShadow: open ? '-8px 0 24px rgba(0,0,0,0.12)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2.5,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <AutoAwesome color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
            Pipeline Progress
          </Typography>
          <IconButton size="small" onClick={() => setOpen(false)}>
            <ChevronLeft sx={{ transform: 'rotate(180deg)' }} />
          </IconButton>
        </Box>

        {/* Current step summary */}
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'action.hover',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {isLoading ? 'Processing' : 'Current Step'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
            {currentLabel}
          </Typography>
          {isLoading && (
            <Box
              sx={{
                mt: 1,
                height: 3,
                borderRadius: 2,
                background: (theme) =>
                  `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 50%, ${theme.palette.primary.main} 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite',
              }}
            />
          )}
        </Box>

        {/* Scrollable stepper content */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {PIPELINE_STEPS.map((step, index) => {
              const isCompleted = index < activeStep;
              const isCurrent = index === activeStep;

              return (
                <Step key={step.label} completed={isCompleted}>
                  <StepLabel
                    slots={{
                      stepIcon: () =>
                        isCompleted ? (
                          <CheckCircle sx={{ color: 'success.main', fontSize: 22 }} />
                        ) : undefined,
                    }}
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontWeight: isCurrent ? 700 : 400,
                        color: isCurrent ? 'primary.main' : 'inherit',
                      },
                    }}
                  >
                    {step.label}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {step.description}
                    </Typography>
                    {isCurrent && isLoading && (
                      <Box
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          background: (theme) =>
                            `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 50%, ${theme.palette.primary.main} 100%)`,
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
                        backgroundColor: 'action.hover',
                        border: '1px dashed',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 60,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Pipeline diagram placeholder
                      </Typography>
                    </Box>
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
        </Box>
      </Box>
    </>
  );
}
