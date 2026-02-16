import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Button,
  Tooltip,
  Typography,
  IconButton,
  Drawer,
  Fab,
  Badge,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  CheckCircle,
  AccountTree,
  DynamicFeed,
  RateReview,
  History,
  Terminal,
  Close,
  HelpOutline,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppBar from './AppBar';
import Footer from './Footer';
import InsightPanel from './InsightPanel';
import { usePipelineStore } from '../../store/pipelineStore';

const NAV_ITEMS = [
  { label: 'Pipeline', path: '/', icon: AccountTree },
  { label: 'Bulk', path: '/bulk', icon: DynamicFeed },
  { label: 'Review', path: '/review', icon: RateReview },
  { label: 'History', path: '/history', icon: History },
  { label: 'How it Works', path: '/how-it-works', icon: HelpOutline },
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

function StepIcon({
  active,
  completed,
  viewing,
  icon
}: {
  active: boolean;
  completed: boolean;
  viewing?: boolean;
  icon: React.ReactNode;
}) {
  if (active) {
    return <CircularProgress size={20} thickness={5} />;
  }
  if (completed) {
    return <CheckCircle sx={{ color: 'success.main', fontSize: 24 }} />;
  }
  if (viewing) {
    return (
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 500,
          color: 'white',
        }}
      >
        {icon}
      </Box>
    );
  }
  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 500,
        color: 'text.secondary',
      }}
    >
      {icon}
    </Box>
  );
}

export default function MainLayout() {
  const theme = useTheme();
  const activeStep = usePipelineStore((s) => s.activeStep);
  const setStep = usePipelineStore((s) => s.setStep);
  const isLoading = usePipelineStore((s) => s.isLoading);

  const [logPanelOpen, setLogPanelOpen] = useState(false);
  const logs = usePipelineStore((s) => s.logs);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const [prevLogCount, setPrevLogCount] = useState(0);
  const [hasNewLogs, setHasNewLogs] = useState(false);

  useEffect(() => {
    if (logs.length > prevLogCount) {
      setHasNewLogs(true);
      const timer = setTimeout(() => setHasNewLogs(false), 2000);
      setPrevLogCount(logs.length);
      if (logScrollRef.current && logPanelOpen) {
        logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
      }
      return () => clearTimeout(timer);
    }
  }, [logs.length, prevLogCount, logPanelOpen]);

  // Get state to determine max reachable step
  const runId = usePipelineStore((s) => s.runId);
  const script = usePipelineStore((s) => s.script);
  const avatarVariants = usePipelineStore((s) => s.avatarVariants);
  const storyboardResults = usePipelineStore((s) => s.storyboardResults);
  const videoResults = usePipelineStore((s) => s.videoResults);
  const finalVideoPath = usePipelineStore((s) => s.finalVideoPath);

  // Calculate max step based on data availability
  let maxStep = 0;
  if (runId) maxStep = 1;
  if (script) maxStep = 2;
  if (avatarVariants.length > 0) maxStep = 3;
  if (storyboardResults.length > 0) maxStep = 4;
  if (videoResults.length > 0) maxStep = 5;
  if (finalVideoPath) maxStep = 6;

  // Also consider activeStep explicitly set by the app (e.g. during processing)
  maxStep = Math.max(maxStep, activeStep);

  const navigate = useNavigate();
  const location = useLocation();

  const logLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      info: theme.palette.primary.main,
      success: theme.palette.success.main,
      error: theme.palette.error.main,
      warn: theme.palette.warning.main,
      dim: theme.palette.text.disabled,
    };
    return colors[level] || theme.palette.primary.main;
  };

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
          pl: { xs: 3, sm: 10 },
          background: 'linear-gradient(180deg, var(--mui-palette-background-paper) 0%, var(--mui-palette-background-default) 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{ maxWidth: 900, mx: 'auto' }}
        >
          {STEPS.map((label, index) => {
            const canNavigate = index <= maxStep;

            const isProcessing = index === activeStep && isLoading;
            const isCompleted = index < maxStep;
            const isViewing = index === activeStep;

            return (
              <Step
                key={label}
                completed={isCompleted}
                sx={{
                  cursor: canNavigate ? 'pointer' : 'default',
                  '& .MuiStepLabel-root': {
                    cursor: canNavigate ? 'pointer' : 'default',
                  }
                }}
                onClick={() => {
                  if (canNavigate) {
                    setStep(index);
                  }
                }}
              >
                <StepLabel
                  slots={{
                    stepIcon: (props) => (
                      <StepIcon
                        active={isProcessing}
                        completed={isCompleted}
                        viewing={isViewing}
                        icon={props.icon}
                      />
                    ),
                  }}
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontWeight: isViewing ? 700 : 400,
                      color: isViewing ? 'primary.main' : 'inherit',
                    },
                    '& .MuiStepLabel-label.Mui-completed': {
                      color: isViewing ? 'primary.main' : 'inherit',
                      fontWeight: isViewing ? 700 : 400,
                    },
                    '& .MuiStepLabel-label.Mui-active': {
                      color: isViewing ? 'primary.main' : 'inherit',
                      fontWeight: isViewing ? 700 : 400,
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            );
          })}
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
          pl: { xs: 3, sm: 10 },
        }}
      >
        <Outlet />
      </Box>

      <Footer />

      <InsightPanel />

      {/* Floating log FAB */}
      <Fab
        size="medium"
        color={logs.length > 0 && logs[logs.length - 1]?.level === 'error' ? 'error' : 'primary'}
        onClick={() => setLogPanelOpen(true)}
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 24,
          zIndex: 1200,
          animation: hasNewLogs ? 'pulse 1s ease-in-out' : 'none',
        }}
      >
        <Badge badgeContent={logs.length} color="error" max={99}>
          <Terminal />
        </Badge>
      </Fab>

      {/* Log Drawer */}
      <Drawer
        anchor="right"
        open={logPanelOpen}
        onClose={() => setLogPanelOpen(false)}
        variant="persistent"
        sx={{
          '& .MuiDrawer-paper': {
            width: 400,
            borderLeft: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'action.hover' }}>
          <Terminal sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
          <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>
            Pipeline Logs ({logs.length})
          </Typography>
          <IconButton size="small" onClick={() => setLogPanelOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <Box
          ref={logScrollRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 2,
            py: 1,
            backgroundColor: 'background.default',
            fontFamily: '"Roboto Mono", monospace',
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          {logs.length === 0 ? (
            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: '"Roboto Mono", monospace' }}>
              No logs yet
            </Typography>
          ) : (
            logs.map((log, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                <Typography
                  component="span"
                  sx={{
                    color: 'text.disabled',
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  [{new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}]
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: logLevelColor(log.level),
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: 13,
                    wordBreak: 'break-word',
                  }}
                >
                  {log.message}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Drawer>
    </Box>
  );
}
