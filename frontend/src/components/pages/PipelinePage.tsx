import { Box, Alert, Button } from '@mui/material';
import PipelineView from '../pipeline/PipelineView';
import ErrorBoundary from '../common/ErrorBoundary';
import { usePipelineStore } from '../../store/pipelineStore';

export default function PipelinePage() {
  const error = usePipelineStore((s) => s.error);
  const setError = usePipelineStore((s) => s.setError);

  return (
    <ErrorBoundary>
      <Box>
        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => setError(null)}>
                Dismiss
              </Button>
            }
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}
        <PipelineView />
      </Box>
    </ErrorBoundary>
  );
}
