import { Box, Stepper, Step, StepLabel, CircularProgress } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { Outlet } from 'react-router-dom';
import AppBar from './AppBar';
import LogConsole from '../common/LogConsole';
import { usePipelineStore } from '../../store/pipelineStore';

const STEPS = [
  'Input',
  'Script',
  'Avatar',
  'Storyboard',
  'Video',
  'Final',
  'Review',
];

function StepIcon({ active, completed, icon }: { active: boolean; completed: boolean; icon: React.ReactNode }) {
  if (completed) {
    return <CheckCircle sx={{ color: 'success.main', fontSize: 24 }} />;
  }
  if (active) {
    return <CircularProgress size={20} thickness={5} />;
  }
  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: '#DADCE0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 500,
        color: '#5F6368',
      }}
    >
      {icon}
    </Box>
  );
}

export default function MainLayout() {
  const activeStep = usePipelineStore((s) => s.activeStep);
  const isLoading = usePipelineStore((s) => s.isLoading);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar />

      <Box
        sx={{
          py: 2,
          px: 3,
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{ maxWidth: 900, mx: 'auto' }}
        >
          {STEPS.map((label, index) => (
            <Step key={label} completed={index < activeStep}>
              <StepLabel
                slots={{
                  stepIcon: (props) => (
                    <StepIcon
                      active={index === activeStep && isLoading}
                      completed={index < activeStep}
                      icon={props.icon}
                    />
                  ),
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          maxWidth: 1400,
          width: '100%',
          mx: 'auto',
          p: 3,
        }}
      >
        <Outlet />
      </Box>

      <LogConsole />
    </Box>
  );
}
