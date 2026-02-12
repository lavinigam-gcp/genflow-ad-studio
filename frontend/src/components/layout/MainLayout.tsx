import {
  Box,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Button,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  AccountTree,
  DynamicFeed,
  RateReview,
  History,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppBar from './AppBar';
import LogConsole from '../common/LogConsole';
import { usePipelineStore } from '../../store/pipelineStore';

const NAV_ITEMS = [
  { label: 'Pipeline', path: '/', icon: AccountTree },
  { label: 'Bulk', path: '/bulk', icon: DynamicFeed },
  { label: 'Review', path: '/review', icon: RateReview },
  { label: 'History', path: '/history', icon: History },
];

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
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar />

      {/* Floating left nav */}
      <Box
        sx={{
          position: 'fixed',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          backgroundColor: 'background.paper',
          borderRadius: 3,
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          border: '1px solid',
          borderColor: 'divider',
          py: 1,
          px: 0.5,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Tooltip key={item.path} title={item.label} placement="right" arrow>
              <Button
                onClick={() => navigate(item.path)}
                sx={{
                  minWidth: 0,
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  backgroundColor: isActive ? 'primary.light' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.light' : 'action.hover',
                  },
                }}
              >
                <Icon fontSize="small" />
              </Button>
            </Tooltip>
          );
        })}
      </Box>

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
